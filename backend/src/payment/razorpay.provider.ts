import { Injectable, Logger } from '@nestjs/common';
import Razorpay from 'razorpay';

/** Injection token retained for backwards-compat with PaymentService's existing
 *  `@Inject(RAZORPAY)`. Resolves to the `RazorpayFactory` instance. */
export const RAZORPAY = 'RAZORPAY';

export type Brand = 'TDS' | 'BUTEAK' | string;

/**
 * Resolves Razorpay credentials per-brand. Each brand maps to its own live
 * Razorpay account so revenue settles into the correct business bank account
 * and so the dashboards stay cleanly segregated.
 *
 * Env layout (all stored as SecureStrings under /tds/prod/ in SSM):
 *
 *   TDS (today still on test mode):
 *     RAZORPAY_TEST_API_KEY        — order-create + checkout-modal key
 *     RAZORPAY_TEST_API_SECRET     — orders.create signing
 *     RAZORPAY_WEBHOOK_SECRET      — webhook signature verification
 *
 *   BUTEAK (live as of 2026-06-05):
 *     RAZORPAY_BUTEAK_KEY          — rzp_live_…
 *     RAZORPAY_BUTEAK_SECRET
 *     RAZORPAY_BUTEAK_WEBHOOK_SECRET
 *
 * When a brand's vars are missing, we fall back to the TEST_* set so a misset
 * env doesn't take the whole payment surface down for that brand — the order
 * creation will still succeed against the test account and an obvious log
 * line tells ops what happened.
 */
@Injectable()
export class RazorpayFactory {
  private readonly logger = new Logger(RazorpayFactory.name);
  private readonly clients = new Map<string, Razorpay>();

  /** Razorpay client to use when creating orders for a property of this brand. */
  forBrand(brand: Brand): Razorpay {
    const key = (brand ?? 'TDS').toUpperCase();
    const cached = this.clients.get(key);
    if (cached) return cached;
    const creds = this.credsFor(key);
    const client = new Razorpay({
      key_id: creds.keyId,
      key_secret: creds.keySecret,
    });
    this.clients.set(key, client);
    return client;
  }

  /** Public Razorpay key (used in the checkout-modal config the FE opens). */
  publicKeyForBrand(brand: Brand): string {
    return this.credsFor((brand ?? 'TDS').toUpperCase()).keyId;
  }

  /** Webhook signature-verification secret for a brand. */
  webhookSecretForBrand(brand: Brand): string {
    const key = (brand ?? 'TDS').toUpperCase();
    if (key === 'BUTEAK') {
      const v = process.env.RAZORPAY_BUTEAK_WEBHOOK_SECRET;
      if (v && v.length > 0) return v;
      this.logger.warn(
        'RAZORPAY_BUTEAK_WEBHOOK_SECRET not set — falling back to RAZORPAY_WEBHOOK_SECRET for BUTEAK',
      );
    }
    return process.env.RAZORPAY_WEBHOOK_SECRET ?? '';
  }

  /** API secret for verifying payment signatures from the checkout modal. */
  apiSecretForBrand(brand: Brand): string {
    return this.credsFor((brand ?? 'TDS').toUpperCase()).keySecret;
  }

  /**
   * Detects whether the brand's configured key is for Razorpay test or live
   * mode by inspecting the `rzp_test_*` / `rzp_live_*` prefix. Stamped onto
   * every payments row at order creation so ops can filter test vs live
   * revenue side-by-side without grepping notes.
   */
  modeForBrand(brand: Brand): 'TEST' | 'LIVE' {
    const keyId = this.publicKeyForBrand(brand);
    return keyId.startsWith('rzp_live_') ? 'LIVE' : 'TEST';
  }

  /**
   * Every distinct webhook secret currently configured, across brands.
   * Used by the webhook handler to verify the inbound signature against
   * each candidate — Razorpay sends the signature alone (no brand hint),
   * so we try each. Safe: matching ANY valid secret requires forging an
   * HMAC over the body with that exact secret, which an attacker can't do
   * without first stealing it.
   */
  allWebhookSecrets(): string[] {
    const seen = new Set<string>();
    for (const v of [
      process.env.RAZORPAY_WEBHOOK_SECRET,
      process.env.RAZORPAY_BUTEAK_WEBHOOK_SECRET,
    ]) {
      if (v && v.length > 0) seen.add(v);
    }
    return Array.from(seen);
  }

  private credsFor(brand: string): { keyId: string; keySecret: string } {
    if (brand === 'BUTEAK') {
      const keyId = process.env.RAZORPAY_BUTEAK_KEY;
      const keySecret = process.env.RAZORPAY_BUTEAK_SECRET;
      if (keyId && keySecret) return { keyId, keySecret };
      this.logger.warn(
        'RAZORPAY_BUTEAK_KEY / _SECRET not set — falling back to RAZORPAY_TEST_API_* for BUTEAK (orders will hit the test account)',
      );
    }
    return {
      keyId: process.env.RAZORPAY_TEST_API_KEY!,
      keySecret: process.env.RAZORPAY_TEST_API_SECRET!,
    };
  }
}

/**
 * DI registration. Provides `RazorpayFactory` under the legacy `RAZORPAY`
 * token so PaymentService's existing `@Inject(RAZORPAY)` works unchanged —
 * it just receives the factory now instead of a singleton client.
 */
export const RazorpayProvider = {
  provide: RAZORPAY,
  useClass: RazorpayFactory,
};
