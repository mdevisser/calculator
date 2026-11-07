import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

await import('../../web/lessons.js');
const jacobian = globalThis.LESSONS.find((l) => l.slug === 'jacobian');
const read = () => readFile(new URL('../../web/lessons/jacobian.html', import.meta.url), 'utf8');
const textOf = (html) =>
  html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

test('Jacobian is available and checked here against the real map', async () => {
  assert.equal(jacobian.available, true);
  assert.equal(jacobian.checkedHere, 'jacobian/alpoge-2026');
  const committed = JSON.parse(await readFile(new URL('../../results.json', import.meta.url), 'utf8'));
  assert.equal(committed.results.find((r) => r.fixture === 'jacobian/alpoge-2026').verdict, 'CONFIRMED');
});

test('the first paragraph carries the dimension qualifier (spec §7)', async () => {
  const main = (await read()).split('<main')[1];
  const first = textOf(main.match(/<p[^>]*>([\s\S]*?)<\/p>/)[1]);
  assert.match(first, /dimension 3/);
  assert.match(first, /two-dimensional case is still open/);
});

test('the page loads its exact checker and links the ledger', async () => {
  const html = await read();
  assert.match(html, /<script src="\.\/jacobian-check\.js"><\/script>/);
  assert.match(html, /href="\.\.\/checks\.html"/);
  assert.doesNotMatch(html, /✅|❌/);
});

test('every refutation sentence keeps the qualifier', async () => {
  const text = textOf(await read());
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if (/\b(refut|disprov|false|broke|breaks|broken)/i.test(sentence) && /conjecture|guess/i.test(sentence)) {
      assert.match(sentence, /dimension|3D|three dimensions|two-dimensional/i, sentence);
    }
  }
});

test('the page states the map facts from the dossier', async () => {
  const text = textOf(await read());
  assert.match(text, /−2/);
  assert.match(text, /13\/2/);
  assert.match(text, /−1\/4/);
  assert.match(text, /Keller/);
  assert.match(text, /1939/);
  assert.doesNotMatch(text, /\b(solved|proven)\b/i);
});
