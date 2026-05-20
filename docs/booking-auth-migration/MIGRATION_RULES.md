# Migration Rules

## Purpose

Define the rules for using `Vibehouse_frontend` as a source architecture reference during the auth and booking migration into `buteak_website`.

## Status

Active foundation rules.

## Core Principle

This repo is an architectural reference, not a design reference.

The migration should extract:

- behavior
- lifecycle
- state boundaries
- route logic
- persistence logic
- orchestration patterns
- failure handling patterns

The migration should not copy presentation choices unless a later audit proves a visual artifact is required to understand behavior.

## Allowed Extraction Patterns

Allowed extraction from this repo includes:

- documenting flow entry points
- documenting state ownership and lifecycle boundaries
- documenting route protection and redirect behavior
- documenting storage and resume patterns
- documenting API request sequencing
- documenting failure-state handling
- identifying reusable abstractions that can be reimplemented in the target repo

Allowed extraction means analysis, mapping, and recreation guidance. It does not mean copying runtime code blindly into the target repo.

## Forbidden Copying Patterns

The following are forbidden unless a later audit explicitly approves them with evidence:

- copying UI layouts
- copying styling, typography, spacing, and animation systems
- cloning component structures for visual parity
- migrating unrelated product modules because they are nearby in the codebase
- treating this repo as a brand or design source
- porting implementation details that have not been audited for auth or booking relevance

## Auth Extraction Rules

Future auth audits should:

- map actual authentication entry points before describing the flow
- separate auth lifecycle behavior from auth UI presentation
- document session creation, hydration, persistence, restoration, and logout behavior only from audited source evidence
- capture redirect and protected-route behavior as behavior contracts, not as component-cloning instructions
- avoid inventing token, refresh, or verification details until those behaviors are verified in source code

## Booking Extraction Rules

Future booking audits should:

- map booking entry points before documenting lifecycle behavior
- document draft, review, checkout, confirmation, and recovery behavior only after source inspection
- separate business-flow orchestration from payment-vendor specifics unless vendor handling is proven architecturally required
- capture persistence and resume rules as state contracts
- identify reusable booking abstractions without carrying over source-specific UI structure

## API And property_id Rules

Future API analysis should:

- document only audited request and response patterns relevant to auth and booking
- treat `property_id` handling as a behavioral contract where required by source flow behavior
- avoid rewriting API semantics from memory or target assumptions
- distinguish clearly between source-side orchestration patterns and target-side implementation choices

If an API surface is not audited, it must remain undocumented or explicitly marked as pending.

## Rules For Future Codex Audits

Future Codex passes working in this repo should:

- treat this repo as the source reference only
- avoid target-side implementation planning inside source audit documents unless the file explicitly calls for comparison
- mark unaudited areas as pending instead of filling gaps with assumptions
- prioritize repo intelligence, architecture extraction, and behavior mapping
- keep source documentation separate from any UI migration or branding discussion

When uncertain, prefer a placeholder over an invented architectural claim.
