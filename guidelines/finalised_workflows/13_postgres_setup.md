# Workflow 13 — PostgreSQL Setup & Database Configuration

## Overview
The Daily Social uses **PostgreSQL 17** as the primary relational database. This document captures the full setup, credentials, connection details, and how to manage the database going forward.

---

## 1. Installation Summary

| Detail | Value |
|---|---|
| Version | PostgreSQL 17.9 |
| Installer | EDB (EnterpriseDB) Windows Installer |
| Install Path | `C:\Program Files\PostgreSQL\17\` |
| Data Directory | `C:\Program Files\PostgreSQL\17\data\` |
| Windows Service | `postgresql-x64-17` (auto-starts on boot) |
| Port | `5432` (default) |
| GUI Tool | pgAdmin 4 (installed alongside PostgreSQL) |

---

## 2. Credentials

| Role | Username | Password | Purpose |
|---|---|---|---|
| **Superuser** | `postgres` | `upamanyu` | Admin only — never use in app code |
| **App User** | `vibehouse_app` | `VhApp@2026` | Used by Node.js backend in `.env` |

> ⚠️ Never hardcode credentials in source code. Always use environment variables.

---

## 3. Database Details

| Property | Value |
|---|---|
| Database Name | `vibehouse` |
| Owner | `postgres` |
| App User Permissions | `ALL PRIVILEGES` on `vibehouse` + `public` schema |
| Table Count | 25 tables |
| Index Count | 23 indexes |

---

## 4. Environment Variable (`.env`)

Add this to your Node.js backend `.env` file:

```env
# PostgreSQL Connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vibehouse
DB_USER=vibehouse_app
DB_PASS=VhApp@2026

# Full connection string (for Prisma / Knex / pg)
DATABASE_URL=postgresql://vibehouse_app:VhApp@2026@localhost:5432/vibehouse
```

---

## 5. Setup Commands Reference

These are the commands that were run to set up the database. Run them again only if rebuilding from scratch.

### Add psql to PATH (run per terminal session, or add permanently)
```powershell
$env:PATH = "C:\Program Files\PostgreSQL\17\bin;" + $env:PATH
```

### Connect as superuser
```powershell
$env:PGPASSWORD = "upamanyu"
psql -U postgres
```

### Create the database
```sql
CREATE DATABASE vibehouse;
```

### Create the app user with limited permissions
```sql
CREATE USER vibehouse_app WITH PASSWORD 'VhApp@2026';
GRANT ALL PRIVILEGES ON DATABASE vibehouse TO vibehouse_app;
GRANT ALL ON SCHEMA public TO vibehouse_app;
```

### Run the schema (create all 25 tables + 23 indexes)
```powershell
$env:PGPASSWORD = "upamanyu"
psql -U postgres -d vibehouse -f "d:\VibeHouse\docs\schema.sql"
```

### Verify all tables exist
```powershell
psql -U postgres -d vibehouse -P pager=off -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
```

---

## 6. pgAdmin 4 — GUI Setup Guide

pgAdmin 4 is a browser-based visual database manager (like MongoDB Compass for PostgreSQL).

### Launch pgAdmin
Open **pgAdmin 4** from Start Menu → it opens in your browser at `http://127.0.0.1:[port]`

### First Time — Set pgAdmin Master Password
pgAdmin asks for a **master password** on first launch. This is separate from PostgreSQL's password — it's just for the pgAdmin app itself.

### Register Your Server
1. In the left sidebar → right-click **Servers** → **Register → Server**
2. **General tab**:
   - Name: `The Daily Social Local`
3. **Connection tab**:
   - Host: `localhost`
   - Port: `5432`
   - Maintenance DB: `vibehouse`
   - Username: `postgres`
   - Password: `upamanyu`
   - ✅ Tick "Save password"
4. Click **Save**

### Navigate to Tables
```
Servers
  └── The Daily Social Local
        └── Databases
              └── vibehouse
                    └── Schemas
                          └── public
                                └── Tables   ← All 25 tables here
```

### View Table Data
Right-click any table → **View/Edit Data → All Rows**
(Equivalent to MongoDB Compass document view)

