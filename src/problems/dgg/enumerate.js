// Enumeration is where invariant I1 is earned. `total` is computed independently
// of the enumeration loop so the caller can assert the two agree; a mismatch, or
// a space larger than the budget, means we cannot claim to have checked
// everything and the verdict must degrade to INDETERMINATE.

export function simplePaths(network, from, to) {
  const outgoing = new Map(network.nodes.map((n) => [n, []]));
  network.arcs.forEach((arc, index) => {
    outgoing.get(arc.from).push(index);
  });

  const paths = [];
  const visited = new Set([from]);
  const current = [];

  const walk = (node) => {
    if (node === to) {
      paths.push([...current]);
      return;
    }
    for (const index of outgoing.get(node)) {
      const next = network.arcs[index].to;
      if (visited.has(next)) continue;
      visited.add(next);
      current.push(index);
      walk(next);
      current.pop();
      visited.delete(next);
    }
  };

  if (from !== to) walk(from);
  return paths;
}

export function routingCount(pathsPerTerminal) {
  return pathsPerTerminal.reduce((product, paths) => product * BigInt(paths.length), 1n);
}

export function enumerateRoutings(pathsPerTerminal, budget) {
  const total = routingCount(pathsPerTerminal);

  if (total > budget) {
    return { routings: [], total, exhaustive: false };
  }
  if (total === 0n) {
    return { routings: [], total, exhaustive: true };
  }

  const routings = [];
  const choice = new Array(pathsPerTerminal.length).fill(0);

  const build = (depth) => {
    if (depth === pathsPerTerminal.length) {
      routings.push([...choice]);
      return;
    }
    for (let i = 0; i < pathsPerTerminal[depth].length; i += 1) {
      choice[depth] = i;
      build(depth + 1);
    }
  };

  build(0);
  return { routings, total, exhaustive: true };
}
