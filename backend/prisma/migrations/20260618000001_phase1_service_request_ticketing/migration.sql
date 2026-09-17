-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Phase 1 — Guest Service-Request Ticketing + durable escalation
--
-- Backs the first-launch ticketing slice (docs/ticketing/launch_plan.md): a guest
-- raises a service request → ticket is created (cached in zoho_ticket_ref, mirrored
-- to Zoho Desk) → least-loaded staff is assigned → WATI notifies staff → a durable,
-- DB-persisted SLA escalation ladder runs (replacing the make.com / escalation_inspiration
-- in-memory setTimeout chain that silently died on every redeploy).
--
-- Three changes:
--   1. staff               — replaces the Zoho CRM "Staffs" module (assignment + L0/L1 targets)
--   2. escalation_levels   — per-property level→role map (the only NEW config; timings stay in sla_config)
--   3. zoho_ticket_ref +   — assignment + persisted escalation state so the watchdog is restart-safe
--
-- NOTE: escalation TIMINGS live in the existing sla_config table (l0..l3_timeout_min,
-- sla_minutes, task_category) — we deliberately did NOT add a second escalation_config table.
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Staff roster (replaces Zoho CRM "Staffs")
CREATE TABLE "staff" (
  "id"                  VARCHAR(36)  NOT NULL,
  "property_id"         VARCHAR(36)  NOT NULL,
  "name"                VARCHAR(255) NOT NULL,
  "phone"               VARCHAR(20)  NOT NULL,           -- WhatsApp number used for WATI sends
  "role"                VARCHAR(30)  NOT NULL,           -- HOUSEKEEPING / MAINTENANCE / FRONT_OFFICE / TEAM_LEAD ...
  "department"          VARCHAR(30)  NOT NULL,           -- HOUSEKEEPING / MAINTENANCE / FRONT_OFFICE
  "is_available"        BOOLEAN      NOT NULL DEFAULT false,  -- on/off shift (login/logout)
  "active_ticket_count" INTEGER      NOT NULL DEFAULT 0,      -- denormalised for least-loaded assignment
  "is_active"           BOOLEAN      NOT NULL DEFAULT true,
  "created_at"          TIMESTAMP(6) NOT NULL DEFAULT now(),
  "updated_at"          TIMESTAMP(6) NOT NULL DEFAULT now(),
  CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "staff"
  ADD CONSTRAINT "staff_property_id_fkey"
  FOREIGN KEY ("property_id") REFERENCES "properties"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Same phone may legitimately recur across properties; unique within a property.
CREATE UNIQUE INDEX "uq_staff_property_phone" ON "staff"("property_id", "phone");
-- Hot path: least-loaded lookup by property + role among available, active staff.
CREATE INDEX "idx_staff_assignment" ON "staff"("property_id", "role", "is_available", "is_active");

-- 2. Per-property escalation level → role map (timings remain in sla_config)
CREATE TABLE "escalation_levels" (
  "id"            VARCHAR(36) NOT NULL,
  "property_id"   VARCHAR(36) NOT NULL,
  "level"         INTEGER     NOT NULL,                  -- 1, 2, 3, 4
  "role"          VARCHAR(30) NOT NULL,                  -- e.g. TEAM_LEAD / Manager / Owner / Tech
  "lookup_source" VARCHAR(20) NOT NULL DEFAULT 'staff',  -- 'staff' | 'admin_users'
  "channel"       VARCHAR(20) NOT NULL DEFAULT 'WATI',   -- WATI (PagerDuty added later)
  "is_active"     BOOLEAN     NOT NULL DEFAULT true,
  CONSTRAINT "escalation_levels_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "escalation_levels"
  ADD CONSTRAINT "escalation_levels_property_id_fkey"
  FOREIGN KEY ("property_id") REFERENCES "properties"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE UNIQUE INDEX "uq_escalation_levels_property_level" ON "escalation_levels"("property_id", "level");

-- 3. Extend zoho_ticket_ref with assignment + persisted escalation state.
--    The watchdog reads these (never Zoho) so escalation survives restarts.
ALTER TABLE "zoho_ticket_ref"
  ADD COLUMN "subject"           VARCHAR(255),                 -- the request text / service name
  ADD COLUMN "task_category"     VARCHAR(5),                   -- T1 | T2 | T3 | T4 (from sla_config)
  ADD COLUMN "priority"          VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN "assigned_staff_id" VARCHAR(36),
  ADD COLUMN "guest_phone"       VARCHAR(20),
  ADD COLUMN "is_escalated"      BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN "escalation_level"  INTEGER     NOT NULL DEFAULT 0,   -- 0 = none; 1/2/3 = current Lx
  ADD COLUMN "next_deadline"     TIMESTAMP(6),                     -- when the watchdog should next act
  ADD COLUMN "sla_breach_at"     TIMESTAMP(6),                     -- absolute overall-breach time
  ADD COLUMN "acked_at"          TIMESTAMP(6),
  ADD COLUMN "completed_at"      TIMESTAMP(6);

ALTER TABLE "zoho_ticket_ref"
  ADD CONSTRAINT "zoho_ticket_ref_assigned_staff_id_fkey"
  FOREIGN KEY ("assigned_staff_id") REFERENCES "staff"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Watchdog cron hot path: find open/pending tickets whose next_deadline is due.
CREATE INDEX "idx_zoho_ticket_watchdog" ON "zoho_ticket_ref"("status", "next_deadline");
CREATE INDEX "idx_zoho_ticket_assigned_staff" ON "zoho_ticket_ref"("assigned_staff_id");
