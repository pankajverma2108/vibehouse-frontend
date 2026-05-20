# Session Feedback and Reuse Notes

Use this file as a handoff for future chats/agents working in this repo.

## What I corrected during the conversation

- The guest add-ons catalog was not just a single list; it needed a structured inventory and a live API comparison.
- I asked for and used the actual backend endpoints instead of guessing from UI names.
- I found that `/guest/store/services` can be empty while `SERVICE` items still appear in `/guest/store/catalog`.
- I updated the guest catalog hook so SERVICE-category items are merged into services when the services endpoint is empty.
- I separated the business metadata discussion from the implementation work because you said ops CMS will own that data.
- I wrote the guest API mapping doc instead of only giving a verbal summary.

## Preferences you stated or reinforced

- Keep the repo changes small and targeted.
- Prefer direct implementation over long explanations when the task is actionable.
- Use the real backend responses to validate assumptions.
- Create reusable docs that future agents can load.
- Store the feedback file under `docs/frontend_note`.
- Business metadata should be maintained in a separate ops CMS, so no frontend work is needed for that part.

## Repo and UI preferences to preserve

- Favor minimal containerization: ideally 0 to 1 wrapper layers per section.
- Keep cards and content close to the base section background.
- Use flat `#07070a` section backgrounds where that pattern already exists.
- Avoid extra decorative gradients unless explicitly requested.
- Keep the mobile fullscreen navigation background flat and non-decorative.
- Reuse established brand tokens and typography instead of inventing new ones.
- Keep copy human-first, witty, direct, and non-enterprise.
- Avoid AI-style filler phrases.
- Use the shared `vh-cta-button` utility for primary CTAs when relevant.
- Prefer `StickerTag` for emphasis tags instead of ad hoc badge styles.

## What to do differently next time

- Start from the nearest concrete file, hook, or failing behavior, then verify locally before editing.
- Before the first edit, form one falsifiable hypothesis and one cheap check that could disprove it.
- After the first substantive edit, run the narrowest possible validation immediately.
- Do not broaden scope once the local fix is obvious.
- When the user asks for comparisons or mappings, produce a durable doc with endpoints, fields, gaps, and UI usage.
- When a backend endpoint is empty but adjacent catalog data exists, check for normalization in the client hook instead of assuming the backend is wrong.
- If the user says one source of truth belongs elsewhere, do not add unnecessary frontend implementation for it.
- Keep the tone concise and factual in progress updates.

## Guest API context

- `useGuestCatalog` fetches catalog, services, and borrowables together.
- `getCatalog` hits `/guest/store/catalog?property_id=...`.
- `getServices` hits `/guest/store/services?property_id=...`.
- `getBorrowables` hits `/guest/store/borrowables?property_id=...`.
- `modules/guest/addons.tsx` depends on cart APIs.
- `modules/guest/borrow.tsx` depends on borrow request and borrow-mine APIs.
- `modules/guest/checkout.tsx` depends on cart checkout and payment APIs.
- `app/guest/*` mostly routes to the guest hub rather than owning the feature logic.

## Useful caution for future sessions

- Do not assume the services endpoint is authoritative when the catalog already contains `SERVICE` items.
- If the user asks for a summary file, create the file in the workspace instead of only returning text.
- If a future task is about guest add-ons or services, check both `lib/guest-experience-api.ts` and `hooks/use-guest-catalog.ts` first.
- If the user wants a handoff for another agent, keep it compact, factual, and easy to reload.
