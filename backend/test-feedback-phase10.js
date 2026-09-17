/**
 * Phase 10 — Feedback & Ticketing System Test Suite
 *
 * Flow:
 *  1. Admin login (OWNER @ 60765)
 *  2. Seed: setup checked-in booking -> guest login -> create service request -> admin complete ticket
 *  3. GET /admin/feedback/stats         — initial state
 *  4. POST /admin/feedback/generate-token — mint a dev token via admin endpoint
 *  5. GET /public/feedback/:token        — validate token (FeedbackView)
 *  6. Input Validation Guards (POST /public/feedback/:token) — reject < 1, > 5, non-int
 *  7. POST /public/feedback/:token       — submit valid rating + comment
 *  8. GET /admin/feedback                — list with pagination and filters
 *  9. GET /admin/feedback/stats          — stats after submission
 * 10. GET /admin/feedback/:id            — single record detail & 404 for unknown
 * 11. Idempotency: second POST on same token → 409 { ok: false, state: 'used' }
 * 12. Expired token flow: expired token GET -> 200 { state: 'expired' }, POST -> 410 { state: 'expired' }
 * 13. Invalid token flow: unknown token GET -> 200 { state: 'not_found' }, POST -> 404 { state: 'not_found' }
 */

const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const prisma = new PrismaClient();

const BASE = 'http://localhost:8000';
let passed = 0;
let failed = 0;

const assert = (label, cond, extra = '') => {
  if (cond) {
    console.log('  [PASS]', label);
    passed++;
  } else {
    console.error('  [FAIL]', label, extra);
    failed++;
  }
};

const api = async (method, path, body, token) => {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: r.status, body: json };
};

