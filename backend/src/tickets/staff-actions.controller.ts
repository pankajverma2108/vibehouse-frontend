import { Controller, Get, Header, Query } from '@nestjs/common';
import { TicketsService } from './tickets.service';

/**
 * San Fierro (sanfierroheist1) — staff WhatsApp action endpoints.
 *
 * Targets of the dynamic URL buttons on the WATI staff template
 * (service_staff_request_template_v2):
 *   Acknowledge   → GET /tickets/staff/acknowledge?jobId={{1}}
 *   Mark Completed→ GET /tickets/staff/complete?jobId={{1}}
 *
 * When a staff member taps the button, WhatsApp opens this URL in their browser;
 * we act on the ticket and return a tiny confirmation page. This is how staff
 * acknowledge/complete in Phase 1 WITHOUT an inbound WATI webhook.
 *
 * Public (no JWT) because it's opened from a phone browser. jobId is an opaque
 * UUID; a signed token can be added later to harden it.
 */
@Controller('tickets/staff')
export class StaffActionsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get('acknowledge')
  @Header('Content-Type', 'text/html')
  async acknowledge(@Query('jobId') jobId: string): Promise<string> {
    if (!jobId) return this.page('Missing job id', false);
    try {
      await this.tickets.acknowledge(jobId);
      return this.page('Acknowledged ✓ — thank you, the guest has been informed.', true);
    } catch {
      return this.page('Could not find this request (it may be closed).', false);
    }
  }

  @Get('complete')
  @Header('Content-Type', 'text/html')
  async complete(@Query('jobId') jobId: string): Promise<string> {
    if (!jobId) return this.page('Missing job id', false);
    try {
      await this.tickets.complete(jobId);
      return this.page('Marked Completed ✓ — thank you!', true);
    } catch {
      return this.page('Could not find this request (it may be closed).', false);
    }
  }

  private page(msg: string, ok: boolean): string {
    const color = ok ? '#1a7f37' : '#b42318';
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Service Request</title></head><body style="font-family:system-ui,sans-serif;display:flex;min-height:90vh;align-items:center;justify-content:center;text-align:center;padding:24px"><div><h2 style="color:${color}">${msg}</h2><p style="color:#666">You can close this window.</p></div></body></html>`;
  }
}
