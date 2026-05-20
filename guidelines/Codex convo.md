

Normalize Figma structure before Loc
No tasks in progress


Good — you actually have a **very powerful stack** already:

* Figma (Design + Dev Mode)
* Locofy (Design → Code bridge)
* Next.js (Frontend system)
* Animated UI (custom layer)

But if you just “export screens”, you will **kill scalability + break your system architecture**.

So let’s do this properly — **production-grade frontend pipeline**, not hobby workflow.

---

# 🚨 First Reality Check (Important)

Locofy is **NOT your frontend system**.

It is:

> 👉 A **code accelerator for static UI scaffolding**

If you rely on it blindly:

* ❌ You’ll get messy JSX
* ❌ No component system
* ❌ No state architecture
* ❌ No mapping to your backend flows (Bookings, Tasks, SLA)

---

# ✅ Correct Architecture (Your Stack)

Figma (Design Source)
   ↓
Locofy (UI extraction layer)
   ↓
Next.js (REAL frontend system)
   ↓
API Layer (your backend services)


---

# 🧠 Your Goal

Convert Figma → **Reusable Component System**, NOT screens.

---

# 🔥 Step-by-Step: PROPER Workflow

---

# 1️⃣ Fix Figma Before Locofy (CRITICAL)

Right now you said:

> “I copied frames (desktop + mobile)”

That’s dangerous.

You must **normalize Figma first**.

---

## ✅ Your Figma Must Look Like This

Instead of random frames:

/components
   /RoomCard
   /BunkCard
   /AddOnCard
   /BookingWidget

/screens
   /Home
   /RoomAvailability
   /BunkSelection
   /Dashboard


👉 This aligns directly with your system like in your UI spec 

---

## 🔴 If You Skip This

Locofy will:

* Generate duplicate components
* Break responsiveness
* Create unmaintainable code

---

# 2️⃣ Prepare for Locofy (Design → Code Mapping)

Inside Figma:

### Tag elements properly using Locofy plugin:

| UI Element | Tag             |
| ---------- | --------------- |
| Button     | button          |
| Input      | input           |
| Card       | div → component |
| Image      | img             |
| List/Grid  | repeat/grid     |

---

### Map interactions:

* Click → navigation
* Click → modal open
* Hover → animation

---

# 3️⃣ Use Locofy Smartly (NOT blindly)

---

## What to Export via Locofy

ONLY export:

* UI sections
* Components
* Layouts

NOT:

* Full pages with logic
* Auth flows
* Booking flows

---

## Ideal Export Strategy

Export:

RoomCard
BunkCard
EventCard
Navbar
Footer
BookingWidget


---

## ❌ Never Export:

* Entire dashboard
* Entire booking flow
* Multi-step forms

Because:

👉 These need state + API integration

---

# 4️⃣ Next.js Architecture (Your REAL System)

Now this is where your system becomes powerful.

---

## Suggested Folder Structure

/app
   / (public)
      page.tsx (homepage)
      /rooms
      /events

   /dashboard
      /pre-arrival
      /stay
      /services

/components
   /ui (buttons, inputs)
   /cards (RoomCard, BunkCard)
   /booking
   /dashboard

/lib
   api.ts
   constants.ts

/services
   booking.service.ts
   payment.service.ts
   task.service.ts


---

## Why This Matters

Because your backend is:

* transactional
* SLA-driven
* inventory-aware

UI must map to that.

---

# 5️⃣ Map UI → Backend Flows (CRITICAL)

This is where most people fail.

---

## Example: Add-On Purchase Flow

From your system: 

BEGIN
Payment
Folio Entry
Inventory Deduction
Task Creation
SLA Start
COMMIT


---

## Your UI MUST follow this:

### ❌ Wrong

Click → show success

---

### ✅ Correct

Click Buy
→ Call /create-order
→ Open Razorpay
→ Wait webhook
→ Poll /status
→ THEN show success


