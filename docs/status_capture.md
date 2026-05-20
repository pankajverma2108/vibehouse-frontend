# Guest Check-In Status Capture Flow

**Document Date:** May 12, 2026

---

## Overview

This document captures how the frontend detects when a guest has an active booking with an "arrived" / "checked-in" status from eZee, and how this status gates access to the Guest Hub (facilities, services, borrowables, etc.).

Live capture note (May 14, 2026): for `test@abc.com`, current booking statuses in `/guest/auth/me` and `/guest/booking/mine` are `APPROVED` (not `ARRIVED` / `CHECKED_IN`) at the time of this capture.

---

## Flow: User Login Ã¢â€ â€™ My Hub Ã¢â€ â€™ Guest Access

### Step 1: User Logs In

**Endpoint:**
```
POST /guest/auth/login
```

**Request Body:**
```json
{
  "email": "test@abc.com",
  "password": "admin123"
}
```

**Response (Success) - live sample (May 14, 2026):**
```json
{
  "access_token": "<JWT_TOKEN>",
  "guest": {
    "id": "27319801-cdcf-40d7-9c12-ce1d2ec95a38",
    "name": "Pankaj Verma",
    "email": "test@abc.com",
    "phone": "7477036148",
    "email_verified": false,
    "phone_verified": false,
    "two_fa_enabled": false,
    "profile_photo_url": null,
    "created_at": "2026-04-16T10:46:47.614Z"
  }
}
```

**Key Field:**
- `bookings[].status` = The eZee booking status. **This is where the "CHECKED_IN" / "arrived" status comes in.**

---

### Step 2: Session Restoration and Booking Validation

After login, the frontend calls `/guest/auth/me` to restore/refresh the guest profile:

**Endpoint:**
```
GET /guest/auth/me
```

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response - live sample (May 14, 2026):**
```json
{
  "id": "27319801-cdcf-40d7-9c12-ce1d2ec95a38",
  "name": "Pankaj Verma",
  "email": "test@abc.com",
  "phone": "7477036148",
  "email_verified": false,
  "phone_verified": false,
  "two_fa_enabled": false,
  "profile_photo_url": null,
  "created_at": "2026-04-16T10:46:47.614Z",
  "bookings": [
    {
      "ezee_reservation_id": "TDS-BANGALORE-MP57PUDG-D1D2",
      "role": "PRIMARY",
      "status": "APPROVED",
      "checkin_date": "2026-05-14T00:00:00.000Z",
      "checkout_date": "2026-05-21T00:00:00.000Z",
      "room_type_name": "4 Bed Mixed Dormitory x1",
      "property_id": "60765"
    }
  ]
}
```

### Step 2.5: Booking List API Used by Bookings Page

**Endpoint:**
```
GET /guest/booking/mine
```

**Response item shape (live sample):**
```json
{
  "ezee_reservation_id": "TDS-BANGALORE-MP57PUDG-D1D2",
  "role": "PRIMARY",
  "status": "APPROVED",
  "room_type_name": "4 Bed Mixed Dormitory x1",
  "room_number": "202 A",
  "checkin_date": "2026-05-14T00:00:00.000Z",
  "checkout_date": "2026-05-21T00:00:00.000Z",
  "property_id": "60765",
  "source": "The Daily Social",
  "total_slots": 1,
  "kyc_completed_slots": 0
}
```

---

## Step 3: Frontend Eligibility Check

**Location:** `lib/guest-hub.ts`

**Function:** `isGuestHubEligibleBooking(booking)`

The frontend checks if the booking status qualifies for Guest Hub access:

```typescript
function isGuestHubEligibleBooking(booking: GuestHubBookingLike): boolean {
  const normalizedStatus = normalizeBookingStatus(booking.status);

  return normalizedStatus === "ARRIVED"
    || normalizedStatus === "CHECKED_IN"
    || normalizedStatus === "CHECKEDIN"
    || normalizedStatus === "IN_HOUSE"
    || normalizedStatus === "INHOUSE";
}
```

**Status Eligibility Summary:**
| Status | Allowed | Reason |
|--------|---------|--------|
| `ARRIVED` | Yes | Guest has been checked in from eZee |
| `CHECKED_IN` | Yes | Guest has checked in at property via eZee |
| `IN_HOUSE`, `INHOUSE` | Yes | Guest is currently occupying room |
| `APPROVED`, `CONFIRMED`, `CONFIRMED_RESERVATION` | No | Booking is confirmed, but the receptionist has not checked the guest in yet |
| `ACTIVE` | No | Date-only activity is not enough for Guest Hub access |
| `CANCELLED`, `CHECKED_OUT`, `COMPLETED`, `REJECTED` | No | Stay is over or invalid |
| `PENDING`, other | No | Booking not confirmed or already completed |

