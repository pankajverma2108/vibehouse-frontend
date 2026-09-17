import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { SqsProducerService } from '../sqs/sqs-producer.service';
import { FlowLogService } from '../flow-log/flow-log.service';
import { istDateStr, toIstString } from '../common/utils/time.util';
import { BreakfastService } from './breakfast.service';
import { resolveTemplate } from '../wati/wati-templates';

/** One person to send an ordering link to: the booker, or a room's own occupant. */
interface InviteTarget {
  ezee_reservation_id: string;
  property_id: string;
  guest_id: string | null;
  phone: string | null;
  room_number: string | null;
}

/**
 * BreakfastInviteService — mints the per-stay Cx ordering link and delivers it over
 * WhatsApp. Two triggers:
 *   (a) admin button  POST /admin/breakfast/invites/send  (usable day one), and
 *   (b) a self-scheduled poll (OnApplicationBootstrap + setInterval) that fires each
 *       property's invites on its OWN schedule — `invite_anchor_min` ("schedule at") then
 *       every `invite_interval_hours` — configured per property in breakfast_config and
 *       gated by `invite_cron_enabled` under the global BREAKFAST_INVITE_CRON_ENABLED master.
 *
 * The token is a 256-bit opaque string; only its SHA-256 is stored (never the raw token).
 */
