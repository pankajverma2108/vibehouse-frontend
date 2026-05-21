# Session Lifecycle

## Purpose

Document the source-verified token, session, restore, and cleanup behavior used by `Vibehouse_frontend`.

## Status

Audited on 2026-05-21 from inspected source files only.

## Auth Storage Map

| Storage key | File path | Symbol | Storage medium | Confirmed purpose |
| --- | --- | --- | --- | --- |
| `vh_guest_access_token` | `lib/guest-auth-api.ts` | `LOCAL_STORAGE_KEY` | `localStorage` | Persistent guest access token when sign-in or Google auth stores a durable session. |
| `vh_guest_access_token_session` | `lib/guest-auth-api.ts` | `SESSION_STORAGE_KEY` | `sessionStorage` | Session-scoped guest access token when sign-in uses `rememberMe = false`. |
| `vh_guest_profile_cache` | `components/auth/guest-auth-provider.tsx` | `GUEST_PROFILE_CACHE_KEY` | `localStorage` or `sessionStorage` | Cached guest profile written into the same storage family as the token. |
| `vh_guest_profile_overrides` | `components/auth/guest-auth-provider.tsx` | `PROFILE_OVERRIDES_KEY` | `localStorage` | Local-only profile overrides applied on top of live backend guest data. |
| `vh_post_auth_redirect` | `lib/guest-auth-api.ts` | `POST_AUTH_REDIRECT_KEY` | `sessionStorage` | Preferred same-origin relative path for post-auth return. |
| `vh_post_auth_redirect_fallback` | `lib/guest-auth-api.ts` | `POST_AUTH_REDIRECT_FALLBACK_KEY` | `localStorage` | Fallback copy of the post-auth return path. |

## Booking-Adjacent Resume Storage

| Storage key | File path | Symbol | Storage medium | Confirmed purpose |
| --- | --- | --- | --- | --- |
| `vh_property_selection_v1` | `lib/property-selection-session.ts` | `PROPERTY_SELECTION_KEY` | `localStorage` and `sessionStorage` | Saves property or Colive room selection context before auth or navigation. |
| `vh_review_resume_v1` | `lib/property-selection-session.ts` | `REVIEW_RESUME_KEY` | `localStorage` and `sessionStorage` | Saves booking-review resume intent for nightly and Colive flows. |
| `vh_booking_draft` | `lib/booking-session.ts` | `BOOKING_DRAFT_KEY` | `sessionStorage` | Holds booking review draft and pending order state. |

## Where Auth Token Is Created

| File path | Symbol | Confirmed creation point |
| --- | --- | --- |
| `components/auth/guest-auth-provider.tsx` | `onSignUp()` | Stores `response.access_token` after `signupGuest()` succeeds. |
| `components/auth/guest-auth-provider.tsx` | `onSignIn()` | Stores `response.access_token` after `loginGuest()` succeeds without 2FA. |
| `components/auth/guest-auth-provider.tsx` | `onVerifyOtp()` | Stores `response.access_token` after verify-email OTP succeeds. |
| `components/auth/guest-auth-provider.tsx` | `onResetPassword()` | Stores `response.access_token` after password reset succeeds. |
| `components/auth/guest-auth-provider.tsx` | `onVerifyTwoFa()` | Stores `response.access_token` after `verifyTwoFa()` succeeds. |
| `app/auth/google/success/page.tsx` | callback finalizer | Stores the returned Google token before validating it with `/guest/auth/me`. |

## Session Hydration Timing

- `app/layout.tsx` mounts `GuestAuthProvider` around the full app shell, so auth hydration begins at the top-level client shell.
- `components/auth/guest-auth-provider.tsx` starts in `isRestoringSession = true`.
- During the mount effect, the provider reads `getStoredGuestToken()`.
- If a cached guest profile exists, the provider can set `guest` from cache before the live `/guest/auth/me` request returns.
- The restore effect always ends by setting `isRestoringSession = false` unless the component unmounts first.

## Session Hydration Map

```text
app/layout.tsx
  -> GuestAuthProvider mounts
     -> getStoredGuestToken()
        no token
          -> clearCachedGuestProfile()
          -> guest = null
          -> isRestoringSession = false
        token found
          -> readCachedGuestProfile()
             -> cached guest may render first
          -> GET /guest/auth/me
             -> success: merge overrides, set guest, write cache
             -> failure: clear token + clear cache + guest = null
          -> isRestoringSession = false
```

## Session Restore And Validation Behavior

