## Thread Recap

### Objective

- Build the `/guest` post-checkin UI foundation as a clean Next.js App Router module.
- Keep the work aligned to existing repo patterns, especially the dark booking-page language, `StickerTag`, Suez One headings, and Geologica body copy.
- Deliver layout, navigation, reusable UI, dashboard surface, and route scaffolding without business logic.

### Problem Statement

- The repo needed a dedicated guest-area architecture that did not drift into a new design system or borrow from `components/standalone`.
- The `/guest` experience had to be structured for later expansion, but the first pass could not include API calls, persistence, or state mutations.
- The architecture needed to stay explicit about flow ownership, navigation behavior, modal shape, loading states, and checkout aggregation so later implementation would not become ambiguous.

### Methodology

- I started by reading the existing booking, profile, and confirmed-page patterns to match container sizes, spacing, border treatment, typography, and sticker usage.
- I checked the repo’s shared primitives and auth/session conventions so the new module could reuse existing components instead of inventing duplicates.
- I implemented the guest UI as thin route files over feature modules, with shared guest components under `components/guest`, and a placeholder provider under `state`.
- I kept the initial pass UI-only and verified the result with targeted linting, full typecheck, and a production build.

### What To Look Out For

- Keep client/server boundaries in mind when passing icons, motion components, or other React values through the tree.
- Do not let the guest module drift into a separate visual system; dark flat surfaces, dashed borders, restrained accents, and colorful sticker tags are the intended balance.
- Keep `/guest` route files thin; push actual screen composition into `modules/guest/*`.
- Recheck the repo state after build or dev commands, because generated files can change even when the code patch itself is clean.
- If the user asks for architecture only, do not sneak in business logic, storage, or API wiring early.

### Conclusion

- The `/guest` foundation is now in place and verified.
- The next phase should add business logic on top of this structure without changing the route organization or visual language.

## Guest module architecture and implementation corrections

- When the user says "design the complete architecture before implementation," include explicit flow ownership, navigation strategy, modal state shape, UI state strategy, animation rules, and checkout aggregation rules. Omitting any of those leaves too much to guess in the next phase.
- For `/guest`, keep the module architecture aligned to the existing repo patterns: thin `app/guest/*` route files, feature modules under `modules/guest/*`, shared UI under `components/guest/*`, and no extra design system invention.
- Use `StickerTag` as part of the architecture, but treat it as a controlled accent. Keep the overall surfaces dark, flat, and dashed; let sticker tags be the main colorful exception.
- Keep the typography split as already established in the repo: `Suez One` for headings and `Geologica` for body/content.
- Do not use anything from `components/standalone`.
- Keep the initial `/guest` pass UI-only. Do not introduce API calls, localStorage, or state mutations until the business-logic phase.
- If a component tree passes icons or other React components through a server component boundary, make the leaf feature module client-side instead of forcing functions across the boundary.
- When verifying a new route, prefer a targeted file-scoped lint/build check first. Repo-wide lint can fail on unrelated files and should not block the new module if the new files are clean.
- If the repo already has a dev server running, reuse it instead of starting a second one on another port.

## What the user corrected

- The architecture needed a dedicated flow ownership layer so each module clearly owns its mutations and read-only screens. That prevents duplicate logic and inconsistent state updates later.
- The navigation strategy needed to be explicit: shared `GuestNav`, persistent across `/guest/*` via `layout.tsx`, active route detection with `usePathname()`, and badge counts for cart and borrow state.
- The modal state needed a concrete schema, not a placeholder `any` shape.
- Each module needed its own loading, empty, and error states instead of relying only on global route loading.
- Animation guidance needed to be concrete: card entry with opacity + slight translateY, modal scale + opacity, list layout animations, and short durations.
- Checkout needed aggregation rules: what gets combined, how totals are derived, and when submission should be disabled.

## What to do differently next time

