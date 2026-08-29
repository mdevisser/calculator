import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFixture, FixtureError } from '../../src/harness/schema.js';

function valid(overrides = {}) {
  return {
    problem: 'euler',
    candidate: 'example',
    claim: 'a k-th power is the sum of fewer than k k-th powers',
    expect: 'CONFIRMED',
    source: {
      url: 'https://example.org/paper',
      author: 'L. J. Lander and T. R. Parkin',
      date: '1966-01-01',
      peerReviewed: true,
    },
    data: { k: '5', terms: ['27'], rhs: '144' },
    ...overrides,
  };
}

test('a well-formed fixture validates and is returned unchanged', () => {
  const fixture = valid();
  assert.equal(validateFixture(fixture), fixture);
});

test('non-objects are malformed', () => {
  for (const bad of [null, 'x', 42, []]) {
    assert.throws(() => validateFixture(bad), (e) => e instanceof FixtureError && e.code === 'malformed');
  }
});

test('missing problem, candidate, or claim is missing-field', () => {
  for (const field of ['problem', 'candidate', 'claim']) {
    const fixture = valid();
    delete fixture[field];
    assert.throws(() => validateFixture(fixture), (e) => e.code === 'missing-field', field);
  }
});

test('I2: a fixture without source is rejected', () => {
  const fixture = valid();
  delete fixture.source;
  assert.throws(() => validateFixture(fixture), (e) => e.code === 'missing-source');
});

test('I2: every source subfield is required', () => {
  for (const field of ['url', 'author', 'date', 'peerReviewed']) {
    const fixture = valid();
    delete fixture.source[field];
    assert.throws(() => validateFixture(fixture), (e) => e.code === 'missing-source', field);
  }
});

test('source.peerReviewed must be a boolean, not a string', () => {
  assert.throws(
    () => validateFixture(valid({ source: { url: 'u', author: 'a', date: 'd', peerReviewed: 'no' } })),
    (e) => e.code === 'missing-source',
  );
});

test('expect must be a real verdict name', () => {
  assert.throws(() => validateFixture(valid({ expect: 'MAYBE' })), (e) => e.code === 'bad-expect');
  assert.throws(() => validateFixture(valid({ expect: undefined })), (e) => e.code === 'bad-expect');
});

test('an unsourced fixture may omit data', () => {
  const fixture = valid({ status: 'unsourced', expect: 'INDETERMINATE' });
  delete fixture.data;
  assert.equal(validateFixture(fixture), fixture);
});

test('a sourced fixture must carry data', () => {
  const fixture = valid();
  delete fixture.data;
  assert.throws(() => validateFixture(fixture), (e) => e.code === 'missing-field');
});

// "unsourced" means the fixture's *data* has not been sourced, never that I2 is
// waived. That currently holds only because the source check runs first, so pin it.
test('I2: status unsourced does not waive the source requirement', () => {
  const fixture = valid({ status: 'unsourced', expect: 'INDETERMINATE' });
  delete fixture.source;
  delete fixture.data;
  assert.throws(
    () => validateFixture(fixture),
    (e) => e instanceof FixtureError && e.code === 'missing-source',
  );
});

test('an unknown status is malformed', () => {
  assert.throws(() => validateFixture(valid({ status: 'draft' })), (e) => e.code === 'malformed');
});

// source.note is optional and stays optional: the required set is url, author,
// date, peerReviewed. A fixture that carries a caveat validates, and so does
// one that does not.
test('source.note is optional and never required', () => {
  const withNote = valid();
  withNote.source.note = 'transcribed from an unrefereed post';
  assert.equal(validateFixture(withNote).source.note, 'transcribed from an unrefereed post');

  const withoutNote = valid();
  delete withoutNote.source.note;
  assert.doesNotThrow(() => validateFixture(withoutNote));
});
