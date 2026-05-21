# Session Lifecycle

## Purpose

Document the source-verified auth, booking, restore, and cleanup behavior that directly affects the booking system in `Vibehouse_frontend`.

## Status

Audited on 2026-05-21 from inspected source files only.

## Global Session Mount

| File path | Symbol | Confirmed behavior |
| --- | --- | --- |
| `app/layout.tsx` | `RootLayout` | Wraps the entire app shell with `GuestAuthProvider`, so booking review, bookings, confirmation, pre-arrival, and guest hub all read the same auth/session context. |
| `components/auth/guest-auth-provider.tsx` | `useGuestAuth()` | Exposes `openAuthModal()`, `signOut()`, and `updateGuestProfile()` to booking components. |

## Storage Key Map

| Storage key | File path | Symbol | Storage medium | Confirmed purpose |
| --- | --- | --- | --- | --- |
| `vh_guest_access_token` | `lib/guest-auth-api.ts` | `LOCAL_STORAGE_KEY` | `localStorage` | Persistent guest access token when sign-in or Google auth uses a durable session. |
| `vh_guest_access_token_session` | `lib/guest-auth-api.ts` | `SESSION_STORAGE_KEY` | `sessionStorage` | Session-scoped guest access token when sign-in uses `rememberMe = false`. |
| `vh_guest_profile_cache` | `components/auth/guest-auth-provider.tsx` | `GUEST_PROFILE_CACHE_KEY` | `localStorage` or `sessionStorage` | Cached guest profile used during auth/session restore. |
| `vh_guest_profile_overrides` | `components/auth/guest-auth-provider.tsx` | `PROFILE_OVERRIDES_KEY` | `localStorage` | Local guest-profile overrides that checkout can update through `updateGuestProfile()`. |
| `vh_post_auth_redirect` | `lib/guest-auth-api.ts` | `POST_AUTH_REDIRECT_KEY` | `sessionStorage` | Generic relative return-path storage for auth flows. |
| `vh_post_auth_redirect_fallback` | `lib/guest-auth-api.ts` | `POST_AUTH_REDIRECT_FALLBACK_KEY` | `localStorage` | Fallback copy of the generic auth return path. |
| `vh_property_selection_v1` | `lib/property-selection-session.ts` | `PROPERTY_SELECTION_KEY` | `localStorage` and `sessionStorage` | Saves nightly or Colive selection context before auth or navigation. |
| `vh_review_resume_v1` | `lib/property-selection-session.ts` | `REVIEW_RESUME_KEY` | `localStorage` and `sessionStorage` | Saves booking-review resume intent for post-auth continuation. |
| `vh_booking_draft` | `lib/booking-session.ts` | `BOOKING_DRAFT_KEY` | `sessionStorage` | Stores `{ draft, pendingOrder, review }` for review, payment retry, and guest-form restore. |
| `vh_confirmed_booking:<ezeeReservationId>` | `lib/booking-session.ts` | `CONFIRMED_BOOKING_PREFIX` | `localStorage` | Stores a local confirmation fallback snapshot after payment verification succeeds. |
| `vh:guest-bookings:<guestId>` | `app/bookings/page.tsx`, `lib/client-cache.ts` | `bookingsCacheKey()` | `sessionStorage` | 3-minute cache for `/guest/booking/mine`. |
| `vh:web-checkin:slots:<ezeeReservationId>` | `components/booking/pre-arrival-page.tsx`, `lib/client-cache.ts` | `slotsCacheKey()` | `sessionStorage` | 3-minute cache for pre-arrival slot lists and booking status. |
| `vh:web-checkin:slot:<ezeeReservationId>:<slotId>` | `components/booking/pre-arrival-page.tsx`, `lib/client-cache.ts` | `slotDetailCacheKey()` | `sessionStorage` | 3-minute cache for per-slot KYC detail. |

## Auth Restore Behavior That Booking Depends On

```text
app/layout.tsx
  -> GuestAuthProvider mounts
     -> getStoredGuestToken()
        no token
          -> guest = null
          -> booking pages fall back to sign-in or local-only empty states
        token found
          -> cached guest profile may render first
          -> GET /guest/auth/me
             -> success: guest state restored, bookings become available
             -> failure: token + cache cleared, guest = null
```

