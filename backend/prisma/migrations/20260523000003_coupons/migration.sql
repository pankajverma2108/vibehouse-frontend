-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Coupons feature
--
-- Three types of admin-managed discount coupons:
--   - STAY_LENGTH:    auto-applied when nights >= min_stay_nights
--   - ONE_TIME_CODE:  guest types a code at checkout
--   - NEW_GUEST:      auto-applied when guest has no prior ezee_booking_cache row
--
-- Stacking: up to 1 auto + 1 code per booking. Discount is server-computed
-- in createBookingOrder; payments.amount is reconciled against discount_total
-- in createBookingPayment to prevent FE from bypassing.
--
-- See docs/setup/coupons.md for the full architecture.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Coupon definitions
CREATE TABLE "coupons" (
  "id"                        VARCHAR(36)   PRIMARY KEY,
  "code"                      VARCHAR(50)   UNIQUE,
  "type"                      VARCHAR(20)   NOT NULL,
  "discount_type"             VARCHAR(10)   NOT NULL,
  "discount_value"            DECIMAL(10, 2) NOT NULL,
  "max_discount_amount"       DECIMAL(10, 2),
  "min_stay_nights"           INT,
  "min_booking_amount"        DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "max_uses_per_guest"        INT           NOT NULL DEFAULT 1,
  "max_total_uses"            INT,
  "applies_to_all_properties" BOOLEAN       NOT NULL DEFAULT false,
  "valid_from"                TIMESTAMP(6),
  "valid_until"               TIMESTAMP(6),
  "is_active"                 BOOLEAN       NOT NULL DEFAULT true,
  "admin_note"                TEXT,
  "created_by"                VARCHAR(36)   NOT NULL,
  "created_at"                TIMESTAMP(6)  NOT NULL DEFAULT NOW(),
  "updated_at"                TIMESTAMP(6)  NOT NULL DEFAULT NOW(),
  CONSTRAINT "coupons_type_check"           CHECK ("type" IN ('STAY_LENGTH', 'ONE_TIME_CODE', 'NEW_GUEST')),
  CONSTRAINT "coupons_discount_type_check"  CHECK ("discount_type" IN ('PERCENT', 'FLAT')),
  CONSTRAINT "coupons_discount_value_check" CHECK ("discount_value" > 0),
  -- ONE_TIME_CODE must have a code; STAY_LENGTH and NEW_GUEST must NOT have a code
  CONSTRAINT "coupons_code_type_check" CHECK (
    ("type" = 'ONE_TIME_CODE' AND "code" IS NOT NULL) OR
    ("type" <> 'ONE_TIME_CODE' AND "code" IS NULL)
  ),
  -- STAY_LENGTH must have min_stay_nights
  CONSTRAINT "coupons_min_stay_check" CHECK (
    ("type" = 'STAY_LENGTH' AND "min_stay_nights" IS NOT NULL AND "min_stay_nights" > 0) OR
    ("type" <> 'STAY_LENGTH')
  ),
  -- PERCENT discount value should be 1-100
  CONSTRAINT "coupons_percent_range_check" CHECK (
    ("discount_type" = 'PERCENT' AND "discount_value" <= 100) OR
    ("discount_type" = 'FLAT')
  ),
  CONSTRAINT "coupons_created_by_fk" FOREIGN KEY ("created_by") REFERENCES "admin_users"("id")
);

CREATE INDEX "idx_coupons_type_active"   ON "coupons" ("type", "is_active");
CREATE INDEX "idx_coupons_valid_window"  ON "coupons" ("valid_from", "valid_until");

-- Per-property scope (only populated when applies_to_all_properties = false)
CREATE TABLE "coupon_properties" (
  "coupon_id"   VARCHAR(36) NOT NULL,
  "property_id" VARCHAR(36) NOT NULL,
  PRIMARY KEY ("coupon_id", "property_id"),
  CONSTRAINT "coupon_properties_coupon_fk"   FOREIGN KEY ("coupon_id")   REFERENCES "coupons"("id")    ON DELETE CASCADE,
  CONSTRAINT "coupon_properties_property_fk" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE
);
CREATE INDEX "idx_coupon_properties_property" ON "coupon_properties" ("property_id");

-- Redemption audit (one row per coupon applied per booking)
CREATE TABLE "coupon_redemptions" (
  "id"                   VARCHAR(36)   PRIMARY KEY,
  "coupon_id"            VARCHAR(36)   NOT NULL,
  "guest_id"             VARCHAR(36)   NOT NULL,
  "ezee_reservation_id"  VARCHAR(100)  NOT NULL,
  "property_id"          VARCHAR(36)   NOT NULL,
  "discount_amount"      DECIMAL(10,2) NOT NULL,
  "applied_at"           TIMESTAMP(6)  NOT NULL DEFAULT NOW(),
  "kind"                 VARCHAR(10)   NOT NULL,
  CONSTRAINT "coupon_redemptions_kind_check" CHECK ("kind" IN ('AUTO', 'CODE')),
  CONSTRAINT "coupon_redemptions_coupon_fk"   FOREIGN KEY ("coupon_id")           REFERENCES "coupons"("id"),
  CONSTRAINT "coupon_redemptions_guest_fk"    FOREIGN KEY ("guest_id")            REFERENCES "guests"("id"),
  CONSTRAINT "coupon_redemptions_eri_fk"      FOREIGN KEY ("ezee_reservation_id") REFERENCES "ezee_booking_cache"("ezee_reservation_id"),
  CONSTRAINT "coupon_redemptions_property_fk" FOREIGN KEY ("property_id")         REFERENCES "properties"("id")
);
CREATE INDEX "idx_redemptions_coupon"       ON "coupon_redemptions" ("coupon_id");
CREATE INDEX "idx_redemptions_guest_coupon" ON "coupon_redemptions" ("guest_id", "coupon_id");
CREATE INDEX "idx_redemptions_eri"          ON "coupon_redemptions" ("ezee_reservation_id");

-- Extend ezee_booking_cache with coupon links (both nullable: most bookings have no coupon)
ALTER TABLE "ezee_booking_cache"
  ADD COLUMN "coupon_id_auto" VARCHAR(36),
  ADD COLUMN "coupon_id_code" VARCHAR(36),
  ADD COLUMN "discount_total" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD CONSTRAINT "ezee_booking_cache_coupon_auto_fk" FOREIGN KEY ("coupon_id_auto") REFERENCES "coupons"("id"),
  ADD CONSTRAINT "ezee_booking_cache_coupon_code_fk" FOREIGN KEY ("coupon_id_code") REFERENCES "coupons"("id");

-- Append coupons.view / coupons.edit permissions to existing roles.
-- role-owner gets edit (full CRUD); role-manager + role-reception get view only.
UPDATE "admin_roles"
SET "permissions" = (
  CASE
    WHEN NOT ("permissions" ?| ARRAY['coupons.view','coupons.edit'])
      THEN "permissions" || '["coupons.view","coupons.edit"]'::jsonb
    ELSE "permissions"
  END
)
WHERE "id" = 'role-owner';

UPDATE "admin_roles"
SET "permissions" = (
  CASE
    WHEN NOT ("permissions" ? 'coupons.view')
      THEN "permissions" || '["coupons.view"]'::jsonb
    ELSE "permissions"
  END
)
WHERE "id" IN ('role-manager', 'role-reception');
