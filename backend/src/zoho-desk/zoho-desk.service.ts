import { Injectable, Logger } from '@nestjs/common';

/**
 * Zoho Desk client — the ticket record is the source of truth in Zoho Desk;
 * our zoho_ticket_ref row caches the bits the watchdog needs (status, deadlines).
 *
 * Auth: OAuth2 refresh-token grant. Creds (already present in .env):
 *   ZOHO_DESK_CLIENT_ID, ZOHO_DESK_CLIENT_SECRET, ZOHO_DESK_REFRESH_TOKEN, ZOHO_DESK_ORG_ID
 * Optional:
 *   ZOHO_DESK_ACCOUNTS_BASE  (default https://accounts.zoho.in)
 *   ZOHO_DESK_API_BASE       (default https://desk.zoho.in/api/v1)
 *   ZOHO_DESK_DEPARTMENT_ID  (fallback department until per-property mapping is added)
 *
 * Graceful degradation: if any cred is missing, every call logs and returns null
 * so the Phase-1 ticket/escalation flow still runs (the local zoho_ticket_ref is
 * authoritative for the watchdog; Zoho Desk mirroring is best-effort).
 */
@Injectable()
export class ZohoDeskService {
  private readonly logger = new Logger(ZohoDeskService.name);
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  private get accountsBase(): string {
    return (process.env.ZOHO_DESK_ACCOUNTS_BASE ?? 'https://accounts.zoho.in').replace(/\/$/, '');
  }
  private get apiBase(): string {
    return (process.env.ZOHO_DESK_API_BASE ?? 'https://desk.zoho.in/api/v1').replace(/\/$/, '');
  }

  private credsPresent(): boolean {
    return Boolean(
      process.env.ZOHO_DESK_CLIENT_ID &&
        process.env.ZOHO_DESK_CLIENT_SECRET &&
        process.env.ZOHO_DESK_REFRESH_TOKEN &&
        process.env.ZOHO_DESK_ORG_ID,
    );
  }

  /** Public: are Zoho Desk creds configured (used by the reverse-sync poller). */
  isConfigured(): boolean {
    return this.credsPresent();
  }

  /** Read a Desk ticket's current status (for Zoho→system reverse sync). */
  async getTicketStatus(zohoTicketId: string): Promise<string | null> {
    if (!this.credsPresent() || !this.isRealId(zohoTicketId)) return null;
    try {
      const res = await this.authedFetch(`/tickets/${zohoTicketId}`, { method: 'GET' });
      if (!res || !res.ok) return null;
      const data = (await res.json()) as { status?: string };
      return data.status ?? null;
    } catch (err) {
      this.logger.error(`Zoho Desk getTicketStatus error id=${zohoTicketId}: ${(err as Error).message}`);
      return null;
    }
  }

