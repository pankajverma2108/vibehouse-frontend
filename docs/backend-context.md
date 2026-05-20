# Vibehouse Backend Context (Read-Only)

This document summarizes the backend code under guidelines/Vibehouse_backend. The backend folder is read-only; this file is a frontend-friendly map of how the backend is structured, which APIs exist, how data flows, and where key integrations happen.

## Quick orientation

- Framework: NestJS (entrypoint: [guidelines/Vibehouse_backend/src/main.ts](guidelines/Vibehouse_backend/src/main.ts))
- Root module: [guidelines/Vibehouse_backend/src/app.module.ts](guidelines/Vibehouse_backend/src/app.module.ts)
- ORM: Prisma (schema: [guidelines/Vibehouse_backend/prisma/schema.prisma](guidelines/Vibehouse_backend/prisma/schema.prisma))
- API base: app controller exposes / and /health (see [guidelines/Vibehouse_backend/src/app.controller.ts](guidelines/Vibehouse_backend/src/app.controller.ts))

## Repo structure overview

Top-level backend folder (read-only):

- src/ (NestJS modules and services)
- prisma/ (schema + migrations + seed scripts)
- scripts/ (ops scripts like admin creation, queue setup)
- test/ (jest e2e)
- Dockerfile, nest-cli.json, tsconfig files, eslint configs

Key src/ folders:

- admin/ (admin auth, users, bookings, inventory, events, KYC, room-types)
- guest/ (guest auth, booking, KYC, store, colive)
- payment/ (Razorpay flows + booking/colive payment verification)
- ezee/ (PMS integration service and reconciliation)
- aws/ (S3 + Textract)
- sqs/ (queue producer/consumer + workers)
- redis/ (cache wrapper + Redis module)
- prisma/ (PrismaService)
- mygate/ (smart lock provisioning)
- email/ (SES email)
- public/ (public events API)

## Runtime boot and global behavior

- App startup uses NestFactory, sets JSON body limit to 15mb for base64 OCR tests, enables CORS for all origins, and applies a global ValidationPipe (whitelist + forbidNonWhitelisted). See [guidelines/Vibehouse_backend/src/main.ts](guidelines/Vibehouse_backend/src/main.ts).
- Health endpoint: GET /health (see [guidelines/Vibehouse_backend/src/app.controller.ts](guidelines/Vibehouse_backend/src/app.controller.ts)).

## Core modules and responsibilities

### Guest auth

- Controller: [guidelines/Vibehouse_backend/src/guest/auth/guest-auth.controller.ts](guidelines/Vibehouse_backend/src/guest/auth/guest-auth.controller.ts)
- Service: [guidelines/Vibehouse_backend/src/guest/auth/guest-auth.service.ts](guidelines/Vibehouse_backend/src/guest/auth/guest-auth.service.ts)
- Module: [guidelines/Vibehouse_backend/src/guest/auth/guest-auth.module.ts](guidelines/Vibehouse_backend/src/guest/auth/guest-auth.module.ts)

Endpoints:

- POST /guest/auth/signup
- POST /guest/auth/login
- GET /guest/auth/me
- POST /guest/auth/send-otp
- POST /guest/auth/verify-otp
- POST /guest/auth/forgot-password
- POST /guest/auth/reset-password
- POST /guest/auth/verify-2fa
- PATCH /guest/auth/2fa
- GET /guest/auth/google
- GET /guest/auth/google/callback

Behavior notes:

- Uses JWT (secret from JWT_SECRET or fallback), 7d TTL.
- 2FA uses email OTP and blocks token issuance until verified.
- Auto-links any matching eZee bookings by guest email/phone on signup/login.
- Uses SES-based EmailService to send OTPs (see Email section).

### Guest booking

- Controller: [guidelines/Vibehouse_backend/src/guest/booking/guest-booking.controller.ts](guidelines/Vibehouse_backend/src/guest/booking/guest-booking.controller.ts)
- Service: [guidelines/Vibehouse_backend/src/guest/booking/guest-booking.service.ts](guidelines/Vibehouse_backend/src/guest/booking/guest-booking.service.ts)

