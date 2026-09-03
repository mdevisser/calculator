import { jacobianMatrix, determinant } from './matrix.js';
import {
  parsePolynomial, evaluate, isConstant, constantValue, isZero, totalDegree,
} from '../../exact/polynomial.js';
import { parseRational, cmp, toString as rstr } from '../../exact/rational.js';
import { SEARCH_STATE, decide } from '../../harness/verdict.js';
import { FixtureError } from '../../harness/schema.js';

export const problem = 'jacobian';

export const conjecture =
  'The Jacobian conjecture (Keller, 1939): a polynomial map from n-dimensional complex ' +
  'space to itself whose Jacobian determinant is a nonzero constant must have a ' +
  'polynomial inverse. Alpoge (2026) refutes it in dimensions >= 3, exhibiting a ' +
  'degree-7 map in three variables with constant determinant -2 that sends three ' +
  'distinct points to the same image. The conjecture remains OPEN in two dimensions, ' +
  'and is trivial in one.';

function bad(message) {
  return new FixtureError(message, 'malformed');
}

function parseData(data) {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw bad('data must be an object');
  }
  const { arity } = data;
  if (!Number.isInteger(arity) || arity < 1) {
    throw bad(`data.arity must be a positive integer, got ${JSON.stringify(arity)}`);
  }
  if (!Array.isArray(data.components) || data.components.length !== arity) {
    throw bad(`data.components must be an array of ${arity} term lists`);
  }
  let components;
  try {
    components = data.components.map((c, i) => parsePolynomial(c, arity, `data.components[${i}]`));
  } catch (error) {
    throw bad(error.message);
  }

  if (!Array.isArray(data.collision) || data.collision.length < 2) {
    throw bad('data.collision must list at least two points');
  }
  const collision = data.collision.map((point, i) => {
    if (!Array.isArray(point) || point.length !== arity) {
      throw bad(`data.collision[${i}] must be an array of ${arity} coordinates`);
    }
    try {
      return point.map((c, j) => parseRational(c, `data.collision[${i}][${j}]`));
    } catch (error) {
      throw bad(error.message);
    }
  });

  let declared;
  try {
    declared = parseRational(data.determinant, 'data.determinant');
  } catch (error) {
    throw bad(error.message);
  }

  return { arity, components, collision, declared };
}

const samePoint = (a, b) => a.every((c, i) => cmp(c, b[i]) === 0);

export function verify(fixture) {
  const { components, collision, declared } = parseData(fixture && fixture.data);

  const det = determinant(jacobianMatrix(components));
  const constant = isConstant(det);
  const value = constant ? constantValue(det) : null;

  const images = collision.map((point) => components.map((c) => evaluate(c, point)));

  let distinct = true;
  for (let i = 0; i < collision.length && distinct; i += 1) {
    for (let j = i + 1; j < collision.length; j += 1) {
      if (samePoint(collision[i], collision[j])) { distinct = false; break; }
    }
  }

  const shared = images.every((image) => samePoint(image, images[0]));

  const checks = [
    {
      name: 'the Jacobian determinant is constant',
      pass: constant,
      expected: 'a constant polynomial',
      actual: constant ? rstr(value) : `degree ${totalDegree(det)} polynomial`,
    },
    {
      name: 'the constant is nonzero',
      pass: constant && !isZero(det),
      expected: '!= 0',
      actual: constant ? rstr(value) : 'not constant',
    },
    {
      name: 'the determinant equals the declared value',
      pass: constant && cmp(value, declared) === 0,
      expected: rstr(declared),
      actual: constant ? rstr(value) : 'not constant',
    },
    {
      name: 'the collision points are pairwise distinct',
      pass: distinct,
      expected: `${collision.length} distinct points`,
      actual: distinct ? `${collision.length} distinct points` : 'a repeated point',
    },
    {
      name: 'every collision point has the same image',
      pass: shared,
      expected: `all images equal (${images[0].map(rstr).join(', ')})`,
      actual: images.map((image) => `(${image.map(rstr).join(', ')})`).join(' vs '),
    },
  ];

  return {
    checks,
    requiresSearch: false,
    exhaustive: null,
    searched: null,
    searchState: SEARCH_STATE.NOT_REQUIRED,
    verdict: decide({ checks, requiresSearch: false }),
  };
}
