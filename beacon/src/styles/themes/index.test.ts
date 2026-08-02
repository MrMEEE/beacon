import { describe, it, expect } from 'vitest';
import { themes } from './index';

/**
 * Regression test for the bug fixed in the icon/tokens/typography PR:
 * `.dash-topbar-time` used to fall back to `var(--accent, var(--color-blue-full))`,
 * which meant any theme that forgot to set an explicit `accent` silently got
 * a blue clock regardless of its actual palette. The fallback was removed
 * ONLY after confirming every theme sets `accent` explicitly — this test
 * keeps that guarantee true as new themes get added.
 */
describe('themes — accent color contract', () => {
  it('every theme defines a non-empty colors.accent', () => {
    for (const theme of themes) {
      expect(theme.colors.accent, `theme "${theme.id}" is missing an accent color`).toBeTruthy();
      expect(theme.colors.accent).toMatch(/^#[0-9a-fA-F]{3,8}$/);
    }
  });

  it('has at least the 8 themes documented in docs/design-tokens.md', () => {
    expect(themes.length).toBeGreaterThanOrEqual(8);
  });

  it('every theme id is unique', () => {
    const ids = themes.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every theme defines exactly 6 eventColors (one per family-member slot)', () => {
    for (const theme of themes) {
      expect(theme.eventColors, `theme "${theme.id}"`).toHaveLength(6);
    }
  });

  it('every theme sets all three font roles (display/body/mono)', () => {
    for (const theme of themes) {
      expect(theme.fonts.display, `theme "${theme.id}" display font`).toBeTruthy();
      expect(theme.fonts.body, `theme "${theme.id}" body font`).toBeTruthy();
      expect(theme.fonts.mono, `theme "${theme.id}" mono font`).toBeTruthy();
    }
  });
});