---

# 6️⃣ Animation Strategy (VERY IMPORTANT)

You said you have animated elements.

---

## DO NOT export animations from Locofy

Instead:

### Use:

* Framer Motion (recommended)
* CSS transitions (lightweight)

---

## Where to use animations:

| Component        | Animation    |
| ---------------- | ------------ |
| Cards            | hover tilt   |
| Modals           | scale + fade |
| Page transitions | slide        |
| Stickers         | floating     |

Matches your design system 

---

# 7️⃣ Responsiveness Strategy

Since you have:

* Desktop + Mobile frames

---

## In Locofy:

* Enable Auto Layout mapping
* Use Flex/Grid
* Avoid absolute positioning

---

## In Next.js:

Convert to Tailwind:

grid grid-cols-1 md:grid-cols-3


---

# 8️⃣ Biggest Risks (YOU MUST HANDLE)

---

## ⚠️ 1. Duplicate Components

Fix:

* One source of truth
* Reuse components

---

## ⚠️ 2. Hardcoded Data

Locofy exports static data.

You MUST replace with:

props / API data


---

## ⚠️ 3. Booking Race Conditions

UI must:

* disable button after click
* show loading state
* retry-safe

---

## ⚠️ 4. Inventory Mismatch

Never trust UI state.

Always:

Backend validates availability


---

## ⚠️ 5. PMS Delay (eZee)

UI must show:

"Booking confirmed. Finalizing details..."


Because sync is async.

---

# 9️⃣ Ideal Development Order (Aligned with System)

From your architecture:

1. Auth (OTP)
2. Booking Flow
3. Payment Integration
4. Pre-arrival Dashboard
5. Service Requests
6. Add-on Orders
7. Extension Flow

(Exactly matches your MVP plan )

---

# 🔟 Pro Workflow Summary (What YOU should do)

---

## Step 1

Clean Figma → components + structure

---

## Step 2

Use Locofy ONLY for:

* UI components
* layout scaffolding

---

## Step 3

Build logic in Next.js:

* state
* API calls
* flows

---

## Step 4

Add animations manually (Framer Motion)

---

## Step 5

Connect to backend (transaction-safe)

---

# 💡 Advanced Tip (Huge Upgrade)

Use Locofy like this:

Locofy → Storybook → Next.js


So:

* Components are isolated
* Reusable
* Testable

---

# 🚀 If you want next (high value)

I can give you:

### 👉 Exact Next.js codebase starter

* folder structure
* API hooks
* booking flow skeleton
* payment integration pattern
* SLA-safe UI states

OR

### 👉 Locofy “perfect tagging system”

So your export is **10x cleaner**


Perfect. This is exactly the **right order**.

If you fix Figma properly now → your **entire frontend + backend integration becomes 10x easier** later.

Right now, think of Figma as:

> 🧠 **Your frontend schema (like DB schema for UI)**

If this is messy → everything downstream (Locofy, Next.js, state, APIs) breaks.

---

# 🎯 Goal: Turn Your Figma into a SYSTEM (not screens)

We’ll do this in **5 layers**:

text
1. File Structure
2. Component System
3. Design Tokens
4. Auto Layout + Responsiveness
5. Interaction Mapping (preparing for Locofy)


---

# 1️⃣ FIGMA FILE STRUCTURE (MANDATORY)

Right now you said:

> “I copied desktop + mobile frames”

We need to restructure.

---

## ✅ Final Figma Structure

text
📁 The Daily Social Design System

01 Foundations
   - Colors
   - Typography
   - Spacing
   - Effects

02 Components
   - Buttons
   - Inputs
   - Cards
   - Navigation
   - Modals

03 Patterns (Composite UI)
   - Booking Widget
   - Room Grid
   - Bunk Layout
   - Add-on Cart
   - Step Flow

04 Screens
   - Marketing (Website)
   - Booking Flow
   - Pre-Arrival
   - Guest Dashboard

