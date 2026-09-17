-- Breakfast: per-room, per-PLATE ordering.
--
-- Restructures orders from "one order per room with flat line items + one slot" to
-- "one order per room -> N plates (one per adult) -> each plate has its OWN delivery slot
-- and its OWN dishes". Slot capacity is now counted in PLATES, not rooms.
--
-- Breakfast has never been live on any property (is_enabled defaults false everywhere), so
-- there are NO real orders to preserve. We clear any dev/test order rows before reshaping
-- the order/item tables. (breakfast_menu_item / breakfast_slot / breakfast_config / tokens
-- are untouched.)

TRUNCATE TABLE "breakfast_order_item", "breakfast_order" RESTART IDENTITY CASCADE;

-- 1. New plate table: one plate per adult, carrying its own delivery slot + dishes.
CREATE TABLE "breakfast_plate" (
    "id"               VARCHAR(36)  NOT NULL,
    "order_id"         VARCHAR(36)  NOT NULL,
    "plate_number"     INTEGER      NOT NULL,
    "slot_id"          VARCHAR(36)  NOT NULL,
    "status"           VARCHAR(20)  NOT NULL DEFAULT 'PLACED',
    "special_requests" VARCHAR(500),
    "created_at"       TIMESTAMP(6) NOT NULL DEFAULT now(),
    "updated_at"       TIMESTAMP(6) NOT NULL DEFAULT now(),
    CONSTRAINT "breakfast_plate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "idx_breakfast_plate_order" ON "breakfast_plate" ("order_id");
CREATE INDEX "idx_breakfast_plate_slot" ON "breakfast_plate" ("slot_id");
ALTER TABLE "breakfast_plate"
    ADD CONSTRAINT "breakfast_plate_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "breakfast_order" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "breakfast_plate"
    ADD CONSTRAINT "breakfast_plate_slot_id_fkey"
    FOREIGN KEY ("slot_id") REFERENCES "breakfast_slot" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- 2. breakfast_order: the delivery slot + room-level special_requests move to the plate.
ALTER TABLE "breakfast_order" DROP CONSTRAINT IF EXISTS "breakfast_order_slot_id_fkey";
DROP INDEX IF EXISTS "idx_breakfast_order_slot_date";
ALTER TABLE "breakfast_order" DROP COLUMN IF EXISTS "slot_id";
ALTER TABLE "breakfast_order" DROP COLUMN IF EXISTS "special_requests";

-- 3. breakfast_order_item: line items now hang off a PLATE, not the order.
ALTER TABLE "breakfast_order_item" DROP CONSTRAINT IF EXISTS "breakfast_order_item_order_id_fkey";
DROP INDEX IF EXISTS "idx_breakfast_order_item_order";
ALTER TABLE "breakfast_order_item" DROP COLUMN IF EXISTS "order_id";
ALTER TABLE "breakfast_order_item" ADD COLUMN "plate_id" VARCHAR(36) NOT NULL;
CREATE INDEX "idx_breakfast_order_item_plate" ON "breakfast_order_item" ("plate_id");
ALTER TABLE "breakfast_order_item"
    ADD CONSTRAINT "breakfast_order_item_plate_id_fkey"
    FOREIGN KEY ("plate_id") REFERENCES "breakfast_plate" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
