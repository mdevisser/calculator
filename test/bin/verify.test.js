import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const CLI = fileURLToPath(new URL('../../bin/verify.js', import.meta.url));

const run = (...args) =>
  spawnSync(process.execPath, [CLI, ...args], { cwd: ROOT, encoding: 'utf8' });

// A typo used to dump a raw ENOENT stack and exit 2 with no explanation.
test('a mistyped fixture target names the missing fixture and shows no stack', () => {
  const result = run('euler/lander-parkin-1996');

  assert.equal(result.status, 2);
  assert.match(result.stderr, /no such fixture: euler\/lander-parkin-1996/);
  assert.match(result.stderr, /fixtures\/euler\/lander-parkin-1996\.json/);
  assert.doesNotMatch(result.stderr, /^\s+at /m, 'a stack trace leaked to the user');
  assert.doesNotMatch(result.stderr, /ENOENT/);
});

test('--help exits 0 and prints usage', () => {
  const result = run('--help');
  assert.equal(result.status, 0);
  assert.match(result.stdout, /usage:/);
});
