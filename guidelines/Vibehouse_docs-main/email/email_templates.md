# TheDailySocial — Email Templates

> **From**: `noreply@thedailysocial.co.in` (via AWS SES, ap-south-1)  
> **Template engine**: Inline HTML (email-client safe)  
> **Charset**: UTF-8

---

## Template 1 — Email Verification OTP

> **When it's sent:** Triggered when a guest signs up with email/password or requests a password reset. The OTP is valid for 10 minutes. Guest must enter this code to verify their email before they can log in or complete the password reset flow.

**Subject**: `🔐 Your TheDailySocial verification code`

---

### Visual Layout (rendered)

```
┌────────────────────────────────────────────────────┐
│  TheDailySocial                                         │  ← white on red bg (#C62828)
├────────────────────────────────────────────────────┤
│                                                    │
│  Hey {FirstName},                                  │
│                                                    │
│  Thanks for using TheDailySocial. Use the verification  │
│  code below to confirm your email address.         │
│                                                    │
│  ╔════════════════════════════════════════════╗    │
│  ║         ONE-TIME PASSWORD                  ║    │  ← red border, light red bg
│  ║                                            ║    │
│  ║         4 8 2 9 1 7                        ║    │  ← 52px monospace, red
│  ╚════════════════════════════════════════════╝    │
│                                                    │
│  ⏱  Valid until  Mon, 30 Mar 2026 3:45 PM IST      │
│                                                    │
│  ─────────────────────────────────────────────     │
│  If you didn't request this code, you can safely   │
│  ignore this email.                                │
│                                                    │
├────────────────────────────────────────────────────┤
│  From the TheDailySocial Support Team                   │  ← grey footer
│  help@thedailysocial.co.in                                 │
└────────────────────────────────────────────────────┘
```

---

### Design Tokens

| Element            | Value                          |
|--------------------|-------------------------------|
| Header background  | `#C62828` (deep red)          |
| Header text        | White, 30px, weight 900       |
| OTP color          | `#C62828`                     |
| OTP font           | Courier New, 52px, weight 900 |
| OTP letter-spacing | 14px                          |
| OTP box border     | 2.5px solid `#C62828`         |
| OTP box background | `#fff5f5` (light red tint)    |
| Body font          | Segoe UI / Arial, 15px        |
| Footer background  | `#fafafa`                     |
| Max email width    | 480px                         |

---

### Plain-Text Fallback

```
THEDAILYSOCIAL — Verification Code
─────────────────────────────────────────

Hey {FirstName},

Your one-time password is:

  {OTP}

Valid until: {ExpiresAt} IST

If you didn't request this, please ignore this email.

─────────────────────────────────────────
From the TheDailySocial Support Team
noreply@thedailysocial.co.in
```

---

## AWS SES Setup Notes

### Domain Verification (Route53 — one-time)

Since vibehouse.in is already in Route53 in the same AWS account:

1. AWS Console → SES → Verified identities → Create identity
2. Select Domain → enter `thedailysocial.co.in`
3. Check "Publish DNS records to Route53 automatically"
4. Click Create — SES auto-creates all DNS records in Route53:

| Record Type | Name | Purpose |
|-------------|------|---------|
| TXT | `_amazonses.thedailysocial.co.in` | Domain ownership |
| CNAME x3 | `xxx._domainkey.thedailysocial.co.in` | DKIM signing |
| TXT (optional) | `thedailysocial.co.in` | SPF: `v=spf1 include:amazonses.com ~all` |

5. Wait 5-15 min for propagation

### Production Access

SES starts in sandbox mode (only sends to verified email addresses).

1. SES → Account dashboard → Request production access
2. Fill in:
   - Mail type: Transactional
   - Use case: Guest email verification for a hospitality booking platform
3. Approval takes ~24 hours

### Environment Variables

```env
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=...         # existing — SES uses same IAM user
AWS_SECRET_ACCESS_KEY=...     # existing
SES_FROM_EMAIL=noreply@thedailysocial.co.in
TEST_EMAIL=you@example.com    # used by test scripts in backend/scripts/
```

IAM permissions needed (AmazonSESFullAccess managed policy, already added per user).

---

---

## Template 2 — Booking Confirmation

> **When it's sent:** Triggered after a guest successfully links their eZee reservation and payment is captured (Razorpay webhook). Sent to the PRIMARY guest's email. Shows their personal details alongside the full booking summary — room, dates, property — plus a set of arrival essentials to prepare them for check-in.

**Subject**: `🏠 Booking confirmed — {PropertyName}`

---

### Visual Layout (rendered)

