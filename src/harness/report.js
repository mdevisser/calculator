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
    tally[result.verdict] += 1;
  }
  return {
    generatedAt: new Date().toISOString(),
    tally,
    unexpected: results.filter((r) => !r.asExpected).length,
    results,
  };
}

export function formatTerminal(report) {
  const lines = [];
  for (const result of report.results) {
    const flag = result.asExpected ? ' ' : '<';
    const detail = result.reason ? `  (${result.reason})` : '';
    lines.push(
      `  ${GLYPH[result.verdict]} ${flag} ${result.fixture.padEnd(48)} ${result.verdict}${detail}`,
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
  const json = JSON.stringify(report, null, 2);
  await writeFile(jsonPath, `${json}\n`, 'utf8');
  // Browsers block fetch() from file:// origins. A script assignment keeps the
  // page openable by double-clicking, with no server and no build step.
  await writeFile(jsPath, `globalThis.RESULTS = ${json};\n`, 'utf8');
}
