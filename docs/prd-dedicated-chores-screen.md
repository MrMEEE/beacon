# PRD: Dedicated Chores Screen

## Problem
Chores currently render as a slide-over panel (`ChoresPanel.tsx`) triggered from the sidebar. Per user feedback (GitHub issue #1, BigJoe1979): "The chores menu I think should be its own screen with separate columns by family member (like the dashboard) rather than the flyover menu that requires a lot of scrolling." Reference: Skylight-style layout — https://youtu.be/yJ6LgSU1cuE?t=88

## Goal
Promote Chores from a slide-over panel to a first-class full-screen view (`ChoresView.tsx`), reusing the per-member-column visual pattern already proven in `DashboardView.tsx`'s family grid (`dash-family-grid` / `dash-member-col`). Each column shows one family member's chores, checkable inline, with progress + streak visible without opening a separate panel.

## Non-goals
- Not changing chore data model, completion logic, or the existing `useChores` hook — purely a view/layout change.
- Not touching Leaderboard (stays a separate panel for now — same complaint hasn't been raised about it).
- Not changing the Dashboard's own inline chore checklist (`TaskChecklist.tsx`) — that stays as the at-a-glance summary; the new Chores screen is the deep-dive/full-management surface.

## Requirements

1. **New `ChoresView.tsx` component**, full-screen (same shell/pattern as `DashboardView.tsx`, `CalendarSidebar`, etc. — check how those receive props/layout from `App.tsx`).
2. **Layout**: one column per family member, CSS grid like `dash-family-grid` (`--member-count` CSS var already exists as a pattern to reuse). Each column: member avatar/name header (reuse `dash-member-header` styling), progress bar, streak badge, then a scrollable list of that member's chores as `ChoreCard`s.
3. **Add/Edit chore**: keep existing add/edit form (currently inline in `ChoresPanel.tsx`) — move it into the new view (e.g. as a modal or inline "+ Add chore" per column) rather than deleting that logic. Reuse the star-currency-aware value input verbatim.
4. **Routing**: change `Sidebar.tsx`'s `NAV_ITEMS` / `handleChangeView` in `App.tsx` so `'chores'` becomes a real `activeView` (like `'dashboard'`, `'calendar'`) instead of `setShowChoresPanel(true)`. Remove the slide-over trigger for chores; leave Leaderboard's slide-over behavior untouched.
5. **Delete `ChoresPanel.tsx`** once `ChoresView.tsx` fully replaces it and all its logic (add/edit form, completion toggling, per-member breakdown) has a home in the new view — don't leave dead code.
6. **Respect existing settings**: `settings.choresEnabled` should still gate whether the Chores nav item is even shown/functional (match whatever pattern `App.tsx` uses elsewhere for conditionally showing nav items, if any — if none exists, it's fine for the toggle to just control Dashboard/Calendar visibility as it does today, per the round-1 fix).
7. **Responsive**: must work at the same breakpoints as `DashboardView.tsx`'s family grid (mobile bottom-tab-bar included per `Sidebar.tsx`'s `MOBILE_TAB_IDS`).

## Acceptance criteria
- Clicking "Chores" in the sidebar/mobile tab bar navigates to a full `ChoresView` screen (URL/view state changes, not an overlay).
- Each family member has their own column showing their chores, with clear per-member visual separation (avatar, name, color-coded per existing `member.color` convention).
- Checking off a chore works exactly as before (calls the same `completeChore`/`uncompleteChore` from `useChores`).
- Adding/editing/deleting a chore still works, accessible from the new screen.
- Star currency mode (round-1 fix) still renders correctly in the new layout.
- `npm run build` passes with zero TypeScript errors.
- `beacon/src/` synced from `src/` per CLAUDE.md.
