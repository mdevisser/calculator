import * as euler from '../problems/euler/index.js';
import * as dgg from '../problems/dgg/index.js';

// Problem modules register here. Each exports `problem`, `conjecture`, and
// `verify(fixture)`.
export const PROBLEMS = new Map([
  [euler.problem, euler],
  [dgg.problem, dgg],
]);