05 Experiments (optional)


---

## 🔴 Rule

👉 **No raw UI directly inside Screens**

Everything must come from:

text
Component → Pattern → Screen


---

# 2️⃣ COMPONENT SYSTEM (THIS IS THE BIG ONE)

This will decide if your codebase survives or dies.

---

## 🎯 Your Core Components (based on your product)

From your system design + flows 

---

### 🧩 UI Components (Atomic)

text
Button
InputField
Dropdown
Checkbox
Radio
Badge
Toast


---

### 🧩 Business Components (CRITICAL)

These map to your backend entities.

text
RoomCard
BunkCard
AddOnCard
BookingCard
EventCard
ServiceRequestCard
TaskCard (staff)


---

### 🧩 Layout Components

text
Navbar
BottomNav (mobile)
Sidebar (staff)
SectionWrapper
Grid
Modal
Drawer


---

## 🔥 Component Rules

### 1. Every component must have variants

Example:

text
Button
- Primary
- Secondary
- Ghost
- Danger


---

### 2. Every component must have states

text
Default
Hover
Active
Disabled
Loading (IMPORTANT)


---

### 3. Every component must be reusable

❌ BAD:

“RoomCard - Koramangala”

✅ GOOD:

“RoomCard”

---

# 3️⃣ DESIGN TOKENS (STRICT SYSTEM)

From your design doc  + UI spec 

---

## 🎨 Colors (convert to tokens)

text
color.bg.primary = #111111
color.bg.secondary = #F7F3E9

color.brand.pink = #FF2E63
color.brand.blue = #1B9CFC
color.brand.green = #00D084
color.brand.yellow = #FFD166


---

## 🔤 Typography

text
text.display = Anton / Bebas
text.heading = Inter Bold
text.body = Inter Regular
text.handwritten = Caveat


---

## 📏 Spacing

text
spacing.xs = 4
spacing.sm = 8
spacing.md = 16
spacing.lg = 24
spacing.xl = 32
spacing.xxl = 48


---

## 🔲 Radius

text
radius.sm = 8
radius.md = 14
radius.lg = 20
radius.xl = 28


---

## 🔴 Why this matters

Later in Next.js:

ts
className="bg-primary text-brand-pink p-lg rounded-md"


---

# 4️⃣ AUTO LAYOUT + RESPONSIVENESS (NON-NEGOTIABLE)

---

## ❌ What you likely have right now

* Absolute positioning
* Fixed widths
* Broken scaling

---

## ✅ What you need

### Use Auto Layout EVERYWHERE

text
Direction: Vertical / Horizontal
Spacing: token-based
Padding: token-based


---

## Grid System

text
Desktop: 12 columns
Tablet: 6 columns
Mobile: 4 columns


---

## Example: Room Grid

text
Desktop → 3 columns
Tablet → 2 columns
Mobile → 1 column


---

## 🔥 Critical Rule

👉 If it doesn’t resize properly in Figma → it will break in code.

---

# 5️⃣ PATTERNS (CONNECTING UI TO PRODUCT FLOWS)

This is where you align with your **backend architecture**.

---

## 🎯 Create these patterns:

---

### 🧩 Booking Widget

text
Location
Dates
Guests
CTA


---

### 🧩 Bunk Selection Layout

text
Grid of beds
Selected state
Unavailable state
Upgrade badge


---

### 🧩 Add-on Cart

text
Item list
Quantity
Price
CTA


---

### 🧩 Step Flow (VERY IMPORTANT)

Used in:

* Pre-arrival
* KYC
* Booking

text
StepProgressBar
Step Content
CTA


---

# 6️⃣ SCREEN RESTRUCTURE (CLEAN THIS)

Now rebuild screens using components.

---

## Example: Home Screen

text
Hero
BookingWidget
RoomSection (RoomCard)
EventsSection (EventCard)
Gallery
CTA


---

## Example: Dashboard

