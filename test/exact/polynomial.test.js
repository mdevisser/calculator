import test from 'node:test';
import assert from 'node:assert/strict';
import {
  polynomial, parsePolynomial, addP, subP, mulP, differentiate, evaluate,
  isZero, isConstant, constantValue, totalDegree, termCount,
} from '../../src/exact/polynomial.js';
import { parseRational, toString as rstr } from '../../src/exact/rational.js';

const r = (s) => parseRational(s, 'test');
const term = (c, e) => ({ coeff: r(c), exponents: e });

// 3x^2 y + 1, in three variables
const p = () => polynomial([term('3', [2, 1, 0]), term('1', [0, 0, 0])], 3);

test('construction drops zero coefficients', () => {
  const q = polynomial([term('3', [1, 0, 0]), term('0', [0, 1, 0])], 3);
  assert.equal(termCount(q), 1);
  assert.equal(isZero(polynomial([term('0', [0, 0, 0])], 3)), true);
  assert.equal(isZero(polynomial([], 3)), true);
});

test('construction merges like terms rather than keeping duplicates', () => {
  const q = polynomial([term('3', [1, 0, 0]), term('4', [1, 0, 0])], 3);
  assert.equal(termCount(q), 1);
  assert.equal(rstr(evaluate(q, [r('1'), r('0'), r('0')])), '7');
});

test('addition and subtraction are exact and cancel to zero', () => {
  assert.equal(isZero(subP(p(), p())), true);
  const sum = addP(p(), p());
  assert.equal(rstr(evaluate(sum, [r('1'), r('1'), r('0')])), '8');
});

test('multiplication distributes and raises degree', () => {
  const a = polynomial([term('1', [1, 0, 0]), term('1', [0, 0, 0])], 3); // x + 1
  const b = polynomial([term('1', [1, 0, 0]), term('-1', [0, 0, 0])], 3); // x - 1
  const prod = mulP(a, b); // x^2 - 1
  assert.equal(totalDegree(prod), 2);
  assert.equal(rstr(evaluate(prod, [r('3'), r('0'), r('0')])), '8');
  assert.equal(rstr(evaluate(prod, [r('1'), r('0'), r('0')])), '0');
});

test('multiplication by zero gives zero, by one gives the original', () => {
  const zero = polynomial([], 3);
  const one = polynomial([term('1', [0, 0, 0])], 3);
  assert.equal(isZero(mulP(p(), zero)), true);
  assert.equal(termCount(mulP(p(), one)), termCount(p()));
});

test('differentiation applies the power rule per variable', () => {
  // d/dx (3x^2 y + 1) = 6xy ; d/dy = 3x^2 ; d/dz = 0
  const dx = differentiate(p(), 0);
  assert.equal(rstr(evaluate(dx, [r('1'), r('1'), r('0')])), '6');
  const dy = differentiate(p(), 1);
  assert.equal(rstr(evaluate(dy, [r('2'), r('5'), r('0')])), '12');
  assert.equal(isZero(differentiate(p(), 2)), true);
});

test('differentiating a constant gives zero', () => {
  const c = polynomial([term('7', [0, 0, 0])], 3);
  assert.equal(isZero(differentiate(c, 0)), true);
});

test('evaluation is exact at rational points', () => {
  // 3x^2 y + 1 at (1/2, 2/3, 0) = 3 * 1/4 * 2/3 + 1 = 1/2 + 1 = 3/2
  assert.equal(rstr(evaluate(p(), [r('1/2'), r('2/3'), r('0')])), '3/2');
});

test('constant detection and extraction', () => {
  const c = polynomial([term('-2', [0, 0, 0])], 3);
  assert.equal(isConstant(c), true);
  assert.equal(rstr(constantValue(c)), '-2');
  assert.equal(isConstant(polynomial([], 3)), true, 'the zero polynomial is constant');
  assert.equal(rstr(constantValue(polynomial([], 3))), '0');
  assert.equal(isConstant(p()), false);
  assert.throws(() => constantValue(p()), Error);
});

test('totalDegree is the largest exponent sum', () => {
  assert.equal(totalDegree(p()), 3);
  assert.equal(totalDegree(polynomial([], 3)), 0);
});

test('parsePolynomial reads the fixture form and rejects malformed input', () => {
  const parsed = parsePolynomial(
    [{ coeff: '3', exponents: [2, 1, 0] }, { coeff: '1', exponents: [0, 0, 0] }],
    3,
    'data.components[0]',
  );
  assert.equal(termCount(parsed), 2);
  assert.throws(() => parsePolynomial('nope', 3, 'f'), Error);
  assert.throws(() => parsePolynomial([{ coeff: 3, exponents: [0, 0, 0] }], 3, 'f'), Error, 'JSON number coefficient');
  assert.throws(() => parsePolynomial([{ coeff: '1', exponents: [0, 0] }], 3, 'f'), Error, 'wrong arity');
  assert.throws(() => parsePolynomial([{ coeff: '1', exponents: [0, -1, 0] }], 3, 'f'), Error, 'negative exponent');
  assert.throws(() => parsePolynomial([{ coeff: '1', exponents: [0, 1.5, 0] }], 3, 'f'), Error, 'non-integer exponent');
});
