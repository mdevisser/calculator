import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// news/ROUTINE.md is the prompt the weekly cloud routine follows. These checks
// pin the parts that keep it honest: the window, dedupe, validation before the
// PR, loud failure, and the Reporting Accuracy qualifiers.
const md = await readFile(new URL('../../news/ROUTINE.md', import.meta.url), 'utf8');

for (const must of [
  /checkedThrough/,
  /node bin\/news\.js/,
  /node --test/,
  /news\/<YYYY-MM-DD>/,
  /gh pr list --state all/,
  /Card ids:/,
  /unverified/,
  /NEWS WATCH FAILED:/,
  /no new results/,
  /forced/,
  /dimension/,
  /Goemans/,
  /List_of_mathematical_discoveries_by_artificial_intelligence/,
]) {
  test(`ROUTINE.md covers ${must}`, () => assert.match(md, must));
}
