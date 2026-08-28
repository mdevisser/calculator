import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildReport, formatTerminal, writeReport } from '../../src/harness/report.js';

const results = [
  { fixture: 'euler/a', problem: 'euler', verdict: 'CONFIRMED', expect: 'CONFIRMED', asExpected: true, checks: [], elapsedMs: 1 },
  { fixture: 'euler/b', problem: 'euler', verdict: 'REFUTED', expect: 'REFUTED', asExpected: true, checks: [], elapsedMs: 1 },
  { fixture: 'euler/c', problem: 'euler', verdict: 'ERROR', expect: 'CONFIRMED', asExpected: false, reason: 'malformed', checks: [], elapsedMs: 1 },
];

test('buildReport tallies verdicts and counts surprises', () => {
  const report = buildReport(results);
  assert.equal(report.tally.CONFIRMED, 1);
  assert.equal(report.tally.REFUTED, 1);
  assert.equal(report.tally.ERROR, 1);
  assert.equal(report.tally.INDETERMINATE, 0);
  assert.equal(report.unexpected, 1);
  assert.ok(report.generatedAt.endsWith('Z'));
});

test('formatTerminal marks the surprise and names its reason', () => {
  const text = formatTerminal(buildReport(results));
  assert.match(text, /euler\/c/);
  assert.match(text, /malformed/);
  assert.match(text, /1 unexpected/);
});

test('writeReport emits canonical JSON and a file-protocol-safe script', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'verify-'));
  const jsonPath = path.join(dir, 'results.json');
  const jsPath = path.join(dir, 'results.js');
  const report = buildReport(results);

  await writeReport(report, { jsonPath, jsPath });

  const json = JSON.parse(await readFile(jsonPath, 'utf8'));
  assert.equal(json.tally.CONFIRMED, 1);

  const js = await readFile(jsPath, 'utf8');
  assert.ok(js.startsWith('globalThis.RESULTS = '), 'must load via a plain script tag from file://');
  assert.ok(js.trimEnd().endsWith(';'));
});
