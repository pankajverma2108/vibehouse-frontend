# BUTEAK AUTH + BOOKING MIGRATION TRACKER

# STATUS LEGEND

- [ ] Not Started
- [/] In Progress
- [x] Completed
- [!] Blocked
- [~] Needs Review

---

# PROJECT CONTEXT

## Objective

Migrate ONLY:

- Authentication architecture
- Booking flow architecture
- Session lifecycle
- Checkout orchestration
- Booking persistence
- Route protection patterns

FROM:

`Vibehouse_frontend` (The Daily Social)

TO:

`buteak_website` (Buteak)

WITHOUT migrating:

- visual identity
- typography
- spacing
- animations
- component styling
- design language

---

# IMPORTANT IMPLEMENTATION RULE

This project is:

"Behavior + System Architecture Migration"

NOT:

"UI Cloning"

---

# CURRENT PLATFORM STATUS

## Multi-Property Infrastructure

### Status: [x] Completed

Implemented:

- [x] Dynamic property resolver
- [x] Host-based property mapping
- [x] Shared backend compatibility
- [x] property_id enforcement
- [x] SSR property resolution
- [x] Client-side property hooks
- [x] API property propagation
- [x] Multi-property architecture support

Reference:
`IMPLEMENTATION_COMPLETE_TDS_BUTEAK.md`

---

# EPIC 1 — PROJECT FOUNDATION

## Repository Preparation

- [ ] Create `/docs/booking-auth-migration/` in `Vibehouse_frontend`
- [ ] Create `/docs/booking-auth-migration/` in `buteak_website`
- [ ] Add migration tracker to both repos
- [ ] Commit docs before implementation
- [ ] Open both repos side-by-side
- [ ] Configure Codex workflow
- [ ] Configure Figma workspace

---

## Required Documentation Structure

Create:

- [ ] `MASTERPLAN.md`
- [ ] `AUTH_ARCHITECTURE.md`
- [ ] `BOOKING_ARCHITECTURE.md`
- [ ] `AUTH_FLOW_MAP.md`
- [ ] `BOOKING_FLOW_MAP.md`
- [ ] `SESSION_LIFECYCLE.md`
- [ ] `BOOKING_STATE_MACHINE.md`
- [ ] `API_PATTERNS.md`
- [ ] `MIGRATION_RULES.md`
- [ ] `IMPLEMENTATION_LOG.md`

---

# EPIC 2 — REPO INTELLIGENCE GENERATION

## Vibehouse_frontend Intelligence

- [ ] Generate codebase architecture overview
- [ ] Generate auth system overview
- [ ] Generate booking system overview
- [ ] Generate route architecture map
- [ ] Generate state management overview
- [ ] Generate API interaction overview
- [ ] Generate persistence lifecycle overview
- [ ] Generate reusable business logic map

---

## buteak_website Intelligence

- [ ] Generate current architecture overview
- [ ] Generate existing route structure map
- [ ] Generate current state management overview
- [ ] Generate current auth handling audit
- [ ] Generate current API layer audit
- [ ] Generate reusable infrastructure audit
- [ ] Generate migration compatibility audit

---

# EPIC 3 — AUTH SYSTEM AUDIT (SOURCE)

## Authentication Flow Analysis

- [ ] Identify login entry points
- [ ] Identify signup flow
- [ ] Identify OTP/password handling
- [ ] Identify token lifecycle
- [ ] Identify refresh handling
- [ ] Identify auth persistence
- [ ] Identify session hydration timing
- [ ] Identify logout lifecycle
- [ ] Identify redirect restoration
- [ ] Identify protected route logic
- [ ] Identify guest-only route logic
- [ ] Identify auth loading states
- [ ] Identify auth error handling

---

## Auth Architecture Documentation

- [ ] Create auth flow diagrams
- [ ] Create auth lifecycle map
- [ ] Create redirect flow map
- [ ] Create token lifecycle documentation
- [ ] Create auth state dependency map
- [ ] Create auth risk analysis

---

# EPIC 4 — BOOKING SYSTEM AUDIT (SOURCE)

