# API Patterns

## Purpose

Document the source-verified auth-related API orchestration patterns used by `Vibehouse_frontend`.

## Status

Audited on 2026-05-21 from inspected source files only.

## Base HTTP Wrapper

| File path | Symbol | Confirmed behavior | Reuse |
| --- | --- | --- | --- |
| `lib/vibehouse-api.ts` | `getApiBaseUrl()` | Uses `NEXT_PUBLIC_API_BASE_URL`, falling back to `https://api.thedailysocial.co.in`. | Conceptually reusable |
| `lib/vibehouse-api.ts` | `requestJson<T>()` | Sends JSON requests with `Accept`, `Content-Type`, optional `Authorization: Bearer <token>`, and `cache: "no-store"`. | Directly reusable |
| `lib/vibehouse-api.ts` | `ApiRequestError` | Preserves `status`, parsed response `data`, `path`, and `method` for downstream UI mapping and logging. | Directly reusable |
| `lib/vibehouse-api.ts` | `parseApiError()` | Prefers backend `message` fields, including array messages, before using fallback copy. | Directly reusable |

## Auth Endpoint Surface

| Endpoint | File path | Symbol | Request shape visible in source | Response shape visible in source | Notes |
| --- | --- | --- | --- | --- | --- |
| `POST /guest/auth/send-otp` | `lib/guest-auth-api.ts` | `sendOtp` | `{ email: string }` | `{ message: string; expires_in_seconds: number }` | Used for verification resend. |
| `POST /guest/auth/verify-otp` | `lib/guest-auth-api.ts` | `verifyOtp` | `{ email: string; otp: string }` | `GuestAuthSuccessResponse` | Used for email verification. |
| `POST /guest/auth/forgot-password` | `lib/guest-auth-api.ts` | `forgotPassword` | `{ email: string }` | `{ message: string; expires_in_seconds: number }` | Starts reset-password OTP flow. |
| `POST /guest/auth/reset-password` | `lib/guest-auth-api.ts` | `resetPassword` | `{ email: string; otp: string; newPassword: string }` | `GuestAuthSuccessResponse` | Returns a fresh auth token on success. |
| `POST /guest/auth/verify-2fa` | `lib/guest-auth-api.ts` | `verifyTwoFa` | `{ email: string; otp: string }` | `GuestAuthSuccessResponse` | Completes login after `requires_2fa`. |
| `POST /guest/auth/signup` | `lib/guest-auth-api.ts` | `signupGuest` | `{ name: string; email: string; password: string; phone?: string }` | `GuestAuthSuccessResponse` | `otp_sent?: boolean` is visible in the type. |
| `POST /guest/auth/login` | `lib/guest-auth-api.ts` | `loginGuest` | `{ email: string; password: string }` | `GuestAuthResponse` | Union of token success or `{ requires_2fa: true }`. |
| `GET /guest/auth/me` | `lib/guest-auth-api.ts` | `getGuestMe` | Bearer token only | `GuestProfile` | Main session validation endpoint. |
| `GET /guest/auth/google` or configured same-origin equivalent | `lib/guest-auth-api.ts` | `getGuestGoogleAuthUrl` | Query param `return_to` when valid | Browser redirect, not parsed JSON | Frontend only builds the URL. |

## Response Types Visible In Source

| File path | Symbol | Visible shape |
| --- | --- | --- |
| `lib/guest-auth-api.ts` | `GuestAuthSuccessResponse` | `{ access_token: string; guest: GuestProfile; otp_sent?: boolean }` |
| `lib/guest-auth-api.ts` | `GuestLoginRequiresTwoFaResponse` | `{ requires_2fa: true }` |
| `lib/guest-auth-api.ts` | `GuestAuthResponse` | `GuestAuthSuccessResponse | GuestLoginRequiresTwoFaResponse` |
| `lib/guest-auth-api.ts` | `GuestProfile` | `id`, `name`, `email`, `phone`, `email_verified`, `phone_verified`, `two_fa_enabled?`, `profile_photo_url`, `created_at`, optional profile fields, optional `bookings` |
| `lib/guest-auth-api.ts` | `GuestBookingSummary` | booking-linked guest summary fields used by bookings and guest hub |

## Google OAuth URL And Callback Handling

| File path | Symbol | Confirmed behavior |
| --- | --- | --- |
| `lib/guest-auth-api.ts` | `resolveGoogleAuthBaseUrl()` | Builds Google auth base URL from API base plus `/guest/auth/google`, unless `NEXT_PUBLIC_GUEST_GOOGLE_AUTH_URL` resolves to the same API origin. |
| `lib/guest-auth-api.ts` | `normalizeRedirectPath()` | Restricts redirect values to same-origin absolute URLs or relative paths beginning with `/`. |
| `lib/guest-auth-api.ts` | `getGuestGoogleAuthUrl(returnTo?)` | Appends `return_to` only when the normalized path is valid and not `/`. |
| `app/auth/google/success/page.tsx` | callback finalizer | Parses callback query params, stores token, validates it via `/guest/auth/me`, and redirects or errors. |
| `app/auth/google/error/google-auth-error-content.tsx` | retry CTA | Reconstructs the Google auth URL from the remembered return path. |

## Error Normalization And User-Facing Mapping

| File path | Symbol | Confirmed behavior |
| --- | --- | --- |
| `lib/vibehouse-api.ts` | `ApiRequestError` | Shared structured error type used by auth logic. |
| `components/auth/guest-auth-provider.tsx` | `mapAuthErrorMessage()` | Maps status/message combinations into UI-safe auth copy for forgot-password, sign-in email send failure, verify-2FA, and reset-password flows. |
| `components/auth/guest-auth-provider.tsx` | `logAuthApiError()` | Logs structured auth diagnostics to the browser console, including `status`, `method`, `path`, parsed response, and context. |
| `components/auth/guest-auth-modal.tsx` | local validation branches | Handles format and password validation before network calls are made. |

## Retry, Refresh, And Logout Behavior

| Concern | Confirmed behavior |
| --- | --- |
| Request retries | `lib/vibehouse-api.ts` does not implement retry, backoff, or interceptor logic. |
| Refresh token | Not found during this pass. |
| Silent re-auth | Not found during this pass. |
| Logout endpoint | Not found during this pass. Provider sign-out is local cleanup only. |
| Session validation | Uses `GET /guest/auth/me` from `components/auth/guest-auth-provider.tsx` and `app/auth/google/success/page.tsx`. |

## Auth / Booking Coupling Risks In The API Layer

- `lib/guest-auth-api.ts` exposes `GuestProfile.bookings?`, and multiple route guards depend on those booking summaries being present in auth state.
- `components/auth/guest-auth-provider.tsx` falls back to the auth response `guest` payload when `/guest/auth/me` fails after a successful sign-in or sign-up call, so UI state can proceed even when the refresh fetch fails.
- `app/bookings/page.tsx`, `components/guest/guest-route-gate.tsx`, and `state/guest-experience-provider.tsx` depend on the auth payload shape including booking-linked guest data.

## Not Found During This Pass

- Request interceptor stack: Not found during this pass.
- Exponential backoff or automatic retry policy: Not found during this pass.
- Cookie-session exchange around auth endpoints: Not found during this pass.
- Dedicated refresh-session endpoint: Not found during this pass.
- Dedicated logout endpoint: Not found during this pass.
