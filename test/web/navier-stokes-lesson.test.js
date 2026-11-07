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

// Final-review fixes: each sentence below once misstated its source.
test('Clay is quoted as describing the announcement, not judging it', () => {
  assert.match(text, /the announcement that the Navier-Stokes problem has apparently been settled/);
  assert.equal((text.match(/settled/g) || []).length, 1, 'any other "settled" reads as a verdict');
});

test('the priority dispute has the right order and the right sourcing', () => {
  assert.doesNotMatch(text, /The same day/);
  assert.match(text, /evening of 7 September/);
  assert.match(text, /tipped/);
  assert.doesNotMatch(text, /Buckmaster has said OpenAI learned/);
  assert.doesNotMatch(text, /had those results on 15 August/);
  assert.match(text, /Boussinesq and Euler results on 15 August/);
});

test('the Lean critique is stated at full strength, and unsourced claims are gone', () => {
  assert.doesNotMatch(text, /slightly different|step by step/);
  assert.match(text, /does not correspond to its written proof/);
  assert.doesNotMatch(text, /People outside OpenAI have rebuilt it/);
});

test('words a beginner needs are defined, and nothing overstates the paper', () => {
  assert.doesNotMatch(text, /small region/);
  assert.match(text, /limited region/);
  assert.match(text, /thick or sticky/);
  assert.doesNotMatch(text, /a blow-up happens at a single point/);
  assert.doesNotMatch(text, /A real fluid can.t do that/);
});
