# Google OAuth Callback 500 Error - Backend Debugging Guide

**Incident Date:** March 31, 2026  
**Affected Endpoint:** `POST https://vibehousebackend-production.up.railway.app/guest/auth/google/callback`  
**Error:** 500 Internal Server Error  
**Status:** Happening consistently on production

---

## Symptom

Users attempting to sign in via Google OAuth receive a **500 Internal Server Error** when Google redirects back to the backend callback handler.

**Error URL from browser:**
```
GET https://vibehousebackend-production.up.railway.app/guest/auth/google/callback?iss=https%3A%2F%2Faccounts.google.com&code=4%2F0Aci98E8c1RtrYs_GpZbcSZ1MYC8F7RRo9UO0Yni7ttNqmjtbscY22YumF_7NRdRb0OEl7Q&scope=email+profile+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile+openid+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email&authuser=0&prompt=none 500 (Internal Server Error)
```

**Frontend logs:**
```
sJ @ extendbasedesignsect…/0h4bq73pogmtb.js:1
(anonymous) @ extendbasedesignsect…/0h4bq73pogmtb.js:1
tD @ extendbasedesignsect…/0h4bq73pogmtb.js:1
```

---

## OAuth Flow Architecture

### What Should Happen (Happy Path)

1. **Frontend → Backend → Google** (Auth Request)
   - User clicks "Continue with Google"
   - Frontend redirects to: `https://vibehousebackend-production.up.railway.app/guest/auth/google`
   - Backend redirects user to Google's OAuth consent screen

2. **Google → Backend** (Callback)
   - User approves permissions
   - Google redirects to: `https://vibehousebackend-production.up.railway.app/guest/auth/google/callback?code=...&state=...`
   - Backend receives authorization code

3. **Backend → Google** (Token Exchange)
   - Backend exchanges `code` for `access_token`
   - Backend retrieves user profile from Google
   - Backend creates/updates guest record in database

4. **Backend → Frontend** (Success)
   - Backend creates session token
   - Backend redirects to: `https://<frontend-domain>/auth/google/success?token=...`
   - Frontend stores token and completes sign-in

### Where It's Failing

**Step 2 → Step 3 transition** — The callback handler is returning 500 when trying to exchange the auth code for tokens.

---

## Root Cause Checklist

### 1. Environment Variables Not Set (Most Common)

**Check Railway environment variables:**
- [ ] `GOOGLE_CLIENT_ID` — Must match your Google Cloud Console OAuth 2.0 Client ID
- [ ] `GOOGLE_CLIENT_SECRET` — Must match your Google Cloud Console Client Secret
- [ ] `GOOGLE_REDIRECT_URI` — Must be exactly `https://vibehousebackend-production.up.railway.app/guest/auth/google/callback`

**Verify in Railway:**
1. Open your backend service in Railway dashboard
2. Click **Settings** → **Variables**
3. Confirm all three GOOGLE_* vars are populated and not empty strings

**Common mistakes:**
- Copy-pasted extra spaces or newlines
- Wrong redirect URI (typo, missing `https://`, different domain)
- Using development client ID/secret in production

---

### 2. Callback Endpoint Missing or Misconfigured

**Check your backend code:**
- [ ] Route exists: `GET /guest/auth/google/callback` (or `POST`)
- [ ] It reads query params: `code`, `state`
- [ ] It validates `state` param matches the one from initial request
- [ ] Error handling is wrapped in try/catch

**Common implementation issues:**
- Forgetting to handle `state` validation (CSRF protection)
- Not reading the `code` from query string
- Incorrect HTTP method (e.g., POST when it should be GET)

---

### 3. Google Client Library or HTTP Errors

**Check backend logs for:**
- [ ] Network timeout when calling Google token endpoint
- [ ] SSL/TLS certificate validation errors
- [ ] JSON parsing errors from Google response
- [ ] HTTP library not installed or configured

**Common errors:**
```
net.http.timeout: dial timeout
certificate_verify_failed
invalid_json
missing_header: User-Agent
```

---

### 4. Database or Session Creation Failing

**Check backend logs for:**
- [ ] Database connection errors when creating guest record
- [ ] Constraint violations (duplicate email, etc.)
- [ ] Session/JWT signing errors
- [ ] Missing database tables

