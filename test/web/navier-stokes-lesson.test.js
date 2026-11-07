import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

await import('../../web/lessons.js');
const html = await readFile(new URL('../../web/lessons/navier-stokes.html', import.meta.url), 'utf8');
const text = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const ns = globalThis.LESSONS.find((l) => l.slug === 'navier-stokes');

// CLAUDE.md Reporting Accuracy: forced version, unverified, priority disputed.
test('says forced, disputed, and the Clay two-year rule', () => {
  assert.match(text, /forced/i);
  assert.match(text, /disputed/i);
  assert.match(text, /two years/i);
});

test('never says the claim is solved or proved', () => {
  assert.doesNotMatch(text, /\b(solved|proved|proven)\b/i);
});

test('section 4 explains why nobody can check it yet, and has no picture', () => {
  assert.match(html, /Can anyone check it yet\?/);
  assert.doesNotMatch(html, /<svg|<canvas/);
});

test('available, Unverified claim, confirmed from primary sources', () => {
  assert.equal(ns.available, true);
  assert.equal(ns.label, 'unverified');
  assert.equal(ns.confirmed, true);
  const urls = ns.sources.map((s) => s.url).join(' ');
  assert.match(urls, /cdn\.openai\.com/);
  assert.match(urls, /claymath\.org/);
  assert.match(urls, /cims\.nyu\.edu\/~tristanb\/statement\.pdf/);
});
