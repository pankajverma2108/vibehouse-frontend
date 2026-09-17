// Test suite for Phase 3: Public Catalog & Events
const BASE_URL = 'http://localhost:8000';

async function req(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data, headers: res.headers };
}

async function runTests() {
  console.log('🧪 Starting Phase 3: Public Catalog & Events Verification Tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name} ${details ? '- ' + JSON.stringify(details) : ''}`);
      failed++;
    }
  }

  // 1. GET /public/events?property_id=60765
  console.log('\n--- 1. Public Events (Property 60765 - The Daily Social) ---');
  const eventsRes = await req('/public/events?property_id=60765');
  assert(eventsRes.status === 200, 'GET /public/events?property_id=60765 HTTP 200', eventsRes.data);
  assert(Array.isArray(eventsRes.data), 'Returns array of events');
  assert(eventsRes.data.length >= 4, `Returns all seeded events (found: ${eventsRes.data.length})`);
  
  const firstEvent = eventsRes.data[0];
  console.log(`   Sample Event: "${firstEvent.title}" on ${firstEvent.date?.slice(0, 10)} (Upcoming: ${firstEvent.is_upcoming})`);
  assert(!!firstEvent.id, 'Event has ID');
  assert(!!firstEvent.title, 'Event has title');
  assert(typeof firstEvent.is_upcoming === 'boolean', 'Event includes computed is_upcoming flag');

  // 2. GET /public/events with filter=upcoming
  console.log('\n--- 2. Public Events with filter=upcoming ---');
  const upcomingRes = await req('/public/events?property_id=60765&filter=upcoming');
  assert(upcomingRes.status === 200, 'GET /public/events with filter=upcoming HTTP 200');
  assert(Array.isArray(upcomingRes.data), 'Filter returns array');
  const allUpcoming = upcomingRes.data.every(e => e.is_upcoming === true);
  assert(allUpcoming, 'All returned events have is_upcoming: true');

  // 3. GET /public/events/:id
  console.log('\n--- 3. Single Public Event Fetch ---');
  const singleEventRes = await req(`/public/events/${firstEvent.id}`);
  assert(singleEventRes.status === 200, `GET /public/events/${firstEvent.id} HTTP 200`, singleEventRes.data);
  assert(singleEventRes.data?.id === firstEvent.id, 'Fetched event ID matches');
  assert(singleEventRes.data?.title === firstEvent.title, 'Fetched event title matches');

  // 4. GET /guest/booking/rooms?property_id=60765
  console.log('\n--- 4. Room Catalog (Property 60765 - The Daily Social) ---');
  const roomsRes = await req('/guest/booking/rooms?property_id=60765');
  assert(roomsRes.status === 200, 'GET /guest/booking/rooms?property_id=60765 HTTP 200', roomsRes.data);
  const roomsList = roomsRes.data?.room_types;
  assert(Array.isArray(roomsList), 'Returns array of room types');
  assert(roomsList?.length === 4, `Property 60765 has exactly 4 room types (found: ${roomsList?.length})`);

  // Verify sorted by price ascending
  const prices = roomsList.map(r => r.base_price_per_night);
  const isSorted = prices.every((val, i, arr) => !i || arr[i - 1] <= val);
  assert(isSorted, `Room catalog is sorted ascending by price: [${prices.join(', ')}]`);

  // Check room details
  const dorm4 = roomsList.find(r => r.slug === '4-bed-mixed-dorm' || r.id === 'rt-ka-4dorm');
  assert(!!dorm4, '4-Bed Mixed Dorm exists in catalog');
  assert(dorm4?.type === 'DORM', '4-Bed Dorm has type: DORM');
  assert(dorm4?.base_price_per_night === 500, '4-Bed Dorm price is ₹500');
  assert(Array.isArray(dorm4?.amenities) && dorm4.amenities.length > 0, '4-Bed Dorm has amenities array');
  assert(dorm4?.bookable_online === true, '4-Bed Dorm bookable_online is true');

  const deluxe = roomsList.find(r => r.slug === 'deluxe-private-room' || r.id === 'rt-ka-deluxe');
  assert(!!deluxe, 'Deluxe Private Room exists in catalog');
  assert(deluxe?.type === 'PRIVATE', 'Deluxe Private Room has type: PRIVATE');
  assert(deluxe?.base_price_per_night === 1500, 'Deluxe Room price is ₹1500');

  // 5. GET /guest/booking/rooms (Default property resolution)
  console.log('\n--- 5. Room Catalog with Default Host/Property Resolution ---');
  const defaultRoomsRes = await req('/guest/booking/rooms');
  assert(defaultRoomsRes.status === 200, 'GET /guest/booking/rooms (no query param) HTTP 200');
  assert(defaultRoomsRes.data?.room_types?.length === roomsList.length, 'Resolves to default property 60765 (4 rooms)');

  // 6. GET /guest/booking/rooms?property_id=55402 (Buteak Suites)
  console.log('\n--- 6. Room Catalog (Property 55402 - Buteak Suites) ---');
  const buteakRoomsRes = await req('/guest/booking/rooms?property_id=55402');
  assert(buteakRoomsRes.status === 200, 'GET /guest/booking/rooms?property_id=55402 HTTP 200', buteakRoomsRes.data);
  const buteakRoomsList = buteakRoomsRes.data?.room_types;
  assert(Array.isArray(buteakRoomsList), 'Buteak catalog returns array of room types');
  assert(buteakRoomsList?.length === 2, `Buteak Suites has 2 room types (found: ${buteakRoomsList?.length})`);
  const studio = buteakRoomsList.find(r => r.id === 'rt-btm-studio');
  assert(!!studio && studio.base_price_per_night === 2500, 'Studio Suite exists at ₹2,500/night');
  const oneBhk = buteakRoomsList.find(r => r.id === 'rt-btm-1bhk');
  assert(!!oneBhk && oneBhk.base_price_per_night === 3500, '1BHK Luxury Suite exists at ₹3,500/night');

  // 7. GET /guest/booking/lookup (Public booking lookup)
  console.log('\n--- 7. Public Booking Lookup ---');
  const lookupRes = await req('/guest/booking/lookup?booking_id=EZEE-KA-2026-001');
  assert(lookupRes.status === 200, 'GET /guest/booking/lookup?booking_id=EZEE-KA-2026-001 HTTP 200', lookupRes.data);
  assert(lookupRes.data?.found === true, 'Booking found is true');
  assert(lookupRes.data?.booking_id === 'EZEE-KA-2026-001', 'Booking ID matches');
  assert(lookupRes.data?.property_name === 'The Daily Social - Koramangala A', 'Property name matches');
  assert(lookupRes.data?.status === 'CONFIRMED', 'Status is CONFIRMED');
  assert(!lookupRes.data?.booker_email, 'Booker email is hidden (privacy preserved)');
  assert(!lookupRes.data?.booker_phone, 'Booker phone is hidden (privacy preserved)');

  // 8. Error handling
  console.log('\n--- 8. Public Error Handling ---');
  const notFoundEvent = await req('/public/events/non-existent-event-id');
  assert(notFoundEvent.status === 404, 'Non-existent event returns HTTP 404');

  const notFoundBooking = await req('/guest/booking/lookup?booking_id=INVALID-RESERVATION-ID');
  assert(notFoundBooking.status === 404, 'Non-existent booking lookup returns HTTP 404');

  console.log(`\n========================================`);
  console.log(`📊 Phase 3 Catalog & Events Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
