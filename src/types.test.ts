import { describe, it, expect } from 'vitest';
import {
  CALENDAR_COLORS,
  getCalendarColor,
  getPastelColor,
  getFullColor,
} from './types';

describe('CALENDAR_COLORS', () => {
  it('has exactly 4 category colors (Sage/Lavender/Coral/Teal per design-tokens.md)', () => {
    expect(Object.keys(CALENDAR_COLORS)).toHaveLength(4);
  });

  it('does not contain the cut colors (Rose #ec4899, Ocean/duplicate #3b82f6)', () => {
    const values = Object.values(CALENDAR_COLORS);
    expect(values).not.toContain('#ec4899');
    expect(values).not.toContain('#3b82f6');
  });

  it('contains exactly the agreed 4 hex values', () => {
    expect(Object.values(CALENDAR_COLORS).sort()).toEqual(
      ['#10b981', '#14b8a6', '#8b5cf6', '#f97316'].sort(),
    );
  });
});

describe('getCalendarColor', () => {
  it('returns the color at the given index', () => {
    expect(getCalendarColor(0)).toBe(CALENDAR_COLORS[0]);
    expect(getCalendarColor(1)).toBe(CALENDAR_COLORS[1]);
  });

  it('wraps around via modulo once index exceeds the category count', () => {
    // 4 categories, so index 4 should wrap back to index 0's color
    expect(getCalendarColor(4)).toBe(getCalendarColor(0));
    expect(getCalendarColor(5)).toBe(getCalendarColor(1));
  });

  it('handles a 5th+ family member without throwing (documented open question from the design plan)', () => {
    // The design ADR flagged "does 4 categories cover 5+ family members" as
    // an open question. It doesn't crash — it wraps — but a household with
    // 5 members WILL get two people sharing a calendar color. This test
    // documents that current behavior explicitly, so a future fix to
    // support more distinct colors doesn't silently change this contract
    // without someone noticing.
    const colorsForFiveMembers = [0, 1, 2, 3, 4].map(getCalendarColor);
    expect(colorsForFiveMembers[4]).toBe(colorsForFiveMembers[0]);
  });
});

describe('getPastelColor / getFullColor', () => {
  it('maps every category full color to a distinct pastel', () => {
    const fulls = Object.values(CALENDAR_COLORS);
    const pastels = fulls.map(getPastelColor);
    expect(new Set(pastels).size).toBe(fulls.length);
  });

  it('returns the fallback gray for an unknown color', () => {
    expect(getPastelColor('#000000')).toBe('#e5e7eb');
    expect(getFullColor('#000000')).toBe('#6b7280');
  });

  it('getFullColor is idempotent for known colors', () => {
    for (const full of Object.values(CALENDAR_COLORS)) {
      expect(getFullColor(full)).toBe(full);
    }
  });
});