## Nightly Property Selection Lifecycle

| Phase | Evidence | Confirmed behavior |
| --- | --- | --- |
| Initial property load | `app/property/page.tsx`, `components/marketing/property.tsx` | `PropertyPage` resolves `property_id` and passes initial room data into `Property`. |
| Selection ownership | `components/marketing/property.tsx` | `Property` owns `selectedCounts`, `isAgeConfirmed`, `dateRange`, and `resolvedPropertyId`. |
| Selection save | `components/marketing/property.tsx`, `lib/property-selection-session.ts` | A 150 ms effect persists nightly selection state into `vh_property_selection_v1`. |
| Selection restore | `components/marketing/property.tsx`, `lib/property-selection-session.ts` | Returning to the same property restores counts and age confirmation, then re-clamps them to current room availability. |
| TTL / expiry | `lib/property-selection-session.ts` | `vh_property_selection_v1` and `vh_review_resume_v1` expire after 24 hours. Expired payloads are cleared when read. |

## Review Resume Lifecycle

```text
Property page continue
  -> saveBookingDraft(vh_booking_draft)
  -> signed out?
     yes -> saveReviewResumeIntent(vh_review_resume_v1) -> openAuthModal("signin")
            -> after auth, Property consumes resume intent
            -> signature still matches?
               yes -> router.push("/bookingreview")
               no  -> stay on /property
     no  -> router.push("/bookingreview")
```

## Booking Draft Lifecycle

| Phase | Evidence | Confirmed behavior |
| --- | --- | --- |
| Draft creation | `components/marketing/property.tsx`, `lib/booking-session.ts` | `saveBookingDraft()` writes `BookingDraft` into `vh_booking_draft`. |
| Draft hydration | `components/booking/booking-checkout-page.tsx` | Review/checkout rehydrates `draft` and the saved guest form from `getStoredBookingState()`. |
| Guest-form persistence | `components/booking/booking-checkout-page.tsx`, `lib/booking-session.ts` | `saveBookingReviewGuest()` stores the review form only when the signature still matches the active draft. |
| Add-on mutation | `components/booking/booking-checkout-page.tsx`, `lib/booking-session.ts` | Add-on quantity changes rewrite `draft.addons` and immediately resave the draft. |
| Pending-order persistence | `components/booking/booking-checkout-page.tsx`, `lib/booking-session.ts` | `savePendingBookingOrder()` stores the nightly order summary beside the draft so retries can reuse it by signature. |
| Draft cleanup | `components/booking/booking-checkout-page.tsx`, `lib/booking-session.ts` | `clearBookingDraft()` runs after successful nightly payment verification and after successful Colive verification. |
| Pending-order cleanup | `components/booking/booking-checkout-page.tsx`, `lib/booking-session.ts` | `clearPendingBookingOrder()` runs on nightly cancel/fail and after successful nightly verification. |
| Draft TTL | `lib/booking-session.ts` | Not found during this pass. `vh_booking_draft` has no time-based expiry. |

## Payment Resume Lifecycle

| Phase | Evidence | Confirmed behavior |
| --- | --- | --- |
| Auth interruption | `components/booking/booking-checkout-page.tsx` | Clicking payment while signed out sets `resumePaymentAfterAuthRef.current = true` and opens the auth modal. |
| Resume trigger | `components/booking/booking-checkout-page.tsx` | An effect reruns `handlePayment()` after `isAuthenticated` becomes true. |
| Persistence | `components/booking/booking-checkout-page.tsx` | This resume flag is in-memory only and does not survive a full reload. |
| Duplicate protection | `components/booking/booking-checkout-page.tsx`, `lib/booking-session.ts` | `pendingOrder.signature` reuse and `paymentHandledRef` prevent duplicate order creation or double-handling inside one modal session. |

## Confirmation Snapshot Lifecycle

