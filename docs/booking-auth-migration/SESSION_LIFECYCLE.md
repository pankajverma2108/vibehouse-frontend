# Session Lifecycle

## Purpose

Document the audited session lifecycle and persistence behavior used by `Vibehouse_frontend` for migration reference.

## Status

Audited on 2026-05-20 from live source files only.

## Auth Storage Map

| Storage key | File | Symbol | Storage | What it stores | Reuse | Uncertainty |
| --- | --- | --- | --- | --- | --- | --- |
| `vh_guest_access_token` | `lib/guest-auth-api.ts` | `LOCAL_STORAGE_KEY` | `localStorage` | Persistent auth token when sign-in/sign-up/Google auth chooses persistent storage. | Directly reusable | No expiry metadata is stored next to the token. |
| `vh_guest_access_token_session` | `lib/guest-auth-api.ts` | `SESSION_STORAGE_KEY` | `sessionStorage` | Session-scoped auth token when the guest signs in without persistent storage. | Directly reusable | None in the audited helper. |
| `vh_guest_profile_cache` | `components/auth/guest-auth-provider.tsx` | `GUEST_PROFILE_CACHE_KEY` | local or session storage | Cached guest profile, written to the same storage family as the active token. | Directly reusable | Cache invalidation depends on explicit clears or a fresh `/guest/auth/me` response. |
| `vh_guest_profile_overrides` | `components/auth/guest-auth-provider.tsx` | `PROFILE_OVERRIDES_KEY` | `localStorage` | Local-only profile edits applied on top of backend guest data. | Source-specific | No backend sync endpoint was found during this pass. |
| `vh_post_auth_redirect` | `lib/guest-auth-api.ts` | `POST_AUTH_REDIRECT_KEY` | `sessionStorage` | Preferred post-auth return path. | Directly reusable | Sanitized to same-origin relative paths only. |
| `vh_post_auth_redirect_fallback` | `lib/guest-auth-api.ts` | `POST_AUTH_REDIRECT_FALLBACK_KEY` | `localStorage` | Fallback copy of the post-auth return path. | Directly reusable | Cleared when `consumePostAuthRedirect()` runs. |

## Booking And Resume Storage Map

| Storage key | File | Symbol | Storage | What it stores | Reuse | Uncertainty |
| --- | --- | --- | --- | --- | --- | --- |
| `vh_property_selection_v1` | `lib/property-selection-session.ts` | `PROPERTY_SELECTION_KEY` | local and session storage | Property-page room counts, property/date context, age confirmation, and selection signature. | Directly reusable | Restored for the same property even if dates changed. |
| `vh_review_resume_v1` | `lib/property-selection-session.ts` | `REVIEW_RESUME_KEY` | local and session storage | Pending redirect intent into `/bookingreview` after auth. | Directly reusable | Consumed and cleared on first read. |
| `vh_booking_draft` | `lib/booking-session.ts` | `BOOKING_DRAFT_KEY` | `sessionStorage` | The booking draft plus optional pending order and review guest snapshot. | Directly reusable | Session-only; a full browser close can drop the draft if sessionStorage is cleared. |
| `vh_confirmed_booking:<ezeeReservationId>` | `lib/booking-session.ts` | `CONFIRMED_BOOKING_PREFIX` | `localStorage` | Local confirmation fallback snapshot written after successful payment verification. | Directly reusable | Snapshot freshness depends on the last successful frontend checkout in this browser. |
| `vh:guest-bookings:<guestId>` | `app/bookings/page.tsx` | `bookingsCacheKey` plus `lib/client-cache.ts` | `sessionStorage` | 3-minute TTL cache of `/guest/booking/mine` results. | Directly reusable | Exact key exists only when a guest ID is available. |
| Generated KYC cache keys | `components/booking/pre-arrival-page.tsx` | `slotsCacheKey`, `slotDetailCacheKey` plus `lib/client-cache.ts` | `sessionStorage` | TTL cache for slot list and per-slot KYC detail in pre-arrival. | Conceptually reusable | Exact key strings were not extracted in this pass; the helper names were confirmed. |

## Lifecycle: App Startup

