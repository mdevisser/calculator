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
  assert.equal(lessonHeaderModel(LESSONS, undefined, 'euler').next.href, 'jacobian.html'); // P3: all four lessons live
});

test('labelText and confirmed come through for every lesson', () => {
  const p = pathModel(LESSONS);
  assert.equal(p[0].labelText, 'Refereed');
  assert.equal(p[3].labelText, 'Unverified claim');
  assert.equal(p[3].confirmed, true); // P4: confirmed against primary sources (docs/sources/navier-stokes.md)
});

test('lesson-header.js imports in Node without touching the DOM', async () => {
  await import('../../web/lesson-header.js');
  assert.equal(typeof globalThis.renderLessonHeader, 'function');
  const src = await readFile(new URL('../../web/lesson-header.js', import.meta.url), 'utf8');
  assert.match(src, /byline/);
});

test('every lesson has a date and claimants, and the header shows them', () => {
  for (const l of LESSONS) {
    assert.ok(typeof l.announced === 'string' && l.announced.trim(), l.slug);
    assert.ok(typeof l.claimants === 'string' && l.claimants.trim(), l.slug);
    assert.equal(lessonHeaderModel(LESSONS, undefined, l.slug).byline, `${l.claimants} · ${l.announced}`);
  }
});

test('navigation skips unavailable Jacobian: euler → sendov → navier-stokes', () => {
  const lessons = LESSONS.map((l) => ({ ...l, available: l.slug !== 'jacobian' }));
  assert.equal(lessonHeaderModel(lessons, undefined, 'euler').next.href, 'sendov.html');
  assert.equal(lessonHeaderModel(lessons, undefined, 'sendov').prev.href, 'euler.html');
  assert.equal(lessonHeaderModel(lessons, undefined, 'sendov').next.href, 'navier-stokes.html');
  assert.equal(lessonHeaderModel(lessons, undefined, 'navier-stokes').prev.href, 'sendov.html');
});

test('a confirmed label cites at least one source that is not Wikipedia', () => {
  for (const l of LESSONS.filter((x) => x.confirmed)) {
    assert.ok(l.sources.some((s) => !/wikipedia\.org/.test(s.url)), l.slug);
  }
});

test('Navier–Stokes stays an Unverified claim', () => {
  assert.equal(LESSONS.find((l) => l.slug === 'navier-stokes').label, 'unverified');
});

test('Jacobian metadata is confirmed from primary sources', () => {
  const j = LESSONS.find((l) => l.slug === 'jacobian');
  assert.equal(j.label, 'computer-checked');
  assert.equal(j.confirmed, true);
  assert.match(j.title, /dimension ≥ 3/);
  const urls = j.sources.map((s) => s.url).join(' ');
  assert.match(urls, /isa-afp\.org\/entries\/Jacobian_Counterexample/);
  assert.match(urls, /x\.com\/__alpoge__\/status\/2079028340955197566/);
  assert.match(urls, /github\.com\/(DrAlexHarrison\/jacobian-anatomy|deancureton\/jacobian)/);
});