## Booking Lifecycle Analysis

- [ ] Identify booking entry points
- [ ] Identify room/property selection flow
- [ ] Identify booking draft lifecycle
- [ ] Identify booking persistence logic
- [ ] Identify checkout sequencing
- [ ] Identify payment orchestration
- [ ] Identify booking hydration
- [ ] Identify optimistic update behavior
- [ ] Identify booking recovery handling
- [ ] Identify booking confirmation flow
- [ ] Identify booking loading states
- [ ] Identify booking error states

---

## Booking Architecture Documentation

- [ ] Create booking lifecycle diagrams
- [ ] Create booking state machine
- [ ] Create checkout orchestration map
- [ ] Create persistence lifecycle documentation
- [ ] Create booking API dependency map
- [ ] Create booking failure-state map

---

# EPIC 5 — TARGET ARCHITECTURE PLANNING

## Buteak Integration Planning

- [ ] Map reusable auth infrastructure
- [ ] Map reusable booking infrastructure
- [ ] Identify required new stores/hooks
- [ ] Identify required route guards
- [ ] Identify required API wrappers
- [ ] Identify hydration strategy
- [ ] Identify persistence strategy
- [ ] Identify migration edge cases

---

## Required Reusable Systems

### Auth

- [ ] `useAuth`
- [ ] `useSessionHydration`
- [ ] `ProtectedRoute`
- [ ] `GuestOnlyRoute`
- [ ] `AuthProvider`
- [ ] `AuthPersistence`

### Booking

- [ ] `useBookingDraft`
- [ ] `useCheckoutFlow`
- [ ] `BookingStateMachine`
- [ ] `BookingPersistence`
- [ ] `CheckoutOrchestrator`
- [ ] `BookingRecovery`

---

# EPIC 6 — FIGMA FLOW MAPPING

## Workspace Setup

- [ ] Create `/flow-auth`
- [ ] Create `/flow-booking`
- [ ] Create `/flow-checkout`
- [ ] Create `/flow-payment`

---

## Rules

- [ ] Use grayscale wireframes only
- [ ] No typography exploration
- [ ] No color exploration
- [ ] No component styling
- [ ] Focus ONLY on UX sequencing
- [ ] Focus ONLY on state transitions

---

## Auth Flow Mapping

- [ ] Login sequence
- [ ] Signup sequence
- [ ] OTP verification flow
- [ ] Session restoration flow
- [ ] Redirect restoration flow
- [ ] Auth loading UX
- [ ] Auth error UX

---

## Booking Flow Mapping

- [ ] Room selection sequence
- [ ] Booking draft lifecycle
- [ ] Checkout sequence
- [ ] Payment sequence
- [ ] Booking confirmation flow
- [ ] Recovery flow
- [ ] Failure-state flow

---

# EPIC 7 — AUTH INFRASTRUCTURE REBUILD

## Core Auth System

- [ ] Implement auth store
- [ ] Implement auth provider
- [ ] Implement auth persistence
- [ ] Implement session hydration
- [ ] Implement token lifecycle
- [ ] Implement refresh handling
- [ ] Implement login orchestration
- [ ] Implement logout orchestration

---

## Route Protection

- [ ] Implement protected routes
- [ ] Implement guest-only routes
- [ ] Implement redirect restoration
- [ ] Implement auth guards
- [ ] Implement auth hydration guards

---

## Auth UX

- [ ] Implement auth loading states
- [ ] Implement auth error handling
- [ ] Implement expired-session handling
- [ ] Implement unauthorized-state handling

---

# EPIC 8 — BOOKING INFRASTRUCTURE REBUILD

## Core Booking System

- [ ] Implement booking store
- [ ] Implement booking state machine
- [ ] Implement booking persistence
- [ ] Implement booking hydration
- [ ] Implement booking recovery
- [ ] Implement checkout orchestration
- [ ] Implement optimistic updates

---

## Checkout System

