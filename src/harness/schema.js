import { VERDICT } from './verdict.js';

export class FixtureError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'FixtureError';
    this.code = code;
  }
}

const REQUIRED_TOP = ['problem', 'candidate', 'claim'];
const REQUIRED_SOURCE = ['url', 'author', 'date'];

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function validateFixture(raw) {
  if (!isPlainObject(raw)) {
    throw new FixtureError('fixture must be a JSON object', 'malformed');
  }

  for (const field of REQUIRED_TOP) {
    if (typeof raw[field] !== 'string' || raw[field].length === 0) {
      throw new FixtureError(`missing required field: ${field}`, 'missing-field');
    }
  }

  if (!Object.values(VERDICT).includes(raw.expect)) {
    throw new FixtureError(
      `expect must be one of ${Object.values(VERDICT).join(', ')}, got ${JSON.stringify(raw.expect)}`,
      'bad-expect',
    );
  }

  // I2: provenance is mandatory. Both headline results are unrefereed posts,
  // and a verdict shown without its source is the failure mode this prevents.
  if (!isPlainObject(raw.source)) {
    throw new FixtureError('missing required field: source', 'missing-source');
  }
  for (const field of REQUIRED_SOURCE) {
    if (typeof raw.source[field] !== 'string' || raw.source[field].length === 0) {
      throw new FixtureError(`missing required field: source.${field}`, 'missing-source');
    }
  }
  if (typeof raw.source.peerReviewed !== 'boolean') {
    throw new FixtureError('source.peerReviewed must be a boolean', 'missing-source');
  }

  if (raw.status !== undefined && raw.status !== 'unsourced') {
    throw new FixtureError(`unknown status: ${JSON.stringify(raw.status)}`, 'malformed');
  }

  if (raw.status !== 'unsourced' && !isPlainObject(raw.data)) {
    throw new FixtureError('missing required field: data', 'missing-field');
  }

  return raw;
}
