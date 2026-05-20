# Google OAuth Callback 500 Incident (2026-03-30)

## Summary
Google sign-in reaches Google 2FA successfully, but fails at backend callback processing and gets stuck on:

- `https://vibehousebackend-production.up.railway.app/guest/auth/google/callback?...`

The backend callback returns HTTP `500`, so the flow never redirects back to frontend success route with token/session.

## User-Reported Symptoms
- Browser console error:
  - `GET /guest/auth/google/callback?... 500 (Internal Server Error)`
- User remains on backend callback URL after Google 2FA success.
- Additional console error:
  - `GET /favicon.ico 404` on backend domain.

## What Is Verified
### Frontend is deployed and callback route exists
- Frontend callback page responds correctly:
  - `GET https://extendbasedesignsections.vercel.app/auth/google/success?token=test -> 200`
- Local frontend callback code stores token and redirects home:
  - `app/auth/google/success/page.tsx`

### OAuth entry endpoint is alive
- Backend OAuth start endpoint responds with redirect to Google:
  - `GET /guest/auth/google -> 302`

### Backend callback processing fails with server error
- Direct probe with test code:
  - `GET /guest/auth/google/callback?code=debug-invalid-code -> 500`
  - Body: `{"statusCode":500,"message":"Internal server error"}`

## Ownership
This is a **backend OAuth callback handling issue**.

Reason:
- Frontend callback route is reachable and valid (`200`).
- Failure happens before frontend receives token, at backend callback exchange/upsert stage.

## Likely Backend Failure Points
In priority order:
1. Google token exchange failure in callback handler.
2. `GOOGLE_OAUTH_CLIENT_SECRET` or `GOOGLE_OAUTH_CLIENT_ID` invalid/mismatched.
3. `GOOGLE_OAUTH_CALLBACK_URL` mismatch between:
   - Google Cloud Console OAuth client config, and
   - Railway runtime env value.
4. Callback logic exception during user upsert/linking (DB constraint/null handling).
5. JWT signing or auth provider linking exception after successful Google exchange.
6. Missing/incorrect `FRONTEND_URL` causing redirect construction failure.

## Why User Gets Stuck on Backend URL
Expected flow:
1. Frontend opens `/guest/auth/google`
2. Google auth + 2FA
3. Backend callback exchanges code, upserts/links guest, creates JWT
4. Backend redirects to:
   - `FRONTEND_URL/auth/google/success?token=<jwt>&name=<name>`

Current flow breaks at step 3 (backend callback throws 500), so step 4 never occurs.

## About favicon 404
`/favicon.ico 404` on backend domain is non-blocking and unrelated to OAuth failure.

## Backend Debug Checklist (Railway)
1. Inspect logs for callback requests at incident time:
   - endpoint: `/guest/auth/google/callback`
   - include stack trace and root exception type.
2. Verify env vars in Railway (exact values, no trailing spaces):
   - `GOOGLE_OAUTH_CLIENT_ID`
   - `GOOGLE_OAUTH_CLIENT_SECRET`
   - `GOOGLE_OAUTH_CALLBACK_URL`
   - `FRONTEND_URL`
3. Verify Google Cloud OAuth client Authorized redirect URI includes exactly:
   - `https://vibehousebackend-production.up.railway.app/guest/auth/google/callback`
4. Add guarded error mapping in callback handler:
   - return actionable 4xx for OAuth exchange failures,
   - keep stack traces in server logs.
5. Confirm callback success path always executes final redirect to frontend success URL.
6. Re-test full login in an incognito session after backend fix.

## Suggested Short-Term Mitigation
If backend fix takes time, expose a temporary error redirect on callback failure:
- Redirect to frontend error page (example):
  - `https://extendbasedesignsections.vercel.app/?auth=google-error`
Instead of leaving user on backend JSON 500.

## Current Status
- Frontend callback route: healthy.
- Backend callback: failing with HTTP 500.
- OAuth completion in production: blocked by backend callback handler.
