import { writeFile } from 'node:fs/promises';
import { VERDICT } from './verdict.js';

const GLYPH = {
  CONFIRMED: 'PASS',
  REFUTED: 'FAIL',
  INDETERMINATE: '????',
  ERROR: 'ERR ',
};

export function buildReport(results) {
  const tally = Object.fromEntries(Object.values(VERDICT).map((v) => [v, 0]));
  for (const result of results) {
    // A verdict name the contract does not define is our bug, not a
    // mathematical finding, so it lands in ERROR (I3) rather than adding a
    // stray key and an NaN to the summary.
    const verdict = Object.hasOwn(tally, result.verdict) ? result.verdict : VERDICT.ERROR;
    tally[verdict] += 1;
  }
  return {
    generatedAt: new Date().toISOString(),
    tally,
    unexpected: results.filter((r) => !r.asExpected).length,
    results,
  };
}

// results.json and web/results.js are committed so the page needs no build. A
// timestamp or a timing in them means every run dirties the tree with a diff
// that says nothing — and diff noise is exactly what stops people re-running
// verify, which is what makes a stale published page likely. Timings stay in
// the in-memory report, where the terminal can show them.
export function toPersisted(report) {
  const { generatedAt, ...stable } = report;
  return {
    ...stable,
    results: report.results.map(({ elapsedMs, ...result }) => result),
  };
}

export function formatTerminal(report) {
  const lines = [];
  for (const result of report.results) {
    const flag = result.asExpected ? ' ' : '<';
    const detail = result.reason ? `  (${result.reason})` : '';
    const timing =
      typeof result.elapsedMs === 'number' ? `  ${result.elapsedMs.toFixed(2)} ms` : '';
    lines.push(
      `  ${GLYPH[result.verdict]} ${flag} ${result.fixture.padEnd(48)} ${result.verdict}${detail}${timing}`,
    );
    for (const check of result.checks) {
      lines.push(
        `           ${check.pass ? 'ok  ' : 'FAIL'} ${check.name}` +
          (check.pass ? '' : `\n                expected ${check.expected}\n                actual   ${check.actual}`),
      );
    }
  }
  const counts = Object.entries(report.tally)
    .filter(([, n]) => n > 0)
    .map(([verdict, n]) => `${n} ${verdict.toLowerCase()}`)
    .join(', ');
  lines.push('');
  lines.push(`  ${counts} — ${report.unexpected} unexpected`);
  return lines.join('\n');
}

export async function writeReport(report, { jsonPath, jsPath }) {
  const json = JSON.stringify(toPersisted(report), null, 2);
  await writeFile(jsonPath, `${json}\n`, 'utf8');
  // Browsers block fetch() from file:// origins. A script assignment keeps the
  // page openable by double-clicking, with no server and no build step.
  await writeFile(jsPath, `globalThis.RESULTS = ${json};\n`, 'utf8');
}
