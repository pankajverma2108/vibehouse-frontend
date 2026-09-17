-- Breakfast pre-ordering (BRD docs/plans/breakfast_brd.md, Phase 1).
-- Five additive tables: an admin menu CATALOG (no stock), configurable delivery SLOTS,
-- one ORDER per room per service_date (+ line ITEMS), and a per-stay Cx ACCESS TOKEN
-- (only the SHA-256 stored). Cross-domain FKs (property/booking/guest) are enforced in
-- the DB here even though they are scalar-only in schema.prisma — same decoupled style
-- as wa_service_request. Intra-domain FKs are Prisma-modelled (order ↔ items ↔ slot).

-- ── Menu catalog ────────────────────────────────────────────────────────────
CREATE TABLE "breakfast_menu_item" (
    "id"           VARCHAR(36)  NOT NULL,
    "property_id"  VARCHAR(36)  NOT NULL,
    "name"         VARCHAR(255) NOT NULL,
    "description"  TEXT,
    "category"     VARCHAR(20)  NOT NULL DEFAULT 'MAIN',
    "is_veg"       BOOLEAN      NOT NULL DEFAULT true,
    "forecast_key" VARCHAR(100),
    "sort_order"   INTEGER      NOT NULL DEFAULT 0,
    "is_active"    BOOLEAN      NOT NULL DEFAULT true,
    "created_at"   TIMESTAMP(6) NOT NULL DEFAULT now(),
    "updated_at"   TIMESTAMP(6) NOT NULL DEFAULT now(),
    CONSTRAINT "breakfast_menu_item_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "idx_breakfast_menu_property" ON "breakfast_menu_item" ("property_id", "is_active");

-- ── Delivery-slot definitions ───────────────────────────────────────────────
CREATE TABLE "breakfast_slot" (
    "id"          VARCHAR(36) NOT NULL,
    "property_id" VARCHAR(36) NOT NULL,
    "slot_number" INTEGER     NOT NULL,
    "label"       VARCHAR(50) NOT NULL,
    "start_min"   INTEGER     NOT NULL,
    "end_min"     INTEGER     NOT NULL,
    "capacity"    INTEGER     NOT NULL DEFAULT 12,
    "sort_order"  INTEGER     NOT NULL DEFAULT 0,
    "is_active"   BOOLEAN     NOT NULL DEFAULT true,
    "created_at"  TIMESTAMP(6) NOT NULL DEFAULT now(),
    "updated_at"  TIMESTAMP(6) NOT NULL DEFAULT now(),
    CONSTRAINT "breakfast_slot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "uq_breakfast_slot_property_number" ON "breakfast_slot" ("property_id", "slot_number");
CREATE INDEX "idx_breakfast_slot_property" ON "breakfast_slot" ("property_id", "is_active");

-- ── Orders (one per room per service_date) ──────────────────────────────────
CREATE TABLE "breakfast_order" (
    "id"                  VARCHAR(36)  NOT NULL,
    "property_id"         VARCHAR(36)  NOT NULL,
    "ezee_reservation_id" VARCHAR(100) NOT NULL,
    "guest_id"            VARCHAR(36),
    "brand"               VARCHAR(20)  NOT NULL,
    "service_date"        DATE         NOT NULL,
    "slot_id"             VARCHAR(36),
    "status"              VARCHAR(20)  NOT NULL DEFAULT 'PLACED',
    "no_of_guests"        INTEGER,
    "room_number"         VARCHAR(20),
    "special_requests"    VARCHAR(2000),
    "placed_via"          VARCHAR(20)  NOT NULL DEFAULT 'CX_LINK',
    "created_at"          TIMESTAMP(6) NOT NULL DEFAULT now(),
    "updated_at"          TIMESTAMP(6) NOT NULL DEFAULT now(),
    CONSTRAINT "breakfast_order_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "uq_breakfast_order_eri_date" ON "breakfast_order" ("ezee_reservation_id", "service_date");
CREATE INDEX "idx_breakfast_order_property_date" ON "breakfast_order" ("property_id", "service_date");
CREATE INDEX "idx_breakfast_order_slot_date" ON "breakfast_order" ("slot_id", "service_date");

-- ── Order line items ────────────────────────────────────────────────────────
CREATE TABLE "breakfast_order_item" (
    "id"           VARCHAR(36)  NOT NULL,
    "order_id"     VARCHAR(36)  NOT NULL,
    "menu_item_id" VARCHAR(36)  NOT NULL,
    "qty"          INTEGER      NOT NULL DEFAULT 1,
    "created_at"   TIMESTAMP(6) NOT NULL DEFAULT now(),
    CONSTRAINT "breakfast_order_item_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "idx_breakfast_order_item_order" ON "breakfast_order_item" ("order_id");

-- ── Per-stay Cx access token (SHA-256 only) ─────────────────────────────────
CREATE TABLE "breakfast_access_token" (
    "id"                  VARCHAR(36)  NOT NULL,
    "ezee_reservation_id" VARCHAR(100) NOT NULL,
    "guest_id"            VARCHAR(36),
    "property_id"         VARCHAR(36)  NOT NULL,
    "brand"               VARCHAR(20)  NOT NULL,
    "token_hash"          VARCHAR(64)  NOT NULL,
    "issued_at"           TIMESTAMP(6) NOT NULL DEFAULT now(),
    "revoked_at"          TIMESTAMP(6),
    "expires_at"          TIMESTAMP(6) NOT NULL,
    "created_at"          TIMESTAMP(6) NOT NULL DEFAULT now(),
    CONSTRAINT "breakfast_access_token_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "breakfast_access_token_token_hash_key" ON "breakfast_access_token" ("token_hash");
CREATE INDEX "idx_breakfast_token_eri" ON "breakfast_access_token" ("ezee_reservation_id");

-- ── Intra-domain FKs (Prisma-modelled) ──────────────────────────────────────
ALTER TABLE "breakfast_order"
    ADD CONSTRAINT "breakfast_order_slot_id_fkey"
    FOREIGN KEY ("slot_id") REFERENCES "breakfast_slot" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "breakfast_order_item"
    ADD CONSTRAINT "breakfast_order_item_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "breakfast_order" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "breakfast_order_item"
    ADD CONSTRAINT "breakfast_order_item_menu_item_id_fkey"
    FOREIGN KEY ("menu_item_id") REFERENCES "breakfast_menu_item" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ── Cross-domain FKs (DB-enforced only; scalar-only in schema.prisma) ────────
ALTER TABLE "breakfast_menu_item"
    ADD CONSTRAINT "fk_breakfast_menu_property"
    FOREIGN KEY ("property_id") REFERENCES "properties" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "breakfast_slot"
    ADD CONSTRAINT "fk_breakfast_slot_property"
    FOREIGN KEY ("property_id") REFERENCES "properties" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "breakfast_order"
    ADD CONSTRAINT "fk_breakfast_order_property"
    FOREIGN KEY ("property_id") REFERENCES "properties" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "breakfast_order"
    ADD CONSTRAINT "fk_breakfast_order_eri"
    FOREIGN KEY ("ezee_reservation_id") REFERENCES "ezee_booking_cache" ("ezee_reservation_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "breakfast_order"
    ADD CONSTRAINT "fk_breakfast_order_guest"
    FOREIGN KEY ("guest_id") REFERENCES "guests" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "breakfast_access_token"
    ADD CONSTRAINT "fk_breakfast_token_property"
    FOREIGN KEY ("property_id") REFERENCES "properties" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "breakfast_access_token"
    ADD CONSTRAINT "fk_breakfast_token_eri"
    FOREIGN KEY ("ezee_reservation_id") REFERENCES "ezee_booking_cache" ("ezee_reservation_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
