const test = require('node:test');
const assert = require('node:assert/strict');
const lib = require('../src/utils/dateHelpers');

test('next review follows spaced repetition intervals', () => {
  assert.equal(lib.nextReviewFor(0, '2026-09-21'), '2026-09-22');
  assert.equal(lib.nextReviewFor(2, '2026-09-21'), '2026-09-28');
  assert.equal(lib.nextReviewFor(6, '2026-09-21'), null);
});

test('streak calculation works for consecutive practice days', () => {
  assert.deepEqual(lib.computeStreaks(['2026-09-19','2026-09-20','2026-09-21'], '2026-09-21'), { current: 3, longest: 3 });
});