**Debug SQL:**
- Verify `guests` table exists and has required columns: `email`, `name`, `profile_photo_url`, etc.
- Check if unique constraint on `email` is causing duplicate insert errors

---

### 5. Redirect URI Mismatch

**The most insidious issue:**

In Google Cloud Console OAuth 2.0 config, the registered redirect URI must match exactly:

✅ **Correct:**
```
https://vibehousebackend-production.up.railway.app/guest/auth/google/callback
```

❌ **Wrong (will cause 500):**
```
https://vibehousebackend-production.up.railway.app/guest/auth/google/callback/
https://vibehousebackend-production.up.railway.app/guest/auth/google
http://vibehousebackend-production.up.railway.app/guest/auth/google/callback (missing https)
```

**To fix:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project → APIs & Services → Credentials
3. Click your OAuth 2.0 Client ID
4. Verify Authorized redirect URIs include exactly:
   - `https://vibehousebackend-production.up.railway.app/guest/auth/google/callback`

---

## Debugging Steps (In Order)

### Step 1: Enable Detailed Logging

Add logging to your callback handler:

```javascript
// Pseudocode (adapt to your framework)
app.get('/guest/auth/google/callback', (req, res) => {
  const { code, state } = req.query;
  
  console.log('=== Google OAuth Callback ===');
  console.log('Code:', code ? 'received' : 'MISSING');
  console.log('State:', state ? 'received' : 'MISSING');
  console.log('Client ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'MISSING');
  console.log('Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'MISSING');
  
  try {
    // exchange code for token
  } catch (err) {
    console.error('Token exchange failed:', err.message);
    console.error('Stack:', err.stack);
  }
});
```

### Step 2: Check Railway Logs

1. Open Railway → Backend Service → Logs
2. Trigger the error again (user clicks Google Sign-In)
3. Look for any of these clues:
   - `TypeError: Cannot read property 'access_token'` → Google response issue
   - `Error: invalid_grant` → Code expired or already used
   - `Error: ENOTFOUND` → Network/DNS issue
   - `Error: SELF_SIGNED_CERT_IN_CHAIN` → SSL/TLS issue

### Step 3: Verify Env Vars on Railway

```bash
# SSH into Railway container (if available) or check dashboard
echo $GOOGLE_CLIENT_ID
echo $GOOGLE_CLIENT_SECRET
echo $GOOGLE_REDIRECT_URI
```

### Step 4: Test Token Exchange Independently

Use `curl` to test if the issue is with Google integration or your handler:

```bash
curl -X POST https://oauth2.googleapis.com/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "code=TEST_CODE_HERE" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "redirect_uri=https://vibehousebackend-production.up.railway.app/guest/auth/google/callback" \
  -d "grant_type=authorization_code"
```

**Expected response:** `{ access_token: "...", token_type: "Bearer", ... }`  
**Error response:** `{ error: "invalid_grant" }` or descriptive error

### Step 5: Add State Validation

Ensure your callback handler validates the `state` parameter:

```javascript
// Pseudocode
if (req.query.state !== req.session.oauthState) {
  throw new Error('State mismatch: CSRF attack detected');
}
```

---

## Frontend Is Not the Issue

The frontend code is correctly configured:

1. ✅ `lib/guest-auth-api.ts` → `getGuestGoogleAuthUrl()` returns correct backend URL
2. ✅ `components/auth/guest-auth-modal.tsx` → Triggers redirect to backend
3. ✅ `app/auth/google/success/page.tsx` → Ready to receive success token
4. ✅ `app/auth/google/error/page.tsx` → Ready to display errors with reason codes

**No frontend changes needed** until backend callback is fixed.

---

## Next Steps for Backend Team

1. **Immediately:** Check Railway logs for the actual error stack trace
2. **Next:** Verify all 3 GOOGLE_* environment variables are set correctly
3. **Then:** Test token exchange independently with the `curl` command above
4. **Finally:** Add detailed logging and redeploy to production for tracing

Once the backend callback is working, frontend will automatically redirect users to the success page and complete sign-in.

---

## Contact / Questions

If error logs don't provide enough context, enable more verbose logging in:
- HTTP client library (axios, fetch, node-fetch)
- OAuth/JWT library
- Database query logger

Share the full error stack trace from Railway logs for faster diagnosis.
