import test from 'node:test';
import assert from 'node:assert/strict';

await import('../../web/lessons.js');
await import('../../web/news-model.js');
const { newsModel, TRUST_LABELS } = globalThis;

const card = (over) => ({
  id: '2026-09-navier-stokes', announced: '2026-09-09', title: 'T', claimants: ['OpenAI'],
  aiSystem: 'GPT-5', claimType: 'proof', label: 'unverified', summary: 'S.',
  sources: [{ title: 'A', url: 'https://example.org' }], ...over,
});

test('null when NEWS did not load', () => {
  assert.equal(newsModel(undefined, [], TRUST_LABELS), null);
  assert.equal(newsModel({}, [], TRUST_LABELS), null);
});

test('an empty feed gives an empty list', () => {
  assert.deepEqual(newsModel({ checkedThrough: '2026-05-31', cards: [] }, [], TRUST_LABELS), []);
});

test('newest first, ties broken by id', () => {
  const news = { checkedThrough: '2026-10-01', cards: [
    card({ id: '2026-07-b', announced: '2026-07-01' }),
    card({ id: '2026-09-a', announced: '2026-09-09' }),
    card({ id: '2026-07-a', announced: '2026-07-01' }),
  ] };
  assert.deepEqual(newsModel(news, [], TRUST_LABELS).map((c) => c.id), ['2026-09-a', '2026-07-a', '2026-07-b']);
});

test('a card is new unless its id was seen', () => {
  const news = { checkedThrough: '2026-10-01', cards: [card({ id: '2026-09-a' }), card({ id: '2026-09-b' })] };
  const m = newsModel(news, ['2026-09-a'], TRUST_LABELS);
  assert.deepEqual(m.map((c) => [c.id, c.isNew]), [['2026-09-a', false], ['2026-09-b', true]]);
});

test('byline, claim type and label text', () => {
  const [a] = newsModel({ checkedThrough: '2026-10-01', cards: [card()] }, [], TRUST_LABELS);
  assert.equal(a.byline, 'OpenAI with GPT-5');
  assert.equal(a.claimTypeText, 'Proof');
  assert.equal(a.labelText, 'Unverified claim');
  assert.equal(a.isUnverified, true);
  const [b] = newsModel({ checkedThrough: '2026-10-01', cards: [card({ claimants: ['Jane Doe', 'Ann Lee'], aiSystem: null, label: 'refereed', claimType: 'counterexample' })] }, [], TRUST_LABELS);
  assert.equal(b.byline, 'Jane Doe, Ann Lee');
  assert.equal(b.claimTypeText, 'Counterexample');
  assert.equal(b.labelText, 'Refereed');
  assert.equal(b.isUnverified, false);
});

test('does not mutate the input', () => {
  const news = { checkedThrough: '2026-10-01', cards: [card({ id: '2026-07-b', announced: '2026-07-01' }), card()] };
  const before = JSON.stringify(news);
  newsModel(news, [], TRUST_LABELS);
  assert.equal(JSON.stringify(news), before);
});
