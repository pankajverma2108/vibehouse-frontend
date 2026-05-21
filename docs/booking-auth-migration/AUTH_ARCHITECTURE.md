# Auth Architecture

## Purpose

Document the source-verified authentication architecture used by `Vibehouse_frontend` for migration reference.

## Status

Audited on 2026-05-21 from inspected source files only.

## Audit Scope Notes

- This pass covers mounted auth/session behavior that is reachable from the live app shell.
- Historical or backup files were excluded as source of truth unless a live import proved otherwise.
- Excluded during this pass: `app/profile/page-old.tsx`, `app/profile/page-backup.tsx`, `components/auth/guest-auth-old.tsx`, and unreferenced `components/booking/booking-confirmed-page.head.tsx`.
- Target-side Buteak implementation planning is intentionally out of scope.

## Mounted Auth Surface

| File path | Symbol | Confirmed behavior | Route or modal behavior | Reuse |
| --- | --- | --- | --- | --- |
| `app/layout.tsx` | `RootLayout` | Wraps the full app in `GuestAuthProvider`, then mounts `Navigation`, page content, `Footer`, and `Toaster`. | Global route shell | Conceptually reusable |
| `components/auth/guest-auth-provider.tsx` | `GuestAuthProvider` | Owns auth state, modal state, session restore, sign-in, sign-up, verify-email OTP, forgot-password OTP, verify-2FA, Google redirect handoff, cached guest profile writes, local profile overrides, and local sign-out cleanup. | Provider plus modal owner | Conceptually reusable |
| `components/auth/guest-auth-provider.tsx` | `useGuestAuth` | Exposes `guest`, `isAuthenticated`, `isPending`, `isRestoringSession`, `openAuthModal`, `closeAuthModal`, `resendVerificationCode`, `updateGuestProfile`, and `signOut`. | App-wide hook | Directly reusable |
| `components/auth/guest-auth-modal.tsx` | `GuestAuthModal` | Renders the mounted auth UI for `signin`, `signup`, `verify-otp`, `verify-2fa`, `forgot-password`, and `forgot-password-otp`. | Modal | Source-specific |
| `components/auth/guest-verification-banner.tsx` | `GuestVerificationBanner` | Reopens the auth modal in `verify-otp` mode and can resend verification OTP for authenticated guests whose `guest.email_verified` is false. | Inline page banner plus modal trigger | Conceptually reusable |

## Providers, Contexts, Hooks, And State Ownership

| File path | Symbol | Confirmed ownership | Reuse | Notes |
| --- | --- | --- | --- | --- |
| `components/auth/guest-auth-provider.tsx` | `AuthContextValue` | Central auth state contract for modal visibility, auth mode, guest object, pending state, session-restore state, resend action, local profile update, and sign-out. | Directly reusable | No reducer was found during this pass. |
| `components/auth/guest-auth-provider.tsx` | `guest`, `isPending`, `isRestoringSession`, `errorMessage`, `mode`, `isModalOpen` state | Auth state lives in provider-local `useState` calls, not Redux/Zustand/Reducer. | Conceptually reusable | State transitions are provider callbacks, not dispatched actions. |
| `components/auth/guest-auth-provider.tsx` | `readCachedGuestProfile`, `writeCachedGuestProfile`, `clearCachedGuestProfile` | Own cached guest profile storage and storage-family selection. | Directly reusable | Cache location follows token location. |
| `components/auth/guest-auth-provider.tsx` | `readProfileOverrides`, `mergeWithOverrides`, `updateGuestProfile` | Owns local-only profile overrides layered on top of backend guest data. | Source-specific | No audited profile update API was found. |
| `state/guest-experience-provider.tsx` | `GuestExperienceProvider` | Derives `selectedBookingId` from `useGuestAuth().guest.bookings` or `initialBookingId`. | Conceptually reusable | This is auth-adjacent, not the primary auth owner. |
| `state/guest-experience-provider.tsx` | `useGuestExperience` | Guest-hub modules depend on auth-derived booking identity through `selectedBookingId`. | Conceptually reusable | This is one of the main auth-to-booking coupling surfaces. |

## Visible Guest Object Shape

