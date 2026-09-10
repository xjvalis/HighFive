import { describe, it, expect } from 'vitest';
import { isEventFull, isEventOver } from './events';

describe('isEventFull', () => {
  it('is false when there is no capacity limit', () => {
    expect(isEventFull({ max_capacity: null, participants: ['a', 'b'] })).toBe(false);
  });

  it('is false when spots remain', () => {
    expect(isEventFull({ max_capacity: 5, participants: ['a', 'b'] })).toBe(false);
  });

  it('is true once participants reach capacity', () => {
    expect(isEventFull({ max_capacity: 2, participants: ['a', 'b'] })).toBe(true);
  });

  it('treats a missing participants array as empty, not a crash', () => {
    expect(isEventFull({ max_capacity: 2 })).toBe(false);
  });
});

describe('isEventOver', () => {
  const now = new Date('2026-06-15T12:00:00Z');

  it('uses end_time when present', () => {
    expect(isEventOver({ date: '2026-06-15T10:00:00Z', end_time: '2026-06-15T11:00:00Z' }, now)).toBe(true);
    expect(isEventOver({ date: '2026-06-15T10:00:00Z', end_time: '2026-06-15T13:00:00Z' }, now)).toBe(false);
  });

  it('falls back to date + 2h when end_time is absent', () => {
    // Started 10:30, no end_time -> treated as over at 12:30, still going at "now" (12:00).
    expect(isEventOver({ date: '2026-06-15T10:30:00Z' }, now)).toBe(false);
    // Started 09:00 -> treated as over at 11:00, before "now".
    expect(isEventOver({ date: '2026-06-15T09:00:00Z' }, now)).toBe(true);
  });
});
