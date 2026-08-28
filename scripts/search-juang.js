#!/usr/bin/env node
// Development script, not part of the verification path. Sweeps the Juang
// parameterization looking for an instance where every congestion-good routing
// costs more than the fractional flow. Any hit is a lead to confirm, not a result.
import { verify } from '../src/problems/dgg/index.js';

const LIMIT = Number(process.argv[2] ?? 12);

function instance(b, m, g) {
  const r = (v) => `${v}`;
  return {
    source: 's',
    nodes: ['s', 'u', 'v', 'w', 't1', 't2', 't3'],
    arcs: [
      { from: 's', to: 't1', cost: r(b), flow: r(b) },
      { from: 's', to: 't2', cost: r(b + m), flow: r(m + g) },
      { from: 's', to: 'u', cost: '0', flow: r(2 * b + m - g) },
      { from: 'u', to: 'v', cost: '0', flow: r(b + m - g) },
      { from: 'u', to: 't3', cost: r(b), flow: r(b) },
      { from: 'v', to: 't1', cost: '0', flow: r(m) },
      { from: 'v', to: 'w', cost: '0', flow: r(b - g) },
      { from: 'w', to: 't2', cost: '0', flow: r(b - m - g) },
      { from: 'w', to: 't3', cost: '0', flow: r(m) },
    ],
    terminals: [
      { node: 't1', demand: r(b + m) },
      { node: 't2', demand: r(b) },
      { node: 't3', demand: r(b + m) },
    ],
  };
}

const shell = {
  problem: 'dgg', candidate: 'sweep', claim: 'sweep', expect: 'CONFIRMED',
  source: { url: 'u', author: 'a', date: 'd', peerReviewed: false },
};

let tried = 0;
const hits = [];
const skipped = [];

for (let b = 1; b <= LIMIT; b += 1) {
  for (let m = 1; m <= b; m += 1) {
    for (let g = 1; g <= b; g += 1) {
      if (m > b - g) continue;
      if (m * (b - m) <= (b + m) * g) continue;
      if (b - m - g < 0) continue;
      tried += 1;
      let result;
      try {
        result = verify({ ...shell, data: instance(b, m, g) });
      } catch (error) {
        skipped.push({ b, m, g, error: error.message });
        continue;
      }
      const failed = result.checks.filter((c) => !c.pass).map((c) => c.name);
      if (result.verdict === 'CONFIRMED') {
        hits.push({ b, m, g, searched: result.searched, checks: result.checks });
        console.log(`HIT  b=${b} m=${m} g=${g}  routings=${result.searched}`);
      } else {
        console.log(`     b=${b} m=${m} g=${g}  ${result.verdict}  failed: ${failed.join('; ') || 'none'}`);
      }
    }
  }
}

console.log(`\ntried ${tried} parameter triples, ${hits.length} hits, ${skipped.length} skipped`);
for (const s of skipped) console.log(`  skipped b=${s.b} m=${s.m} g=${s.g}: ${s.error}`);
if (hits.length > 0) {
  const best = hits.reduce((a, x) => (x.searched < a.searched ? x : a));
  console.log(`\nsmallest hit: b=${best.b} m=${best.m} g=${best.g}`);
  console.log(JSON.stringify(best.checks, null, 2));
}
