/**
 * Phase 6 Test Suite: Guest Store, Cart, Borrowables & Housekeeping Requests
 *
 * Verifies:
 * 1. Catalog endpoints:
 *    - GET /guest/store/catalog?property_id=60765 (Commodities, paid services, returnables)
 *    - GET /guest/store/services?property_id=60765 (Free in-house services)
 *    - GET /guest/store/borrowables?property_id=60765 (Borrowables with live stock)
 * 2. Access control & security guards:
 *    - Rejection of unauthenticated requests (401)
 *    - Rejection of unauthorized booking access (403)
 *    - Rejection of adding borrowables or free services to cart (400)
 * 3. Cart CRUD operations & live pricing:
 *    - Empty cart GET
 *    - Add item (sets PRE_ARRIVAL phase pre-checkin)
 *    - Increment existing item quantity
 *    - Add multi-item cart
 *    - Update item quantity (with stock bounds validation)
 *    - Delete cart item
 *    - Cart checkout summary
 * 4. Addon order payment & fulfillment:
 *    - POST /payment/create-order for addon cart
 *    - POST /payment/verify HMAC signature verification
 *    - DB state transitions: payments CREATED -> CAPTURED, addon_orders PENDING -> PAID
 *    - Commodity inventory stock decrement (available_stock - N, sold_count + N)
 *    - Post-payment cart reset & order history listing (GET /guest/store/:eri/orders)
 * 5. Borrowables lifecycle & concurrency:
 *    - POST /guest/store/:eri/borrowable/request with atomic row lock
 *    - Inventory stock decrement (available_stock - 1, borrowed_out_count + 1)
 *    - GET /guest/store/:eri/borrowable/mine
 *    - Rejection of duplicate active checkout (400)
 * 6. Guest stay lifecycle & free service ticketing:
 *    - Rejection of service request pre-checkin (400)
 *    - Check-in transition and during-stay phase update (DURING_STAY)
 *    - POST /guest/store/:eri/service/request post-checkin
 *    - Creation of zoho_ticket_ref record and assignment to staff
 * 7. Returnable entitlements:
 *    - GET /guest/store/:eri/returnables/mine with ordered vs issued tracking
 *    - Issuance lifecycle in returnable_checkouts
 */

const http = require('http');
const { createHmac } = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:8000';
const RZP_KEY_SECRET = process.env.RAZORPAY_TEST_API_SECRET || 'm1DTGFYJUKu6eIFrAhr738VS';

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

let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition, message, details = null) {
  if (condition) {
    console.log(`  \x1b[32m✔\x1b[0m ${message}`);
    passedAssertions++;
  } else {
    console.error(`  \x1b[31m✖\x1b[0m ${message}`);
    if (details) console.error('    Details:', JSON.stringify(details, null, 2));
    failedAssertions++;
  }
}

async function cleanupTestData(eri) {
  try {
    const orderItems = await prisma.addon_order_items.findMany({
      where: { addon_orders: { ezee_reservation_id: eri } },
      select: { id: true },
    });
    const orderItemIds = orderItems.map((i) => i.id);

    if (orderItemIds.length > 0) {
      await prisma.returnable_checkouts.deleteMany({
        where: { addon_order_item_id: { in: orderItemIds } },
      });
    }

    await prisma.returnable_checkouts.deleteMany({
      where: { ezee_reservation_id: eri },
    });

    await prisma.zoho_ticket_ref.deleteMany({
      where: { ezee_reservation_id: eri },
    });

    await prisma.borrowable_checkouts.deleteMany({
      where: { ezee_reservation_id: eri },
    });

    await prisma.addon_order_items.deleteMany({
      where: { addon_orders: { ezee_reservation_id: eri } },
    });

    await prisma.addon_orders.deleteMany({
      where: { ezee_reservation_id: eri },
    });

    await prisma.payments.deleteMany({
      where: { ezee_reservation_id: eri },
    });

    await prisma.checkin_records.deleteMany({
      where: { ezee_reservation_id: eri },
    });

    await prisma.booking_guest_access.deleteMany({
      where: { ezee_reservation_id: eri },
    });

    await prisma.kyc_submissions.deleteMany({
      where: { ezee_reservation_id: eri },
    });

    await prisma.booking_slots.deleteMany({
      where: { ezee_reservation_id: eri },
    });

    await prisma.ezee_booking_cache.deleteMany({
      where: { ezee_reservation_id: eri },
    });
  } catch (err) {
    console.warn('Cleanup warning:', err.message);
  }
}