---

## Step 4: Active Booking Detection and Redirect

**Location:** `components/guest/guest-route-gate.tsx`

**Function:** `GuestHubEntryGate`

```typescript
export function GuestHubEntryGate() {
  const router = useRouter();
  const { guest, isAuthenticated, isRestoringSession } = useGuestAuth();
  
  // Find the first active, eligible booking
  const activeBooking = useMemo(
    () => getActiveGuestHubBooking(guest?.bookings ?? []), 
    [guest?.bookings]
  );

  // If eligible booking found, redirect to scoped guest hub
  useEffect(() => {
    if (!isRestoringSession && isAuthenticated && activeBooking) {
      // Navigates to: /TDS-BANGALORE-MP2IW6J7-673D/guest
      router.replace(getScopedGuestHubHref(activeBooking.ezee_reservation_id));
    }
  }, [activeBooking, isAuthenticated, isRestoringSession, router]);

  // Show appropriate UI based on auth state...
}
```

**Redirect Logic:**
- If guest is authenticated + has an eligible booking Ã¢â€ â€™ Redirect to `/{bookingId}/guest`
- If guest is authenticated but no eligible booking Ã¢â€ â€™ Show "No active stay available"
- If guest is NOT authenticated Ã¢â€ â€™ Show sign-in prompt

---

## Step 5: Guest Hub Access (Facilities, Services, Add-ons)

Once redirected to `/{bookingId}/guest`, the guest can access:

**Location:** `modules/guest/dashboard.tsx`

The guest page loads and displays available actions:

- **Extend Stay** (`/guest/extend`)
- **Buy Add-ons** (`/guest/addons`)
- **Request Service** (`/guest/services`)
- **Borrow Items** (`/guest/borrow`)
- **Review Property** (`/guest/review`)
- **Lost & Found** (`/guest/lost-found`)

These are gated by the `GuestBookingGate` wrapper which re-validates eligibility.

---

## Data Flow Diagram

```
Ã¢â€Å’Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â
Ã¢â€â€š User navigates to /guest or clicks "My Hub" button      Ã¢â€â€š
Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Ëœ
                     Ã¢â€ â€œ
        Ã¢â€Å’Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â
        Ã¢â€â€š GuestHubEntryGate renders  Ã¢â€â€š
        Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Ëœ
                      Ã¢â€ â€œ
     Ã¢â€Å’Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â
     Ã¢â€â€š useGuestAuth() context provides:   Ã¢â€â€š
     Ã¢â€â€š - guest profile from localStorage  Ã¢â€â€š
     Ã¢â€â€š - isAuthenticated flag             Ã¢â€â€š
     Ã¢â€â€š - isRestoringSession flag          Ã¢â€â€š
     Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Ëœ
                   Ã¢â€ â€œ
      Ã¢â€Å’Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â
      Ã¢â€â€š If token exists:                Ã¢â€â€š
      Ã¢â€â€š Call GET /guest/auth/me         Ã¢â€â€š
      Ã¢â€â€š (fetches bookings with status)  Ã¢â€â€š
      Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Ëœ
                     Ã¢â€ â€œ
         Ã¢â€Å’Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â
         Ã¢â€â€š getActiveGuestHubBooking()    Ã¢â€â€š
         Ã¢â€â€š filters bookings via:         Ã¢â€â€š
         Ã¢â€â€š isGuestHubEligibleBooking()   Ã¢â€â€š
         Ã¢â€â€š Ã¢Å“â€¦ Check status = CHECKED_IN? Ã¢â€â€š
         Ã¢â€â€š Ã¢Å“â€¦ Check date range?          Ã¢â€â€š
         Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Ëœ
                         Ã¢â€ â€œ
         Ã¢â€Å’Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â
         Ã¢â€â€š If eligible booking found:     Ã¢â€â€š
         Ã¢â€â€š Ã¢â€ â€™ router.replace(               Ã¢â€â€š
         Ã¢â€â€š   /{ezee_reservation_id}/guest Ã¢â€â€š
         Ã¢â€â€š   )                            Ã¢â€â€š
         Ã¢â€â€š                                Ã¢â€â€š
         Ã¢â€â€š Else:                          Ã¢â€â€š
         Ã¢â€â€š Ã¢â€ â€™ Show "No active stay"        Ã¢â€â€š
         Ã¢â€â€š   message                      Ã¢â€â€š
         Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Ëœ
```

---

## eZee Integration: Where "CHECKED_IN" Status Comes From

**File:** `docs/backend-context.md` (eZee PMS integration section)

### Reconciliation Workflow

