-- SLA ack window becomes a PERCENT of the TAT (completion_timeout_min) instead of
-- an absolute minutes value. e.g. TAT 10 + ack_percent 30 => escalate at 3 min if
-- the assignee hasn't acknowledged. Configurable per task class.

ALTER TABLE "sla_config" ADD COLUMN "ack_percent" INTEGER;

-- Backfill in SQL (so prod is correct even if the ts-node seed is skipped): derive the
-- percent from the existing absolute ack/completion ratio, clamped to 1..100. Classes
-- with a 0 TAT (T3 critical → broadcast) get 0.
UPDATE "sla_config"
SET "ack_percent" = CASE
  WHEN "completion_timeout_min" > 0
    THEN LEAST(100, GREATEST(1, ROUND("ack_timeout_min"::numeric / "completion_timeout_min" * 100)::int))
  ELSE 0
END;

-- Default anything still null to 30% (the recommended ack window).
UPDATE "sla_config" SET "ack_percent" = 30 WHERE "ack_percent" IS NULL;

ALTER TABLE "sla_config" ALTER COLUMN "ack_percent" SET NOT NULL;

ALTER TABLE "sla_config" DROP COLUMN "ack_timeout_min";