- [ ] Implement checkout lifecycle
- [ ] Implement booking validation
- [ ] Implement payment orchestration
- [ ] Implement booking confirmation handling
- [ ] Implement checkout loading states
- [ ] Implement checkout error handling
- [ ] Integrate Razorpay checkout
- [ ] Implement Razorpay payment initiation
- [ ] Implement Razorpay success handling
- [ ] Implement Razorpay failure/cancel handling
- [ ] Verify booking confirmation after Razorpay payment

---

## Booking UX

- [ ] Implement recovery UX
- [ ] Implement retry handling
- [ ] Implement failure-state handling
- [ ] Implement persistence recovery UX

---

## External Booking Handoff Removal

- [ ] Identify all LiveIPMS / external booking URLs in Buteak
- [ ] Remove external booking redirects from Book Now buttons
- [ ] Replace Book Now actions with internal booking flow entry points
- [ ] Ensure room/property context is passed into internal booking flow
- [ ] Verify no LiveIPMS links remain in production booking paths

# EPIC 9 — BOUTEAK UI INTEGRATION

## Design Preservation Rules

- [ ] Preserve Buteak typography
- [ ] Preserve Buteak spacing
- [ ] Preserve Buteak layout rhythm
- [ ] Preserve Buteak visual hierarchy
- [ ] Preserve Buteak component styling
- [ ] Preserve Buteak branding

---

## UX Adaptation Rules

- [ ] Preserve UX semantics
- [ ] Preserve flow sequencing
- [ ] Preserve loading semantics
- [ ] Preserve recovery patterns
- [ ] Preserve transition logic

---

## Anti-Validation

- [ ] Ensure no TDS spacing patterns leaked
- [ ] Ensure no TDS visual hierarchy leaked
- [ ] Ensure no TDS component structures leaked
- [ ] Ensure no TDS visual rhythm leaked

---

# EPIC 10 — TESTING & VALIDATION

## Auth Testing

- [ ] Test login flow
- [ ] Test signup flow
- [ ] Test persistence
- [ ] Test refresh lifecycle
- [ ] Test protected routes
- [ ] Test logout flow
- [ ] Test redirect restoration
- [ ] Test expired sessions

---

## Booking Testing

- [ ] Test booking creation
- [ ] Test booking persistence
- [ ] Test checkout lifecycle
- [ ] Test payment orchestration
- [ ] Test recovery flow
- [ ] Test optimistic updates
- [ ] Test failure states
- [ ] Test confirmation flow

---

## Multi-Property Testing

- [ ] Test TDS property resolution
- [ ] Test Buteak property resolution
- [ ] Test property-aware booking flow
- [ ] Test property-aware auth flow
- [ ] Test invalid property handling

---

## UX Testing

- [ ] Validate flow smoothness
- [ ] Validate loading feedback
- [ ] Validate mobile responsiveness
- [ ] Validate edge cases
- [ ] Validate hydration timing

---

# EPIC 11 — PERFORMANCE & CLEANUP

## Optimization

- [ ] Optimize hydration timing
- [ ] Optimize booking persistence
- [ ] Optimize route transitions
- [ ] Optimize API interactions
- [ ] Optimize store subscriptions

---

## Cleanup

- [ ] Remove temporary migration code
- [ ] Remove debug logging
- [ ] Remove experimental utilities
- [ ] Finalize architecture documentation
- [ ] Finalize migration documentation

---

# EPIC 12 — FINAL REVIEW

## Architecture Validation

- [ ] Architecture remains scalable
- [ ] Architecture remains maintainable
- [ ] Multi-property support remains stable
- [ ] No hardcoded property defaults exist
- [ ] Shared backend compatibility maintained

---

## Product Validation

- [ ] Auth flow production-ready
- [ ] Booking flow production-ready
- [ ] Buteak branding preserved
- [ ] UX flow quality improved
- [ ] Migration objectives achieved

---

# FINAL SUCCESS CRITERIA

- [ ] Buteak still feels fully native
- [ ] Auth behaves production-grade
- [ ] Booking flow behaves production-grade
- [ ] Multi-property architecture remains intact
- [ ] No visual contamination from TDS exists
- [ ] Shared platform architecture established
- [ ] Documentation finalized
- [ ] Migration complete