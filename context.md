# Colive Flow Handoff Context (Latest)

## User ask in this thread

Polish the full Colive flow UI (immersive, attractive, better spacing/header/gallery/components), replace Mbps mentions with **"Superfast Speed"**, and make amenities richer across the journey.  
Then provide clean handoff context for another agent.

## Current critical state

`components/colive/colive-flow.tsx` is currently **incomplete/broken**.  
The file ends right after the header block and is missing the rest of the component body and closing JSX/function braces.

Result:
- Type-check/build will fail until this file is completed or restored.

## What was started

A full redesign rewrite was started in `components/colive/colive-flow.tsx`:
- New visual system (stronger gradients/cards/spacing)
- Updated copy tone and structure
- `Superfast Speed` copy introduced in property and amenity data
- Richer amenities for both:
  - `TDS - Koramangala A`
  - `TDS - Koramangala B`
- Two-property mapping preserved (no Goa/Manali branches)

However, only the first large chunk was written before command-length/patch-size constraints interrupted the rollout.

## Relevant files and status

- `components/colive/colive-flow.tsx`
  - **Broken/incomplete** (must be fixed first)
- `docs/colive-api-handoff.md`
  - Still contains old example text including `300 Mbps` in at least one section.
  - Needs copy sync to `Superfast Speed`.
- `app/property/page.tsx`
  - Already routes to Colive flow via `?type=colive` (from prior work)
- `app/rooms/page.tsx`
  - Already forwards `type` and `location` query params (from prior work)
- `public/colive/*`
  - Colive assets are present and available for direct use.

## Git/worktree context

Worktree is very dirty with many unrelated modified files.  
Do **not** reset/revert broadly.  
Only touch files needed for Colive completion.

Observed changed/untracked set includes (not exhaustive):
- Modified: multiple booking/auth/marketing files
- Untracked: `components/colive/`, `docs/`, `public/colive/`, and others

## Recovery plan for next agent

1. Fix `components/colive/colive-flow.tsx` first
   - Either complete the redesign rewrite from current partial file
   - Or restore the last working version, then re-apply polish incrementally
2. Ensure copy rules are met everywhere:
   - No explicit `300 Mbps`/`250 Mbps`
   - Use `Superfast Speed`
   - Expand amenity language consistently across landing/inventory/property/checkout/confirmation
3. Sync `docs/colive-api-handoff.md` examples with new copy
4. Run type-check:
   - `node_modules\\.bin\\tsc.cmd --noEmit`
5. Validate mobile + desktop visual spacing:
   - header height and sticky behavior
   - blank spaces and section rhythm
   - gallery layout and CTA hierarchy

## Constraints to preserve

- Inventory must map to only:
  - `TDS - Koramangala A`
  - `TDS - Koramangala B`
- Frontend should remain API-ready but not dependent on unavailable long-stay backend.
- Keep existing route integration behavior for Colive entry points.
