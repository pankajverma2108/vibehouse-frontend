# API Patterns

## Purpose

Document the source-verified booking-related API orchestration patterns used by `Vibehouse_frontend`.

## Status

Booking API audit updated on 2026-05-21 from inspected source files only.

## Base HTTP Wrapper

| File path | Symbol | Confirmed behavior | Reuse |
| --- | --- | --- | --- |
| `lib/vibehouse-api.ts` | `getApiBaseUrl()` | Uses `NEXT_PUBLIC_API_BASE_URL`, falling back to `https://api.thedailysocial.co.in`. | Conceptually reusable |
| `lib/vibehouse-api.ts` | `requestJson<T>()` | Sends JSON requests with `Accept`, `Content-Type`, optional `Authorization: Bearer <token>`, JSON-stringified `body`, and `cache: "no-store"`. | Directly reusable |
| `lib/vibehouse-api.ts` | `ApiRequestError` | Preserves `status`, parsed response `data`, `path`, and `method` for downstream UI handling in booking and auth flows. | Directly reusable |
| `lib/vibehouse-api.ts` | `parseApiError()` | Prefers backend `message` fields, including array-shaped messages, before using fallback copy. | Directly reusable |

## Property / Room Discovery Surface

| Endpoint or route | File path | Symbol | Request shape visible in source | Response shape visible in source | Notes |
| --- | --- | --- | --- | --- | --- |
| `GET /api/cx/rooms` | `app/api/cx/rooms/route.ts` | `GET()` | Query params: `property_id` required, `checkin` optional, `checkout` optional, with format and ordering validation. | `{ property_id, checkin?, checkout?, mode, availability_source?, has_live_availability, availability_error, room_types, categories, request_id }` | Internal Next.js route used by `components/marketing/property.tsx`; returns `400` for invalid property/date input and `502` on upstream failure. |
| `GET /guest/booking/rooms` | `lib/cx-api.ts` | `getRoomCatalogSnapshot()` | Query param: `property_id`. | `RawRoomAvailability` shape read as `{ property_id?, room_types? }`, then normalized into `RoomAvailabilitySnapshot`. | Source call is unauthenticated and uses `fetchUnknownJson()`, not `requestJson()`. |
| `GET /guest/booking/availability` | `lib/cx-api.ts` | `getRoomAvailabilitySnapshot()` | Query params: `property_id`, `checkin`, `checkout`. | `RawRoomAvailability` shape read as `{ property_id?, availability_source?, room_types? }`, then merged with catalog data into `RoomAvailabilitySnapshot`. | When the live list is empty, `lib/cx-api.ts` synthesizes a sold-out fallback plus `availabilityError`. |
| `GET /public/events` | `lib/cx-api.ts` | `getPublicEvents()` | Query param: `property_id`; optional frontend `limit` slicing occurs after fetch. | Raw array of event-like objects normalized into `EventCardProps[]`. | Adjacent property-page dependency, not a booking-critical API. |

## Room / Availability Normalization

| File path | Symbol | Confirmed behavior |
| --- | --- | --- |
| `lib/cx-api.ts` | `normalizeRoomType()` | Normalizes room payloads into `NormalizedRoomType` with `id`, `name`, `slug`, `type`, `inventoryState`, `hasLiveAvailability`, `bedsPerRoom`, `totalBeds`, `availableBeds`, `basePricePerNight`, `isPriceUnavailable`, `totalPrice`, and `amenities`. |
| `lib/cx-api.ts` | `getRoomAvailabilitySnapshot()` | Merges catalog and live availability by room `id` or `slug`; catalog rooms missing from live availability are forced into sold-out fallback rows. |
| `lib/cx-api.ts` | `roomTypesToPropertyCategories()` via `app/api/cx/rooms/route.ts` | Converts normalized room types into property-page categories returned by the internal API route. |
| `lib/property-resolver.ts` | `sanitizePropertyId()`, `resolveClientPropertyId()`, `resolveServerPropertyId()` | Enforces numeric `property_id` shape and host-based fallback mapping before room discovery requests are built. |

