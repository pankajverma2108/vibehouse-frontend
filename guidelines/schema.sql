-- ============================================================
-- Vibe House — PostgreSQL DDL Schema v4 (Hybrid Architecture)
-- For import into: https://drawsql.app
--
-- DESIGN: eZee = bookings/rooms source of truth
--         Zoho CRM = staff/ticketing source of truth
--         Our DB = auth, KYC, payments, commerce, thin caches
-- ============================================================

-- ============================================================
-- LAYER 1 — IDENTITY & AUTH
-- ============================================================

CREATE TABLE guests (
    id                VARCHAR(36) PRIMARY KEY,
    name              VARCHAR(255) NOT NULL,
    email             VARCHAR(255) UNIQUE,
    phone             VARCHAR(20) UNIQUE,
    password_hash     VARCHAR(255),
    email_verified    BOOLEAN NOT NULL DEFAULT FALSE,
    phone_verified    BOOLEAN NOT NULL DEFAULT FALSE,
    profile_photo_url VARCHAR(500),
    created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE auth_providers (
    id           VARCHAR(36) PRIMARY KEY,
    guest_id     VARCHAR(36) NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    provider     VARCHAR(50) NOT NULL,   -- google | email | phone
    provider_uid VARCHAR(255) NOT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(provider, provider_uid)
);

CREATE TABLE otp_logs (
    id         VARCHAR(36) PRIMARY KEY,
    guest_id   VARCHAR(36) REFERENCES guests(id) ON DELETE SET NULL,
    recipient  VARCHAR(255) NOT NULL,
    channel    VARCHAR(20) NOT NULL,    -- EMAIL | WHATSAPP | SMS
    purpose    VARCHAR(50) NOT NULL,    -- LOGIN | PHONE_VERIFY | EMAIL_VERIFY | BOOKING_APPROVAL
    otp_hash   VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at    TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE admin_roles (
    id              VARCHAR(36) PRIMARY KEY,
    name            VARCHAR(50) NOT NULL UNIQUE,   -- OWNER | MANAGER | RECEPTION | HOUSEKEEPING_LEAD | MAINTENANCE_LEAD
    display_name    VARCHAR(100) NOT NULL,
    permissions     JSONB NOT NULL,                 -- ["dashboard.view", "inventory.edit", ...]
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE admin_users (
    id              VARCHAR(36) PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    phone           VARCHAR(20),
    password_hash   VARCHAR(255) NOT NULL,
    role_id         VARCHAR(36) NOT NULL REFERENCES admin_roles(id),
    property_id     VARCHAR(36) REFERENCES properties(id),  -- NULL = all properties
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    two_fa_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
    two_fa_secret   VARCHAR(255),
    last_login_at   TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LAYER 2 — PROPERTY & EXTERNAL CONNECTIONS
-- ============================================================

CREATE TABLE properties (
    id              VARCHAR(36) PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    address         TEXT NOT NULL,
    city            VARCHAR(100) NOT NULL,
    branding_config JSONB,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE ezee_connection (
    id                 VARCHAR(36) PRIMARY KEY,
    property_id        VARCHAR(36) NOT NULL REFERENCES properties(id),
    hotel_code         VARCHAR(100) NOT NULL,
    api_key            VARCHAR(255) NOT NULL,
    api_endpoint       VARCHAR(500) NOT NULL,
    channel_manager_id VARCHAR(100),
    is_active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE mygate_connection (
    id                 VARCHAR(36) PRIMARY KEY,
    property_id        VARCHAR(36) NOT NULL REFERENCES properties(id),
    mygate_property_id VARCHAR(100) NOT NULL,
    api_key            VARCHAR(255) NOT NULL,
    api_endpoint       VARCHAR(500) NOT NULL,
    admin_phone        VARCHAR(20),
    is_active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LAYER 3 — BOOKING CACHE (eZee is source of truth)
-- ============================================================

CREATE TABLE ezee_booking_cache (
    ezee_reservation_id VARCHAR(100) PRIMARY KEY,
    property_id         VARCHAR(36) NOT NULL REFERENCES properties(id),
    guest_id            VARCHAR(36) REFERENCES guests(id),
    booker_email        VARCHAR(255),  -- email of original booker from eZee/OTA
    booker_phone        VARCHAR(20),   -- phone of original booker from eZee/OTA
    room_type_name      VARCHAR(100),
    room_number         VARCHAR(20),
    unit_code           VARCHAR(20),
    checkin_date        DATE,
    checkout_date       DATE,
    no_of_guests        INTEGER DEFAULT 1,
    source              VARCHAR(50),
    status              VARCHAR(30),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    fetched_at          TIMESTAMP NOT NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE booking_guest_access (
    id                   VARCHAR(36) PRIMARY KEY,
    ezee_reservation_id  VARCHAR(100) NOT NULL REFERENCES ezee_booking_cache(ezee_reservation_id),
    guest_id             VARCHAR(36) NOT NULL REFERENCES guests(id),
    role                 VARCHAR(20) NOT NULL,   -- PRIMARY | SECONDARY
    status               VARCHAR(30) NOT NULL DEFAULT 'PENDING_APPROVAL',  -- PENDING_APPROVAL | APPROVED | REJECTED
    approved_by_guest_id VARCHAR(36) REFERENCES guests(id),
    approved_at          TIMESTAMP,
    created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(ezee_reservation_id, guest_id)
);

-- ============================================================
-- LAYER 4 — KYC & ACCESS CONTROL
-- ============================================================

CREATE TABLE kyc_submissions (
    id                   VARCHAR(36) PRIMARY KEY,
    ezee_reservation_id  VARCHAR(100) NOT NULL REFERENCES ezee_booking_cache(ezee_reservation_id),
    guest_id             VARCHAR(36) NOT NULL REFERENCES guests(id),
    nationality_type     VARCHAR(20) NOT NULL,   -- INDIAN | INTERNATIONAL
    id_type              VARCHAR(20) NOT NULL,    -- AADHAAR | PASSPORT | DL
    front_image_url      VARCHAR(500) NOT NULL,
    back_image_url       VARCHAR(500),
    ocr_name             VARCHAR(255),
    ocr_dob              VARCHAR(20),
    ocr_id_number        VARCHAR(100),
    ocr_address          TEXT,
    coming_from          VARCHAR(255),
    going_to             VARCHAR(255),
    purpose              VARCHAR(255),
    consent_given        BOOLEAN NOT NULL DEFAULT FALSE,
    status               VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING | PRE_VERIFIED | REJECTED
    submitted_at         TIMESTAMP,
    created_at           TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE checkin_records (
    id                          VARCHAR(36) PRIMARY KEY,
    ezee_reservation_id         VARCHAR(100) NOT NULL REFERENCES ezee_booking_cache(ezee_reservation_id),
    guest_id                    VARCHAR(36) NOT NULL REFERENCES guests(id),
    selfie_url                  VARCHAR(500),
    face_match_score            DECIMAL(4, 3),
    face_match_status           VARCHAR(10),     -- PASS | FAIL | RETRY
    onsite_scan_url             VARCHAR(500),
    ssim_score                  DECIMAL(4, 3),
    doc_match_status            VARCHAR(10),     -- MATCH | MISMATCH
    gcard_pdf_url               VARCHAR(500),
    signature_png_url           VARCHAR(500),
    manual_override             BOOLEAN NOT NULL DEFAULT FALSE,
    override_by_zoho_staff_id   VARCHAR(100),    -- Zoho staff ID (no local FK)
    status                      VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    checked_in_at               TIMESTAMP
);

CREATE TABLE mygate_devices (
    id              VARCHAR(36) PRIMARY KEY,
    property_id     VARCHAR(36) NOT NULL REFERENCES properties(id),
    room_number     VARCHAR(20) NOT NULL,
    mygate_room_id  VARCHAR(100) NOT NULL,
    lock_serial     VARCHAR(100) NOT NULL,
    lock_type       VARCHAR(20) NOT NULL,        -- WIFI | BLUETOOTH
    battery_pct     INTEGER,
    battery_status  VARCHAR(10) NOT NULL DEFAULT 'OK',  -- OK | LOW | CRITICAL | DEAD
    last_health_at  TIMESTAMP,
    has_manual_key  BOOLEAN NOT NULL DEFAULT TRUE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE smart_lock_access (
    id                   VARCHAR(36) PRIMARY KEY,
    ezee_reservation_id  VARCHAR(100) NOT NULL REFERENCES ezee_booking_cache(ezee_reservation_id),
    guest_id             VARCHAR(36) NOT NULL REFERENCES guests(id),
    device_id            VARCHAR(36) NOT NULL REFERENCES mygate_devices(id),
    room_number          VARCHAR(20) NOT NULL,
    mygate_pin           VARCHAR(20) NOT NULL,
    pin_type             VARCHAR(10) NOT NULL DEFAULT 'AUTO',     -- AUTO | CUSTOM
    pin_validity         VARCHAR(10) NOT NULL DEFAULT 'TIMED',    -- TIMED | PERMANENT
    is_master_pin        BOOLEAN NOT NULL DEFAULT FALSE,
    pin_status           VARCHAR(10) NOT NULL DEFAULT 'ACTIVE',   -- ACTIVE | EXPIRED | REVOKED
    valid_from           TIMESTAMP NOT NULL,
    valid_until          TIMESTAMP,              -- null for permanent staff PINs
    created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
    revoked_at           TIMESTAMP
);

CREATE TABLE smart_lock_access_log (
    id              VARCHAR(36) PRIMARY KEY,
    device_id       VARCHAR(36) NOT NULL REFERENCES mygate_devices(id),
    pin_id          VARCHAR(36) REFERENCES smart_lock_access(id),
    event_type      VARCHAR(20) NOT NULL,        -- UNLOCK | LOCK | TAMPER | BATTERY_LOW
    event_source    VARCHAR(20) NOT NULL,         -- PIN | MANUAL_KEY | STAFF_OVERRIDE
    event_at        TIMESTAMP NOT NULL,
    raw_payload     JSONB,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LAYER 5 — COMMERCE & INVENTORY
-- ============================================================

CREATE TABLE payments (
    id                   VARCHAR(36) PRIMARY KEY,
    ezee_reservation_id  VARCHAR(100) NOT NULL REFERENCES ezee_booking_cache(ezee_reservation_id),
    guest_id             VARCHAR(36) NOT NULL REFERENCES guests(id),
    razorpay_order_id    VARCHAR(100) UNIQUE,
    razorpay_payment_id  VARCHAR(100) UNIQUE,
    amount               DECIMAL(10, 2) NOT NULL,
    currency             VARCHAR(5) NOT NULL DEFAULT 'INR',
    purpose              VARCHAR(30) NOT NULL,   -- ADDON | EXTENSION | BORROWABLE_DEPOSIT
    status               VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    expires_at           TIMESTAMP,
    created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE product_catalog (
    id          VARCHAR(36) PRIMARY KEY,
    property_id VARCHAR(36) NOT NULL REFERENCES properties(id),
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    category    VARCHAR(20) NOT NULL,   -- COMMODITY | SERVICE | BORROWABLE
    base_price  DECIMAL(10, 2) NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE addon_orders (
    id                   VARCHAR(36) PRIMARY KEY,
    ezee_reservation_id  VARCHAR(100) NOT NULL REFERENCES ezee_booking_cache(ezee_reservation_id),
    guest_id             VARCHAR(36) NOT NULL REFERENCES guests(id),
    payment_id           VARCHAR(36) REFERENCES payments(id),
    phase                VARCHAR(20) NOT NULL,   -- PRE_ARRIVAL | DURING_STAY
    status               VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    ezee_sync_status     VARCHAR(20) NOT NULL DEFAULT 'NOT_SYNCED',
    created_at           TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE addon_order_items (
    id             VARCHAR(36) PRIMARY KEY,
    addon_order_id VARCHAR(36) NOT NULL REFERENCES addon_orders(id),
    product_id     VARCHAR(36) NOT NULL REFERENCES product_catalog(id),
    quantity       INTEGER NOT NULL DEFAULT 1,
    unit_price     DECIMAL(10, 2) NOT NULL,
    total_price    DECIMAL(10, 2) NOT NULL,
    unit_code      VARCHAR(20)  -- Bed/room code if item is bed-specific
);

CREATE TABLE inventory (
    id                  VARCHAR(36) PRIMARY KEY,
    property_id         VARCHAR(36) NOT NULL REFERENCES properties(id),
    product_id          VARCHAR(36) NOT NULL REFERENCES product_catalog(id),
    total_stock         INTEGER NOT NULL,
    available_stock     INTEGER NOT NULL,
    reserved_stock      INTEGER NOT NULL DEFAULT 0,
    sold_count          INTEGER NOT NULL DEFAULT 0,
    damaged_count       INTEGER NOT NULL DEFAULT 0,
    borrowed_out_count  INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 5,
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(property_id, product_id)
);

CREATE TABLE borrowable_checkouts (
    id                                VARCHAR(36) PRIMARY KEY,
    inventory_id                      VARCHAR(36) NOT NULL REFERENCES inventory(id),
    ezee_reservation_id               VARCHAR(100) NOT NULL REFERENCES ezee_booking_cache(ezee_reservation_id),
    guest_id                          VARCHAR(36) NOT NULL REFERENCES guests(id),
    unit_code                         VARCHAR(20) NOT NULL,     -- bed code fetched from eZee
    checked_out_at                    TIMESTAMP NOT NULL DEFAULT NOW(),
    returned_at                       TIMESTAMP,
    returned_verified_by_zoho_staff_id VARCHAR(100),            -- Zoho staff ID
    status                            VARCHAR(15) NOT NULL DEFAULT 'CHECKED_OUT',  -- CHECKED_OUT | RETURNED | OVERDUE
    issued_by_admin_id                VARCHAR(255)  -- admin_users.id who issued the item
);

CREATE TABLE stay_extensions (
    id                   VARCHAR(36) PRIMARY KEY,
    ezee_reservation_id  VARCHAR(100) NOT NULL REFERENCES ezee_booking_cache(ezee_reservation_id),
    guest_id             VARCHAR(36) NOT NULL REFERENCES guests(id),
    payment_id           VARCHAR(36) REFERENCES payments(id),
    old_checkout_date    DATE NOT NULL,
    new_checkout_date    DATE NOT NULL,
    rate_per_night       DECIMAL(10, 2) NOT NULL,
    total_amount         DECIMAL(10, 2) NOT NULL,
    same_bed_available   BOOLEAN NOT NULL,
    disclaimer_accepted  BOOLEAN NOT NULL DEFAULT FALSE,
    ezee_sync_status     VARCHAR(20) NOT NULL DEFAULT 'NOT_SYNCED',
    status               VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at           TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LAYER 6 — INTEGRATION & LOGGING
-- ============================================================

CREATE TABLE ezee_sync_log (
    id                VARCHAR(36) PRIMARY KEY,
    entity_type       VARCHAR(30) NOT NULL,
    entity_id         VARCHAR(36) NOT NULL,
    action            VARCHAR(50) NOT NULL,
    status            VARCHAR(10) NOT NULL DEFAULT 'PENDING',
    attempts          INTEGER NOT NULL DEFAULT 0,
    last_attempted_at TIMESTAMP,
    next_retry_at     TIMESTAMP,
    error_message     TEXT,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE zoho_ticket_ref (
    id                   VARCHAR(36) PRIMARY KEY,
    zoho_ticket_id       VARCHAR(100) NOT NULL UNIQUE,
    ezee_reservation_id  VARCHAR(100) REFERENCES ezee_booking_cache(ezee_reservation_id),
    guest_id             VARCHAR(36) REFERENCES guests(id),
    addon_order_id       VARCHAR(36) REFERENCES addon_orders(id),
    ticket_type          VARCHAR(20) NOT NULL,
    department           VARCHAR(30) NOT NULL,
    room_number          VARCHAR(20),
    unit_code            VARCHAR(20),
    status               VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    synced_at            TIMESTAMP NOT NULL,
    created_at           TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE sla_config (
    id              VARCHAR(36) PRIMARY KEY,
    property_id     VARCHAR(36) NOT NULL REFERENCES properties(id),
    task_category   VARCHAR(20) NOT NULL,        -- FREE | BORROWABLE | CHARGEABLE | MAINTENANCE
    department      VARCHAR(30) NOT NULL,         -- HOUSEKEEPING | MAINTENANCE | FRONT_OFFICE
    priority        VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
    sla_minutes     INTEGER NOT NULL,
    l0_timeout_min  INTEGER NOT NULL,
    l1_timeout_min  INTEGER NOT NULL,
    l2_timeout_min  INTEGER NOT NULL,
    l3_timeout_min  INTEGER NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(property_id, task_category, department, priority)
);

CREATE TABLE admin_activity_log (
    id              VARCHAR(36) PRIMARY KEY,
    actor_type      VARCHAR(20) NOT NULL,         -- ADMIN | MANAGER | SYSTEM
    actor_id        VARCHAR(100) NOT NULL,         -- Zoho staff ID or SYSTEM
    action          VARCHAR(50) NOT NULL,
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       VARCHAR(36) NOT NULL,
    old_value       JSONB,
    new_value       JSONB,
    ip_address      VARCHAR(45),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_log (
    id                        VARCHAR(36) PRIMARY KEY,
    recipient_guest_id        VARCHAR(36) REFERENCES guests(id),
    recipient_zoho_staff_id   VARCHAR(100),    -- Zoho staff ID (no local FK)
    channel                   VARCHAR(20) NOT NULL,
    type                      VARCHAR(50) NOT NULL,
    payload                   JSONB,
    status                    VARCHAR(10) NOT NULL DEFAULT 'SENT',
    sent_at                   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_ezee_cache_guest          ON ezee_booking_cache(guest_id);
CREATE INDEX idx_ezee_cache_property       ON ezee_booking_cache(property_id, status);
CREATE INDEX idx_booking_access_guest      ON booking_guest_access(guest_id);
CREATE INDEX idx_booking_access_reservation ON booking_guest_access(ezee_reservation_id);
CREATE INDEX idx_kyc_reservation           ON kyc_submissions(ezee_reservation_id, guest_id);
CREATE INDEX idx_checkin_reservation       ON checkin_records(ezee_reservation_id);
CREATE INDEX idx_device_property           ON mygate_devices(property_id, is_active);
CREATE INDEX idx_device_battery            ON mygate_devices(battery_status) WHERE battery_status != 'OK';
CREATE INDEX idx_lock_access_reservation   ON smart_lock_access(ezee_reservation_id, pin_status);
CREATE INDEX idx_lock_access_device        ON smart_lock_access(device_id, pin_status);
CREATE INDEX idx_lock_log_device           ON smart_lock_access_log(device_id, event_at);
CREATE INDEX idx_lock_log_pin              ON smart_lock_access_log(pin_id);
CREATE INDEX idx_payments_reservation      ON payments(ezee_reservation_id);
CREATE INDEX idx_payments_status_expires   ON payments(status, expires_at);
CREATE INDEX idx_addon_orders_reservation  ON addon_orders(ezee_reservation_id);
CREATE INDEX idx_inventory_product         ON inventory(property_id, product_id);
CREATE INDEX idx_borrowable_guest_status   ON borrowable_checkouts(guest_id, status);
CREATE INDEX idx_ezee_sync_status_retry    ON ezee_sync_log(status, next_retry_at);
CREATE INDEX idx_zoho_ticket_reservation   ON zoho_ticket_ref(ezee_reservation_id);
CREATE INDEX idx_zoho_ticket_status        ON zoho_ticket_ref(status);
CREATE INDEX idx_sla_config_lookup         ON sla_config(property_id, task_category, department, priority);
CREATE INDEX idx_admin_log_entity          ON admin_activity_log(entity_type, entity_id);
CREATE INDEX idx_admin_log_actor           ON admin_activity_log(actor_id, created_at);
CREATE INDEX idx_admin_users_role          ON admin_users(role_id);
CREATE INDEX idx_admin_users_property      ON admin_users(property_id) WHERE property_id IS NOT NULL;
CREATE INDEX idx_admin_users_email_active  ON admin_users(email, is_active);
