-- Per-property ordering window: the previously-hardcoded/env-only open + freeze hours
-- become admin-configurable columns on breakfast_config (IST, 0-23).
-- Defaults preserve current behaviour: open 11:00, freeze 07:00 (frozen 07:00-11:00).
ALTER TABLE "breakfast_config"
  ADD COLUMN "order_open_hour"   INTEGER NOT NULL DEFAULT 11,
  ADD COLUMN "order_freeze_hour" INTEGER NOT NULL DEFAULT 7;
