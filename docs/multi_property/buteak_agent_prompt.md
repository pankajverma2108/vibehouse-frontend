# Buteak Repo Agent Prompt

Date: 2026-05-20
Audience: Agent working on the Buteak frontend repo
Purpose: Provide context and instructions for the Buteak multi-property implementation

## Context
- Backend and DB are the source of truth for property IDs.
- Backend removed DEFAULT_PROPERTY_ID fallback. If property_id is missing, property-scoped endpoints return 400.
- Backend resolves property_id in this order: explicit property_id, admin JWT property_id, then host header for public endpoints.
- Property IDs are numeric (eZee hotel code), not slugs.
- Feature flags live in properties.branding_config.features:
  - events, amenities, colive, smart_lock
- Buteak currently has events/amenities/colive/smart_lock all false.
- Two properties exist now: TDS 60765 and Buteak 55402. More will follow (3 TDS + 3 Buteak planned).

## Constraints
- No design or visual changes. Logic only.
- Use existing error UI for missing property_id or 400s.
- Do not add static TDS content to Buteak repo.
- Centralize property_id resolution (hook or utility) and use it everywhere.

## Implementation Direction
1) Central property resolver (server + client)
   - Resolve property_id by priority:
     a) explicit route/search param
     b) host mapping (www.buteak.in -> 55402, etc.)
     c) env fallback (local/dev only)
   - Validate numeric IDs only.

2) Remove defaults and hardcoded IDs
   - Eliminate DEFAULT_PROPERTY_ID fallback.
   - Replace any hardcoded property_id values with resolved property_id.

3) Pass property_id to all property-scoped calls
   - /public/events
   - /guest/booking/rooms
   - /guest/booking/availability
   - /guest/booking/create-order
   - /guest/booking/lookup
   - /guest/store/catalog, /guest/store/services, /guest/store/borrowables
   - Colive endpoints (if present)

4) Feature gating (logic only)
   - Read branding_config.features when a backend endpoint is available.
   - Hide events/amenities/colive/smart lock UI when false.

5) Error handling
   - On missing property_id or 400, use existing error UI.
   - Centralize detection using ApiRequestError.status === 400.

## Prompt For Agent
You are implementing multi-property support in the Buteak frontend repo. The backend is now strict: property_id must be explicitly provided for every property-scoped endpoint. Remove any DEFAULT_PROPERTY_ID fallback and hardcoded IDs, and add a central property_id resolver that prioritizes explicit route or search params, then host mapping, then an env fallback for local dev only. Pass the resolved property_id through all public and guest booking endpoints (events, rooms, availability, create-order, lookup, store catalog/services/borrowables, and any colive endpoints). Gate events, amenities, colive, and smart_lock UI using branding_config.features once the backend exposes it. Handle missing property_id or 400 responses gracefully using existing error UI. Do not change any design or visuals; keep changes purely in logic, hooks, and API wiring.
