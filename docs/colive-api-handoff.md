# Colive Long-Stay API Handoff

This document describes the frontend contract expected by the new Colive flow mounted at `/property?type=colive`.

The current implementation is frontend-only on purpose. It does not call the nightly booking API because long-stay booking rules, monthly pricing, and payment/order semantics are different. When the backend is ready, these are the fields and endpoint shapes the frontend expects.

## Flow Summary

The frontend covers 7 user-facing stages:

1. Landing and intent capture
2. Lifestyle selection
3. Inventory listing
4. Property detail and room selection
5. Transparent pricing preview
6. 3-step checkout
7. Post-booking onboarding

## Frontend Payment Wiring (Current)

The Colive frontend now executes live long-stay quote + draft + payment in step 3:

1. `POST /guest/colive/quote`
2. `POST /guest/colive/draft-booking`
3. `POST /payment/create-colive-order`
4. Razorpay Checkout (browser)
5. `POST /payment/verify-colive` on success, `POST /payment/fail` on dismiss/fail

Required frontend env vars for Colive static-to-backend mapping:

- `NEXT_PUBLIC_COLIVE_KORAMANGALA_A_PROPERTY_ID`
- `NEXT_PUBLIC_COLIVE_KORAMANGALA_A_DORM_ROOM_TYPE_ID`
- `NEXT_PUBLIC_COLIVE_KORAMANGALA_A_PRIVATE_ROOM_TYPE_ID`
- `NEXT_PUBLIC_COLIVE_KORAMANGALA_B_PROPERTY_ID`
- `NEXT_PUBLIC_COLIVE_KORAMANGALA_B_DORM_ROOM_TYPE_ID`
- `NEXT_PUBLIC_COLIVE_KORAMANGALA_B_PRIVATE_ROOM_TYPE_ID`
- `NEXT_PUBLIC_COLIVE_KORAMANGALA_A_MEALS_ADDON_ID` (optional)
- `NEXT_PUBLIC_COLIVE_KORAMANGALA_A_LAUNDRY_ADDON_ID` (optional)
- `NEXT_PUBLIC_COLIVE_KORAMANGALA_A_WORKSPACE_ADDON_ID` (optional)
- `NEXT_PUBLIC_COLIVE_KORAMANGALA_B_MEALS_ADDON_ID` (optional)
- `NEXT_PUBLIC_COLIVE_KORAMANGALA_B_LAUNDRY_ADDON_ID` (optional)
- `NEXT_PUBLIC_COLIVE_KORAMANGALA_B_WORKSPACE_ADDON_ID` (optional)
- `NEXT_PUBLIC_COLIVE_MEALS_PRODUCT_ID` (optional global fallback)
- `NEXT_PUBLIC_COLIVE_LAUNDRY_PRODUCT_ID` (optional global fallback)
- `NEXT_PUBLIC_COLIVE_WORKSPACE_PRODUCT_ID` (optional global fallback)

## Recommended Endpoints

### 1. Search inventory

`POST /guest/colive/search`

Purpose:
- Returns monthly-stay properties based on the user’s city, move-in date, intended stay length, and lifestyle.

Request body:
- `location_id: string`
- `location_slug: string`
- `move_in_date: string`
  - ISO date, example `2026-05-01`
- `duration_months: number`
- `stay_type: "solo" | "couple" | "remote"`
- `selected_plan_id?: string`
  - Example: `workation`, `budget`, `private`
- `guest_count?: number`
- `currency?: string`
  - Default expected: `INR`

Response:
- `search_id: string`
- `location:`
  - `id: string`
  - `slug: string`
  - `label: string`
- `move_in_date: string`
- `duration_months: number`
- `stay_type: "solo" | "couple" | "remote"`
- `properties: ColivePropertyCard[]`

`ColivePropertyCard`
- `property_id: string`
- `slug: string`
- `name: string`
- `city_label: string`
- `microcopy: string`
- `hero_image_url: string`
- `secondary_image_url?: string`
- `price_from_monthly: number`
- `strike_price_from_monthly?: number`
- `rating?: number`
- `rating_label?: string`
- `primary_tag: string`
  - Example: `Remote Ready`
- `secondary_tag?: string`
  - Example: `Social Vibe`
- `amenities: string[]`
  - Example: `["Superfast Speed", "Daily Housekeeping", "Community Lounge", "Events Calendar"]`
- `inventory_state: "available" | "limited" | "waitlist" | "sold_out"`
- `inventory_message?: string`
- `recommended_for: string[]`
  - Example: `["remote", "solo"]`

### 2. Property detail

`GET /guest/colive/properties/{property_id}?move_in_date=YYYY-MM-DD&duration_months=3&stay_type=remote`

Purpose:
- Returns property content, monthly room options, inclusions, testimonials, and price context for the detail screen.

