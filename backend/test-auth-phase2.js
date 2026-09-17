// Test suite for Phase 2: Auth System
const BASE_URL = 'http://localhost:8000';

async function req(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
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
  console.log('🧪 Starting Phase 2: Auth System Verification Tests...\n');
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

  const testEmail = `test.guest.${Date.now()}@example.com`;
  const testPhone = `+9199${Math.floor(10000000 + Math.random() * 90000000)}`;
  let guestToken = null;
  let devOtp = null;

  // 1. Guest Signup
  console.log('\n--- 1. Guest Signup ---');
  const signupRes = await req('/guest/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Maya Patel',
      email: testEmail,
      password: 'Password123!',
      phone: testPhone,
    }),
  });
  assert(signupRes.status === 201, 'Guest Signup HTTP 201', signupRes.data);
  assert(!!signupRes.data?.access_token, 'Guest Signup returns JWT access_token');
  assert(signupRes.data?.guest?.email === testEmail, 'Guest Signup returns formatted guest');
  assert(signupRes.data?.otp_sent === true, 'Guest Signup auto-sends OTP');
  assert(!!signupRes.data?.dev_otp, 'Guest Signup returns dev_otp in dev response', signupRes.data?.dev_otp);
  guestToken = signupRes.data?.access_token;
  devOtp = signupRes.data?.dev_otp;

  // 2. Guest Verify OTP
  console.log('\n--- 2. Guest Email OTP Verification ---');
  const verifyRes = await req('/guest/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      otp: devOtp,
    }),
  });
  assert(verifyRes.status === 200, 'Verify OTP HTTP 200', verifyRes.data);
  assert(verifyRes.data?.guest?.email_verified === true, 'Guest email_verified set to true');
  assert(!!verifyRes.data?.access_token, 'Verify OTP issues fresh access_token');
  guestToken = verifyRes.data?.access_token;

  // 2b. Test Send OTP route
  console.log('\n--- 2b. Guest Send OTP (Already Verified Guard) ---');
  const sendOtpAlreadyVerified = await req('/guest/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ email: testEmail }),
  });
  assert(sendOtpAlreadyVerified.status === 400, 'send-otp returns 400 if email already verified', sendOtpAlreadyVerified.data);
  assert(sendOtpAlreadyVerified.data?.message === 'Email is already verified', 'Error message indicates already verified');

  // 3. Guest Profile (/me)
  console.log('\n--- 3. Guest Profile (/me) ---');
  const meRes = await req('/guest/auth/me', {
    method: 'GET',
    token: guestToken,
  });
  assert(meRes.status === 200, 'GET /guest/auth/me HTTP 200', meRes.data);
  assert(meRes.data?.email === testEmail, 'GET /guest/auth/me returns guest email');
  assert(meRes.data?.email_verified === true, 'GET /guest/auth/me reflects email_verified: true');
  assert(Array.isArray(meRes.data?.bookings), 'GET /guest/auth/me includes bookings array');

  // 4. Guest Profile Update (PATCH /me)
  console.log('\n--- 4. Guest Profile Update (PATCH /me) ---');
  const updateRes = await req('/guest/auth/me', {
    method: 'PATCH',
    token: guestToken,
    body: JSON.stringify({
      name: 'Maya Patel Updated',
      date_of_birth: '1995-06-15',
    }),
  });
  assert(updateRes.status === 200, 'PATCH /guest/auth/me HTTP 200', updateRes.data);
  assert(updateRes.data?.name === 'Maya Patel Updated', 'Guest name updated');
  assert(updateRes.data?.date_of_birth === '1995-06-15', 'Guest date_of_birth updated');

  // 5. Guest Login with updated password
  console.log('\n--- 5. Guest Login ---');
  const loginRes = await req('/guest/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      password: 'Password123!',
    }),
  });
  assert(loginRes.status === 200, 'Guest Login HTTP 200', loginRes.data);
  assert(!!loginRes.data?.access_token, 'Guest Login returns access_token');
  assert(loginRes.data?.guest?.name === 'Maya Patel Updated', 'Guest Login returns updated profile');

  // 6. Seeded Guest Login (Arjun) & Linked Bookings
  console.log('\n--- 6. Seeded Guest Login (Arjun) & Linked Bookings ---');
  const arjunLoginRes = await req('/guest/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'arjun@vibehouse.in',
      password: 'GuestPass123!',
    }),
  });
  assert(arjunLoginRes.status === 200, 'Seeded Guest Login HTTP 200', arjunLoginRes.data);
  const arjunMe = await req('/guest/auth/me', {
    method: 'GET',
    token: arjunLoginRes.data?.access_token,
  });
  assert(arjunMe.status === 200, 'Seeded Guest GET /guest/auth/me HTTP 200', arjunMe.data);
  assert(arjunMe.data?.bookings?.length > 0, 'Seeded Guest has auto-linked bookings', arjunMe.data?.bookings);

  // 7. Password Reset Flow
  console.log('\n--- 7. Password Reset Flow ---');
  const forgotRes = await req('/guest/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
    }),
  });
  assert(forgotRes.status === 201 || forgotRes.status === 200, 'Forgot Password HTTP 200/201', forgotRes.data);
  assert(!!forgotRes.data?.dev_otp, 'Forgot Password returns dev_otp', forgotRes.data?.dev_otp);
  const resetOtp = forgotRes.data?.dev_otp;

  const resetRes = await req('/guest/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      otp: resetOtp,
      newPassword: 'NewSecurePassword789!',
    }),
  });
  assert(resetRes.status === 201 || resetRes.status === 200, 'Reset Password HTTP 200/201', resetRes.data);

  // Test old password fails
  const oldLoginRes = await req('/guest/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      password: 'Password123!',
    }),
  });
  assert(oldLoginRes.status === 401, 'Old password fails with HTTP 401');

  // Test new password succeeds
  const newLoginRes = await req('/guest/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      password: 'NewSecurePassword789!',
    }),
  });
  assert(newLoginRes.status === 200, 'New password login succeeds with HTTP 200', newLoginRes.data);
  guestToken = newLoginRes.data?.access_token;

  // 8. 2FA Flow
  console.log('\n--- 8. Two-Factor Authentication (2FA) Flow ---');
  const enable2faRes = await req('/guest/auth/2fa', {
    method: 'PATCH',
    token: guestToken,
    body: JSON.stringify({ enabled: true }),
  });
  assert(enable2faRes.status === 200 && enable2faRes.data?.two_fa_enabled === true, 'Enable 2FA HTTP 200', enable2faRes.data);

  // Login now requires 2FA
  const login2faRes = await req('/guest/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      password: 'NewSecurePassword789!',
    }),
  });
  assert(login2faRes.status === 200 && login2faRes.data?.requires_2fa === true, 'Login responds with requires_2fa: true', login2faRes.data);
  assert(!!login2faRes.data?.dev_otp, 'Login with 2FA returns dev_otp', login2faRes.data?.dev_otp);
  const twoFaOtp = login2faRes.data?.dev_otp;

  // Verify 2FA
  const verify2faRes = await req('/guest/auth/verify-2fa', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      otp: twoFaOtp,
    }),
  });
  assert(verify2faRes.status === 201 || verify2faRes.status === 200, 'Verify 2FA completes login HTTP 200/201', verify2faRes.data);
  assert(!!verify2faRes.data?.access_token, 'Verify 2FA returns access_token');

  // Turn off 2FA
  await req('/guest/auth/2fa', {
    method: 'PATCH',
    token: verify2faRes.data?.access_token,
    body: JSON.stringify({ enabled: false }),
  });

  // 9. Admin Login
  console.log('\n--- 9. Admin Login ---');
  const adminLoginRes = await req('/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@vibehouse.in',
      password: 'Admin123!',
      role: 'OWNER',
      property_id: '60765',
    }),
  });
  assert(adminLoginRes.status === 200, 'Admin Login HTTP 200', adminLoginRes.data);
  assert(!!adminLoginRes.data?.access_token, 'Admin Login returns access_token');
  assert(adminLoginRes.data?.admin?.role === 'OWNER', 'Admin role is OWNER');
  assert(adminLoginRes.data?.admin?.active_property_id === '60765', 'Admin active_property_id is 60765');
  assert(adminLoginRes.data?.admin?.property_ids?.includes('55402'), 'Admin has access to property 55402 as well');
  let adminToken = adminLoginRes.data?.access_token;

  // 10. Admin Switch Property
  console.log('\n--- 10. Admin Switch Property ---');
  const switchRes = await req('/admin/auth/switch-property', {
    method: 'POST',
    token: adminToken,
    body: JSON.stringify({
      property_id: '55402',
    }),
  });
  assert(switchRes.status === 200, 'Switch Property HTTP 200', switchRes.data);
  assert(switchRes.data?.active_property_id === '55402', 'Switched to property 55402');
  assert(!!switchRes.data?.access_token, 'Switch Property issues new JWT token');
  adminToken = switchRes.data?.access_token;

  // 11. Admin Profile (/admin/auth/me)
  console.log('\n--- 11. Admin Profile (/admin/auth/me) ---');
  const adminMeRes = await req('/admin/auth/me', {
    method: 'GET',
    token: adminToken,
  });
  assert(adminMeRes.status === 200, 'Admin GET /admin/auth/me HTTP 200', adminMeRes.data);
  assert(adminMeRes.data?.active_property_id === '55402', 'Admin profile reflects active property 55402');
  assert(adminMeRes.data?.email === 'admin@vibehouse.in', 'Admin profile email verified');

  // 12. Google OAuth Redirect Route
  console.log('\n--- 12. Google OAuth Redirect Route ---');
  const googleRes = await fetch(`${BASE_URL}/guest/auth/google?brand=TDS`, {
    redirect: 'manual',
  });
  assert(googleRes.status === 302, 'GET /guest/auth/google returns 302 redirect', googleRes.status);
  const location = googleRes.headers.get('location') || '';
  assert(location.includes('accounts.google.com'), 'Redirect target is accounts.google.com', location.substring(0, 60) + '...');
  assert(location.includes('client_id='), 'OAuth URL contains client_id');
  assert(location.includes('redirect_uri='), 'OAuth URL contains redirect_uri');

  console.log(`\n========================================`);
  console.log(`📊 Phase 2 Auth Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
