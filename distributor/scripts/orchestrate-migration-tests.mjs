#!/usr/bin/env node
/**
 * Orchestrates the monolith -> microservice migration pipeline end to end:
 *
 *   1. Discovers every division config under distributor/configs/*.yml
 *      (falls back to utils/config.yml as a single "default" division
 *      if that folder doesn't exist yet).
 *   2. Runs js-distributor-scripts for each division config, generating
 *      <outputFolder>/<server>-test-server for every server it defines.
 *   3. For each generated test server: npm install, run unit tests
 *      with coverage (jest, json-summary reporter), run acceptance
 *      tests (playwright, json reporter).
 *   4. Collects pass/fail counts + statement/branch coverage % and
 *      writes everything to a timestamped CSV under distributor/results/.
 *
 * Usage:
 *   node scripts/orchestrate-migration-tests.mjs
 *   node scripts/orchestrate-migration-tests.mjs --configs-dir ./configs --skip-dist
 *
 * Run from the distributor/ folder (or anywhere — paths are resolved
 * relative to this script's location).
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DISTRIBUTOR_ROOT = path.resolve(__dirname, '..');

// ---- CLI args -------------------------------------------------------

const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  return args[i + 1];
}
const has = (name) => args.includes(`--${name}`);

const configsDirArg = flag('configs-dir', 'utils');
const skipDist = has('skip-dist');
const skipInstall = has('skip-install');
const skipAcceptance = has('skip-acceptance');

// ---- helpers ----------------------------------------------------------

function log(msg) {
  console.log(`[migrate-test] ${msg}`);
}

function run(cmd, cmdArgs, cwd, envExtra = {}) {
  log(`  $ ${cmd} ${cmdArgs.join(' ')}  (cwd: ${path.relative(DISTRIBUTOR_ROOT, cwd) || '.'})`);
  const result = spawnSync(cmd, cmdArgs, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...envExtra },
  });
  return {
    ok: result.status === 0,
    status: result.status,
    error: result.error,
  };
}

function readJsonSafe(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

// ---- 1. discover division configs -------------------------------------

function discoverConfigs() {
  const configsDir = path.resolve(DISTRIBUTOR_ROOT, configsDirArg);
  if (existsSync(configsDir)) {
    const files = readdirSync(configsDir).filter((f) => /\.ya?ml$/i.test(f));
    if (files.length > 0) {
      return files.map((f) => ({
        division: path.basename(f, path.extname(f)),
        configPath: path.join(configsDir, f),
      }));
    }
    log(`No .yml/.yaml files found in ${configsDir}, falling back to utils/config.yml`);
  } else {
    log(`${configsDir} does not exist yet, falling back to utils/config.yml`);
  }
  const fallback = path.resolve(DISTRIBUTOR_ROOT, 'utils/config.yml');
  if (!existsSync(fallback)) {
    throw new Error(`No division configs found (checked ${configsDir}/*.yml and ${fallback})`);
  }
  return [{ division: 'default', configPath: fallback }];
}

// ---- 2. run js-distributor-scripts for a division ----------------------

function toRelativeConfigPath(configPath) {
  // js-distributor-scripts (and shell:true on Windows) trip over absolute
  // paths that contain spaces (e.g. "...\Área de Trabalho\..."), because
  // spawnSync doesn't auto-quote array args for cmd.exe. A relative path
  // never carries that space — it only lives in the cwd — so use the same
  // style as the original "dist" script ("./utils/config.yml").
  const rel = path.relative(DISTRIBUTOR_ROOT, configPath).split(path.sep).join('/');
  return rel.startsWith('.') ? rel : `./${rel}`;
}

function distributeDivision(configPath) {
  if (skipDist) {
    log('  --skip-dist set, skipping js-distributor-scripts run');
    return { ok: true };
  }
  const relConfigPath = toRelativeConfigPath(configPath);
  log(`  running on config path: ${relConfigPath}`);
  return run(
    'npx',
    ['js-distributor-scripts', '-c', relConfigPath],
    DISTRIBUTOR_ROOT,
  );
}

// ---- 3. per-server test run --------------------------------------------

function testServer(division, serverId, testServerDir) {
  const row = {
    division,
    server: serverId,
    dir: path.relative(DISTRIBUTOR_ROOT, testServerDir).split(path.sep).join('/'),
    installOk: '',
    unitTotal: '',
    unitPassed: '',
    unitFailed: '',
    statementsPct: '',
    branchesPct: '',
    linesPct: '',
    functionsPct: '',
    acceptanceTotal: '',
    acceptancePassed: '',
    acceptanceFailed: '',
    acceptanceFlaky: '',
    acceptanceSkipped: '',
    notes: '',
  };

  if (!existsSync(testServerDir)) {
    row.notes = 'test server directory not generated (check generateTestServers in the config)';
    return row;
  }

  // npm install
  if (!skipInstall) {
    const install = run('npm', ['install'], testServerDir);
    row.installOk = install.ok;
    if (!install.ok) {
      row.notes = 'npm install failed, skipping tests';
      return row;
    }
  } else {
    row.installOk = 'skipped';
  }

  // unit tests + coverage
  // NOTE: pass a path *relative to cwd* (testServerDir) as the CLI arg, not
  // an absolute one — spawnSync with shell:true on Windows doesn't quote
  // array args itself, so an absolute path containing a space (e.g.
  // "...\Área de Trabalho\...") gets split into multiple tokens by cmd.exe
  // and jest/playwright silently receive the wrong argument. Reading the
  // result back from Node (readJsonSafe/path.join below) is unaffected —
  // that never goes through a shell — so we join with testServerDir there.
  const jestResultsRelative = 'jest-results.json';
  const jestResultsFile = path.join(testServerDir, jestResultsRelative);
  const unitTest = run(
    'node',
    [
      '--experimental-vm-modules',
      'node_modules/jest-cli/bin/jest.js',
      '--testPathPattern=test/',
      '--forceExit',
      '--coverage',
      '--coverageReporters=json-summary',
      '--json',
      `--outputFile=${jestResultsRelative}`,
    ],
    testServerDir,
  );
  // jest exits non-zero when tests fail, that's expected — still read the report
  const jestResults = readJsonSafe(jestResultsFile);
  if (jestResults) {
    row.unitTotal = jestResults.numTotalTests ?? '';
    row.unitPassed = jestResults.numPassedTests ?? '';
    row.unitFailed = jestResults.numFailedTests ?? '';
  } else {
    row.notes += (row.notes ? '; ' : '') + 'could not read jest-results.json';
  }

  const coverageSummary = readJsonSafe(path.join(testServerDir, 'coverage', 'coverage-summary.json'));
  if (coverageSummary?.total) {
    row.statementsPct = coverageSummary.total.statements.pct;
    row.branchesPct = coverageSummary.total.branches.pct;
    row.linesPct = coverageSummary.total.lines.pct;
    row.functionsPct = coverageSummary.total.functions.pct;
  } else {
    row.notes += (row.notes ? '; ' : '') + 'could not read coverage-summary.json';
  }

  if (unitTest.error) {
    row.notes += (row.notes ? '; ' : '') + `unit test run error: ${unitTest.error.message}`;
  }

  // acceptance tests
  if (!skipAcceptance) {
    const acceptanceResultsRelative = 'acceptance-results.json';
    const acceptanceResultsFile = path.join(testServerDir, acceptanceResultsRelative);
    const acceptance = run(
      'npx',
      ['playwright', 'test', '--reporter=json'],
      testServerDir,
      { PLAYWRIGHT_JSON_OUTPUT_NAME: acceptanceResultsRelative },
    );
    const acceptanceResults = readJsonSafe(acceptanceResultsFile);
    if (acceptanceResults?.stats) {
      const s = acceptanceResults.stats;
      row.acceptancePassed = s.expected ?? '';
      row.acceptanceFailed = s.unexpected ?? '';
      row.acceptanceFlaky = s.flaky ?? '';
      row.acceptanceSkipped = s.skipped ?? '';
      row.acceptanceTotal =
        (s.expected ?? 0) + (s.unexpected ?? 0) + (s.flaky ?? 0) + (s.skipped ?? 0);
    } else {
      row.notes += (row.notes ? '; ' : '') + 'could not read acceptance-results.json';
    }
    if (acceptance.error) {
      row.notes += (row.notes ? '; ' : '') + `acceptance test run error: ${acceptance.error.message}`;
    }
  } else {
    row.notes += (row.notes ? '; ' : '') + 'acceptance tests skipped (--skip-acceptance)';
  }

  return row;
}

// ---- 4. csv writing -----------------------------------------------------

const CSV_COLUMNS = [
  'division',
  'server',
  'dir',
  'installOk',
  'unitTotal',
  'unitPassed',
  'unitFailed',
  'statementsPct',
  'branchesPct',
  'linesPct',
  'functionsPct',
  'acceptanceTotal',
  'acceptancePassed',
  'acceptanceFailed',
  'acceptanceFlaky',
  'acceptanceSkipped',
  'notes',
];

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function writeCsv(rows) {
  const resultsDir = path.resolve(DISTRIBUTOR_ROOT, 'results');
  mkdirSync(resultsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = path.join(resultsDir, `migration-report-${stamp}.csv`);

  const lines = [CSV_COLUMNS.join(',')];
  for (const row of rows) {
    lines.push(CSV_COLUMNS.map((col) => csvEscape(row[col])).join(','));
  }
  writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');
  return outPath;
}

// ---- main ---------------------------------------------------------------

async function main() {
  const configs = discoverConfigs();
  log(`Found ${configs.length} division config(s): ${configs.map((c) => c.division).join(', ')}`);

  const rows = [];

  for (const { division, configPath } of configs) {
    log(`\n=== Division: ${division} (${configPath}) ===`);
    const config = yaml.load(readFileSync(configPath, 'utf8'));
    const servers = config.servers ?? [];
    if (servers.length === 0) {
      log(`  no servers defined in ${configPath}, skipping`);
      continue;
    }

    const dist = distributeDivision(configPath);
    if (!dist.ok) {
      log(`  js-distributor-scripts failed for ${division}, skipping its servers`);
      for (const s of servers) {
        rows.push({
          division,
          server: s.id,
          notes: 'js-distributor-scripts run failed, tests not attempted',
        });
      }
      continue;
    }

    const gen = config.codeGenerationParameters ?? {};
    const outputFolder = gen.outputFolder ?? '../distributed';
    const outputDir = path.resolve(path.dirname(configPath), outputFolder);

    for (const server of servers) {
      const serverId = server.id;
      const testServerDir = path.join(outputDir, `${serverId}-test-server`);
      log(`\n-- Server: ${division}/${serverId} --`);
      const row = testServer(division, serverId, testServerDir);
      rows.push(row);
    }
  }

  const outPath = writeCsv(rows);
  log(`\nReport written to ${outPath}`);

  const anyFailures = rows.some(
    (r) => Number(r.unitFailed) > 0 || Number(r.acceptanceFailed) > 0,
  );
  process.exitCode = anyFailures ? 1 : 0;
}

main().catch((err) => {
  console.error('[migrate-test] Fatal error:', err);
  process.exit(1);
});