Response:
- `property_id: string`
- `slug: string`
- `name: string`
- `city_label: string`
- `headline?: string`
- `subheadline?: string`
- `description: string`
- `hero_gallery:`
  - `main_image_url: string`
  - `supporting_image_urls: string[]`
  - `gallery_count?: number`
- `tags:`
  - `primary: string`
  - `secondary?: string`
- `benefits: BenefitItem[]`
- `room_options: ColiveRoomOption[]`
- `stories: ColiveStory[]`
- `pricing_defaults:`
  - `move_in_date: string`
  - `duration_months: number`
  - `stay_type: "solo" | "couple" | "remote"`
- `checkout_notes?: string[]`

`BenefitItem`
- `id: string`
- `title: string`
- `description: string`
- `accent_hex?: string`

`ColiveRoomOption`
- `room_type_id: string`
- `slug: string`
- `name: string`
- `description: string`
- `monthly_price: number`
- `strike_monthly_price?: number`
- `available_units: number`
- `inventory_message?: string`
- `feature_points: string[]`
- `max_guests?: number`
- `recommended_for?: string[]`
- `thumbnail_url?: string`

`ColiveStory`
- `id: string`
- `quote: string`
- `guest_initials: string`
- `guest_label: string`
  - Example: `Stayed 4 months`
- `accent_hex?: string`
- `text_hex?: string`

### 3. Add-on catalog

`GET /guest/colive/properties/{property_id}/addons?duration_months=3`

Purpose:
- Supplies monthly add-ons for checkout step 2.

Response:
- `property_id: string`
- `addons: ColiveAddon[]`

`ColiveAddon`
- `addon_id: string`
- `slug: string`
- `name: string`
- `description: string`
- `pricing_model: "per_month" | "one_time"`
- `unit_price: number`
- `currency: string`
- `max_quantity?: number`
- `default_quantity?: number`
- `is_available: boolean`
- `availability_message?: string`
- `category?: string`
  - Example: `meals`, `laundry`, `workspace`, `pickup`
- `icon_hint?: string`

### 4. Price quote

`POST /guest/colive/quote`

Purpose:
- Returns the exact monthly pricing breakdown after room and add-on selection.

Request body:
- `property_id: string`
- `move_in_date: string`
- `duration_months: number`
- `stay_type: "solo" | "couple" | "remote"`
- `room_type_id: string`
- `addons:`
  - `addon_id: string`
  - `quantity: number`
- `coupon_code?: string`

Response:
- `quote_id: string`
- `currency: string`
- `room:`
  - `room_type_id: string`
  - `name: string`
  - `monthly_price: number`
  - `strike_monthly_price?: number`
  - `duration_months: number`
  - `line_total: number`
- `addons: QuoteAddonLine[]`
- `included_items: IncludedLine[]`
- `charges:`
  - `room_subtotal: number`
  - `addon_subtotal: number`
  - `discount_total: number`
  - `deposit_total: number`
    - Expected to be `0` for current design
  - `tax_total: number`
  - `grand_total: number`
- `savings:`
  - `monthly_savings?: number`
  - `total_savings?: number`
- `pricing_notes: string[]`

`QuoteAddonLine`
- `addon_id: string`
- `name: string`
- `quantity: number`
- `unit_price: number`
- `pricing_model: "per_month" | "one_time"`
- `line_total: number`

`IncludedLine`
- `id: string`
- `label: string`
- `type: "included" | "waived" | "charge"`
- `display_value: string`
  - Example: `Included`, `₹0`

### 5. Draft booking creation

`POST /guest/colive/draft-booking`

Purpose:
- Creates a backend draft before payment. This should be the long-stay equivalent of a pending order.

Request body:
- `quote_id: string`
- `property_id: string`
- `room_type_id: string`
- `move_in_date: string`
- `duration_months: number`
- `stay_type: "solo" | "couple" | "remote"`
- `guest_details:`
  - `first_name: string`
  - `last_name: string`
  - `email: string`
  - `phone: string`
- `addons:`
  - `addon_id: string`
  - `quantity: number`
- `source: "web_colive_flow"`
- `notes?: string`

Response:
- `draft_booking_id: string`
- `property_id: string`
- `property_name: string`
- `room_type_id: string`
- `room_type_name: string`
- `move_in_date: string`
- `duration_months: number`
- `estimated_checkout_date?: string`
- `status: "draft" | "pending_payment"`
- `guest_details:`
  - `first_name: string`
  - `last_name: string`
  - `email: string`
  - `phone: string`
- `addons: QuoteAddonLine[]`
- `charges:`
  - `room_subtotal: number`
  - `addon_subtotal: number`
  - `tax_total: number`
  - `grand_total: number`

### 6. Create payment order

`POST /payment/create-colive-order`

Purpose:
- Creates the Razorpay order for a long-stay booking.

Request body:
- `draft_booking_id: string`
- `grand_total: number`
- `currency?: string`

