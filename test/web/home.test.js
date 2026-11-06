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

test('home loads news by script and renders through newsModel', () => {
  assert.match(html, /<script src="\.\/news\.js"><\/script>/);
  assert.match(html, /<script src="\.\/news-model\.js"><\/script>/);
  assert.match(html, /newsModel\(globalThis\.NEWS/);
  assert.match(html, /News didn.t load/);
  assert.match(html, /No news yet/);
  assert.doesNotMatch(html, /innerHTML/);
  assert.doesNotMatch(html, /News watch arrives in a later update/);
});

// Card text comes from the open web via the routine, and private browsing can
// make localStorage throw. Either must leave the page working.
test('every localStorage access is inside a try block', () => {
  const uses = [...html.matchAll(/localStorage/g)];
  assert.ok(uses.length >= 2, 'expected a read and a write');
  for (const m of uses) {
    const before = html.slice(0, m.index);
    assert.ok(before.lastIndexOf('try {') > before.lastIndexOf('}'), `localStorage outside try at ${m.index}`);
  }
});

test('news cards show the unconfirmed marker', () => {
  assert.match(html, /not yet confirmed against primary sources/);
});

test('the ledger moved intact', async () => {
  const ledger = await readFile(new URL('../../web/checks.html', import.meta.url), 'utf8');
  assert.match(ledger, /<title>Check ledger<\/title>/);
  assert.match(ledger, /href="\.\/index\.html"/);
});
