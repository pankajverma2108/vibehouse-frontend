# BUTEAK FLOW MIGRATION MASTERPLAN

## Objective

Migrate and adapt the mature authentication, booking, and guest experience architecture from `Vibehouse_frontend` (thedailysocial.co.in) into `buteak_website` (buteak.in) WITHOUT transferring the visual identity, branding language, or design system.

This is NOT a UI cloning process.

This is a SYSTEM + UX ARCHITECTURE migration.

The final product must:

* feel visually native to Buteak
* preserve Buteak typography and branding
* preserve Buteak layouts and aesthetic direction
* reuse only behavioral and architectural patterns

---

# Repositories

## Source Repository

Project:
`Vibehouse_frontend`

Production:
`thedailysocial.co.in`

Purpose:
Contains mature:

* auth flow
* booking flow
* guest dashboard flow
* protected routing
* session handling
* UX sequencing

This repository acts as:

* behavioral reference
* architectural reference
* flow reference

It is NOT a design reference.

---

## Target Repository

Project:
`buteak_website`

Production:
`buteak.in`

Purpose:
Primary product receiving:

* auth architecture
* booking architecture
* guest flow architecture

Must preserve:

* typography
* spacing
* colors
* visual density
* motion language
* component system
* brand identity

---

# Core Migration Philosophy

## Transferable

The following ARE allowed to migrate:

* auth logic
* route architecture
* protected layouts
* booking lifecycle logic
* session persistence
* API integration patterns
* UX sequencing
* loading/error states
* business logic
* hooks
* store structure
* state machines
* optimistic updates
* guest access strategy

---

## Non-Transferable

The following MUST NOT migrate:

* colors
* typography
* gradients
* spacing systems
* shadows
* border radius
* animations
* card styling
* iconography
* component appearance
* visual hierarchy styles
* branding language

---

# Primary Goal

Rebuild the USER EXPERIENCE FLOW of Daily Social using the VISUAL LANGUAGE of Buteak.

The result should feel like:

* a native Buteak product
* not a cloned application
* not a themed port

---

# Engineering Principles

## Principle 1 — Architecture First

Do NOT start with screens.

Start with:

1. routing
2. auth state
3. booking state
4. persistence
5. guards
6. API architecture

UI comes later.

---

## Principle 2 — Rebuild, Don’t Copy

Never directly copy:

* JSX layouts
* CSS
* styled components
* UI components

Instead:

* extract intent
* rebuild behavior
* adapt to Buteak design system

---

## Principle 3 — Preserve UX Semantics

Maintain:

* flow order
* user expectations
* state transitions
* loading feedback
* interaction logic

while redesigning:

* layouts
* visuals
* typography
* spacing

---

# Migration Phases

# PHASE 1 — SYSTEM AUDIT

Goal:
Understand BOTH systems completely before implementation.

---

## Audit Vibehouse_frontend

Document:

### Authentication

* login flow
* signup flow
* OTP/password flow
* token lifecycle
* refresh handling
* redirects
* persistence
* logout behavior

### Booking Flow

* property selection
* booking creation
* payment
* confirmation
* guest access
* booking persistence

### Routing

* protected routes
* public routes
* nested layouts
* guest-only routes

### State Management

* stores
* contexts
* caching
* persistence

### API Layer

* interceptors
* fetch wrappers
* auth headers
* retries
* error handling

---

## Audit buteak_website

Document:

### Design System

* typography
* spacing
* visual rhythm
* cards
* buttons
* forms
* colors
* density
* animations

### Existing Architecture

* current auth handling
* route structure
* shared layouts
* state management
* APIs
* folder structure

---

# PHASE 2 — FLOW MAPPING

Create flow maps BEFORE coding.

Required flows:

* auth flow
* booking flow
* guest dashboard flow
* payment flow
* booking confirmation flow

Use:

* low fidelity wireframes
* grayscale structures
* UX-only layouts

NO final styling initially.

---

# PHASE 3 — ARCHITECTURE EXTRACTION

Extract reusable patterns from Vibehouse_frontend:

## Extractable Patterns

* route guards
* auth persistence
* session handling
* booking store logic
* API wrappers
* loading orchestration
* retry patterns
* optimistic updates

## Non-Extractable Patterns

* styled components
* CSS modules
* design tokens
* animation systems
* visual layouts

---

# PHASE 4 — REBUILD IN BUTEAK

Rebuild all flows using:

* Buteak components
* Buteak typography
* Buteak spacing
* Buteak motion language
* Buteak visual hierarchy

Never force Daily Social visuals into Buteak.

---

# Folder Strategy

Recommended documentation structure:

/docs/migration/
BUTEAK_FLOW_MIGRATION_MASTERPLAN.md
auth-flow.md
booking-flow.md
route-map.md
state-map.md
api-patterns.md
migration-risks.md
ui-adaptation-rules.md

---

# Recommended Implementation Order

DO NOT build everything simultaneously.

Correct sequence:

1. route architecture
2. auth state/store
3. auth persistence
4. protected layouts
5. booking state machine
6. guest access handling
7. API integration
8. payment orchestration
9. loading/error UX
10. UI refinement

---

# Codex Usage Rules

## NEVER ask Codex:

* “clone this UI”
* “copy this page”
* “make this exact design”

---

## ALWAYS ask Codex:

* analyze architecture
* extract reusable logic
* preserve UX semantics
* adapt behavior into existing design system

---

# Recommended Codex Prompt Pattern

Use SMALL focused prompts.

Good:

“Analyze auth route protection architecture.”

Bad:

“Rebuild my whole website.”

---

# Codex Context Prompt

Use this before large tasks:

“You are helping migrate UX architecture from one frontend application into another.

SOURCE:

* mature booking/auth product
* architecture reference only

TARGET:

* must preserve its own design system completely

Your job:

* extract architecture
* extract UX semantics
* recommend reusable abstractions
* never copy styling
* never introduce source branding”

---

# Figma Workflow

Use Figma BEFORE coding.

Required pages:

/flow-auth
/flow-booking
/flow-payment
/flow-guest

Workflow:

1. grayscale wireframes
2. structure validation
3. UX sequencing
4. apply Buteak visual language

---

# Anti-Patterns

## DO NOT:

* port entire pages directly
* copy CSS
* copy spacing systems
* merge design languages
* mix typography systems
* recreate Daily Social visuals

---

# Success Criteria

Migration is successful when:

* UX flow quality improves
* booking flow feels seamless
* auth flow feels production-grade
* Buteak branding remains intact
* users cannot tell another product inspired the architecture

---

# Final Principle

This project is:

“System architecture migration with brand-native reconstruction.”

NOT:

“UI cloning.”
