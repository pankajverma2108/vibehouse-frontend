-- Group-booking room disambiguation state for the WhatsApp service front door.
--
-- When a CHECKED-IN guest whose booking spans several rooms sends a service request, the bot
-- asks "which room?" and stashes the original request here until they reply with a room. The
-- next inbound is interpreted in that context (a bare "103" only means room 103 while this row
-- exists). Mirrors `wa_prospect_session`: one row per (brand, wa_id), an app-code idle TTL
-- (WA_ROOM_SELECTION_TTL_MIN), row deleted once the room is picked or the guest changes topic.
CREATE TABLE "wa_pending_room_selection" (
    "id"              VARCHAR(36)  NOT NULL,
    "brand"           VARCHAR(20)  NOT NULL,
    "wa_id"           VARCHAR(20)  NOT NULL,
    "eri"             VARCHAR(50)  NOT NULL,
    "guest_id"        VARCHAR(36),
    "property_id"     VARCHAR(36)  NOT NULL,
    "pending_text"    VARCHAR(2000) NOT NULL,
    "candidate_rooms" VARCHAR(500) NOT NULL,
    "asked_at"        TIMESTAMP(6) NOT NULL,
    "last_message_at" TIMESTAMP(6) NOT NULL DEFAULT now(),
    "created_at"      TIMESTAMP(6) NOT NULL DEFAULT now(),
    CONSTRAINT "wa_pending_room_selection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_wa_pending_room_brand_wa" ON "wa_pending_room_selection" ("brand", "wa_id");
