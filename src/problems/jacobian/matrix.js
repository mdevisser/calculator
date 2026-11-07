// The Jacobian matrix and its 3×3 determinant, both exact (old spec §5 v3, step 2).
// For the real map the entries reach degree 6 and the expanded products degree 18
// before everything cancels to a constant: the verdict depends on exact cancellation.

import { addP, subP, mulP, derivative } from './polynomial.js';

// Entry [i][j] is the partial derivative of component i by variable j.
export function jacobianMatrix(components) {
  return components.map((f) => components.map((_, j) => derivative(f, j)));
}

// Cofactor expansion along the first row.
export function determinant3(m) {
  const minor = (r1, r2, c1, c2) => subP(mulP(m[r1][c1], m[r2][c2]), mulP(m[r1][c2], m[r2][c1]));
  return addP(
    subP(mulP(m[0][0], minor(1, 2, 1, 2)), mulP(m[0][1], minor(1, 2, 0, 2))),
    mulP(m[0][2], minor(1, 2, 0, 1)),
  );
}
