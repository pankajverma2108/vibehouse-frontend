# Auth Flow Map

## Purpose

Document the source-verified authentication flow map used by `Vibehouse_frontend`.

## Status

Audited on 2026-05-21 from inspected source files only.

## Flow 1: Email Sign-Up

- Evidence: `components/auth/guest-auth-modal.tsx`, `components/auth/guest-auth-provider.tsx`, `lib/guest-auth-api.ts`
- Confirmed sequence:
  1. `components/auth/guest-auth-modal.tsx` validates full name, email, password, phone, and terms acceptance before calling provider sign-up.
  2. `components/auth/guest-auth-provider.tsx` -> `onSignUp()` calls `lib/guest-auth-api.ts` -> `signupGuest(payload)`.
  3. On success, `components/auth/guest-auth-provider.tsx` stores `response.access_token` through `setStoredGuestToken(response.access_token)`.
  4. `components/auth/guest-auth-provider.tsx` then calls `getGuestMe(response.access_token).catch(() => response.guest)` and writes the resulting guest into provider state plus cache.
  5. If `response.otp_sent` is truthy, the provider keeps auth open and switches mode to `verify-otp`; otherwise it closes the modal immediately.
- Reuse: Conceptually reusable
- Uncertainty: The backend rule that determines when `otp_sent` is returned was not found during this pass.

```text
GuestAuthModal(signup submit)
  -> GuestAuthProvider.onSignUp()
     -> POST /guest/auth/signup
     -> setStoredGuestToken(access_token)
     -> GET /guest/auth/me
        -> success: guest state + cache updated
        -> failure: fallback to signup response guest
     -> otp_sent ? mode=verify-otp : close modal
```

## Flow 2: Email Sign-In

- Evidence: `components/auth/guest-auth-modal.tsx`, `components/auth/guest-auth-provider.tsx`, `lib/guest-auth-api.ts`
- Confirmed sequence:
  1. `components/auth/guest-auth-modal.tsx` validates email/password before submit.
  2. `components/auth/guest-auth-provider.tsx` -> `onSignIn()` calls `loginGuest({ email, password })`.
  3. If the response contains `requires_2fa`, control moves to Flow 3.
  4. Otherwise `setStoredGuestToken(response.access_token, rememberMe)` stores the token in localStorage or sessionStorage.
  5. The provider then calls `getGuestMe(response.access_token).catch(() => response.guest)`, updates guest state and cache, clears restore state, shows success toast, and closes the modal.
- Reuse: Directly reusable
- Uncertainty: None in the audited frontend path.

## Flow 3: Login 2FA OTP

- Evidence: `components/auth/guest-auth-provider.tsx`, `components/auth/guest-auth-modal.tsx`, `lib/guest-auth-api.ts`
- Confirmed sequence:
  1. `lib/guest-auth-api.ts` allows `loginGuest()` to return either `GuestAuthSuccessResponse` or `{ requires_2fa: true }`.
  2. `components/auth/guest-auth-provider.tsx` detects `"requires_2fa" in response`, switches mode to `verify-2fa`, and shows a toast that the code was sent.
  3. `components/auth/guest-auth-modal.tsx` collects the 6-digit OTP and calls provider `onVerifyTwoFa()`.
  4. `components/auth/guest-auth-provider.tsx` -> `verifyTwoFa(payload)` stores the returned token, validates it with `getGuestMe()`, updates guest state, and closes the modal.
- Reuse: Conceptually reusable
- Uncertainty: No dedicated resend-2FA endpoint was found during this pass. The modal tells the guest to sign in again to request a fresh code.

## Flow 4: Email Verification OTP

- Evidence: `components/auth/guest-verification-banner.tsx`, `components/auth/guest-auth-provider.tsx`, `components/auth/guest-auth-modal.tsx`, `lib/guest-auth-api.ts`
- Confirmed sequence:
  1. `components/auth/guest-verification-banner.tsx` renders only when `isAuthenticated` is true and `guest.email_verified` is false.
  2. Banner CTA opens the auth modal in `verify-otp` mode through `openAuthModal("verify-otp")`.
  3. Resend calls provider `resendVerificationCode(email)` which delegates to `sendOtp({ email })`.
  4. OTP submit calls provider `onVerifyOtp()`, which sends `verifyOtp({ email, otp })`, stores the fresh token, revalidates with `getGuestMe()`, updates guest state, and closes the modal.
