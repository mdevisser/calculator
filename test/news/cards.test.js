import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateNews, newsToJs, CLAIM_TYPES } from '../../src/news/cards.js';

await import('../../web/lessons.js');
const KEYS = Object.keys(globalThis.TRUST_LABELS);
const ROOT = fileURLToPath(new URL('../..', import.meta.url));

const good = () => ({
  checkedThrough: '2026-05-31',
  cards: [{
    id: '2026-09-navier-stokes',
    announced: '2026-09-09',
    title: 'Navier–Stokes (forced) claim',
    claimants: ['OpenAI'],
    aiSystem: 'GPT-5',
    claimType: 'proof',
    label: 'unverified',
    summary: 'A claimed proof about the forced version. Nobody independent has checked it yet.',
    sources: [{ title: 'Announcement', url: 'https://example.org/post' }],
  }],
});

test('claim types are the four the spec names', () => {
  assert.deepEqual(CLAIM_TYPES, ['proof', 'counterexample', 'construction', 'other']);
});

test('a well-formed document has no errors', () => {
  assert.deepEqual(validateNews(good(), KEYS), []);
});

test('the committed seed is valid and starts the window at 2026-05-31', async () => {
  const committed = JSON.parse(await readFile(path.join(ROOT, 'news/cards.json'), 'utf8'));
  assert.equal(committed.checkedThrough, '2026-05-31');
  assert.deepEqual(validateNews(committed, KEYS), []);
});

for (const [name, mutate, rule] of [
  ['duplicate id', (d) => d.cards.push({ ...d.cards[0] }), /duplicate/],
  ['unknown label', (d) => { d.cards[0].label = 'solved'; }, /label/],
  ['unknown claim type', (d) => { d.cards[0].claimType = 'theorem'; }, /claimType/],
  ['no sources', (d) => { d.cards[0].sources = []; }, /source/],
  ['http url', (d) => { d.cards[0].sources[0].url = 'http://x.org'; }, /https/],
  ['javascript url', (d) => { d.cards[0].sources[0].url = 'javascript:alert(1)'; }, /https/],
  ['impossible date', (d) => { d.cards[0].announced = '2026-02-30'; }, /date/],
  ['id month differs from announced', (d) => { d.cards[0].id = '2026-08-navier-stokes'; }, /month/],
  ['bad id shape', (d) => { d.cards[0].id = 'Navier Stokes'; }, /id/],
  ['empty claimants', (d) => { d.cards[0].claimants = []; }, /claimants/],
  ['missing aiSystem key', (d) => { delete d.cards[0].aiSystem; }, /aiSystem/],
  ['unknown card key', (d) => { d.cards[0].verified = true; }, /unknown/],
  ['empty summary', (d) => { d.cards[0].summary = ' '; }, /summary/],
  ['bad checkedThrough', (d) => { d.checkedThrough = 'last week'; }, /checkedThrough/],
  ['not an object', (d) => { d.cards = 'none'; }, /cards/],
]) {
  test(`rejects ${name}`, () => {
    const d = good();
    mutate(d);
    const errors = validateNews(d, KEYS);
    assert.ok(errors.some((m) => rule.test(m)), errors.join('\n') || '(no errors)');
  });
}

test('rejects a document that is not an object at all', () => {
  assert.ok(validateNews(null, KEYS).length > 0);
});

test('web/news.js carries exactly news/cards.json', async () => {
  const doc = JSON.parse(await readFile(path.join(ROOT, 'news/cards.json'), 'utf8'));
  const js = await readFile(path.join(ROOT, 'web/news.js'), 'utf8');
  assert.equal(js, newsToJs(doc), 'web/news.js is stale — run: node bin/news.js');
});

test('bin/news.js exits 1 and writes nothing on an invalid file', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'news-'));
  const bad = good();
  bad.cards[0].label = 'solved';
  const cardsPath = path.join(dir, 'cards.json');
  const outPath = path.join(dir, 'news.js');
  await writeFile(cardsPath, JSON.stringify(bad));
  const r = spawnSync(process.execPath, ['bin/news.js'], {
    cwd: ROOT, encoding: 'utf8', env: { ...process.env, NEWS_CARDS: cardsPath, NEWS_JS: outPath },
  });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /label/);
  await assert.rejects(access(outPath));
});

test('bin/news.js writes the page file for a valid document', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'news-'));
  const cardsPath = path.join(dir, 'cards.json');
  const outPath = path.join(dir, 'news.js');
  await writeFile(cardsPath, JSON.stringify(good()));
  const r = spawnSync(process.execPath, ['bin/news.js'], {
    cwd: ROOT, encoding: 'utf8', env: { ...process.env, NEWS_CARDS: cardsPath, NEWS_JS: outPath },
  });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /1 card.*checked through 2026-05-31/);
  assert.equal(await readFile(outPath, 'utf8'), newsToJs(good()));
});
