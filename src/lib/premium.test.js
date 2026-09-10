import { describe, it, expect } from 'vitest';
import { isPremiumProfile, canJoinEvent, canCreateEvent, monthlyJoinsUsed, MONTHLY_JOIN_LIMIT } from './premium';

describe('isPremiumProfile', () => {
  it('is true for is_premium, or plan plus/creator', () => {
    expect(isPremiumProfile({ is_premium: true })).toBe(true);
    expect(isPremiumProfile({ subscription_plan: 'plus' })).toBe(true);
    expect(isPremiumProfile({ subscription_plan: 'creator' })).toBe(true);
  });

  it('is false for a free plan or no profile', () => {
    expect(isPremiumProfile({ subscription_plan: 'free' })).toBe(false);
    expect(isPremiumProfile(null)).toBe(false);
  });
});

describe('monthlyJoinsUsed / canJoinEvent', () => {
  it('treats a missing reset date as a fresh month (0 used)', () => {
    expect(monthlyJoinsUsed({ monthly_join_count: 2, monthly_reset_date: null })).toBe(0);
  });

  it('reads the stored count when the reset date is still this month', () => {
    const thisMonth = new Date();
    expect(monthlyJoinsUsed({ monthly_join_count: 2, monthly_reset_date: thisMonth.toISOString() })).toBe(2);
  });

  it('resets to 0 once a new calendar month has started', () => {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    expect(monthlyJoinsUsed({ monthly_join_count: 3, monthly_reset_date: lastMonth.toISOString() })).toBe(0);
  });

  it('blocks a free user at the limit, never a premium one', () => {
    const maxedOut = { monthly_join_count: MONTHLY_JOIN_LIMIT, monthly_reset_date: new Date().toISOString() };
    expect(canJoinEvent(maxedOut)).toBe(false);
    expect(canJoinEvent({ ...maxedOut, is_premium: true })).toBe(true);
  });

  it('allows joining with no profile loaded yet (never the sole gate — the server re-checks)', () => {
    expect(canJoinEvent(null)).toBe(true);
  });
});

describe('canCreateEvent', () => {
  it('blocks a free user who already created this month', () => {
    expect(canCreateEvent({ monthly_create_count: 1, monthly_reset_date: new Date().toISOString() })).toBe(false);
  });

  it('allows a premium user regardless of count', () => {
    expect(canCreateEvent({ monthly_create_count: 5, subscription_plan: 'creator' })).toBe(true);
  });
});
