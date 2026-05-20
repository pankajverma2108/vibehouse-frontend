# Booking & Payment Flow — Vibe House Web App

## Use Case

A guest visits the Vibe House web app, selects a room and dates, pays via Razorpay, and receives a confirmed reservation. The booking is created in eZee PMS and payment is recorded in the eZee folio — all automatically, without any manual intervention from ops.

---

## Actors

| Actor | Role |
|-------|------|
| Guest | Browses rooms, selects dates, pays |
| Vibe House Web App (PWA) | Frontend — room selection, cart, Razorpay checkout |
| Vibe House Backend | Handles Razorpay webhook, calls eZee APIs |
| Razorpay | Payment gateway — collects and confirms payment |
| eZee PMS | Creates and holds the reservation, records payment in folio |

---

## Flow

```
1. Guest opens the web app
        ↓
2. Web app calls eZee RoomList API
   → Fetches live room availability + rates for selected dates
        ↓
3. Guest selects room, reviews price breakdown
   (room rate + add-ons + taxes)
        ↓
4. Guest fills in name, email, phone
        ↓
5. Web app calls Razorpay — creates an Order
   → order_id returned
        ↓
6. Guest completes payment on Razorpay checkout
   (card / UPI / netbanking)
        ↓
7. Razorpay fires payment.captured webhook to our backend
        ↓
8. Backend verifies payment with Razorpay
        ↓
9. Backend calls eZee InsertBooking
   → Sends: room type, rate plan, dates, guest name, email, phone
   → eZee creates the reservation
   ← eZee returns: ReservationNo
        ↓
10. Backend calls eZee ProcessBooking (Action: ConfirmBooking)
    → Marks the reservation as confirmed in eZee
        ↓
11. Backend calls eZee AddPayment (Kiosk API)
    → Records the Razorpay payment in the eZee folio
    → Payment method: Cash / Online (INR)
    → Amount: actual amount paid by guest
        ↓
12. Backend stores ReservationNo in our database
        ↓
13. Web app shows guest their confirmed booking + ReservationNo
```

---

## Key Points

- **Razorpay collects the payment** — eZee does not process or redirect payment.
- **eZee is only called after payment is confirmed** — no booking is created in eZee before the Razorpay webhook fires.
- **eZee is the source of truth for reservations** — the ReservationNo returned by InsertBooking is stored in our DB and is the canonical booking reference.
- **Payment is recorded in eZee folio** — so the property's accounts reflect the payment even though it was collected via Razorpay.
- **If payment fails** — we call ProcessBooking (Action: FailBooking) and no reservation is held in eZee.

---

## eZee APIs Used

| Step | API | Endpoint |
|------|-----|----------|
| Fetch availability + rates | `RoomList` | `reservation_api/listing.php` |
| Create reservation | `InsertBooking` | `reservation_api/listing.php` |
| Confirm reservation | `ProcessBooking` | `reservation_api/listing.php` |
| Record payment in folio | `AddPayment` | `kioskconnectivity` |

---

## Failure Handling

| Scenario | Action |
|----------|--------|
| Razorpay payment fails | No InsertBooking call made — booking never created in eZee |
| InsertBooking fails after payment | Razorpay refund initiated, guest notified |
| ProcessBooking fails | Retry 3 times via queue, alert ops if all fail |
| AddPayment fails | Retry via queue, flag for manual reconciliation |
