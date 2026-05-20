# Auth Flow Map

## Purpose

Document the audited authentication flow map used by `Vibehouse_frontend` for migration reference.

## Status

Audited on 2026-05-20 from live source files only.

## Flow 1: Email Sign-Up

- Evidence: `components/auth/guest-auth-provider.tsx` -> `onSignUp`, `components/auth/guest-auth-modal.tsx` -> `onSubmit`, `lib/guest-auth-api.ts` -> `signupGuest`, `getGuestMe`
- Sequence:
  1. `GuestAuthModal` validates name, email, password, optional phone, and terms acceptance client-side.
  2. `onSignUp` calls `signupGuest(payload)`.
  3. On success, the provider stores `access_token` in localStorage via `setStoredGuestToken(response.access_token)`.
  4. The provider prefers `getGuestMe(response.access_token)` for the live guest payload and falls back to `response.guest` if `/guest/auth/me` fails.
  5. If `response.otp_sent` is true, auth remains open and mode switches to `verify-otp`; otherwise the modal closes immediately.
- Reuse: Conceptually reusable
- Uncertainty: The backend rule that decides whether `otp_sent` is returned was not found during this pass.

## Flow 2: Email Sign-In Without 2FA

- Evidence: `components/auth/guest-auth-provider.tsx` -> `onSignIn`, `lib/guest-auth-api.ts` -> `loginGuest`, `getGuestMe`
- Sequence:
  1. `GuestAuthModal` validates email/password format.
  2. `onSignIn` calls `loginGuest({ email, password })`.
  3. If the response includes an auth token, the provider stores it in localStorage or sessionStorage based on `rememberMe`.
  4. The provider refreshes guest data with `/guest/auth/me`, falling back to `response.guest` if needed.
  5. Auth state updates, cache is written, a success toast is shown, and the modal closes.
- Reuse: Directly reusable
- Uncertainty: None in the audited source path.

## Flow 3: Email Sign-In With 2FA

- Evidence: `components/auth/guest-auth-provider.tsx` -> `onSignIn`, `onVerifyTwoFa`; `lib/guest-auth-api.ts` -> `loginGuest`, `verifyTwoFa`
- Sequence:
  1. `loginGuest` may return `{ requires_2fa: true }` instead of an auth token.
  2. The provider switches modal mode to `verify-2fa` and shows a success toast that the OTP was sent.
  3. `GuestAuthModal` collects a 6-digit code and calls `onVerifyTwoFa`.
  4. `verifyTwoFa` returns an auth token, which is stored and validated via `/guest/auth/me`.
  5. Auth state updates and the modal closes.
- Reuse: Conceptually reusable
- Uncertainty: No separate resend endpoint for 2FA was found; the modal tells the guest to sign in again to request a fresh code.

## Flow 4: Email Verification And Resend

- Evidence: `components/auth/guest-verification-banner.tsx`, `components/auth/guest-auth-provider.tsx` -> `onSendOtp`, `components/auth/guest-auth-modal.tsx` -> `onResendOtp`
- Sequence:
  1. When `guest.email_verified` is false, `GuestVerificationBanner` renders on pages that mount it.
  2. "Verify Now" reopens the auth modal in `verify-otp` mode.
  3. Resend actions call `sendOtp({ email })` through `resendVerificationCode`.
  4. `verifyOtp` returns a new auth token and refreshes `guest`.
- Reuse: Conceptually reusable
- Uncertainty: Server-side resend throttling behavior is only exposed through frontend message mapping, not a documented contract in this repo.

## Flow 5: Forgot Password And Reset

- Evidence: `components/auth/guest-auth-provider.tsx` -> `onForgotPassword`, `onResetPassword`; `components/auth/guest-auth-modal.tsx` -> `switchMode("forgot-password")`; `lib/guest-auth-api.ts` -> `forgotPassword`, `resetPassword`
- Sequence:
  1. Guests enter forgot-password mode from the sign-in modal or from `/profile` via `openAuthModal("forgot-password")`.
  2. `forgotPassword({ email })` sends the reset OTP and moves modal mode to `forgot-password-otp`.
  3. The modal collects OTP plus new password and calls `resetPassword`.
  4. On success, the provider stores the new auth token, refreshes guest data, closes the modal, and hard redirects to `/`.