```
┌────────────────────────────────────────────────────┐
│  TheDailySocial                                    │  ← white on red bg (#C62828), 28px, weight 900
├────────────────────────────────────────────────────┤
│                                                    │
│  Hey {FirstName},                                  │  ← 20px, weight 700, #111
│                                                    │
│  Thanks for your booking! Here are your            │  ← 15px, #555
│  booking details.                                  │
│                                                    │
│  GUEST INFORMATION                                 │  ← label: 11px, weight 600, #999, UPPERCASE, 2px tracking
│  ╔════════════════════════════════════════════╗    │  ← #f9f9f9 bg, 1px solid #eee border, 8px radius
│  ║  NAME     Upamanyu Chatterjee             ║    │  ← field label 11px #999 UPPERCASE; value 15px #111
│  ║  GENDER   Male                            ║    │
│  ║  EMAIL    upamanyu@example.com            ║    │
│  ║  PHONE    +91 98765 43210  (if present)   ║    │
│  ╚════════════════════════════════════════════╝    │
│                                                    │
│  BOOKING DETAILS                                   │  ← same label style
│  ╔════════════════════════════════════════════╗    │  ← #fff5f5 bg, 2px solid #C62828 border
│  ║  BOOKING ID   EZR-2026-001                ║    │  ← 14px Courier New, weight 700, #C62828
│  ║  PROPERTY     Vibe House Bandra           ║    │  ← 15px #111
│  ║  ROOM / BED   Dorm 6-Bed — Bed A          ║    │
│  ║  CHECK-IN     Mon, 30 Mar 2026            ║    │
│  ║  CHECK-OUT    Thu, 03 Apr 2026            ║    │
│  ║  GUESTS       3                           ║    │
│  ╚════════════════════════════════════════════╝    │
│                                                    │
│  ─────────────────────────────────────────────     │  ← divider
│  THE ESSENTIALS                                    │  ← same label style
│  📎  Carry a valid government-issued photo ID      │  ← 14px, #555
│  🕑  Check-in time: 2:00 PM onwards               │
│  ⏳  Early check-in subject to availability        │
│  📶  Wi-Fi details shared at the property          │
│  📱  Manage your stay at thedailysocial.co.in      │  ← link, #C62828, weight 600
│                                                    │
├────────────────────────────────────────────────────┤
│  From the TheDailySocial Support Team              │  ← 13px #999, grey footer #fafafa
│  noreply@thedailysocial.co.in                      │  ← 12px #ccc
└────────────────────────────────────────────────────┘
```

---

### Design Tokens

| Element              | Value                                       |
|----------------------|---------------------------------------------|
| Header background    | `#C62828` (deep red)                        |
| Header text          | White, 28px, weight 900                     |
| Greeting             | `#111`, 20px, weight 700                    |
| Body text            | `#555`, 15px, Segoe UI / Arial              |
| Section label        | `#999`, 11px, weight 600, UPPERCASE, 2px tracking |
| Guest info box bg    | `#f9f9f9`, border `1px solid #eee`, 8px radius |
| Field label          | `#999`, 11px, weight 600, UPPERCASE, 1.5px tracking |
| Field value          | `#111`, 15px                                |
| Booking box bg       | `#fff5f5`, border `2px solid #C62828`       |
| Booking ID font      | Courier New, 14px, weight 700, `#C62828`    |
| Essentials text      | `#555`, 14px                                |
| Link colour          | `#C62828`, weight 600                       |
| Footer background    | `#fafafa`                                   |
| Max email width      | 480px                                       |

---

### TypeScript Method

```ts
// backend/src/email/email.service.ts
sendBookingConfirmationEmail(opts: {
  toEmail: string;
  firstName: string;
  fullName: string;
  gender?: string;         // omit to show "—"
  phone?: string;          // row hidden if absent
  bookingId: string;
  propertyName: string;
  roomType: string;
  roomNumber: string;
  checkinDate: string;     // pre-formatted, e.g. "Mon, 30 Mar 2026"
  checkoutDate: string;
  noOfGuests: number;
}): Promise<void>
```

### Plain-Text Fallback

```
THEDAILYSOCIAL — Booking Confirmed
────────────────────────────────────────

Hey {FirstName},

Thanks for your booking! Here are your details.

── GUEST INFORMATION ──
  Name    : {FullName}
  Gender  : {Gender}
  Email   : {Email}
  Phone   : {Phone}

── BOOKING DETAILS ──
  Booking ID  : {BookingID}
  Property    : {PropertyName}
  Room / Bed  : {RoomType} — {RoomNumber}
  Check-in    : {CheckinDate}
  Check-out   : {CheckoutDate}
  Guests      : {NoOfGuests}

── THE ESSENTIALS ──
  • Carry a valid government-issued photo ID
  • Check-in time: 2:00 PM onwards
  • Early check-in subject to availability
  • Wi-Fi details shared at the property
  • Manage your stay: https://thedailysocial.co.in

────────────────────────────────────────
From the TheDailySocial Support Team
noreply@thedailysocial.co.in
```

### Test Script

```bash
npx ts-node scripts/send-test-booking-confirmation.ts
```

---

## Template 3 — Check-in Confirmation

