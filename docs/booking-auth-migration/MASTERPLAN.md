# Booking/Auth Migration Masterplan

## Purpose

Define the documentation foundation for extracting authentication and booking architecture from `Vibehouse_frontend` into `buteak_website` without copying UI or unrelated product behavior.

## Status

Epic 1 foundation created.

## Source Repo Role

`Vibehouse_frontend` is the source architecture reference for this migration track.

This repo is used to document:

- auth behavior
- booking behavior
- session lifecycle
- route behavior
- persistence patterns
- API orchestration patterns
- failure handling patterns

This repo is not the target implementation repo for this effort.

## Migration Scope

Only the following areas are in scope for extraction planning:

- authentication architecture
- booking architecture
- booking/session state lifecycle
- protected and redirect-aware route behavior
- booking persistence and resume behavior
- API interaction patterns required by auth and booking flows

Everything else is out of scope for this documentation foundation unless a later audit explicitly proves it is required to support auth or booking migration.

## What Should Be Extracted Later

Future repo intelligence and architecture audits should extract:

- actual auth entry points and session boundaries
- booking entry points and booking draft boundaries
- persistence responsibilities across memory, session, and local storage
- route transitions and restoration behavior
- API dependency map for auth and booking orchestration
- reusable abstractions that can be recreated in the target repo without copying design or unrelated product code

No low-level behavioral claims should be documented until the relevant source surfaces are audited.

## What Must Not Be Copied Into Buteak

The following must not be treated as migration deliverables from this source repo:

- UI layouts
- styling systems
- typography
- motion and visual treatment
- branding
- unrelated guest experience modules
- full-product features outside auth and booking scope
- implementation choices that are specific to this repo but not required by the audited behavior

This is a system-behavior migration track, not a UI cloning track.

## Relationship To The Buteak Target Repo

`buteak_website` is the target implementation repo.

The role split is:

- `Vibehouse_frontend`: source of truth for architecture extraction
- `buteak_website`: destination for compatible implementation

Source documentation should help the target repo recreate behavior and system boundaries, not duplicate this repo's presentation layer or product identity.

## Execution Order For Future Repo Intelligence

The next phases should proceed in this order:

1. Generate source repo intelligence for auth, booking, routes, state, persistence, and APIs.
2. Populate the architecture and flow documents only after source evidence is gathered.
3. Identify reusable abstractions and migration-safe patterns.
4. Compare source findings against the target repo's current capabilities.
5. Use the documented findings to drive target-side implementation planning.

## Success Criteria

This source documentation foundation is successful when:

- the repo is clearly framed as an architecture reference
- auth and booking remain the only migration scope
- later audits have a clear execution order
- future Codex passes can distinguish audited facts from placeholders
- target implementation work can use these docs without confusing source analysis with source code copying
