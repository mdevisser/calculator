// Exact checker behind the Jacobian lesson: where does Alpöge's map send a point,
// and what is the stretch factor (the Jacobian determinant) there?
// BigInt fractions only, no rounding anywhere. The stretch factor uses dual numbers
// (a + b·ε with ε² = 0): evaluating the map at x + ε gives each partial derivative
// exactly, with no polynomial expansion in the browser.
// MAP and POINTS must equal fixtures/jacobian/alpoge-2026.json (a test pins this).
// Bad input returns a plain-words message and never a result.

(function () {
  const MAP = [
    '(1 + x*y)^3*z + y^2*(1 + x*y)*(4 + 3*x*y)',
    'y + 3*x*(1 + x*y)^2*z + 3*x*y^2*(4 + 3*x*y)',
    '2*x - 3*x^2*y - x^3*z',
  ];
  const POINTS = [
    { name: 'A', point: ['0', '0', '-1/4'] },
    { name: 'B', point: ['1', '-3/2', '13/2'] },
    { name: 'C', point: ['-1', '3/2', '13/2'] },
  ];
  const VARS = ['x', 'y', 'z'];
  const MAX_DIGITS = 30;

  // Fractions {n, d}: d > 0, lowest terms.
  const gcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
  function frac(n, d = 1n) {
    if (d < 0n) { n = -n; d = -d; }
    if (n === 0n) return { n: 0n, d: 1n };
    const g = gcd(n, d);
    return { n: n / g, d: d / g };
  }
  const fadd = (a, b) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
  const fsub = (a, b) => frac(a.n * b.d - b.n * a.d, a.d * b.d);
  const fmul = (a, b) => frac(a.n * b.n, a.d * b.d);
  const ZERO = frac(0n);
  const ONE = frac(1n);
  const show = (f) => (f.n < 0n ? '−' : '') + (f.n < 0n ? -f.n : f.n) + (f.d === 1n ? '' : `/${f.d}`);

  // Dual numbers {a, b}: a is the value, b the rate of change along one direction.
  const dual = {
    add: (p, q) => ({ a: fadd(p.a, q.a), b: fadd(p.b, q.b) }),
    sub: (p, q) => ({ a: fsub(p.a, q.a), b: fsub(p.b, q.b) }),
    mul: (p, q) => ({ a: fmul(p.a, q.a), b: fadd(fmul(p.a, q.b), fmul(p.b, q.a)) }),
    neg: (p) => ({ a: fsub(ZERO, p.a), b: fsub(ZERO, p.b) }),
    num: (n) => ({ a: frac(n), b: ZERO }),
  };

  // The same grammar as src/problems/jacobian/polynomial.js, parsed once into a
  // function of the variable values. MAP is fixed, so a parse error is our bug.
  function compile(text) {
    const tokens = text.match(/\d+|[a-z]+|[-+*^()]/g);
    let pos = 0;
    const expr = () => {
      let left = term();
      while (tokens[pos] === '+' || tokens[pos] === '-') {
        const op = tokens[pos++];
        const l = left, r = term();
        left = op === '+' ? (v) => dual.add(l(v), r(v)) : (v) => dual.sub(l(v), r(v));
      }
      return left;
    };
    const term = () => {
      let left = unary();
      while (tokens[pos] === '*') {
        pos += 1;
        const l = left, r = unary();
        left = (v) => dual.mul(l(v), r(v));
      }
      return left;
    };
    const unary = () => {
      if (tokens[pos] === '-') { pos += 1; const u = unary(); return (v) => dual.neg(u(v)); }
      return power();
    };
    const power = () => {
      const base = atom();
      if (tokens[pos] !== '^') return base;
      pos += 1;
      const k = Number(tokens[pos++]);
      return (v) => { let out = dual.num(1n); const b = base(v); for (let i = 0; i < k; i += 1) out = dual.mul(out, b); return out; };
    };
    const atom = () => {
      const t = tokens[pos++];
      if (t === '(') { const inner = expr(); pos += 1; return inner; }
      if (/^\d+$/.test(t)) { const c = dual.num(BigInt(t)); return () => c; }
      const i = VARS.indexOf(t);
      if (i < 0) throw new Error(`jacobian-check: bad map text near ${t}`);
      return (v) => v[i];
    };
    const f = expr();
    if (pos !== tokens.length) throw new Error('jacobian-check: bad map text');
    return f;
  }
  const COMPONENTS = MAP.map(compile);

  const SHAPES = [
    /^(-?)(\d+)$/, // whole number
    /^(-?)(\d+)\s*\/\s*(\d+)$/, // fraction
    /^(-?)(\d+)\.(\d+)$/, // decimal
  ];

  function parseNumber(text, name) {
    const t = String(text ?? '').replace(/−/g, '-').trim();
    if (t === '') return { message: `${name} is empty. Type a number, like 13/2.` };
    if ((t.match(/\d/g) || []).length > MAX_DIGITS) {
      return { message: `${name} is longer than ${MAX_DIGITS} digits. Keep it shorter.` };
    }
    const [whole, fraction, decimal] = SHAPES.map((re) => re.exec(t));
    const sign = (m) => (m[1] === '-' ? -1n : 1n);
    if (whole) return { value: frac(sign(whole) * BigInt(whole[2])) };
    if (fraction) {
      if (BigInt(fraction[3]) === 0n) {
        return { message: `${name} would divide by zero. The bottom of a fraction can't be 0.` };
      }
      return { value: frac(sign(fraction) * BigInt(fraction[2]), BigInt(fraction[3])) };
    }
    if (decimal) {
      const digits = decimal[2] + decimal[3];
      return { value: frac(sign(decimal) * BigInt(digits), 10n ** BigInt(decimal[3].length)) };
    }
    return { message: `${name} needs to be a whole number, a fraction like 13/2, or a decimal like 0.5.` };
  }

  function imageOf(texts) {
    const point = [];
    for (let i = 0; i < 3; i += 1) {
      const r = parseNumber(texts[i], VARS[i]);
      if (r.message) return { ok: false, message: r.message };
      point.push(r.value);
    }
    // Column j of the Jacobian: the ε-parts of F at the point nudged along variable j.
    const columns = [0, 1, 2].map((j) => {
      const at = point.map((a, i) => ({ a, b: i === j ? ONE : ZERO }));
      return COMPONENTS.map((f) => f(at));
    });
    const image = columns[0].map((d) => d.a);
    const m = (i, j) => columns[j][i].b;
    const minor = (c1, c2) => fsub(fmul(m(1, c1), m(2, c2)), fmul(m(1, c2), m(2, c1)));
    const det = fadd(fsub(fmul(m(0, 0), minor(1, 2)), fmul(m(0, 1), minor(0, 2))), fmul(m(0, 2), minor(0, 1)));
    return { ok: true, image: image.map(show), stretch: show(det) };
  }

  globalThis.jacobianCheck = { MAP, POINTS, parseNumber, imageOf };
})();