  private async getToken(): Promise<string | null> {
    if (!this.credsPresent()) return null;
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60_000) {
      return this.accessToken;
    }
    const params = new URLSearchParams({
      refresh_token: process.env.ZOHO_DESK_REFRESH_TOKEN as string,
      client_id: process.env.ZOHO_DESK_CLIENT_ID as string,
      client_secret: process.env.ZOHO_DESK_CLIENT_SECRET as string,
      grant_type: 'refresh_token',
    });
    try {
      const res = await fetch(`${this.accountsBase}/oauth/v2/token?${params.toString()}`, {
        method: 'POST',
      });
      const data = (await res.json()) as { access_token?: string; expires_in?: number };
      if (!data.access_token) {
        this.logger.error(`Zoho Desk token refresh returned no access_token: ${JSON.stringify(data).slice(0, 200)}`);
        return null;
      }
      this.accessToken = data.access_token;
      this.tokenExpiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;
      return this.accessToken;
    } catch (err) {
      this.logger.error(`Zoho Desk token refresh failed: ${(err as Error).message}`);
      return null;
    }
  }

  private async authedFetch(path: string, init: RequestInit): Promise<Response | null> {
    const token = await this.getToken();
    if (!token) return null;
    return fetch(`${this.apiBase}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        orgId: process.env.ZOHO_DESK_ORG_ID as string,
        Authorization: `Zoho-oauthtoken ${token}`,
        ...(init.headers ?? {}),
      },
    });
  }

  /**
   * Create a Desk ticket. Returns the Zoho ticket id, or null if creds are
   * missing / the call fails (caller keeps the local placeholder zoho_ticket_id).
   */
  async createTicket(input: {
    subject: string;
    description?: string;
    departmentId?: string;
    contactName?: string;
    contactPhone?: string | null;
    priority?: string;
    status?: string;
    customFields?: Record<string, string | number | boolean>;
  }): Promise<string | null> {
    const departmentId = input.departmentId ?? process.env.ZOHO_DESK_DEPARTMENT_ID;
    if (!this.credsPresent() || !departmentId) {
      this.logger.warn(
        `[SKIP] Zoho Desk not fully configured; would create ticket "${input.subject}"`,
      );
      return null;
    }
    try {
      const res = await this.authedFetch('/tickets', {
        method: 'POST',
        body: JSON.stringify({
          subject: input.subject,
          description: input.description ?? input.subject,
          departmentId,
          priority: input.priority ?? 'Medium',
          ...(input.status ? { status: input.status } : {}),
          contact: {
            lastName: input.contactName || 'Guest',
            phone: input.contactPhone ?? undefined,
          },
          ...(input.customFields ? { cf: input.customFields } : {}),
        }),
      });
      if (!res || !res.ok) {
        this.logger.error(`Zoho Desk createTicket failed (${res?.status ?? 'no-creds'})`);
        return null;
      }
      const data = (await res.json()) as { id?: string };
      return data.id ?? null;
    } catch (err) {
      this.logger.error(`Zoho Desk createTicket error: ${(err as Error).message}`);
      return null;
    }
  }

  /** Patch a Desk ticket (status, resolution, custom fields). Best-effort. */
  async updateTicket(
    zohoTicketId: string,
    fields: { status?: string; resolution?: string; customFields?: Record<string, string | number | boolean> },
  ): Promise<boolean> {
    if (!this.credsPresent() || !this.isRealId(zohoTicketId)) return false;
    try {
      const res = await this.authedFetch(`/tickets/${zohoTicketId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...(fields.status ? { status: fields.status } : {}),
          ...(fields.resolution ? { resolution: fields.resolution } : {}),
          ...(fields.customFields ? { cf: fields.customFields } : {}),
        }),
      });
      if (!res || !res.ok) {
        this.logger.error(`Zoho Desk updateTicket failed (${res?.status ?? 'no-creds'}) id=${zohoTicketId}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.error(`Zoho Desk updateTicket error: ${(err as Error).message}`);
      return false;
    }
  }

  /**
   * Post a comment on a Desk ticket → shows in the ticket's Activity/Comments feed.
   * We use PRIVATE comments (isPublic=false) so the internal escalation trail isn't
   * exposed to the contact. Best-effort.
   */
  async addComment(zohoTicketId: string, content: string, isPublic = false): Promise<boolean> {
    if (!this.credsPresent() || !this.isRealId(zohoTicketId)) return false;
    try {
      const res = await this.authedFetch(`/tickets/${zohoTicketId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ isPublic, content: content.slice(0, 3000) }),
      });
      if (!res || !res.ok) {
        this.logger.error(`Zoho Desk addComment failed (${res?.status ?? 'no-creds'}) id=${zohoTicketId}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.error(`Zoho Desk addComment error: ${(err as Error).message}`);
      return false;
    }
  }

  /**
   * Log a Time Entry (worklog) against a ticket → shows in the Time Entry tab.
   * `minutes` is the elapsed work time; Zoho stores duration as HH:MM. Best-effort.
   */
  async addTimeEntry(
    zohoTicketId: string,
    input: { minutes: number; note?: string; agentId?: string },
  ): Promise<boolean> {
    if (!this.credsPresent() || !this.isRealId(zohoTicketId)) return false;
    const mins = Math.max(1, Math.round(input.minutes));
    const hh = String(Math.floor(mins / 60)).padStart(2, '0');
    const mm = String(mins % 60).padStart(2, '0');
    try {
      const res = await this.authedFetch(`/tickets/${zohoTicketId}/timeEntry`, {
        method: 'POST',
        body: JSON.stringify({
          chargeType: 'Non-Billable',
          requestType: 'Support',
          executedTime: `${hh}:${mm}`,
          additionalCost: '0',
          ...(input.note ? { description: input.note.slice(0, 3000) } : {}),
          ...(input.agentId ? { ownerId: input.agentId } : {}),
        }),
      });
      if (!res || !res.ok) {
        this.logger.error(`Zoho Desk addTimeEntry failed (${res?.status ?? 'no-creds'}) id=${zohoTicketId}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.error(`Zoho Desk addTimeEntry error: ${(err as Error).message}`);
      return false;
    }
  }

  /** A real Zoho ticket id is all-digits; our pre-sync placeholder is "SVC-xxxxxxxx". */
  private isRealId(zohoTicketId: string | null | undefined): boolean {
    return !!zohoTicketId && /^\d+$/.test(zohoTicketId);
  }
}
