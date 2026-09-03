import { differentiate, mulP, addP, subP, polynomial } from '../../exact/polynomial.js';

// J[i][j] = d(F_i)/d(x_j)
export function jacobianMatrix(components) {
  const arity = components[0].arity;
  return components.map((component) => {
    const row = [];
    for (let j = 0; j < arity; j += 1) {
      row.push(differentiate(component, j));
    }
    return row;
  });
}

// Cofactor expansion along the first row. The determinant is computed on
// polynomials, never on sampled values: the claim is that it IS a constant,
// which is a statement about the polynomial, not about finitely many of its
// values.
export function determinant(matrix) {
  const n = matrix.length;
  if (n === 1) return matrix[0][0];

  const arity = matrix[0][0].arity;
  let total = polynomial([], arity);

  for (let j = 0; j < n; j += 1) {
    const minor = matrix.slice(1).map((row) => row.filter((_, col) => col !== j));
    const cofactor = mulP(matrix[0][j], determinant(minor));
    total = j % 2 === 0 ? addP(total, cofactor) : subP(total, cofactor);
  }

  return total;
}
