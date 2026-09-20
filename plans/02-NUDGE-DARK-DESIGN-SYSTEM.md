# 02. Nudge Dark Design System Specification

## 1. Color System Architecture

### 1.1 Foundation Neutrals (True Black & Carbon Depth)
The background is strictly anchored to **True Pitch Black (`#000000`)**. Visual depth is created using structured tonal layering rather than muddy grays:

```css
:root {
  /* Core Foundation */
  --bg-pure: #000000;             /* App base background */
  --bg-subtle: #060608;           /* Alternating sections / subtle depth */
  
  /* Surfaces */
  --surface-base: #0c0c0f;        /* Level 1: Inset containers, section backdrops */
  --surface-card: #121216;        /* Level 2: Cards, interactive widgets */
  --surface-card-hover: #17171d;  /* Level 2 Hover: Hovered card surface */
  --surface-elevated: #1a1a20;    /* Level 3: Dropdowns, popovers, modals */
  --surface-glass: rgba(18, 18, 22, 0.75); /* Frosted glass headers / floating pills */

  /* Hairline Borders */
  --border-subtle: rgba(255, 255, 255, 0.08); /* Default hairline card/divider border */
  --border-muted: rgba(255, 255, 255, 0.12);  /* Secondary active border */
  --border-active: rgba(255, 255, 255, 0.22); /* Hover / active state border */
  --border-focused: rgba(54, 197, 240, 0.6);  /* Keyboard focus border */

  /* Typography / Text Tones */
  --text-primary: #ffffff;        /* Headings, prominent titles */
  --text-secondary: #e2e2e6;      /* Subtitles, high-readability body */
  --text-muted: #8e8e93;          /* Secondary metadata, captions */
  --text-faint: #55555c;          /* Inactive tabs, disabled states, placeholders */
}
```

### 1.2 The Nudge Quad-Color Accent System
Directly adapted from `https://nudge-folio.framer.website/`, using intentional semantic assignment:

```css
:root {
  /* 1. Electric Cyan - Tech, Fiber, Nomad Focus */
  --accent-cyan: #36c5f0;
  --accent-cyan-soft: rgba(54, 197, 240, 0.12);
  --accent-cyan-border: rgba(54, 197, 240, 0.35);

  /* 2. Warm Amber - Hospitality, Warmth, Ratings & Food */
  --accent-amber: #ecb22e;
  --accent-amber-soft: rgba(236, 178, 46, 0.12);
  --accent-amber-border: rgba(236, 178, 46, 0.35);

  /* 3. Emerald Mint - Real-Time Availability, Confirmed, Hygiene */
  --accent-mint: #2fbc81;
  --accent-mint-soft: rgba(47, 188, 129, 0.12);
  --accent-mint-border: rgba(47, 188, 129, 0.35);

  /* 4. Vivid Crimson - Energy, Community Events, Hero CTA */
  --accent-crimson: #e01e5a;
  --accent-crimson-soft: rgba(224, 30, 90, 0.14);
  --accent-crimson-border: rgba(224, 30, 90, 0.4);
}
```

---

## 2. Typography Hierarchy (Nudge Folio Spec)

### 2.1 Font Stack Definition
```css
/* Font Family Definitions */
--font-display: "Inter Display", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-body: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
--font-mono: "DM Mono", "Geist Mono", "SF Mono", Consolas, monospace;
```

### 2.2 Typographic Roles & Tracking Rules
| Level | Font Family | Size | Weight | Tracking (Letter Spacing) | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Hero Display** | `Inter Display` | 56px - 92px | 700 / 800 | `-0.04em` (tight) | `0.95` | Homepage hero statement headline |
| **Section Title** | `Inter Display` | 32px - 44px | 700 | `-0.03em` | `1.1` | Section titles ("Your Private Sanctuary") |
| **Card Header** | `Inter Display` | 20px - 24px | 600 | `-0.02em` | `1.2` | Room cards, Event cards, Upsell titles |
| **Body Large** | `Inter` | 16px - 18px | 400 / 500 | `-0.01em` | `1.6` | Hero descriptive paragraph, section intros |
| **Body Normal** | `Inter` | 14px - 15px | 400 | `normal` | `1.55` | Card descriptions, feature details |
| **UI Button / CTA**| `Inter` | 13px - 15px | 600 | `+0.01em` | `1.0` | Primary buttons, booking triggers |
| **Eyebrow Pill** | `DM Mono` | 10px - 11px | 500 | `+0.08em` (uppercase) | `1.0` | Category kickers, location pill |
| **Meta / Price** | `DM Mono` | 12px - 16px | 500 | `normal` | `1.2` | Room pricing (`₹1,299 / night`), dates, stats |

