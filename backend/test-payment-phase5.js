/**
 * Phase 5 Test Suite: Razorpay Payment & Order Fulfillment
 *
 * Verifies:
 * 1. Authenticated payment order creation with live Razorpay test API
 * 2. Server-authoritative total validation & anti-tampering protection
 * 3. HMAC-SHA256 signature verification and order fulfillment
 * 4. Database state transitions: PENDING_PAYMENT -> CONFIRMED, payment CREATED -> CAPTURED
 * 5. Addon inventory finalization (reserved_stock -> sold_count)
 * 6. Idempotent duplicate payment verification
 * 7. Anonymous BUTEAK payment order creation and verification with single-use payment_token
 * 8. Razorpay server-to-server webhook signature verification and capture event handling
 * 9. Dev simulate capture endpoint (/payment/dev/simulate-capture)
 * 10. Dev simulate fail endpoint (/payment/dev/simulate-fail)
 */

const http = require('http');
const { createHmac } = require('crypto');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:8000';
const RZP_KEY_SECRET = process.env.RAZORPAY_TEST_API_SECRET || 'm1DTGFYJUKu6eIFrAhr738VS';
const RZP_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'm1DTGFYJUKu6eIFrAhr738VS';

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
      if (typeof body === 'string') {
        req.write(body);
      } else {
        req.write(JSON.stringify(body));
      }
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
  console.log('🧪 Starting Phase 5 Razorpay Payment & Order Fulfillment Test Suite...\n');

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
      data: { available_stock: 60, reserved_stock: 0, sold_count: 0 },
    });

    // ─── Step 1: Authenticate Guest ─────────────────────────────────────────
    console.log('👉 [1/10] Authenticating Guest (arjun@vibehouse.in)...');
    const loginRes = await makeRequest('POST', '/guest/auth/login', {
      email: 'arjun@vibehouse.in',
      password: 'GuestPass123!',
    });
    assert(loginRes.status === 200, `Guest login HTTP 200`);
    const guestToken = loginRes.data.access_token;
    const authHeaders = { Authorization: `Bearer ${guestToken}` };

    // ─── Step 2: Create Pending Booking Order ───────────────────────────────
    console.log('\n👉 [2/10] Creating Pending Booking Order (Rooms + Water Bottles + Coupon)...');
    const createOrderRes = await makeRequest(
      'POST',
      '/guest/booking/create-order',
      {
        property_id: '60765',
        checkin_date: '2026-10-20',
        checkout_date: '2026-10-23',
        rooms: [{ room_type_id: 'rt-ka-4dorm', quantity: 1 }],
        addons: [{ product_id: 'prod-water-bottle', quantity: 2 }],
        coupon_code: 'WELCOME10',
      },
      authHeaders,
    );
    assert(createOrderRes.status === 201, `Booking order created (HTTP 201)`);
    const bookingOrder = createOrderRes.data;
    const eri1 = bookingOrder.ezee_reservation_id;
    const grandTotal1 = bookingOrder.grand_total;
    const addonOrderId1 = bookingOrder.addon_order_id;
    assert(!!eri1, `Received ERI: ${eri1}`);
    assert(grandTotal1 === 1713.6, `Grand total matches server calculation (₹1713.60)`);

    // ─── Step 3: Anti-Tampering Protection ──────────────────────────────────
    console.log('\n👉 [3/10] Testing Server-Authoritative Anti-Tampering Protection...');
    const tamperRes = await makeRequest(
      'POST',
      '/payment/create-booking-order',
      {
        ezee_reservation_id: eri1,
        grand_total: 99.0, // tampered amount
        addon_order_id: addonOrderId1,
      },
      authHeaders,
    );
    assert(tamperRes.status === 400, `Tampered amount rejected with HTTP 400 (got ${tamperRes.status})`);
    assert(
      tamperRes.data.message && tamperRes.data.message.includes('Booking total does not match server calculation'),
      `Correct tamper rejection message returned`,
    );

    // ─── Step 4: Create Razorpay Booking Payment Order ──────────────────────
    console.log('\n👉 [4/10] Creating Razorpay Booking Payment Order with live test keys...');
    const payOrderRes = await makeRequest(
      'POST',
      '/payment/create-booking-order',
      {
        ezee_reservation_id: eri1,
        grand_total: grandTotal1,
        addon_order_id: addonOrderId1,
      },
      authHeaders,
    );
    assert(payOrderRes.status === 200 || payOrderRes.status === 201, `Payment order created (HTTP 200/201)`);
    const rzpOrderId1 = payOrderRes.data.razorpay_order_id;
    assert(!!rzpOrderId1 && rzpOrderId1.startsWith('order_'), `Valid Razorpay order_id returned (${rzpOrderId1})`);
    assert(payOrderRes.data.razorpay_key.startsWith('rzp_test_'), `Test public key returned (${payOrderRes.data.razorpay_key})`);
    assert(payOrderRes.data.amount === grandTotal1, `Payment order amount matches grand total`);

    const dbPay1 = await prisma.payments.findUnique({ where: { razorpay_order_id: rzpOrderId1 } });
    assert(!!dbPay1, `Payment record persisted in DB`);
    assert(dbPay1 && dbPay1.status === 'CREATED', `Payment status is CREATED`);
    assert(dbPay1 && dbPay1.payment_mode === 'TEST', `Payment mode is TEST`);

    // ─── Step 5: Verify Payment & Fulfill Booking ───────────────────────────
    console.log('\n👉 [5/10] Verifying Payment Signature & Order Fulfillment...');
    const testPayId1 = `pay_test_${Date.now()}`;

    // Test invalid signature first
    const badVerifyRes = await makeRequest(
      'POST',
      '/payment/verify',
      {
        razorpay_order_id: rzpOrderId1,
        razorpay_payment_id: testPayId1,
        razorpay_signature: 'invalid_forged_signature_hex_12345',
      },
      authHeaders,
    );
    assert(badVerifyRes.status === 400, `Forged signature rejected with HTTP 400`);

    // Generate valid HMAC-SHA256 signature
    const validSignature1 = createHmac('sha256', RZP_KEY_SECRET)
      .update(`${rzpOrderId1}|${testPayId1}`)
      .digest('hex');

    const goodVerifyRes = await makeRequest(
      'POST',
      '/payment/verify',
      {
        razorpay_order_id: rzpOrderId1,
        razorpay_payment_id: testPayId1,
        razorpay_signature: validSignature1,
      },
      authHeaders,
    );
    assert(goodVerifyRes.status === 200 || goodVerifyRes.status === 201, `Valid verification returns HTTP 200/201 (got ${goodVerifyRes.status})`);

    // Verify DB state after fulfillment
    const fulfilledBooking1 = await prisma.ezee_booking_cache.findUnique({
      where: { ezee_reservation_id: eri1 },
    });
    assert(fulfilledBooking1 && fulfilledBooking1.status === 'CONFIRMED', `Booking status transitioned to CONFIRMED`);

    const fulfilledPay1 = await prisma.payments.findUnique({
      where: { razorpay_order_id: rzpOrderId1 },
    });
    assert(fulfilledPay1 && fulfilledPay1.status === 'CAPTURED', `Payment status transitioned to CAPTURED`);
    assert(fulfilledPay1 && fulfilledPay1.razorpay_payment_id === testPayId1, `Payment captured with testPayId`);

    const fulfilledAddon1 = await prisma.addon_orders.findUnique({
      where: { id: addonOrderId1 },
    });
    assert(fulfilledAddon1 && fulfilledAddon1.status === 'PAID', `Addon order status transitioned to PAID`);

    const stockAfterFulfill1 = await prisma.inventory.findFirst({
      where: { product_id: 'prod-water-bottle', property_id: '60765' },
    });
    assert(stockAfterFulfill1.reserved_stock === 0, `Reserved stock decremented to 0`);
    assert(stockAfterFulfill1.sold_count === 2, `Sold count incremented to 2`);

    // ─── Step 6: Idempotent Duplicate Verification ──────────────────────────
    console.log('\n👉 [6/10] Testing Idempotent Duplicate Verification...');
    const dupVerifyRes = await makeRequest(
      'POST',
      '/payment/verify',
      {
        razorpay_order_id: rzpOrderId1,
        razorpay_payment_id: testPayId1,
        razorpay_signature: validSignature1,
      },
      authHeaders,
    );
    assert(dupVerifyRes.status === 200 || dupVerifyRes.status === 201, `Duplicate verification succeeds gracefully`);
    assert(dupVerifyRes.data.message && dupVerifyRes.data.message.includes('already captured'), `Returns already captured message`);

    // ─── Step 7: Anonymous BUTEAK Payment Flow ──────────────────────────────
    console.log('\n👉 [7/10] Testing Anonymous BUTEAK Payment Order & Verification...');
    const anonEmail = `anon.${Date.now()}@buteak-test.in`;
    const anonPhone = `+91986${Date.now().toString().slice(-7)}`;
    const anonBookingRes = await makeRequest(
      'POST',
      '/guest/booking/anonymous/create-order',
      {
        property_id: '55402',
        name: 'Siddharth Roy',
        email: anonEmail,
        phone: anonPhone,
        checkin_date: '2026-11-10',
        checkout_date: '2026-11-13',
        rooms: [{ room_type_id: 'rt-btm-studio', quantity: 1 }],
      },
      { Host: 'buteak.in' },
    );
    assert(anonBookingRes.status === 201, `Anonymous BUTEAK booking order created (HTTP 201)`);
    const anonEri = anonBookingRes.data.ezee_reservation_id;
    const anonToken = anonBookingRes.data.payment_token;
    const anonTotal = anonBookingRes.data.grand_total;
    assert(!!anonToken, `Received single-use payment_token`);

    const anonPayOrderRes = await makeRequest(
      'POST',
      '/payment/anonymous/create-booking-order',
      {
        ezee_reservation_id: anonEri,
        grand_total: anonTotal,
        payment_token: anonToken,
      },
      { Host: 'buteak.in' },
    );
    assert(anonPayOrderRes.status === 200 || anonPayOrderRes.status === 201, `Anonymous payment order created (got ${anonPayOrderRes.status})`);
    const anonRzpOrderId = anonPayOrderRes.data.razorpay_order_id;
    assert(!!anonRzpOrderId && anonRzpOrderId.startsWith('order_'), `Anon Razorpay order_id created`);

    const anonPayId = `pay_anon_${Date.now()}`;
    const anonSignature = createHmac('sha256', RZP_KEY_SECRET)
      .update(`${anonRzpOrderId}|${anonPayId}`)
      .digest('hex');

    const anonVerifyRes = await makeRequest(
      'POST',
      '/payment/anonymous/verify',
      {
        ezee_reservation_id: anonEri,
        razorpay_order_id: anonRzpOrderId,
        razorpay_payment_id: anonPayId,
        razorpay_signature: anonSignature,
        payment_token: anonToken,
      },
      { Host: 'buteak.in' },
    );
    assert(anonVerifyRes.status === 200 || anonVerifyRes.status === 201, `Anonymous payment verified (got ${anonVerifyRes.status})`);

    const dbAnonBooking = await prisma.ezee_booking_cache.findUnique({
      where: { ezee_reservation_id: anonEri },
    });
    assert(dbAnonBooking && dbAnonBooking.status === 'CONFIRMED', `Anonymous booking transitioned to CONFIRMED`);
    assert(dbAnonBooking && dbAnonBooking.payment_token === null, `Anonymous payment_token cleared after capture (single-use enforced)`);

    // ─── Step 8: Razorpay Webhook Event (Server-to-Server) ──────────────────
    console.log('\n👉 [8/10] Testing Razorpay Webhook Verification & payment.captured Event...');
    // Create another pending booking to test webhook fulfillment
    const whBookingRes = await makeRequest(
      'POST',
      '/guest/booking/create-order',
      {
        property_id: '60765',
        checkin_date: '2026-11-20',
        checkout_date: '2026-11-23',
        rooms: [{ room_type_id: 'rt-ka-4dorm', quantity: 1 }],
      },
      authHeaders,
    );
    const whEri = whBookingRes.data.ezee_reservation_id;
    const whTotal = whBookingRes.data.grand_total;

    const whPayOrderRes = await makeRequest(
      'POST',
      '/payment/create-booking-order',
      {
        ezee_reservation_id: whEri,
        grand_total: whTotal,
      },
      authHeaders,
    );
    const whRzpOrderId = whPayOrderRes.data.razorpay_order_id;
    const whPayId = `pay_wh_${Date.now()}`;

    const webhookPayload = JSON.stringify({
      entity: 'event',
      account_id: 'acc_test_123',
      event: 'payment.captured',
      contains: ['payment'],
      payload: {
        payment: {
          entity: {
            id: whPayId,
            order_id: whRzpOrderId,
            amount: Math.round(whTotal * 100),
            currency: 'INR',
            status: 'captured',
          },
        },
      },
      created_at: Math.floor(Date.now() / 1000),
    });

    // Test bad webhook signature
    const badWhRes = await makeRequest(
      'POST',
      '/webhook/razorpay',
      webhookPayload,
      { 'x-razorpay-signature': 'forged_webhook_signature' },
    );
    assert(badWhRes.status === 400, `Bad webhook signature rejected (HTTP 400)`);

    // Test valid webhook signature
    const validWhSignature = createHmac('sha256', RZP_WEBHOOK_SECRET)
      .update(webhookPayload)
      .digest('hex');

    const goodWhRes = await makeRequest(
      'POST',
      '/webhook/razorpay',
      webhookPayload,
      { 'x-razorpay-signature': validWhSignature },
    );
    assert(goodWhRes.status === 200 || goodWhRes.status === 201, `Webhook processed successfully (got ${goodWhRes.status})`);
    assert(goodWhRes.data.status === 'captured', `Webhook returned status: captured`);

    const dbWhBooking = await prisma.ezee_booking_cache.findUnique({
      where: { ezee_reservation_id: whEri },
    });
    assert(dbWhBooking && dbWhBooking.status === 'CONFIRMED', `Webhook transitioned booking to CONFIRMED`);

    // ─── Step 9: Dev Simulate Capture API ───────────────────────────────────
    console.log('\n👉 [9/10] Testing Dev Simulate Payment Capture (/payment/dev/simulate-capture)...');
    const simBookingRes = await makeRequest(
      'POST',
      '/guest/booking/create-order',
      {
        property_id: '60765',
        checkin_date: '2026-12-01',
        checkout_date: '2026-12-04',
        rooms: [{ room_type_id: 'rt-ka-4dorm', quantity: 1 }],
      },
      authHeaders,
    );
    const simEri = simBookingRes.data.ezee_reservation_id;
    const simTotal = simBookingRes.data.grand_total;

    const simPayOrderRes = await makeRequest(
      'POST',
      '/payment/create-booking-order',
      {
        ezee_reservation_id: simEri,
        grand_total: simTotal,
      },
      authHeaders,
    );
    const simRzpOrderId = simPayOrderRes.data.razorpay_order_id;

    const devSimRes = await makeRequest(
      'POST',
      '/payment/dev/simulate-capture',
      { razorpay_order_id: simRzpOrderId },
    );
    assert(devSimRes.status === 200 || devSimRes.status === 201, `Dev simulate capture returns HTTP 200/201`);

    const dbSimBooking = await prisma.ezee_booking_cache.findUnique({
      where: { ezee_reservation_id: simEri },
    });
    assert(dbSimBooking && dbSimBooking.status === 'CONFIRMED', `Simulated booking transitioned to CONFIRMED`);

    // ─── Step 10: Dev Simulate Fail & Retry API ─────────────────────────────
    console.log('\n👉 [10/10] Testing Dev Simulate Payment Fail (/payment/dev/simulate-fail)...');
    const failBookingRes = await makeRequest(
      'POST',
      '/guest/booking/create-order',
      {
        property_id: '60765',
        checkin_date: '2026-12-10',
        checkout_date: '2026-12-13',
        rooms: [{ room_type_id: 'rt-ka-4dorm', quantity: 1 }],
      },
      authHeaders,
    );
    const failEri = failBookingRes.data.ezee_reservation_id;
    const failTotal = failBookingRes.data.grand_total;

    const failPayOrderRes = await makeRequest(
      'POST',
      '/payment/create-booking-order',
      {
        ezee_reservation_id: failEri,
        grand_total: failTotal,
      },
      authHeaders,
    );
    const failRzpOrderId = failPayOrderRes.data.razorpay_order_id;

    const devFailRes = await makeRequest(
      'POST',
      '/payment/dev/simulate-fail',
      { razorpay_order_id: failRzpOrderId },
    );
    assert(devFailRes.status === 200 || devFailRes.status === 201, `Dev simulate fail returns HTTP 200/201`);
    assert(
      devFailRes.data.message && devFailRes.data.message.toLowerCase().includes('payment failed'),
      `Returns payment failed message: "${devFailRes.data.message}"`,
    );

    const dbFailPay = await prisma.payments.findUnique({
      where: { razorpay_order_id: failRzpOrderId },
    });
    assert(dbFailPay && dbFailPay.status === 'FAILED', `Payment record status is FAILED`);

    console.log(`\n==================================================`);
    console.log(`Phase 5 Test Results: ${passed} passed, ${failed} failed`);
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