async function runTestSuite() {
  console.log('\n===============================================================');
  console.log('   PHASE 6 TEST SUITE: GUEST STORE, CART & HOUSEKEEPING');
  console.log('===============================================================\n');

  const TEST_ERI = 'EZEE-TEST-STORE-60765';
  const PROP_ID = '60765';

  // 1. Authenticate guest
  console.log('─── Step 0: Authenticate Test Guest ───');
  const loginRes = await makeRequest('POST', '/guest/auth/login', {
    email: 'arjun@vibehouse.in',
    password: 'GuestPass123!',
  });

  assert(loginRes.status === 200, 'Guest login successful (status 200)');
  const guestToken = loginRes.data?.access_token;
  const guestId = loginRes.data?.guest?.id;
  assert(!!guestToken, 'JWT access token returned');
  assert(!!guestId, `Guest authenticated: ${guestId}`);

  const authHeader = { Authorization: `Bearer ${guestToken}` };

  // 2. Setup clean test booking
  await cleanupTestData(TEST_ERI);

  await prisma.ezee_booking_cache.create({
    data: {
      ezee_reservation_id: TEST_ERI,
      property_id: PROP_ID,
      guest_id: guestId,
      booker_email: 'arjun@vibehouse.in',
      booker_phone: '+919000000001',
      room_type_name: 'Mixed Dorm 4-Bed',
      room_number: 'D-101',
      unit_code: 'BED-D101-A',
      checkin_date: new Date('2026-04-01'),
      checkout_date: new Date('2026-04-05'),
      no_of_guests: 1,
      source: 'Direct',
      status: 'CONFIRMED',
      fetched_at: new Date(),
    },
  });

  await prisma.booking_guest_access.create({
    data: {
      id: uuidv4(),
      ezee_reservation_id: TEST_ERI,
      guest_id: guestId,
      role: 'PRIMARY',
      status: 'APPROVED',
      approved_by_guest_id: guestId,
      approved_at: new Date(),
    },
  });

  console.log('  Clean test reservation created:', TEST_ERI);

  // ─── SUITE 1: CATALOG ENDPOINTS ───
  console.log('\n─── Suite 1: Catalog Endpoints (Public/Property-specific) ───');

  // Test 1: Store Catalog
  const catalogRes = await makeRequest('GET', `/guest/store/catalog?property_id=${PROP_ID}`);
  assert(catalogRes.status === 200, 'GET /guest/store/catalog returns 200');
  assert(Array.isArray(catalogRes.data), 'Catalog data is an array');
  assert(catalogRes.data.length > 0, `Catalog contains ${catalogRes.data.length} purchasable products`);

  const waterBottle = catalogRes.data.find((p) => p.id === 'prod-water-bottle');
  assert(
    !!waterBottle && waterBottle.category === 'COMMODITY' && waterBottle.base_price === 100 && waterBottle.in_stock === true,
    'Catalog includes Water Bottle (COMMODITY, ₹100, in_stock: true)',
    waterBottle,
  );

  const bathTowel = catalogRes.data.find((p) => p.id === 'prod-bath-towel');
  assert(
    !!bathTowel && bathTowel.category === 'RETURNABLE' && bathTowel.base_price === 200,
    'Catalog includes Bath Towel (RETURNABLE, ₹200)',
    bathTowel,
  );

  const laundry = catalogRes.data.find((p) => p.id === 'prod-laundry');
  assert(
    !!laundry && laundry.category === 'SERVICE' && laundry.base_price === 150,
    'Catalog includes Laundry (paid SERVICE, ₹150)',
    laundry,
  );

  // Test 2: Free In-House Services
  const servicesRes = await makeRequest('GET', `/guest/store/services?property_id=${PROP_ID}`);
  assert(servicesRes.status === 200, 'GET /guest/store/services returns 200');
  assert(Array.isArray(servicesRes.data), 'Services data is an array');
  const roomCleaning = servicesRes.data.find((s) => s.id === 'prod-room-cleaning');
  assert(
    !!roomCleaning && roomCleaning.category === 'SERVICE' && Number(roomCleaning.base_price) === 0,
    'Services includes Room Cleaning (SERVICE, base_price: 0)',
    roomCleaning,
  );

  // Test 3: Borrowables Catalog
  const borrowablesRes = await makeRequest('GET', `/guest/store/borrowables?property_id=${PROP_ID}`);
  assert(borrowablesRes.status === 200, 'GET /guest/store/borrowables returns 200');
  assert(Array.isArray(borrowablesRes.data), 'Borrowables data is an array');
  const iron = borrowablesRes.data.find((b) => b.id === 'prod-iron');
  assert(
    !!iron && typeof iron.available === 'number' && typeof iron.total === 'number' && iron.available > 0,
    `Borrowables includes Iron (available: ${iron?.available}/${iron?.total})`,
    iron,
  );

  // ─── SUITE 2: ACCESS GUARDS & INPUT VALIDATION ───
  console.log('\n─── Suite 2: Access Guards & Security Validation ───');

  // Test 4: Unauthenticated access to cart
  const unauthCartRes = await makeRequest('GET', `/guest/store/cart/${TEST_ERI}`);
  assert(unauthCartRes.status === 401, 'Unauthenticated cart request rejected with 401 Unauthorized');

  // Test 5: Unauthorized booking access
  const unauthBookingRes = await makeRequest('GET', '/guest/store/cart/UNKNOWN-BOOKING-999', null, authHeader);
  assert(unauthBookingRes.status === 403, 'Unauthorized booking access rejected with 403 Forbidden');

  // Test 6: Validation error on add to cart (missing product_id / unit_code)
  const invalidAddRes = await makeRequest('POST', `/guest/store/cart/${TEST_ERI}/add`, { quantity: 1 }, authHeader);
  assert(invalidAddRes.status === 400, 'Invalid AddToCartDto rejected with 400 Bad Request');

  // Test 7: Reject adding BORROWABLE to cart
  const addBorrowableRes = await makeRequest(
    'POST',
    `/guest/store/cart/${TEST_ERI}/add`,
    { product_id: 'prod-iron', quantity: 1, unit_code: 'BED-D101-A' },
    authHeader,
  );
  assert(
    addBorrowableRes.status === 400 && addBorrowableRes.data?.message?.includes('Borrowable items cannot be added to cart'),
    'Adding BORROWABLE to cart rejected with 400 ("Borrowable items cannot be added to cart...")',
    addBorrowableRes.data,
  );

  // Test 8: Reject adding FREE SERVICE to cart
  const addFreeServiceRes = await makeRequest(
    'POST',
    `/guest/store/cart/${TEST_ERI}/add`,
    { product_id: 'prod-room-cleaning', quantity: 1, unit_code: 'BED-D101-A' },
    authHeader,
  );
  assert(
    addFreeServiceRes.status === 400 && addFreeServiceRes.data?.message?.includes('Free services cannot be added to cart'),
    'Adding FREE SERVICE to cart rejected with 400 ("Free services cannot be added to cart...")',
    addFreeServiceRes.data,
  );

  // ─── SUITE 3: CART CRUD & PHASE LIFECYCLE ───
  console.log('\n─── Suite 3: Cart CRUD & Calculations (Pre-Arrival Phase) ───');

  // Test 9: Initial empty cart
  const emptyCartRes = await makeRequest('GET', `/guest/store/cart/${TEST_ERI}`, null, authHeader);
  assert(emptyCartRes.status === 200, 'GET /guest/store/cart returns 200');
  assert(
    emptyCartRes.data?.items?.length === 0 && emptyCartRes.data?.total === 0,
    'Initial cart is empty with total = 0',
    emptyCartRes.data,
  );

  // Test 10: Add 2 Water Bottles to cart
  const addWaterRes = await makeRequest(
    'POST',
    `/guest/store/cart/${TEST_ERI}/add`,
    { product_id: 'prod-water-bottle', quantity: 2, unit_code: 'BED-D101-A' },
    authHeader,
  );
  assert(addWaterRes.status === 201, 'Add Water Bottle x 2 succeeds with status 201');
  assert(
    addWaterRes.data?.items?.length === 1 &&
      addWaterRes.data?.items[0].product_id === 'prod-water-bottle' &&
      addWaterRes.data?.items[0].quantity === 2 &&
      addWaterRes.data?.total === 200 &&
      addWaterRes.data?.phase === 'PRE_ARRIVAL',
    'Cart reflects 2 Water Bottles (₹200) and PRE_ARRIVAL phase',
    addWaterRes.data,
  );

  // Test 11: Increment Water Bottle quantity by adding 1 more
  const addMoreWaterRes = await makeRequest(
    'POST',
    `/guest/store/cart/${TEST_ERI}/add`,
    { product_id: 'prod-water-bottle', quantity: 1, unit_code: 'BED-D101-A' },
    authHeader,
  );
  assert(
    addMoreWaterRes.data?.items?.length === 1 &&
      addMoreWaterRes.data?.items[0].quantity === 3 &&
      addMoreWaterRes.data?.total === 300,
    'Incrementing same product updates quantity to 3 and total to ₹300',
    addMoreWaterRes.data,
  );

  // Test 12: Add Safe Lock x 1 (₹150)
  const addLockRes = await makeRequest(
    'POST',
    `/guest/store/cart/${TEST_ERI}/add`,
    { product_id: 'prod-safe-lock', quantity: 1, unit_code: 'BED-D101-A' },
    authHeader,
  );
  assert(
    addLockRes.data?.items?.length === 2 && addLockRes.data?.total === 450,
    'Adding second product creates multi-item cart (2 items, total ₹450)',
    addLockRes.data,
  );

  const lockItem = addLockRes.data?.items?.find((i) => i.product_id === 'prod-safe-lock');
  const waterItem = addLockRes.data?.items?.find((i) => i.product_id === 'prod-water-bottle');

  // Test 13: PATCH update Safe Lock quantity to 2
  const patchItemRes = await makeRequest(
    'PATCH',
    `/guest/store/cart/${TEST_ERI}/item/${lockItem.id}`,
    { quantity: 2 },
    authHeader,
  );
  assert(
    patchItemRes.status === 200 && patchItemRes.data?.total === 600,
    'PATCH cart item updates quantity to 2 and recalculates total to ₹600 (3*100 + 2*150)',
    patchItemRes.data,
  );

  // Test 14: Stock bounds validation on update
  const overstockRes = await makeRequest(
    'PATCH',
    `/guest/store/cart/${TEST_ERI}/item/${lockItem.id}`,
    { quantity: 9999 },
    authHeader,
  );
  assert(
    overstockRes.status === 400 && overstockRes.data?.message?.includes('Insufficient stock'),
    'Exceeding available stock rejected with 400 Insufficient stock',
    overstockRes.data,
  );

  // Test 15: DELETE Safe Lock from cart
  const deleteItemRes = await makeRequest(
    'DELETE',
    `/guest/store/cart/${TEST_ERI}/item/${lockItem.id}`,
    null,
    authHeader,
  );
  assert(
    deleteItemRes.status === 200 &&
      deleteItemRes.data?.items?.length === 1 &&
      deleteItemRes.data?.total === 300,
    'DELETE cart item removes item and recalculates total to ₹300',
    deleteItemRes.data,
  );

  // Test 16: Checkout Cart
  const checkoutRes = await makeRequest('POST', `/guest/store/cart/${TEST_ERI}/checkout`, null, authHeader);
  assert(checkoutRes.status === 201, 'POST /guest/store/cart/:eri/checkout returns 201 Created');
  assert(
    checkoutRes.data?.total === 300 &&
      checkoutRes.data?.order_id &&
      checkoutRes.data?.next_step?.includes('POST /payment/create-order'),
    'Checkout response returns order_id, total ₹300, and next_step instructions',
    checkoutRes.data,
  );
  const addonOrderId = checkoutRes.data?.order_id;

  // ─── SUITE 4: ADDON PAYMENT & INVENTORY FULFILLMENT ───
  console.log('\n─── Suite 4: Addon Payment & Inventory Fulfillment ───');

  // Check initial water bottle stock
  const initialStock = await prisma.inventory.findFirst({
    where: { product_id: 'prod-water-bottle', property_id: PROP_ID },
  });
  const initialAvailable = initialStock.available_stock;
  const initialSold = initialStock.sold_count;

  // Test 17: Create payment order for Addon Cart
  const createPaymentRes = await makeRequest(
    'POST',
    '/payment/create-order',
    { ezee_reservation_id: TEST_ERI },
    authHeader,
  );
  assert(createPaymentRes.status === 201, 'POST /payment/create-order returns 201 Created');
  const rzpOrderId = createPaymentRes.data?.razorpay_order_id;
  assert(
    !!rzpOrderId &&
      rzpOrderId.startsWith('order_') &&
      (createPaymentRes.data?.amount === 300 || createPaymentRes.data?.amount_paise === 30000),
    `Live Razorpay order created: ${rzpOrderId} (amount ₹300 / 30000 paise)`,
    createPaymentRes.data,
  );

  // Verify payment linked to addon order in DB
  const pendingPayment = await prisma.payments.findUnique({
    where: { razorpay_order_id: rzpOrderId },
  });
  assert(
    pendingPayment && pendingPayment.purpose === 'addon_upsell' && pendingPayment.status === 'CREATED',
    'Payment record created with purpose "addon_upsell" and status "CREATED"',
  );

  // Test 18: Verify Payment with HMAC signature
  const mockPaymentId = `pay_addon_${uuidv4().replace(/-/g, '').slice(0, 14)}`;
  const validSignature = createHmac('sha256', RZP_KEY_SECRET)
    .update(`${rzpOrderId}|${mockPaymentId}`)
    .digest('hex');

  const verifyPaymentRes = await makeRequest(
    'POST',
    '/payment/verify',
    {
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: mockPaymentId,
      razorpay_signature: validSignature,
    },
    authHeader,
  );
  assert(verifyPaymentRes.status === 201, 'POST /payment/verify returns 201 Created');

  // Verify DB state updates
  const fulfilledOrder = await prisma.addon_orders.findUnique({
    where: { id: addonOrderId },
  });
  assert(fulfilledOrder && fulfilledOrder.status === 'PAID', 'addon_orders status transitioned to "PAID"');

  const capturedPayment = await prisma.payments.findUnique({
    where: { razorpay_order_id: rzpOrderId },
  });
  assert(capturedPayment && capturedPayment.status === 'CAPTURED', 'payments status transitioned to "CAPTURED"');

  // Verify inventory stock decrement
  const updatedStock = await prisma.inventory.findFirst({
    where: { product_id: 'prod-water-bottle', property_id: PROP_ID },
  });
  assert(
    updatedStock.available_stock === initialAvailable - 3 && updatedStock.sold_count === initialSold + 3,
    `Inventory stock updated: available (${initialAvailable} -> ${updatedStock.available_stock}), sold (${initialSold} -> ${updatedStock.sold_count})`,
  );

  // Test 19: Cart is now empty post-payment
  const postPayCartRes = await makeRequest('GET', `/guest/store/cart/${TEST_ERI}`, null, authHeader);
  assert(
    postPayCartRes.data?.items?.length === 0 && postPayCartRes.data?.total === 0,
    'Cart is automatically reset/cleared after order payment',
    postPayCartRes.data,
  );

  // Test 20: Order history contains PAID addon order
  const ordersRes = await makeRequest('GET', `/guest/store/${TEST_ERI}/orders`, null, authHeader);
  assert(ordersRes.status === 200, 'GET /guest/store/:eri/orders returns 200');
  assert(
    Array.isArray(ordersRes.data) &&
      ordersRes.data.length >= 1 &&
      ordersRes.data[0].status === 'PAID' &&
      ordersRes.data[0].payment?.status === 'CAPTURED' &&
      ordersRes.data[0].payment?.amount === 300,
    'Order history shows PAID addon order with CAPTURED ₹300 payment and items',
    ordersRes.data[0],
  );

  // ─── SUITE 5: BORROWABLES LIFECYCLE & CONCURRENCY GUARD ───
  console.log('\n─── Suite 5: Borrowables Lifecycle & Concurrency Guard ───');

  const ironInvBefore = await prisma.inventory.findFirst({
    where: { product_id: 'prod-iron', property_id: PROP_ID },
  });
  const ironAvailBefore = ironInvBefore.available_stock;
  const ironBorrowedBefore = ironInvBefore.borrowed_out_count;

  // Test 21: Request Borrowable (Iron)
  const borrowRes = await makeRequest(
    'POST',
    `/guest/store/${TEST_ERI}/borrowable/request`,
    { product_id: 'prod-iron', expected_duration_hours: 2 },
    authHeader,
  );
  assert(borrowRes.status === 201, 'POST /guest/store/:eri/borrowable/request returns 201 Created');
  assert(
    borrowRes.data?.checkout_id && borrowRes.data?.product_name === 'Iron' && borrowRes.data?.expected_duration_hours === 2,
    'Borrow response returns checkout_id, product_name: "Iron", and expected_duration: 2',
    borrowRes.data,
  );
  const checkoutId = borrowRes.data?.checkout_id;

  // Verify DB state
  const ironCheckout = await prisma.borrowable_checkouts.findUnique({
    where: { id: checkoutId },
  });
  assert(
    ironCheckout && ironCheckout.status === 'CHECKED_OUT' && ironCheckout.guest_id === guestId,
    'borrowable_checkouts record created with status "CHECKED_OUT"',
  );

  const ironInvAfter = await prisma.inventory.findFirst({
    where: { product_id: 'prod-iron', property_id: PROP_ID },
  });
  assert(
    ironInvAfter.available_stock === ironAvailBefore - 1 && ironInvAfter.borrowed_out_count === ironBorrowedBefore + 1,
    `Borrowable inventory atomically decremented: available (${ironAvailBefore} -> ${ironInvAfter.available_stock}), borrowed (${ironBorrowedBefore} -> ${ironInvAfter.borrowed_out_count})`,
  );

  // Test 22: GET /guest/store/:eri/borrowable/mine
  const myBorrowRes = await makeRequest('GET', `/guest/store/${TEST_ERI}/borrowable/mine`, null, authHeader);
  assert(myBorrowRes.status === 200, 'GET /guest/store/:eri/borrowable/mine returns 200');
  const activeIron = myBorrowRes.data?.find((b) => b.id === checkoutId);
  assert(
    !!activeIron && activeIron.product_name === 'Iron' && activeIron.status === 'CHECKED_OUT',
    'My borrowables lists active Iron checkout with status "CHECKED_OUT"',
    activeIron,
  );

  // Test 23: Duplicate active checkout rejection
  const dupBorrowRes = await makeRequest(
    'POST',
    `/guest/store/${TEST_ERI}/borrowable/request`,
    { product_id: 'prod-iron', expected_duration_hours: 1 },
    authHeader,
  );
  assert(
    dupBorrowRes.status === 400 && dupBorrowRes.data?.message?.includes('already have a "Iron" checked out'),
    'Duplicate active borrowable request rejected with 400 ("You already have a "Iron" checked out")',
    dupBorrowRes.data,
  );

  // Test 24: Return borrowable item
  await prisma.borrowable_checkouts.update({
    where: { id: checkoutId },
    data: { status: 'RETURNED', returned_at: new Date() },
  });
  await prisma.inventory.update({
    where: { id: ironInvBefore.id },
    data: {
      available_stock: { increment: 1 },
      borrowed_out_count: { decrement: 1 },
    },
  });

  const returnedCheckouts = await makeRequest('GET', `/guest/store/${TEST_ERI}/borrowable/mine`, null, authHeader);
  const returnedIron = returnedCheckouts.data?.find((b) => b.id === checkoutId);
  assert(
    returnedIron && returnedIron.status === 'RETURNED' && !!returnedIron.returned_at,
    'Returned item status reflects "RETURNED" with returned_at timestamp',
  );

  // ─── SUITE 6: STAY LIFECYCLE & FREE SERVICE REQUESTS ───
  console.log('\n─── Suite 6: Stay Lifecycle & Free Service Requests ───');

  // Test 25: Free service request BEFORE check-in (Must Fail)
  const preCheckinServiceRes = await makeRequest(
    'POST',
    `/guest/store/${TEST_ERI}/service/request`,
    { product_id: 'prod-room-cleaning', notes: 'Please clean room' },
    authHeader,
  );
  assert(
    preCheckinServiceRes.status === 400 &&
      preCheckinServiceRes.data?.message?.includes('In-house services are only available after check-in'),
    'Pre-checkin service request rejected with 400 ("In-house services are only available after check-in")',
    preCheckinServiceRes.data,
  );

  // Test 26: Complete Check-in for guest
  await prisma.checkin_records.create({
    data: {
      id: uuidv4(),
      ezee_reservation_id: TEST_ERI,
      guest_id: guestId,
      status: 'COMPLETED',
      checked_in_at: new Date(),
    },
  });
  console.log('  Guest check-in marked COMPLETED in checkin_records');

  // Test 27: Add to cart AFTER check-in sets phase to DURING_STAY
  const duringStayAddRes = await makeRequest(
    'POST',
    `/guest/store/cart/${TEST_ERI}/add`,
    { product_id: 'prod-safe-lock', quantity: 1, unit_code: 'BED-D101-A' },
    authHeader,
  );
  assert(
    duringStayAddRes.status === 201 && duringStayAddRes.data?.phase === 'DURING_STAY',
    'Post-checkin cart automatically adapts to phase "DURING_STAY"',
    duringStayAddRes.data,
  );

  // Clear item so next test starts with clean cart
  const duringStayItem = duringStayAddRes.data?.items?.find((i) => i.product_id === 'prod-safe-lock');
  if (duringStayItem) {
    await makeRequest('DELETE', `/guest/store/cart/${TEST_ERI}/item/${duringStayItem.id}`, null, authHeader);
  }

  // Test 28: Free service request AFTER check-in (Must Succeed & Create Ticket)
  const postCheckinServiceRes = await makeRequest(
    'POST',
    `/guest/store/${TEST_ERI}/service/request`,
    { product_id: 'prod-room-cleaning', notes: 'Please clean around 2 PM' },
    authHeader,
  );
  assert(
    postCheckinServiceRes.status === 201 &&
      postCheckinServiceRes.data?.ticket_id &&
      postCheckinServiceRes.data?.service_name === 'Room Cleaning',
    'Post-checkin service request succeeds: ticket created for "Room Cleaning"',
    postCheckinServiceRes.data,
  );
  const serviceTicketId = postCheckinServiceRes.data?.ticket_id;

  // Verify ticket in DB
  const serviceTicket = await prisma.zoho_ticket_ref.findUnique({
    where: { id: serviceTicketId },
    include: { staff: true },
  });
  assert(
    serviceTicket &&
      serviceTicket.department === 'HOUSEKEEPING' &&
      serviceTicket.subject === 'Room Cleaning' &&
      (serviceTicket.status === 'PENDING' || serviceTicket.status === 'OPEN'),
    `zoho_ticket_ref verified: department HOUSEKEEPING, subject "${serviceTicket?.subject}", status ${serviceTicket?.status}, assigned to: ${serviceTicket?.assigned_staff_name ?? 'None'}`,
    serviceTicket,
  );

  // ─── SUITE 7: RETURNABLE ENTITLEMENTS ───
  console.log('\n─── Suite 7: Returnable Entitlements & Issuance ───');

  // Test 29: Order 2 Bath Towels (RETURNABLE, ₹200 each) and fulfill payment
  const towelAddRes = await makeRequest(
    'POST',
    `/guest/store/cart/${TEST_ERI}/add`,
    { product_id: 'prod-bath-towel', quantity: 2, unit_code: 'BED-D101-A' },
    authHeader,
  );
  assert(towelAddRes.status === 201, 'Added 2 Bath Towels (RETURNABLE) to cart');

  // Checkout towel cart
  const towelCheckoutRes = await makeRequest('POST', `/guest/store/cart/${TEST_ERI}/checkout`, null, authHeader);
  const towelOrderId = towelCheckoutRes.data?.order_id;
  const towelTotal = towelCheckoutRes.data?.total;

  const towelPayOrderRes = await makeRequest(
    'POST',
    '/payment/create-order',
    { ezee_reservation_id: TEST_ERI },
    authHeader,
  );
  const towelRzpOrderId = towelPayOrderRes.data?.razorpay_order_id;
  const towelMockPaymentId = `pay_ret_${uuidv4().replace(/-/g, '').slice(0, 14)}`;
  const towelSig = createHmac('sha256', RZP_KEY_SECRET)
    .update(`${towelRzpOrderId}|${towelMockPaymentId}`)
    .digest('hex');

  await makeRequest(
    'POST',
    '/payment/verify',
    {
      razorpay_order_id: towelRzpOrderId,
      razorpay_payment_id: towelMockPaymentId,
      razorpay_signature: towelSig,
    },
    authHeader,
  );

  // Test 30: GET /guest/store/:eri/returnables/mine shows ordered vs pending
  const returnablesRes = await makeRequest('GET', `/guest/store/${TEST_ERI}/returnables/mine`, null, authHeader);
  assert(returnablesRes.status === 200, 'GET /guest/store/:eri/returnables/mine returns 200');
  const towelEntitlement = returnablesRes.data?.find((r) => r.product_id === 'prod-bath-towel');
  assert(
    !!towelEntitlement &&
      towelEntitlement.ordered_quantity === 2 &&
      towelEntitlement.issued_quantity === 0 &&
      towelEntitlement.pending_quantity === 2 &&
      towelEntitlement.active_checkouts.length === 0,
    'Returnable entitlement shows 2 ordered, 0 issued, 2 pending',
    towelEntitlement,
  );

  // Test 31: Simulate front desk issuing 1 towel in returnable_checkouts
  const towelInv = await prisma.inventory.findFirst({
    where: { product_id: 'prod-bath-towel', property_id: PROP_ID },
  });
  await prisma.returnable_checkouts.create({
    data: {
      id: uuidv4(),
      inventory_id: towelInv.id,
      addon_order_item_id: towelEntitlement.addon_order_item_id,
      ezee_reservation_id: TEST_ERI,
      guest_id: guestId,
      unit_code: 'BED-D101-A',
      quantity: 1,
      status: 'ISSUED',
    },
  });

  const updatedReturnablesRes = await makeRequest('GET', `/guest/store/${TEST_ERI}/returnables/mine`, null, authHeader);
  const updatedTowelEntitlement = updatedReturnablesRes.data?.find((r) => r.product_id === 'prod-bath-towel');
  assert(
    !!updatedTowelEntitlement &&
      updatedTowelEntitlement.ordered_quantity === 2 &&
      updatedTowelEntitlement.issued_quantity === 1 &&
      updatedTowelEntitlement.pending_quantity === 1 &&
      updatedTowelEntitlement.active_checkouts.length === 1 &&
      updatedTowelEntitlement.active_checkouts[0].status === 'ISSUED',
    'Returnable entitlement reflects issuance: 2 ordered, 1 issued, 1 pending, 1 active checkout',
    updatedTowelEntitlement,
  );

  // Cleanup test artifacts
  await cleanupTestData(TEST_ERI);
  console.log('\n  Test reservation artifacts cleaned up successfully.');

  // Final summary
  console.log('\n===============================================================');
  console.log(`   PHASE 6 TEST RESULTS: ${passedAssertions} PASSED, ${failedAssertions} FAILED`);
  console.log('===============================================================\n');

  if (failedAssertions > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite()
  .catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
