# TDS Multi-Property Frontend Plan

Date: 2026-05-20
Owner: Frontend
Status: Plan only (no implementation)

## Goal
Align the TDS frontend with the backend multi-property model: require explicit property_id for all property-scoped calls, resolve property_id centrally, and handle missing property_id gracefully without changing any UI or visuals.

## Scope
- TDS frontend only (this repo).
- Logic, hooks, and API wiring only. No design, copy, or visual changes.
- Prepare for multiple TDS properties; Buteak is handled in a separate repo.

## Constraints
- No visual changes or new components.
- Keep static content TDS-only in this repo.
- Backend and DB are the source of truth for property IDs.
- Use host mapping until a property-config endpoint exists.

## Decisions
- Central resolver/hook for property_id.
- Host mapping (matches backend) with env fallback for local/dev.
- Existing error UI for 400s and missing property_id.

## Backend Rules (Summary)
- Backend resolves property_id in priority order: explicit property_id, admin JWT property_id, then host header for public endpoints.
- No default fallback to 60765 anymore.
- property_id is always numeric (eZee hotel code).
- Feature flags live in properties.branding_config.features and should drive UI gating when available.

## Plan Steps

### 1) Add a central property resolver
- Introduce a small utility and hook (server + client) to resolve property_id.
- Resolution order:
  1) Explicit route or search param (if present and valid)
  2) Host mapping (www.thedailysocial.co.in -> 60765, etc.)
  3) Env fallback (NEXT_PUBLIC_PROPERTY_ID) for local/dev only
- Reuse or extend sanitizePropertyId to enforce numeric-only IDs.

### 2) Remove defaults and hardcoded IDs
- Replace getDefaultPropertyId() usage.
- Remove DEFAULT_PROPERTY_ID fallback behavior.
- Replace hardcoded 60765 usage with resolved property_id where the flow is property-scoped.

### 3) Wire property_id through all property-scoped calls
- Public events: /public/events
- Guest booking: rooms, availability, create-order, lookup
- Store and add-ons: catalog/services/borrowables
- Colive flows (if still enabled for TDS)
- Internal API routes that proxy these calls

### 4) Feature gating (logic only)
- Add a property features fetcher based on branding_config.features once the backend endpoint exists.
- Gate events/amenities/colive/smart lock UI only via logic. No new UI elements.
- Until backend endpoint exists, default to TDS features for this repo.

### 5) Graceful error handling
- On missing property_id or 400 responses, use existing error UI states.
- Centralize detection using ApiRequestError.status === 400.

## Known Hotspots
- lib/cx-api.ts: DEFAULT_PROPERTY_ID, getDefaultPropertyId(), events/rooms/availability helpers
- lib/guest-experience-api.ts: withPropertyId helper
- lib/booking-api.ts: booking and store catalog calls
- lib/colive-api.ts: colive endpoints
- components/colive/colive-flow.tsx: hardcoded 60765
- components/booking/booking-checkout-page.tsx: hardcoded add-on property
- app/events/page.tsx and app/property/page.tsx
- app/api/cx/rooms/route.ts

## Dependencies
- Backend property-config endpoint to expose branding_config.features (for feature gating).
- Up-to-date host-to-property mapping as new properties go live.

## Acceptance Criteria
- All property-scoped calls include property_id.
- No remaining default or hardcoded property_id fallback behavior.
- Missing property_id results in graceful error state, not a crash.
- No UI or visual changes introduced.

## Verification
1) Grep for DEFAULT_PROPERTY_ID or getDefaultPropertyId usage after refactor.
2) Confirm network calls include property_id for events, rooms, availability, and booking flow.
3) Simulate missing property_id (unknown host) and confirm existing error UI.
4) Ensure colive/add-on flows use resolved property_id.

## Notes
- Keep Buteak-specific content and gating out of this repo.
- New properties will require updates to host mapping once added by backend.