text
Header
BookingSummary
ActionCards
ServiceRequests
Orders


---

# 7️⃣ NAMING CONVENTION (CRITICAL FOR DEV MODE)

---

## Use this format:

text
ComponentName/Variant/State


Example:

text
Button/Primary/Default
Button/Primary/Loading
RoomCard/Compact
RoomCard/Expanded


---

# 8️⃣ PREP FOR LOCOfy (VERY IMPORTANT)

Once Figma is clean:

---

## Tag elements:

| Element | Tag    |
| ------- | ------ |
| Button  | button |
| Input   | input  |
| Card    | div    |
| Image   | img    |

---

## Add interactions:

* On click → navigate
* On click → open modal

---

# 🚨 COMMON MISTAKES TO FIX NOW

---

## ❌ Mistake 1: Designing pretty screens

👉 You are building a **system**, not Dribbble shots.

---

## ❌ Mistake 2: No loading states

Your system has:

* payments
* inventory
* PMS sync

👉 Every action needs loading + pending state

---

## ❌ Mistake 3: No empty states

Example:

text
"No orders yet"
"No events today"


---

## ❌ Mistake 4: Ignoring edge cases

From your system:

* partial check-in
* inventory out of stock
* payment failure

👉 Design UI for these.

---

# 🧠 What I need from YOU now

To refine this perfectly for your exact Figma:

---

### 1️⃣ How many screens have you made?

List them.

---

### 2️⃣ Did you use Auto Layout everywhere?

Yes / No / Partial

---

### 3️⃣ Did you create components already?

If yes:

* which ones?

---

### 4️⃣ Show structure (rough)

Example:

text
Home
Room Availability
Bunk Selection
Dashboard


---

### 5️⃣ Any animations already designed?

---

# 🚀 Next Step After This


* audit your structure
* fix your component system
* give exact Figma restructuring plan (step-by-step)
* then move to **Locofy → Next.js pipeline**



How many screens have you made?
Desktop: Home, Rooms, Events, About, TnC, Refund Policy, Privacy Policy, Guest Policy

Mobile: Home, Rooms, Events, About, TnC, Refund Policy, Privacy Policy, Guest Policy, Navigation Menu. 


Did you use Auto Layout everywhere?
I dont know, I'll give you code for you to see and read. 

Did you create components already?
Dont know, get it from the code. 

Show structure ->
Global Elements:
Header Nav: Logo, Menu/Nav Links (Rooms, Events, About, Contact).
Global Booking Widget: Check-in/Check-out date pickers + "Book Now" CTA (queries Redis availability cache).
User Profile Icon: Dropdown containing -> My Profile, My Bookings, Logout (Visible post-OTP Auth).
Footer: Address, Google Maps link, Contact details, Social links, T&C, Privacy Policy, Cancellation Policy.

Home Page:
Section Order:
Hero: Property carousel + Tagline ("Stay. Mix. Repeat.") + Primary Booking Widget (Check-in -> Check-out and “Book Now” button). 
Note: A date picker component for selecting a range of dates.


Trust & Assurances Grid / Why Vibehouse: "Stay With Confidence" (Icons/Cards for Clean Rooms, Safe & Secure, AC Dorms, 24/7 Reception & Power, Secure Lockers, 7-Day Cancel).
Amenities Carousel: Fast Wi-Fi, Hot Showers, Co-working, Laundry, etc. 
Rooms Overview: High-level cards (4-Bed Mixed, 4-Bed Female, Private) with starting prices. (Use the room cards same as we have on /rooms page)
Tonight at The Daily Social: Dynamic event preview cards (Queries Document DB for upcoming 48 hours).
The Daily Social Experience: text/images (focusing on community and safety).
Guest energy - social media redirect
Social Proof: Guest reviews/testimonials, The Energy
Final CTA: Secondary Booking Widget.

