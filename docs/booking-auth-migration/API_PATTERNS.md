# API Patterns

## Purpose

Document the audited API orchestration patterns used by `Vibehouse_frontend` for auth and booking migration reference.

## Status

Audited on 2026-05-20 from live source files only.

## Base HTTP Wrapper

| File | Symbol | What it does | Reuse | Uncertainty |
| --- | --- | --- | --- | --- |
| `lib/vibehouse-api.ts` | `getApiBaseUrl` | Resolves `NEXT_PUBLIC_API_BASE_URL`, falling back to `https://api.thedailysocial.co.in`. | Conceptually reusable | The default hostname is source-specific. |
| `lib/vibehouse-api.ts` | `requestJson<T>` | Adds JSON headers, optional `Authorization: Bearer <token>`, forces `cache: "no-store"`, parses JSON if possible, and throws `ApiRequestError` on non-2xx responses. | Directly reusable | Only supports `GET`, `POST`, `PATCH`, and `DELETE` in the audited helper signature. |
| `lib/vibehouse-api.ts` | `ApiRequestError` | Preserves `status`, parsed response `data`, `path`, and `method` for UI mapping and console diagnostics. | Directly reusable | No interceptor chain or retry metadata exists around it. |
| `lib/vibehouse-api.ts` | `parseApiError` | Prefers a backend `message` field, including array messages, before falling back to a caller-supplied string. | Directly reusable | None in the audited helper. |

## Auth Endpoints

| Endpoint | File | Symbol | Pattern | Reuse | Uncertainty |
| --- | --- | --- | --- | --- | --- |
| `POST /guest/auth/send-otp` | `lib/guest-auth-api.ts` | `sendOtp` | No token required. Used for email verification resend. | Conceptually reusable | Exact resend throttling rules are backend-specific. |
| `POST /guest/auth/verify-otp` | `lib/guest-auth-api.ts` | `verifyOtp` | Returns `access_token` plus guest payload. | Conceptually reusable | None in audited frontend use. |
| `POST /guest/auth/forgot-password` | `lib/guest-auth-api.ts` | `forgotPassword` | No token required. Returns OTP-sent metadata. | Conceptually reusable | Frontend maps 503, 404, and Google-login-specific 400 cases. |
| `POST /guest/auth/reset-password` | `lib/guest-auth-api.ts` | `resetPassword` | Returns a fresh auth token and guest payload. | Conceptually reusable | Exact backend password policy beyond mapped errors was not audited. |
| `POST /guest/auth/verify-2fa` | `lib/guest-auth-api.ts` | `verifyTwoFa` | Completes sign-in after login returns `{ requires_2fa: true }`. | Conceptually reusable | None in the audited path. |
| `POST /guest/auth/signup` | `lib/guest-auth-api.ts` | `signupGuest` | Returns `access_token`, guest payload, and optional `otp_sent`. | Conceptually reusable | The branch condition for `otp_sent` was not found during this pass. |
| `POST /guest/auth/login` | `lib/guest-auth-api.ts` | `loginGuest` | Returns either full auth success or `{ requires_2fa: true }`. | Conceptually reusable | None in the audited path. |
| `GET /guest/auth/me` | `lib/guest-auth-api.ts` | `getGuestMe` | Token-required session validation path used for session restore and Google callback. | Directly reusable | No adjacent refresh endpoint was found. |
| `GET /guest/auth/google` or configured same-origin equivalent | `lib/guest-auth-api.ts` | `getGuestGoogleAuthUrl` | Builds a same-origin Google auth URL and appends sanitized `return_to` when present. | Directly reusable | External backend OAuth internals are out of repo scope. |

## Property, Catalog, And Availability Endpoints

