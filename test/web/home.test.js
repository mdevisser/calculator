import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../../web/index.html', import.meta.url), 'utf8');

test('home loads data by script, never fetch or modules', () => {
  assert.match(html, /<script src="\.\/lessons\.js"><\/script>\s*<script src="\.\/lesson-model\.js"><\/script>/);
  assert.doesNotMatch(html, /fetch\(|type="module"/);
});

test('home renders the path from pathModel and links the ledger', () => {
  assert.match(html, /pathModel\(globalThis\.LESSONS\)/);
  assert.match(html, /href="checks\.html"/);
  assert.match(html, /id="news"/);
});

// The null-href → not-a-link rule itself is pinned on pathModel in
// lessons.test.js; this checks the page says so to the reader.
test('unavailable steps say so', () => {
  assert.match(html, /coming soon/);
  assert.match(html, /unavailable/);
});

test('the ledger moved intact', async () => {
  const ledger = await readFile(new URL('../../web/checks.html', import.meta.url), 'utf8');
  assert.match(ledger, /<title>Check ledger<\/title>/);
  assert.match(ledger, /href="\.\/index\.html"/);
});
