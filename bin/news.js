#!/usr/bin/env node
// Validates news/cards.json and writes web/news.js for the home page.
// Exits 1 and writes nothing when any card breaks a rule.
// NEWS_CARDS and NEWS_JS override the paths (tests use them).

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateNews, newsToJs } from '../src/news/cards.js';

await import('../web/lessons.js');

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const cardsPath = path.resolve(ROOT, process.env.NEWS_CARDS ?? 'news/cards.json');
const jsPath = path.resolve(ROOT, process.env.NEWS_JS ?? 'web/news.js');

let doc;
try {
  doc = JSON.parse(await readFile(cardsPath, 'utf8'));
} catch (e) {
  console.error(`news: can't read ${cardsPath}: ${e.message}`);
  process.exit(1);
}

const errors = validateNews(doc, Object.keys(globalThis.TRUST_LABELS));
if (errors.length > 0) {
  for (const e of errors) console.error(`news: ${e}`);
  console.error(`news: ${errors.length} problem(s); ${path.relative(ROOT, jsPath)} not written`);
  process.exit(1);
}

await writeFile(jsPath, newsToJs(doc), 'utf8');
const n = doc.cards.length;
console.log(`${n} card${n === 1 ? '' : 's'}, checked through ${doc.checkedThrough}`);
