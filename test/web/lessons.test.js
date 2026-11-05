import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

// These are browser scripts that assign to globalThis; importing them runs them.
await import('../../web/lessons.js');
await import('../../web/lesson-model.js');
const { LESSONS, TRUST_LABELS, pathModel, lessonHeaderModel } = globalThis;

test('lessons are four, positions 1-4, labels known, every lesson sourced', () => {
  assert.deepEqual(LESSONS.map((l) => l.slug), ['euler', 'jacobian', 'sendov', 'navier-stokes']);
  assert.deepEqual(LESSONS.map((l) => l.position), [1, 2, 3, 4]);
  for (const l of LESSONS) {
    assert.ok(l.label in TRUST_LABELS, l.slug);
    assert.ok(l.sources.length >= 1 && l.sources.every((s) => /^https:\/\//.test(s.url)), l.slug);
  }
});

test('every available lesson has a page; no unavailable lesson is linked', async () => {
  for (const p of pathModel(LESSONS)) {
    if (p.href) await access(new URL(`../../web/${p.href}`, import.meta.url));
    else assert.equal(LESSONS.find((l) => l.slug === p.slug).available, false);
  }
});

test('checkedHere names a fixture whose committed verdict is CONFIRMED', async () => {
  const committed = JSON.parse(await readFile(new URL('../../results.json', import.meta.url), 'utf8'));
  for (const l of LESSONS.filter((x) => x.checkedHere)) {
    assert.equal(committed.results.find((r) => r.fixture === l.checkedHere)?.verdict, 'CONFIRMED', l.slug);
  }
});

test('badge only for CONFIRMED; absent results or a non-confirmed fixture give none', () => {
  const ok = { results: [{ fixture: 'euler/lander-parkin-1966', verdict: 'CONFIRMED' }] };
  assert.deepEqual(lessonHeaderModel(LESSONS, ok, 'euler').checkedHere, { fixture: 'euler/lander-parkin-1966', verdict: 'CONFIRMED' });
  assert.equal(lessonHeaderModel(LESSONS, undefined, 'euler').checkedHere, null);
  assert.equal(lessonHeaderModel(LESSONS, { results: [{ fixture: 'euler/lander-parkin-1966', verdict: 'REFUTED' }] }, 'euler').checkedHere, null);
  assert.equal(lessonHeaderModel(LESSONS, { results: [] }, 'euler').checkedHere, null);
});

test('prev/next skip unavailable lessons; ends have none', () => {
  const lessons = LESSONS.map((l) => ({ ...l, available: true }));
  assert.equal(lessonHeaderModel(lessons, undefined, 'euler').prev, null);
  assert.equal(lessonHeaderModel(lessons, undefined, 'navier-stokes').next, null);
  assert.equal(lessonHeaderModel(lessons, undefined, 'euler').next.href, 'jacobian.html');
  assert.equal(lessonHeaderModel(LESSONS, undefined, 'euler').next, null); // P1: the rest are unavailable
});

test('labelText and confirmed come through for every lesson', () => {
  const p = pathModel(LESSONS);
  assert.equal(p[0].labelText, 'Refereed');
  assert.equal(p[3].labelText, 'Unverified claim');
  assert.equal(p[3].confirmed, false);
});

test('lesson-header.js imports in Node without touching the DOM', async () => {
  await import('../../web/lesson-header.js');
  assert.equal(typeof globalThis.renderLessonHeader, 'function');
});
