import { describe, it, expect } from 'vitest';
import { trendingScore, sortByTrending } from './trending';

// Regression test for the "Populární"/"Hot právě teď" audit: Home's Populární
// tab, /trending, and RightSidebar's Hot právě teď used to each compute
// popularity differently (one via a DB order-by-favorites_count query, one
// via this exact heuristic, one via a hot_score column nothing ever wrote
// to). They now all share this one function — pin its behavior down so a
// future edit to one caller can't silently drift back into having its own
// definition of "popular".
describe('trendingScore', () => {
  const now = new Date('2026-06-15T12:00:00Z');
  const base = { date: '2026-06-20T12:00:00Z', participants: [], max_capacity: 10 };

  it('weights each participant higher than each comment or favorite', () => {
    const going = { ...base, participants: Array(5).fill('a') };
    const commented = { ...base, comments_count: 5 };
    const favorited = { ...base, favorites_count: 5 };
    expect(trendingScore(going, now)).toBeGreaterThan(trendingScore(commented, now));
    expect(trendingScore(going, now)).toBeGreaterThan(trendingScore(favorited, now));
  });

  it('gives an almost-full event (1-3 spots left) a scarcity bonus', () => {
    const almostFull = { ...base, max_capacity: 5, participants: Array(3).fill('a') }; // 2 left
    const roomy = { ...base, max_capacity: 20, participants: Array(3).fill('a') }; // 17 left
    expect(trendingScore(almostFull, now)).toBeGreaterThan(trendingScore(roomy, now));
  });

  it('does not treat a fully-booked event as scarce (0 left is not "almost full")', () => {
    const full = { ...base, max_capacity: 3, participants: Array(3).fill('a') };
    const oneLeft = { ...base, max_capacity: 4, participants: Array(3).fill('a') };
    // Same headcount (3 going), but oneLeft gets the scarcity bonus and full doesn't.
    expect(trendingScore(oneLeft, now)).toBeGreaterThan(trendingScore(full, now));
  });

  it('bonuses an event already underway', () => {
    const started = { ...base, date: '2026-06-15T10:00:00Z' };
    const notStarted = { ...base, date: '2026-06-20T12:00:00Z' };
    expect(trendingScore(started, now)).toBeGreaterThan(trendingScore(notStarted, now));
  });

  it('treats a missing capacity/participants/counts as zero, not a crash', () => {
    expect(trendingScore({ date: '2026-06-20T12:00:00Z' }, now)).toBe(0);
  });
});

describe('sortByTrending', () => {
  const now = new Date('2026-06-15T12:00:00Z');

  it('ranks the higher-scoring event first', () => {
    const quiet = { id: 'a', date: '2026-06-20T12:00:00Z', participants: [] };
    const busy = { id: 'b', date: '2026-06-20T12:00:00Z', participants: Array(10).fill('x') };
    expect(sortByTrending([quiet, busy], now).map(e => e.id)).toEqual(['b', 'a']);
  });

  it('breaks ties on score by soonest date', () => {
    const later = { id: 'later', date: '2026-06-25T12:00:00Z', participants: [] };
    const sooner = { id: 'sooner', date: '2026-06-18T12:00:00Z', participants: [] };
    expect(sortByTrending([later, sooner], now).map(e => e.id)).toEqual(['sooner', 'later']);
  });

  it('does not mutate the input array', () => {
    const events = [{ id: 'a', date: '2026-06-20T12:00:00Z' }, { id: 'b', date: '2026-06-19T12:00:00Z' }];
    const copy = [...events];
    sortByTrending(events, now);
    expect(events).toEqual(copy);
  });
});