Page: Property PLP
Purpose: Detail inventory types and drive users to select a room category. (System Note: Enforces SQL-backed availability limits; no bed-level selection permitted here).
Section Order:
Rooms Hero: High-quality imagery and intro text.
Room Categories Grid: 
 4-Bed Mixed Dorm (Features, Images, Base Price, "Check Dates" CTA)
4-Bed Female Dorm (Features, Images, Base Price, "Check Dates" CTA)
Private Room (Features, Images, Base Price, "Check Dates" CTA)
Included Assurances: Reiterating AC, Lockers, Fresh Linen, Daily Housekeeping, etc.
House Rules: Quiet hours, locker usage, respect policies.
Contact, FAQ


Page: Rooms Popup
Purpose: detailed room pics and list of room amenities
Rooms Hero: High-quality imagery and intro text.

Page: Events
Purpose: Highlight the core differentiator (the evening vibe/social experience).
Section Order:
Events Hero: "Never a dull evening."
Upcoming Events Calendar: List of this week's events (DJ nights, Pub Crawls) with RSVP/Book CTA.
Standard Weekly Lineup: Monday to Sunday recurring schedule.
Past Events Gallery: Masonry image grid of guests having fun.
Page: About (Property)
Purpose: Standard trust-building and SEO pages.
Section Order (Standardized): Hero -> Main Content/Grid/Accordion -> Booking CTA -> Footer.

Page: Payment related Pages
Policies
Guest policies
Privacy policies
Refund policy
Terms & conditions


Any animations already designed?
get it from the code.


Also, my codebase is in vite. i want it in next.js.


5 previous messages
I’ve got enough repo truth to stop guessing. The current app is a Vite + React Router marketing site with five live pages, repeated nav/footer blocks, hardcoded content/data, Figma-specific asset imports, and lightweight custom motion via carousels, hover transforms, pulses, and CSS effects rather than a real animation system.


Plan


Open

Next.js App Router Migration for The Daily Social Marketing + Booking Shell
Summary
Migrate the current Vite marketing site to Next.js App Router as a production-grade frontend foundation, preserving launch-parity for the existing public pages while restructuring the UI into reusable sections, shared layout primitives, and CMS-ready content modules. Include an API-ready booking widget shell with explicit idle/loading/success/error states, but do not implement real auth, profile, dashboard, or backend integrations in this phase.

