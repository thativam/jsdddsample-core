#!/usr/bin/env node
/**
 * start-dist.mjs
 *
 * Starts all generated distributed servers in parallel.
 * Each server's stdout/stderr is prefixed with its id for readability.
 *
 * Usage:
 *   node scripts/start-dist.mjs
 *   node scripts/start-dist.mjs --config ./utils/config-valid.yml
 *
 * Press Ctrl+C to stop all servers.
 */

import { spawn }        from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path             from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml             from 'js-yaml';

const __dirname        = path.dirname(fileURLToPath(import.meta.url));
const DISTRIBUTOR_ROOT = path.resolve(__dirname, '..');

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
}

const configArg = flag('config', path.join(DISTRIBUTOR_ROOT, 'utils/config-valid.yml'));

// ── Helpers ───────────────────────────────────────────────────────────────────

const COLORS = ['\x1b[36m', '\x1b[33m', '\x1b[32m', '\x1b[35m', '\x1b[34m'];
const RESET  = '\x1b[0m';

function prefixLines(prefix, color, data) {
  return data.toString().split('\n')
    .filter(l => l.length > 0)
    .map(l => `${color}[${prefix}]${RESET} ${l}`)
    .join('\n');
}

// ── main ─────────────────────────────────────────────────────────────────────

const configPath = path.resolve(configArg);
if (!existsSync(configPath)) {
  console.error(`Config not found: ${configPath}`);
  process.exit(1);
}

const config  = yaml.load(readFileSync(configPath, 'utf8'));
const servers = config.servers ?? [];

const outputFolder = config.codeGenerationParameters?.outputFolder ?? '../dist/distributedValid';
const configDir    = path.dirname(configPath);
const distRoot     = path.resolve(configDir, outputFolder);

if (servers.length === 0) {
  console.log('No servers defined in config.');
  process.exit(0);
}

console.log(`Starting ${servers.length} distributed server(s)…\n`);

const children = [];

servers.forEach((server, idx) => {
  const id        = server.id;
  const serverDir = path.join(distRoot, id);
  const color     = COLORS[idx % COLORS.length];

  if (!existsSync(serverDir)) {
    console.error(`${color}[${id}]${RESET} Directory not found: ${serverDir} — run npm run dist first`);
    return;
  }

  const nmDir = path.join(serverDir, 'node_modules');
  if (!existsSync(nmDir)) {
    console.error(`${color}[${id}]${RESET} node_modules missing — run npm run inject:metrics first`);
    return;
  }

  // Read the start command from package.json scripts.start, fall back to npm start
  let startArgs = ['start'];
  try {
    const pkg = JSON.parse(readFileSync(path.join(serverDir, 'package.json'), 'utf8'));
    if (pkg.scripts?.start) {
      // Use npm start so it picks up the correct Node flags (--env-file etc.)
      startArgs = ['start'];
    }
  } catch { /* use default */ }

  const child = spawn('npm', startArgs, {
    cwd:   serverDir,
    shell: true,
    env:   { ...process.env },
  });

  children.push({ id, child });

  child.stdout.on('data', (d) => {
    const lines = prefixLines(id, color, d);
    if (lines) console.log(lines);
  });
  child.stderr.on('data', (d) => {
    const lines = prefixLines(id, color, d);
    if (lines) console.error(lines);
  });
  child.on('exit', (code, signal) => {
    const reason = signal ? `signal ${signal}` : `code ${code}`;
    console.log(`${color}[${id}]${RESET} exited (${reason})`);
  });
  child.on('error', (err) => {
    console.error(`${color}[${id}]${RESET} failed to start: ${err.message}`);
  });
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────

function shutdown() {
  console.log('\nStopping all servers…');
  for (const { child } of children) {
    child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(0), 1000);
}

process.on('SIGINT',  shutdown);
process.on('SIGTERM', shutdown);
