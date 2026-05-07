# Vibehouse UI and Copy Instructions

## Voice and Copy
- Write human-first copy, not technical product text.
- Tone target: active, social, witty, playful, slightly sarcastic, and meme-aware.
- Keep copy compliant, respectful, and non-offensive.
- Avoid generic AI-style phrases like "tools", "workflow", "access this screen", "please proceed".
- Prefer confident lines such as:
  - "Bring your vibe, bring your playlist."
  - "Skip the queue energy."
  - "Tiny task now, zero chaos later."
- Keep CTAs short and decisive.
- Use a human, definitive voice across the webapp. Keep labels short, sharp, and friendly.
- Keep support copy witty but clear; no enterprise-speak.
- Prefer direct CTAs like "Share on WhatsApp", "Open dashboard", or "Lock it in".

## Brand and Visual System
- Stay on the established brand palette from existing pages (`--vh-*` tokens).
- Reuse existing typography classes (`font-sectiontitle`, `font-body`, `font-bodyfocus`, `vh-title`) where appropriate.
- Preserve flat `#07070a` base surfaces unless a section already uses approved gradients.
- Use `StickerTag` for emphasis tags instead of ad-hoc badge styles.
- Use Geologica for body, buttons, and content copy. Keep Suez One for the main title treatment only when needed.
- Reuse the shared `vh-cta-button` utility for primary CTAs instead of duplicating button class strings.

## Layout and Components
- Follow current home/property/bookings visual language and spacing rhythm.
- Prefer clear alignment and minimal wrapper nesting.
- Do not expose raw long URLs when a share action can be used.
- On booking confirmation screens, show contextual actions only (for example, hide web check-in action after completion).

## Animation
- Keep animations meaningful and lightweight.
- Respect reduced-motion preferences.
- Prefer existing `gsap` and `motion` patterns already used in this codebase.

## Policy and Compliance Copy
- For cancellation content, derive dates dynamically from booking check-in date.
- Align cancellation wording with policy baseline used in the repository:
  - Full refund up to 7 days before check-in
  - Partial refund from 3 to 6 days before check-in
  - No refund within final 72 hours
- If booking-source-specific rules are unavailable, show baseline policy and direct guests to full policy page.