---

## 3. Geometry, Elevation & Micro-Interactions

### 3.1 Radii System
Replace the harsh 0px NeoBrutalist corners with refined, tool-native radii:
- **`rounded-full`**: Pill tags, navigation shell, primary CTA button, icon buttons.
- **`rounded-2xl` (16px)**: Room cards, event cards, booking widget container, lifestyle pillars.
- **`rounded-xl` (12px)**: Input slots, date picker cells, inner bento modules.
- **`rounded-lg` (8px)**: Dropdown menus, tooltips, nested status chips.

### 3.2 Border & Surface Rules
- All cards use a **1px hairline border**: `border border-white/[0.08]` over `--surface-card` (`#121216`).
- On hover:
  - Transition duration: `180ms ease-out`.
  - Border brightness increases: `border-white/[0.18]`.
  - Subtle lift: `translate-y-[-2px]` (strictly avoiding laggy 3D tilt or cartoonish 6px solid shadows).
  - Background subtly lifts to `#17171d`.

### 3.3 Shadow Architecture
- **Card Ambient Shadow**: `shadow-[0_4px_24px_rgba(0,0,0,0.6)]`
- **Elevated Popover / Modal**: `shadow-[0_16px_48px_rgba(0,0,0,0.85)]`
- **Primary CTA Glow**: `shadow-[0_0_20px_rgba(224,30,90,0.35)]`

---

## 4. Standardized Component System

### 4.1 Buttons
1. **Primary Hero / Booking CTA (`Button variant="primary"`):**
   - Background: `bg-[#E01E5A]` (Vivid Crimson) or `bg-white text-black` (High Contrast Mode).
   - Text: `font-medium tracking-tight text-white` (or `text-black`).
   - Hover: `hover:brightness-110 active:scale-[0.98]` transition `150ms`.
   - Radius: `rounded-full` or `rounded-xl`.
2. **Secondary / Outline Button (`Button variant="outline"`):**
   - Background: `bg-white/[0.04]` hover `bg-white/[0.08]`.
   - Border: `border border-white/[0.12]` hover `border-white/[0.25]`.
   - Text: `text-[#E2E2E6]`.
3. **Ghost / Text Button (`Button variant="ghost"`):**
   - Background: transparent hover `bg-white/[0.06]`.
   - Text: `text-white/80` hover `text-white`.

### 4.2 Status & Meta Badges
Inspired directly by Nudge Folio's metadata tags:
```tsx
// Example Nudge Status Pill
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#2FBC81]/10 border border-[#2FBC81]/30 text-[#2FBC81] font-mono text-[11px] font-medium tracking-wide">
  <span className="h-1.5 w-1.5 rounded-full bg-[#2FBC81] animate-pulse" />
  LIVE AVAILABILITY
</span>
```

### 4.3 Room & Event Cards
- **Header**: High-resolution image with subtle aspect ratio (`16:10`), rounded inner corners, soft dark vignette.
- **Badge Slot**: Floating top-left badge (e.g. `PRIVATE BALCONY` in Amber, or `DORM POD` in Cyan).
- **Body**:
  - Category / Kicker in `font-mono text-xs text-white/50`.
  - Room Title in `font-display text-xl font-bold text-white`.
  - Feature tags (AC, Fiber, Ensuite, Desk) in compact pill format.
- **Footer**:
  - Pricing in `font-mono text-lg font-bold text-white` with `/ night` in `text-xs text-white/50`.
  - High-conversion "Reserve Room" or "Select Dates" action.