(async () => {
  console.log('\n\n══════════════════════════════════════════════════════════');
  console.log('  PHASE 10 — Feedback & Ticketing System Verification');
  console.log('══════════════════════════════════════════════════════════\n');

  // ─── 1. Admin login ──────────────────────────────────────────────────────
  console.log('[ 1/13 ] Admin login');
  const loginRes = await api('POST', '/admin/auth/login', {
    email: 'admin@vibehouse.in',
    password: 'Admin123!',
    role: 'OWNER',
    property_id: '60765',
  });
  assert('Admin login 200', loginRes.status === 200, JSON.stringify(loginRes.body));
  const adminToken = loginRes.body?.access_token;
  assert('Has access_token', !!adminToken);

  // ─── 2. Seed: guest login, create ticket, complete it ─────────────────────
  console.log('\n[ 2/13 ] Seed ticket (ensure checked-in booking → service request → complete)');
  const testEri = 'EZEE-KA-2026-001';
  const testGuestId = 'guest-arjun-001';

  // Ensure Arjun has booking_guest_access and checkin_records
  await prisma.booking_guest_access.upsert({
    where: {
      ezee_reservation_id_guest_id: {
        ezee_reservation_id: testEri,
        guest_id: testGuestId,
      },
    },
    update: { role: 'PRIMARY', status: 'APPROVED' },
    create: {
      id: uuidv4(),
      ezee_reservation_id: testEri,
      guest_id: testGuestId,
      role: 'PRIMARY',
      status: 'APPROVED',
      approved_by_guest_id: testGuestId,
      approved_at: new Date(),
    },
  });

  const existingCheckin = await prisma.checkin_records.findFirst({
    where: { ezee_reservation_id: testEri, guest_id: testGuestId },
  });
  if (!existingCheckin) {
    await prisma.checkin_records.create({
      data: {
        id: uuidv4(),
        ezee_reservation_id: testEri,
        guest_id: testGuestId,
        status: 'COMPLETED',
        checked_in_at: new Date(),
      },
    });
  } else if (existingCheckin.status !== 'COMPLETED') {
    await prisma.checkin_records.update({
      where: { id: existingCheckin.id },
      data: { status: 'COMPLETED' },
    });
  }

  // Ensure prod-room-cleaning product exists
  const existingProduct = await prisma.product_catalog.findFirst({
    where: { property_id: '60765', category: 'SERVICE', base_price: 0 },
  });
  const serviceProductId = existingProduct ? existingProduct.id : 'prod-room-cleaning';

  const guestRes = await api('POST', '/guest/auth/login', {
    email: 'arjun@vibehouse.in',
    password: 'GuestPass123!',
  });
  assert('Guest login 200', guestRes.status === 200, JSON.stringify(guestRes.body));
  const guestToken = guestRes.body?.access_token;
  assert('Guest has token', !!guestToken);

  // Create a service request ticket via guest store
  const createRes = await api(
    'POST',
    `/guest/store/${testEri}/service/request`,
    {
      product_id: serviceProductId,
      notes: 'Phase 10 Feedback Test — extra towels and pillows',
    },
    guestToken,
  );

  let ticketId = createRes.body?.ticket_id;
  if (!ticketId || createRes.status >= 400) {
    // Fallback: query ticket or create in DB
    const listRes = await api('GET', '/admin/tickets', null, adminToken);
    ticketId = listRes.body?.[0]?.id;
    assert('Fallback: got ticket from admin list', !!ticketId, JSON.stringify(listRes.body));
  } else {
    assert('Create service request 201', createRes.status === 201, JSON.stringify(createRes.body));
    assert('Has ticket_id', !!ticketId, JSON.stringify(createRes.body));
  }
  assert('Has resolved ticketId', !!ticketId);

  // Complete the ticket via admin endpoint
  const completeRes = await api('POST', `/admin/tickets/${ticketId}/complete`, {}, adminToken);
  assert(
    'Complete ticket 200/201',
    completeRes.status === 200 || completeRes.status === 201,
    JSON.stringify(completeRes.body),
  );

  // ─── 3. Admin stats — initial state ───────────────────────────────────────
  console.log('\n[ 3/13 ] GET /admin/feedback/stats — verify response schema');
  const statsRes = await api('GET', '/admin/feedback/stats', null, adminToken);
  assert('Stats 200', statsRes.status === 200, JSON.stringify(statsRes.body));
  assert('Stats has total_feedback', statsRes.body?.total_feedback !== undefined);
  assert('Stats has avg_rating field', 'avg_rating' in (statsRes.body ?? {}));
  assert('Stats has csat_score_pct field', 'csat_score_pct' in (statsRes.body ?? {}));
  assert('Stats has star_breakdown', typeof statsRes.body?.star_breakdown === 'object');

  // ─── 4. Admin generate-token ───────────────────────────────────────────────
  console.log('\n[ 4/13 ] POST /admin/feedback/generate-token');
  const genRes = await api(
    'POST',
    '/admin/feedback/generate-token',
    { ticket_id: ticketId, ttl_days: 7 },
    adminToken,
  );
  assert('Generate token 201', genRes.status === 201, JSON.stringify(genRes.body));
  const devToken = genRes.body?.token;
  const feedbackId = genRes.body?.id;
  assert('Has raw token (64 hex)', typeof devToken === 'string' && devToken.length === 64);
  assert('Has feedback id', !!feedbackId);
  assert('Has feedback_url', typeof genRes.body?.feedback_url === 'string');
  assert('Has expires_at', !!genRes.body?.expires_at);

  // ─── 5. Public GET — validate token ───────────────────────────────────────
  console.log('\n[ 5/13 ] GET /public/feedback/:token — validate valid token');
  const viewRes = await api('GET', `/public/feedback/${devToken}`, null, null);
  assert('Public GET 200', viewRes.status === 200, JSON.stringify(viewRes.body));
  assert('ok=true', viewRes.body?.ok === true);
  assert('state=valid', viewRes.body?.state === 'valid');
  assert('Has brand', typeof viewRes.body?.brand === 'string');
  assert('Has room_no', 'room_no' in (viewRes.body ?? {}));
  assert('Has request', 'request' in (viewRes.body ?? {}));
  assert('Has staff_name', 'staff_name' in (viewRes.body ?? {}));

  // ─── 6. Input Validation Guards ───────────────────────────────────────────
  console.log('\n[ 6/13 ] Input validation guards (POST /public/feedback/:token)');
  const lowRatingRes = await api('POST', `/public/feedback/${devToken}`, { rating: 0 }, null);
  assert('Rating < 1 rejected 400', lowRatingRes.status === 400);

  const highRatingRes = await api('POST', `/public/feedback/${devToken}`, { rating: 6 }, null);
  assert('Rating > 5 rejected 400', highRatingRes.status === 400);

  const nonIntRes = await api('POST', `/public/feedback/${devToken}`, { rating: 4.5 }, null);
  assert('Float rating rejected 400', nonIntRes.status === 400);

  const longCommentRes = await api(
    'POST',
    `/public/feedback/${devToken}`,
    { rating: 5, comment: 'a'.repeat(2001) },
    null,
  );
  assert('Comment > 2000 chars rejected 400', longCommentRes.status === 400);

  // ─── 7. Public POST — submit feedback ─────────────────────────────────────
  console.log('\n[ 7/13 ] POST /public/feedback/:token — submit rating 5');
  const submitRes = await api(
    'POST',
    `/public/feedback/${devToken}`,
    { rating: 5, comment: 'Phase 10 automated test: Exceptional service!' },
    null,
  );
  assert('Submit 200', submitRes.status === 200, JSON.stringify(submitRes.body));
  assert('ok=true after submit', submitRes.body?.ok === true);
  assert('state=valid', submitRes.body?.state === 'valid');
  assert('Has submitted_at', !!submitRes.body?.submitted_at);
  assert('Has submitted_at_ist', typeof submitRes.body?.submitted_at_ist === 'string');

  // ─── 8. Admin list — after submission ─────────────────────────────────────
  console.log('\n[ 8/13 ] GET /admin/feedback — list submitted rows');
  const listRes = await api('GET', '/admin/feedback?submitted=true&limit=10', null, adminToken);
  assert('List 200', listRes.status === 200, JSON.stringify(listRes.body));
  assert('Has items array', Array.isArray(listRes.body?.items));
  assert('Has pagination', typeof listRes.body?.pagination === 'object');
  assert('At least one submitted feedback', listRes.body?.pagination?.total >= 1);
  const foundItem = listRes.body?.items?.find((i) => i.id === feedbackId);
  assert('Found created feedback in list', !!foundItem);
  assert('Found item has rating 5', foundItem?.rating === 5);
  assert('Found item has comment', foundItem?.comment === 'Phase 10 automated test: Exceptional service!');

  // Filter by min_rating
  const filteredRes = await api('GET', '/admin/feedback?min_rating=4&submitted=true', null, adminToken);
  assert('Filtered list 200', filteredRes.status === 200);
  const allRatingsAbove4 = filteredRes.body?.items?.every((i) => i.rating >= 4);
  assert('All filtered items have rating>=4', allRatingsAbove4 === true);

  // ─── 9. Stats after submission ────────────────────────────────────────────
  console.log('\n[ 9/13 ] GET /admin/feedback/stats — updated stats');
  const stats2Res = await api('GET', '/admin/feedback/stats', null, adminToken);
  assert('Stats 200', stats2Res.status === 200);
  assert('total_submitted >= 1', stats2Res.body?.total_submitted >= 1);
  assert('avg_rating is a number', typeof stats2Res.body?.avg_rating === 'number');
  assert('csat_score_pct is a number', typeof stats2Res.body?.csat_score_pct === 'number');
  const breakdown = stats2Res.body?.star_breakdown ?? {};
  assert('star_breakdown has 5 keys', Object.keys(breakdown).length === 5);
  assert('5-star count >= 1', breakdown['5'] >= 1);

  // ─── 10. Admin single record ───────────────────────────────────────────────
  console.log('\n[10/13 ] GET /admin/feedback/:id — single record');
  const detailRes = await api('GET', `/admin/feedback/${feedbackId}`, null, adminToken);
  assert('Detail 200', detailRes.status === 200, JSON.stringify(detailRes.body));
  assert('Detail id matches', detailRes.body?.id === feedbackId);
  assert('Detail has rating=5', detailRes.body?.rating === 5);
  assert('Detail has comment', detailRes.body?.comment === 'Phase 10 automated test: Exceptional service!');
  assert('Detail has ticket context', detailRes.body?.ticket !== null);

  // 404 for unknown id
  const notFoundRes = await api('GET', '/admin/feedback/non-existent-id-xyz', null, adminToken);
  assert('Unknown id returns 404', notFoundRes.status === 404);

  // ─── 11. Idempotency: second submit on used token ─────────────────────────
  console.log('\n[11/13 ] Idempotency — second submit on used token');
  const idempRes = await api('POST', `/public/feedback/${devToken}`, { rating: 1 }, null);
  assert('Idempotent submit 409', idempRes.status === 409, JSON.stringify(idempRes.body));
  assert('ok=false on used token', idempRes.body?.ok === false);
  assert('state=used', idempRes.body?.state === 'used');

  // Also verify GET on used token returns state=used
  const usedGetRes = await api('GET', `/public/feedback/${devToken}`, null, null);
  assert('Used token GET 200', usedGetRes.status === 200);
  assert('Used token ok=false', usedGetRes.body?.ok === false);
  assert('Used token state=used', usedGetRes.body?.state === 'used');

  // ─── 12. Expired token ────────────────────────────────────────────────────
  console.log('\n[12/13 ] Expired token flow');
  const expRes = await api(
    'POST',
    '/admin/feedback/generate-token',
    { ticket_id: ticketId, ttl_days: 1 },
    adminToken,
  );
  assert('Generate token for expiry test 201', expRes.status === 201);
  const expToken = expRes.body?.token;
  const expFbId = expRes.body?.id;

  // Force expiry via direct DB update
  await prisma.ticket_feedback.update({
    where: { id: expFbId },
    data: { expires_at: new Date(Date.now() - 10000) },
  });

  const expViewRes = await api('GET', `/public/feedback/${expToken}`, null, null);
  assert('Expired token GET 200', expViewRes.status === 200, JSON.stringify(expViewRes.body));
  assert('ok=false on expired', expViewRes.body?.ok === false);
  assert('state=expired', expViewRes.body?.state === 'expired');

  const expSubmitRes = await api('POST', `/public/feedback/${expToken}`, { rating: 3 }, null);
  assert('Expired token submit 410', expSubmitRes.status === 410, JSON.stringify(expSubmitRes.body));
  assert('ok=false on expired submit', expSubmitRes.body?.ok === false);
  assert('state=expired on submit', expSubmitRes.body?.state === 'expired');

  // ─── 13. Unknown token flow ───────────────────────────────────────────────
  console.log('\n[13/13 ] Unknown token flow');
  const bogusToken = '0000000000000000000000000000000000000000000000000000000000000000';
  const bogusGetRes = await api('GET', `/public/feedback/${bogusToken}`, null, null);
  assert('Bogus token GET 200', bogusGetRes.status === 200);
  assert('Bogus token ok=false', bogusGetRes.body?.ok === false);
  assert('Bogus token state=not_found', bogusGetRes.body?.state === 'not_found');

  const bogusPostRes = await api('POST', `/public/feedback/${bogusToken}`, { rating: 5 }, null);
  assert('Bogus token POST 404', bogusPostRes.status === 404);
  assert('Bogus token post ok=false', bogusPostRes.body?.ok === false);
  assert('Bogus token post state=not_found', bogusPostRes.body?.state === 'not_found');

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════');
  console.log(`  PHASE 10 RESULTS: ${passed} passed, ${failed} failed`);
  console.log('══════════════════════════════════════════════════════════\n');

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
})().catch(async (e) => {
  console.error('FATAL:', e);
  await prisma.$disconnect();
  process.exit(1);
});
