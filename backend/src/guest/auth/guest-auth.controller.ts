import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Query,
  UseGuards,
  Req,
  Res,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { GuestAuthService } from './guest-auth.service';
import { GuestSignupDto } from './dto/signup.dto';
import { GuestLoginDto } from './dto/login.dto';
import { SendOtpDto, VerifyOtpDto, ForgotPasswordDto, ResetPasswordDto, VerifyTwoFaDto, ToggleTwoFaDto } from './dto/otp.dto';
import { UpdateGuestProfileDto } from './dto/update-profile.dto';
import { GuestJwtGuard } from '../../common/guards/guest-jwt.guard';
import { CurrentGuest } from '../../common/decorators/current-guest.decorator';
import type { GuestJwtPayload } from '../../common/guards/guest-jwt.strategy';
import type { GoogleOAuthUser } from './google.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import type { Brand } from '../../common/property-resolver';
import { ALL_BRANDS, resolveBrandFromRequest } from '../../common/property-resolver';

/**
 * Custom guard for Google OAuth callback.
 *
 * NestJS's default AuthGuard throws UnauthorizedException when passport
 * fails (canActivate returns false if handleRequest returns falsy).
 * We override handleRequest to return a sentinel { failed: true } object
 * on error, so canActivate returns true and the handler gets a chance
 * to redirect the user to the frontend error page instead of 403/500.
 */
class GoogleOAuthGuard extends AuthGuard('google') {
  handleRequest(err: any, user: any, _info: any) {
    if (err || !user) {
      // Return a truthy sentinel so canActivate doesn't throw 403.
      // The handler checks for .failed to redirect to error page.
      return { failed: true, error: err?.message || 'No user returned' };
    }
    return user;
  }
}

// ─── OAuth state + redirect helpers ─────────────────────────────────────────

/**
 * State payload that round-trips through Google: brand + originating host.
 * Kept short (Google's `state` param has a ~500-char practical limit).
 */
interface OAuthState {
  b: Brand;       // brand
  h?: string;     // originating host (must be in OAUTH_REDIRECT_HOST_ALLOWLIST)
}

/**
 * Hosts allowed as post-OAuth redirect targets. Restricting this to a known
 * allowlist prevents open-redirect abuse — a request with a malicious
 * X-Forwarded-Host is ignored and the flow falls back to the per-brand DB
 * override (legacy behavior).
 *
 * Keep in sync with the CORS allowlist in src/main.ts.
 */
const OAUTH_REDIRECT_HOST_ALLOWLIST = new Set<string>([
  'www.thedailysocial.co.in',
  'thedailysocial.co.in',
  'www.buteak.in',
  'buteak.in',
  'dev.buteak.in',
  'www.dev.buteak.in',
  'localhost:3000',
  'localhost:3001',
  'localhost:3005',
  '127.0.0.1:3000',
  '127.0.0.1:3005',
]);

function isAllowedOAuthHost(host: string | undefined | null): boolean {
  if (!host) return false;
  const lower = host.toLowerCase();
  if (OAUTH_REDIRECT_HOST_ALLOWLIST.has(lower)) return true;
  return /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(lower);
}

/**
 * For an OAuth init request, returns the host the user was BROWSING FROM,
 * not the host the request is going TO. Tries, in order:
 *
 *   1. Explicit `return_to` query param — full URL; we extract its host.
 *      FE controls this, so 100% reliable when present. Recommended.
 *   2. `Referer` header — set automatically by browsers on page navigation.
 *      For cross-origin navigation (e.g., dev.buteak.in -> api.thedailysocial.co.in),
 *      modern browsers default to `strict-origin-when-cross-origin` which sends
 *      the full origin URL — host is recoverable. Some privacy modes / strict
 *      referrer policies strip this; that's why option 1 exists as override.
 *   3. `X-Forwarded-Host` (then `Host`) — for OAuth init this is the BACKEND
 *      host (api.thedailysocial.co.in), not what we want, but kept as a
 *      last-resort fallback for non-OAuth paths that may call this helper.
 *
 * Returns `null` if nothing usable found.
 */
function getOriginatingHost(req: Request, explicitReturnTo?: string): string | null {
  if (explicitReturnTo) {
    try {
      return new URL(explicitReturnTo).host;
    } catch {
      // malformed URL — ignore, fall through
    }
  }

  const referer = req.get('Referer') || req.get('Referrer');
  if (referer) {
    try {
      return new URL(referer).host;
    } catch {
      // malformed Referer (rare) — ignore, fall through
    }
  }

  const xfh = (req.get('X-Forwarded-Host') as string | undefined)?.split(',')[0].trim();
  return xfh || (req.get('Host') as string | undefined) || null;
}

/**
 * Parse the OAuth state param. Accepts both the new JSON format
 * (`{"b":"BUTEAK","h":"dev.buteak.in"}`) and the legacy bare-brand string
 * ("BUTEAK"). Anything we can't validate returns nulls so the caller falls
 * back to the per-brand DB override.
 */
