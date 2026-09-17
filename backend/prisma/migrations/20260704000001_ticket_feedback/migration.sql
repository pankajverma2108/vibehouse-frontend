-- Post-completion guest CSAT: one row per completed ticket's feedback invite.
-- Single-use opaque link — we store only the SHA-256 of the token (never the raw
-- token). rating (1..5) + comment stay null until the guest submits; submitted_at
-- is the one-shot guard, expires_at kills stale links.

CREATE TABLE "ticket_feedback" (
    "id"             VARCHAR(36)  NOT NULL,
    "ticket_id"      VARCHAR(36)  NOT NULL,
    "zoho_ticket_id" VARCHAR(100),
    "guest_id"       VARCHAR(36),
    "brand"          VARCHAR(20)  NOT NULL,
    "token_hash"     VARCHAR(64)  NOT NULL,
    "rating"         SMALLINT,
    "comment"        VARCHAR(2000),
    "expires_at"     TIMESTAMP(6) NOT NULL,
    "submitted_at"   TIMESTAMP(6),
    "pushed_to_zoho" BOOLEAN      NOT NULL DEFAULT false,
    "created_at"     TIMESTAMP(6) NOT NULL DEFAULT now(),
    CONSTRAINT "ticket_feedback_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ticket_feedback_token_hash_key" ON "ticket_feedback" ("token_hash");
CREATE INDEX "idx_ticket_feedback_ticket" ON "ticket_feedback" ("ticket_id");