1. **eZee Reconciliation Service** runs:
   - On app bootstrap
   - Every 15 minutes (scheduled)

2. **What it checks:**
   - Unsynced bookings
   - Status drift (e.g., newly CHECKED_IN in eZee)
   - Room number assignment
   - External bookings to ingest

3. **On Check-In Detection:**
   - eZee status changes to "CHECKED_IN"
   - Reconciliation detects it
   - Triggers **MyGate PIN provisioning** (smart lock passcode)
   - Updates `ezee_booking_cache` table

4. **Flow:** eZee API Ã¢â€ â€™ Backend reconciliation Ã¢â€ â€™ Database Ã¢â€ â€™ `/guest/auth/me` response Ã¢â€ â€™ Frontend check

---

## API Summary Table

| Endpoint | Method | Purpose | Auth | Response Includes |
|----------|--------|---------|------|-------------------|
| `/guest/auth/login` | POST | Authenticate guest | None | access_token, guest profile, **bookings with status** |
| `/guest/auth/me` | GET | Fetch/refresh guest profile | JWT Token | guest profile, **bookings with status** |
| `/guest/auth/verify-2fa` | POST | Verify 2FA OTP | None | access_token, guest profile, **bookings with status** |

**Key Takeaway:** The **`status` field in booking objects** is the single source of truth for whether a guest can access Guest Hub. This field is populated from eZee PMS during reconciliation.

---

## Frontend Code Locations

| File | Purpose |
|------|---------|
| `lib/guest-hub.ts` | Booking eligibility logic + active booking detection |
| `components/guest/guest-route-gate.tsx` | Conditional rendering based on eligibility |
| `components/auth/guest-auth-provider.tsx` | Auth state + session restoration |
| `modules/guest/dashboard.tsx` | Guest hub UI + available actions |
| `lib/guest-auth-api.ts` | API calls (`loginGuest`, `getGuestMe`, etc.) |

---

## Status Values from eZee

Based on code analysis, eZee can return:

- APPROVED - Booking confirmed, awaiting check-in (does not allow Guest Hub)
- CONFIRMED / CONFIRMED_RESERVATION - Booking confirmed, awaiting check-in (does not allow Guest Hub)
- ARRIVED - Guest checked in from eZee (allows Guest Hub access)
- CHECKED_IN - Guest checked in (allows Guest Hub access)
- IN_HOUSE - Guest is in house (allows Guest Hub access)
- INHOUSE - Alternate variant of in-house status (allows Guest Hub access)
- ACTIVE - Date-only active status is not enough for Guest Hub access
- CHECKED_OUT - Guest checked out (denies access)
- COMPLETED - Booking completed (denies access)
- CANCELLED - Booking cancelled (denies access)
- REJECTED - Booking rejected (denies access)

---

## Testing the Flow

To simulate and verify this flow locally:

```bash
# 1. Navigate to the guest hub
http://localhost:3000/TDS-BANGALORE-MP2IW6J7-673D/guest

# 2. If not authenticated, you'll see:
# "Guest Hub needs an authenticated booking"

# 3. Click "Sign In" and log in with:
# Email: test@abc.com
# Password: admin123

# 4. After login, the GET /guest/auth/me API is called
# 5. Frontend checks the booking status
# 6. If status = CHECKED_IN, guest is redirected to the hub
# 7. If status Ã¢â€°Â  CHECKED_IN, guest sees "Your stay is not active yet"
```

---

## Network Request Sequence (Chrome DevTools)

To observe the actual API calls:

1. Open **Chrome DevTools** Ã¢â€ â€™ **Network** tab
2. Log in with credentials above
3. Observe:
   ```
   POST /guest/auth/login Ã¢â€ â€™ 200 OK (returns access_token + guest profile)
   GET /guest/auth/me Ã¢â€ â€™ 200 OK (re-fetches profile with bookings)
   ```
4. Check the response for `bookings[0].status` field
5. If `status = "CHECKED_IN"`, frontend redirects to `/{bookingId}/guest`

---

## Conclusion

**How check-in status is captured:**

1. **Source:** eZee PMS backend system
2. **Integration:** Backend reconciliation syncs eZee status every 15 minutes
3. **API:** Guest receives status via `POST /guest/auth/login` and `GET /guest/auth/me`
4. **Validation:** Frontend function isGuestHubEligibleBooking() checks if status is one of: ARRIVED, CHECKED_IN, CHECKEDIN, IN_HOUSE, or INHOUSE
5. **Access:** If eligible, guest is redirected to `/{bookingId}/guest` where they can avail facilities

**Files Modified:** lib/guest-hub.ts, components/guest/guest-route-gate.tsx

**Last Updated:** May 14, 2026