Implementation Changes
Replace the Vite entry/router setup in src/main.tsx and src/app/routes.ts with Next App Router:
/ home
/rooms
/events
/about
/policies/[type] for guest, privacy, refund, terms
not-found page instead of redirecting unknown routes to home
Create a shared marketing route group with one root layout:
global nav
global footer
global metadata, favicon/logo wiring, fonts, and theme tokens
shared container/section helpers for consistent spacing and responsiveness
Refactor current page JSX into reusable marketing components instead of page-local duplication:
HeroSection
BookingWidget
RoomCard
EventCard
PolicyTableOfContents
TrustGrid / AmenityPills / ReviewCard / CTASection
Move all current hardcoded arrays and copy out of page files into typed content modules:
page content objects
room/event/review/policy datasets
legal policy registry keyed by slug
section-level interfaces so a CMS can replace these modules later without changing component code
Replace Figma-specific or Vite-only assumptions:
remove figma:asset/... imports from src/app/components/Navigation.tsx
move static images/logo into Next-supported assets
replace <img> usage with Next-safe image handling where practical, keeping a fallback wrapper for remote failures
Normalize styling into a design-system-friendly token layer:
preserve existing visual direction
convert repeated magic values into semantic classes/tokens for brand colors, spacing, radii, shadows, and typography
keep the existing playful card rotations/hover feel, but centralize them behind reusable component variants
Introduce a booking shell contract, not real booking:
date range input API
submit handler contract
disabled/loading/pending/error/success states
placeholder async action boundary for future Redis availability lookup and checkout flow
copy for async states like “Checking availability...” and “Booking confirmed. Finalizing details...”
Keep the current lightweight animation style, but formalize it:
preserve hero carousel and hover transforms
define motion rules for hover, CTA, cards, and section reveal
avoid exporting animation behavior from design tooling; implement motion directly in React/CSS-compatible patterns
Public Interfaces / Types
BookingWidgetProps
optional initial dates
submit callback
state enum/status
error message
variant for hero/footer/inline usage
RoomCardProps
title, startingPrice, occupancy, image, badge, features, ctaHref
EventCardProps
title, date, time, location, image, badge, price, capacity, ctaHref
PolicyPageContent
title
lastUpdated
sections[]
MarketingNavItem
label, href, active matching rules
Test Plan
Verify route parity for all public pages and each policy slug.
Verify shared nav/footer render once through layout and active nav state is correct.
Verify booking widget states:
empty
partial input
submitting
disabled during request
error
success/pending-finalization
Verify responsive behavior for home, rooms, events, about, and policy pages at mobile and desktop breakpoints.
Verify policy deep-link scrolling and table-of-contents behavior still work after migration.
Verify logo/images/fonts load correctly without figma: imports or broken remote image behavior.
Verify no user-facing mojibake remains for currency, copyright, or icon-like text.
Run build/type-check and confirm no React Router or Vite runtime dependency remains in the migrated app.
Assumptions
Chosen target is Next.js App Router.
Chosen scope is “marketing + booking shell”; auth/profile/dashboard/menu beyond public navigation are out of scope for this phase.
Current marketing content should be restructured into CMS-ready typed modules now rather than kept inline.
Visual parity should be maintained where possible, but duplicated markup will be consolidated even if some file structure changes significantly.
Existing generated/imported Figma artifacts outside the public marketing flow are not part of the first migration unless needed for shared assets or styles.
Expand plan
1

I read that as “switch the scope to option 1,” meaning marketing-first only. I’m locking that in and checking whether the rest of the plan should stay as-is or tighten around a pure public-site migration with no booking shell.


Plan


Open

Next.js App Router Migration for The Daily Social Marketing Site
Summary
Migrate the current Vite app to Next.js App Router as a clean marketing-site foundation only. This phase includes the public pages, shared layout, reusable UI sections, and CMS-ready content modules. The booking widget remains interactive at the UI level with local date input behavior and validation, but it will not include async submit contracts, API integration, auth, dashboard, or backend flow logic yet.

Implementation Changes
Replace the Vite bootstrap and React Router setup in src/main.tsx and src/app/routes.ts with Next App Router routes:
/
/rooms
/events
/about
/policies/[type]
not-found
Create a shared marketing layout for all public routes:
single nav
single footer
shared metadata
shared container/section spacing
consistent mobile/desktop behavior
Refactor page-local markup into reusable components instead of duplicating sections across pages:
Navigation
Footer
BookingWidget
RoomCard
EventCard
PolicyToc
shared hero, CTA, trust, amenities, review, and legal content sections
Move all hardcoded arrays/copy out of page files into typed content/config modules:
room categories
event listings and weekly lineup
testimonials
policy content by slug
nav/footer links
Replace Vite/Figma-only dependencies and assumptions:
remove figma:asset/... imports from src/app/components/Navigation.tsx
move logo/static assets to Next-supported locations
replace router Link usage with Next navigation
preserve or adapt the image fallback helper from src/app/components/figma/ImageWithFallback.tsx for Next-compatible image rendering
Normalize the current visual system into reusable tokens/utilities:
preserve current palette, type feel, shadows, border treatment, and playful rotations
convert repeated values into semantic tokens/classes
remove repeated page-specific class soup where a shared primitive is more appropriate
Keep the booking widget as an interactive marketing component only:
local check-in/check-out state
basic required-field validation
no submit side effects
CTA can remain disabled until valid or route users to /rooms, but must not imply real availability checking
Preserve the current lightweight animation style without introducing a full motion layer:
carousel behavior where already used
hover transforms, scale, pulse, and transitions
no exported design-tool animation dependency
Public Interfaces / Types
BookingWidgetProps
variant (hero, cta, inline)
optional initial values
optional destination href
optional submit label
RoomCardProps
title, price, occupancy, image, badge, features, href
EventCardProps
title, date, time, location, price, image, badge, capacity, href
PolicyPageContent
title, lastUpdated, sections
NavItem
label, href
Test Plan
Verify route parity for all current public pages and all policy slugs.
Verify shared nav/footer render through layout and active state works correctly.
Verify booking widget local interactions:
empty state
valid date entry
invalid or incomplete date handling
CTA behavior after valid input
Verify responsive layouts for home, rooms, events, about, and policy pages.
Verify policy TOC and anchor navigation behavior.
Verify static assets, remote images, and fonts load correctly in Next.
Verify broken text encoding is fixed for currency, copyright, and symbol text.
Run build/type-check and confirm no Vite bootstrap or React Router dependency remains in the migrated runtime.
Assumptions
Scope is marketing-first only.
Next.js App Router remains the target architecture.
Current content should be preserved for parity, but moved into CMS-ready typed modules now.
Booking UI in this phase is interactive-only and must not suggest real backend availability or payment behavior.
Auth, profile menu, guest dashboard, and backend-connected product flows are intentionally deferred to a later phase.
Expand plan
Implement plan