| Phase | Evidence | Confirmed behavior |
| --- | --- | --- |
| Snapshot creation | `components/booking/booking-checkout-page.tsx`, `lib/booking-session.ts` | Successful nightly verification writes `vh_confirmed_booking:<eri>` with payment, room, guest, and pricing data. |
| Snapshot consumption | `components/booking/booking-confirmed-page.tsx` | Confirmation re-reads the snapshot after a live `linkGuestBooking()` attempt, even when the live request fails. |
| Snapshot TTL | `lib/booking-session.ts` | Not found during this pass. Confirmed snapshots have no TTL or sweeping logic. |

## Bookings List Cache Lifecycle

```text
/bookings
  -> fallback guest.bookings from auth state
  -> session cache lookup: vh:guest-bookings:<guestId> (TTL 3 min)
  -> GET /guest/booking/mine
     success -> setClientCache(...) -> live bookings render
     failure -> keep cache if present, else fall back to auth bookings or empty/error state
```

## Web Check-In Cache Lifecycle

```text
/bookings/[eri]/web-check-in
  -> openAuthModal("signin") if signed out
  -> slots cache lookup: vh:web-checkin:slots:<eri> (TTL 3 min)
     -> payment pending? show gate
     -> all slots completed? redirect to /confirmed
  -> Promise.all(linkGuestBooking, getBookingKycSlots)
     -> set slots cache
     -> choose active editable slot
  -> per-slot detail cache lookup: vh:web-checkin:slot:<eri>:<slotId> (TTL 3 min)
  -> live detail fetch refreshes the slot-detail cache
```

## Web Check-In Upload / Submit Lifecycle

| Phase | Evidence | Confirmed behavior |
| --- | --- | --- |
| Upload | `components/booking/pre-arrival-page.tsx`, `lib/booking-api.ts` | Upload strips image metadata, requests a presigned upload URL, uploads raw bytes, and stores the returned `fileKey` plus public URL in the editor state. |
| OCR | `components/booking/pre-arrival-page.tsx`, `lib/booking-api.ts` | OCR uses the uploaded `front_image_key` and writes extracted name, DOB, ID number, ID type, and address back into the editor. |
| Submit | `components/booking/pre-arrival-page.tsx`, `lib/booking-api.ts` | Final submit posts the normalized KYC payload, reloads slot data, and opens the completion modal. |
| Completion | `components/booking/pre-arrival-page.tsx` | Completion routes the user back to `/bookings/[eri]/confirmed`. |

## Guest-Hub Session Coupling

| File path | Symbol | Confirmed behavior |
| --- | --- | --- |
| `components/guest/guest-route-gate.tsx` | `GuestHubEntryGate` | Uses `guest.bookings` first, then `/guest/booking/mine` + `/guest/booking/link` fallback when no active eligible booking is already present. |
| `components/guest/guest-route-gate.tsx` | `GuestBookingGate` | Denies access when the booking is unlinked, upcoming, past, or unauthenticated. |
| `lib/guest-hub.ts` | `TEMPORARY_ALLOW_DATE_RANGE_ONLY_GUEST_HUB_ACCESS` | Current guest-hub access is widened by a temporary date-range-only eligibility override. |

## Cleanup / Expiry Summary

| Storage area | Cleanup behavior | TTL / expiry |
| --- | --- | --- |
| `vh_property_selection_v1` | Cleared automatically when an expired payload is read. | 24 hours |
| `vh_review_resume_v1` | Consumed and removed on read; expired intents return `null`. | 24 hours |
| `vh_booking_draft` | Cleared only on successful booking completion or browser-session loss. | Not found during this pass |
| `vh_confirmed_booking:<eri>` | No automatic cleanup found. | Not found during this pass |
| `vh:guest-bookings:<guestId>` | Removed by `getClientCache()` when stale. | 3 minutes |
| `vh:web-checkin:slots:<eri>` | Removed by `getClientCache()` when stale. | 3 minutes |
| `vh:web-checkin:slot:<eri>:<slotId>` | Removed by `getClientCache()` when stale. | 3 minutes |

## Not Found During This Pass

- Cookie-based booking/session lifecycle.
- Refresh-token lifecycle or silent re-auth that would transparently repair booking actions.
- Time-based expiry for `vh_booking_draft`.
- Time-based expiry for confirmed booking snapshots.
- A server-side abandoned-booking cleanup worker or order-reconciliation queue in this repo.