@Injectable()
export class BreakfastInviteService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BreakfastInviteService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sqs: SqsProducerService,
    private readonly flowLog: FlowLogService,
    private readonly breakfast: BreakfastService,
  ) {}

  private enabled(): boolean {
    return process.env.BREAKFAST_ENABLED !== 'false';
  }

  /** Global master for the scheduler — default ON; per-property invite_cron_enabled is the real gate. */
  private cronMasterOn(): boolean {
    return process.env.BREAKFAST_INVITE_CRON_ENABLED !== 'false';
  }

  private ttlDays(): number {
    const n = Number(process.env.BREAKFAST_LINK_TTL_DAYS);
    return Number.isFinite(n) && n > 0 ? n : 30; // whole-stay backstop
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * The property's ordering cut-off as guest-facing IST wall-clock ("7:00 AM") for the
   * invite template's `freeze_time` param. `breakfast_config.order_freeze_hour` is an
   * INTEGER hour (0-23), so it can't be sent verbatim — "open until 7" — and the hour is
   * per-property, so it must be resolved per send rather than hoisted to a constant.
   */
  private async freezeTimeLabel(propertyId: string): Promise<string> {
    const win = await this.breakfast.windowForProperty(propertyId);
    return this.formatIstHour(win.freeze_hour);
  }

  /** IST hour (0-23) → 12-hour wall-clock label. 0 → "12:00 AM", 12 → "12:00 PM". */
  private formatIstHour(hour: number): string {
    const h12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${h12}:00 ${hour < 12 ? 'AM' : 'PM'}`;
  }

  async onApplicationBootstrap(): Promise<void> {
    // Let SQS consumers spin up first, then poll every 5 min. Each tick fires any
    // property whose scheduled slot has come due since its last run.
    setTimeout(() => {
      setInterval(() => this.cronTick().catch(() => undefined), 5 * 60 * 1000);
    }, 8000);
  }

  private async cronTick(): Promise<void> {
    if (!this.enabled() || !this.cronMasterOn()) return;
    const now = new Date();
    const configs = await this.prisma.breakfast_config.findMany({
      where: { is_enabled: true, invite_cron_enabled: true },
      select: {
        property_id: true,
        invite_anchor_min: true,
        invite_interval_hours: true,
        last_invite_run_at: true,
      },
    });
    for (const c of configs) {
      const { lastDue } = BreakfastService.scheduleInstants(now, c.invite_anchor_min, c.invite_interval_hours);

      // First-ever tick for this property (cursor never set): seed the cursor to the
      // current due instant WITHOUT sending. This prevents a "catch-up" fire for a stale
      // past instant the moment breakfast is enabled — the scheduler starts firing from
      // the NEXT instant; day-one delivery is the manual "Send now" button.
      if (!c.last_invite_run_at) {
        await this.prisma.breakfast_config.updateMany({
          where: { property_id: c.property_id, last_invite_run_at: null },
          data: { last_invite_run_at: lastDue },
        });
        continue;
      }

      // Already fired this (or a later) instant? Skip.
      if (c.last_invite_run_at.getTime() >= lastDue.getTime()) continue;

      // Atomic claim (compare-and-swap on the observed cursor): only the tick that flips
      // last_invite_run_at from its read value to lastDue wins — a concurrent tick or a
      // second ECS task sees count===0 and backs off. Storing lastDue (NOT now) also makes
      // the guard idempotent across the anchor boundary, so a tick just before and just
      // after the anchor can't both fire (the earlier bug: two invites ~5 min apart).
      const claim = await this.prisma.breakfast_config.updateMany({
        where: { property_id: c.property_id, last_invite_run_at: c.last_invite_run_at },
        data: { last_invite_run_at: lastDue },
      });
      if (claim.count !== 1) continue; // lost the race to another tick/task

      const r = await this.sendForProperty(c.property_id).catch((e) => {
        this.logger.warn(`scheduled invites failed for ${c.property_id}: ${(e as Error).message}`);
        return { sent: 0 };
      });
      this.logger.log(
        `Scheduled breakfast invites: property ${c.property_id} sent ${r.sent} (slot ${toIstString(lastDue)})`,
      );
    }
  }

  /** Send invites for every property whose breakfast toggle is ON. */
  async sendForAllProperties(): Promise<{ properties: number; sent: number }> {
    const props = await this.prisma.breakfast_config.findMany({
      where: { is_enabled: true },
      select: { property_id: true },
    });
    let sent = 0;
    for (const p of props) {
      const r = await this.sendForProperty(p.property_id);
      sent += r.sent;
    }
    return { properties: props.length, sent };
  }

  /**
   * Send the ordering link to every eligible CHECKED_IN booking at a property —
   * eligible = active, checked-in, and staying past today (so they get a breakfast).
   * Returns how many invites were enqueued.
   */
  async sendForProperty(propertyId: string): Promise<{ sent: number }> {
    if (!this.enabled()) return { sent: 0 };
    const cfg = await this.prisma.breakfast_config.findUnique({
      where: { property_id: propertyId },
      select: { is_enabled: true },
    });
    if (!cfg?.is_enabled) return { sent: 0 }; // breakfast toggled off for this property
    const today = this.startOfIstToday();
    const bookings = await this.prisma.ezee_booking_cache.findMany({
      where: {
        property_id: propertyId,
        is_active: true,
        status: 'CHECKED_IN',
        OR: [{ checkout_date: null }, { checkout_date: { gt: today } }],
      },
      select: {
        ezee_reservation_id: true,
        property_id: true,
        guest_id: true,
        booker_phone: true,
        room_number: true,
        ezee_room_guests_json: true,
      },
      orderBy: { room_number: 'asc' },
    });

    // One link per PERSON, deduped by phone.
    //
    // The booker gets a link that covers every room they hold. But on a multi-room booking the
    // other rooms' occupants are different people with their own numbers (eZee carries them
    // per BookingTran) — keying invites off the booking alone meant only the booker was ever
    // messaged, and the guest in room 2 never got a link at all.
    const seen = new Set<string>();
    const targets: InviteTarget[] = [];
    for (const b of bookings) {
      const bookerKey = this.normalizePhone(b.booker_phone);
      if (!bookerKey || !seen.has(bookerKey)) {
        if (bookerKey) seen.add(bookerKey);
        targets.push({
          ezee_reservation_id: b.ezee_reservation_id,
          property_id: b.property_id,
          guest_id: b.guest_id,
          phone: b.booker_phone,
          room_number: b.room_number,
        });
      }
      for (const rg of this.roomOccupants(b.ezee_room_guests_json)) {
        const key = this.normalizePhone(rg.phone);
        if (!key || seen.has(key)) continue; // no number of their own, or already invited
        seen.add(key);
        targets.push({
          ezee_reservation_id: b.ezee_reservation_id,
          property_id: b.property_id,
          guest_id: rg.guest_id ?? b.guest_id,
          phone: rg.phone,
          room_number: rg.room_number ?? b.room_number,
        });
      }
    }

    let sent = 0;
    for (const t of targets) {
      const ok = await this.issueForBooking(t).catch((e) => {
        this.logger.warn(`invite failed for ${t.ezee_reservation_id}: ${(e as Error).message}`);
        return false;
      });
      if (ok) sent += 1;
    }
    return { sent };
  }

  /** The per-BookingTran occupants eZee gave us for a reservation (empty for single-room rows). */
  private roomOccupants(
    json: unknown,
  ): { room_number: string | null; phone: string | null; guest_id: string | null }[] {
    if (!Array.isArray(json)) return [];
    return (json as Record<string, unknown>[])
      .filter((r) => r && typeof r === 'object')
      .map((r) => ({
        room_number: (r.room_number as string) ?? null,
        phone: (r.phone as string) ?? null,
        guest_id: (r.guest_id as string) ?? null,
      }));
  }

  /** Last 10 digits of a phone (the booker-phone match key), or null if not usable. */
  private normalizePhone(phone: string | null): string | null {
    const digits = (phone ?? '').replace(/\D/g, '');
    return digits.length >= 10 ? digits.slice(-10) : null;
  }

  private startOfIstToday(): Date {
    // Midnight UTC of the current IST calendar date — a safe "today" boundary for a
    // @db.Date column comparison.
    return new Date(`${istDateStr()}T00:00:00.000Z`);
  }

  /** Mint a token for one person on a booking and enqueue the WATI invite. */
  async issueForBooking(booking: InviteTarget): Promise<boolean> {
    if (!this.enabled()) return false;

    const brand = await this.brandOf(booking.property_id);

    // Resolve a reachable phone + guest name.
    let phone = booking.phone ?? null;
    let guestName = 'Guest';
    if (booking.guest_id) {
      const g = await this.prisma.guests.findUnique({
        where: { id: booking.guest_id },
        select: { name: true, phone: true },
      });
      if (g?.name) guestName = g.name.split(' ')[0] || g.name;
      phone = phone ?? g?.phone ?? null;
    }
    if (!phone) {
      this.logger.warn(`no phone for booking ${booking.ezee_reservation_id} — invite skipped`);
      return false;
    }

    // Mint a fresh token per send. Only the SHA-256 is stored, so a prior token's raw
    // value can't be recovered to re-send — every send issues a new one. All of a stay's
    // tokens resolve to the same booking and die together at checkout (live-gated), so
    // multiple live tokens are harmless.
    const now = new Date();
    const rawToken = randomBytes(32).toString('hex'); // 256-bit, URL-safe hex
    const expires = new Date(now.getTime() + this.ttlDays() * 24 * 60 * 60_000);
    await this.prisma.breakfast_access_token.create({
      data: {
        id: uuidv4(),
        ezee_reservation_id: booking.ezee_reservation_id,
        guest_id: booking.guest_id,
        property_id: booking.property_id,
        brand,
        token_hash: this.hash(rawToken),
        expires_at: expires,
      },
    });

    await this.sqs.sendNotifyGuest({
      guest_id: booking.guest_id ?? '',
      guest_phone: phone,
      brand,
      template: resolveTemplate(brand, 'BREAKFAST_INVITE'),
      variables: {
        guest_name: guestName,
        room_no: booking.room_number ?? 'your room',
        freeze_time: await this.freezeTimeLabel(booking.property_id),
        '1': rawToken, // dynamic URL-button suffix → <brand-domain>/breakfast/<token>
      },
    });

    await this.flowLog.log({
      trace_id: booking.ezee_reservation_id,
      brand,
      module: 'BREAKFAST_INVITE',
      output: `breakfast link queued → ${phone} (room ${booking.room_number ?? 'NA'})`,
    });
    return true;
  }

  private async brandOf(propertyId: string): Promise<string> {
    const p = await this.prisma.properties.findUnique({
      where: { id: propertyId },
      select: { brand: true },
    });
    return p?.brand ?? 'TDS';
  }

  /** Revoke a stay's link (e.g. on early checkout). */
  async revokeForBooking(eri: string): Promise<void> {
    await this.prisma.breakfast_access_token.updateMany({
      where: { ezee_reservation_id: eri, revoked_at: null },
      data: { revoked_at: new Date() },
    });
    await this.flowLog.log({
      trace_id: eri,
      module: 'BREAKFAST_INVITE',
      output: `breakfast link revoked (${toIstString(new Date())})`,
    });
  }
}
