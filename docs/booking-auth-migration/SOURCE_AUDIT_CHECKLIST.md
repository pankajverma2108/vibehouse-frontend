# Source Audit Checklist

## Purpose

Provide a source-repo-oriented checklist for extracting auth and booking architecture from `Vibehouse_frontend` without mixing in target-side implementation work.

## Status

Foundation checklist created.

## Why This Exists

`docs/migration/checklist.md` is useful as target migration context, but it mixes source analysis with target implementation work.

This checklist exists to keep the source repo focused on:

- architecture extraction
- behavioral analysis
- flow documentation
- state lifecycle mapping
- route analysis
- API orchestration analysis
- reusable abstraction identification

## Source Audit Checklist

- [ ] Confirm source scope remains auth and booking only
- [ ] Identify source auth entry points
- [ ] Identify source booking entry points
- [ ] Map route protection and redirect behavior
- [ ] Map session lifecycle and persistence boundaries
- [ ] Map booking draft and booking recovery boundaries
- [ ] Map API orchestration relevant to auth and booking
- [ ] Separate reusable abstractions from source-specific UI structure
- [ ] Populate architecture docs only from audited source evidence
- [ ] Mark all unresolved areas as pending instead of inferred