## Booking Order And Add-On Surface

| Endpoint | File path | Symbol | Request shape visible in source | Response shape visible in source | Notes |
| --- | --- | --- | --- | --- | --- |
| `GET /guest/store/catalog` | `lib/booking-api.ts` | `getStoreCatalog(propertyId)` | Query param: `property_id`. Blank `propertyId` returns `[]` without a request. | `StoreCatalogItem[]` with `id`, `name`, `category`, `base_price`, `in_stock`, `available_stock`. | `components/booking/booking-checkout-page.tsx` filters out `BORROWABLE` items before rendering add-ons. |
| `POST /guest/booking/create-order` | `lib/booking-api.ts` | `createGuestBookingOrder()` | `CreateBookingOrderPayload`: `{ property_id, checkin_date, checkout_date, rooms: [{ room_type_id, quantity }], addons?: [{ product_id, quantity }] }` | `CreateBookingOrderResponse` including `ezee_reservation_id`, property metadata, stay dates, `rooms`, `addons`, subtotals, `grand_total`, optional `addon_order_id`, and `status`. | Called by `components/booking/booking-checkout-page.tsx` after guest details validation. |
| Local-only coupon branch | `components/booking/booking-checkout-page.tsx` | `PROMO_CODES`, `applyPromoCode()` | In-memory promo lookup against code strings entered by the user. | Local state update only. | No booking coupon validation endpoint was confirmed in inspected source. |

## Payment Surface

| Endpoint or dependency | File path | Symbol | Request shape visible in source | Response shape visible in source | Notes |
| --- | --- | --- | --- | --- | --- |
| `POST /payment/create-booking-order` | `lib/booking-api.ts` | `createBookingPaymentOrder()` | `{ ezee_reservation_id, grand_total, addon_order_id? }` | `CreateBookingPaymentOrderResponse` with `razorpay_order_id`, `razorpay_key`, `amount`, `amount_paise`, `currency`, `payment_id`, `ezee_reservation_id`, optional `guest.email`. | Called only after `createGuestBookingOrder()` succeeds in `components/booking/booking-checkout-page.tsx`. |
| `POST /payment/verify` | `lib/booking-api.ts` | `verifyBookingPayment()` | `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }` | `{ message, payment_id, order_id?, total }` | Success path clears draft state and routes to `/bookings` from `components/booking/booking-checkout-page.tsx`. |
| `POST /payment/fail` | `lib/booking-api.ts` | `failBookingPayment()` | `{ razorpay_order_id }` | `{ message, payment_id, razorpay_order_id }` | Called on Razorpay dismissal and `payment.failed` handling in `components/booking/booking-checkout-page.tsx`. |
| `https://checkout.razorpay.com/v1/checkout.js` | `components/booking/booking-checkout-page.tsx` | `loadRazorpay()` | No frontend request body; loads remote checkout script. | `window.Razorpay` constructor on success. | Payment UI is modal-based Razorpay checkout, not a redirect page. |

## Booking Retrieval, Confirmation, Receipt, And Pre-Arrival Surface

