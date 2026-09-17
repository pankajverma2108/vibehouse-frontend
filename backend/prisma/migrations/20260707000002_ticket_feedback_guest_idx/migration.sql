-- The Good/Bad feedback flow looks up a guest's pending feedback on EVERY inbound
-- WhatsApp message (findPendingForGuest: guest_id + submitted_at IS NULL). Index
-- guest_id so that hot-path lookup doesn't seq-scan ticket_feedback.
CREATE INDEX "ticket_feedback_guest_id_idx" ON "ticket_feedback" ("guest_id");
