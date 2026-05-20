# Vibe House — Finalised Workflows Index

> **Version**: v1.0 | **Last Updated**: March 2026  
> All workflows reflect final decisions made during architecture review sessions.

---

## Workflow Files

| # | File | Domain | Description |
|---|------|--------|-------------|
| 01 | [01_guest_auth.md](./01_guest_auth.md) | Identity & Auth | Signup, login, OTP verification, OAuth |
| 02 | [02_booking_linking.md](./02_booking_linking.md) | Booking | Linking eZee reservation ID, PRIMARY/SECONDARY role detection |
| 03 | [03_kyc_precheckin.md](./03_kyc_precheckin.md) | KYC | Remote ID upload, OCR, travel info, pre-verification |
| 04 | [04_onsite_checkin.md](./04_onsite_checkin.md) | Check-in | Tablet kiosk, face match, G-Card, digital signature |
| 05 | [05_smart_lock.md](./05_smart_lock.md) | Access Control | MyGate PIN generation, device health, access logs |
| 06 | [06_payment_flow.md](./06_payment_flow.md) | Payments | Razorpay order lifecycle, webhook, eZee folio sync |
| 07 | [07_prearrival_upsell.md](./07_prearrival_upsell.md) | Commerce | Pre-arrival add-on cart, inventory hold, payment, eZee sync |
| 08 | [08_during_stay_services.md](./08_during_stay_services.md) | Commerce | Free/Borrowable/Chargeable request routing, SLA trigger |
| 09 | [09_stay_extension.md](./09_stay_extension.md) | Commerce | Extend stay, live eZee rate, same-bed logic, payment |
| 10 | [10_borrowable_checkout.md](./10_borrowable_checkout.md) | Inventory | Borrowable item checkout, anti-hoarding, return verification |
| 11 | [11_sla_ticketing.md](./11_sla_ticketing.md) | Operations | Task creation, auto-assignment, L0-L4 escalation, Zoho |
| 12 | [12_kafka_workers.md](./12_kafka_workers.md) | Infrastructure | Ops Task Worker + Notification Worker — event topics & flows |
| 13 | [13_postgres_setup.md](./13_postgres_setup.md) | Database | PostgreSQL 17 install, credentials, pgAdmin setup, table overview, ORM guide |
| 14 | [14_admin_panel_auth.md](./14_admin_panel_auth.md) | Admin | Role-based admin login, permission guard, future 2FA OTP |

---

## Architecture Decisions at a Glance

| Decision | Chosen Approach |
|---|---|
| **Booking System** | eZee PMS is source of truth. Thin cache in `ezee_booking_cache`. |
| **Staff & Ticketing** | Zoho CRM. Thin ref cache in `zoho_ticket_ref`. Staff interact via WhatsApp (Wati). |
| **Payments** | Razorpay. All charges auto-synced to eZee folio. |
| **Smart Locks** | MyGate. PIN-based only (no Bluetooth unlock). Per-guest unique PINs. |
| **Notifications** | WhatsApp via Wati. Notification Worker handles all outbound messages. |
| **Auth** | Google OAuth + Email/Phone OTP. |
| **Database** | PostgreSQL 17 (25 tables). Redis for caching eZee data. |
| **Async** | Kafka with Ops Task Worker + Notification Worker + eZee Sync Worker. |
