# Sticky Sidebar Implementation Guide

## Overview
This document explains how to properly implement sticky sidebar behavior in a CSS Grid layout, specifically for the Availability section's Booking Summary component.

---

## Current Implementation Analysis

### What's Currently Working
Your current implementation has the **right foundation**:
```tsx
<div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
  {/* Left: Room cards */}
  <div className="space-y-6">...</div>
  
  {/* Right: Sticky summary */}
  <aside className="hidden self-start lg:sticky lg:top-28 lg:block">
    <div className="rounded-[26px] border ... lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
      {/* Summary content */}
    </div>
  </aside>
</div>
```

### Key CSS Properties Explained
- **`lg:sticky`**: Enables sticky positioning
- **`lg:top-28`**: Offset from viewport top (7rem = ~112px)
- **`self-start`**: Prevents the grid item from stretching to full height (CRITICAL)
- **`max-h-[calc(100vh-7rem)]`**: Limits the inner container height so it doesn't overflow
- **`overflow-y-auto`**: Allows content inside the summary to scroll if needed

---

## Common Issues & Solutions

### Issue 1: Sticky Not Working (Element Doesn't Stick)
**Cause**: Grid item is stretching to full height, which prevents sticky from working.

**Solution**: Ensure `self-start` (or `align-self: start`) is applied:
```tsx
<aside className="lg:sticky lg:top-28 lg:self-start">
  {/* Won't stretch full height */}
</aside>
```

### Issue 2: Sticky Goes Below Section
**Cause**: No boundary stopping the sticky element at the section bottom.

**Solution (Pure CSS)**: The grid container itself acts as the boundary. When the grid ends, sticky automatically stops. No additional CSS needed if the structure is correct.

### Issue 3: Gap Between Sticky Element and Viewport Top
**Solution**: Adjust `top` value:
```tsx
// Tighter: less gap
<aside className="lg:sticky lg:top-4">

// Current: 7rem gap
<aside className="lg:sticky lg:top-28">

// Maximum: full viewport minus summary height
<aside className="lg:sticky lg:top-[calc(100vh-600px)]">
```

---

## Pure CSS Implementation (Recommended)

### Setup: Grid Container
```tsx
{/* Availability Section */}
<section id="availability" className="scroll-mt-28">
  <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_390px]">
    {/* Left Column: Room Cards */}
    <div className="space-y-5">
      {/* Room cards render here */}
    </div>

    {/* Right Column: Sticky Booking Summary */}
    <aside className="lg:sticky lg:top-8 lg:self-start lg:h-fit">
      <div className="rounded-[26px] border border-white/12 bg-[var(--vh-panel-strong)] p-5 shadow-[var(--vh-shadow-lg)] lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto">
        {/* Summary content */}
      </div>
    </aside>
  </div>
</section>
```

### Key CSS Classes Explained
| Class | Purpose | Notes |
|-------|---------|-------|
| `lg:sticky` | Enables sticky positioning | Only on lg+ screens |
| `lg:top-8` | Offset from viewport top | Adjust for your nav height |
| `lg:self-start` | Prevents full-height stretch | **CRITICAL for sticky to work** |
| `lg:h-fit` | Content-based height | Combined with `self-start` |
| `lg:max-h-[calc(100vh-5rem)]` | Inner scroll container | Prevents summary overflow |
| `lg:overflow-y-auto` | Inner scrolling | Only the summary content scrolls |

### Why This Works
1. **`minmax(0,1fr)` on left column**: Allows left column to be flexible while right stays fixed width
2. **`self-start + h-fit`**: Summary takes its natural height, doesn't stretch
3. **Grid boundary**: When section ends, sticky naturally stops (no JS needed)
4. **Inner `max-h + overflow-y-auto`**: Summary content scrolls internally without affecting layout

---

## Advanced: GSAP ScrollTrigger (If Needed)

Use GSAP only if pure CSS doesn't meet specific requirements (e.g., complex boundary animations).

### Implementation
```tsx
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function AvailabilitySection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!stickyRef.current || !sectionRef.current) return;

    const sticky = stickyRef.current;
    const section = sectionRef.current;

    ScrollTrigger.create({
      trigger: section,
      start: "top 80px", // When section top hits 80px from viewport top
      end: "bottom 80px", // When section bottom hits 80px from viewport bottom
      onUpdate: (self) => {
        if (self.isActive) {
          // Within boundaries: stick it
          gsap.to(sticky, {
            position: "fixed",
            top: "80px",
            width: stickyRef.current?.offsetWidth,
            duration: 0,
          });
        }
      },
      onLeave: () => {
        // When exiting: scroll normally
        gsap.to(sticky, {
          position: "relative",
          top: "auto",
          width: "auto",
          duration: 0,
        });
      },
    });

    return () => ScrollTrigger.getAll().forEach(trigger => trigger.kill());
  }, []);

  return (
    <section ref={sectionRef} className="scroll-mt-28">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Left Column */}
        <div className="space-y-5">{/* Room cards */}</div>

        {/* Right Column */}
        <div ref={stickyRef} className="lg:h-fit">
          <div className="rounded-[26px] border border-white/12 bg-[var(--vh-panel-strong)] p-5 shadow-[var(--vh-shadow-lg)]">
            {/* Summary content */}
          </div>
        </div>
      </div>
    </section>
  );
}
```

### Pros
- More control over boundary detection
- Smooth animations possible
- Works in older browsers

### Cons
- JavaScript overhead
- Recalculates on scroll (less performant than CSS)
- Requires GSAP library

---

## Recommended Configuration

### For Best Performance (Pure CSS)
Use the **Pure CSS Implementation** above. Browser handles sticky positioning natively.

### For Design Control (GSAP)
Use GSAP ScrollTrigger if you need:
- Custom animations when entering/exiting sticky state
- Parallax effects
- Complex boundary conditions

---

## Testing Checklist

- [ ] Sticky activates when Availability section enters viewport
- [ ] Sticky remains active while scrolling through room cards
- [ ] Sticky stops at section bottom (doesn't scroll away)
- [ ] Inner content scrolls if summary height exceeds viewport
- [ ] Mobile: summary is NOT sticky (using `lg:sticky`)
- [ ] Right column width is consistent (360px/390px)
- [ ] No layout shift when sticky activates
- [ ] Works with both long and short room lists

---

## Troubleshooting

### "Sticky isn't working"
1. Check: Is `self-start` or `align-self: start` applied?
2. Check: Is parent a flex/grid container? ✓ (It is)
3. Check: Is there a `height: 100%` on parent? ✗ (Remove if present)

### "Summary scrolls away at bottom"
This is expected behavior — sticky stops at grid boundary.
If you need to fix it higher before section end, use GSAP ScrollTrigger's `end` property.

### "Gap looks too large/small"
Adjust `top-{value}`:
- Smaller gap: `lg:top-4` or `lg:top-6`
- Larger gap: `lg:top-12` or `lg:top-16`

### "Summary content is cut off"
Increase `max-h`:
```tsx
// Before
lg:max-h-[calc(100vh-7rem)]

// After (more room)
lg:max-h-[calc(100vh-2rem)]
```