| Endpoint | File | Symbol | Pattern | Reuse | Uncertainty |
| --- | --- | --- | --- | --- | --- |
| `GET /guest/booking/rooms?property_id=...` | `lib/cx-api.ts` | `getRoomCatalogSnapshot` | Fetches room catalog for a required canonical `property_id`; falls back to hardcoded room types if the payload is empty or malformed. | Directly reusable | The hardcoded fallback room presentation is source-specific. |
| `GET /guest/booking/availability?checkin=...&checkout=...&property_id=...` | `lib/cx-api.ts` | `getRoomAvailabilitySnapshot` | Fetches live availability for a date window, normalizes `availability_source`, and merges back to catalog data/fallbacks when needed. | Directly reusable | Exact upstream `availability_source` values remain backend-specific. |
| `GET /api/cx/rooms?...` | `app/api/cx/rooms/route.ts` | `GET` | Internal Next.js route that validates `property_id`, date shape, and date ordering, then returns normalized room data plus cache headers and request ID. | Directly reusable | None in the audited wrapper. |
| `fetch('/api/cx/rooms?...')` | `components/marketing/property.tsx` | `fetchRoomsPayload` | Client property page fetches the internal route with `cache: "no-store"` and local in-memory caching rules. | Directly reusable | Uses source-specific toast/error copy. |

## property_id Handling

| File | Symbol | What it does | Reuse | Uncertainty |
| --- | --- | --- | --- | --- |
| `lib/cx-api.ts` | `sanitizePropertyId`, `getDefaultPropertyDestinationHref` | Ensures the canonical booking URL always carries a numeric `property_id`; injects a default property ID when needed. | Directly reusable | The default property ID source is environment-specific. |
| `app/api/cx/rooms/route.ts` | `PROPERTY_ID_REGEX`, `GET` | Rejects missing or non-numeric `property_id` with structured 400 responses. | Directly reusable | None in the audited route. |
| `lib/booking-api.ts` | booking payload types | Nightly booking creation, payment metadata, booking list, booking link, and KYC routes all keep `property_id` as a first-class field. | Directly reusable | Exact backend semantics stay source-specific. |
| `components/marketing/property.tsx` | room payload normalization | Accepts `payload.property_id` back from the internal route and can replace the currently resolved client property ID with the backend-provided one. | Directly reusable | None in the audited flow. |

## Booking, Payment, And KYC Endpoints

