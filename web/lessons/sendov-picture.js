// The math behind the Sendov lesson's drag-the-dots picture.
// Floating-point on purpose: this is a picture, not a check (spec §4). It never
// produces a verdict. Complex numbers are [re, im] pairs. No DOM here, so Node
// tests call exactly what the page calls.

(function () {
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const div = (a, b) => {
    const d = b[0] * b[0] + b[1] * b[1];
    return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
  };
  const abs = (a) => Math.hypot(a[0], a[1]);

  // Coefficients of (z - r1)(z - r2)..., highest power first; leading 1.
  function fromRoots(roots) {
    let c = [[1, 0]];
    for (const r of roots) {
      const next = c.map(() => [0, 0]).concat([[0, 0]]);
      c.forEach((x, i) => {
        next[i] = add(next[i], x);
        next[i + 1] = sub(next[i + 1], mul(x, r));
      });
      c = next;
    }
    return c;
  }

  function derivative(c) {
    const n = c.length - 1;
    return c.slice(0, -1).map((x, i) => [x[0] * (n - i), x[1] * (n - i)]);
  }

  function evaluate(c, z) {
    let v = [0, 0];
    for (const x of c) v = add(mul(v, z), x);
    return v;
  }

  // Durand–Kerner: all roots at once. The start points sit on a circle of
  // radius 0.9, turned by 0.4 so they're never symmetric with the input.
  function rootsOf(c) {
    const lead = c[0];
    const monic = c.map((x) => div(x, lead));
    const n = monic.length - 1;
    if (n === 0) return [];
    if (n === 1) return [[-monic[1][0], -monic[1][1]]];
    let z = Array.from({ length: n }, (_, i) => {
      const t = (2 * Math.PI * i) / n + 0.4;
      return [0.9 * Math.cos(t), 0.9 * Math.sin(t)];
    });
    for (let iter = 0; iter < 500; iter++) {
      let moved = 0;
      z = z.map((zi, i) => {
        let den = [1, 0];
        z.forEach((zj, j) => {
          if (j !== i) den = mul(den, sub(zi, zj));
        });
        if (abs(den) === 0) den = [1e-12, 0];
        const step = div(evaluate(monic, zi), den);
        moved = Math.max(moved, abs(step));
        return sub(zi, step);
      });
      if (moved < 1e-12) break;
    }
    return z;
  }

  globalThis.sendov = {
    flatSpots(roots) {
      if (roots.length < 2) return [];
      return rootsOf(derivative(fromRoots(roots)));
    },
    nearestDistances(roots) {
      const spots = this.flatSpots(roots);
      return roots.map((r) => Math.min(...spots.map((s) => abs(sub(r, s)))));
    },
    clampToDisk(z) {
      const r = abs(z);
      return r <= 1 ? z : [z[0] / r, z[1] / r];
    },
  };
})();