- Reuse: Conceptually reusable
- Uncertainty: No separate verify-email route was found during this pass. Email verification is modal-driven.

## Flow 5: Forgot Password And Reset Password

- Evidence: `components/auth/guest-auth-modal.tsx`, `components/auth/guest-auth-provider.tsx`, `app/profile/page.tsx`, `lib/guest-auth-api.ts`
- Confirmed sequence:
  1. `components/auth/guest-auth-modal.tsx` exposes a forgot-password switch from sign-in mode.
  2. `app/profile/page.tsx` can also open the same flow through `openAuthModal("forgot-password")`.
  3. Provider `onForgotPassword()` calls `forgotPassword({ email })` and switches modal mode to `forgot-password-otp`.
  4. `components/auth/guest-auth-modal.tsx` collects OTP plus new password and calls provider `onResetPassword()`.
  5. Provider `onResetPassword()` calls `resetPassword(payload)`, stores the returned token, revalidates with `getGuestMe()`, closes the modal, and then hard redirects to `/`.
- Reuse: Conceptually reusable
- Uncertainty: No dedicated reset-password route or in-session change-password endpoint was found during this pass.

## Flow 6: Google OAuth Success

- Evidence: `components/auth/guest-auth-provider.tsx`, `lib/guest-auth-api.ts`, `app/auth/google/success/page.tsx`
- Confirmed sequence:
  1. `components/auth/guest-auth-provider.tsx` -> `onGoogleAuth()` stores the current relative path with `rememberPostAuthRedirect()` and builds a same-origin Google auth URL with `getGuestGoogleAuthUrl(returnPath)`.
  2. The browser is redirected to the backend Google auth URL.
  3. `app/auth/google/success/page.tsx` reads callback query params.
  4. If a token is present, the page stores it with `setStoredGuestToken(token, true)`.
  5. `app/auth/google/success/page.tsx` validates the token with `getGuestMe(token)`.
  6. On success, the page redirects to `consumePostAuthRedirect()` first, then a valid `return_to`, then `/`.
- Reuse: Directly reusable
- Uncertainty: Backend-side OAuth exchange details are out of repo scope.

```text
modal Google CTA
  -> rememberPostAuthRedirect()
  -> getGuestGoogleAuthUrl(return_to)
  -> browser leaves app
  -> /auth/google/success
     -> token present?
        no  -> /auth/google/error?reason=missing_token
        yes -> setStoredGuestToken(token, true)
             -> GET /guest/auth/me
                -> success: redirect to consumed stored path or return_to
                -> failure: clear token and redirect to error page
```

## Flow 7: Google OAuth Error

- Evidence: `app/auth/google/success/page.tsx`, `app/auth/google/error/google-auth-error-content.tsx`
- Confirmed sequence:
  1. `app/auth/google/success/page.tsx` treats callback `reason` or `error` query params as callback failure and redirects to `/auth/google/error`.
  2. Missing token redirects to `/auth/google/error?reason=missing_token`.
  3. Failed `/guest/auth/me` validation clears the token and redirects to `/auth/google/error?reason=session_validation_failed`.
  4. `app/auth/google/error/google-auth-error-content.tsx` renders the mapped reason state and offers a retry CTA that rebuilds the Google auth URL using the remembered return path.
- Reuse: Conceptually reusable
- Uncertainty: `app/auth/google/error/google-auth-error-content.tsx` reads `getPostAuthRedirect()` rather than consuming it, so the retry/back link remains coupled to the current stored redirect behavior.

## Flow 8: Session Restore On App Load

- Evidence: `app/layout.tsx`, `components/auth/guest-auth-provider.tsx`, `lib/guest-auth-api.ts`
- Confirmed sequence:
  1. `app/layout.tsx` mounts `GuestAuthProvider` once around the full app shell.
  2. On first client mount, `components/auth/guest-auth-provider.tsx` reads `getStoredGuestToken()`.
  3. If no token exists, it clears cached guest profile and ends restore with `guest = null`.
  4. If a token exists, it first reads cached guest data from `readCachedGuestProfile()`.
  5. It then validates the session with `getGuestMe(token)`.
  6. Success updates guest state and cache. Failure clears stored token and cached guest profile.
