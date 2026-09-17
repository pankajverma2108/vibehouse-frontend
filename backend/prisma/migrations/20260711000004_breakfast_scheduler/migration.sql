-- Per-property breakfast invite scheduler config. Fire at invite_anchor_min (minutes from
-- IST midnight, default 18:00) then repeat every invite_interval_hours (default 24 = daily).
-- last_invite_run_at dedupes firings across the poll tick.

ALTER TABLE "breakfast_config" ADD COLUMN "invite_cron_enabled"   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "breakfast_config" ADD COLUMN "invite_anchor_min"     INTEGER NOT NULL DEFAULT 1080;
ALTER TABLE "breakfast_config" ADD COLUMN "invite_interval_hours" INTEGER NOT NULL DEFAULT 24;
ALTER TABLE "breakfast_config" ADD COLUMN "last_invite_run_at"    TIMESTAMP(6);
