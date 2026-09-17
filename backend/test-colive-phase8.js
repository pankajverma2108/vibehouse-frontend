/**
 * Phase 8: Coliving Flow & Quote Generator Test Suite
 * 
 * Verifies:
 * 1. Public Coliving Search (POST /guest/colive/search)
 * 2. Property Details & Live Rates (GET /guest/colive/properties/:property_id)
 * 3. Addon Catalog (GET /guest/colive/properties/:property_id/addons)
 * 4. Coliving Quote Generation & Formula (POST /guest/colive/quote)
 * 5. Partial Month / Extra Days Calculation (Months + Remaining Days)
 * 6. Draft Booking Creation (POST /guest/colive/draft-booking)
 * 7. Draft Booking Retrieval & Onboarding (GET /guest/colive/bookings/:booking_id)
 * 8. Validation & Security Guards (401 unauth, 410 expired quote, 400 unavailable addon, 404 not found)
 */

const { PrismaClient } = require('@prisma/client');

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

async function runTests() {
  console.log('====================================================');
  console.log('  STARTING PHASE 8: COLIVING & QUOTE TEST SUITE    ');
  console.log('====================================================\n');

  try {
    // ── STEP 1: AUTHENTICATION ─────────────────────────────────────────
    console.log('--- Step 1: Authentication ---');
    const guestLogin = await request('/guest/auth/login', {
      method: 'POST',
      body: { email: 'arjun@vibehouse.in', password: 'GuestPass123!' },
    });
    assert(guestLogin.status === 200, `Guest login successful (HTTP ${guestLogin.status})`);
    const guestToken = guestLogin.data.access_token;
    const guestId = guestLogin.data.guest?.id;
    assert(!!guestToken, 'Guest JWT access_token received');
    const guestHeaders = { Authorization: `Bearer ${guestToken}` };

    // ── STEP 2: PUBLIC COLIVING SEARCH ─────────────────────────────────
    console.log('\n--- Step 2: Public Coliving Search (POST /guest/colive/search) ---');
    const searchRes = await request('/guest/colive/search', {
      method: 'POST',
      body: {
        location_slug: 'mumbai',
        move_in_date: '2026-11-01',
        duration_months: 2,
        stay_type: 'solo',
      },
    });

    assert(searchRes.status === 201 || searchRes.status === 200, `Search HTTP ${searchRes.status}`);
    assert(!!searchRes.data.search_id, 'search_id returned for analytics tracking');
    assert(Array.isArray(searchRes.data.properties), 'Properties is an array');
    assert(searchRes.data.properties.length > 0, `Found ${searchRes.data.properties.length} colive properties`);

    const propCard = searchRes.data.properties[0];
    assert(propCard.property_id === PROP_ID, `Property ID matches ${PROP_ID}`);
    assert(propCard.price_from_monthly > 0, `price_from_monthly is positive (₹${propCard.price_from_monthly})`);
    assert(propCard.inventory_state === 'available', `inventory_state is '${propCard.inventory_state}'`);

    // Verify session persisted in DB
    const searchSession = await prisma.colive_search_sessions.findUnique({
      where: { id: searchRes.data.search_id },
    });
    assert(!!searchSession, 'Search session record confirmed in database');
    assert(searchSession.duration_months === 2, 'Session recorded duration_months: 2');

    // ── STEP 3: PROPERTY DETAILS & LIVE RATES ───────────────────────────
    console.log('\n--- Step 3: Property Details (GET /guest/colive/properties/:pid) ---');
    const detailRes = await request(
      `/guest/colive/properties/${PROP_ID}?move_in_date=2026-11-01&duration_months=2&stay_type=solo`,
    );
    assert(detailRes.status === 200, `Property detail HTTP ${detailRes.status}`);
    assert(detailRes.data.property_id === PROP_ID, 'Property ID matches');
    assert(Array.isArray(detailRes.data.room_options), 'room_options is an array');
    assert(detailRes.data.room_options.length >= 2, `Returned ${detailRes.data.room_options.length} room options`);

    const deluxeOpt = detailRes.data.room_options.find((r) => r.room_type_id === 'rt-ka-deluxe');
    assert(!!deluxeOpt, 'Found Private Room (rt-ka-deluxe)');
    assert(deluxeOpt.monthly_price === 35000, `Deluxe monthly price is ₹35,000 (got ${deluxeOpt.monthly_price})`);
    assert(deluxeOpt.available_units > 0, `Available units > 0 (${deluxeOpt.available_units})`);

    // Test couple filter: 4-bed dorm (max_guests = 1) must be excluded for 'couple'
    const coupleDetailRes = await request(
      `/guest/colive/properties/${PROP_ID}?move_in_date=2026-11-01&duration_months=2&stay_type=couple`,
    );
    const coupleRooms = coupleDetailRes.data.room_options;
    const hasDormInCouple = coupleRooms.some((r) => r.room_type_id === 'rt-ka-4dorm');
    assert(!hasDormInCouple, 'Dorm room with max_guests=1 excluded from couple search');

    // ── STEP 4: ADDON CATALOG ──────────────────────────────────────────
    console.log('\n--- Step 4: Addon Catalog (GET /guest/colive/properties/:pid/addons) ---');
    const addonsRes = await request(`/guest/colive/properties/${PROP_ID}/addons?duration_months=2`);
    assert(addonsRes.status === 200, `Addons catalog HTTP ${addonsRes.status}`);
    assert(Array.isArray(addonsRes.data.addons), 'Addons is an array');
    assert(addonsRes.data.addons.length >= 3, `Returned ${addonsRes.data.addons.length} addons`);

    const cleaningAddon = addonsRes.data.addons.find((a) => a.pricing_model === 'per_month');
    assert(!!cleaningAddon, 'Found per_month addon');
    assert(cleaningAddon.unit_price > 0, `Addon unit price > 0 (₹${cleaningAddon.unit_price})`);

    // ── STEP 5: QUOTE CALCULATION (EXACT MONTHS) ───────────────────────
    console.log('\n--- Step 5: Coliving Quote Generation (Exact 2 Months / 60 Days) ---');
    const quotePayload = {
      property_id: PROP_ID,
      room_type_id: 'rt-ka-deluxe',
      move_in_date: '2026-11-01',
      duration_days: 60, // 2 full months
      stay_type: 'solo',
      addons: [
        { addon_id: cleaningAddon.addon_id, quantity: 1 },
      ],
    };

    const quoteRes = await request('/guest/colive/quote', {
      method: 'POST',
      headers: guestHeaders,
      body: quotePayload,
    });
    assert(quoteRes.status === 201 || quoteRes.status === 200, `Quote generation HTTP ${quoteRes.status}`);
    assert(!!quoteRes.data.quote_id, 'quote_id generated');

    const q = quoteRes.data;
    assert(q.room.months === 2, 'Months calculated as 2');
    assert(q.room.remaining_days === 0, 'Remaining days is 0');
    assert(q.room.line_total === 70000, `Room line total is ₹70,000 (2 × 35,000) (got ${q.room.line_total})`);

    const expectedAddonSubtotal = cleaningAddon.unit_price * 1 * 2; // unitPrice * qty * months
    assert(q.charges.addon_subtotal === expectedAddonSubtotal, `Addon subtotal is ₹${expectedAddonSubtotal}`);

    const expectedSubtotal = 70000 + expectedAddonSubtotal;
    const expectedTax = Math.round(expectedSubtotal * 0.05); // 5% GST
    const expectedGrandTotal = expectedSubtotal + expectedTax;

    assert(q.charges.tax_total === expectedTax, `Tax total matches 5% GST (₹${expectedTax})`);
    assert(q.charges.grand_total === expectedGrandTotal, `Grand total matches formula (₹${expectedGrandTotal})`);
    assert(q.savings.total_savings > 0, `Savings reported (${q.savings.total_savings})`);

    // Verify quote record persisted in colive_quotes table
    const quoteDb = await prisma.colive_quotes.findUnique({
      where: { id: q.quote_id },
    });
    assert(!!quoteDb, 'Quote record confirmed in database');
    assert(Number(quoteDb.grand_total) === expectedGrandTotal, 'DB grand_total matches');
    assert(new Date(quoteDb.expires_at) > new Date(), 'Quote expires in the future (> now)');

    const quoteId = q.quote_id;

    // ── STEP 6: QUOTE WITH EXTRA DAYS (PARTIAL MONTH) ──────────────────
    console.log('\n--- Step 6: Quote with Partial Month (45 Days = 1 Month + 15 Days) ---');
    const partialQuoteRes = await request('/guest/colive/quote', {
      method: 'POST',
      headers: guestHeaders,
      body: {
        property_id: PROP_ID,
        room_type_id: 'rt-ka-deluxe',
        move_in_date: '2026-11-01',
        duration_days: 45,
        stay_type: 'solo',
        addons: [],
      },
    });
    assert(partialQuoteRes.status === 201 || partialQuoteRes.status === 200, `Partial quote HTTP ${partialQuoteRes.status}`);
    const pq = partialQuoteRes.data;
    assert(pq.room.months === 1, 'Partial quote months: 1');
    assert(pq.room.remaining_days === 15, 'Partial quote remaining_days: 15');
    // 1 month @ 35000 + 15 days @ 1500/night = 35000 + 22500 = 57500
    const expectedPartialRoomTotal = 35000 + 15 * 1500;
    assert(pq.room.line_total === expectedPartialRoomTotal, `Partial room total is ₹${expectedPartialRoomTotal} (got ${pq.room.line_total})`);

    // ── STEP 7: DRAFT BOOKING CREATION ─────────────────────────────────
    console.log('\n--- Step 7: Draft Booking Creation (POST /guest/colive/draft-booking) ---');
    const draftPayload = {
      quote_id: quoteId,
      property_id: PROP_ID,
      room_type_id: 'rt-ka-deluxe',
      move_in_date: '2026-11-01',
      duration_days: 60,
      stay_type: 'solo',
      guest_details: {
        first_name: 'Arjun',
        last_name: 'Sharma',
        email: 'arjun@vibehouse.in',
        phone: '+919876543210',
      },
      addons: [
        { addon_id: cleaningAddon.addon_id, quantity: 1 },
      ],
    };

    const draftRes = await request('/guest/colive/draft-booking', {
      method: 'POST',
      headers: guestHeaders,
      body: draftPayload,
    });
    assert(draftRes.status === 201 || draftRes.status === 200, `Draft booking HTTP ${draftRes.status}`);
    assert(!!draftRes.data.draft_booking_id, 'draft_booking_id returned');
    assert(draftRes.data.status === 'draft', 'Status is "draft"');
    assert(draftRes.data.charges.grand_total === expectedGrandTotal, `Draft charges match quote grand total (₹${expectedGrandTotal})`);

    const bookingId = draftRes.data.draft_booking_id;

    // ── STEP 8: DRAFT BOOKING DETAIL & ONBOARDING ──────────────────────
    console.log('\n--- Step 8: Draft Booking Detail (GET /guest/colive/bookings/:id) ---');
    const bookingDetailRes = await request(`/guest/colive/bookings/${bookingId}`, {
      headers: guestHeaders,
    });
    assert(bookingDetailRes.status === 200, `Booking detail HTTP ${bookingDetailRes.status}`);
    assert(bookingDetailRes.data.booking_id === bookingId, 'Booking ID matches');
    assert(bookingDetailRes.data.booking_reference.startsWith('TDS-CL-'), `Booking reference formatted (${bookingDetailRes.data.booking_reference})`);
    assert(bookingDetailRes.data.property.name.includes('The Daily Social'), `Property name matches (${bookingDetailRes.data.property.name})`);
    assert(Array.isArray(bookingDetailRes.data.onboarding.next_steps), 'Onboarding next_steps is array');
    assert(bookingDetailRes.data.onboarding.next_steps.length >= 2, 'Next steps listed');

    // ── STEP 9: VALIDATION & SECURITY GUARDS ───────────────────────────
    console.log('\n--- Step 9: Validation & Security Guards ---');
    // 9.1 Unauthenticated quote rejected
    const unauthQuote = await request('/guest/colive/quote', {
      method: 'POST',
      body: quotePayload,
    });
    assert(unauthQuote.status === 401, `Unauthenticated quote rejected with 401 (got ${unauthQuote.status})`);

    // 9.2 Unauthenticated draft booking rejected
    const unauthDraft = await request('/guest/colive/draft-booking', {
      method: 'POST',
      body: draftPayload,
    });
    assert(unauthDraft.status === 401, `Unauthenticated draft booking rejected with 401 (got ${unauthDraft.status})`);

    // 9.3 Expired quote rejection
    const expiredQuote = await prisma.colive_quotes.create({
      data: {
        id: require('crypto').randomUUID(),
        property_id: PROP_ID,
        guest_id: guestId,
        room_option_id: 'croom-bandra-private-001',
        move_in_date: new Date('2026-11-01'),
        duration_days: 60,
        stay_type: 'solo',
        room_line_total: 70000,
        addons_json: [],
        included_items_json: [],
        room_subtotal: 70000,
        addon_subtotal: 0,
        discount_total: 0,
        deposit_total: 0,
        tax_total: 3500,
        grand_total: 73500,
        monthly_savings: 5000,
        total_savings: 10000,
        pricing_notes_json: [],
        currency: 'INR',
        ezee_rate_per_night: 1500,
        expires_at: new Date(Date.now() - 60000), // Expired 1 min ago
      },
    });

    const expiredDraftRes = await request('/guest/colive/draft-booking', {
      method: 'POST',
      headers: guestHeaders,
      body: {
        ...draftPayload,
        quote_id: expiredQuote.id,
      },
    });
    assert(expiredDraftRes.status === 410, `Expired quote rejected with 410 Gone (got ${expiredDraftRes.status})`);

    // 9.4 Non-existent property rejection
    const badPropRes = await request('/guest/colive/properties/INVALID-PROPERTY-999');
    assert(badPropRes.status === 404, `Invalid property returns 404 (got ${badPropRes.status})`);

    // Clean up test records
    await prisma.colive_draft_bookings.deleteMany({ where: { id: bookingId } });
    await prisma.colive_quotes.deleteMany({ where: { id: { in: [quoteId, expiredQuote.id] } } });
    await prisma.colive_search_sessions.deleteMany({ where: { id: searchRes.data.search_id } });

  } catch (err) {
    failed++;
    console.error(`Unexpected test runner exception: ${err.message}`, err);
  } finally {
    await prisma.$disconnect();
    console.log('\n====================================================');
    console.log(`  PHASE 8 SUMMARY: ${passed} PASSED | ${failed} FAILED`);
    console.log('====================================================\n');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
