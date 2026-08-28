import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { runAll } from '../../src/harness/runner.js';
import { buildReport, toPersisted } from '../../src/harness/report.js';

const FIXTURES = fileURLToPath(new URL('../../fixtures', import.meta.url));

test('every result carries the fields the page renders', async () => {
  const results = await runAll(FIXTURES);
  for (const result of results) {
    for (const field of ['fixture', 'problem', 'candidate', 'claim', 'verdict', 'expect', 'asExpected', 'checks', 'source']) {
      assert.ok(field in result, `${result.fixture} is missing ${field}`);
    }
    // I2 as a rendering precondition.
    assert.ok(result.source && result.source.url, `${result.fixture} has no source url`);
    assert.equal(typeof result.source.peerReviewed, 'boolean');
  }
});

test('the page loads results by script assignment, not fetch', async () => {
  const html = await readFile(new URL('../../web/index.html', import.meta.url), 'utf8');
  assert.match(html, /<script src="\.\/results\.js"><\/script>/);
  assert.doesNotMatch(html, /fetch\(/, 'fetch() is blocked from file:// origins');
});

// Nothing used to check that the committed artifact still described the fixtures
// on disk, so editing a fixture and forgetting to re-run left the page quietly
// lying. This is that check.
test('the committed results.json matches a fresh run of the fixtures on disk', async () => {
  const fresh = toPersisted(buildReport(await runAll(FIXTURES)));
  const committed = JSON.parse(
    await readFile(new URL('../../results.json', import.meta.url), 'utf8'),
  );
  assert.deepEqual(committed, fresh, 'results.json is stale — run: node bin/verify.js --all');
});

test('web/results.js carries exactly the committed report', async () => {
  const committed = await readFile(new URL('../../results.json', import.meta.url), 'utf8');
  const js = await readFile(new URL('../../web/results.js', import.meta.url), 'utf8');
  assert.equal(js, `globalThis.RESULTS = ${committed.trimEnd()};\n`);
});

test('the page renders no field the artifact does not persist', async () => {
  const html = await readFile(new URL('../../web/index.html', import.meta.url), 'utf8');
  for (const volatile of ['elapsedMs', 'generatedAt']) {
    assert.doesNotMatch(html, new RegExp(volatile), `${volatile} is not persisted`);
  }
});

// I2 keeps the exhaustiveness cell always populated, but an ERROR row was
// labelled "NO — verdict capped at indeterminate", which describes a different
// state entirely: nothing was capped, nothing ran.
test('the exhaustive cell has its own label for ERROR rows and is never blank', async () => {
  const html = await readFile(new URL('../../web/index.html', import.meta.url), 'utf8');
  const start = html.indexOf('const exh =');
  const cell = html.slice(start, html.indexOf('tr.appendChild(exh)', start));

  assert.ok(start > 0, 'the exhaustive cell should still exist');
  assert.match(cell, /ERROR/, 'error rows need a label of their own');
  assert.ok(
    cell.indexOf('ERROR') < cell.indexOf('capped at indeterminate'),
    'the ERROR branch must be reached before the capped-verdict label',
  );
  assert.doesNotMatch(cell, /''/, 'I2: the cell is never blank');
});