| File path | Symbol | Visible fields |
| --- | --- | --- |
| `lib/guest-auth-api.ts` | `GuestProfile` | `id`, `name`, `email`, `phone`, `email_verified`, `phone_verified`, `two_fa_enabled?`, `profile_photo_url`, `created_at`, `birthDate?`, `location?`, `nationality?`, `emergencyContact?`, `gender?`, `prefersEmail?`, `prefersPhone?`, `bookings?` |
| `lib/guest-auth-api.ts` | `GuestBookingSummary` | `ezee_reservation_id`, `role`, `status`, `checkin_date`, `checkout_date`, `room_type_name`, `room_number?`, `property_name?`, `property_id`, `door_passcode?`, `lock_status?` |

## Authentication Entry Points

| File path | Symbol | Trigger behavior | Route or modal behavior | Reuse |
| --- | --- | --- | --- | --- |
| `components/marketing/navigation.tsx` | top-right sign-in button | Calls `openAuthModal("signin")` when the guest is signed out. | Modal | Conceptually reusable |
| `components/marketing/navigation.tsx` | auth-required nav links | Prevents navigation for links marked `requiresAuth` and opens `openAuthModal("signin")` instead. | Modal gate on navigation | Directly reusable |
| `components/marketing/navigation.tsx` | profile menu logout | Calls `signOut()` from the signed-in profile menu. | Local sign-out action | Directly reusable |
| `components/auth/guest-auth-modal.tsx` | Google CTA | Calls provider-owned `onGoogleAuth`. | Modal-to-route handoff | Directly reusable |
| `components/auth/guest-auth-modal.tsx` | forgot-password CTA | Switches modal mode to `forgot-password`. | Modal | Conceptually reusable |
| `components/auth/guest-verification-banner.tsx` | Verify Now / Resend code | Reopens `verify-otp` mode or resends verification code for signed-in guests. | Banner plus modal | Conceptually reusable |
| `app/profile/page.tsx` | profile route entry | If restore completes and the guest is still signed out, opens `openAuthModal("signin")` and then `router.replace("/")`. | Client route gate plus modal | Conceptually reusable |
| `app/profile/page.tsx` | Reset Password buttons | Calls `openAuthModal("forgot-password")` from profile edit surfaces. | Modal | Conceptually reusable |
| `app/bookings/page.tsx` | bookings route entry | Signed-out guests remain on `/bookings` but get a sign-in-required state with CTA to `openAuthModal("signin")`. | Soft client gate plus modal | Conceptually reusable |
| `components/marketing/property.tsx` | nightly booking review handoff | Saves room selection and review resume intent, then opens `openAuthModal("signin")` if the guest is signed out. | Modal plus resume intent | Directly reusable |
| `components/colive/colive-flow.tsx` | Colive review handoff | Saves Colive review resume intent, then opens `openAuthModal("signin")` if the guest is signed out. | Modal plus resume intent | Directly reusable |
| `components/booking/booking-checkout-page.tsx` | checkout payment start | If no auth token is present, marks `resumePaymentAfterAuthRef` and opens `openAuthModal("signin")`. | Modal plus in-page resume flag | Directly reusable |
| `components/booking/booking-confirmed-page.tsx` | confirmation gate CTA | Signed-out guests see a confirmation access gate with CTA to `openAuthModal("signin")`. | Soft client gate plus modal | Conceptually reusable |
| `components/booking/pre-arrival-page.tsx` | web check-in entry | Auto-opens `openAuthModal("signin")` once restore completes and the guest is still signed out. | Client route gate plus modal | Directly reusable |
| `components/guest/guest-access-state.tsx` | guest hub sign-in CTA | Used by guest-hub gate states when `showSignIn` is true. | CTA inside gate state | Conceptually reusable |
| `components/guest/guest-route-gate.tsx` | `GuestHubEntryGate` | Shows a sign-in-required guest-hub access state when not authenticated. | Soft client gate | Conceptually reusable |
| `components/guest/guest-route-gate.tsx` | `GuestBookingGate` | Shows a sign-in-required booking-scoped guest-hub access state when not authenticated. | Soft client gate | Conceptually reusable |
| `modules/guest/dashboard.tsx` | lost-and-found submission | Opens `openAuthModal("signin")` if a signed-in session is required for a guest-hub action. | Module action gate | Source-specific |
| `modules/guest/services.tsx` | service request | Opens `openAuthModal("signin")` if service request is attempted without auth. | Module action gate | Source-specific |
| `modules/guest/addons.tsx` | add-on / rentals mutations | Requires both `selectedBookingId` and auth token, otherwise opens `openAuthModal("signin")`. | Module action gate | Source-specific |
| `modules/guest/checkout.tsx` | guest-hub checkout payment | Requires auth token and opens `openAuthModal("signin")` when missing. | Module action gate | Source-specific |
| `app/auth/google/success/page.tsx` | Google success route | Finalizes token restore and redirects after callback success. | Route | Directly reusable |
| `app/auth/google/error/google-auth-error-content.tsx` | Google error route | Renders callback error state and offers a Google retry CTA. | Route | Conceptually reusable |

