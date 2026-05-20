# Google OAuth — Backend Status & Frontend Debug Guide

**Date:** March 31, 2026  
**Status:** ✅ Backend is FIXED and deployed. Error handling verified.

---

## Backend Verification (Production)

Tested directly via curl against the live Railway deployment:

### Test 1: OAuth Initiation
```
GET https://vibehousebackend-production.up.railway.app/guest/auth/google
→ 302 Redirect to https://accounts.google.com/o/oauth2/v2/auth?...
```
✅ Working — redirects to Google consent screen correctly.

### Test 2: Callback Error Handling (fake code)
```
GET https://vibehousebackend-production.up.railway.app/guest/auth/google/callback?code=test
→ 302 Redirect to https://extendbasedesignsections.vercel.app/auth/google/error?reason=auth_failed
```
✅ Working — invalid codes now redirect to frontend error page instead of 500.

### Test 3: Callback Success Path
When Google sends a valid code, the backend will:
1. Exchange code for Google access token
2. Fetch user profile (email, name, photo)
3. Create or link guest account in DB
4. Issue a JWT
5. Redirect to: `https://extendbasedesignsections.vercel.app/auth/google/success?token=<jwt>&name=<encoded_name>`

---

## ⚠️ CRITICAL: Frontend "Continue with Google" Implementation

The backend flow requires a **full browser redirect** (not a fetch/axios call).

### ✅ CORRECT Implementation
```tsx
const handleGoogleSignIn = () => {
  // Full page redirect — browser navigates away from the SPA
  window.location.href = 'https://vibehousebackend-production.up.railway.app/guest/auth/google';
};
```
Or:
```tsx
<a href="https://vibehousebackend-production.up.railway.app/guest/auth/google">
  Continue with Google
</a>
```

### ❌ WRONG (will always fail)
```tsx
// fetch/axios cannot follow OAuth redirects — Google blocks CORS on consent page
const response = await fetch('.../guest/auth/google');
```

---

## Frontend Debug Checklist

### Step 1: Verify the Google button triggers a full redirect
Open browser DevTools → Network tab → click "Continue with Google":

- ✅ **Correct:** Page navigates away to `accounts.google.com`
- ❌ **Wrong:** A `fetch` or `XMLHttpRequest` appears in the Network tab

### Step 2: Test manually in browser address bar
Paste this URL directly:
```
https://vibehousebackend-production.up.railway.app/guest/auth/google
```
- If it redirects to Google → backend is confirmed working
- After Google login, check where you end up:
  - `.../auth/google/success?token=...` → Full flow works ✅
  - `.../auth/google/error?reason=...` → Check the reason code
  - Stuck on backend URL → Should not happen with current code

### Step 3: Quick console test
Paste this in browser console on the frontend site:
```javascript
window.location.href = 'https://vibehousebackend-production.up.railway.app/guest/auth/google';
```
If this works but the "Continue with Google" button doesn't → the button is using fetch() instead of redirect.

### Step 4: Verify success page reads the token
After Google auth, backend redirects to:
```
https://extendbasedesignsections.vercel.app/auth/google/success?token=<jwt>&name=<name>
```
The success page must:
1. Read `token` from URL search params
2. Store it in localStorage/cookie
3. Redirect to home

### Step 5: Error page reason codes
The backend redirects to error page with two possible reasons:
- `?reason=auth_failed` — Google's auth code exchange failed
- `?reason=login_failed` — DB upsert or JWT creation failed

---

## Summary

| Component | Status |
|-----------|--------|
| Backend OAuth initiation | ✅ Working (302 to Google) |
| Backend callback error handling | ✅ Fixed (302 to error page, no more 500) |
| Backend callback success path | ✅ Ready (302 with token + name) |
| Backend env vars | ✅ Verified |
| Frontend Google button | ⚠️ **Must use `window.location.href`, NOT `fetch()`** |
| Frontend success page | ⚠️ Frontend team to verify token extraction |
| Frontend error page | ⚠️ Frontend team to verify reason handling |