| File path | Symbol | Confirmed behavior |
| --- | --- | --- |
| `components/auth/guest-auth-provider.tsx` | mount `useEffect` | Reads stored token, applies cached guest if available, validates with `getGuestMe(token)`, then either restores or clears auth state. |
| `lib/guest-auth-api.ts` | `getStoredGuestToken()` | Reads persistent token from localStorage first, then session token from sessionStorage. |
| `lib/guest-auth-api.ts` | `getGuestMe(token)` | Uses `GET /guest/auth/me` as the session-validation endpoint. |
| `app/auth/google/success/page.tsx` | Google callback validation | Calls `getGuestMe(token)` immediately after storing the returned Google token. |

## Expired Or Invalid Session Behavior

| File path | Symbol | Confirmed behavior |
| --- | --- | --- |
| `components/auth/guest-auth-provider.tsx` | restore `catch` branch | Clears stored token and cached guest profile if `/guest/auth/me` rejects during session restore. |
| `app/auth/google/success/page.tsx` | Google callback `catch` branch | Clears stored token and redirects to `/auth/google/error?reason=session_validation_failed` if `/guest/auth/me` rejects. |
| `components/booking/pre-arrival-page.tsx` | KYC action guards | Uses session-ended messaging such as `Your session ended. Please sign in again.` when token-gated calls fail or no token is present. |
| `modules/guest/services.tsx`, `modules/guest/addons.tsx`, `modules/guest/checkout.tsx`, `modules/guest/dashboard.tsx` | token checks before actions | Open the auth modal again when an authenticated action needs a token but none is available. |

## Logout Cleanup Behavior

| File path | Symbol | Confirmed behavior |
| --- | --- | --- |
| `components/auth/guest-auth-provider.tsx` | `signOut()` | Calls `clearStoredGuestToken()`, clears cached guest profile, removes `vh_guest_profile_overrides`, and sets `guest` to `null`. |
| `components/marketing/navigation.tsx` | profile-menu logout | Invokes provider `signOut()` from the live navigation menu. |
| `app/profile/page.tsx` | profile logout | Invokes provider `signOut()` from the profile page. |

## Redirect Restoration Behavior

| File path | Symbol | Confirmed behavior |
| --- | --- | --- |
| `lib/guest-auth-api.ts` | `rememberPostAuthRedirect(path?)` | Stores a normalized same-origin relative path in sessionStorage and localStorage. |
| `lib/guest-auth-api.ts` | `getPostAuthRedirect()` | Reads and normalizes the stored redirect path without consuming it. |
| `lib/guest-auth-api.ts` | `consumePostAuthRedirect()` | Reads the normalized redirect path and clears both redirect keys. |
| `app/auth/google/success/page.tsx` | callback success redirect | Uses `consumePostAuthRedirect()` first, then `return_to`, then `/`. |
| `components/marketing/property.tsx` | nightly review resume | Uses booking-specific selection signature restore, separate from generic post-auth redirect storage. |
| `components/colive/colive-flow.tsx` | Colive review resume | Uses the same booking-specific review-resume pattern for Colive. |
| `components/booking/booking-checkout-page.tsx` | payment resume | Uses in-memory `resumePaymentAfterAuthRef`, not storage-backed redirect restore. |

## Redirect Restoration Map

```text
Generic auth modal / Google auth
  -> rememberPostAuthRedirect(current path)
  -> later Google success consumes stored redirect

Nightly property booking
  -> saveReviewResumeIntent(selection signature)
  -> auth modal
  -> property page effect verifies signature
  -> /bookingreview only if selection context still matches

Colive booking
  -> saveReviewResumeIntent(selection signature)
  -> auth modal
  -> Colive effect verifies signature
  -> /bookingreview only if selection context still matches

Checkout payment
  -> resumePaymentAfterAuthRef = true
  -> auth modal
  -> effect reruns handlePayment() after auth
```

## Auth State Dependency Map

```text
stored token
  -> GuestAuthProvider restore
     -> guest
        -> guest.bookings
           -> /bookings fallback list
           -> guest route gates
           -> GuestExperienceProvider.selectedBookingId
              -> guest dashboard / services / addons / checkout
```

## Session Persistence Risks

- `components/auth/guest-auth-provider.tsx`: guest cache and local profile overrides can temporarily mask backend state until `/guest/auth/me` finishes.
- `components/auth/guest-auth-provider.tsx`: local profile overrides survive sign-in cycles until explicit logout or overwrite, because they are stored in `localStorage`.
- `lib/guest-auth-api.ts`: generic post-auth redirect storage is path-only and independent from booking-review resume storage. Copying one without the other would change behavior.
- `components/marketing/property.tsx`, `components/colive/colive-flow.tsx`, and `components/booking/booking-checkout-page.tsx`: booking continuation after auth relies on three separate resume patterns.

## Not Found During This Pass

- Cookie-based auth session lifecycle: Not found during this pass.
- Refresh-token lifecycle: Not found during this pass.
- Server-issued expiry metadata stored beside the token: Not found during this pass.
- Logout API endpoint: Not found during this pass.
- Central cross-module session invalidation bus: Not found during this pass.
