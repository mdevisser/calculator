import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { validateFixture, FixtureError } from './schema.js';
import { VERDICT } from './verdict.js';
import { PROBLEMS } from './registry.js';

function millisSince(startNs) {
  return Number(process.hrtime.bigint() - startNs) / 1e6;
}

function finish(result) {
  return { ...result, asExpected: result.verdict === result.expect };
}

// I1, structurally. decide() enforces it for modules that call it, but a module
// is free to return a verdict of its own, so the invariant is re-derived here —
// the last point every verdict passes through — rather than trusted.
function enforceExhaustiveness(result) {
  if (
    result.verdict === VERDICT.CONFIRMED &&
    result.requiresSearch === true &&
    result.exhaustive !== true
  ) {
    return { ...result, verdict: VERDICT.INDETERMINATE, reason: 'non-exhaustive-search' };
  }
  return result;
}

export function runFixture(raw, fixtureName) {
  const started = process.hrtime.bigint();
  const shell = {
    fixture: fixtureName,
    problem: typeof raw?.problem === 'string' ? raw.problem : null,
    candidate: typeof raw?.candidate === 'string' ? raw.candidate : null,
    claim: typeof raw?.claim === 'string' ? raw.claim : null,
    expect: typeof raw?.expect === 'string' ? raw.expect : null,
    source: raw?.source ?? null,
    checks: [],
    requiresSearch: null,
    exhaustive: null,
    searched: null,
  };

  try {
    const fixture = validateFixture(raw);

    const module = PROBLEMS.get(fixture.problem);
    if (!module) {
      throw new FixtureError(`unknown problem: ${fixture.problem}`, 'unknown-problem');
    }

    if (fixture.status === 'unsourced') {
      return finish({
        ...shell,
        verdict: VERDICT.INDETERMINATE,
        reason: 'missing-source-data',
        elapsedMs: millisSince(started),
      });
    }

    const result = enforceExhaustiveness(module.verify(fixture));
    return finish({
      ...shell,
      ...result,
      conjecture: module.conjecture,
      elapsedMs: millisSince(started),
    });
  } catch (error) {
    // I3: our failure is ERROR. Reporting it as REFUTED would present a bug
    // in this code as a mathematical finding.
    return finish({
      ...shell,
      verdict: VERDICT.ERROR,
      reason: error instanceof FixtureError ? error.code : 'internal-error',
      message: error.message,
      elapsedMs: millisSince(started),
    });
  }
}

export async function loadFixtureFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(entry.parentPath ?? entry.path, entry.name))
    .sort();

  return Promise.all(
    files.map(async (file) => ({
      name: path.relative(dir, file).replace(/\.json$/, ''),
      raw: JSON.parse(await readFile(file, 'utf8')),
    })),
  );
}

export async function runAll(dir) {
  const loaded = await loadFixtureFiles(dir);
  return loaded.map(({ name, raw }) => runFixture(raw, name));
}
