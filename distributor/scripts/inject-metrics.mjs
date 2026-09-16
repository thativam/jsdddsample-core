#!/usr/bin/env node
/**
 * inject-metrics.mjs
 *
 * Wires Prometheus metrics into every generated distributed server without
 * touching app.js. Uses Node's --import flag so metricsServer.js starts
 * automatically before the existing entry point.
 *
 *   1. Reads the distributor config YAML.
 *   2. Assigns a METRICS_PORT to each real server (base 9091 + index).
 *   3. Copies distributor/utils/metricsServer.js → <server>/src/server/metricsServer.js.
 *   4. Writes METRICS_PORT to <server>/.env (upsert — adds or replaces the line).
 *   5. Patches <server>/package.json: adds --import ./src/server/metricsServer.js
 *      to the start script. Idempotent. No env-var prefix — .env handles that.
 *   6. Rewrites observability/prometheus/targets/app-instances.yml.
 *   7. Prints a compose.yaml snippet (network_mode: host, no port mapping needed).
 *
 * Run AFTER js-distributor-scripts:
 *
 *   node scripts/inject-metrics.mjs
 *   node scripts/inject-metrics.mjs --config ./utils/config-valid.yml
 *   node scripts/inject-metrics.mjs --metrics-port-base 9100
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DISTRIBUTOR_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT        = path.resolve(DISTRIBUTOR_ROOT, '..');

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
}

const configArg       = flag('config', path.join(DISTRIBUTOR_ROOT, 'utils/config-valid.yml'));
const metricsPortBase = Number(flag('metrics-port-base', '9091'));

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(msg) { console.log(`[inject-metrics] ${msg}`); }

function loadConfig(configPath) {
  if (!existsSync(configPath)) throw new Error(`Config not found: ${configPath}`);
  return yaml.load(readFileSync(configPath, 'utf8'));
}

function resolveOutputDir(config, configPath) {
  const gen = config.codeGenerationParameters ?? {};
  return path.resolve(path.dirname(configPath), gen.outputFolder ?? '../distributed');
}

// ── Step 3: copy metricsServer.js ────────────────────────────────────────────

function copyMetricsServer(serverDir) {
  const src  = path.join(DISTRIBUTOR_ROOT, 'utils/metricsServer.js');
  const dest = path.join(serverDir, 'src/server/metricsServer.js');

  if (!existsSync(src)) throw new Error(`Source not found: ${src}`);
  if (!existsSync(path.dirname(dest))) {
    log(`  ⚠  src/server/ not found in ${path.basename(serverDir)} — run dist first`);
    return false;
  }

  copyFileSync(src, dest);
  log(`  copied → ${path.relative(DISTRIBUTOR_ROOT, dest)}`);
  return true;
}

// ── Step 4: write METRICS_PORT to .env ───────────────────────────────────────
//
// Upserts the METRICS_PORT line in the server's .env file.
// If the line already exists (from a previous run), it is replaced in-place
// so the port stays correct when --metrics-port-base changes.

function patchEnvFile(serverDir, metricsPort) {
  const envPath = path.join(serverDir, '.env');
  if (!existsSync(envPath)) {
    log(`  ⚠  .env not found in ${path.basename(serverDir)}`);
    return false;
  }

  const original = readFileSync(envPath, 'utf8');
  const line     = `METRICS_PORT=${metricsPort}`;

  let updated;
  if (/^METRICS_PORT=.*/m.test(original)) {
    // Replace existing line
    updated = original.replace(/^METRICS_PORT=.*/m, line);
    log(`  .env: updated ${line}`);
  } else {
    // Append under a metrics section header
    const trail = original.endsWith('\n') ? '' : '\n';
    updated = original + trail + '\n## ── Metrics ─────────────────────────────────────────────────────────────────\n' + line + '\n';
    log(`  .env: added ${line}`);
  }

  writeFileSync(envPath, updated, 'utf8');
  return true;
}

// ── Step 5: patch package.json start script ──────────────────────────────────
//
// Only adds --import ./src/server/metricsServer.js to the node invocation.
// METRICS_PORT is read from .env via the existing --env-file=.env flag.
//
// Before:  node --env-file=.env src/server/app.js
// After:   node --import ./src/server/metricsServer.js --env-file=.env src/server/app.js

const IMPORT_FLAG = '--import ./src/server/metricsServer.js';

