import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { runAll } from '../../src/harness/runner.js';

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