### Run SQL Queries
Right-click `vibehouse` → **Query Tool** → type SQL → press `F5`

---

## 7. Common psql Commands (Comparison with MongoDB Shell)

| MongoDB (mongosh) | PostgreSQL (psql) | What it does |
|---|---|---|
| `show dbs` | `\l` | List all databases |
| `use vibehouse` | `\c vibehouse` | Switch to a database |
| `show collections` | `\dt` | List all tables |
| `db.guests.find()` | `SELECT * FROM guests;` | Fetch all rows |
| `db.guests.find({email_verified: true})` | `SELECT * FROM guests WHERE email_verified = true;` | Filter |
| `db.guests.countDocuments()` | `SELECT COUNT(*) FROM guests;` | Count rows |
| `db.guests.drop()` | `DROP TABLE guests;` | Delete table |
| `\q` or `exit` | `\q` | Exit psql |

---

## 8. Table Overview (25 Tables)

Organised by layer:

### Layer 1 — Identity & Auth
| Table | Purpose |
|---|---|
| `guests` | Guest accounts (email, phone, password hash) |
| `auth_providers` | OAuth / phone / email login methods |
| `otp_logs` | OTP verification history |

### Layer 2 — Property & Connections
| Table | Purpose |
|---|---|
| `properties` | Property master (branding, config) |
| `ezee_connection` | eZee PMS API credentials per property |
| `mygate_connection` | MyGate smart lock API credentials per property |

### Layer 3 — Booking Cache
| Table | Purpose |
|---|---|
| `ezee_booking_cache` | Thin cache of eZee reservation data |
| `booking_guest_access` | Guest ↔ booking permissions (PRIMARY/SECONDARY) |

### Layer 4 — KYC & Access Control
| Table | Purpose |
|---|---|
| `kyc_submissions` | ID uploads, OCR data, travel info, status |
| `checkin_records` | Kiosk face match, G-Card, signature, check-in status |
| `mygate_devices` | Lock device registry with battery health |
| `smart_lock_access` | Per-guest PIN records |
| `smart_lock_access_log` | Every UNLOCK / LOCK / TAMPER event |

### Layer 5 — Commerce & Inventory
| Table | Purpose |
|---|---|
| `product_catalog` | Sellable items master |
| `inventory` | Stock counts (opening, sold, damaged, available) |
| `addon_orders` | Order header |
| `addon_order_items` | Order line items (price locked at purchase) |
| `payments` | Razorpay payment lifecycle |
| `borrowable_checkouts` | Borrowable item checkout/return state |
| `stay_extensions` | Stay extension records |

### Layer 6 — Integration & Logging
| Table | Purpose |
|---|---|
| `ezee_sync_log` | eZee API call outcomes + retry tracking |
| `zoho_ticket_ref` | Thin reference to Zoho CRM tickets |
| `sla_config` | Admin-configurable SLA timers |
| `admin_activity_log` | Admin action audit trail |
| `notification_log` | All WhatsApp/Email messages sent |

---

## 9. Schema File Location

```
d:\VibeHouse\docs\schema.sql    ← PostgreSQL DDL (run this to create tables)
```

DBML version (for dbdiagram.io visual ERD):
```
[artifact brain folder]\schema.dbml
```

---

## 10. Recommended ORM / Query Builder

For your Node.js backend, use one of:

| Tool | Type | Best For |
|---|---|---|
| **Prisma** | Full ORM | Type-safe queries, migrations, schema as code |
| **Knex.js** | Query Builder | SQL-like control, flexible |
| **pg** (node-postgres) | Raw driver | Maximum control, for complex queries |

**Recommendation**: Start with **Prisma** — it's the MongoDB Mongoose equivalent for PostgreSQL, with auto-generated TypeScript types.

```bash
# Install Prisma
npm install prisma @prisma/client
npx prisma init

# Connect to vibehouse DB in prisma/.env
DATABASE_URL="postgresql://vibehouse_app:VhApp@2026@localhost:5432/vibehouse"

# Pull existing schema into Prisma schema file
npx prisma db pull
```