- Reuse: Directly reusable
- Uncertainty: Refresh-token behavior was not found during this pass.

## Flow 9: Logout

- Evidence: `components/auth/guest-auth-provider.tsx`, `components/marketing/navigation.tsx`, `app/profile/page.tsx`
- Confirmed sequence:
  1. Logout CTA in navigation and profile calls provider `signOut()`.
  2. `components/auth/guest-auth-provider.tsx` clears stored token, cached guest profile, and `vh_guest_profile_overrides`.
  3. Provider sets `guest` to `null`.
- Reuse: Directly reusable
- Uncertainty: No logout API request was found during this pass.

## Flow 10: Profile / Bookings / Guest-Hub Access

- Evidence: `app/profile/page.tsx`, `app/bookings/page.tsx`, `components/guest/guest-route-gate.tsx`, `app/[bookingId]/guest/layout.tsx`
- Confirmed behavior:
  - `app/profile/page.tsx`: signed-out access opens the sign-in modal and then redirects to `/`.
  - `app/bookings/page.tsx`: signed-out access keeps the route mounted and renders a sign-in-required state.
  - `components/guest/guest-route-gate.tsx`: guest-hub access uses soft gates driven by `isAuthenticated`, `guest.bookings`, and booking eligibility.
  - `app/[bookingId]/guest/layout.tsx`: booking-scoped guest routes wrap children in `GuestBookingGate`.
- Reuse: Conceptually reusable
- Uncertainty: No formal middleware-based protected-route system was found during this pass.

## Flow 11: Booking-Specific Auth Resume

- Evidence: `components/marketing/property.tsx`, `components/colive/colive-flow.tsx`, `components/booking/booking-checkout-page.tsx`, `lib/guest-auth-api.ts`
- Confirmed behavior:
  - `components/marketing/property.tsx`: saves review resume intent and opens sign-in before `/bookingreview`.
  - `components/colive/colive-flow.tsx`: does the same for Colive review.
  - `components/booking/booking-checkout-page.tsx`: uses `resumePaymentAfterAuthRef` to retry payment after auth completes.
  - `lib/guest-auth-api.ts`: separately stores a generic post-auth redirect path via `rememberPostAuthRedirect()`.
- Reuse: Directly reusable
- Uncertainty: There is no single global auth-restoration contract. Booking review resume and generic post-auth redirect are separate mechanisms.

## Redirect Restoration Map

```text
openAuthModal()
  -> rememberPostAuthRedirect(current relative path)
  -> auth modal flow
     -> local sign-in/sign-up/verify path closes modal in place
     -> Google path leaves app and later consumes stored redirect

nightly property review
  -> saveReviewResumeIntent()
  -> openAuthModal("signin")
  -> after auth, property page effect compares saved signature
  -> router.push("/bookingreview") only if context still matches

Colive review
  -> saveReviewResumeIntent()
  -> openAuthModal("signin")
  -> after auth, Colive effect compares saved signature
  -> router.push("/bookingreview") only if context still matches

booking checkout payment
  -> resumePaymentAfterAuthRef = true
  -> openAuthModal("signin")
  -> post-auth effect reruns handlePayment()
```

## Anonymous And Guest Behavior

- `components/marketing/navigation.tsx`: signed-out guests can browse marketing routes and trigger auth only when a protected CTA is used.
- `components/marketing/property.tsx` and `components/colive/colive-flow.tsx`: signed-out guests can build a room selection before auth is required for review.
- `app/bookings/page.tsx`, `components/booking/booking-confirmed-page.tsx`, `components/booking/pre-arrival-page.tsx`, and guest-hub gates all confirm that booking-linked guest flows require an authenticated guest session before full access.

## Not Found During This Pass

- Refresh-token behavior: Not found during this pass.
- Cookie-backed session exchange: Not found during this pass.
- Separate passwordless login flow: Not found during this pass.
- Separate email-verification route outside the auth modal: Not found during this pass.
- Formal middleware-based protected-route system: Not found during this pass.
