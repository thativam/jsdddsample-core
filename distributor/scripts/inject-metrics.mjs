#!/usr/bin/env node
/**
 * inject-metrics.mjs
 *
 * Run AFTER js-distributor-scripts (`npm run dist`). Does three things:
 *
 *   1. Patches start.js in every generated server to enable
 *      collectDefaultMetrics (Node.js runtime metrics: CPU, memory, GC, …).
 *      js-distributor generates `promBundle({ includeMethod: true })` without
 *      this option, so runtime metrics are absent unless we add it here.
 *
 *   2. Runs `npm install` inside every generated server directory so the
 *      servers can actually start (cleanOutput:true in config wipes node_modules
 *      on every `npm run dist`).
 *
 *   3. Generates load-test-config.json for k6 by resolving each function in
 *      utils/load-test-params.json to the server URL that handles it in the
 *      current extraction plan.
 *
 *   4. Regenerates observability/prometheus/targets/app-instances.yml so
 *      Prometheus knows which host:port to scrape. The distributed servers
 *      expose /metrics on their own app port via express-prom-bundle.
 *
 * Usage:
 *   node scripts/inject-metrics.mjs
 *   node scripts/inject-metrics.mjs utils/config-valid-monolith.yml
 *   node scripts/inject-metrics.mjs --config utils/config-valid-monolith.yml
 */

import { execSync }                              from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path                                      from 'node:path';
import { fileURLToPath }                         from 'node:url';
import yaml                                      from 'js-yaml';

const __dirname      = path.dirname(fileURLToPath(import.meta.url));
const DISTRIBUTOR_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT        = path.resolve(DISTRIBUTOR_ROOT, '..');

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
}

// Accept config as positional arg (first non-flag), --config flag, or default.
const positional = args.find(a => !a.startsWith('-'));
const configArg  = positional
  ?? flag('config', null)
  ?? path.join(DISTRIBUTOR_ROOT, 'utils/config-valid.yml');

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(msg) { console.log(`[inject-metrics] ${msg}`); }

function loadConfig(configPath) {
  if (!existsSync(configPath)) throw new Error(`Config not found: ${configPath}`);
  return yaml.load(readFileSync(configPath, 'utf8'));
}

// ── Patch start.js — enable collectDefaultMetrics ────────────────────────────
//
// js-distributor generates: promBundle({ includeMethod: true })
// We need:                  promBundle({ includeMethod: true, promClient: { collectDefaultMetrics: {} } })
//
// This makes prom-bundle call prom-client's collectDefaultMetrics() so that
// Node.js runtime metrics (process_resident_memory_bytes, process_cpu_seconds_total,
// nodejs_heap_size_used_bytes, etc.) are exported alongside HTTP metrics.

// Matches single-line and multi-line promBundle({ includeMethod: true }) calls.
const PROM_BUNDLE_RE =
  /promBundle\(\{[\s\S]*?includeMethod\s*:\s*true[\s\S]*?\}\)/;

const PROM_BUNDLE_REPLACEMENT =
  'promBundle({ includeMethod: true, promClient: { collectDefaultMetrics: {} } })';

function patchStartJs(serverDir, id) {
  const startPath = path.join(serverDir, 'start.js');
  if (!existsSync(startPath)) {
    log(`  ${id}: no start.js, skipping`);
    return;
  }

  const original = readFileSync(startPath, 'utf8');

  if (!PROM_BUNDLE_RE.test(original)) {
    log(`  ${id}: start.js — promBundle call not found, skipping`);
    return;
  }

  const patched = original.replace(PROM_BUNDLE_RE, PROM_BUNDLE_REPLACEMENT);

  if (patched === original) {
    log(`  ${id}: start.js already patched`);
    return;
  }

  writeFileSync(startPath, patched, 'utf8');
  log(`  ${id}: start.js patched — collectDefaultMetrics enabled`);
}

// ── npm install in generated servers ─────────────────────────────────────────
//
// cleanOutput:true in config-valid.yml deletes the entire output folder before
// regenerating — that wipes node_modules too. We reinstall them here so the
// servers are ready to `npm start`.

function installDeps(serverDir, id) {
  const pkgPath = path.join(serverDir, 'package.json');
  if (!existsSync(pkgPath)) {
    log(`  ${id}: no package.json, skipping`);
    return;
  }

  log(`  ${id}: npm install…`);
  try {
    execSync('npm install', {
      cwd:    serverDir,
      stdio:  'pipe',      // suppress npm output; errors still surface below
      timeout: 120_000,
    });
    log(`  ${id}: done`);
  } catch (err) {
    const msg = (err.stderr?.toString() || err.message || '').trim();
    log(`  ${id}: npm install failed — ${msg}`);
  }
}

// ── Generate load-test-config.json ───────────────────────────────────────────
//
// For each function in load-test-params.json, find which server handles it by
// matching declarationPattern against server.functions[].declarationPattern.
// Functions not claimed by any server default to the first server (alpha / monolith).
// Writes distributor/scripts/load-test-config.json for k6 to open() at init time.

const LOAD_TEST_PARAMS_PATH = path.join(DISTRIBUTOR_ROOT, 'utils/load-test-params.json');
const LOAD_TEST_CONFIG_PATH = path.join(DISTRIBUTOR_ROOT, 'scripts/load-test-config.json');