10 previous messages
Implemented the Next.js App Router migration and verified it with a successful production build. The new public-site foundation lives in app/layout.tsx, app/page.tsx, app/rooms/page.tsx, app/events/page.tsx, app/about/page.tsx, and app/policies/[type]/page.tsx. Shared marketing primitives now sit in components/marketing, with the interactive date-only booking widget in components/marketing/booking-widget.tsx and the centralized content layer in content.

I also replaced the Vite runtime setup with Next config and TS setup in package.json, next.config.mjs, tsconfig.json, postcss.config.mjs, and app/globals.css. The old boot files were removed, the logo was moved to public/logo.png, and the repo now ignores build/install output via .gitignore.

Verification: npm run build passed on March 18, 2026 and generated the expected static routes for /, /rooms, /events, /about, and /policies/[type].

One residual note: legacy Figma export files under src/imports and some old unused src/app files still exist in the repo as non-runtime leftovers, but the new Next build excludes them. If you want, I can do a follow-up cleanup pass focused purely on removing that archival code safely.


follow-up cleanup. Animations should be there. if any missing packages them npm install them. 

Use shadcn, Motion for react, Reactbits etc. 

make the components and section modular and reuasable. if i need to reorder the sections then it would be easier


6 previous messages
Refactored the marketing app into a more modular, animation-ready system and re-verified the Next build.

The biggest change is that the homepage is no longer a long inline page file. It now renders from a section registry in components/marketing/home-sections.tsx, with the order controlled by content/home.ts. If you want to reorder the home page, you can just change homeSectionOrder there.

I also added a reusable primitive layer:
components/ui/button.tsx,
components/ui/card.tsx,
components/ui/accordion.tsx,
and a shared motion layer in components/shared/motion.tsx. Those are now used across cards, FAQs, section headings, and page content so the animation behavior is consistent instead of scattered.

The public pages were updated to consume those modular pieces:
app/page.tsx,
app/rooms/page.tsx,
app/events/page.tsx,
app/about/page.tsx,
and app/policies/[type]/page.tsx.

Package check: motion and the Radix/shadcn dependencies were already installed, so no extra runtime package was needed for this pass. I also checked reactbits, but it is not available as an npm package in this environment, so I implemented the same outcome with reusable motion primitives instead.

Verification: npm run build passed successfully on March 18, 2026.

One useful next step would be extending the same section-order pattern from home to rooms/events/about too, so every public page can be reordered from content config the same way.
