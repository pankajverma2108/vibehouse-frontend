# Auth Architecture

## Purpose

Document the audited authentication architecture used by `Vibehouse_frontend` for migration reference.

## Status

Audited on 2026-05-20 from live source files only.

## Audit Scope Notes

- This pass covers the mounted auth/session surfaces used by the live app.
- Backup or historical files such as `app/profile/page-old.tsx`, `app/profile/page-backup.tsx`, and `components/auth/guest-auth-old.tsx` were not treated as source of truth.
- Target-side implementation guidance is intentionally excluded.

## Mounted Auth Surface

| File | Symbol | What it does | Reuse | Uncertainty |
| --- | --- | --- | --- | --- |
| `app/layout.tsx` | `RootLayout` | Wraps the full app in `GuestAuthProvider`, then mounts `Navigation`, page content, `Footer`, and `Toaster`. Auth context is available app-wide from the root layout. | Conceptually reusable | Confirmed for the audited app shell only. No server middleware auth wrapper was found during this pass. |
| `components/auth/guest-auth-provider.tsx` | `GuestAuthProvider` | Owns auth state (`guest`, `isAuthenticated`, `isPending`, `isRestoringSession`), auth modal state, session restore, sign-in, sign-up, OTP verification, 2FA verification, forgot-password, Google redirect handoff, profile cache writes, and sign-out. | Conceptually reusable | Exact modal orchestration and toast copy are source-specific. |
| `components/auth/guest-auth-provider.tsx` | `useGuestAuth` | The app-wide hook consumed by navigation, profile, bookings, checkout, confirmation, pre-arrival, and guest hub gates. | Directly reusable | Confirmed in audited consumers only. |
| `components/auth/guest-auth-modal.tsx` | `GuestAuthModal` | Client-only modal UI for sign-in, sign-up, email OTP, 2FA OTP, forgot-password OTP, and Google auth entry. Validation happens client-side before provider actions fire. | Source-specific | UI structure is intentionally not a migration target. |
| `components/auth/guest-verification-banner.tsx` | `GuestVerificationBanner` | Shows a resend-and-verify prompt for authenticated guests whose `email_verified` flag is false. | Conceptually reusable | Mounted only on surfaces that explicitly render it, such as `app/profile/page.tsx` and `app/bookings/page.tsx`. |

## Auth State Ownership

| File | Symbol | What it does | Reuse | Uncertainty |
| --- | --- | --- | --- | --- |
| `components/auth/guest-auth-provider.tsx` | `AuthContextValue` | Exposes modal state plus `guest`, `isAuthenticated`, `isPending`, `isRestoringSession`, `openAuthModal`, `closeAuthModal`, `resendVerificationCode`, `updateGuestProfile`, and `signOut`. | Directly reusable | The exact context shape is source-specific, but the ownership boundary is clear and reusable. |
| `components/auth/guest-auth-provider.tsx` | `readCachedGuestProfile`, `writeCachedGuestProfile`, `clearCachedGuestProfile` | Keeps a cached guest profile in browser storage and merges local overrides into restored profile data. | Conceptually reusable | Confirmed only for browser storage; no server-side hydration was found. |
| `components/auth/guest-auth-provider.tsx` | `readProfileOverrides`, `mergeWithOverrides`, `updateGuestProfile` | Applies local profile edits to the in-memory guest object and cache without calling an audited profile-update API. | Source-specific | No backend profile update endpoint was found during this pass. |

## Auth Entry Points

| File | Symbol | What it does | Reuse | Uncertainty |
| --- | --- | --- | --- | --- |
| `components/marketing/navigation.tsx` | `Navigation` | Opens `openAuthModal("signin")` from desktop/mobile navigation when a guest hits auth-required links while signed out. Hides the global nav entirely on guest hub routes. | Conceptually reusable | The exact nav UI is source-specific. |
| `app/profile/page.tsx` | `ProfilePage` | If session restore completes and the guest is still signed out, opens the sign-in modal and then `router.replace("/")`. Also reuses the auth modal for password reset while editing profile details. | Conceptually reusable | This is a client guard, not a server route protection layer. |
| `app/bookings/page.tsx` | `BookingsPage` | Renders a sign-in-required state and opens `openAuthModal("signin")` for guests without an active auth session. | Conceptually reusable | Uses fallback booking summaries from `guest?.bookings` if present. |
| `components/booking/booking-checkout-page.tsx` | `handlePayment` | If checkout is started without an auth token, sets `resumePaymentAfterAuthRef.current = true`, opens the sign-in modal, and retries payment automatically after auth succeeds. | Directly reusable | Confirmed for the review/checkout page only. |
| `components/marketing/property.tsx` | `continueToCheckout` | If room selection is saved while signed out, persists a review resume intent, opens the sign-in modal, and resumes to `/bookingreview` after auth if the selection signature still matches. | Directly reusable | Confirmed for the nightly property flow only. |
| `components/guest/guest-route-gate.tsx` | `GuestHubEntryGate`, `GuestBookingGate`, `GuestLegacyRouteRedirect` | Enforces sign-in plus booking eligibility for guest hub routes and redirects legacy `/guest/*` paths into booking-scoped guest routes. | Conceptually reusable | Booking eligibility is affected by a temporary frontend override in `lib/guest-hub.ts`. |
| `components/booking/booking-confirmed-page.tsx` | `BookingConfirmedPage` | Requires auth for confirmation details; shows a sign-in CTA if the linked guest is signed out. | Conceptually reusable | Falls back to a locally stored confirmation snapshot when live fetch fails. |
| `components/booking/pre-arrival-page.tsx` | `PreArrivalPage` | Auto-opens the sign-in modal for signed-out guests who open web check-in and shows a sign-in-required shell until authenticated. | Conceptually reusable | Confirmed for pre-arrival/KYC only. |