function parseOAuthState(raw: unknown): { brand: Brand | null; host: string | null } {
  if (typeof raw !== 'string' || raw.length === 0) {
    return { brand: null, host: null };
  }

  // New JSON format
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw) as Partial<OAuthState>;
      const brand =
        parsed.b === 'BUTEAK' || parsed.b === 'TDS' ? parsed.b : null;
      const host =
        typeof parsed.h === 'string' &&
        isAllowedOAuthHost(parsed.h)
          ? parsed.h
          : null;
      return { brand, host };
    } catch {
      // Fall through to legacy parser
    }
  }

  // Legacy: bare brand string
  const upper = raw.toUpperCase();
  if (upper === 'BUTEAK' || upper === 'TDS') {
    return { brand: upper as Brand, host: null };
  }
  return { brand: null, host: null };
}

/**
 * Build a fully-qualified origin URL for a host. Localhost / 127.* use http,
 * everything else uses https. Trailing slashes are stripped to match the
 * shape produced by resolveOAuthRedirectUrl.
 */
function buildOriginUrl(host: string): string {
  const lower = host.toLowerCase();
  const proto = lower.startsWith('localhost') || lower.startsWith('127.') ? 'http' : 'https';
  return `${proto}://${host}`.replace(/\/+$/, '');
}

@Controller('guest/auth')
export class GuestAuthController {
  private readonly logger = new Logger(GuestAuthController.name);

  constructor(
    private readonly guestAuthService: GuestAuthService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── EMAIL / PASSWORD ──────────────────────────────────────────────────────

  @Post('signup')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  signup(@Body() dto: GuestSignupDto, @Req() req: Request) {
    return this.guestAuthService.signup(dto, resolveBrandFromRequest(req));
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body() dto: GuestLoginDto, @Req() req: Request) {
    return this.guestAuthService.login(dto, resolveBrandFromRequest(req));
  }

  @Get('me')
  @UseGuards(GuestJwtGuard)
  getMe(@CurrentGuest() guest: GuestJwtPayload) {
    return this.guestAuthService.getMe(guest.guest_id);
  }

  @Patch('me')
  @UseGuards(GuestJwtGuard)
  updateMe(
    @CurrentGuest() guest: GuestJwtPayload,
    @Body() dto: UpdateGuestProfileDto,
  ) {
    return this.guestAuthService.updateProfile(guest.guest_id, dto);
  }

  // ─── EMAIL OTP ─────────────────────────────────────────────────────────────

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  sendOtp(@Body() dto: SendOtpDto, @Req() req: Request) {
    return this.guestAuthService.sendOtp(dto.email, resolveBrandFromRequest(req));
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verifyOtp(@Body() dto: VerifyOtpDto, @Req() req: Request) {
    return this.guestAuthService.verifyOtp(dto.email, dto.otp, resolveBrandFromRequest(req));
  }

  // ─── PASSWORD RESET ────────────────────────────────────────────────────────

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    return this.guestAuthService.forgotPassword(dto.email, resolveBrandFromRequest(req));
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    return this.guestAuthService.resetPassword(dto.email, dto.otp, dto.newPassword, resolveBrandFromRequest(req));
  }

  // ─── TWO-FACTOR AUTH ───────────────────────────────────────────────────────

  @Post('verify-2fa')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verifyTwoFa(@Body() dto: VerifyTwoFaDto, @Req() req: Request) {
    return this.guestAuthService.verifyTwoFa(dto.email, dto.otp, resolveBrandFromRequest(req));
  }

  @Patch('2fa')
  @UseGuards(GuestJwtGuard)
  toggleTwoFa(@CurrentGuest() guest: GuestJwtPayload, @Body() dto: ToggleTwoFaDto) {
    return this.guestAuthService.toggleTwoFa(guest.guest_id, dto.enabled);
  }

  // ─── GOOGLE OAUTH ──────────────────────────────────────────────────────────

  /**
   * Step 1: Redirect browser to Google consent screen.
   *
   * The FE passes ?brand=TDS|BUTEAK so we can round-trip the brand through
   * Google's `state` param and stamp it on the JWT in the callback. Without
   * this, all OAuth signins default to TDS branding regardless of where
   * the user initiated from.
   *
   * We also capture the host the user was BROWSING FROM (via Referer header,
   * or an explicit `?return_to=<url>` param) and put it in state alongside
   * the brand. The callback uses that host to land the user back where they
   * started (e.g., dev.buteak.in OAuth lands on dev.buteak.in, not on
   * www.buteak.in). The host is checked against an allowlist before being
   * trusted, so this is not an open redirect.
   *
   * Why not the Host / X-Forwarded-Host headers? Those reflect the host the
   * browser is currently REQUESTING (api.thedailysocial.co.in for OAuth
   * init), not the host the user came from. The Referer header is the right
   * primitive for "where was the user before this navigation".
   */
  @Get('google')
  googleLogin(
    @Query('brand') brand: string | undefined,
    @Query('return_to') returnTo: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Validate brand (or fall back to host-resolved brand)
    const validBrand: Brand = ALL_BRANDS.includes(brand as Brand)
      ? (brand as Brand)
      : resolveBrandFromRequest(req);

    // Capture originating host for post-OAuth redirect (allowlist-checked)
    const originHost = getOriginatingHost(req, returnTo);
    const stateHost = isAllowedOAuthHost(originHost) ? originHost! : undefined;

    const stateObj: OAuthState = { b: validBrand };
    if (stateHost) stateObj.h = stateHost;
    const state = JSON.stringify(stateObj);

    this.logger.log(
      `[GoogleOAuth] Init: brand=${validBrand} returnTo=${returnTo ?? '<none>'} ` +
      `referer=${req.get('Referer') ?? '<none>'} stateHost=${stateHost ?? '<dropped>'}`,
    );

    // Build Passport's authenticate URL ourselves with state. We can't use
    // @UseGuards(AuthGuard('google')) because Nest's guard doesn't expose
    // state to us; we invoke passport directly.
    const passport = require('passport');
    return passport.authenticate('google', {
      scope: ['email', 'profile'],
      state,
    })(req, res);
  }

  /**
   * Step 2: Google redirects back here after consent.
   *
   * GoogleOAuthGuard ensures passport errors set req.user to a sentinel
   * { failed: true } instead of throwing. The handler checks this and
   * redirects to the error page. On success, it processes the login
   * and redirects to the success page with the JWT.
   */
  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    // Parse state. New format is JSON: {b: brand, h?: host}. Legacy format
    // (pre-host-roundtrip deploys) is a bare brand string ("BUTEAK"|"TDS").
    // Anything we can't validate falls back to host-derived brand and the
    // per-brand DB override.
    const { brand: stateBrand, host: stateHost } = parseOAuthState(req.query.state);
    const brand: Brand = stateBrand ?? resolveBrandFromRequest(req);

    // Prefer the host the user actually came from (already allowlisted in
    // /google step). Fall back to per-brand override in branding_config.
    const frontendUrl = stateHost
      ? buildOriginUrl(stateHost)
      : await this.resolveOAuthRedirectUrl(brand);

    this.logger.log(
      `[GoogleOAuth] Callback hit. brand=${brand} stateHost=${stateHost ?? '<none>'} redirectBase=${frontendUrl}`,
    );
    this.logger.log(`[GoogleOAuth] req.user = ${JSON.stringify(req.user)}`);

    const user = req.user as any;

    // Check if the guard returned our failure sentinel
    if (!user || user.failed) {
      this.logger.error(`[GoogleOAuth] Passport auth failed: ${user?.error || 'unknown'}`);
      return res.redirect(`${frontendUrl}/auth/google/error?reason=auth_failed`);
    }

    const googleUser = user as GoogleOAuthUser;

    try {
      this.logger.log(`[GoogleOAuth] Processing login for: ${googleUser.email}`);
      const result = await this.guestAuthService.googleLogin(googleUser, brand);

      const redirect =
        `${frontendUrl}/auth/google/success` +
        `?token=${result.access_token}` +
        `&name=${encodeURIComponent(result.guest.name)}`;

      this.logger.log(`[GoogleOAuth] Success — redirecting to ${redirect}`);
      return res.redirect(redirect);
    } catch (err) {
      this.logger.error(
        '[GoogleOAuth] Login processing failed:',
        err instanceof Error ? err.stack : err,
      );
      return res.redirect(`${frontendUrl}/auth/google/error?reason=login_failed`);
    }
  }

