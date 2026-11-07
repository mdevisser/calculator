import test from 'node:test';
import assert from 'node:assert/strict';

// The Sendov picture's math is floating-point by design (spec §4: floats only in
// pictures). These tests check it against cases whose answers are known exactly.
await import('../../web/lessons/sendov-picture.js');
const { sendov } = globalThis;

const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

test('z² − 1: flat spot at 0, both roots at distance 1', () => {
  const d = sendov.nearestDistances([[1, 0], [-1, 0]]);
  assert.ok(d.every((x) => close(x, 1)), String(d));
});

test('roots 0 and 1: one flat spot, at 1/2', () => {
  const f = sendov.flatSpots([[0, 0], [1, 0]]);
  assert.equal(f.length, 1);
  assert.ok(close(f[0][0], 0.5) && close(f[0][1], 0), String(f));
});

test('cube roots of unity: flat spots at 0, every distance 1', () => {
  const r = [0, 1, 2].map((k) => [Math.cos((2 * Math.PI * k) / 3), Math.sin((2 * Math.PI * k) / 3)]);
  const d = sendov.nearestDistances(r);
  assert.ok(d.every((x) => close(x, 1, 1e-6)), String(d));
});

test('a double root is its own flat spot: distance 0, never NaN', () => {
  const d = sendov.nearestDistances([[0.3, 0.2], [0.3, 0.2], [-0.5, 0]]);
  assert.ok(d.every(Number.isFinite), String(d));
  assert.ok(close(d[0], 0, 1e-6) && close(d[1], 0, 1e-6), String(d));
});

test('a single root has no flat spot to measure to', () => {
  assert.deepEqual(sendov.flatSpots([[0.2, 0.1]]), []);
});

test('degree 7 with random roots in the disk: finite and ≤ 1 (Sendov, seen not proved)', () => {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let t = 0; t < 200; t++) {
    const roots = Array.from({ length: 7 }, () => sendov.clampToDisk([rnd() * 2 - 1, rnd() * 2 - 1]));
    const d = sendov.nearestDistances(roots);
    assert.ok(d.every((x) => Number.isFinite(x) && x <= 1 + 1e-6), JSON.stringify(roots));
  }
});

test('clampToDisk holds outside points on the edge and leaves inside points alone', () => {
  assert.deepEqual(sendov.clampToDisk([0.3, 0.4]), [0.3, 0.4]);
  const [x, y] = sendov.clampToDisk([3, 4]);
  assert.ok(close(x, 0.6) && close(y, 0.8));
});
