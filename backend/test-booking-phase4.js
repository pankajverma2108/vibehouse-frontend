/**
 * Phase 4 Test Suite: Availability Engine & Booking Orders
 *
 * Verifies:
 * 1. Live availability calculation with offline fallback (local_db_estimate)
 * 2. Anonymous available coupons listing on BUTEAK
 * 3. Anonymous coupon preview on BUTEAK
 * 4. Authenticated guest order creation (room + commodity addons + coupon)
 * 5. Database state (ezee_booking_cache, booking_guest_access, booking_slots, inventory locking)
 * 6. Guest bookings listing (GET /guest/booking/mine)
 * 7. Anonymous order creation on BUTEAK (generates ERI & payment_token, creates guest row)
 * 8. Booking linking (POST /guest/booking/link)
 * 9. Overlapping availability decrement (local_db_estimate accurately reflects pending/confirmed bookings)
 * 10. Public lookup (GET /guest/booking/lookup?booking_id=...)
 */

const http = require('http');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:8000';

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };

    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        });
      },
    );

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function run() {
  console.log('🧪 Starting Phase 4 Availability Engine & Booking Orders Test Suite...\n');

  try {
    // ─── Pre-test Cleanup for Idempotency ──────────────────────────────────
    const oldBookings = await prisma.ezee_booking_cache.findMany({
      where: {
        OR: [
          { ezee_reservation_id: { contains: '-LCL-' } },
        ],
      },
    });
    for (const b of oldBookings) {
      const addonOrders = await prisma.addon_orders.findMany({ where: { ezee_reservation_id: b.ezee_reservation_id } });
      for (const ao of addonOrders) {
        await prisma.addon_order_items.deleteMany({ where: { addon_order_id: ao.id } });
      }
      await prisma.addon_orders.deleteMany({ where: { ezee_reservation_id: b.ezee_reservation_id } });
      await prisma.coupon_redemptions.deleteMany({ where: { ezee_reservation_id: b.ezee_reservation_id } });
      await prisma.payments.deleteMany({ where: { ezee_reservation_id: b.ezee_reservation_id } });
      await prisma.kyc_submissions.deleteMany({ where: { ezee_reservation_id: b.ezee_reservation_id } });
      await prisma.booking_slots.deleteMany({ where: { ezee_reservation_id: b.ezee_reservation_id } });
      await prisma.booking_guest_access.deleteMany({ where: { ezee_reservation_id: b.ezee_reservation_id } });
      await prisma.ezee_booking_cache.delete({ where: { ezee_reservation_id: b.ezee_reservation_id } });
    }
    await prisma.guests.deleteMany({ where: { email: { contains: '@buteak-test.in' } } });
    await prisma.inventory.updateMany({
      where: { product_id: 'prod-water-bottle', property_id: '60765' },
      data: { available_stock: 60, reserved_stock: 0 },
    });

    // ─── Test 1: Availability Engine (TDS - 60765) ──────────────────────────
    console.log('👉 [1/10] Testing Room Availability (local_db_estimate fallback)...');
    const availRes = await makeRequest(
      'GET',
      '/guest/booking/availability?property_id=60765&checkin=2026-10-01&checkout=2026-10-04',
    );
    assert(availRes.status === 200, `Availability returns HTTP 200 (got ${availRes.status})`);
    assert(availRes.data.property_id === '60765', `Property ID matches 60765`);
    assert(availRes.data.no_of_nights === 3, `Calculated no_of_nights === 3`);
    assert(
      availRes.data.availability_source === 'local_db_estimate',
      `Availability source is local_db_estimate (got ${availRes.data.availability_source})`,
    );
    assert(availRes.data.tax_rate_pct === 12, `Tax rate matches 12%`);
    assert(Array.isArray(availRes.data.room_types), `room_types is an array`);
    assert(availRes.data.room_types.length >= 4, `At least 4 room types returned (got ${availRes.data.room_types.length})`);

    const dorm4 = availRes.data.room_types.find((r) => r.id === 'rt-ka-4dorm');
    assert(!!dorm4, `Room type rt-ka-4dorm exists`);
    assert(dorm4 && dorm4.available_beds === 60, `Dorm 4 initial available_beds === 60 (got ${dorm4?.available_beds})`);
    assert(dorm4 && dorm4.inventory_state === 'available', `Dorm 4 inventory_state === available`);

    // ─── Test 2: Anonymous Available Coupons (BUTEAK - 55402) ───────────────
    console.log('\n👉 [2/10] Testing Anonymous Available Coupons on BUTEAK...');
    const couponsRes = await makeRequest(
      'GET',
      '/guest/booking/anonymous/coupons/available?property_id=55402',
      null,
      { Host: 'buteak.in' },
    );
    assert(couponsRes.status === 200, `Anonymous coupons returns HTTP 200 (got ${couponsRes.status})`);
    assert(Array.isArray(couponsRes.data.items), `items is an array`);
    const couponCodes = (couponsRes.data.items || []).map((c) => c.code);
    assert(couponCodes.includes('WELCOME10'), `WELCOME10 coupon is available`);
    assert(couponCodes.includes('FLAT200'), `FLAT200 coupon is available`);
    assert(couponCodes.includes('LONGSTAY20'), `LONGSTAY20 coupon is available`);

    // ─── Test 3: Anonymous Coupon Preview on BUTEAK ─────────────────────────
    console.log('\n👉 [3/10] Testing Anonymous Coupon Preview (WELCOME10 on Studio Suite)...');
    const previewRes = await makeRequest(
      'POST',
      '/guest/booking/anonymous/coupons/preview',
      {
        property_id: '55402',
        checkin_date: '2026-10-01',
        checkout_date: '2026-10-04',
        rooms: [{ room_type_id: 'rt-btm-studio', quantity: 1 }],
        coupon_code: 'WELCOME10',
      },
      { Host: 'buteak.in' },
    );
    assert(previewRes.status === 200 || previewRes.status === 201, `Preview returns HTTP 200/201 (got ${previewRes.status})`);
    assert(previewRes.data.subtotal === 7500, `Subtotal is ₹7,500 (₹2500 x 3 nights)`);
    assert(previewRes.data.discount_total === 500, `Discount capped at ₹500 (got ${previewRes.data.discount_total})`);
    assert(previewRes.data.pre_tax_total === 7000, `Pre-tax total is ₹7,000`);
    assert(previewRes.data.tax_rate_pct === 12, `Tax rate is 12%`);
    assert(previewRes.data.tax_amount === 840, `Tax amount is ₹840 (12% of 7000)`);
    assert(previewRes.data.grand_total === 7840, `Grand total is ₹7,840`);

    // ─── Test 4: Guest Login ────────────────────────────────────────────────
    console.log('\n👉 [4/10] Authenticating Guest (arjun@vibehouse.in)...');
    const loginRes = await makeRequest('POST', '/guest/auth/login', {
      email: 'arjun@vibehouse.in',
      password: 'GuestPass123!',
    });
    assert(loginRes.status === 200, `Guest login returns HTTP 200`);
    const guestToken = loginRes.data.access_token;
    assert(!!guestToken, `Received guest access token`);
    const authHeaders = { Authorization: `Bearer ${guestToken}` };

    // Check initial water bottle stock
    const initStock = await prisma.inventory.findFirst({
      where: { product_id: 'prod-water-bottle', property_id: '60765' },
    });
    const initAvailStock = initStock ? initStock.available_stock : 60;
    const initResStock = initStock ? initStock.reserved_stock : 0;

    // ─── Test 5: Authenticated Order Creation with Addons & Coupon ──────────
    console.log('\n👉 [5/10] Creating Authenticated Booking Order (Room + Addon + Coupon)...');
    const orderRes = await makeRequest(
      'POST',
      '/guest/booking/create-order',
      {
        property_id: '60765',
        checkin_date: '2026-10-15',
        checkout_date: '2026-10-18',
        rooms: [{ room_type_id: 'rt-ka-4dorm', quantity: 1 }],
        addons: [{ product_id: 'prod-water-bottle', quantity: 2 }],
        occupancy: { adults: 1, children: 0 },
        coupon_code: 'WELCOME10',
      },
      authHeaders,
    );

    assert(orderRes.status === 201, `Create order returns HTTP 201 (got ${orderRes.status})`);
    const order = orderRes.data;
    const eri = order.ezee_reservation_id;
    assert(!!eri && eri.startsWith('60765-LCL-'), `Generated ERI has format 60765-LCL-... (got ${eri})`);
    assert(order.status === 'PENDING_PAYMENT', `Order status is PENDING_PAYMENT`);
    assert(order.subtotal_rooms === 1500, `Room subtotal is ₹1500 (₹500 x 3)`);
    assert(order.subtotal_addons === 200, `Addon subtotal is ₹200 (₹100 x 2)`);
    assert(order.discount_total === 170, `Discount is ₹170 (10% of ₹1700)`);
    assert(order.pre_tax_total === 1530, `Pre-tax total is ₹1530`);
    assert(order.tax_amount === 183.6, `Tax amount is ₹183.60 (12% of 1530)`);
    assert(order.grand_total === 1713.6, `Grand total is ₹1713.60`);
    assert(!!order.payment_token, `Generated payment_token returned`);
    assert(!!order.addon_order_id, `Created addon_order_id returned`);

    // ─── Test 6: Database Persistence & Inventory Lock Check ────────────────
    console.log('\n👉 [6/10] Verifying Database Records and Inventory Stock Locking...');
    const dbBooking = await prisma.ezee_booking_cache.findUnique({
      where: { ezee_reservation_id: eri },
    });
    assert(!!dbBooking, `ezee_booking_cache row exists for ${eri}`);
    assert(dbBooking && dbBooking.status === 'PENDING_PAYMENT', `DB booking status === PENDING_PAYMENT`);

    const dbAccess = await prisma.booking_guest_access.findFirst({
      where: { ezee_reservation_id: eri, role: 'PRIMARY' },
    });
    assert(!!dbAccess && dbAccess.status === 'APPROVED', `booking_guest_access PRIMARY row exists and APPROVED`);

    const dbSlots = await prisma.booking_slots.findMany({
      where: { ezee_reservation_id: eri },
    });
    assert(dbSlots.length === 1, `1 booking slot created for single guest`);
    assert(dbSlots[0].guest_id === dbAccess.guest_id, `Primary guest assigned to slot 1`);

    const dbAddonOrder = await prisma.addon_orders.findUnique({
      where: { id: order.addon_order_id },
      include: { addon_order_items: true },
    });
    assert(!!dbAddonOrder && dbAddonOrder.status === 'PENDING', `addon_order row exists and is PENDING`);
    assert(dbAddonOrder && dbAddonOrder.addon_order_items.length === 1, `addon_order has 1 item`);
    assert(
      dbAddonOrder && dbAddonOrder.addon_order_items[0].product_id === 'prod-water-bottle',
      `addon item product_id === prod-water-bottle`,
    );

    // Verify inventory decrement
    const updatedStock = await prisma.inventory.findFirst({
      where: { product_id: 'prod-water-bottle', property_id: '60765' },
    });
    assert(
      updatedStock.available_stock === initAvailStock - 2,
      `available_stock decremented by 2 (${initAvailStock} -> ${updatedStock.available_stock})`,
    );
    assert(
      updatedStock.reserved_stock === initResStock + 2,
      `reserved_stock incremented by 2 (${initResStock} -> ${updatedStock.reserved_stock})`,
    );

    // ─── Test 7: Guest Bookings Listing (GET /guest/booking/mine) ───────────
    console.log('\n👉 [7/10] Testing GET /guest/booking/mine...');
    const mineRes = await makeRequest('GET', '/guest/booking/mine', null, authHeaders);
    assert(mineRes.status === 200, `GET /guest/booking/mine returns HTTP 200`);
    assert(Array.isArray(mineRes.data), `mine response is an array`);
    const myEris = mineRes.data.map((b) => b.ezee_reservation_id);
    assert(myEris.includes(eri), `Newly created ERI ${eri} appears in guest bookings`);

    // ─── Test 8: Anonymous Order Creation on BUTEAK ─────────────────────────
    console.log('\n👉 [8/10] Testing Anonymous Order Creation on BUTEAK...');
    const anonEmail = `guest.${Date.now()}@buteak-test.in`;
    const anonPhone = `+91977${Date.now().toString().slice(-7)}`;
    const anonOrderRes = await makeRequest(
      'POST',
      '/guest/booking/anonymous/create-order',
      {
        property_id: '55402',
        name: 'Kiran Patel',
        email: anonEmail,
        phone: anonPhone,
        checkin_date: '2026-11-05',
        checkout_date: '2026-11-08',
        rooms: [{ room_type_id: 'rt-btm-studio', quantity: 1 }],
        occupancy: { adults: 1, children: 0 },
      },
      { Host: 'buteak.in' },
    );
    assert(anonOrderRes.status === 201, `Anonymous order returns HTTP 201 (got ${anonOrderRes.status})`);
    const anonOrder = anonOrderRes.data;
    assert(!!anonOrder.ezee_reservation_id && anonOrder.ezee_reservation_id.startsWith('55402-LCL-'), `Anon ERI starts with 55402-LCL-`);
    assert(!!anonOrder.payment_token, `Anon order returns payment_token`);

    const createdAnonGuest = await prisma.guests.findUnique({
      where: { email: anonEmail },
    });
    assert(!!createdAnonGuest, `Guest record silently created in DB for ${anonEmail}`);
    assert(createdAnonGuest && createdAnonGuest.is_anonymous === true, `Guest marked as is_anonymous === true`);

    // ─── Test 9: Overlapping Availability Check ─────────────────────────────
    console.log('\n👉 [9/10] Testing Overlapping Availability Decrement...');
    const overlapRes = await makeRequest(
      'GET',
      '/guest/booking/availability?property_id=60765&checkin=2026-10-15&checkout=2026-10-18',
    );
    assert(overlapRes.status === 200, `Overlapping availability returns HTTP 200`);
    const overlapDorm = overlapRes.data.room_types.find((r) => r.id === 'rt-ka-4dorm');
    assert(
      overlapDorm && overlapDorm.available_beds === 59,
      `available_beds decremented from 60 to 59 due to active booking (got ${overlapDorm?.available_beds})`,
    );

    // ─── Test 10: Public Lookup & Booking Link ──────────────────────────────
    console.log('\n👉 [10/10] Testing Public Lookup & Booking Link...');
    const lookupRes = await makeRequest('GET', `/guest/booking/lookup?booking_id=${eri}`);
    assert(lookupRes.status === 200, `Public lookup returns HTTP 200`);
    assert(lookupRes.data.found === true, `Public lookup found === true`);
    assert(lookupRes.data.booking_id === eri, `Lookup booking_id matches ${eri}`);
    assert(lookupRes.data.status === 'PENDING_PAYMENT', `Lookup status === PENDING_PAYMENT`);

    // Link booking test: Arjun links an existing unlinked reservation
    const linkRes = await makeRequest(
      'POST',
      '/guest/booking/link',
      { ezee_reservation_id: anonOrder.ezee_reservation_id },
      authHeaders,
    );
    assert(linkRes.status === 201, `Link booking returns HTTP 201`);
    assert(linkRes.data.access && linkRes.data.access.role === 'SECONDARY', `Arjun linked as SECONDARY`);
    assert(linkRes.data.access.status === 'APPROVED', `Link access status is APPROVED`);
    assert(Array.isArray(linkRes.data.slots), `Link returns booking slots`);

    console.log(`\n==================================================`);
    console.log(`Phase 4 Test Results: ${passed} passed, ${failed} failed`);
    console.log(`==================================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
