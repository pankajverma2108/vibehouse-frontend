# Guest Session Feedback and Reload Context

Date: 2026-05-05
Scope: Vibehouse `/guest` experience, booking-gated guest hub, nav behavior, and backend handoff context.

## Purpose

Use this file as a reloadable brief for the next session or agent. It captures the corrections you made, the preferences you stated, the constraints that matter, and the implementation decisions that should stay stable.

## What You Corrected

### Guest dashboard visual direction

- Remove `VHDSGN` and the `Your Stay` label from the top section.
- Use `Guest Hub` as the centered main heading.
- Remove the helper sentence that described the dashboard as a generic stay dashboard.
- Keep `Guest Mode` and `CONFIRMED` as proper `StickerTag`-style stickers, consistent with the rest of the app.
- Use the red theme everywhere on guest pages where pink was previously used.
- Avoid generic developer copy on the guest pages.

### Section structure

- Add section comments in the code so the page is clearly divided into named sections.
- Keep the dashboard organized as a product surface, not a long unstructured list of cards.

### Booking and room presentation

- Do not show a booking ID card on the dashboard.
- Show room info instead, specifically room and bed information.
- The backend may return values like `203-A`, `203-B`, `203-C`, `203-D`, `203-E`, `203-F`; render them directly.
- The guest hub should be scoped to the booking that is actually active for the guest.

### Card layout corrections

- In `Guest Actions`, the `Popular` sticker on the `Extend Stay` card must use the same `StickerTag` treatment as other pages like `/home` and `/property`.
- `Grab Your Gear` should be 3 cards centered on desktop and 4 cards in a 2x2 grid on small screens.
- `Need More Sleep` should not say `Catalog`; rename the section and keep it to 2 centered cards in one row.
- The `Rules` card clip shape looked uneven, especially bottom-left and top-right. Fix the clipped background so the shape is balanced.
- `Gate Access / Visitors` should be 3 cards horizontal on desktop and 4 cards in a 2x2 grid on smaller screens.

### Map and location

- The map must be dynamic by `property_id`.
- Different property IDs can have different addresses, so do not hardcode the location.
- The map component should be full width and roughly 300px tall on desktop, not a fixed rigid height.
- Booking info also carries property info, so reuse that mapping rather than inventing a separate one-off lookup.

### Guest navigation

- On mobile navigation, replace the `Contact` card with `Guest Hub` when the guest has an active booking.
- `Contact` should only be visible when the user does not have an active booking.
- If the guest is not checked in yet, show a booking-oriented CTA state with informative cards about what the stay offers instead of broken or empty hub content.
- On desktop, remove `My Stay - Current`, `My Stay - Past`, and `My Stay - Cancelled` from the Guest Hub section.
- Keep only `My Bookings` and `My Hub`.
- `My Bookings` should go to `/bookings`.
- `My Hub` should go to `/guest`.
- Remove `RSVP` from the Experiences section.
- Move `Invest & Partner` into Experiences.

### Route behavior

- The guest hub should be protected and booking-scoped.
- The protected route shape should be `/{booking_id}/guest`.
- `/guest` should act as a gateway, not the final stay dashboard.
- The guest dashboard should only be accessible after check-in.
- If the guest has multiple bookings, the selected booking ID must drive the hub.
- Booking IDs are unique and should be respected as the route context.

## Preferences You Stated

- Keep the guest experience clean, simple, straightforward, and product-like.
- Make the design feel final, not like a draft or developer stub.
- Handle responsiveness properly on both desktop and mobile.
- Use graceful GSAP motion, not flashy or brittle animation.
- Prefer dynamic, API-driven values wherever the backend can supply them.
- If a guest is not eligible yet, show a polished CTA state instead of exposing errors or half-rendered modules.
- Do not create paradoxes in routing or auth logic. The route, auth state, and booking eligibility must agree.

## Backend And Contract Notes

- The 403s on `guest/store/cart/:eri` and `guest/store/:eri/borrowable/mine` likely need backend confirmation about auth token, booking context, and check-in state.
- Frontend can and should gate requests behind:
  - authenticated guest session
  - selected booking ID
  - active or eligible booking state
  - known property ID
- If backend later returns structured denial codes, the frontend should map them to deterministic UI states.

## What I Should Do Differently Next Time

- Start with the route and state contract before spending time on visual polish.
- Verify the booking-scoped route and auth guard early, because guest-store calls depend on that contract.
- Treat `/{booking_id}/guest` as the real guest surface from the beginning and make `/guest` only a gateway.
- Normalize unknown API payload shapes immediately instead of assuming arrays and calling `.filter` directly.
- Avoid introducing multiple competing booking sources of truth. The selected booking ID must stay authoritative.
- When adding a new dynamic route in Next.js, verify route typing and generated type files early, because `next build` can rewrite `tsconfig` include behavior.
- Check the route in a real browser after the build, not only through compile/typecheck, because loading shells can hide render problems.

## Stable Working Model

- `/guest` is the guest entry point and eligibility gate.
- `/{booking_id}/guest` is the authenticated booking-scoped hub.
- Guest Store modules should not fire if the guest is not authenticated, has no selected booking, or the booking is not yet active.
- The guest hub should render room/bed and property context, not booking IDs as primary content.
- Mobile nav should adapt to active booking state.
- All guest-page accents should stay on the red theme.

## Files To Read First In A Future Session

- `docs/frontend_note/guest_dashboard_access_frontend_note_2026-05-04.md`
- `docs/fe_to_be/guest_store_403_handoff_2026-05-04.md`
- `docs/backend-context.md`
- `docs/guest_apis.md`
- `state/guest-experience-provider.tsx`
- `components/guest/guest-route-gate.tsx`
- `components/guest/guest-nav.tsx`
- `components/marketing/navigation.tsx`
- `components/marketing/mobile-staggered-menu.tsx`
- `modules/guest/dashboard.tsx`
- `modules/guest/addons.tsx`
- `modules/guest/extend.tsx`
- `modules/guest/services.tsx`
- `modules/guest/borrow.tsx`

## Quick Summary For The Next Agent

This project now uses a booking-scoped guest hub. Keep the booking guard, auth guard, and guest navigation in sync. Do not regress the red guest visual language, and do not reintroduce unguarded store/cart requests or booking-ID-centric UI.
