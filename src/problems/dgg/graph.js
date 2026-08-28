import { parseRational, add, sub, cmp, isNegative, toString, ZERO } from '../../exact/rational.js';
import { FixtureError } from '../../harness/schema.js';

function bad(message) {
  return new FixtureError(message, 'malformed');
}

function requireRational(value, field) {
  try {
    return parseRational(value, field);
  } catch (error) {
    throw bad(error.message);
  }
}

function requireNonNegative(value, field) {
  const r = requireRational(value, field);
  if (isNegative(r)) {
    throw bad(`${field}: must not be negative, got ${toString(r)}`);
  }
  return r;
}

export function parseNetwork(data) {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw bad('data must be an object');
  }
  if (!Array.isArray(data.nodes) || data.nodes.length === 0) {
    throw bad('data.nodes must be a non-empty array');
  }
  if (!data.nodes.every((n) => typeof n === 'string' && n.length > 0)) {
    throw bad('data.nodes must contain only non-empty strings');
  }
  const nodes = new Set(data.nodes);
  if (nodes.size !== data.nodes.length) {
    throw bad('data.nodes must not contain duplicates');
  }
  if (typeof data.source !== 'string' || !nodes.has(data.source)) {
    throw bad(`data.source must be one of data.nodes, got ${JSON.stringify(data.source)}`);
  }
  if (!Array.isArray(data.arcs) || data.arcs.length === 0) {
    throw bad('data.arcs must be a non-empty array');
  }
  if (!Array.isArray(data.terminals) || data.terminals.length === 0) {
    throw bad('data.terminals must be a non-empty array');
  }

  const arcs = data.arcs.map((arc, i) => {
    if (arc === null || typeof arc !== 'object' || Array.isArray(arc)) {
      throw bad(`data.arcs[${i}] must be an object`);
    }
    if (!nodes.has(arc.from)) {
      throw bad(`data.arcs[${i}].from is not in data.nodes: ${JSON.stringify(arc.from)}`);
    }
    if (!nodes.has(arc.to)) {
      throw bad(`data.arcs[${i}].to is not in data.nodes: ${JSON.stringify(arc.to)}`);
    }
    if (arc.from === arc.to) {
      throw bad(`data.arcs[${i}] is a self-loop at ${arc.from}`);
    }
    return {
      from: arc.from,
      to: arc.to,
      cost: requireNonNegative(arc.cost, `data.arcs[${i}].cost`),
      flow: requireNonNegative(arc.flow, `data.arcs[${i}].flow`),
    };
  });

  const seen = new Set();
  const terminals = data.terminals.map((terminal, i) => {
    if (terminal === null || typeof terminal !== 'object' || Array.isArray(terminal)) {
      throw bad(`data.terminals[${i}] must be an object`);
    }
    if (!nodes.has(terminal.node)) {
      throw bad(`data.terminals[${i}].node is not in data.nodes: ${JSON.stringify(terminal.node)}`);
    }
    if (terminal.node === data.source) {
      throw bad(`data.terminals[${i}].node is the source`);
    }
    if (seen.has(terminal.node)) {
      throw bad(`data.terminals[${i}].node is duplicated: ${terminal.node}`);
    }
    seen.add(terminal.node);
    const demand = requireNonNegative(terminal.demand, `data.terminals[${i}].demand`);
    if (cmp(demand, ZERO) === 0) {
      throw bad(`data.terminals[${i}].demand must be positive`);
    }
    return { node: terminal.node, demand };
  });

  const maxDemand = terminals.reduce(
    (best, t) => (cmp(t.demand, best) > 0 ? t.demand : best),
    terminals[0].demand,
  );

  return { nodes: data.nodes, source: data.source, arcs, terminals, maxDemand };
}

export function flowChecks(network) {
  const net = new Map(network.nodes.map((n) => [n, ZERO]));
  for (const arc of network.arcs) {
    net.set(arc.from, sub(net.get(arc.from), arc.flow));
    net.set(arc.to, add(net.get(arc.to), arc.flow));
  }

  const demandOf = new Map(network.terminals.map((t) => [t.node, t.demand]));
  const totalDemand = network.terminals.reduce((sum, t) => add(sum, t.demand), ZERO);

  const offenders = [];
  for (const node of network.nodes) {
    if (node === network.source || demandOf.has(node)) continue;
    if (cmp(net.get(node), ZERO) !== 0) {
      offenders.push(`${node} (net ${toString(net.get(node))})`);
    }
  }

  const sourceNet = net.get(network.source);
  const terminalOffenders = network.terminals
    .filter((t) => cmp(net.get(t.node), t.demand) !== 0)
    .map((t) => `${t.node} (got ${toString(net.get(t.node))}, needs ${toString(t.demand)})`);

  return [
    {
      name: 'flow is conserved at every internal node',
      pass: offenders.length === 0,
      expected: 'net zero at all internal nodes',
      actual: offenders.length === 0 ? 'net zero at all internal nodes' : offenders.join(', '),
    },
    {
      name: 'source emits exactly the total demand',
      pass: cmp(sourceNet, { n: -totalDemand.n, d: totalDemand.d }) === 0,
      expected: `-${toString(totalDemand)}`,
      actual: toString(sourceNet),
    },
    {
      name: 'every terminal receives exactly its demand',
      pass: terminalOffenders.length === 0,
      expected: 'all terminals satisfied',
      actual: terminalOffenders.length === 0 ? 'all terminals satisfied' : terminalOffenders.join(', '),
    },
  ];
}