| Endpoint | File path | Symbol | Request shape visible in source | Response shape visible in source | Notes |
| --- | --- | --- | --- | --- | --- |
| `GET /guest/booking/mine` | `lib/booking-api.ts` | `getGuestBookings()` | Bearer token only. | `GuestBookingMineItem[]` with `ezee_reservation_id`, `role`, `status`, `room_type_name`, `room_number?`, `checkin_date`, `checkout_date`, `property_id`, `source?`, `total_slots?`, `kyc_completed_slots?`. | `app/bookings/page.tsx` caches the result per guest in sessionStorage via `lib/client-cache.ts`. |
| `POST /guest/booking/link` | `lib/booking-api.ts` | `linkGuestBooking()` | `{ ezee_reservation_id }` | `LinkGuestBookingResponse` with `access`, `booking`, and `slots`. | Used by `components/booking/booking-confirmed-page.tsx`, `components/booking/pre-arrival-page.tsx`, and guest-hub recovery flows. |
| `GET /guest/booking/receipt/:eri` | `lib/receipt-api.ts` | `fetchBookingReceipt()` | Bearer token plus `ezeeReservationId` path param. | `BookingReceiptData` with booking identity, property data, guest data, stay data, `line_items`, pricing breakdown, payment reference, and optional `terms`. | `hooks/use-download-receipt.ts` converts the response into a client-side PDF download. |
| `GET /guest/kyc/:eri/slots` | `lib/booking-api.ts` | `getBookingKycSlots()` | Bearer token plus `ezeeReservationId` path param. | `BookingKycSlotsResponse` with `ezee_reservation_id`, `total_slots`, and `slots`. | `components/booking/pre-arrival-page.tsx` caches this response for 3 minutes. |
| `GET /guest/kyc/:eri/slots/:slotId` | `lib/booking-api.ts` | `getBookingKycDetail()` | Bearer token plus `ezeeReservationId` and `slotId` path params. | `BookingKycDetailResponse` with `slot` and nullable `kyc` record. | Used when the user opens a slot form in pre-arrival. |
| `POST /guest/kyc/:eri/slots/add` | `lib/booking-api.ts` | `addBookingKycSlot()` | Bearer token plus `ezeeReservationId` path param. | `BookingSlotSummary`. | Adds a guest slot before KYC submission. |
| `DELETE /guest/kyc/:eri/slots/:slotId` | `lib/booking-api.ts` | `deleteBookingKycSlot()` | Bearer token plus `ezeeReservationId` and `slotId` path params. | `{ message: string }` | Removes a guest slot from pre-arrival. |
| `POST /guest/kyc/:eri/upload-url` | `lib/booking-api.ts` | `getBookingKycUploadUrl()` | `{ file_name, content_type }` plus `ezeeReservationId`. | `KycUploadUrlResponse` with `uploadUrl`, `fileKey`, `expiresInSeconds`. | Upload storage is presigned URL based. |
| presigned `PUT` upload URL | `lib/booking-api.ts` | `uploadFileToPresignedUrl()` | Raw `File` body with `Content-Type`. | No JSON body; throws when `response.ok` is false. | Uploads do not use `requestJson()`. |
| `POST /guest/kyc/:eri/slots/:slotId/ocr` | `lib/booking-api.ts` | `runBookingKycOcr()` | `{ front_image_key, back_image_key? }` | `KycOcrResponse` with extracted OCR fields and optional confidence map. | OCR is optional helper data, not final submission. |
| `POST /guest/kyc/:eri/slots/:slotId/submit` | `lib/booking-api.ts` | `submitBookingKyc()` | `KycSubmitPayload` with nationality, ID, personal details, routing details, image URLs, and `consent_given`. | `{ message, kyc_id, slot_id, status, full_name }` | Submission success triggers slot reload in `components/booking/pre-arrival-page.tsx`. |

## Booking-Adjacent Client Cache And Persistence

| File path | Symbol | Confirmed behavior |
| --- | --- | --- |
| `lib/client-cache.ts` | `getClientCache()`, `setClientCache()`, `clearClientCache()` | SessionStorage TTL cache envelope `{ value, savedAt }`; used by `app/bookings/page.tsx` and `components/booking/pre-arrival-page.tsx`. |
| `lib/booking-session.ts` | `saveBookingDraft()`, `savePendingBookingOrder()`, `saveConfirmedBookingSnapshot()` | Persists booking review state in sessionStorage and confirmation fallback snapshots in localStorage; this is frontend persistence, not an API surface. |
| `lib/property-selection-session.ts` | `savePropertySelection()`, `loadPropertySelection()` | Persists pre-review property selection in both localStorage and sessionStorage under `vh_property_selection_v1`; again, frontend persistence rather than an API call. |

## Source-Specific Colive Endpoints In The Same Wrapper

