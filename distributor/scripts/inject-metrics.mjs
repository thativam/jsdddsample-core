#!/usr/bin/env node
/**
 * inject-metrics.mjs
 *
 * Run AFTER js-distributor-scripts (`npm run dist`). Does four things:
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
 *      In --docker mode uses container service names instead of host.docker.internal.
 *
 *   5. (--docker only) Patches the generated compose.yaml to add the shared
 *      dddsample network, env_file: .env.docker, and exposes alpha on port 8080.
 *
 * Usage:
 *   node scripts/inject-metrics.mjs
 *   node scripts/inject-metrics.mjs utils/config-valid-monolith.yml
 *   node scripts/inject-metrics.mjs --config utils/config-valid-monolith.yml
 *   node scripts/inject-metrics.mjs --docker
 *   node scripts/inject-metrics.mjs --docker --config utils/config-valid-4sv.yml
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
function boolFlag(name) { return args.includes(`--${name}`); }

// Accept config as positional arg (first non-flag), --config flag, or default.
const positional = args.find(a => !a.startsWith('-'));
const configArg  = positional
  ?? flag('config', null)
  ?? path.join(DISTRIBUTOR_ROOT, 'utils/config-valid.yml');

// --docker: skip npm install + start.js patch; use container names in targets;
//           patch generated compose.yaml for docker-compose usage.
const DOCKER_MODE = boolFlag('docker');

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
  'promBundle({ includeMethod: true, includePath: true, promClient: { collectDefaultMetrics: {} } })';

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

function regeneratePrometheusTargets(serverAssignments, dockerMode) {
  const targetsPath = path.join(
    REPO_ROOT, 'observability/prometheus/targets/app-instances.yml',
  );

  // Each server gets its own target group with instance: <id> from the config.
  // Grafana queries filter with instance!~"host.docker.internal.*" to drop the
  // raw scrape-address label Prometheus assigns when no instance label is set —
  // explicit labels are required for metrics to appear in the dashboard.
  //
  // In docker mode: Prometheus reaches the app container by service name
  // (e.g. "alpha:8080") because both are on the dddsample network.
  // In host mode: apps run on the host; Prometheus uses host.docker.internal.
  const targetHost = (id, appPort) =>
    dockerMode ? `${id}:${appPort}` : `host.docker.internal:${appPort}`;

  const serverBlocks = serverAssignments.flatMap(({ id, appPort }) => [
    `# ── ${id} ───────────────────────────────────────────────────────────────────`,
    '- targets:',
    `    - ${targetHost(id, appPort)}`,
    '  labels:',
    '    app: dddsample',
    `    instance: ${id}`,
    '',
  ]);

  const hostNote = dockerMode
    ? '# Docker mode: targets use container service names on the dddsample network.'
    : '# host.docker.internal resolves to the Windows/Mac host on Docker Desktop,\n# and to the host-gateway on Linux (extra_hosts in docker-compose.observability.yml).';

  const lines = [
    '# AUTO-GENERATED by inject-metrics.mjs — do not edit by hand.',
    '# Re-run after adding/removing servers in the config.',
    '# Prometheus reloads this file every 30 s — no restart needed.',
    '',
    hostNote,
    '',
    ...serverBlocks,
  ];

  mkdirSync(path.dirname(targetsPath), { recursive: true });
  writeFileSync(targetsPath, lines.join('\n'), 'utf8');
  log(`wrote ${path.relative(REPO_ROOT, targetsPath)}`);
}

// ── Patch generated Dockerfile CMD ───────────────────────────────────────────
//
// js-distributor generates: CMD ["node", "src-gen/start.js"]
// The actual start.js is placed at the server root, not in src-gen/.
// Fix it to: CMD ["node", "start.js"]

function patchDockerfile(serverDir, id) {
  const dockerfilePath = path.join(serverDir, 'Dockerfile');
  if (!existsSync(dockerfilePath)) {
    log(`  ${id}: no Dockerfile, skipping`);
    return;
  }

  const original = readFileSync(dockerfilePath, 'utf8');
  const patched  = original.replace(
    /CMD\s+\["node",\s*"src-gen\/start\.js"\]/,
    'CMD ["node", "start.js"]',
  );

  if (patched === original) {
    log(`  ${id}: Dockerfile already correct`);
    return;
  }

  writeFileSync(dockerfilePath, patched, 'utf8');
  log(`  ${id}: Dockerfile CMD patched (src-gen/start.js → start.js)`);
}

// ── Patch generated compose.yaml (docker mode only) ─────────────────────────
//
// js-distributor generates compose.yaml with services but:
//   - no external network → containers can't reach mongodb/rabbit by hostname
//   - no env_file         → apps load .env (localhost), not .env.docker
//   - alpha has no port   → can't reach port 8080 from the host
//
// We parse the YAML, mutate it, and write it back.

function patchComposeYaml(distRoot, serverAssignments) {
  const composePath = path.join(distRoot, 'compose.yaml');
  if (!existsSync(composePath)) {
    log('compose.yaml not found — skipping patch (run npm run dist first)');
    return;
  }

  const raw    = readFileSync(composePath, 'utf8');
  const doc    = yaml.load(raw);

  if (!doc || typeof doc !== 'object') {
    log('compose.yaml is empty or invalid — skipping patch');
    return;
  }

  doc.services ??= {};
  doc.networks  = doc.networks ?? {};
  doc.networks.dddsample = { external: true };

  // The set of real (non-test) server ids
  const serverIds = new Set(serverAssignments.map(s => s.id));

  for (const [svcName, svc] of Object.entries(doc.services)) {
    // Only patch non-test services (alpha, beta, gamma, theta, …)
    if (!serverIds.has(svcName)) continue;

    // Attach to shared network
    svc.networks = ['dddsample'];

    // Swap .env for .env.docker
    svc.env_file = ['.env.docker'];
    delete svc.environment;   // remove any hardcoded env vars that would conflict

    // Expose port 8080 for alpha (or whichever server uses MONOLITH_PORT)
    const assignment = serverAssignments.find(s => s.id === svcName);
    if (assignment && assignment.appPort === MONOLITH_PORT) {
      svc.ports = svc.ports ?? [];
      const portStr = `${MONOLITH_PORT}:${MONOLITH_PORT}`;
      if (!svc.ports.includes(portStr)) {
        svc.ports.push(portStr);
      }
    }
  }

  writeFileSync(composePath, yaml.dump(doc, { indent: 2 }), 'utf8');
  log(`patched ${path.relative(REPO_ROOT, composePath)} (network + env_file + alpha port)`);
}

// ── main ─────────────────────────────────────────────────────────────────────

function main() {
  const configPath = path.resolve(configArg);
  log(`Config: ${configPath}${DOCKER_MODE ? '  [docker mode]' : ''}`);

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

  // Fix Dockerfile CMD path (src-gen/start.js → start.js)
  log('Patching Dockerfiles…');
  for (const { id } of serverAssignments) {
    const serverDir = path.join(distRoot, id);
    if (!existsSync(serverDir)) continue;
    patchDockerfile(serverDir, id);
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
    const target = DOCKER_MODE
      ? `${id}:${appPort}/metrics  (container)`
      : `host.docker.internal:${appPort}/metrics`;
    log(`  ${id}  →  ${target}`);
  }

  log('Generating load test config…');
  generateLoadTestConfig(config, serverAssignments);

  regeneratePrometheusTargets(serverAssignments, DOCKER_MODE);

  if (DOCKER_MODE) {
    log('Patching compose.yaml for docker-compose usage…');
    patchComposeYaml(distRoot, serverAssignments);
  }

  log('');
  if (DOCKER_MODE) {
    log('Done. Start containers:');
    log(`  docker compose -f ${path.relative(process.cwd(), path.join(distRoot, 'compose.yaml'))} up -d`);
    log('Or run:  npm run start:dist:docker');
  } else {
    log('Done. Start each distributed server:');
    for (const { id } of serverAssignments) {
      const serverDir = path.join(distRoot, id);
      log(`  cd ${path.relative(process.cwd(), serverDir)} && npm start`);
    }
    log('Or run:  npm run start:dist');
  }
}

main();
