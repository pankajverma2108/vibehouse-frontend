-- Prospect (non-guest) WhatsApp session state: remembers which property a
-- non-checked-in number picked from the property_selector_v3 template, scoped to
-- a chat session via an idle window enforced in application code.
CREATE TABLE "wa_prospect_session" (
    "id"               VARCHAR(36)  NOT NULL,
    "brand"            VARCHAR(20)  NOT NULL,
    "wa_id"            VARCHAR(20)  NOT NULL,
    "property_id"      VARCHAR(36),
    "pending_query"    VARCHAR(2000),
    "selector_sent_at" TIMESTAMP(6),
    "last_message_at"  TIMESTAMP(6) NOT NULL DEFAULT now(),
    "created_at"       TIMESTAMP(6) NOT NULL DEFAULT now(),
    CONSTRAINT "wa_prospect_session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_wa_prospect_session_brand_wa" ON "wa_prospect_session" ("brand", "wa_id");