| Endpoint | File path | Symbol | Request shape visible in source | Response shape visible in source | Notes |
| --- | --- | --- | --- | --- | --- |
| `POST /guest/colive/quote` | `lib/booking-api.ts` | `createColiveQuote()` | `CreateColiveQuotePayload` with `property_id`, `room_type_id`, `move_in_date`, `duration_days`, `stay_type`, `addons`, optional `coupon_code`. | `CreateColiveQuoteResponse` with `quote_id`, `currency`, and `charges`. | Used by `components/colive/colive-flow.tsx`; source-specific and separate from the nightly booking flow. |
| `POST /guest/colive/draft-booking` | `lib/booking-api.ts` | `createColiveDraftBooking()` | `CreateColiveDraftBookingPayload` with quote, room, guest details, add-ons, source, and optional notes. | `CreateColiveDraftBookingResponse` with `draft_booking_id`, `status`, and `charges`. | Separate draft concept from `lib/booking-session.ts`. |
| `POST /payment/create-colive-order` | `lib/booking-api.ts` | `createColivePaymentOrder()` | `{ draft_booking_id, grand_total, currency }` | `CreateColivePaymentOrderResponse` with Razorpay payment identifiers. | Colive-specific payment path. |
| `POST /payment/verify-colive` | `lib/booking-api.ts` | `verifyColivePayment()` | `{ draft_booking_id, razorpay_order_id, razorpay_payment_id, razorpay_signature }` | `VerifyColivePaymentResponse` with booking identifiers and payment result data. | Not used by the nightly booking confirmation route. |

## Error Handling, Retry, And Interceptor Behavior

| Concern | File path | Confirmed behavior |
| --- | --- | --- |
| Request retries | `lib/vibehouse-api.ts` | `requestJson()` does not implement retry, backoff, or interceptor logic. |
| Unauthenticated property fetch failures | `lib/cx-api.ts` | `fetchUnknownJson()` catches fetch and JSON parse errors, then returns `null`, causing fallback catalog or sold-out synthesis instead of throwing. |
| Internal room route upstream failure | `app/api/cx/rooms/route.ts` | Converts thrown upstream failures into `502 rooms_upstream_error`. |
| Checkout error mapping | `components/booking/booking-checkout-page.tsx` | Uses thrown `ApiRequestError` payloads to show toast messages and switch local payment state to `failed`. |
| Receipt download failure | `hooks/use-download-receipt.ts` and `lib/receipt-api.ts` | Receipt fetch failures remain client-visible and do not silently fabricate receipt data. |

## Coupling And Migration Risks In The API Layer

- `components/marketing/property.tsx`, `app/page.tsx`, `app/rooms/page.tsx`, `lib/property-resolver.ts`, and `app/api/cx/rooms/route.ts` all assume numeric `property_id` is mandatory for nightly booking, so this contract should not be copied into a target app without verifying property-resolution rules there.
- `components/booking/booking-checkout-page.tsx`, `lib/booking-api.ts`, and `lib/booking-session.ts` couple payment creation to a successfully created booking order plus a locally persisted pending-order signature, so any target migration must keep order idempotency explicit.
- `components/booking/pre-arrival-page.tsx`, `lib/booking-api.ts`, and `lib/client-cache.ts` assume bookings can be re-linked by `ezee_reservation_id`, which is source-specific naming and should not be blindly reused if the target uses different booking identifiers.
- `hooks/use-download-receipt.ts`, `lib/receipt-api.ts`, and `components/booking/booking-confirmed-page.tsx` assume receipt generation is client-side after a JSON fetch rather than a backend-served PDF or invoice document.
- `lib/cx-api.ts` mixes graceful catalog fallback, sold-out synthesis, and telemetry for room payload issues; that behavior is source-specific and should be re-validated rather than transplanted unchanged.

## Not Found During This Pass

- Backend coupon or promo validation endpoint for nightly booking: Not found during this pass.
- Webhook-driven or asynchronous payment reconciliation beyond `POST /payment/verify` and `POST /payment/fail`: Not found during this pass.
- Dedicated booking draft API endpoint for nightly booking: Not found during this pass. The nightly draft is frontend-only in `lib/booking-session.ts`.
- Dedicated abandoned-booking cleanup endpoint: Not found during this pass.
- Invoice-specific endpoint distinct from `GET /guest/booking/receipt/:eri`: Not found during this pass.
