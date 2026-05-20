# Handoff: Replace Text Loading Screens with Loading UI

Date: 2026-04-18
Scope: Booking flow first, then wider app audit

## Goal

Remove visible loading copy such as "Loading ..." from user-facing loading states and replace with skeleton/loading UI that matches final layout.

## Why

Current booking flow still shows text-based loading shells in some screens (example: web check-in opening state), which feels inconsistent with the rest of the UI system.

## Priority Scope (Booking Flow)

### P0: Convert text loading states to visual skeletons

1. `components/booking/pre-arrival-page.tsx`
   - Current behavior includes visible loading copy in the `isRestoringSession || isLoading` branch.
   - Replace with a dedicated skeleton composition matching the web check-in page layout (header + stepper placeholders + card placeholder).

2. `components/booking/booking-confirmed-page.tsx`
   - Current behavior includes visible loading copy in the `isRestoringSession || isLoading` branch.
   - Replace with skeletons matching stay-confirmed layout blocks.

3. `app/bookings/page.tsx`
   - Already uses `BookingListSkeleton`, but loading shell still includes textual title/description.
   - Replace/neutralize visible loading copy while preserving structure and accessibility.

### P1: Secondary booking loading copy

4. `components/booking/booking-checkout-page.tsx`
   - Replace inline copy like "Loading add-ons from the property store..." with shimmer/skeleton cards in add-on sections.

### P2: Legacy/unused visual variants (optional)

5. `components/booking/pre-arrival-page.violet.tsx`
6. `components/booking/booking-detail-page.violet.tsx`

## Suggested Implementation Pattern

- Prefer route-level `loading.tsx` for segment loading where possible.
- For client-side async states inside page components:
  - render skeleton blocks with fixed heights to avoid layout shift,
  - avoid visible "Loading ..." text,
  - keep accessibility status in screen-reader-only text if needed.

### Accessibility rule

- If status text is needed, make it visually hidden (`sr-only`) and keep visual surface skeleton-only.

## Acceptance Criteria

1. No visible "Loading" copy appears in booking flow screens during loading.
2. Skeletons resemble final layout enough to prevent jumpy transitions.
3. No regressions in auth gating, payment gating, or KYC flow.
4. Lint/build pass for modified files.

## Verification Commands

- `npx eslint components/booking/pre-arrival-page.tsx components/booking/booking-confirmed-page.tsx app/bookings/page.tsx`
- Optional full check: `npm run lint`

## Search Helpers for Next Session

- Find visible loading copy in booking flow:
  - `rg -n "Loading " components/booking app/bookings`
- Wider app sweep:
  - `rg -n "Loading " app components`

## Next.js Docs Links

- [x] Route segment loading UI (`loading.js` / `loading.tsx`): https://nextjs.org/docs/app/api-reference/file-conventions/loading
- [x] Streaming and Suspense in App Router: https://nextjs.org/docs/app/getting-started/linking-and-navigating
- [x] Data fetching patterns in App Router: https://nextjs.org/docs/app/getting-started/server-and-client-components
- [x] Recommended skeleton/loading UX patterns: https://nextjs.org/docs/app/guides/lazy-loading

## Prompt Starter for Next Chat

Use this with the next agent:

"Implement docs/loading-ui-handoff-2026-04-18.md exactly. Remove visible loading text from booking flow pages and replace with skeleton-first loading UI, preserving all existing behavior and routing."