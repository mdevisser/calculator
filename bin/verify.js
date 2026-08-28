#!/usr/bin/env node
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { runAll, runFixture } from '../src/harness/runner.js';
import { FixtureError } from '../src/harness/schema.js';
import { buildReport, formatTerminal, writeReport } from '../src/harness/report.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FIXTURES = path.join(ROOT, 'fixtures');

const USAGE = `usage:
  node bin/verify.js --all              verify every fixture
  node bin/verify.js <problem>/<name>   verify one fixture
`;

async function main(argv) {
  const target = argv[0];

  if (!target || target === '--help' || target === '-h') {
    process.stdout.write(USAGE);
    return 0;
  }

  let results;
  if (target === '--all') {
    results = await runAll(FIXTURES);
  } else {
    const file = path.join(FIXTURES, `${target}.json`);
    let raw = null;
    let loadError = null;
    try {
      raw = JSON.parse(await readFile(file, 'utf8'));
    } catch (error) {
      // A typo is a usage error, not a verdict: say what is missing and stop.
      // A file that exists but will not parse is a fixture problem, and gets an
      // ERROR verdict with a reason code, exactly as it would under --all.
      if (error.code === 'ENOENT') {
        process.stderr.write(
          `verify: no such fixture: ${target}\n` +
            `  looked for ${path.relative(ROOT, file)}\n\n${USAGE}`,
        );
        return 2;
      }
      loadError = new FixtureError(`cannot read fixture: ${error.message}`, 'unreadable');
    }
    results = [runFixture(raw, target, loadError)];
  }

  const report = buildReport(results);
  process.stdout.write(`${formatTerminal(report)}\n`);

  await writeReport(report, {
    jsonPath: path.join(ROOT, 'results.json'),
    jsPath: path.join(ROOT, 'web', 'results.js'),
  });

  // A REFUTED negative control is a pass. Only a mismatch against the
  // fixture's declared expectation is a failure.
  return report.unexpected === 0 ? 0 : 1;
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (error) => {
    process.stderr.write(`${error.stack}\n`);
    process.exit(2);
  },
);
