import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Structure every available lesson page shares (spec §6.2), checked once for all.
await import('../../web/lessons.js');
const SECTIONS = ['trust', 'question', 'found', 'check', 'key-idea', 'why', 'open', 'sources'];

for (const lesson of globalThis.LESSONS.filter((l) => l.available)) {
  test(`${lesson.slug}: story-layout structure, header, and file:// rules`, async () => {
    const html = await readFile(new URL(`../../web/lessons/${lesson.slug}.html`, import.meta.url), 'utf8');
    const ids = [...html.matchAll(/<section id="([a-z-]+)"/g)].map((m) => m[1]);
    assert.deepEqual(ids, SECTIONS);
    assert.match(html, /<section id="key-idea"[^>]*data-pending="session"/);
    assert.match(html, /We'll work this out together in a session\./);
    assert.match(html, /\.\.\/results\.js[\s\S]*\.\.\/lessons\.js[\s\S]*\.\.\/lesson-model\.js[\s\S]*\.\.\/lesson-header\.js/);
    assert.doesNotMatch(html, /fetch\(|type="module"|innerHTML/);
    assert.match(html, new RegExp(`renderLessonHeader\\('${lesson.slug}'\\)`));
  });
}