| File | Symbol | What it does | Reuse | Uncertainty |
| --- | --- | --- | --- | --- |
| `components/auth/guest-auth-provider.tsx` | mount `useEffect` | Reads stored token on first client mount. If absent, clears cached guest state and ends restore. If present, optionally seeds cached guest data, then validates the token with `/guest/auth/me`. | Directly reusable | No background refresh or retry strategy was found. |
| `components/auth/guest-auth-provider.tsx` | `readCachedGuestProfile` | Lets the UI render cached guest data before the live `/guest/auth/me` request completes. | Directly reusable | Cache staleness is tolerated until live validation finishes. |
| `app/layout.tsx` | `RootLayout` | Ensures every client route enters under the same auth/session provider. | Directly reusable | None in the audited shell. |

## Lifecycle: Auth Interruptions And Return Paths

| File | Symbol | What it does | Reuse | Uncertainty |
| --- | --- | --- | --- | --- |
| `lib/guest-auth-api.ts` | `rememberPostAuthRedirect`, `consumePostAuthRedirect` | Stores and later consumes the last same-origin path the guest was on when auth was triggered. | Directly reusable | Confirmed around modal auth and Google auth only. |
| `components/marketing/property.tsx` | resume-review effects | Stores a review resume intent before opening auth, then resumes only when the saved selection signature still matches the current property/date/selection state. | Directly reusable | Confirmed for nightly property selection. |
| `components/booking/booking-checkout-page.tsx` | `resumePaymentAfterAuthRef` effect | If payment is initiated while signed out, authentication resumes the same `handlePayment()` call once `isAuthenticated` becomes true. | Directly reusable | Confirmed only for review checkout. |
| `app/auth/google/success/page.tsx` | callback finalizer | Persists Google token, validates it with `/guest/auth/me`, and then redirects to the consumed stored path or `return_to`. | Directly reusable | None in the audited frontend callback path. |

## Lifecycle: Booking Draft And Payment State

| File | Symbol | What it does | Reuse | Uncertainty |
| --- | --- | --- | --- | --- |
| `components/marketing/property.tsx` | save/restore effects | Saves property selection with a 150 ms debounce and restores it on return to the same property. | Directly reusable | Selection restore is property-scoped, not draft-signature-scoped. |
| `components/booking/booking-checkout-page.tsx` | mount rehydrate | Restores `draft`, saved review guest form, and then merges current auth identity when available. | Directly reusable | None in the audited path. |
| `components/booking/booking-checkout-page.tsx` | `savePendingBookingOrder` usage | Persists the created booking order before payment so retry/resume can skip duplicate order creation for the same draft signature. | Directly reusable | Confirmed only for the nightly branch. |
| `components/booking/booking-checkout-page.tsx` | verification success path | Clears draft and pending order, then writes `ConfirmedBookingSnapshot` into localStorage. | Directly reusable | None in the audited success path. |

## Lifecycle: Bookings And Pre-Arrival Cache Hydration

| File | Symbol | What it does | Reuse | Uncertainty |
| --- | --- | --- | --- | --- |
| `app/bookings/page.tsx` | bookings load effect | Uses fallback `guest.bookings`, then session TTL cache, then live `/guest/booking/mine` data. | Directly reusable | If live sync fails, fallback data may be stale. |
| `components/booking/pre-arrival-page.tsx` | `loadSlots`, `loadSlotDetail` | Uses session TTL caches for slot list/detail before refreshing from live KYC endpoints. | Directly reusable | Exact TTL value exists in this file but was not separately extracted for this document. |

## Logout And Failure Cleanup

| File | Symbol | What it does | Reuse | Uncertainty |
| --- | --- | --- | --- | --- |
| `components/auth/guest-auth-provider.tsx` | `signOut` | Clears auth token, cached profile, and profile overrides, then sets `guest` to `null`. | Directly reusable | No backend logout call was found. |
| `components/auth/guest-auth-provider.tsx` | session-restore catch block | Clears token and cached profile if `/guest/auth/me` rejects during restore. | Directly reusable | None in the audited catch path. |
| `components/booking/booking-checkout-page.tsx` | payment failure handling | Calls `/payment/fail` when possible, clears pending order, and leaves the draft available until verification success. | Directly reusable | Colive failure handling differs and is source-specific. |

## Not Found During This Pass

- No cookie-backed auth session lifecycle was found.
- No refresh-token lifecycle or server-issued session expiry metadata was found.
- No central cache invalidation layer beyond TTL expiry and explicit overwrite/remove helpers was found.
