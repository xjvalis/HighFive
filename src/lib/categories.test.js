import { describe, it, expect } from 'vitest';
import { CATEGORIES, getCategoryStyle, getCategoryLabel } from './categories';

describe('categories', () => {
  it('has a unique, non-empty name for every category (DB-stored value)', () => {
    const names = CATEGORIES.map(c => c.name);
    expect(new Set(names).size).toBe(names.length);
    names.forEach(n => expect(n.length).toBeGreaterThan(0));
  });

  it('every category has bg/ink/emoji/label.cs/label.en', () => {
    for (const cat of CATEGORIES) {
      expect(cat.bg).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(cat.ink).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(cat.emoji).toBeTruthy();
      expect(cat.label.cs).toBeTruthy();
      expect(cat.label.en).toBeTruthy();
    }
  });

  it('getCategoryStyle finds an exact match by name', () => {
    expect(getCategoryStyle('Sport').ink).toBe('#2F4FA8');
  });

  it('getCategoryStyle falls back to the last category ("Other") for an unknown name', () => {
    expect(getCategoryStyle('NotARealCategory')).toBe(CATEGORIES[CATEGORIES.length - 1]);
    expect(getCategoryStyle(undefined)).toBe(CATEGORIES[CATEGORIES.length - 1]);
  });

  it('getCategoryLabel returns the localized label for a known category', () => {
    expect(getCategoryLabel('Board Games', 'cs')).toBe('Deskové hry');
    expect(getCategoryLabel('Board Games', 'en')).toBe('Board Games');
  });

  it('getCategoryLabel returns the raw name (not a fallback style) for an unknown category', () => {
    expect(getCategoryLabel('NotARealCategory', 'cs')).toBe('NotARealCategory');
  });
});
