import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { runAll } from '../../src/harness/runner.js';
import { SEARCH_STATE } from '../../src/harness/verdict.js';
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

// I2 keeps the exhaustiveness cell always populated, but it used to be
// reconstructed from `requiresSearch`/`exhaustive` on the page, so a row
// refuted before any search ran — and a row with no data to search at all —
// both read "NO — verdict capped at indeterminate". Nothing was capped in
// either. The label function is lifted out of the page and run against the
// real rows so the assertions are about what a reader actually sees.
async function labeller() {
  const html = await readFile(new URL('../../web/index.html', import.meta.url), 'utf8');
  const src = html.match(/ {2}function exhaustivenessLabel[\s\S]*?\n {2}\}/);
  assert.ok(src, 'the page should define exhaustivenessLabel');
  return new Function(`${src[0]}; return exhaustivenessLabel;`)();
}

test('every row gets a non-empty exhaustiveness label', async () => {
  const label = await labeller();
  const results = await runAll(FIXTURES);
  for (const r of results) {
    const text = label(r);
    assert.equal(typeof text, 'string');
    assert.ok(text.length > 0, `${r.fixture} has a blank exhaustiveness cell`);
    assert.notEqual(text, 'unreported', `${r.fixture} reports no search state`);
  }
});

test('the exhaustiveness label distinguishes every state a row can be in', async () => {
  const label = await labeller();
  const results = await runAll(FIXTURES);
  const byFixture = new Map(results.map((r) => [r.fixture, r]));

  // Refuted before any search: not capped, and it must not say so.
  const preSearch = byFixture.get('dgg/negative-broken-flow');
  assert.equal(preSearch.verdict, 'REFUTED');
  assert.equal(preSearch.searchState, 'not-reached');
  assert.doesNotMatch(label(preSearch), /capped/);
  assert.match(label(preSearch), /refuted before searching/);

  // Unsourced: there is no candidate data, so no budget could have been spent.
  const unsourced = byFixture.get('dgg/rybin-2026');
  assert.equal(unsourced.reason, 'missing-source-data');
  assert.doesNotMatch(label(unsourced), /capped/);
  assert.match(label(unsourced), /no candidate data/);

  // A completed exhaustive search still reports its count.
  const complete = byFixture.get('dgg/juang-family-7-2-1');
  assert.equal(complete.searchState, 'complete');
  assert.equal(label(complete), `yes (${complete.searched} searched)`);

  // A problem that needs no search says exactly that.
  const noSearch = byFixture.get('euler/elkies-1988');
  assert.equal(noSearch.searchState, 'not-required');
  assert.match(label(noSearch), /not required/);

  // Rows the harness never got to run, and rows whose search was genuinely
  // capped, keep their own distinct labels.
  assert.match(label({ verdict: 'ERROR' }), /no verification ran/);
  assert.match(label({ verdict: 'INDETERMINATE', searchState: 'capped' }), /capped at indeterminate/);
});

// The enum and the page are one contract: a state added to SEARCH_STATE that
// the page does not handle would silently render as "unreported".
test('the page has a label for every search state the harness can report', async () => {
  const label = await labeller();
  for (const state of Object.values(SEARCH_STATE)) {
    const text = label({ verdict: 'INDETERMINATE', searchState: state, searched: 0 });
    assert.notEqual(text, 'unreported', `the page has no label for ${state}`);
  }
});

// source.note is optional provenance detail. The page must render it when it
// is there and print nothing when it is not, and the fixture set exercises
// both branches.
test('the page renders source.note only when a fixture carries one', async () => {
  const html = await readFile(new URL('../../web/index.html', import.meta.url), 'utf8');
  assert.match(html, /if \(r\.source\.note\) prov\.appendChild/);

  const results = await runAll(FIXTURES);
  const withNote = results.filter((r) => r.source && r.source.note);
  const withoutNote = results.filter((r) => r.source && !r.source.note);
  assert.ok(withNote.length > 0, 'no fixture exercises the note branch');
  assert.ok(withoutNote.length > 0, 'no fixture exercises the absent-note branch');
});