function generateLoadTestConfig(config, serverAssignments) {
  if (!existsSync(LOAD_TEST_PARAMS_PATH)) {
    log('load-test-params.json not found — skipping load test config generation');
    return;
  }

  const params = JSON.parse(readFileSync(LOAD_TEST_PARAMS_PATH, 'utf8'));

  // Build pattern → { id, port } map from config
  const patternToServer = new Map();
  const defaultPort = serverAssignments[0]?.appPort ?? MONOLITH_PORT;

  for (const server of config.servers ?? []) {
    const port = server.http?.port ?? MONOLITH_PORT;
    for (const fn of server.functions ?? []) {
      patternToServer.set(fn.declarationPattern, { id: server.id, port });
    }
  }

  const endpoints = [];
  for (const fn of params.functions ?? []) {
    const match = patternToServer.get(fn.pattern);
    const port   = match?.port ?? defaultPort;
    const server = match?.id   ?? (serverAssignments[0]?.id ?? 'alpha');

    endpoints.push({
      id:     fn.pattern,
      server,
      port,
      url:    `http://localhost:${port}${fn.path}`,
      method: fn.method ?? 'GET',
      params: fn.params ?? '',
      weight: fn.weight ?? 1,
    });
  }

  const out = {
    _generatedBy: 'inject-metrics.mjs',
    options:      params.options ?? {},
    endpoints,
  };

  writeFileSync(LOAD_TEST_CONFIG_PATH, JSON.stringify(out, null, 2) + '\n', 'utf8');
  log(`wrote ${path.relative(REPO_ROOT, LOAD_TEST_CONFIG_PATH)}`);
  for (const ep of endpoints) {
    log(`  ${ep.id.padEnd(20)} → ${ep.url}  (weight ${ep.weight})`);
  }
}

// ── Regenerate app-instances.yml ─────────────────────────────────────────────
//
// Distributed servers expose /metrics on their own app port (express-prom-bundle).
// Monolith exposes /metrics on its main port (metricsRoutes.js).

const MONOLITH_PORT = 8080;

function regeneratePrometheusTargets(serverAssignments) {
  const targetsPath = path.join(
    REPO_ROOT, 'observability/prometheus/targets/app-instances.yml',
  );

  const lines = [
    '# AUTO-GENERATED by inject-metrics.mjs — do not edit by hand.',
    '# Re-run after adding/removing servers in the config.',
    '# Prometheus reloads this file every 30 s — no restart needed.',
    '',
    '# host.docker.internal resolves to the Windows/Mac host on Docker Desktop,',
    '# and to the host-gateway on Linux (extra_hosts in docker-compose.observability.yml).',
    '',
    '# ── Monolith ─────────────────────────────────────────────────────────────────',
    '- targets:',
    `    - host.docker.internal:${MONOLITH_PORT}`,
    '  labels:',
    '    app: dddsample',
    '    instance: monolith',
    '',
    '# ── Distributed servers ──────────────────────────────────────────────────────',
    '# /metrics is on the same port as the app (express-prom-bundle).',
    '- targets:',
    ...serverAssignments.map(
      ({ id, appPort }) => `    - host.docker.internal:${appPort}   # ${id}`,
    ),
    '  labels:',
    '    app: dddsample',
    '',
  ];

  mkdirSync(path.dirname(targetsPath), { recursive: true });
  writeFileSync(targetsPath, lines.join('\n'), 'utf8');
  log(`wrote ${path.relative(REPO_ROOT, targetsPath)}`);
}

// ── main ─────────────────────────────────────────────────────────────────────

function main() {
  const configPath = path.resolve(configArg);
  log(`Config: ${configPath}`);

  const config  = loadConfig(configPath);
  const servers = config.servers ?? [];

  if (servers.length === 0) {
    log('No servers defined — nothing to do.');
    return;
  }

  // Resolve the dist output folder from config (relative to the config file dir)
  const configDir    = path.dirname(configPath);
  const outputFolder = config.codeGenerationParameters?.outputFolder ?? '../dist/distributedValid';
  const distRoot     = path.resolve(configDir, outputFolder);

  const serverAssignments = servers.map((server) => ({
    id:      server.id,
    appPort: server.http?.port ?? MONOLITH_PORT,
  }));

  // Patch start.js to enable collectDefaultMetrics
  log('Patching start.js (collectDefaultMetrics)…');
  for (const { id } of serverAssignments) {
    const serverDir = path.join(distRoot, id);
    if (!existsSync(serverDir)) {
      log(`  ${id}: directory not found — run npm run dist first`);
      continue;
    }
    patchStartJs(serverDir, id);
  }

  // Install dependencies in each generated server
  log('Installing dependencies…');
  for (const { id } of serverAssignments) {
    const serverDir = path.join(distRoot, id);
    if (!existsSync(serverDir)) continue; // already warned above
    installDeps(serverDir, id);
  }

  log('Server ports:');
  for (const { id, appPort } of serverAssignments) {
    log(`  ${id}  →  host.docker.internal:${appPort}/metrics`);
  }

  log('Generating load test config…');
  generateLoadTestConfig(config, serverAssignments);

  regeneratePrometheusTargets(serverAssignments);

  log('');
  log('Done. Start each distributed server:');
  for (const { id } of serverAssignments) {
    const serverDir = path.join(distRoot, id);
    log(`  cd ${path.relative(process.cwd(), serverDir)} && npm start`);
  }
  log('Or run:  npm run start:dist');
}

main();
