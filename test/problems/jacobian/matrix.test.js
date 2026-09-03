import test from 'node:test';
import assert from 'node:assert/strict';
import { jacobianMatrix, determinant } from '../../../src/problems/jacobian/matrix.js';
import {
  polynomial, evaluate, isConstant, constantValue, isZero, totalDegree,
} from '../../../src/exact/polynomial.js';
import { parseRational, toString as rstr } from '../../../src/exact/rational.js';

const r = (s) => parseRational(s, 'test');
const term = (c, e) => ({ coeff: r(c), exponents: e });

test('the Jacobian of the identity map is the identity matrix', () => {
  const id = [
    polynomial([term('1', [1, 0])], 2),
    polynomial([term('1', [0, 1])], 2),
  ];
  const J = jacobianMatrix(id);
  assert.equal(rstr(constantValue(J[0][0])), '1');
  assert.equal(isZero(J[0][1]), true);
  assert.equal(isZero(J[1][0]), true);
  assert.equal(rstr(constantValue(J[1][1])), '1');
  assert.equal(rstr(constantValue(determinant(J))), '1');
});

test('a 2x2 determinant of non-constant entries is computed symbolically', () => {
  // [[x, y], [y, x]] -> x^2 - y^2
  const m = [
    [polynomial([term('1', [1, 0])], 2), polynomial([term('1', [0, 1])], 2)],
    [polynomial([term('1', [0, 1])], 2), polynomial([term('1', [1, 0])], 2)],
  ];
  const d = determinant(m);
  assert.equal(isConstant(d), false);
  assert.equal(totalDegree(d), 2);
  assert.equal(rstr(evaluate(d, [r('3'), r('2')])), '5');
  assert.equal(rstr(evaluate(d, [r('2'), r('2')])), '0');
});

test('a 1x1 determinant is its only entry', () => {
  const m = [[polynomial([term('5', [0])], 1)]];
  assert.equal(rstr(constantValue(determinant(m))), '5');
});

test('a 3x3 determinant expands correctly on a known matrix', () => {
  // Constant matrix [[1,2,3],[4,5,6],[7,8,10]], determinant -3.
  const c = (v) => polynomial([term(v, [0, 0, 0])], 3);
  const m = [
    [c('1'), c('2'), c('3')],
    [c('4'), c('5'), c('6')],
    [c('7'), c('8'), c('10')],
  ];
  assert.equal(rstr(constantValue(determinant(m))), '-3');
});

test('a matrix with two equal rows has zero determinant', () => {
  const c = (v) => polynomial([term(v, [0, 0, 0])], 3);
  const m = [
    [c('1'), c('2'), c('3')],
    [c('1'), c('2'), c('3')],
    [c('7'), c('8'), c('10')],
  ];
  assert.equal(isZero(determinant(m)), true);
});

test('a shear map has constant determinant 1 despite non-constant entries', () => {
  // F(x, y) = (x + y^2, y). dF1/dy = 2y is not constant, but det is.
  const F = [
    polynomial([term('1', [1, 0]), term('1', [0, 2])], 2),
    polynomial([term('1', [0, 1])], 2),
  ];
  const J = jacobianMatrix(F);
  assert.equal(isConstant(J[0][1]), false, 'the off-diagonal entry varies');
  const d = determinant(J);
  assert.equal(isConstant(d), true, 'yet the determinant is constant');
  assert.equal(rstr(constantValue(d)), '1');
});