Public endpoints:

- GET /guest/booking/rooms (room catalog, no dates)
- GET /guest/booking/availability (live availability, dates required)
- GET /guest/booking/lookup (public booking preview)

Auth endpoints:

- POST /guest/booking/link (link guest to ERI)
- GET /guest/booking/mine (list guest bookings)
- POST /guest/booking/create-order (create pending booking + slots)
- GET /guest/booking/checkin-status (check-in status + PIN lookup)

Behavior notes:

- Uses eZee as source of truth for room types and live availability (via EzeeService).
- Creates ERI (TDS-{CITY}-{timestamp}-{rand}) and stores in ezee_booking_cache.
- Creates booking slots for the number of guests, and auto-assigns the first slot to the primary guest.
- Booking confirmation and eZee sync happens after payment capture via SQS.

### Guest KYC

- Controller: [guidelines/Vibehouse_backend/src/guest/kyc/guest-kyc.controller.ts](guidelines/Vibehouse_backend/src/guest/kyc/guest-kyc.controller.ts)
- Service: [guidelines/Vibehouse_backend/src/guest/kyc/guest-kyc.service.ts](guidelines/Vibehouse_backend/src/guest/kyc/guest-kyc.service.ts)
- DTO: [guidelines/Vibehouse_backend/src/guest/kyc/dto/submit-kyc.dto.ts](guidelines/Vibehouse_backend/src/guest/kyc/dto/submit-kyc.dto.ts)

Endpoints:

- GET /guest/kyc/:eri/slots
- POST /guest/kyc/:eri/slots/add
- GET /guest/kyc/:eri/slots/:slotId/documents
- GET /guest/kyc/:eri/slots/:slotId
- DELETE /guest/kyc/:eri/slots/:slotId
- POST /guest/kyc/:eri/upload-url
- POST /guest/kyc/:eri/slots/:slotId/ocr
- POST /guest/kyc/:eri/slots/:slotId/submit

Behavior notes:

- Access gated by booking_guest_access with status APPROVED.
- Uploads use S3 presigned URLs (AWS S3 bucket default vibehouse-kyc-documents).
- OCR pipeline uses AWS Textract + OpenAI (gpt-4o-mini) for field extraction.
- submitKyc writes/updates kyc_submissions and marks booking_slots.kyc_status = PRE_VERIFIED.
- There is no call to eZee from submitKyc; it only writes to DB and returns PRE_VERIFIED. This means ID data is stored in our DB and not pushed to eZee in the current code path.

### Guest store (addons, services, borrowables)

- Controller: [guidelines/Vibehouse_backend/src/guest/store/guest-store.controller.ts](guidelines/Vibehouse_backend/src/guest/store/guest-store.controller.ts)
- Service: [guidelines/Vibehouse_backend/src/guest/store/guest-store.service.ts](guidelines/Vibehouse_backend/src/guest/store/guest-store.service.ts)

Endpoints:

- GET /guest/store/catalog
- GET /guest/store/services
- GET /guest/store/borrowables
- GET /guest/store/cart/:eri
- POST /guest/store/cart/:eri/add
- PATCH /guest/store/cart/:eri/item/:itemId
- DELETE /guest/store/cart/:eri/item/:itemId
- POST /guest/store/cart/:eri/checkout
- POST /guest/store/:eri/borrowable/request
- GET /guest/store/:eri/borrowable/mine
- POST /guest/store/:eri/service/request
- GET /guest/store/:eri/returnables/mine
- GET /guest/store/:eri/orders

Behavior notes:

- Uses addon_orders as a cart, phase is PRE_ARRIVAL vs DURING_STAY based on check-in records.
- Stock validation for COMMODITY items against inventory.

### Guest colive

