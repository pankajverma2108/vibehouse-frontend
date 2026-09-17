-- Per-class "snooze" percentage: how long an ESCALATED person has to acknowledge
-- (as a % of escalation_gap_min) before the ticket climbs to the next ladder level.
-- Default 100 = today's behaviour (climb after the full gap), so existing rows are
-- unchanged.
ALTER TABLE "sla_config" ADD COLUMN "snooze_percent" INTEGER NOT NULL DEFAULT 100;