> **When it's sent:** Triggered immediately after a guest completes the onsite check-in flow on the tablet kiosk — face match verified, G-Card signed, and `checkin_records` status flips to `CHECKED_IN`. Delivers the MyGate door PIN(s) for their assigned room(s) and locker key codes (if allocated), so the guest can go straight to their room.

**Subject**: `🔑 You're checked in — welcome to TheDailySocial!`

---

### Visual Layout (rendered)

```
┌────────────────────────────────────────────────────┐
│  TheDailySocial                                    │  ← white on red bg (#C62828), 28px, weight 900
├────────────────────────────────────────────────────┤
│                                                    │
│  Hey {FirstName},                                  │  ← 20px, weight 700, #111
│                                                    │
│  Welcome to TheDailySocial! Hope you have a        │  ← 15px, #555
│  wonderful stay with us.                           │
│                                                    │
│  YOUR ROOM PASSKEY/S                               │  ← 11px, weight 600, #999, UPPERCASE, 2px tracking
│  ╔════════════════════════════════════════════╗    │  ← #fff5f5 bg, 2.5px solid #C62828
│  ║                                            ║    │
│  ║  7 8 2 3  → Room 101                       ║    │  ← passkey: 34px Courier New, weight 900, #C62828
│  ║  9 1 4 5  → Room 102    (if multi-room)    ║    │    6px letter-spacing; label: 15px #555
│  ║                                            ║    │
│  ╚════════════════════════════════════════════╝    │
│                                                    │
│  LOCKER KEYS   (section hidden if no locker keys)  │  ← 11px, weight 600, #999, UPPERCASE
│  ╔════════════════════════════════════════════╗    │  ← #f9f9f9 bg, 1px solid #eee
│  ║  A1234  →  Locker 1                        ║    │  ← key: 15px Courier New, weight 700, #333
│  ║  B5678  →  Locker 2                        ║    │    label: 14px, #777
│  ╚════════════════════════════════════════════╝    │
│                                                    │
│  Need anything during your stay? Log in and        │  ← 15px, #555
│  request services anytime.                        │
│                                                    │
│  ┌────────────────────────┐                        │
│  │  Go to TheDailySocial →│                        │  ← CTA button: #C62828 bg, white 15px weight 700
│  └────────────────────────┘                        │    href: https://thedailysocial.co.in
│                                                    │
│  ─────────────────────────────────────────────     │
│  Keep this email safe — passkeys are confidential. │  ← 13px, #aaa
│                                                    │
├────────────────────────────────────────────────────┤
│  From the TheDailySocial Support Team              │  ← 13px #999
│  noreply@thedailysocial.co.in                      │  ← 12px #ccc
└────────────────────────────────────────────────────┘
```

---

### Design Tokens

| Element              | Value                                          |
|----------------------|------------------------------------------------|
| Header background    | `#C62828`, white text, 28px, weight 900        |
| Passkey box bg       | `#fff5f5`, border `2.5px solid #C62828`        |
| Passkey font         | Courier New, 34px, weight 900, `#C62828`, 6px letter-spacing |
| Passkey room label   | Segoe UI / Arial, 15px, weight 600, `#555`     |
| Locker box bg        | `#f9f9f9`, border `1px solid #eee`             |
| Locker key font      | Courier New, 15px, weight 700, `#333`          |
| CTA button bg        | `#C62828`, white text, 15px, weight 700, 8px radius |
| Footer background    | `#fafafa`                                      |
| Max email width      | 480px                                          |

---

### TypeScript Method

```ts
// backend/src/email/email.service.ts
sendCheckinEmail(opts: {
  toEmail: string;
  firstName: string;
  passkeys: Array<{ key: string; roomNumber: string }>;
  lockerKeys?: Array<{ key: string; lockerLabel: string }>;  // section hidden if absent/empty
}): Promise<void>
```

### Plain-Text Fallback

```
THEDAILYSOCIAL — You're Checked In!
────────────────────────────────────────

Hey {FirstName},

Welcome to TheDailySocial! Hope you have a wonderful stay.

── YOUR ROOM PASSKEY/S ──
  {Passkey1}  →  Room {RoomNo1}
  {Passkey2}  →  Room {RoomNo2}

── LOCKER KEYS ──
  {Key1}  →  Locker 1
  {Key2}  →  Locker 2

Need anything? Log in at https://thedailysocial.co.in

Keep this email safe — your passkeys are confidential.

────────────────────────────────────────
From the TheDailySocial Support Team
noreply@thedailysocial.co.in
```

### Test Script

```bash
npx ts-node scripts/send-test-checkin.ts
```

---

## Future Templates (planned)

| Template | Trigger | Status |
|----------|---------|--------|
| Payment receipt | payment_success SQS event | Phase 2 |
| Check-in reminder | 24h before checkin_date | Phase 2 |
| OTP — phone (WhatsApp) | send-otp with channel=whatsapp | Phase 3 (Wati) |
