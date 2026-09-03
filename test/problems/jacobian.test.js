import test from 'node:test';
import assert from 'node:assert/strict';
import { verify, problem, conjecture } from '../../src/problems/jacobian/index.js';
import { VERDICT, SEARCH_STATE } from '../../src/harness/verdict.js';
import { FixtureError } from '../../src/harness/schema.js';

// A shear map: F(x, y) = (x + y^2, y). Determinant is the constant 1, and it
// IS invertible, so it is not a counterexample -- the collision check fails.
const shear = {
  problem: 'jacobian',
  candidate: 'inline',
  claim: 'inline test',
  expect: 'REFUTED',
  source: { url: 'u', author: 'a', date: 'd', peerReviewed: false },
  data: {
    arity: 2,
    variables: ['x', 'y'],
    components: [
      [{ coeff: '1', exponents: [1, 0] }, { coeff: '1', exponents: [0, 2] }],
      [{ coeff: '1', exponents: [0, 1] }],
    ],
    determinant: '1',
    collision: [['0', '0'], ['1', '1']],
  },
};

test('the module declares its identity and carries the dimension qualifier', () => {
  assert.equal(problem, 'jacobian');
  assert.match(conjecture, /dimensions?\s*(>=|≥)\s*3/i);
  assert.match(conjecture, /two dimensions|n\s*=\s*2/i);
  assert.match(conjecture, /open/i);
});

test('an invertible map is REFUTED as a counterexample', () => {
  const result = verify(shear);
  assert.equal(result.verdict, VERDICT.REFUTED);
  // Two check names contain "constant" ("...determinant is constant" and
  // "the constant is nonzero") -- match a substring unique to the one meant.
  const constant = result.checks.find((c) => c.name.includes('determinant is constant'));
  assert.equal(constant.pass, true, 'its determinant really is constant');
  const collide = result.checks.find((c) => c.name.includes('same image'));
  assert.equal(collide.pass, false, 'but the points do not collide');
});

test('the module performs no search and says so', () => {
  const result = verify(shear);
  assert.equal(result.requiresSearch, false);
  assert.equal(result.exhaustive, null);
  assert.equal(result.searched, null);
  assert.equal(result.searchState, SEARCH_STATE.NOT_REQUIRED);
});

test('a non-constant determinant fails the constancy check', () => {
  // F(x, y) = (x^2, y): determinant is 2x, not constant.
  const result = verify({
    ...shear,
    data: {
      ...shear.data,
      components: [
        [{ coeff: '1', exponents: [2, 0] }],
        [{ coeff: '1', exponents: [0, 1] }],
      ],
      determinant: '2',
    },
  });
  assert.equal(result.verdict, VERDICT.REFUTED);
  assert.equal(result.checks.find((c) => c.name.includes('determinant is constant')).pass, false);
});

test('a zero determinant fails the nonzero check', () => {
  // F(x, y) = (x, x): determinant is 0.
  const result = verify({
    ...shear,
    data: {
      ...shear.data,
      components: [
        [{ coeff: '1', exponents: [1, 0] }],
        [{ coeff: '1', exponents: [1, 0] }],
      ],
      determinant: '0',
    },
  });
  assert.equal(result.verdict, VERDICT.REFUTED);
  assert.equal(result.checks.find((c) => c.name.includes('nonzero')).pass, false);
});

test('a determinant disagreeing with the declared value fails', () => {
  const result = verify({ ...shear, data: { ...shear.data, determinant: '-2' } });
  assert.equal(result.verdict, VERDICT.REFUTED);
  const declared = result.checks.find((c) => c.name.includes('declared'));
  assert.equal(declared.pass, false);
  assert.equal(declared.expected, '-2');
  assert.equal(declared.actual, '1');
});

test('duplicate collision points fail the distinctness check', () => {
  const result = verify({ ...shear, data: { ...shear.data, collision: [['1', '1'], ['1', '1']] } });
  assert.equal(result.verdict, VERDICT.REFUTED);
  assert.equal(result.checks.find((c) => c.name.includes('distinct')).pass, false);
});

test('three points where only the second and third coincide fail distinctness', () => {
  // point0 != point1, point1 == point2 -- a duplicate that is NOT (0,1), so a
  // check that only compares collision[0] against collision[1] would miss it.
  const result = verify({
    ...shear,
    data: { ...shear.data, collision: [['0', '0'], ['1', '1'], ['1', '1']] },
  });
  assert.equal(result.verdict, VERDICT.REFUTED);
  assert.equal(result.checks.find((c) => c.name.includes('distinct')).pass, false);
});

test('three points where only the first and third coincide fail distinctness', () => {
  // point0 == point2, point1 differs from both -- a duplicate that is not an
  // adjacent pair, so a check that only compares (i, i+1) would miss it.
  const result = verify({
    ...shear,
    data: { ...shear.data, collision: [['1', '1'], ['0', '0'], ['1', '1']] },
  });
  assert.equal(result.verdict, VERDICT.REFUTED);
  assert.equal(result.checks.find((c) => c.name.includes('distinct')).pass, false);
});

test('three points where the first two images agree but the third differs fail the same-image check', () => {
  // F(x, y) = (x^2, y). (1,0) and (-1,0) both map to (1,0); (2,0) maps to
  // (4,0). A check that only compares images[1] against images[0] would
  // wrongly call this a collision.
  const result = verify({
    ...shear,
    data: {
      ...shear.data,
      components: [
        [{ coeff: '1', exponents: [2, 0] }],
        [{ coeff: '1', exponents: [0, 1] }],
      ],
      determinant: '2',
      collision: [['1', '0'], ['-1', '0'], ['2', '0']],
    },
  });
  assert.equal(result.verdict, VERDICT.REFUTED);
  const distinctCheck = result.checks.find((c) => c.name.includes('distinct'));
  assert.equal(distinctCheck.pass, true, 'the three points really are pairwise distinct');
  const sameImage = result.checks.find((c) => c.name.includes('same image'));
  assert.equal(sameImage.pass, false, 'the third point breaks the collision');
});

test('malformed data throws FixtureError, never returns a verdict', () => {
  assert.throws(() => verify({ ...shear, data: null }), FixtureError);
  assert.throws(() => verify({ ...shear, data: { ...shear.data, components: 'nope' } }), FixtureError);
  assert.throws(() => verify({ ...shear, data: { ...shear.data, arity: 5 } }), FixtureError,
    'arity disagreeing with the component count');
  assert.throws(() => verify({ ...shear, data: { ...shear.data, collision: [['1', '1']] } }), FixtureError,
    'fewer than two points is not a collision claim');
  assert.throws(() => verify({ ...shear, data: { ...shear.data, collision: [['1'], ['1', '1']] } }), FixtureError,
    'a point of the wrong arity');
});

test('a component count that disagrees with arity is rejected even when every component has correctly-sized exponents', () => {
  // arity is 2 and every term's exponents array has length 2 -- parsePolynomial's
  // own exponent-length check has nothing to object to. Only the
  // components.length === arity guard in parseData can catch this, and
  // without it a non-square matrix reaches determinant() unguarded.
  assert.throws(() => verify({
    ...shear,
    data: {
      ...shear.data,
      components: [
        [{ coeff: '1', exponents: [1, 0] }],
        [{ coeff: '1', exponents: [0, 1] }],
        [{ coeff: '1', exponents: [0, 1] }],
      ],
    },
  }), FixtureError);
});