- Read the exact correction list back against the live architecture before finalizing. The misses came from skipping explicit user constraints, not from code complexity.
- When the user asks for "architecture only," stop short of implementing business logic or persistence. Keep the plan and the code tightly separated.
- If a route module will render icons or motion-driven cards, plan the client/server boundary early so you do not discover serialization issues during build.
- Recheck the current repo state before writing generated files back to disk. Build and dev commands can update metadata files that should not be left as accidental changes.
- When the user asks for a reusable note "for future sessions," keep it compact and operational: corrections, preferences, and avoid-next-time items only.

## What the user corrected

- Tab 2 scope was not only add-ons logic; it also required fixing the checkout page layout and visual consistency where the previous Tab 1 pass still missed items.
- The events section was supposed to move below the full checkout flow, just above the footer. Leaving event content in the top hero area was incorrect.
- The sticky booking details panel belonged on the right grid, not the left. The earlier implementation had the columns reversed.
- The booking details panel background needed to be flat `#07070a` with no gradients.
- The events CTA section also needed the same flatter, calmer surface treatment instead of decorative gradients.
- The page had too many colors and colored strips. Color should be reduced across sections and cards; sticker tags can stay colorful.
- `components/booking/booking-confirmed-page.tsx` was the correct visual reference for borders, backgrounds, typography, and overall booking-page consistency.

## User preferences stated explicitly

- Follow the existing design system from Home + Property. Do not invent a new visual language when the platform already has one.
- Typography source of truth for these booking pages:
  - Headings: `Suez One`
  - Content: `Geologica`
- Remove generic copy, debug text, hidden API/debug messaging, and frontend error leakage.
- Use safe API handling everywhere:
  - validate array/object shapes
  - guard `null` / `undefined`
  - default to `[]` and `0`
  - prevent UI crashes
- Use transparent pricing only. No fake struck-through prices or decorative pricing noise unless the product actually supports it.
- Use `async` / `await`.
- Add inline code comments specifically for:
  - API handling
  - fallback behavior
  - pricing logic
- Modify only relevant files and avoid unrelated layout or logic changes.
- When the user points to a specific file as a design reference, treat that file as the source of truth before styling the target screen.

## Add-ons specific requirements from the user

- Fetch add-ons only for `property_id = 60765`.
- Guard against `response.filter is not a function` by confirming the API payload is an array before filtering.
- Fallback to `[]` if the payload is malformed or unavailable.
- Remove explanatory API/debug copy like:
  - “No service add-ons…”
  - “Live inventory is pulled…”
  - “Service upgrades do not expose…”
- Display only useful add-on information:
  - name
  - price
  - quantity selector
  - inventory if relevant
- Empty states should be graceful and minimal, not diagnostic.
- Errors should be handled internally and not exposed as raw UI/system messaging.

## What to do differently next time

- If the user says “use this file as the design reference,” read that file before making visual changes, not after.
- When asked to move a section “to the bottom,” verify the original content is removed from the earlier location, not only duplicated below.
- For two-column review layouts, verify column placement against the user’s exact wording before finalizing sticky behavior.
- When the user asks to reduce colors, do a deliberate sweep for:
  - gradient backgrounds
  - colored top strips / side strips
  - bright accent text
  - mismatched CTA colors
  rather than fixing only the first obvious component.
- For booking review pages, default to the calmer `booking-confirmed-page` language:
  - dark flat surfaces
  - dashed borders
  - restrained accents
  - sticker tags as the main color exception
- After a “completed” pass, re-check the user’s exact correction list against the live UI structure. The misses here were not logic bugs; they were instruction-compliance misses.

## Practical checklist for future booking-page work

- Read the target implementation file.
- Read the user-provided design-reference file if one is named.
- Mirror layout placement exactly before polishing visuals.
- Remove debug/explanatory copy before final verification.
- Verify add-ons/catalog payload guards with malformed-response assumptions.
- Verify desktop sticky column side, mobile summary, and event-section placement.
- Run file-scoped lint and typecheck before closing.