| Endpoint | File | Symbol | Pattern | Reuse | Uncertainty |
| --- | --- | --- | --- | --- | --- |
| `GET /guest/store/catalog?property_id=...` | `lib/booking-api.ts` | `getStoreCatalog` | Add-on/store catalog for the booking review flow. Returns `[]` when `propertyId` is blank before hitting the network. | Conceptually reusable | Store catalog is adjacent to booking; exact categories are source-specific. |
| `POST /guest/booking/create-order` | `lib/booking-api.ts` | `createGuestBookingOrder` | Token-required booking order creation using normalized room/add-on primitives only. | Directly reusable | None in audited nightly flow. |
| `POST /payment/create-booking-order` | `lib/booking-api.ts` | `createBookingPaymentOrder` | Token-required payment-order creation using `ezee_reservation_id`, payable total, and optional `addon_order_id`. | Directly reusable | Vendor-specific downstream usage is source-specific. |
| `POST /payment/verify` | `lib/booking-api.ts` | `verifyBookingPayment` | Token-required payment verification after Razorpay success. | Directly reusable | None in the audited nightly flow. |
| `POST /payment/fail` | `lib/booking-api.ts` | `failBookingPayment` | Token-required payment rollback/failure record for cancelled or failed Razorpay attempts. | Directly reusable | Frontend best-effort only; the catch path logs and continues. |
| `GET /guest/booking/mine` | `lib/booking-api.ts` | `getGuestBookings` | Token-required booking list used by `/bookings` and guest-hub gates. | Directly reusable | None in the audited paths. |
| `POST /guest/booking/link` | `lib/booking-api.ts` | `linkGuestBooking` | Token-required booking ownership/link check used by confirmation, pre-arrival, and guest-hub eligibility fallback checks. | Directly reusable | The full backend ownership contract remains backend-specific. |
| `GET /guest/kyc/:eri/slots` | `lib/booking-api.ts` | `getBookingKycSlots` | Token-required KYC slot list for web check-in. | Conceptually reusable | Only relevant if pre-arrival remains in scope. |
| `GET /guest/kyc/:eri/slots/:slotId` | `lib/booking-api.ts` | `getBookingKycDetail` | Token-required slot detail fetch. | Conceptually reusable | KYC detail shape is source-specific. |
| `POST /guest/kyc/:eri/slots/add` | `lib/booking-api.ts` | `addBookingKycSlot` | Adds a KYC slot. | Conceptually reusable | Not deeply exercised in this audit beyond wrapper presence. |
| `DELETE /guest/kyc/:eri/slots/:slotId` | `lib/booking-api.ts` | `deleteBookingKycSlot` | Deletes a KYC slot. | Conceptually reusable | Same scope note as above. |
| `POST /guest/kyc/:eri/upload-url` | `lib/booking-api.ts` | `getBookingKycUploadUrl` | Requests a presigned upload URL for KYC documents. | Conceptually reusable | Presigned upload storage backend is out of repo scope. |
| direct `PUT` to presigned URL | `lib/booking-api.ts` | `uploadFileToPresignedUrl` | Uploads raw file bytes directly, bypassing `requestJson`. | Conceptually reusable | Uses plain `fetch`, not the shared JSON wrapper. |
| `POST /guest/kyc/:eri/slots/:slotId/ocr` | `lib/booking-api.ts` | `runBookingKycOcr` | Runs OCR against uploaded document keys. | Conceptually reusable | OCR field normalization is source-specific. |
| `POST /guest/kyc/:eri/slots/:slotId/submit` | `lib/booking-api.ts` | `submitBookingKyc` | Submits the final KYC payload. | Conceptually reusable | Backend validation rules are broader than what this repo can prove. |
| `GET /guest/booking/receipt/:ezeeReservationId` | `lib/receipt-api.ts` | `fetchBookingReceipt` | Token-required receipt payload fetch used by the confirmation page's PDF download hook. | Conceptually reusable | Receipt PDF generation is client-side and source-specific. |

## Normalization And Error Patterns

| File | Symbol | What it does | Reuse | Uncertainty |
| --- | --- | --- | --- | --- |
| `lib/cx-api.ts` | telemetry and fallback normalization helpers | Normalizes malformed room payloads, records lightweight telemetry events in-memory, and falls back to safe room defaults when upstream data is missing. | Conceptually reusable | The hardcoded room presentation fallback is source-specific. |
| `app/api/cx/rooms/route.ts` | `jsonError` | Returns structured JSON errors with `error`, `message`, and `request_id`. | Directly reusable | None in the audited route. |
| `components/auth/guest-auth-provider.tsx` | `mapAuthErrorMessage`, `logAuthApiError` | Separates user-friendly auth error copy from detailed console diagnostics. | Directly reusable | Mapping is tailored to current backend message/status patterns. |
| `app/bookings/page.tsx` | `toBookingSyncMessage` usage | Converts booking sync failures into a non-fatal banner while fallback booking data can still render. | Conceptually reusable | Exact message text comes from `lib/ui-error.ts`, which was not fully audited here. |
| `components/booking/booking-confirmed-page.tsx` and `components/booking/pre-arrival-page.tsx` | `toSafeErrorMessage` usage | Maps raw API/network failures into generic page-safe messages. | Directly reusable | The exact helper implementation was not deeply audited in this pass. |

## Not Found During This Pass

- No request interceptor stack, retry policy, exponential backoff, or circuit-breaker layer was found around `requestJson`.
- No token refresh endpoint, silent re-auth flow, or cookie-session exchange was found.
- No server-side webhook or payment-status polling client was found in the nightly booking flow.
