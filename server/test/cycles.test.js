import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCurrentCycle } from '../src/services/cycles.js';

test('calculates natural month cycle', () => {
  const cycle = calculateCurrentCycle({ type: 'natural_month', now: '2026-05-29T00:00:00Z' });
  assert.equal(cycle.startDate, '2026-05-01');
  assert.equal(cycle.endDate, '2026-05-31');
});

test('calculates monthly start day cycle before start day', () => {
  const cycle = calculateCurrentCycle({ type: 'monthly_start', startDay: 15, now: '2026-05-10T00:00:00Z' });
  assert.equal(cycle.startDate, '2026-04-15');
  assert.equal(cycle.endDate, '2026-05-14');
});

test('calculates fixed days cycle', () => {
  const cycle = calculateCurrentCycle({ type: 'fixed_days', startDate: '2026-05-20T00:00:00Z', fixedDays: 7 });
  assert.equal(cycle.startDate, '2026-05-20');
  assert.equal(cycle.endDate, '2026-05-26');
});
