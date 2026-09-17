-- San Fierro: persist the AI-decided task PURPOSE class on the WhatsApp request.
--
-- The classifier now returns task_category (T0 immediate/standard · T1 housekeeping
-- · T2 maintenance · T3 critical) alongside department. For the paid lane the ticket
-- is created later (on Razorpay capture, in PaymentService.createTicketForWhatsappService),
-- so the category decided at classify time must be carried on the row rather than
-- re-derived. Nullable for backfill safety (old rows + non-classified DROPPED rows).

ALTER TABLE "wa_service_request" ADD COLUMN IF NOT EXISTS "task_category" VARCHAR(20);
