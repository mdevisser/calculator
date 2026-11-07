import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

await import('../../web/lessons.js');
const sendov = globalThis.LESSONS.find((l) => l.slug === 'sendov');
const read = () => readFile(new URL('../../web/lessons/sendov.html', import.meta.url), 'utf8');

test('Sendov is available on the path', () => {
  assert.equal(sendov.available, true);
});

test('the picture is labelled as rounded math and never gives a verdict', async () => {
  const html = await read();
  assert.match(html, /<script src="\.\/sendov-picture\.js"><\/script>/);
  assert.match(html, /rounded math, fine for seeing, not proof/);
  assert.doesNotMatch(html, /✅/);
  assert.match(html, /See it for yourself/);
  assert.match(html, /createElementNS/);
});

test('the label is Computer-checked proof, confirmed from primary sources', () => {
  assert.equal(sendov.label, 'computer-checked');
  assert.equal(sendov.confirmed, true);
  const urls = sendov.sources.map((s) => s.url).join(' ');
  assert.match(urls, /github\.com\/teorth\/sendov/);
  assert.match(urls, /terrytao\.wordpress\.com\/2026\/08\/12/);
  assert.match(urls, /proofatlas\.ai/);
});
