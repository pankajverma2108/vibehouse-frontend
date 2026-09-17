import { Controller, Get, Query, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { WaServiceService } from './wa-service.service';

/**
 * heist1.1 — "Try Again" target for the service_payment_failed template's
 * dynamic-URL button:  GET /wati/pay/retry?rid=<wa_service_request.id>
 *
 * Mints a fresh Razorpay payment link for a failed/expired WhatsApp paid request
 * and 302-redirects the guest's browser straight to it. Public (opened from a
 * phone browser), same posture as the staff URL-button endpoints; `rid` is an
 * opaque UUID. Never redirects unless retry is valid — otherwise shows a small
 * page.
 */
@Controller('wati/pay')
@SkipThrottle()
export class WaPayController {
  constructor(private readonly wa: WaServiceService) {}

  @Get('retry')
  async retry(@Query('rid') rid: string, @Res() res: Response) {
    if (!rid) return res.status(400).send(this.page('Invalid link.'));

    const r = await this.wa.retryPayment(rid);
    if (r.url) {
      return res.redirect(302, r.url);
    }

    const msg =
      r.reason === 'already_paid'
        ? 'This request is already paid. ✅ Our team is on it.'
        : 'Sorry, we couldn’t reopen this payment. Please message us on WhatsApp and reception will help.';
    return res.status(200).send(this.page(msg));
  }

  private page(msg: string): string {
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Payment</title></head><body style="font-family:system-ui,sans-serif;display:flex;min-height:90vh;align-items:center;justify-content:center;text-align:center;padding:24px"><div><h2 style="color:#1a1a1a">${msg}</h2><p style="color:#666">You can close this window.</p></div></body></html>`;
  }
}
