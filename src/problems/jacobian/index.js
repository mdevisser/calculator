import { parseRational, toString } from '../../exact/rational.js';
import { SEARCH_STATE, decide } from '../../harness/verdict.js';
import { FixtureError } from '../../harness/schema.js';
import { parsePolynomial, evaluate, isConstant, constantTerm, degree, termCount } from './polynomial.js';
import { jacobianMatrix, determinant3 } from './matrix.js';

export const problem = 'jacobian';

// Reporting accuracy: the counterexample is in dimension 3 (and so every dimension
// above it). The planar case is open, and this text says so wherever the ledger
// shows the verdict.
export const conjecture =
  'The Jacobian conjecture (Keller, 1939): a polynomial map from n-dimensional space ' +
  'to itself whose Jacobian determinant is a nonzero constant has a polynomial inverse. ' +
  'A dimension 3 counterexample, announced in July 2026, refutes it in every dimension ' +
  '3 and up. The two-dimensional case is still open.';

const DIMENSION = 3;
const malformed = (message) => new FixtureError(message, 'malformed');

function readData(fixture) {
  const data = fixture && fixture.data;
  const { variables, map, points } = data ?? {};
  const names = /^[a-z]+$/;
  if (
    !Array.isArray(variables) ||
    variables.length !== DIMENSION ||
    !variables.every((v) => typeof v === 'string' && names.test(v)) ||
    new Set(variables).size !== DIMENSION
  ) {
    throw malformed(`data.variables must be ${DIMENSION} different lowercase names`);
  }
  if (!Array.isArray(map) || map.length !== DIMENSION) {
    throw malformed(`data.map must have ${DIMENSION} components`);
  }
  if (!Array.isArray(points) || points.length < 2) {
    throw malformed('data.points must list at least 2 points');
  }
  const parsedPoints = points.map((p, i) => {
    if (!Array.isArray(p) || p.length !== DIMENSION) {
      throw malformed(`data.points[${i}] must have ${DIMENSION} coordinates`);
    }
    return p.map((v, j) => {
      try {
        return parseRational(v, `data.points[${i}][${j}]`);
      } catch (err) {
        throw malformed(err.message);
      }
    });
  });
  return { components: map.map((text) => parsePolynomial(text, variables)), points: parsedPoints };
}

const show = (values) => `(${values.map(toString).join(', ')})`;

export function verify(fixture) {
  const { components, points } = readData(fixture);

  const det = determinant3(jacobianMatrix(components));
  const constant = isConstant(det);
  const value = constantTerm(det);

  const keys = points.map(show);
  const firstRepeat = keys.findIndex((k, i) => keys.indexOf(k) !== i);

  const images = points.map((p) => components.map((f) => evaluate(f, p)).map(toString));
  const imageKeys = images.map((im) => `(${im.join(', ')})`);
  const firstDiffering = imageKeys.findIndex((k) => k !== imageKeys[0]);

  const checks = [
    {
      name: 'the Jacobian determinant is a constant',
      pass: constant,
      expected: 'a constant polynomial',
      actual: constant ? toString(value) : `not constant: degree ${degree(det)}, ${termCount(det)} term${termCount(det) === 1 ? "" : "s"}`,
    },
    {
      name: 'the constant is not zero',
      pass: constant && value.n !== 0n,
      expected: 'nonzero',
      actual: constant ? toString(value) : 'no single value: the determinant is not constant',
    },
    {
      name: 'the points are all different',
      pass: firstRepeat < 0,
      expected: `${points.length} different points`,
      actual:
        firstRepeat < 0
          ? `${points.length} different points`
          : `point ${firstRepeat + 1} repeats point ${keys.indexOf(keys[firstRepeat]) + 1}: ${keys[firstRepeat]}`,
    },
    {
      name: 'every point has the same image',
      pass: firstDiffering < 0,
      expected: imageKeys[0],
      actual:
        firstDiffering < 0
          ? `all ${points.length} points map to ${imageKeys[0]}`
          : `point ${firstDiffering + 1} maps to ${imageKeys[firstDiffering]}`,
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
