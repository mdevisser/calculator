import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildReport, formatTerminal, writeReport, toPersisted } from '../../src/harness/report.js';

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

test('the terminal output still shows per-fixture timings', () => {
  assert.match(formatTerminal(buildReport(results)), /1\.00 ms/);
});

// results.json is committed. A timestamp or a timing in it dirties the tree on
// every run, and diff noise is what stops people re-running verify at all.
test('the persisted report carries nothing that changes run to run', () => {
  const persisted = toPersisted(buildReport(results));
  assert.equal('generatedAt' in persisted, false);
  for (const result of persisted.results) {
    assert.equal('elapsedMs' in result, false);
  }
  assert.equal(persisted.tally.CONFIRMED, 1);
  assert.equal(persisted.unexpected, 1);
  assert.equal(persisted.results.length, 3);
});

test('writeReport persists the deterministic form, byte for byte repeatable', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'verify-'));
  const jsonPath = path.join(dir, 'results.json');
  const jsPath = path.join(dir, 'results.js');

  await writeReport(buildReport(results), { jsonPath, jsPath });
  const first = await readFile(jsonPath, 'utf8');
  await writeReport(buildReport(results), { jsonPath, jsPath });

  assert.equal(await readFile(jsonPath, 'utf8'), first);
  assert.doesNotMatch(first, /generatedAt|elapsedMs/);
});