function patchPackageJson(serverDir) {
  const pkgPath = path.join(serverDir, 'package.json');
  if (!existsSync(pkgPath)) {
    log(`  ⚠  package.json not found in ${path.basename(serverDir)}`);
    return false;
  }

  const pkg      = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const scripts  = pkg.scripts ?? {};
  const original = scripts.start ?? '';

  // Idempotent
  if (original.includes(IMPORT_FLAG)) {
    log(`  package.json already patched, skipping`);
    return true;
  }

  // Inject --import flag right after "node "
  const patched = original.startsWith('node ')
    ? `node ${IMPORT_FLAG} ${original.slice('node '.length)}`
    : original; // unexpected format — leave untouched

  if (patched === original) {
    log(`  ⚠  start script doesn't begin with "node " — not patched: ${original}`);
    return false;
  }

  pkg.scripts = { ...scripts, start: patched };
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  log(`  patched package.json start → ${patched}`);
  return true;
}

// ── Step 6: regenerate app-instances.yml ─────────────────────────────────────

function regeneratePrometheusTargets(monolithPort, serverAssignments) {
  const targetsPath = path.join(
    REPO_ROOT, 'observability/prometheus/targets/app-instances.yml',
  );

  const lines = [
    '# AUTO-GENERATED by inject-metrics.mjs — do not edit by hand.',
    '# This file is recreated on every "npm run inject:metrics" run.',
    '# Port assignments come from the config YAML server list.',
    '# To change ports: update --metrics-port-base flag, then re-run inject:metrics.',
    '',
    '# host.docker.internal resolves to the Windows/Mac host on Docker Desktop,',
    '# and to the host-gateway on Linux (extra_hosts in docker-compose.observability.yml).',
    '',
    '# ── Monolith ─────────────────────────────────────────────────────────────────',
    '# /metrics served on the main app port via metricsRoutes.js.',
    '- targets:',
    `    - host.docker.internal:${monolithPort}`,
    '  labels:',
    '    app: dddsample',
    '    instance: monolith',
    '',
    '# ── Distributed servers ──────────────────────────────────────────────────────',
    '# /metrics served on a dedicated METRICS_PORT via metricsServer.js (--import).',
    '# Prometheus reloads this file every 30 s — no restart needed.',
    '- targets:',
    ...serverAssignments.map(
      ({ id, appPort, metricsPort }) =>
        `    - host.docker.internal:${metricsPort}   # ${id}  (app port ${appPort})`,
    ),
    '  labels:',
    '    app: dddsample',
    '',
  ];

  mkdirSync(path.dirname(targetsPath), { recursive: true });
  writeFileSync(targetsPath, lines.join('\n'), 'utf8');
  log(`  wrote ${path.relative(REPO_ROOT, targetsPath)}`);
}

// ── Step 7: compose snippet ──────────────────────────────────────────────────

function printComposeSnippet(serverAssignments) {
  log('\n── compose.yaml note ────────────────────────────────────────────────────────');
  log('METRICS_PORT is written to each server\'s .env — no compose changes needed.');
  log('Prometheus reaches the servers via host.docker.internal (bridge network).');
  log(`Assigned ports: ${serverAssignments.map(s => `${s.id}=${s.metricsPort}`).join(', ')}`);
}

// ── main ─────────────────────────────────────────────────────────────────────

function main() {
  const configPath = path.resolve(configArg);
  log(`Config: ${configPath}`);

  const config    = loadConfig(configPath);
  const outputDir = resolveOutputDir(config, configPath);
  const servers   = config.servers ?? [];

  if (servers.length === 0) {
    log('No servers defined — nothing to do.');
    return;
  }

  const monolithPort      = 8080;
  const serverAssignments = servers.map((server, idx) => ({
    id:          server.id,
    appPort:     server.http?.port ?? monolithPort,
    metricsPort: metricsPortBase + idx,
    serverDir:   path.join(outputDir, server.id),
  }));

  log('\nPort assignments:');
  for (const { id, appPort, metricsPort } of serverAssignments) {
    log(`  ${id}  app=${appPort}  metrics=${metricsPort}`);
  }

  let allOk = true;

  for (const { id, metricsPort, serverDir } of serverAssignments) {
    log(`\n-- ${id} --`);
    if (!existsSync(serverDir)) {
      log(`  ⚠  Not found: ${serverDir} — run "npm run dist" first`);
      allOk = false;
      continue;
    }
    const copied   = copyMetricsServer(serverDir);
    const envDone  = copied && patchEnvFile(serverDir, metricsPort);
    const pkgDone  = envDone && patchPackageJson(serverDir);
    if (!pkgDone) allOk = false;
  }

  log('\n-- Prometheus targets --');
  regeneratePrometheusTargets(monolithPort, serverAssignments);

  printComposeSnippet(serverAssignments);

  if (!allOk) {
    log('⚠  Some servers were skipped. Generate them first with "npm run dist".');
    process.exitCode = 1;
  } else {
    log('Done.');
  }
}

main();
