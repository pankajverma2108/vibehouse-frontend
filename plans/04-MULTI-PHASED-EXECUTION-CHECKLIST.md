# 04. Multi-Phased Execution Roadmap & Detailed Checklist

## Multi-Phase Roadmap Overview
```
+---------------------------------------------------------------------------------------+
| PHASE 1: Design Tokens, Typography & Pitch-Black Foundation                          |
| Configure Inter Display, Inter & DM Mono fonts + Nudge Quad-Color tokens in CSS       |
+-------------------------------------------+-------------------------------------------+
                                            |
+-------------------------------------------v-------------------------------------------+
| PHASE 2: Hero Section Overhaul & Booking Engine Precision                             |
| Remove Three.js AmbientCanvas; Build modern hero, booking bar & trust signals         |
+-------------------------------------------+-------------------------------------------+
                                            |
+-------------------------------------------v-------------------------------------------+
| PHASE 3: Marketing Sections Redesign (Bloom & Zostel Standards)                       |
| Rebuild Amenities, Room Cards, Events Lineup, Nomad Bento & Energy Gallery            |
+-------------------------------------------+-------------------------------------------+
                                            |
+-------------------------------------------v-------------------------------------------+
| PHASE 4: Global Shell, Navigation & Footer Alignment                                  |
| Align floating header pill, mobile menu drawer, and footer to pitch-black system      |
+-------------------------------------------+-------------------------------------------+
                                            |
+-------------------------------------------v-------------------------------------------+
| PHASE 5: Testing, Typecheck, Build & Performance Verification                         |
| Complete automated checks, zero-regression booking audit, and final handoff           |
+---------------------------------------------------------------------------------------+
```

---

## Detailed Implementation Checklist

### Phase 1: Design Tokens, Typography & Pitch-Black Foundation
- [x] **Typography Integration**:
  - [x] Configure `Inter Display` & `Inter` in `app/globals.css` / `app/layout.tsx` (or via `@import url("https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=Inter+Tight:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Inter:wght@300;400;500;600;700;800;900&display=swap")`).
  - [x] Set up CSS variables:
    - `--font-display: "Inter Tight", "Inter Display", "Inter", sans-serif`
    - `--font-body: "Inter", sans-serif`
    - `--font-mono: "DM Mono", monospace`
- [x] **Core Black & Carbon Tokens**:
  - [x] Update `app/globals.css` `:root` and `.dark` variables:
    - Set `--vh-bg` and `--background` to `#000000`.
    - Set `--vh-surface` to `#0c0c0f`.
    - Set `--card` and `--vh-panel` to `#121216`.
    - Set `--popover` to `#16161c`.
    - Set `--border` to `rgba(255, 255, 255, 0.08)`.
- [x] **Nudge Quad-Color Accent System**:
  - [x] Wire `--accent-cyan: #36c5f0` and `--accent-cyan-soft: rgba(54, 197, 240, 0.12)`.
  - [x] Wire `--accent-amber: #ecb22e` and `--accent-amber-soft: rgba(236, 178, 46, 0.12)`.
  - [x] Wire `--accent-mint: #2fbc81` and `--accent-mint-soft: rgba(47, 188, 129, 0.12)`.
  - [x] Wire `--accent-crimson: #e01e5a` and `--accent-crimson-soft: rgba(224, 30, 90, 0.14)`.
- [x] **Retire NeoBrutalist Artifacts**:
  - [x] Neutralize bulky 3px/6px solid shadows (`--vh-shadow`, `--vh-shadow-lg`).
  - [x] Replace hard `0px` radius defaults with refined micro-radii (8px / 12px / 16px / 24px).
- [x] **Root Shell Alignment**:
  - [x] Update `app/layout.tsx` `<body>` class to `bg-[#000000] text-[#F1F1F1] selection:bg-[#E01E5A] selection:text-white`.

---

### Phase 2: Hero Section Overhaul & Booking Engine Precision
- [x] **Decommission Ugly Canvas & Infinite Zoom**:
  - [x] Safely decouple and remove `AmbientCanvas` (Three.js WebGL particle cloud) from the hero.
  - [x] Disable the distracting 6000ms Ken Burns infinite zoom on carousel images.