Response:
- `payment_order_id: string`
- `razorpay_order_id: string`
- `razorpay_key: string`
- `amount: number`
- `amount_paise: number`
- `currency: string`
- `draft_booking_id: string`
- `booking_reference: string`
  - Human-readable, frontend-safe reference
- `guest:`
  - `name?: string`
  - `email?: string`
  - `phone?: string`

### 7. Verify payment

`POST /payment/verify-colive`

Request body:
- `draft_booking_id: string`
- `razorpay_order_id: string`
- `razorpay_payment_id: string`
- `razorpay_signature: string`

Response:
- `message: string`
- `booking_id: string`
- `booking_reference: string`
- `status: "confirmed" | "partially_confirmed" | "verification_pending"`
- `payment_id: string`
- `total_paid: number`
- `currency: string`

### 8. Confirmation detail

`GET /guest/colive/bookings/{booking_id}`

Purpose:
- Drives the post-booking screen and any future booking detail screen for long stays.

Response:
- `booking_id: string`
- `booking_reference: string`
- `status: string`
- `property:`
  - `property_id: string`
  - `name: string`
  - `city_label: string`
- `stay:`
  - `move_in_date: string`
  - `duration_months: number`
  - `checkout_date_estimated?: string`
  - `stay_type: "solo" | "couple" | "remote"`
- `room:`
  - `room_type_id: string`
  - `name: string`
- `guest_details:`
  - `first_name: string`
  - `last_name: string`
  - `email: string`
  - `phone: string`
- `addons: QuoteAddonLine[]`
- `charges:`
  - `room_subtotal: number`
  - `addon_subtotal: number`
  - `tax_total: number`
  - `grand_total: number`
- `onboarding:`
  - `whatsapp_url?: string`
  - `events_url?: string`
  - `community_name?: string`
  - `next_steps: string[]`

## Frontend Field Inventory By Screen

### Landing page

Required fields:
- `location_id`
- `location_slug`
- `location_label`
- `move_in_date`
- `duration_months`
- `stay_type`

Optional but useful:
- `available_duration_options`
- `disabled_dates`
- `location_level_copy`
- `search_hint_text`

### Lifestyle selection

Required fields:
- `plan_id`
- `plan_title`
- `plan_description`
- `recommended_stay_type`
- `accent_hex`
- `badge_copy`

### Inventory cards

Required fields:
- `property_id`
- `property_name`
- `city_label`
- `hero_image_url`
- `price_from_monthly`
- `strike_price_from_monthly`
- `amenities[]`
- `primary_tag`
- `secondary_tag`
- `rating`
- `rating_label`

### Property detail

Required fields:
- `property_id`
- `name`
- `city_label`
- `subtitle`
- `description`
- `hero_gallery.main_image_url`
- `hero_gallery.supporting_image_urls[]`
- `benefits[]`
- `room_options[]`
- `stories[]`

### Checkout step 1

Required fields:
- `first_name`
- `last_name`
- `email`
- `phone`

Validation rules expected by frontend:
- first name required
- last name required
- email required and format-valid
- phone required and at least 10 digits after normalization

### Checkout step 2

Required fields:
- `addon_id`
- `name`
- `description`
- `unit_price`
- `pricing_model`
- `max_quantity`
- `is_available`

### Checkout step 3

Required fields:
- `included_items[]`
- `room_subtotal`
- `addon_subtotal`
- `tax_total`
- `grand_total`
- `deposit_total`
- `discount_total`

### Confirmation

Required fields:
- `booking_id`
- `booking_reference`
- `property.name`
- `property.city_label`
- `stay.move_in_date`
- `stay.duration_months`
- `guest_details.first_name`
- `guest_details.last_name`
- `guest_details.email`
- `guest_details.phone`
- `onboarding.next_steps[]`

Optional but recommended:
- `onboarding.whatsapp_url`
- `onboarding.events_url`
- `support_contact`

## Frontend State That Should Eventually Become Backend State

These are currently held only in the client:
- selected location
- move-in date
- duration in months
- stay type
- selected property
- selected room
- add-on quantities
- guest details
- calculated room total
- calculated add-on total
- calculated grand total

These should all be represented in backend draft-booking and quote responses so refresh, resume, and payment retry behave correctly.

## Edge Cases To Support

- duration change after room selection should invalidate stale quote data
- room availability can change between property detail and payment creation
- add-on availability can change before payment creation
- property may support only some add-ons
- some properties may have zero deposit while others may not
- some add-ons may be one-time instead of monthly
- couple stays may require room filtering by occupancy
- remote-worker stay type may affect recommendation order without affecting price
- search results can be empty for a city or date range

## Frontend Notes For Backend Team

- Currency formatting is INR-first, but the UI will tolerate a backend currency field.
- The UI is designed around monthly pricing, not nightly pricing.
- The confirmation state expects onboarding links and post-booking next steps.
- The long-stay flow should not reuse the nightly booking response shape without additions; monthly context and inclusions need first-class fields.