- Controller: [guidelines/Vibehouse_backend/src/guest/colive/colive.controller.ts](guidelines/Vibehouse_backend/src/guest/colive/colive.controller.ts)
- Service: [guidelines/Vibehouse_backend/src/guest/colive/colive.service.ts](guidelines/Vibehouse_backend/src/guest/colive/colive.service.ts)

Endpoints:

- POST /guest/colive/search
- GET /guest/colive/properties/:property_id
- GET /guest/colive/properties/:property_id/addons
- POST /guest/colive/quote
- POST /guest/colive/draft-booking
- GET /guest/colive/bookings/:booking_id

Behavior notes:

- Uses eZee live pricing for long-stay calculations.
- Stores colive quotes and draft bookings, then payment is handled via /payment/create-colive-order and /payment/verify-colive.

### Payment

- Controller: [guidelines/Vibehouse_backend/src/payment/payment.controller.ts](guidelines/Vibehouse_backend/src/payment/payment.controller.ts)
- Service: [guidelines/Vibehouse_backend/src/payment/payment.service.ts](guidelines/Vibehouse_backend/src/payment/payment.service.ts)

Guest endpoints:

- POST /payment/create-order (addon cart)
- POST /payment/create-booking-order (rooms + addons)
- POST /payment/verify
- POST /payment/fail
- POST /payment/create-colive-order
- POST /payment/verify-colive

Webhook:

- POST /webhook/razorpay

Dev-only:

- POST /payment/dev/simulate-capture
- POST /payment/dev/simulate-fail

Behavior notes:

- Uses Razorpay for payment creation and signature verification.
- On capture, emits SQS events: audit log, payment success, booking confirmed, and eZee sync tasks.
- On booking confirmation: queues eZee InsertBooking job to SQS.
- On addon payment capture: queues eZee AddExtraCharge job to SQS.

### eZee PMS integration

- Service: [guidelines/Vibehouse_backend/src/ezee/ezee.service.ts](guidelines/Vibehouse_backend/src/ezee/ezee.service.ts)
- Types: [guidelines/Vibehouse_backend/src/ezee/ezee.types.ts](guidelines/Vibehouse_backend/src/ezee/ezee.types.ts)
- Reconciliation: [guidelines/Vibehouse_backend/src/ezee/ezee-reconciliation.service.ts](guidelines/Vibehouse_backend/src/ezee/ezee-reconciliation.service.ts)

Key capabilities:

- Room catalog (Vacation Rental API get_rooms)
- Room availability + rates (RoomList)
- InsertBooking, ProcessBooking, FetchSingleBooking, AssignRoom, AddPayment
- ArrivalList for reconciliation

Reconciliation workflow:

- Runs on app bootstrap and every 15 minutes.
- Detects unsynced bookings, status drift (cancelled, checked in, checked out), room number drift, and ingests external bookings into ezee_booking_cache.
- Triggers MyGate PIN provisioning when eZee marks a booking as Checked In.

### SQS queues and workers

- Producer: [guidelines/Vibehouse_backend/src/sqs/sqs-producer.service.ts](guidelines/Vibehouse_backend/src/sqs/sqs-producer.service.ts)
- Consumer: [guidelines/Vibehouse_backend/src/sqs/sqs-consumer.service.ts](guidelines/Vibehouse_backend/src/sqs/sqs-consumer.service.ts)
- Worker: [guidelines/Vibehouse_backend/src/sqs/workers/ezee-sync.worker.ts](guidelines/Vibehouse_backend/src/sqs/workers/ezee-sync.worker.ts)
- Message types: [guidelines/Vibehouse_backend/src/sqs/types/messages.ts](guidelines/Vibehouse_backend/src/sqs/types/messages.ts)
- Queue constants: [guidelines/Vibehouse_backend/src/sqs/sqs.constants.ts](guidelines/Vibehouse_backend/src/sqs/sqs.constants.ts)

Queue architecture:

