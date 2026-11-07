// Exact multivariate polynomials for the Jacobian module (old spec §5 v3, step 1).
// A Poly is a Map from an exponent key "a,b,c" to a nonzero Rational coefficient;
// zero coefficients are never stored, so the zero polynomial is the empty Map and
// "is this determinant a constant?" is a question about keys, not about rounding.

import { rational, add, mul, ZERO } from '../../exact/rational.js';
import { FixtureError } from '../../harness/schema.js';

export const MAX_EXPONENT = 20;

const keyOf = (exps) => exps.join(',');
const expsOf = (key) => key.split(',').map(Number);

function put(poly, key, coef) {
  const next = add(poly.get(key) ?? ZERO, coef);
  if (next.n === 0n) poly.delete(key);
  else poly.set(key, next);
}

export function constant(r, n) {
  const p = new Map();
  if (r.n !== 0n) p.set(keyOf(new Array(n).fill(0)), r);
  return p;
}

function variable(i, n) {
  const exps = new Array(n).fill(0);
  exps[i] = 1;
  return new Map([[keyOf(exps), rational(1n)]]);
}

export function addP(p, q) {
  const out = new Map(p);
  for (const [k, c] of q) put(out, k, c);
  return out;
}

export function scaleP(p, r) {
  const out = new Map();
  for (const [k, c] of p) put(out, k, mul(c, r));
  return out;
}

export function subP(p, q) {
  return addP(p, scaleP(q, rational(-1n)));
}

export function mulP(p, q) {
  const out = new Map();
  for (const [kp, cp] of p) {
    const ep = expsOf(kp);
    for (const [kq, cq] of q) {
      const eq = expsOf(kq);
      put(out, keyOf(ep.map((e, i) => e + eq[i])), mul(cp, cq));
    }
  }
  return out;
}

export function powP(p, k, n) {
  let out = constant(rational(1n), n);
  for (let i = 0; i < k; i += 1) out = mulP(out, p);
  return out;
}

export function derivative(p, i) {
  const out = new Map();
  for (const [k, c] of p) {
    const e = expsOf(k);
    if (e[i] === 0) continue;
    const factor = rational(BigInt(e[i]));
    e[i] -= 1;
    put(out, keyOf(e), mul(c, factor));
  }
  return out;
}

export function evaluate(p, point) {
  let total = ZERO;
  for (const [k, c] of p) {
    let term = c;
    expsOf(k).forEach((e, i) => {
      for (let j = 0; j < e; j += 1) term = mul(term, point[i]);
    });
    total = add(total, term);
  }
  return total;
}

export const termCount = (p) => p.size;

export function degree(p) {
  let d = -1;
  for (const k of p.keys()) d = Math.max(d, expsOf(k).reduce((a, b) => a + b, 0));
  return d;
}

export const isConstant = (p) => degree(p) <= 0;

export function constantTerm(p) {
  for (const [k, c] of p) if (expsOf(k).every((e) => e === 0)) return c;
  return ZERO;
}

// Grammar (the plan's ruling): integers, the given variable names, + - *, ^ with a
// whole-number exponent 0..MAX_EXPONENT, parentheses, unary minus. No division and
// no implicit multiplication: "2x" is a typo, and a typo must be ERROR (I3).
const TOKEN = /\s*(?:(\d+)|([a-z]+)|(.))/y;

function tokenize(text) {
  const tokens = [];
  TOKEN.lastIndex = 0;
  let m;
  while (TOKEN.lastIndex < text.length && (m = TOKEN.exec(text))) {
    if (m[1] !== undefined) tokens.push({ int: m[1] });
    else if (m[2] !== undefined) tokens.push({ name: m[2] });
    else if (m[3] !== undefined && /\S/.test(m[3])) tokens.push({ op: m[3] });
  }
  return tokens;
}

export function parsePolynomial(text, variables) {
  const fail = (why) => {
    throw new FixtureError(`polynomial ${JSON.stringify(text)}: ${why}`, 'malformed');
  };
  if (typeof text !== 'string') fail('expected a string');
  const n = variables.length;
  const tokens = tokenize(text);
  let pos = 0;
  const peek = () => tokens[pos];
  const isOp = (t, op) => t !== undefined && t.op === op;

  function expr() {
    let left = term();
    while (isOp(peek(), '+') || isOp(peek(), '-')) {
      const op = tokens[pos++].op;
      const right = term();
      left = op === '+' ? addP(left, right) : subP(left, right);
    }
    return left;
  }
  function term() {
    let left = unary();
    while (isOp(peek(), '*')) {
      pos += 1;
      left = mulP(left, unary());
    }
    return left;
  }
  function unary() {
    if (isOp(peek(), '-')) {
      pos += 1;
      return scaleP(unary(), rational(-1n));
    }
    return power();
  }
  function power() {
    const base = atom();
    if (!isOp(peek(), '^')) return base;
    pos += 1;
    const t = tokens[pos++];
    if (t === undefined || t.int === undefined) fail('an exponent must be a whole number');
    const k = Number(t.int);
    if (k > MAX_EXPONENT) fail(`exponents above ${MAX_EXPONENT} are not allowed`);
    return powP(base, k, n);
  }
  function atom() {
    const t = tokens[pos++];
    if (t === undefined) fail('ends too early');
    if (t.int !== undefined) return constant(rational(BigInt(t.int)), n);
    if (t.name !== undefined) {
      const i = variables.indexOf(t.name);
      if (i < 0) fail(`unknown variable ${JSON.stringify(t.name)}`);
      return variable(i, n);
    }
    if (t.op === '(') {
      const inner = expr();
      if (!isOp(tokens[pos++], ')')) fail('missing a closing parenthesis');
      return inner;
    }
    return fail(`unexpected ${JSON.stringify(t.op)}`);
  }

  if (tokens.length === 0) fail('is empty');
  const result = expr();
  if (pos !== tokens.length) fail('has something left over (write 2*x, not 2x)');
  return result;
}
