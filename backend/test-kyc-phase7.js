/**
 * Phase 7: Web Check-In & KYC System Test Suite
 * 
 * Verifies:
 * 1. Guest & Admin Authentication
 * 2. Slot Management (List, Add, Detail, Delete)
 * 3. Local File Storage Engine (Presigned PUT upload URL, PUT upload, GET static serve)
 * 4. Structured Mock OCR Pipeline (Aadhaar, Passport, Driving Licence)
 * 5. KYC Form Submission & Business Guards (Age >= 18, Consent given, Indian ID only)
 * 6. Document Preview URLs for Guests (Presigned GET)
 * 7. Admin KYC Integration (List submissions, Document URLs, Admin document deletion, Test OCR)
 * 8. Security & Access Guards (401 unauth, 403 booking access, 403 verified slot lock)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const API_BASE = 'http://localhost:8000';
const prisma = new PrismaClient();

const TEST_ERI = 'EZEE-TEST-KYC-60765';
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
  if (options.body && typeof options.body === 'object' && !(options.body instanceof Buffer)) {
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

async function cleanupTestData(eri) {
  try {
    await prisma.kyc_submissions.deleteMany({ where: { ezee_reservation_id: eri } });
    await prisma.booking_slots.deleteMany({ where: { ezee_reservation_id: eri } });
    await prisma.booking_guest_access.deleteMany({ where: { ezee_reservation_id: eri } });
    await prisma.ezee_booking_cache.deleteMany({ where: { ezee_reservation_id: eri } });
  } catch (err) {
    console.warn('Cleanup warning:', err.message);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('  STARTING PHASE 7: WEB CHECK-IN & KYC TEST SUITE   ');
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
    assert(!!guestId, `Guest ID confirmed: ${guestId}`);

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
    const adminToken = adminLogin.data.access_token;
    assert(!!adminToken, 'Admin JWT access_token received');

    const guestHeaders = { Authorization: `Bearer ${guestToken}` };
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    // ── STEP 1B: TEST FIXTURE SETUP ────────────────────────────────────
    await cleanupTestData(TEST_ERI);

    await prisma.ezee_booking_cache.create({
      data: {
        ezee_reservation_id: TEST_ERI,
        property_id: PROP_ID,
        guest_id: guestId,
        ezee_reservation_no: 'BKG-KYC-TEST-001',
        checkin_date: new Date('2026-10-01T14:00:00.000Z'),
        checkout_date: new Date('2026-10-05T11:00:00.000Z'),
        status: 'CONFIRMED',
        is_active: true,
        source: 'TEST_KYC_RUNNER',
        fetched_at: new Date(),
      },
    });

    await prisma.booking_guest_access.create({
      data: {
        id: crypto.randomUUID(),
        ezee_reservation_id: TEST_ERI,
        guest_id: guestId,
        role: 'PRIMARY',
        status: 'APPROVED',
        approved_at: new Date(),
      },
    });

    const initialSlot = await prisma.booking_slots.create({
      data: {
        id: crypto.randomUUID(),
        ezee_reservation_id: TEST_ERI,
        slot_number: 1,
        label: 'Guest 1',
        guest_id: guestId,
        kyc_status: 'NOT_STARTED',
      },
    });

    // ── STEP 2: EXISTING BOOKING & SLOTS ───────────────────────────────
    console.log('\n--- Step 2: Slot Management (List, Add, Detail, Delete) ---');
    const eri = TEST_ERI;

    // 2.1 List slots
    const listRes = await request(`/guest/kyc/${eri}/slots`, { headers: guestHeaders });
    assert(listRes.status === 200, `List slots HTTP ${listRes.status}`);
    assert(listRes.data.ezee_reservation_id === eri, `ERI matches ${eri}`);
    assert(Array.isArray(listRes.data.slots), 'Slots is an array');
    const initialSlotCount = listRes.data.slots.length;
    assert(initialSlotCount >= 1, `Initial slot count is ${initialSlotCount}`);

    const slot1 = listRes.data.slots[0];
    assert(slot1.slot_number === 1, 'Slot 1 slot_number is 1');
    assert(slot1.can_edit === true, 'Slot 1 is editable (can_edit: true)');

    // 2.2 Add new slot
    const addRes = await request(`/guest/kyc/${eri}/slots/add`, {
      method: 'POST',
      headers: guestHeaders,
    });
    assert(addRes.status === 201, `Add slot HTTP ${addRes.status}`);
    assert(addRes.data.slot_number === initialSlotCount + 1, `New slot number is ${addRes.data.slot_number}`);
    assert(addRes.data.kyc_status === 'NOT_STARTED', 'New slot kyc_status is NOT_STARTED');
    const newSlotId = addRes.data.slot_id;

    // 2.3 Get slot detail
    const detailRes = await request(`/guest/kyc/${eri}/slots/${newSlotId}`, { headers: guestHeaders });
    assert(detailRes.status === 200, `Get slot detail HTTP ${detailRes.status}`);
    assert(detailRes.data.slot.slot_id === newSlotId, 'Slot ID matches');
    assert(detailRes.data.kyc === null, 'KYC submission is null initially');

    // 2.4 Delete the newly added slot
    const delRes = await request(`/guest/kyc/${eri}/slots/${newSlotId}`, {
      method: 'DELETE',
      headers: guestHeaders,
    });
    assert(delRes.status === 200, `Delete slot HTTP ${delRes.status}`);
    assert(delRes.data.message.includes('deleted successfully'), 'Slot delete confirmed in message');

    // 2.5 Verify slot count decremented back
    const listAfterDel = await request(`/guest/kyc/${eri}/slots`, { headers: guestHeaders });
    assert(listAfterDel.data.slots.length === initialSlotCount, `Slot count returned to ${initialSlotCount}`);

    // ── STEP 3: LOCAL FILE STORAGE ENGINE ──────────────────────────────
    console.log('\n--- Step 3: Local File Storage Engine (Upload URL, PUT, GET) ---');
    // 3.1 Request Presigned Upload URL
    const uploadUrlRes = await request(`/guest/kyc/${eri}/upload-url`, {
      method: 'POST',
      headers: guestHeaders,
      body: { file_name: 'aadhaar_front.jpg', content_type: 'image/jpeg' },
    });
    assert(uploadUrlRes.status === 201, `Get upload URL HTTP ${uploadUrlRes.status}`);
    assert(uploadUrlRes.data.uploadUrl.includes('/uploads/kyc/'), 'uploadUrl points to local uploads controller');
    assert(uploadUrlRes.data.fileKey.startsWith('kyc/'), 'fileKey has correct kyc/ prefix');
    assert(uploadUrlRes.data.expiresInSeconds === 900, 'expiresInSeconds is 900');

    const aadhaarFrontKey = uploadUrlRes.data.fileKey;
    const aadhaarUploadUrl = uploadUrlRes.data.uploadUrl;

    // 3.2 Upload binary image via HTTP PUT to uploadUrl
    const dummyImageBuffer = Buffer.from('FAKE-JPEG-BINARY-DATA-AADHAAR-FRONT-TEST', 'utf-8');
    const putRes = await fetch(aadhaarUploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: dummyImageBuffer,
    });
    assert(putRes.status === 200, `PUT file upload HTTP ${putRes.status}`);

    // 3.3 Verify file exists on local disk
    const expectedDiskPath = path.resolve(__dirname, 'uploads', aadhaarFrontKey);
    const diskFileExists = fs.existsSync(expectedDiskPath);
    assert(diskFileExists, `File verified on local disk at: ${expectedDiskPath}`);

    // 3.4 Verify file served via GET /uploads/*
    const getFileRes = await fetch(aadhaarUploadUrl);
    assert(getFileRes.status === 200, `GET served file HTTP ${getFileRes.status}`);
    const servedBuffer = Buffer.from(await getFileRes.arrayBuffer());
    assert(Buffer.compare(dummyImageBuffer, servedBuffer) === 0, 'Served file matches uploaded buffer exactly');

    // ── STEP 4: MOCK OCR PIPELINE ──────────────────────────────────────
    console.log('\n--- Step 4: Mock OCR Pipeline ---');
    // 4.1 OCR on Aadhaar
    const ocrAadhaarRes = await request(`/guest/kyc/${eri}/slots/${slot1.slot_id}/ocr`, {
      method: 'POST',
      headers: guestHeaders,
      body: { front_image_key: aadhaarFrontKey },
    });
    assert(ocrAadhaarRes.status === 201, `OCR Aadhaar HTTP ${ocrAadhaarRes.status}`);
    assert(ocrAadhaarRes.data.id_type_detected === 'AADHAAR', `Detected ID type: ${ocrAadhaarRes.data.id_type_detected}`);
    assert(ocrAadhaarRes.data.ocr_name === 'Arjun Sharma', `OCR extracted name: ${ocrAadhaarRes.data.ocr_name}`);
    assert(ocrAadhaarRes.data.ocr_id_number === '987654321098', `OCR extracted ID number: ${ocrAadhaarRes.data.ocr_id_number}`);
    assert(ocrAadhaarRes.data.confidence.name >= 0.9, `Confidence score >= 0.9 (${ocrAadhaarRes.data.confidence.name})`);

    // 4.2 OCR with Passport image key
    const passportUploadUrlRes = await request(`/guest/kyc/${eri}/upload-url`, {
      method: 'POST',
      headers: guestHeaders,
      body: { file_name: 'passport_front.jpg', content_type: 'image/jpeg' },
    });
    await fetch(passportUploadUrlRes.data.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: Buffer.from('FAKE-JPEG-PASSPORT', 'utf-8'),
    });

    const ocrPassportRes = await request(`/guest/kyc/${eri}/slots/${slot1.slot_id}/ocr`, {
      method: 'POST',
      headers: guestHeaders,
      body: { front_image_key: passportUploadUrlRes.data.fileKey },
    });
    assert(ocrPassportRes.status === 201, `OCR Passport HTTP ${ocrPassportRes.status}`);
    assert(ocrPassportRes.data.id_type_detected === 'PASSPORT', `Passport detected: ${ocrPassportRes.data.id_type_detected}`);
    assert(ocrPassportRes.data.ocr_id_number === 'Z1234567', `Passport number: ${ocrPassportRes.data.ocr_id_number}`);

    // 4.3 OCR with Driving Licence image key
    const dlUploadUrlRes = await request(`/guest/kyc/${eri}/upload-url`, {
      method: 'POST',
      headers: guestHeaders,
      body: { file_name: 'driving_licence.jpg', content_type: 'image/jpeg' },
    });
    await fetch(dlUploadUrlRes.data.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: Buffer.from('FAKE-JPEG-DL', 'utf-8'),
    });

    const ocrDlRes = await request(`/guest/kyc/${eri}/slots/${slot1.slot_id}/ocr`, {
      method: 'POST',
      headers: guestHeaders,
      body: { front_image_key: dlUploadUrlRes.data.fileKey },
    });
    assert(ocrDlRes.status === 201, `OCR DL HTTP ${ocrDlRes.status}`);
    assert(ocrDlRes.data.id_type_detected === 'DRIVING_LICENCE', `Driving Licence detected: ${ocrDlRes.data.id_type_detected}`);

    // ── STEP 5: KYC SUBMISSION & VALIDATION GUARDS ─────────────────────
    console.log('\n--- Step 5: KYC Submission & Validation Guards ---');
    const validKycPayload = {
      nationality_type: 'INDIAN',
      id_type: 'AADHAAR',
      full_name: 'Arjun Sharma',
      date_of_birth: '1995-05-15',
      id_number: '987654321098',
      permanent_address: 'Flat 402, Sunshine Heights, Bandra West, Mumbai, Maharashtra 400050',
      contact_number: '+919876543210',
      coming_from: 'Mumbai',
      going_to: 'Goa',
      purpose: 'LEISURE',
      front_image_url: aadhaarUploadUrl,
      consent_given: true,
    };

    // 5.1 Guard: Age < 18 rejection
    const underageRes = await request(`/guest/kyc/${eri}/slots/${slot1.slot_id}/submit`, {
      method: 'POST',
      headers: guestHeaders,
      body: { ...validKycPayload, date_of_birth: '2015-05-15' }, // age 11
    });
    assert(underageRes.status === 400, `Underage submission rejected with 400 (HTTP ${underageRes.status})`);
    assert(
      JSON.stringify(underageRes.data).toLowerCase().includes('18 years'),
      'Error message states guest must be 18 years or older',
    );

    // 5.2 Guard: Missing consent rejection
    const noConsentRes = await request(`/guest/kyc/${eri}/slots/${slot1.slot_id}/submit`, {
      method: 'POST',
      headers: guestHeaders,
      body: { ...validKycPayload, consent_given: false },
    });
    assert(noConsentRes.status === 400, `Missing consent rejected with 400 (HTTP ${noConsentRes.status})`);
    assert(
      JSON.stringify(noConsentRes.data).toLowerCase().includes('consent'),
      'Error message mentions consent requirement',
    );

    // 5.3 Guard: Non-Indian nationality rejection
    const nonIndianRes = await request(`/guest/kyc/${eri}/slots/${slot1.slot_id}/submit`, {
      method: 'POST',
      headers: guestHeaders,
      body: { ...validKycPayload, nationality_type: 'FOREIGN' },
    });
    assert(nonIndianRes.status === 400, `Non-Indian nationality rejected with 400 (HTTP ${nonIndianRes.status})`);

    // 5.4 Valid KYC submission
    const submitRes = await request(`/guest/kyc/${eri}/slots/${slot1.slot_id}/submit`, {
      method: 'POST',
      headers: guestHeaders,
      body: validKycPayload,
    });
    assert(submitRes.status === 201, `Valid KYC submission HTTP ${submitRes.status}`);
    assert(submitRes.data.status === 'PRE_VERIFIED', 'Submission status is PRE_VERIFIED');
    assert(submitRes.data.slot_id === slot1.slot_id, 'Returned slot_id matches');
    assert(!!submitRes.data.kyc_id, 'kyc_id returned');

    // 5.5 Verify slot state in DB updated to PRE_VERIFIED
    const slotAfterSubmit = await request(`/guest/kyc/${eri}/slots/${slot1.slot_id}`, {
      headers: guestHeaders,
    });
    assert(slotAfterSubmit.data.slot.kyc_status === 'PRE_VERIFIED', 'Slot kyc_status updated to PRE_VERIFIED');
    assert(slotAfterSubmit.data.kyc.full_name === 'Arjun Sharma', 'KYC full_name matches Arjun Sharma');
    assert(slotAfterSubmit.data.kyc.status === 'PRE_VERIFIED', 'KYC record status is PRE_VERIFIED');

    // ── STEP 6: GUEST DOCUMENT PREVIEW URLS ────────────────────────────
    console.log('\n--- Step 6: Document Preview URLs for Guests ---');
    const docUrlsRes = await request(`/guest/kyc/${eri}/slots/${slot1.slot_id}/documents`, {
      headers: guestHeaders,
    });
    assert(docUrlsRes.status === 200, `Get document URLs HTTP ${docUrlsRes.status}`);
    assert(docUrlsRes.data.front_image_url.includes('/uploads/'), 'front_image_url points to local uploads');
    assert(docUrlsRes.data.expires_in_seconds === 900, 'expires_in_seconds is 900');

    // ── STEP 7: ADMIN KYC INTEGRATION ──────────────────────────────────
    console.log('\n--- Step 7: Admin KYC Integration ---');
    // 7.1 Admin list submissions
    const adminSubmissionsRes = await request('/admin/kyc/submissions', {
      headers: adminHeaders,
    });
    assert(adminSubmissionsRes.status === 200, `Admin list submissions HTTP ${adminSubmissionsRes.status}`);
    assert(Array.isArray(adminSubmissionsRes.data), 'Admin submissions is array');
    const arjunGroup = adminSubmissionsRes.data.find(
      (g) => g.guest && g.guest.email === 'arjun@vibehouse.in',
    );
    assert(!!arjunGroup, "Found Arjun's group in admin submissions");
    const bookingGroup = arjunGroup?.bookings.find((b) => b.eri === eri);
    assert(!!bookingGroup, `Found booking ${eri} in admin submissions`);
    const adminSlot1 = bookingGroup?.slots.find((s) => s.slot_id === slot1.slot_id);
    assert(adminSlot1?.kyc_status === 'PRE_VERIFIED', 'Admin views slot_1 status as PRE_VERIFIED');
    assert(adminSlot1?.kyc?.has_front_image === true, 'Admin views has_front_image: true');

    // 7.2 Admin get document preview URLs
    const adminDocRes = await request(`/admin/kyc/submissions/${slot1.slot_id}/documents`, {
      headers: adminHeaders,
    });
    assert(adminDocRes.status === 200, `Admin get document URLs HTTP ${adminDocRes.status}`);
    assert(adminDocRes.data.front_image_url.includes('/uploads/'), 'Admin front_image_url is valid download URL');

    // 7.3 Admin Test OCR
    const dummyBase64 = Buffer.from('GOVERNMENT OF INDIA Arjun Sharma DOB: 15/05/1995 9876 5432 1098').toString('base64');
    const testOcrRes = await request('/admin/kyc/test-ocr', {
      method: 'POST',
      headers: adminHeaders,
      body: { front_image_base64: dummyBase64 },
    });
    assert(testOcrRes.status === 201, `Admin test OCR HTTP ${testOcrRes.status}`);
    assert(testOcrRes.data.id_type_detected === 'AADHAAR', `Test OCR detected: ${testOcrRes.data.id_type_detected}`);
    assert(Array.isArray(testOcrRes.data.raw_text_lines), 'Test OCR returned raw_text_lines');

    // 7.4 Admin Delete Document
    const delDocRes = await request(`/admin/kyc/submissions/${slot1.slot_id}/documents/front`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    assert(delDocRes.status === 200, `Admin delete document HTTP ${delDocRes.status}`);
    assert(delDocRes.data.message.includes('deleted successfully'), 'Delete confirmation message returned');

    // Verify document URL is now null
    const verifyDocDeleted = await request(`/admin/kyc/submissions/${slot1.slot_id}/documents`, {
      headers: adminHeaders,
    });
    assert(verifyDocDeleted.data.front_image_url === null, 'front_image_url is now null in DB after deletion');

    // ── STEP 8: SECURITY & ACCESS GUARDS ───────────────────────────────
    console.log('\n--- Step 8: Security & Access Guards ---');
    // 8.1 Unauthenticated guest KYC access rejected (401)
    const unauthRes = await request(`/guest/kyc/${eri}/slots`);
    assert(unauthRes.status === 401, `Unauthenticated request returns HTTP 401 (HTTP ${unauthRes.status})`);

    // 8.2 Unauthorized booking access rejected (403)
    const unauthorizedRes = await request('/guest/kyc/NON-EXISTENT-BOOKING-999/slots', {
      headers: guestHeaders,
    });
    assert(unauthorizedRes.status === 403, `Unauthorized booking access returns HTTP 403 (HTTP ${unauthorizedRes.status})`);

    // 8.3 Locked slot guard (VERIFIED slot cannot be edited or deleted)
    // Temporarily mark slot1 as VERIFIED in DB
    await prisma.booking_slots.update({
      where: { id: slot1.slot_id },
      data: { kyc_status: 'VERIFIED' },
    });

    const editLockedRes = await request(`/guest/kyc/${eri}/slots/${slot1.slot_id}/ocr`, {
      method: 'POST',
      headers: guestHeaders,
      body: { front_image_key: aadhaarFrontKey },
    });
    assert(editLockedRes.status === 403, `Editing VERIFIED slot returns HTTP 403 (HTTP ${editLockedRes.status})`);

    const delLockedRes = await request(`/guest/kyc/${eri}/slots/${slot1.slot_id}`, {
      method: 'DELETE',
      headers: guestHeaders,
    });
    assert(delLockedRes.status === 403, `Deleting VERIFIED slot returns HTTP 403 (HTTP ${delLockedRes.status})`);

    // Restore slot1 kyc_status to PRE_VERIFIED
    await prisma.booking_slots.update({
      where: { id: slot1.slot_id },
      data: { kyc_status: 'PRE_VERIFIED' },
    });
    assert(true, 'Restored slot status to PRE_VERIFIED');

  } catch (err) {
    failed++;
    console.error(`Unexpected test runner exception: ${err.message}`, err);
  } finally {
    await cleanupTestData(TEST_ERI);
    await prisma.$disconnect();
    console.log('\n====================================================');
    console.log(`  PHASE 7 SUMMARY: ${passed} PASSED | ${failed} FAILED`);
    console.log('====================================================\n');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