## Auth API Contract Layer

| File | Symbol | What it does | Reuse | Uncertainty |
| --- | --- | --- | --- | --- |
| `lib/guest-auth-api.ts` | `sendOtp` | `POST /guest/auth/send-otp` for resend/verification flows. | Source-specific | Backend resend throttling rules are inferred only from mapped error messages. |
| `lib/guest-auth-api.ts` | `verifyOtp` | `POST /guest/auth/verify-otp` and returns `access_token` plus guest payload. | Conceptually reusable | Exact payload contract remains backend-specific. |
| `lib/guest-auth-api.ts` | `forgotPassword` | `POST /guest/auth/forgot-password` for reset OTP delivery. | Source-specific | Provider maps 503, 404, and Google-login-specific 400 cases into UI messages. |
| `lib/guest-auth-api.ts` | `resetPassword` | `POST /guest/auth/reset-password` and returns a fresh auth token on success. | Conceptually reusable | The provider redirects to `/` after success. |
| `lib/guest-auth-api.ts` | `verifyTwoFa` | `POST /guest/auth/verify-2fa` for login completion when `/guest/auth/login` returns `{ requires_2fa: true }`. | Conceptually reusable | Only the login flow is documented as returning the `requires_2fa` union. |
| `lib/guest-auth-api.ts` | `signupGuest` | `POST /guest/auth/signup` and can return `otp_sent` to branch the next UI step. | Conceptually reusable | The backend rule for when `otp_sent` is true vs false was not found during this pass. |
| `lib/guest-auth-api.ts` | `loginGuest` | `POST /guest/auth/login` and returns either `GuestAuthSuccessResponse` or `{ requires_2fa: true }`. | Conceptually reusable | Confirmed by provider branching logic. |
| `lib/guest-auth-api.ts` | `getGuestMe` | `GET /guest/auth/me` is the live validation path for session restore and Google callback validation. | Directly reusable | No refresh-token endpoint was found around it. |

## Protected And Guest-Only Route Behavior

| File | Symbol | What it does | Reuse | Uncertainty |
| --- | --- | --- | --- | --- |
| `app/profile/page.tsx` | `ProfilePage` | Client-protects `/profile` by redirecting home after opening sign-in when no session is present. | Conceptually reusable | No server guard or middleware was found for this route. |
| `app/bookings/page.tsx` | `BookingsPage` | Keeps `/bookings` mounted but shows a sign-in-required state when signed out. | Conceptually reusable | Uses client auth state only. |
| `app/guest/page.tsx` | `GuestPage` | Sends signed-in guests through `GuestHubEntryGate`, which finds the active booking-scoped guest hub destination. | Conceptually reusable | Eligibility rules depend on `lib/guest-hub.ts`. |
| `app/[bookingId]/guest/layout.tsx` | `ScopedGuestLayout` | Wraps booking-scoped guest routes in `GuestExperienceProvider(initialBookingId)` and `GuestBookingGate(bookingId)`. | Directly reusable | This is the main booking-scoped guest ownership boundary. |
| `app/guest/services/page.tsx` and related legacy guest pages | `GuestLegacyRouteRedirect` wrappers | Legacy `/guest/*` pages redirect into the active booking-scoped guest route when possible, else back to `/guest`. | Conceptually reusable | Confirmed for `services`, `addons`, `guide`, `checkout`, and `review` in this pass. |

## Auth Loading And Error Behavior

| File | Symbol | What it does | Reuse | Uncertainty |
| --- | --- | --- | --- | --- |
| `components/auth/guest-auth-provider.tsx` | `isRestoringSession` effect | On mount, reads stored token, optionally seeds cached guest data, validates the session with `/guest/auth/me`, and clears auth state if validation fails. | Directly reusable | No token refresh retry or silent re-auth logic was found. |
| `components/auth/guest-auth-provider.tsx` | `mapAuthErrorMessage` | Converts `ApiRequestError` status/messaging into user-facing auth copy for forgot-password, sign-in, 2FA, and reset-password flows. | Conceptually reusable | Mapping is source-specific to current backend messages/status codes. |
| `components/auth/guest-auth-provider.tsx` | `logAuthApiError` | Logs structured auth diagnostics to the browser console with `status`, `method`, `path`, parsed response, and context. | Directly reusable | Browser-console-only logging; no external telemetry sink was found. |
| `app/auth/google/error/google-auth-error-content.tsx` | `GoogleAuthErrorContent` | Renders callback failure states such as `callback_failed`, `auth_failed`, `missing_token`, and `session_validation_failed`. | Conceptually reusable | Uses `getPostAuthRedirect()` to build the retry/back link, which can be stale if the stored redirect no longer reflects the desired destination. |

## Not Found During This Pass

- No refresh-token API, cookie-based session layer, or background token renewal path was found in the audited auth files.
- No explicit logout API endpoint was found; sign-out is local storage cleanup inside `components/auth/guest-auth-provider.tsx`.
- No audited backend profile update API was found; `updateGuestProfile` writes local overrides only.
