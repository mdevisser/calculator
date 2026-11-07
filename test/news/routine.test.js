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
  /gh api --paginate "repos\/mdevisser\/calculator\/pulls\?state=all/,
  /gh api repos\/mdevisser\/calculator\/pulls -f/,
  /Card ids:/,
  /unverified/,
  /NEWS WATCH FAILED:/,
  /no new results/,
  /forced/,
  /dimension/,
  /Goemans/,
  /List_of_mathematical_discoveries_by_artificial_intelligence/,
  // Review fixes: late-surfacing results, stacked PRs, silent failures, lost cards.
  /30 days before/,
  /open news PR/,
  /any step/,
  /sources fetched/,
  /edit this PR instead of closing it/,
]) {
  test(`ROUTINE.md covers ${must}`, () => assert.match(md, must));
}

// Cloud routine sessions block GitHub GraphQL (HTTP 403), which `gh pr list` and
// `gh pr create` use. The first live run failed on exactly this.
test('ROUTINE.md uses only the GitHub REST API', () => {
  assert.doesNotMatch(md, /gh pr (list|create)/);
});