  /**
   * Fallback for resolving the post-OAuth redirect URL by brand. This is now
   * the SECONDARY path — the primary is to round-trip the viewer host through
   * OAuth state (see `googleLogin` + `parseOAuthState`). This path runs when:
   *   - the state was lost / corrupted, OR
   *   - the originating host wasn't in OAUTH_REDIRECT_HOST_ALLOWLIST, OR
   *   - the OAuth flow wasn't started via our /google endpoint (rare).
   *
   * Lookup order:
   *   1. properties.branding_config.oauth_redirect_url  (per-property override)
   *   2. process.env.FRONTEND_URL                       (env fallback)
   *   3. http://localhost:3000                          (dev fallback)
   *
   * The Buteak seed currently sets oauth_redirect_url=https://www.thedailysocial.co.in
   * from a May 2026 hack when Buteak FE was static. The host-roundtrip path
   * supersedes that — but the override is a safety net if state ever drops.
   */
  private async resolveOAuthRedirectUrl(brand: Brand): Promise<string> {
    try {
      const prop = await this.prisma.properties.findFirst({
        where: { brand },
        select: { branding_config: true },
      });
      const config = (prop?.branding_config as Record<string, unknown> | null) ?? {};
      const override = config.oauth_redirect_url as string | undefined;
      if (override) return override.replace(/\/+$/, '');
    } catch (err) {
      this.logger.warn(`[GoogleOAuth] Failed to resolve redirect for brand ${brand}: ${(err as Error).message}`);
    }
    return (process.env.FRONTEND_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
  }
}
