-- Per-property breakfast on/off toggle (admin-controlled). One row per property;
-- absent row ⇒ disabled (opt-in). Cross-domain FK to properties is DB-enforced only
-- (scalar-only in schema.prisma, same style as the other breakfast tables).

CREATE TABLE "breakfast_config" (
    "property_id" VARCHAR(36)  NOT NULL,
    "is_enabled"  BOOLEAN      NOT NULL DEFAULT false,
    "created_at"  TIMESTAMP(6) NOT NULL DEFAULT now(),
    "updated_at"  TIMESTAMP(6) NOT NULL DEFAULT now(),
    CONSTRAINT "breakfast_config_pkey" PRIMARY KEY ("property_id")
);

ALTER TABLE "breakfast_config"
    ADD CONSTRAINT "fk_breakfast_config_property"
    FOREIGN KEY ("property_id") REFERENCES "properties" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