- vibehouse-ops.fifo: audit logs, payment success, booking confirmed, low stock alerts
- vibehouse-ezee-sync.fifo: rate-limited eZee calls (InsertBooking, AddExtraCharge, UpdateReservation, InsertColiveBooking)
- vibehouse-notify: outbound notifications
- vibehouse-sla-escalate: SLA timer notifications

### Admin modules

- Auth: [guidelines/Vibehouse_backend/src/admin/auth/admin-auth.controller.ts](guidelines/Vibehouse_backend/src/admin/auth/admin-auth.controller.ts)
- Users: [guidelines/Vibehouse_backend/src/admin/users/admin-users.controller.ts](guidelines/Vibehouse_backend/src/admin/users/admin-users.controller.ts)
- Bookings: [guidelines/Vibehouse_backend/src/admin/bookings/admin-bookings.controller.ts](guidelines/Vibehouse_backend/src/admin/bookings/admin-bookings.controller.ts)
- Inventory: [guidelines/Vibehouse_backend/src/admin/inventory/admin-inventory.controller.ts](guidelines/Vibehouse_backend/src/admin/inventory/admin-inventory.controller.ts)
- Events: [guidelines/Vibehouse_backend/src/admin/events/admin-events.controller.ts](guidelines/Vibehouse_backend/src/admin/events/admin-events.controller.ts)
- Room Types: [guidelines/Vibehouse_backend/src/admin/room-types/admin-room-types.controller.ts](guidelines/Vibehouse_backend/src/admin/room-types/admin-room-types.controller.ts)
- KYC: [guidelines/Vibehouse_backend/src/admin/kyc/admin-kyc.controller.ts](guidelines/Vibehouse_backend/src/admin/kyc/admin-kyc.controller.ts)

Admin KYC specifics:

- GET /admin/kyc/submissions (guest -> booking -> slot -> kyc grouping)
- GET /admin/kyc/submissions/:slotId/documents
- DELETE /admin/kyc/submissions/:slotId/documents/:imageType
- POST /admin/kyc/test-ocr

### Public endpoints

- Events: GET /public/events, GET /public/events/:id, GET /public/events/poster (see [guidelines/Vibehouse_backend/src/public/public-events.controller.ts](guidelines/Vibehouse_backend/src/public/public-events.controller.ts))

### MyGate smart lock integration

- Service: [guidelines/Vibehouse_backend/src/mygate/mygate.service.ts](guidelines/Vibehouse_backend/src/mygate/mygate.service.ts)
- Module: [guidelines/Vibehouse_backend/src/mygate/mygate.module.ts](guidelines/Vibehouse_backend/src/mygate/mygate.module.ts)

Behavior notes:

- Authenticates to MyGate and caches session token in Redis.
- Creates timed passcodes and persists to smart_lock_access.
- Triggered by eZee reconciliation when booking becomes CHECKED_IN.

### AWS services

- S3 service (KYC uploads + event posters): [guidelines/Vibehouse_backend/src/aws/s3.service.ts](guidelines/Vibehouse_backend/src/aws/s3.service.ts)
- Textract + OpenAI OCR pipeline: [guidelines/Vibehouse_backend/src/aws/textract.service.ts](guidelines/Vibehouse_backend/src/aws/textract.service.ts)
- SES email (OTP and check-in emails): [guidelines/Vibehouse_backend/src/email/email.service.ts](guidelines/Vibehouse_backend/src/email/email.service.ts)

### Redis cache

- CacheService and Redis config: [guidelines/Vibehouse_backend/src/redis/cache.service.ts](guidelines/Vibehouse_backend/src/redis/cache.service.ts), [guidelines/Vibehouse_backend/src/redis/redis.module.ts](guidelines/Vibehouse_backend/src/redis/redis.module.ts)

## Database schema (Prisma)

Prisma models (full list):