## Protected, Guest-Only, And Soft-Gate Behavior

| File path | Symbol | Confirmed behavior | Reuse | Notes |
| --- | --- | --- | --- | --- |
| `app/profile/page.tsx` | `ProfilePage` | Client-protects `/profile` by opening sign-in and redirecting home if restore completes without auth. | Conceptually reusable | No middleware or server guard found. |
| `app/bookings/page.tsx` | `BookingsPage` | Keeps the route mounted and shows a sign-in-required page state while signed out. | Conceptually reusable | This is a soft gate, not a redirect. |
| `app/guest/page.tsx` | `GuestPage` | Routes through `GuestHubEntryGate` to locate the active booking-scoped guest hub destination. | Conceptually reusable | Depends on guest booking state. |
| `app/[bookingId]/guest/layout.tsx` | `ScopedGuestLayout` | Wraps booking-scoped guest pages in `GuestExperienceProvider(initialBookingId)` and `GuestBookingGate(bookingId)`. | Directly reusable | Main booking-scoped guest ownership boundary. |
| `app/guest/services/page.tsx` and related legacy guest pages | `GuestLegacyRouteRedirect` wrappers | Redirect legacy `/guest/*` routes to the active booking-scoped guest route when possible, otherwise back to `/guest`. | Conceptually reusable | Confirmed for `services`, `addons`, `guide`, `checkout`, `review`, `borrow`, `extend`, and `lost-found`. |

## Auth State Dependency Map

```text
app/layout.tsx
  -> GuestAuthProvider
     -> GuestAuthModal
     -> useGuestAuth()
        -> navigation auth CTA / logout
        -> profile route gate and reset-password CTA
        -> bookings soft gate
        -> property and Colive auth resume handoff
        -> booking review payment resume
        -> confirmation gate
        -> pre-arrival gate
        -> guest route gates
        -> guest-hub action modules

GuestAuthProvider.guest
  -> guest.bookings
     -> GuestHubEntryGate
     -> GuestBookingGate
     -> GuestExperienceProvider.selectedBookingId
        -> guest dashboard / services / addons / checkout
```

## Risk Analysis

- `components/auth/guest-auth-provider.tsx`: `updateGuestProfile()` writes local overrides into `vh_guest_profile_overrides` and cached guest state without an audited profile update endpoint. Copying this blindly would copy source-specific local-only behavior.
- `components/auth/guest-auth-provider.tsx` and `lib/guest-auth-api.ts`: auth restoration depends on browser storage plus `/guest/auth/me`. There is no confirmed refresh-token or logout API lifecycle in source, so the current model is tightly coupled to bearer-token persistence.
- `components/marketing/property.tsx`, `components/colive/colive-flow.tsx`, and `components/booking/booking-checkout-page.tsx`: auth is coupled to booking progress through separate resume mechanisms, not one global post-auth restore contract.
- `components/guest/guest-route-gate.tsx` and `state/guest-experience-provider.tsx`: guest-hub eligibility and selected booking state depend on `guest.bookings` being available in auth state. Any migration that changes the shape or timing of booking hydration risks breaking guest-hub routing.
- `app/profile/page.tsx` and `app/bookings/page.tsx`: route protection is client-side and inconsistent by route type. Some routes redirect, some render a soft gate, and some open the modal automatically.
- `app/auth/google/success/page.tsx` and `app/auth/google/error/google-auth-error-content.tsx`: Google callback completion depends on callback query params plus the locally remembered redirect path. The redirect store is source-specific and should not be copied blindly without validating the target route model.

## Not Found During This Pass

- No server middleware or formal server-side protected-route system was found during this pass.
- No refresh-token endpoint, token rotation flow, or background re-auth flow was found during this pass.
- No cookie-backed auth session layer or backend session-cookie exchange was found during this pass.
- No audited logout API endpoint was found during this pass.
- No audited backend profile update endpoint was found during this pass.
