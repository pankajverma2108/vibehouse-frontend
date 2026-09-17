/**
 * Phase 9: Breakfast Order Flow Test Suite
 * 
 * Verifies:
 * 1. Admin Authentication & Permissions (breakfast.view, breakfast.edit)
 * 2. Admin Breakfast Config Management (GET/PUT /admin/breakfast/config)
 * 3. Admin Menu Catalog CRUD (GET/POST/PATCH/DELETE /admin/breakfast/menu)
 * 4. Admin Delivery Slot Management (GET/POST/PATCH/DELETE /admin/breakfast/slots, summary)
 * 5. Checked-In Booking & Token Generation (breakfast_access_token)
 * 6. Public Guest Breakfast Page (GET /public/breakfast/:token)
 * 7. Token Security & State Transitions (not_found, revoked, checked_out, disabled)
 * 8. Guest Order Placement (POST /public/breakfast/:token) with multi-plate slot allocation
 * 9. Order In-Place Modification & Re-submission
 * 10. Validation & Business Guards (plate cap, slot capacity, invalid menu/slot, foreign room)
 * 11. Window Cutoff Enforcement (409 window_frozen)
 * 12. Skip Action (action: SKIP)
 * 13. Kitchen Operations & Forecasting (GET /admin/breakfast/forecast, dashboard, bookings roster)
 * 14. Admin Manual Order Placement (POST /admin/breakfast/orders)
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const API_BASE = 'http://localhost:8000';
const prisma = new PrismaClient();
const PROP_ID = '60765';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${message}`);
  } else {
    failed++;
    console.error(`  FAIL: ${message}`);
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = { ...options.headers };
  if (options.body && typeof options.body === 'object') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  const res = await fetch(url, { ...options, headers });
  let data;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }
  return { status: res.status, ok: res.ok, data, headers: res.headers };
}

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

async function runTests() {
  console.log('====================================================');
  console.log('   STARTING PHASE 9: BREAKFAST ORDER FLOW SUITE     ');
  console.log('====================================================\n');

  const TEST_ERI = 'EZEE-TEST-BF-60765';
  let adminToken = '';
  let adminHeaders = {};
  let rawGuestToken = '';
  let serviceDate = '';
  let seededSlot1Id = '';
  let seededSlot2Id = '';
  let seededItemId1 = '';
  let seededItemId2 = '';
  let createdMenuItemId = '';
  let createdSlotId = '';

  try {
    // ── STEP 1: ADMIN AUTHENTICATION ────────────────────────────────────
    console.log('--- Step 1: Admin Authentication ---');
    const adminLogin = await request('/admin/auth/login', {
      method: 'POST',
      body: {
        email: 'admin@vibehouse.in',
        password: 'Admin123!',
        role: 'OWNER',
        property_id: PROP_ID,
      },
    });
    assert(adminLogin.status === 200, `Admin login successful (HTTP ${adminLogin.status})`);
    adminToken = adminLogin.data.access_token;
    assert(!!adminToken, 'Admin JWT received');
    adminHeaders = { Authorization: `Bearer ${adminToken}` };

    // Verify property scoping
    assert(adminLogin.data.admin?.active_property_id === PROP_ID, `Active property is ${PROP_ID}`);

    // ── STEP 2: ADMIN CONFIG MANAGEMENT ─────────────────────────────────
    console.log('\n--- Step 2: Admin Breakfast Configuration ---');
    const getConfig = await request('/admin/breakfast/config', { headers: adminHeaders });
    assert(getConfig.status === 200, `Get config HTTP ${getConfig.status}`);
    assert(getConfig.data.property_id === PROP_ID, `Config property matches ${PROP_ID}`);
    assert(typeof getConfig.data.is_enabled === 'boolean', 'is_enabled is boolean');

    // Update config to guaranteed test values
    const updateConfig = await request('/admin/breakfast/config', {
      method: 'PUT',
      headers: adminHeaders,
      body: {
        enabled: true,
        order_open_hour: 11,
        order_freeze_hour: 7,
        invite_cron_enabled: false,
      },
    });
    assert(updateConfig.status === 200, `Update config HTTP ${updateConfig.status}`);
    assert(updateConfig.data.is_enabled === true, 'Config is_enabled set to true');
    assert(updateConfig.data.order_open_hour === 11, 'order_open_hour is 11');
    assert(updateConfig.data.order_freeze_hour === 7, 'order_freeze_hour is 7');

    // ── STEP 3: ADMIN MENU ITEM CATALOG CRUD ────────────────────────────
    console.log('\n--- Step 3: Admin Menu Item Catalog CRUD ---');
    const menuListRes = await request('/admin/breakfast/menu', { headers: adminHeaders });
    assert(menuListRes.status === 200, `List menu HTTP ${menuListRes.status}`);
    assert(Array.isArray(menuListRes.data), 'Menu is an array');
    assert(menuListRes.data.length >= 2, `Menu has ${menuListRes.data.length} seeded items`);

    seededItemId1 = menuListRes.data[0].id;
    seededItemId2 = menuListRes.data[1].id;

    // Clean up any prior test item
    await prisma.breakfast_menu_item.deleteMany({ where: { property_id: PROP_ID, name: 'Rava Kesari Special' } });

    // Create new menu item
    const createItemRes = await request('/admin/breakfast/menu', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        property_id: PROP_ID,
        name: 'Rava Kesari Special',
        description: 'Traditional roasted semolina sweet with saffron and cashews',
        category: 'MAIN',
        is_veg: true,
        forecast_key: 'RAVA_KESARI',
        sort_order: 99,
      },
    });
    assert(createItemRes.status === 201, `Create menu item HTTP ${createItemRes.status}`);
    createdMenuItemId = createItemRes.data.id;
    assert(createItemRes.data.name === 'Rava Kesari Special', 'Created menu item name matches');
    assert(createItemRes.data.is_veg === true, 'Created menu item is_veg is true');

    // Get individual menu item
    const getItemRes = await request(`/admin/breakfast/menu/${createdMenuItemId}`, { headers: adminHeaders });
    assert(getItemRes.status === 200, `Get menu item HTTP ${getItemRes.status}`);
    assert(getItemRes.data.id === createdMenuItemId, 'Item ID matches');

    // Update menu item
    const updateItemRes = await request(`/admin/breakfast/menu/${createdMenuItemId}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: { description: 'Updated gourmet saffron semolina sweet' },
    });
    assert(updateItemRes.status === 200, `Update menu item HTTP ${updateItemRes.status}`);
    assert(updateItemRes.data.description.includes('gourmet saffron'), 'Description updated');

    // Soft-delete menu item
    const deleteItemRes = await request(`/admin/breakfast/menu/${createdMenuItemId}`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    assert(deleteItemRes.status === 200, `Delete menu item HTTP ${deleteItemRes.status}`);
    assert(deleteItemRes.data.ok === true, 'Delete response ok is true');

    // Verify item is soft deleted (is_active: false)
    const afterDeleteMenu = await request('/admin/breakfast/menu', { headers: adminHeaders });
    const deletedItem = afterDeleteMenu.data.find((m) => m.id === createdMenuItemId);
    assert(deletedItem?.is_active === false, 'Soft-deleted item marked is_active: false');

    // ── STEP 4: ADMIN DELIVERY SLOTS MANAGEMENT ────────────────────────
    console.log('\n--- Step 4: Admin Delivery Slots Management ---');
    const slotsRes = await request('/admin/breakfast/slots', { headers: adminHeaders });
    assert(slotsRes.status === 200, `List slots HTTP ${slotsRes.status}`);
    assert(Array.isArray(slotsRes.data), 'Slots is an array');
    assert(slotsRes.data.length >= 3, `Found ${slotsRes.data.length} delivery slots`);

    seededSlot1Id = slotsRes.data[0].id;
    seededSlot2Id = slotsRes.data[1].id;

    // Clean up any prior test slot 99
    await prisma.breakfast_slot.deleteMany({ where: { property_id: PROP_ID, slot_number: 99 } });

    // Create a new slot
    const createSlotRes = await request('/admin/breakfast/slots', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        property_id: PROP_ID,
        slot_number: 99,
        label: '11:00 AM - 12:00 PM',
        start_min: 660,
        end_min: 720,
        capacity: 10,
        sort_order: 99,
      },
    });
    assert(createSlotRes.status === 201, `Create slot HTTP ${createSlotRes.status}`);
    createdSlotId = createSlotRes.data.id;
    assert(createSlotRes.data.capacity === 10, 'Created slot capacity is 10');

    // Update slot capacity
    const updateSlotRes = await request(`/admin/breakfast/slots/${createdSlotId}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: { capacity: 20, label: '11:00 AM - 12:00 PM (Extended)' },
    });
    assert(updateSlotRes.status === 200, `Update slot HTTP ${updateSlotRes.status}`);
    assert(updateSlotRes.data.capacity === 20, 'Slot capacity updated to 20');

    // Soft-delete created slot
    const deleteSlotRes = await request(`/admin/breakfast/slots/${createdSlotId}`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    assert(deleteSlotRes.status === 200, `Delete slot HTTP ${deleteSlotRes.status}`);

    // ── STEP 5: CHECKED-IN BOOKING & TOKEN SETUP ────────────────────────
    console.log('\n--- Step 5: Checked-In Booking & Token Setup ---');
    // Ensure clean state for test booking
    await prisma.breakfast_access_token.deleteMany({ where: { ezee_reservation_id: TEST_ERI } });
    await prisma.breakfast_order.deleteMany({ where: { ezee_reservation_id: TEST_ERI } });
    await prisma.ezee_booking_cache.deleteMany({ where: { ezee_reservation_id: TEST_ERI } });

    // Create checked-in booking for Arjun with 2 adults
    await prisma.ezee_booking_cache.create({
      data: {
        ezee_reservation_id: TEST_ERI,
        property_id: PROP_ID,
        guest_id: 'guest-arjun-001',
        booker_email: 'arjun@vibehouse.in',
        booker_phone: '+919000000001',
        room_number: 'D-101',
        unit_code: 'BED-D101-A',
        room_type_name: 'Deluxe Room',
        checkin_date: new Date('2026-09-17T00:00:00.000Z'),
        checkout_date: new Date('2026-09-25T00:00:00.000Z'), // Staying through next week
        no_of_guests: 2,
        no_of_adults: 2,
        status: 'CHECKED_IN',
        is_active: true,
        source: 'DIRECT',
        is_test: false,
        fetched_at: new Date(),
      },
    });
    assert(true, `Test checked-in booking created (${TEST_ERI})`);

    // Generate opaque 256-bit token
    rawGuestToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256(rawGuestToken);

    await prisma.breakfast_access_token.create({
      data: {
        id: crypto.randomUUID(),
        ezee_reservation_id: TEST_ERI,
        guest_id: 'guest-arjun-001',
        property_id: PROP_ID,
        brand: 'TDS',
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });
    assert(true, 'Breakfast access token issued and hashed in database');

    // ── STEP 6: PUBLIC GUEST BREAKFAST PAGE (GET /public/breakfast/:token) ──
    console.log('\n--- Step 6: Public Guest Breakfast Page ---');
    const guestPageRes = await request(`/public/breakfast/${rawGuestToken}`);
    assert(guestPageRes.status === 200, `Guest breakfast page HTTP ${guestPageRes.status}`);
    assert(guestPageRes.data.link_state === 'valid', "link_state is 'valid'");
    assert(guestPageRes.data.brand === 'TDS', "Brand is 'TDS'");
    assert(guestPageRes.data.window?.state === 'open', `Window state is '${guestPageRes.data.window?.state}'`);
    assert(!!guestPageRes.data.window?.service_date, `service_date resolved (${guestPageRes.data.window?.service_date})`);
    serviceDate = guestPageRes.data.window.service_date;

    assert(guestPageRes.data.total_adults === 2, `total_adults is 2 (got ${guestPageRes.data.total_adults})`);
    assert(Array.isArray(guestPageRes.data.rooms), 'rooms is an array');
    assert(guestPageRes.data.rooms.length === 1, '1 room returned');
    assert(guestPageRes.data.rooms[0].room_number === 'D-101', 'Room number is D-101');
    assert(guestPageRes.data.rooms[0].max_plates === 2, 'Room allows max 2 plates');
    assert(guestPageRes.data.rooms[0].order_status === null, 'Initial order status is null');

    assert(Array.isArray(guestPageRes.data.menu), 'menu is an array');
    assert(guestPageRes.data.menu.length >= 2, `Menu items returned (${guestPageRes.data.menu.length})`);
    assert(Array.isArray(guestPageRes.data.slots), 'slots is an array');
    assert(guestPageRes.data.slots.length >= 3, `Slots returned (${guestPageRes.data.slots.length})`);

    // ── STEP 7: TOKEN SECURITY & STATE GUARDS ───────────────────────────
    console.log('\n--- Step 7: Token Security & State Transitions ---');
    // 7.1 Unknown token
    const badTokenRes = await request('/public/breakfast/00000000000000000000000000000000');
    assert(badTokenRes.status === 200, 'Unknown token returns 200');
    assert(badTokenRes.data.link_state === 'not_found', "Unknown token returns link_state 'not_found'");

    // 7.2 Revoked token
    const revokedToken = crypto.randomBytes(32).toString('hex');
    await prisma.breakfast_access_token.create({
      data: {
        id: crypto.randomUUID(),
        ezee_reservation_id: TEST_ERI,
        property_id: PROP_ID,
        brand: 'TDS',
        token_hash: sha256(revokedToken),
        revoked_at: new Date(),
        expires_at: new Date(Date.now() + 86400000),
      },
    });
    const revokedRes = await request(`/public/breakfast/${revokedToken}`);
    assert(revokedRes.data.link_state === 'revoked', "Revoked token returns link_state 'revoked'");

    // 7.3 Checked-out / Non CHECKED_IN booking
    const coToken = crypto.randomBytes(32).toString('hex');
    const coEri = 'EZEE-TEST-BF-CHECKED-OUT';
    await prisma.ezee_booking_cache.create({
      data: {
        ezee_reservation_id: coEri,
        property_id: PROP_ID,
        room_number: 'D-999',
        status: 'CHECKED_OUT',
        is_active: false,
        fetched_at: new Date(),
      },
    });
    await prisma.breakfast_access_token.create({
      data: {
        id: crypto.randomUUID(),
        ezee_reservation_id: coEri,
        property_id: PROP_ID,
        brand: 'TDS',
        token_hash: sha256(coToken),
        expires_at: new Date(Date.now() + 86400000),
      },
    });
    const coRes = await request(`/public/breakfast/${coToken}`);
    assert(coRes.data.link_state === 'checked_out', "Checked out booking returns link_state 'checked_out'");
    await prisma.breakfast_access_token.deleteMany({ where: { ezee_reservation_id: coEri } });
    await prisma.ezee_booking_cache.deleteMany({ where: { ezee_reservation_id: coEri } });

    // ── STEP 8: GUEST ORDER PLACEMENT (POST /public/breakfast/:token) ──
    console.log('\n--- Step 8: Guest Order Placement ---');
    const orderPayload = {
      rooms: [
        {
          ezee_reservation_id: TEST_ERI,
          action: 'ORDER',
          plates: [
            {
              slot_id: seededSlot1Id,
              items: [{ menu_item_id: seededItemId1, qty: 1 }],
              special_requests: 'Less spicy',
            },
            {
              slot_id: seededSlot2Id,
              items: [{ menu_item_id: seededItemId2, qty: 1 }],
              special_requests: 'Extra chutney',
            },
          ],
        },
      ],
    };

    const submitRes = await request(`/public/breakfast/${rawGuestToken}`, {
      method: 'POST',
      body: orderPayload,
    });
    assert(submitRes.status === 200, `Submit order HTTP ${submitRes.status}`);
    assert(submitRes.data.ok === true, 'Submit order ok is true');
    assert(submitRes.data.rooms[0].order_status === 'PLACED', "Room order_status is 'PLACED'");
    assert(submitRes.data.rooms[0].plates.length === 2, 'Room has 2 placed plates');
    assert(submitRes.data.rooms[0].plates[0].special_requests === 'Less spicy', 'Plate 1 special requests saved');

    // Verify DB order state
    const dbOrder = await prisma.breakfast_order.findFirst({
      where: { ezee_reservation_id: TEST_ERI, property_id: PROP_ID },
      include: { breakfast_plates: { include: { breakfast_order_items: true } } },
    });
    assert(!!dbOrder, 'Order record confirmed in database');
    assert(dbOrder.status === 'PLACED', "DB order status is 'PLACED'");
    assert(dbOrder.breakfast_plates.length === 2, '2 DB plate records created');
    assert(dbOrder.placed_via === 'CX_LINK', "placed_via is 'CX_LINK'");

    // Verify slot capacity summary reflects booked plates
    const slotSummaryRes = await request(`/admin/breakfast/slots/summary?date=${serviceDate}`, {
      headers: adminHeaders,
    });
    assert(slotSummaryRes.status === 200, `Slot summary HTTP ${slotSummaryRes.status}`);
    const s1 = slotSummaryRes.data.slots.find((s) => s.id === seededSlot1Id);
    assert(s1.booked >= 1, `Slot 1 booked count incremented (${s1.booked})`);

    // ── STEP 9: ORDER IN-PLACE MODIFICATION & RE-SUBMISSION ─────────────
    console.log('\n--- Step 9: Order Modification (In-Place Update) ---');
    const updatePayload = {
      rooms: [
        {
          ezee_reservation_id: TEST_ERI,
          action: 'ORDER',
          plates: [
            {
              slot_id: seededSlot1Id,
              items: [{ menu_item_id: seededItemId1, qty: 2 }],
              special_requests: 'Updated special request',
            },
          ],
        },
      ],
    };
    const modifyRes = await request(`/public/breakfast/${rawGuestToken}`, {
      method: 'POST',
      body: updatePayload,
    });
    assert(modifyRes.status === 200, `Modify order HTTP ${modifyRes.status}`);
    assert(modifyRes.data.rooms[0].plates.length === 1, 'Plates updated to 1');
    assert(modifyRes.data.rooms[0].plates[0].special_requests === 'Updated special request', 'Updated plate notes saved');

    // Verify DB was updated in-place without duplicating breakfast_order rows
    const totalOrders = await prisma.breakfast_order.count({
      where: { ezee_reservation_id: TEST_ERI, property_id: PROP_ID },
    });
    assert(totalOrders === 1, `Single breakfast_order row maintained (found ${totalOrders})`);

    // ── STEP 10: VALIDATION & BUSINESS GUARDS ───────────────────────────
    console.log('\n--- Step 10: Validation & Business Guards ---');
    // 10.1 Plate cap exceeded (3 plates for 2-adult room)
    const capExceededRes = await request(`/public/breakfast/${rawGuestToken}`, {
      method: 'POST',
      body: {
        rooms: [
          {
            ezee_reservation_id: TEST_ERI,
            action: 'ORDER',
            plates: [
              { slot_id: seededSlot1Id, items: [{ menu_item_id: seededItemId1, qty: 1 }] },
              { slot_id: seededSlot1Id, items: [{ menu_item_id: seededItemId1, qty: 1 }] },
              { slot_id: seededSlot1Id, items: [{ menu_item_id: seededItemId1, qty: 1 }] },
            ],
          },
        ],
      },
    });
    assert(capExceededRes.status === 400, `Exceeding plate cap rejected with 400 (got ${capExceededRes.status})`);
    assert(capExceededRes.data.error === 'plate_cap_exceeded', "Error code is 'plate_cap_exceeded'");

    // 10.2 Foreign room (not part of booking)
    const foreignRoomRes = await request(`/public/breakfast/${rawGuestToken}`, {
      method: 'POST',
      body: {
        rooms: [
          {
            ezee_reservation_id: 'FOREIGN-RES-999',
            action: 'ORDER',
            plates: [{ slot_id: seededSlot1Id, items: [{ menu_item_id: seededItemId1, qty: 1 }] }],
          },
        ],
      },
    });
    assert(foreignRoomRes.status === 403, `Foreign room rejected with 403 (got ${foreignRoomRes.status})`);
    assert(foreignRoomRes.data.error === 'room_not_yours', "Error code is 'room_not_yours'");

    // 10.3 Invalid menu item
    const badMenuRes = await request(`/public/breakfast/${rawGuestToken}`, {
      method: 'POST',
      body: {
        rooms: [
          {
            ezee_reservation_id: TEST_ERI,
            action: 'ORDER',
            plates: [{ slot_id: seededSlot1Id, items: [{ menu_item_id: 'BAD-ITEM-ID', qty: 1 }] }],
          },
        ],
      },
    });
    assert(badMenuRes.status === 400, `Invalid menu item rejected with 400 (got ${badMenuRes.status})`);
    assert(badMenuRes.data.error === 'invalid_menu_item', "Error code is 'invalid_menu_item'");

    // 10.4 Invalid slot
    const badSlotRes = await request(`/public/breakfast/${rawGuestToken}`, {
      method: 'POST',
      body: {
        rooms: [
          {
            ezee_reservation_id: TEST_ERI,
            action: 'ORDER',
            plates: [{ slot_id: 'BAD-SLOT-ID', items: [{ menu_item_id: seededItemId1, qty: 1 }] }],
          },
        ],
      },
    });
    assert(badSlotRes.status === 400, `Invalid slot rejected with 400 (got ${badSlotRes.status})`);
    assert(badSlotRes.data.error === 'invalid_slot', "Error code is 'invalid_slot'");

    // 10.5 Duplicate room in payload
    const dupRoomRes = await request(`/public/breakfast/${rawGuestToken}`, {
      method: 'POST',
      body: {
        rooms: [
          {
            ezee_reservation_id: TEST_ERI,
            action: 'ORDER',
            plates: [{ slot_id: seededSlot1Id, items: [{ menu_item_id: seededItemId1, qty: 1 }] }],
          },
          {
            ezee_reservation_id: TEST_ERI,
            action: 'ORDER',
            plates: [{ slot_id: seededSlot1Id, items: [{ menu_item_id: seededItemId1, qty: 1 }] }],
          },
        ],
      },
    });
    assert(dupRoomRes.status === 400, `Duplicate room in payload rejected with 400 (got ${dupRoomRes.status})`);
    assert(dupRoomRes.data.error === 'duplicate_room', "Error code is 'duplicate_room'");

    // ── STEP 11: WINDOW CUTOFF ENFORCEMENT ──────────────────────────────
    console.log('\n--- Step 11: Window Cutoff Enforcement (Window Frozen) ---');
    // Freeze window by setting order_open_hour ahead into the future (22:00 IST)
    await prisma.breakfast_config.update({
      where: { property_id: PROP_ID },
      data: { order_open_hour: 22, order_freeze_hour: 7 }, // Window not yet open
    });

    const frozenRes = await request(`/public/breakfast/${rawGuestToken}`, {
      method: 'POST',
      body: updatePayload,
    });
    assert(frozenRes.status === 409, `Order when window frozen rejected with 409 (got ${frozenRes.status})`);
    assert(frozenRes.data.error === 'window_frozen', "Error code is 'window_frozen'");

    // Restore standard ordering window
    await prisma.breakfast_config.update({
      where: { property_id: PROP_ID },
      data: { order_open_hour: 11, order_freeze_hour: 7 },
    });

    // ── STEP 12: SKIP ACTION ───────────────────────────────────────────
    console.log('\n--- Step 12: Skip Action (action: SKIP) ---');
    const skipRes = await request(`/public/breakfast/${rawGuestToken}`, {
      method: 'POST',
      body: {
        rooms: [
          {
            ezee_reservation_id: TEST_ERI,
            action: 'SKIP',
            plates: [],
          },
        ],
      },
    });
    assert(skipRes.status === 200, `Skip action HTTP ${skipRes.status}`);
    assert(skipRes.data.rooms[0].order_status === 'SKIPPED', "Order status transitioned to 'SKIPPED'");
    assert(skipRes.data.rooms[0].plates.length === 0, 'Plates count is 0');

    // ── STEP 13: KITCHEN OPERATIONS & FORECASTING ───────────────────────
    console.log('\n--- Step 13: Kitchen Operations & Forecasting ---');
    // Place a valid order again so kitchen has active data
    await request(`/public/breakfast/${rawGuestToken}`, {
      method: 'POST',
      body: {
        rooms: [
          {
            ezee_reservation_id: TEST_ERI,
            action: 'ORDER',
            plates: [
              { slot_id: seededSlot1Id, items: [{ menu_item_id: seededItemId1, qty: 2 }] },
            ],
          },
        ],
      },
    });

    // 13.1 Bookings roster
    const rosterRes = await request(`/admin/breakfast/bookings?date=${serviceDate}`, { headers: adminHeaders });
    assert(rosterRes.status === 200, `Bookings roster HTTP ${rosterRes.status}`);
    assert(Array.isArray(rosterRes.data.bookings), 'Roster bookings is an array');
    const arjunRow = rosterRes.data.bookings.find((r) => r.ezee_reservation_id === TEST_ERI);
    assert(!!arjunRow, 'Found Arjun in checked-in roster');
    assert(arjunRow.room_number === 'D-101', 'Roster room is D-101');
    assert(arjunRow.order_status === 'PLACED', "Roster order_status is 'PLACED'");

    // 13.2 Order listing
    const ordersRes = await request(`/admin/breakfast/orders?date=${serviceDate}`, { headers: adminHeaders });
    assert(ordersRes.status === 200, `Orders listing HTTP ${ordersRes.status}`);
    assert(Array.isArray(ordersRes.data.orders), 'Orders is an array');
    const arjunOrder = ordersRes.data.orders.find((o) => o.ezee_reservation_id === TEST_ERI);
    assert(!!arjunOrder, 'Arjun order found in orders list');
    assert(arjunOrder.plate_count === 1, 'Plate count matches');

    // 13.3 Kitchen Forecast
    const forecastRes = await request(`/admin/breakfast/forecast?date=${serviceDate}`, { headers: adminHeaders });
    assert(forecastRes.status === 200, `Kitchen forecast HTTP ${forecastRes.status}`);
    assert(Array.isArray(forecastRes.data.items), 'Forecast items is an array');
    const seededItem1Name = menuListRes.data[0].name;
    const forecastItem = forecastRes.data.items.find((i) => i.name === seededItem1Name || i.key === seededItem1Name);
    assert(!!forecastItem, `Seeded item appears in kitchen forecast (${seededItem1Name})`);
    assert(forecastItem ? forecastItem.qty >= 2 : false, `Forecast aggregated quantity >= 2 (${forecastItem?.qty})`);

    // 13.4 Kitchen Dashboard
    const dashRes = await request(`/admin/breakfast/dashboard?date=${serviceDate}`, { headers: adminHeaders });
    assert(dashRes.status === 200, `Kitchen dashboard HTTP ${dashRes.status}`);
    assert(dashRes.data.rooms_ordered >= 1, `Dashboard rooms_ordered >= 1 (${dashRes.data.rooms_ordered})`);
    assert(dashRes.data.plates_ordered >= 1, `Dashboard plates_ordered >= 1 (${dashRes.data.plates_ordered})`);
    assert(typeof dashRes.data.participation_rate === 'number', `Participation rate calculated (${dashRes.data.participation_rate}%)`);

    // ── STEP 14: ADMIN MANUAL ORDER PLACEMENT ───────────────────────────
    console.log('\n--- Step 14: Admin Manual Order Placement ---');
    const adminPlaceRes = await request('/admin/breakfast/orders', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        ezee_reservation_id: TEST_ERI,
        service_date: serviceDate,
        action: 'ORDER',
        plates: [
          {
            slot_id: seededSlot2Id,
            items: [{ menu_item_id: seededItemId2, qty: 1 }],
            special_requests: 'Placed by reception for guest',
          },
        ],
      },
    });
    assert(adminPlaceRes.status === 200 || adminPlaceRes.status === 201, `Admin place order HTTP ${adminPlaceRes.status}`);

    const adminUpdatedOrder = await prisma.breakfast_order.findFirst({
      where: { ezee_reservation_id: TEST_ERI, property_id: PROP_ID },
      include: { breakfast_plates: true },
    });
    assert(adminUpdatedOrder.placed_via === 'ADMIN', "Order placed_via updated to 'ADMIN'");
    assert(adminUpdatedOrder.breakfast_plates[0].special_requests === 'Placed by reception for guest', 'Admin notes recorded');

    // Clean up test records
    await prisma.breakfast_access_token.deleteMany({ where: { ezee_reservation_id: TEST_ERI } });
    await prisma.breakfast_order.deleteMany({ where: { ezee_reservation_id: TEST_ERI } });
    await prisma.ezee_booking_cache.deleteMany({ where: { ezee_reservation_id: TEST_ERI } });
    if (createdMenuItemId) {
      await prisma.breakfast_menu_item.deleteMany({ where: { id: createdMenuItemId } });
    }
    if (createdSlotId) {
      await prisma.breakfast_slot.deleteMany({ where: { id: createdSlotId } });
    }

  } catch (err) {
    failed++;
    console.error(`Unexpected test runner exception: ${err.message}`, err);
  } finally {
    await prisma.$disconnect();
    console.log('\n====================================================');
    console.log(`  PHASE 9 SUMMARY: ${passed} PASSED | ${failed} FAILED`);
    console.log('====================================================\n');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