- [x] **Modern Hero Layout Construction**:
  - [x] Create clean architectural backdrop with rich multi-layer gradient vignette (`from-black via-black/65 to-black/80`).
  - [x] Render Nudge-style live location pill: `DM Mono` font, `#2FBC81` live pulsing status dot (zero emojis).
  - [x] Render high-impact `Inter Display` headline: crisp, confident, modern typography.
  - [x] Render descriptive body subtitle in clean `Inter` with optimal line-height.
- [x] **Hospitality Trust Signals Strip**:
  - [x] Add 4 high-trust micro-badges below the booking bar (using Lucide icons, zero emojis):
    - Instant Confirmation & Best Rate Guarantee (`ShieldCheck` in `#2FBC81`)
    - 100Mbps Dedicated Fiber & Co-Work Lounge (`Wifi` in `#36C5F0`)
    - In-House Rooftop Cafe & Artisanal Brews (`Coffee` in `#ECB22E`)
    - 4.9 / 5 Rating (850+ Verified Reviews) (`Star` in `#ECB22E`)
- [x] **Booking Widget Modernization**:
  - [x] Re-skin `BookingWidget` into an obsidian precision instrument (`bg-[#121216]/95 border border-white/10 shadow-2xl rounded-2xl md:rounded-full`).
  - [x] Streamline date selector button with clear Check-in / Check-out timestamps and night counter in `DM Mono`.
  - [x] Maintain 100% parameter fidelity with `/property?checkin=...&checkout=...&property_id=...`.

---

### Phase 3: Core Homepage Marketing Sections Alignment
- [x] **Amenities / Lifestyle Pillars**:
  - [x] Refactor the 4 pillars with Nudge Quad-Color accents (Nomad Workspace - Cyan, Rooftop Cafe - Amber, Rest Pods - Mint, Biometrics - Crimson).
  - [x] Replace glassmorphic clutter with sleek obsidian card surfaces (`#121216`, hairline border, hover lift).
  - [x] Refine the complimentary perks chip bar.
- [x] **Rooms & Suites Section (Bloom & Zostel inspired)**:
  - [x] Update `RoomCard` component to feature crisp category badges (Dorm Pod vs. Balcony Suite).
  - [x] Prominently display key amenities (Ensuite Bath, Dedicated Fiber, AC, Privacy Blinds).
  - [x] Format pricing with `DM Mono` (`₹1,299 / night`) and clear booking CTA.
  - [x] Maintain room availability snapshot states (pending skeletons, empty state, loaded cards).
- [x] **Events & Weekly Lineup Section**:
  - [x] Update `EventCard` with Nudge-style monospace date badge (`DM Mono`).
  - [x] Add category tags and high-legibility title and time badges.
- [x] **Extended Nomad Living Upsell**:
  - [x] Modernize the 3 bento cards (Weekly Nomad Pass, Monthly Residency, Team Retreats).
- [x] **Vibes Unfiltered Gallery**:
  - [x] Clean up guest image grid with consistent aspect ratios and sleek hover scale.
- [x] **Social Proof & Reviews**:
  - [x] Polish review cards to feature verified guest tags, rating stars, and travel personas.
- [x] **Closing CTA Section**:
  - [x] Rebuild bottom banner with pitch-black backdrop, obsidian card, and embedded secondary date picker.

---

### Phase 4: Shell, Navigation & Footer Alignment
- [x] **Navigation Header**:
  - [x] Refine floating pill header: `bg-black/85 backdrop-blur-xl border border-white/10`.
  - [x] Update active nav links with crisp Nudge indicator dots.
  - [x] Polish the mobile slide-down menu drawer with pitch-black backdrop.
- [x] **Global Footer**:
  - [x] Align footer background to `#000000` with subtle top hairline border (`border-t border-white/[0.08]`).
  - [x] Update typography, copyright notices, and social links.

---

### Phase 5: Testing, Quality Assurance & Verification
- [x] **TypeScript Typecheck**:
  - [x] Run `npm run typecheck` to guarantee zero compilation errors across all components.
- [x] **Build Validation**:
  - [x] Run `npm run build` to ensure static page generation and chunk optimization pass cleanly (62/62 pages prerendered successfully).
- [x] **Interactive Booking Flow Audit**:
  - [x] Verify date selection in hero widget carries cleanly to `/property`.
  - [x] Verify room cards navigate to correct property booking state.
  - [x] Tested mobile responsiveness (375px, 768px, 1280px).
- [x] **Performance & Visual Check**:
  - [x] Confirm complete absence of WebGL particle CPU lag.
  - [x] Confirm smooth 60fps scrolling and crisp rendering across dark displays.
