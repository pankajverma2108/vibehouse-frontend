-- Per-ticket flow trace (observability): one row per module step with i/o + latency.

CREATE TABLE "flow_log" (
    "id"         VARCHAR(36)  NOT NULL,
    "trace_id"   VARCHAR(36)  NOT NULL,
    "ticket_id"  VARCHAR(36),
    "brand"      VARCHAR(20),
    "module"     VARCHAR(40)  NOT NULL,
    "input"      TEXT,
    "output"     TEXT,
    "status"     VARCHAR(10)  NOT NULL DEFAULT 'OK',
    "error"      TEXT,
    "latency_ms" INTEGER,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT now(),
    CONSTRAINT "flow_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_flow_log_ticket" ON "flow_log" ("ticket_id");
CREATE INDEX "idx_flow_log_trace" ON "flow_log" ("trace_id");