- addon_order_items
- addon_orders
- admin_activity_log
- admin_roles
- admin_users
- auth_providers
- booking_guest_access
- booking_slots
- borrowable_checkouts
- checkin_records
- events
- ezee_booking_cache
- ezee_connection
- ezee_sync_log
- guests
- inventory
- kyc_submissions
- mygate_connection
- mygate_devices
- notification_log
- otp_logs
- payments
- product_catalog
- properties
- colive_locations
- colive_plans
- colive_property_content
- colive_room_options
- colive_addons
- colive_search_sessions
- colive_quotes
- colive_draft_bookings
- returnable_checkouts
- room_types
- sla_config
- smart_lock_access
- smart_lock_access_log
- stay_extensions
- zoho_ticket_ref

Key tables for guest pre-check-in:

- ezee_booking_cache: booking core data (ERI, status, room info, dates, guest, source)
- booking_guest_access: which guest can access which booking
- booking_slots: per-guest slots for KYC
- kyc_submissions: submitted KYC data (id_number, id_type, DOB, address, images)

## Environment variables used in code

- PORT (server listen)
- JWT_SECRET
- FRONTEND_URL
- GOOGLE_OAUTH_CLIENT_ID
- GOOGLE_OAUTH_CLIENT_SECRET
- GOOGLE_OAUTH_CALLBACK_URL
- AWS_REGION
- AWS_S3_KYC_BUCKET
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- OPENAI_API_KEY
- SES_FROM_EMAIL
- REDIS_URL
- SQS_CONSUMERS_ENABLED
- AWS_SQS_OPS_QUEUE_URL
- AWS_SQS_EZEE_SYNC_QUEUE_URL
- AWS_SQS_NOTIFY_QUEUE_URL
- AWS_SQS_SLA_QUEUE_URL
- RAZORPAY_TEST_API_KEY
- RAZORPAY_TEST_API_SECRET
- RAZORPAY_WEBHOOK_SECRET
- DEFAULT_PROPERTY_ID
- NODE_ENV (dev-only payment simulations, OTP email suppression)

## Scripts (ops/dev)

Scripts in [guidelines/Vibehouse_backend/scripts](guidelines/Vibehouse_backend/scripts):

- create-admin.ts
- create-sqs-queues.ts
- detect-ezee-room-types.ts
- diagnose-room-duplicates.ts
- fix-ezee-room-type-mapping.ts
- fix-room-type-ids.ts
- list-sqs-queues.ts
- send-test-booking-confirmation.ts
- send-test-checkin.ts
- send-test-otp.ts
- test-booking-flow.ts
- test-sqs-integration.ts

## Specific note on KYC to eZee

The guest KYC flow writes data to kyc_submissions and updates booking_slots. The code path for /guest/kyc/:eri/slots/:slotId/submit does not call EzeeService or enqueue any eZee sync task. Based on the backend code here, guest ID number is not pushed into eZee automatically. If eZee needs the ID field populated, a new backend integration step is required (likely an eZee UpdateReservation call via the ezee-sync queue).

## Where to look next (if you need to trace a bug)

- Guest KYC submission write path: [guidelines/Vibehouse_backend/src/guest/kyc/guest-kyc.service.ts](guidelines/Vibehouse_backend/src/guest/kyc/guest-kyc.service.ts)
- eZee sync flow: [guidelines/Vibehouse_backend/src/sqs/workers/ezee-sync.worker.ts](guidelines/Vibehouse_backend/src/sqs/workers/ezee-sync.worker.ts)
- eZee API client: [guidelines/Vibehouse_backend/src/ezee/ezee.service.ts](guidelines/Vibehouse_backend/src/ezee/ezee.service.ts)
- Booking status source of truth: [guidelines/Vibehouse_backend/src/ezee/ezee-reconciliation.service.ts](guidelines/Vibehouse_backend/src/ezee/ezee-reconciliation.service.ts)
- Payment capture to booking sync: [guidelines/Vibehouse_backend/src/payment/payment.service.ts](guidelines/Vibehouse_backend/src/payment/payment.service.ts)