- Reuse: Conceptually reusable
- Uncertainty: There is no separate audited password-reset route outside the modal-driven flow.

## Flow 6: Google OAuth Callback

- Evidence: `components/auth/guest-auth-provider.tsx` -> `onGoogleAuth`; `lib/guest-auth-api.ts` -> `getGuestGoogleAuthUrl`, `rememberPostAuthRedirect`, `consumePostAuthRedirect`; `app/auth/google/success/page.tsx`
- Sequence:
  1. `onGoogleAuth` stores the current path via `rememberPostAuthRedirect()`, derives `return_to`, and sends the browser to the Google auth URL.
  2. `app/auth/google/success/page.tsx` reads callback params.
  3. If `reason` or `error` is present, the page redirects to `/auth/google/error?...`.
  4. If no token is present, the page redirects to the error page with `missing_token`.
  5. If a token is present, it is stored persistently via `setStoredGuestToken(token, true)`.
  6. The callback validates the token with `/guest/auth/me`.
  7. On success, the page redirects to the consumed stored redirect, then `return_to`, then `/`.
  8. On `/guest/auth/me` failure, the token is cleared and the page redirects to `/auth/google/error?reason=session_validation_failed`.
- Reuse: Directly reusable
- Uncertainty: The backend Google auth handshake itself is out of repo scope; only the frontend callback handling is audited here.

## Flow 7: Session Restore On App Load

- Evidence: `components/auth/guest-auth-provider.tsx` -> mount `useEffect`, `lib/guest-auth-api.ts` -> `getStoredGuestToken`
- Sequence:
  1. On first mount, `GuestAuthProvider` reads a stored token from localStorage or sessionStorage.
  2. If no token exists, cached profile state is cleared and `isRestoringSession` becomes false.
  3. If a token exists, cached profile data is applied first if present.
  4. The provider validates the token via `getGuestMe(token)`.
  5. On success, guest state/cache update; on failure, token and cached profile are cleared.
- Reuse: Directly reusable
- Uncertainty: No silent refresh or background re-auth path was found.

## Flow 8: Sign-Out

- Evidence: `components/auth/guest-auth-provider.tsx` -> `signOut`, `components/marketing/navigation.tsx` -> profile menu logout
- Sequence:
  1. UI triggers `signOut()`.
  2. Provider clears the stored token, cached profile, and local profile overrides.
  3. `guest` becomes `null`.
- Reuse: Directly reusable
- Uncertainty: No logout API request was found during this pass.

## Post-Auth Route Restoration

| File | Symbol | What it does | Reuse | Uncertainty |
| --- | --- | --- | --- | --- |
| `lib/guest-auth-api.ts` | `rememberPostAuthRedirect` | Stores the current path in sessionStorage and localStorage after sanitizing it to same-origin relative paths. | Directly reusable | Confirmed for auth modal and Google auth entry only. |
| `lib/guest-auth-api.ts` | `consumePostAuthRedirect` | Reads and clears the stored redirect after successful Google callback or other restore logic. | Directly reusable | None in the audited helper. |
| `components/marketing/property.tsx` | `saveReviewResumeIntent`, `consumeReviewResumeIntent` usage | Separately restores a post-auth return into `/bookingreview` only if the saved room-selection signature still matches the current context. | Directly reusable | This is booking-specific, not a global auth redirect. |
| `components/booking/booking-checkout-page.tsx` | `resumePaymentAfterAuthRef` | Retries `handlePayment()` after auth completes if the guest attempted to pay while signed out. | Directly reusable | Confirmed only for the booking review page. |

## Not Found During This Pass

- No auth middleware or server-side protected-route layer was found.
- No dedicated "refresh session" route or token rotation flow was found.
