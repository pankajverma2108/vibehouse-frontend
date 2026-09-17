-- WhatsApp Good/Bad feedback flow (replaces the 1-5 star link as the guest CSAT).
-- On completion the guest gets a two-button "How was our service?" template; the
-- tapped button is stored as `sentiment` ('Good'|'Bad') and mirrored to Zoho
-- (cf_feedback_sentiment). `rated_at` marks when they tapped, and opens a short
-- window in which their NEXT free-text reply is captured as the review remark
-- (comment / cf_feedback_remark). `rating` (1..5) stays for the legacy link rows.
ALTER TABLE "ticket_feedback" ADD COLUMN "sentiment" VARCHAR(10);
ALTER TABLE "ticket_feedback" ADD COLUMN "rated_at"  TIMESTAMP(6);
