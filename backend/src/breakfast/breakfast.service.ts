import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import type { AdminJwtPayload } from '../common/guards/admin-jwt.strategy';
import {
  istParts,
  addDaysToDateStr,
  istWallclockToUtc,
  toIstString,
} from '../common/utils/time.util';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { CreateSlotDto } from './dto/create-slot.dto';
import { UpdateSlotDto } from './dto/update-slot.dto';
import { SubmitBreakfastOrderDto } from './dto/submit-breakfast-order.dto';
import { AdminPlaceOrderDto } from './dto/admin-place-order.dto';

export type LinkState = 'valid' | 'checked_out' | 'revoked' | 'not_found' | 'disabled';
export type WindowState = 'open' | 'frozen';

export interface OrderWindow {
  state: WindowState;
  /** The breakfast date this page is acting on (the next orderable service). YYYY-MM-DD. */
  service_date: string;
  /** When the ordering window for `service_date` opens / closes (IST wall-clock strings). */
  opens_at_ist: string;
  closes_at_ist: string;
  /** The configured IST hours (0-23) so the FE can render its own copy, e.g. "closes 7:00 AM". */
  open_hour: number;
  freeze_hour: number;
}

export interface MenuItemView {
  id: string;
  name: string;
  description: string | null;
  category: string;
  is_veg: boolean;
  sort_order: number;
}

export interface SlotView {
  id: string;
  slot_number: number;
  label: string;
  start_min: number;
  end_min: number;
  capacity: number;
  /** Plates already PLACED in this slot for the service_date (capacity is counted in plates). */
  booked: number;
  remaining: number;
  sort_order: number;
}

/** One plate = one adult's breakfast: its own delivery slot + dishes. */
export interface PlateView {
  plate_number: number;
  slot_id: string;
  slot_label: string | null;
  status: string;
  special_requests: string | null;
  items: { menu_item_id: string; name: string; qty: number }[];
}

/** A room within the booker's stay — its plate cap (eZee adults) + current plates. */
export interface RoomView {
  ezee_reservation_id: string;
  room_number: string | null;
  /** Max plates allowed for this room = its eZee adult count. */
  max_plates: number;
  /** Room order status for the service_date: PLACED | SKIPPED | null (nothing yet). */
  order_status: string | null;
  plates: PlateView[];
}

/** A pickable checked-in booking for the admin "place order for guest" flow. */
export interface AdminBookingRosterRow {
  ezee_reservation_id: string;
  room_number: string | null;
  guest_name: string | null;
  booker_phone: string | null;
  no_of_adults: number | null;
  /** Max plates the admin can place for this room = its eZee adult count. */
  max_plates: number;
  checkout_date: string | null;
  /** false when the guest checks out before `service_date` (place-order would be rejected). */
  eligible: boolean;
  /** Current order for `service_date`: PLACED | SKIPPED | null (nothing yet). */
  order_status: string | null;
  plate_count: number;
  /** Admin-made test booking — shown on the roster so ops can tell it from a real guest. */
  is_test: boolean;
}

/** Admin board row: one room order for a service date, with its plates. */
export interface AdminRoomOrderView {
  order_id: string;
  ezee_reservation_id: string;
  /** The room key within the reservation (eZee SubBookingId), = ezee_reservation_id when single-room. */
  sub_booking_id: string;
  room_number: string | null;
  service_date: string;
  status: string;
  placed_via: string;
  plate_count: number;
  plates: PlateView[];
  updated_at: string;
}

export interface BreakfastPageView {
  link_state: LinkState;
  window?: OrderWindow;
  brand?: string;
  /** Total breakfast-eligible adults across the booker's rooms (= sum of room caps). */
  total_adults?: number;
  rooms?: RoomView[];
  menu?: MenuItemView[];
  slots?: SlotView[];
}

/** A raw cache row (one eZee RESERVATION — which may hold several rooms). */
interface CacheRow {
  ezee_reservation_id: string;
  room_number: string | null;
  no_of_adults: number | null;
  no_of_guests: number | null;
  guest_id: string | null;
  checkout_date: Date | null;
  ezee_room_guests_json: unknown;
}

/**
 * ONE ROOM the guest can order for. A multi-room eZee booking is a single cache row with one
 * BookingTran per room, so a room is (reservation + sub-booking), never the reservation alone —
 * keying off the reservation gave every room in a booking the same room number and a single
 * shared order, which locked all but the first room out of breakfast entirely.
 */
interface SiblingRoom {
  /** The cache row / eZee reservation this room belongs to. */
  ezee_reservation_id: string;
  /** The room key: eZee's SubBookingId ("109-2"), or the reservation id when there is none. */
  sub_booking_id: string;
  room_number: string | null;
  /** Plate cap for THIS room (its own eZee adult count). */
  cap: number;
  guest_id: string | null;
  /** The occupant eZee named on THIS room (null when we only know the booker). */
  guest_name: string | null;
  checkout_date: Date | null;
}

/** A validated, normalised plate ready to persist. */
interface NormPlate {
  slot_id: string;
  items: { menu_item_id: string; qty: number }[];
  special_requests: string | null;
}

/** A validated room-order intent ready to persist. */
interface RoomIntent {
  eri: string;
  subId: string;
  guestId: string | null;
  roomNumber: string | null;
  cap: number;
  action: 'ORDER' | 'SKIP';
  plates: NormPlate[];
}

// The breakfast-invite WATI template is resolved per-brand via
// resolveTemplate(brand, 'BREAKFAST_INVITE') (src/wati/wati-templates.ts). It must
// take the ordering cut-off as a `freeze_time` param (the copy follows
// breakfast_config.order_freeze_hour), so each brand's registered template must carry
// freeze_time — the four params BreakfastInviteService sends, or WATI rejects the send.

/** Standard include for reading an order with its plates → slots → items. */
const ORDER_WITH_PLATES = {
  breakfast_plates: {
    orderBy: { plate_number: 'asc' as const },
    include: {
      breakfast_slot: true,
      breakfast_order_items: { include: { breakfast_menu_item: true } },
    },
  },
} as const;

/**
 * BreakfastService — the shared core for both the admin catalog/tracking APIs and the
 * token-protected Cx ordering page (BRD docs/plans/breakfast_brd.md, Phase 1).
 *
 * The Cx link is a per-stay opaque token (only its SHA-256 is stored). Its validity is
 * derived LIVE from the booking's CHECKED_IN state in ezee_booking_cache (eZee = source of
 * truth) — the link opens after check-in and dies at checkout. One link covers ALL the
 * booker's rooms (resolved by shared booker_phone): the guest picks a room, adds up to that
 * room's eZee adult count in PLATES, and each plate gets its OWN delivery slot + dishes.
 * Ordering is gated to an IST time window (default open 11:00 → 07:00), computed server-side.
 */
@Injectable()
export class BreakfastService {
  private readonly logger = new Logger(BreakfastService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Config ──────────────────────────────────────────────────────────────────

  /** Env-default IST hour (0-23) the ordering window OPENS. Per-property config overrides it. */
  private envOpenHour(): number {
    const n = Number(process.env.BREAKFAST_ORDER_OPEN_HOUR);
    return Number.isInteger(n) && n >= 0 && n <= 23 ? n : 11;
  }

  /** Env-default IST hour (0-23) the window FREEZES. Per-property config overrides it. */
  private envFreezeHour(): number {
    const n = Number(process.env.BREAKFAST_FREEZE_HOUR);
    return Number.isInteger(n) && n >= 0 && n <= 23 ? n : 7;
  }

  private validHour(n: number | null | undefined): number | null {
    return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 23 ? n : null;
  }

  /**
   * The effective ordering window for a property. The admin-set `breakfast_config` hours are the
   * source of truth; if a config row is missing (breakfast would be disabled anyway) we fall back
   * to the BREAKFAST_ORDER_OPEN_HOUR / BREAKFAST_FREEZE_HOUR env defaults.
   */
  async windowForProperty(propertyId: string, now: Date = new Date()): Promise<OrderWindow> {
    const cfg = await this.prisma.breakfast_config.findUnique({
      where: { property_id: propertyId },
      select: { order_open_hour: true, order_freeze_hour: true },
    });
    const open = this.validHour(cfg?.order_open_hour) ?? this.envOpenHour();
    const freeze = this.validHour(cfg?.order_freeze_hour) ?? this.envFreezeHour();
    return this.computeWindow(now, open, freeze);
  }

  private defaultCapacity(): number {
    const n = Number(process.env.BREAKFAST_DEFAULT_SLOT_CAPACITY);
    return Number.isInteger(n) && n > 0 ? n : 12;
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Whether a property currently offers breakfast (admin-controlled). Absent config row
   * ⇒ disabled (opt-in). The global BREAKFAST_ENABLED env is a master kill-switch above
   * this per-property toggle.
   */
  async isEnabled(propertyId: string): Promise<boolean> {
    if (process.env.BREAKFAST_ENABLED === 'false') return false;
    const cfg = await this.prisma.breakfast_config.findUnique({
      where: { property_id: propertyId },
      select: { is_enabled: true },
    });
    return cfg?.is_enabled ?? false;
  }

  private toDate(dateStr: string): Date {
    return new Date(`${dateStr}T00:00:00.000Z`);
  }

  private fromDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private pad2(n: number): string {
    return String(n).padStart(2, '0');
  }

  /** Reservation-level head count — the only figure we have for a room eZee gave no snapshot for. */
  private cacheCap(row: { no_of_adults: number | null; no_of_guests: number | null }): number {
    const n = row.no_of_adults ?? row.no_of_guests ?? 1;
    return n > 0 ? n : 0;
  }

  /**
   * Expand one cache row (an eZee RESERVATION) into the rooms a guest can order for.
   *
   * `ezee_room_guests_json` is the per-BookingTran snapshot — the only place the 2nd..nth room of
   * a multi-room booking exists (the row itself carries just BookingTran[0]'s room number and one
   * occupancy figure). No snapshot ⇒ legacy/single-room booking ⇒ the row IS the room, keyed on
   * the reservation id, exactly as before.
   */
  private expandRooms(row: CacheRow): SiblingRoom[] {
    const snapshot = Array.isArray(row.ezee_room_guests_json)
      ? (row.ezee_room_guests_json as Record<string, unknown>[]).filter(
          (r) => r && (r.room_number || r.sub_id),
        )
      : [];

    if (snapshot.length === 0) {
      return [
        {
          ezee_reservation_id: row.ezee_reservation_id,
          sub_booking_id: row.ezee_reservation_id,
          room_number: row.room_number,
          cap: this.cacheCap(row),
          guest_id: row.guest_id,
          guest_name: null,
          checkout_date: row.checkout_date,
        },
      ];
    }

    return snapshot.map((s) => {
      const adults = Number(s.adults);
      return {
        ezee_reservation_id: row.ezee_reservation_id,
        sub_booking_id: String(s.sub_id ?? row.ezee_reservation_id),
        room_number: (s.room_number as string) ?? row.room_number,
        // Per-room adults when eZee gave them. Otherwise the reservation figure is only safe to
        // reuse for a single-room booking — spreading it across every room of a multi-room one
        // would hand each room the whole booking's plate allowance.
        cap:
          Number.isFinite(adults) && adults > 0
            ? adults
            : snapshot.length === 1
              ? this.cacheCap(row)
              : 1,
        guest_id: (s.guest_id as string) ?? row.guest_id,
        guest_name: (s.name as string) ?? null,
        checkout_date: row.checkout_date,
      };
    });
  }

  // ── Ordering window ─────────────────────────────────────────────────────────

  /**
   * Compute the current ordering window against the IST clock.
   *
   * For a given breakfast date D, the orderable window is [ (D-1) @ openHour, D @ freezeHour ).
   * `service_date` is the next orderable breakfast: today if we're still before this
   * morning's freeze, else tomorrow. The window is OPEN iff "now" is inside that interval.
   */
  computeWindow(
    now: Date = new Date(),
    openHour: number = this.envOpenHour(),
    freezeHour: number = this.envFreezeHour(),
  ): OrderWindow {
    const { hour, minute, dateStr } = istParts(now);
    const open = openHour;
    const freeze = freezeHour;

    const isTodayTarget = hour < freeze; // still before this morning's freeze
    const serviceDate = isTodayTarget ? dateStr : addDaysToDateStr(dateStr, 1);

    const nowRel = (isTodayTarget ? 0 : -1440) + hour * 60 + minute;
    const openRel = open * 60 - 1440; // opens the evening before serviceDate
    const closeRel = freeze * 60; // freezes on serviceDate morning
    const state: WindowState = nowRel >= openRel && nowRel < closeRel ? 'open' : 'frozen';

    const opensDate = addDaysToDateStr(serviceDate, -1);
    return {
      state,
      service_date: serviceDate,
      opens_at_ist: `${opensDate} ${this.pad2(open)}:00 IST`,
      closes_at_ist: `${serviceDate} ${this.pad2(freeze)}:00 IST`,
      open_hour: open,
      freeze_hour: freeze,
    };
  }

  // ── Cx token resolution ─────────────────────────────────────────────────────

  private async resolveToken(token: string): Promise<{
    link_state: LinkState;
    booking?: {
      ezee_reservation_id: string;
      property_id: string;
      brand: string;
    };
  }> {
    const row = await this.prisma.breakfast_access_token.findUnique({
      where: { token_hash: this.hash(token) },
    });
    if (!row) return { link_state: 'not_found' };
    if (row.revoked_at) return { link_state: 'revoked' };

    // eZee is the source of truth: the link lives only while the booking is CHECKED_IN.
    const booking = await this.prisma.ezee_booking_cache.findUnique({
      where: { ezee_reservation_id: row.ezee_reservation_id },
      select: { ezee_reservation_id: true, property_id: true, is_active: true, status: true },
    });
    if (!booking || !booking.is_active || booking.status !== 'CHECKED_IN') {
      return { link_state: 'checked_out' };
    }
    if (row.expires_at.getTime() < Date.now()) {
      return { link_state: 'checked_out' };
    }
    return {
      link_state: 'valid',
      booking: {
        ezee_reservation_id: booking.ezee_reservation_id,
        property_id: booking.property_id,
        brand: row.brand,
      },
    };
  }

  /**
   * Every CHECKED_IN room the booker holds at the property — the token's own room plus any
   * sibling sharing the same normalised (last-10-digit) booker_phone. Mirrors the group-booking
   * resolution used by the ticketing front door. eZee is the source of truth.
   */
  private async siblingRooms(eri: string, propertyId: string): Promise<SiblingRoom[]> {
    const rows = await this.prisma.$queryRaw<CacheRow[]>`
      SELECT b.ezee_reservation_id, b.room_number, b.no_of_adults, b.no_of_guests,
             b.guest_id, b.checkout_date, b.ezee_room_guests_json
        FROM ezee_booking_cache b
       WHERE b.property_id = ${propertyId}
         AND b.is_active = true
         AND b.status = 'CHECKED_IN'
         AND (
           b.ezee_reservation_id = ${eri}
           OR (
             length(right(regexp_replace(coalesce(b.booker_phone, ''), '[^0-9]', '', 'g'), 10)) = 10
             AND right(regexp_replace(coalesce(b.booker_phone, ''), '[^0-9]', '', 'g'), 10) = (
               SELECT right(regexp_replace(coalesce(bx.booker_phone, ''), '[^0-9]', '', 'g'), 10)
                 FROM ezee_booking_cache bx
                WHERE bx.ezee_reservation_id = ${eri}
             )
           )
         )
       ORDER BY b.room_number ASC`;
    return rows
      .flatMap((r) => this.expandRooms(r))
      .sort((a, b) => (a.room_number ?? '').localeCompare(b.room_number ?? ''));
  }

  // ── Cx page (read) ──────────────────────────────────────────────────────────

  /** The full page payload for the FE to render `/breakfast/:token`. Read-only. */
  async getByToken(token: string): Promise<BreakfastPageView> {
    const resolved = await this.resolveToken(token);
    if (resolved.link_state !== 'valid' || !resolved.booking) {
      return { link_state: resolved.link_state };
    }
    const { booking } = resolved;
    if (!(await this.isEnabled(booking.property_id))) {
      return { link_state: 'disabled', brand: booking.brand };
    }
    const window = await this.windowForProperty(booking.property_id);
    const siblings = await this.siblingRooms(booking.ezee_reservation_id, booking.property_id);

    const [menu, slots, rooms] = await Promise.all([
      this.activeMenu(booking.property_id),
      this.slotsWithCapacity(booking.property_id, window.service_date),
      this.roomsView(siblings, window.service_date),
    ]);

    return {
      link_state: 'valid',
      window,
      brand: booking.brand,
      total_adults: rooms.reduce((a, r) => a + r.max_plates, 0),
      rooms,
      menu,
      slots,
    };
  }

  private async activeMenu(propertyId: string): Promise<MenuItemView[]> {
    const rows = await this.prisma.breakfast_menu_item.findMany({
      where: { property_id: propertyId, is_active: true },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });
    return rows.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      category: m.category,
      is_veg: m.is_veg,
      sort_order: m.sort_order,
    }));
  }

  /** Slots for a property with plate-based booked/remaining counts for a service date. */
  private async slotsWithCapacity(propertyId: string, serviceDate: string): Promise<SlotView[]> {
    const slots = await this.prisma.breakfast_slot.findMany({
      where: { property_id: propertyId, is_active: true },
      orderBy: [{ sort_order: 'asc' }, { slot_number: 'asc' }],
    });
    const counts = await this.prisma.breakfast_plate.groupBy({
      by: ['slot_id'],
      where: {
        status: 'PLACED',
        breakfast_order: {
          property_id: propertyId,
          service_date: this.toDate(serviceDate),
          status: 'PLACED',
          // A test plate must not eat a real guest's seat. `booked`/`remaining` gate what the Cx
          // link will accept, so counting tests here could turn a real guest away from a slot
          // that is in fact free. The trade-off is that a test can't itself exercise the
          // slot-full path — worth it: capacity is a promise to real guests.
          is_test: false,
        },
      },
      _count: { _all: true },
    });
    const bySlot = new Map(counts.map((c) => [c.slot_id, c._count._all]));
    return slots.map((s) => {
      const booked = bySlot.get(s.id) ?? 0;
      return {
        id: s.id,
        slot_number: s.slot_number,
        label: s.label,
        start_min: s.start_min,
        end_min: s.end_min,
        capacity: s.capacity,
        booked,
        remaining: Math.max(0, s.capacity - booked),
        sort_order: s.sort_order,
      };
    });
  }

  private formatPlate(p: {
    plate_number: number;
    slot_id: string;
    status: string;
    special_requests: string | null;
    breakfast_slot?: { label: string } | null;
    breakfast_order_items: { menu_item_id: string; qty: number; breakfast_menu_item?: { name: string } | null }[];
  }): PlateView {
    return {
      plate_number: p.plate_number,
      slot_id: p.slot_id,
      slot_label: p.breakfast_slot?.label ?? null,
      status: p.status,
      special_requests: p.special_requests,
      items: p.breakfast_order_items.map((i) => ({
        menu_item_id: i.menu_item_id,
        name: i.breakfast_menu_item?.name ?? 'item',
        qty: i.qty,
      })),
    };
  }

  /**
   * Per-room current state (cap + placed plates) for the Cx page. The room key the FE echoes back
   * (`ezee_reservation_id` in the contract — an opaque room key) is the SUB-booking id, so two
   * rooms of one reservation are two distinct rooms with two distinct orders.
   */
  private async roomsView(siblings: SiblingRoom[], serviceDate: string): Promise<RoomView[]> {
    const subIds = siblings.map((s) => s.sub_booking_id);
    const orders = subIds.length
      ? await this.prisma.breakfast_order.findMany({
          where: { sub_booking_id: { in: subIds }, service_date: this.toDate(serviceDate) },
          include: ORDER_WITH_PLATES,
        })
      : [];
    const bySub = new Map(orders.map((o) => [o.sub_booking_id, o]));
    return siblings.map((s) => {
      const o = bySub.get(s.sub_booking_id);
      return {
        ezee_reservation_id: s.sub_booking_id,
        room_number: s.room_number,
        max_plates: s.cap,
        order_status: o?.status ?? null,
        plates:
          o && o.status === 'PLACED'
            ? o.breakfast_plates.filter((p) => p.status === 'PLACED').map((p) => this.formatPlate(p))
            : [],
      };
    });
  }

  // ── Cx order submit ─────────────────────────────────────────────────────────

  /**
   * Place / modify / skip the booker's rooms for the CURRENT service_date. The payload may
   * carry one room (submit-as-you-go) or all rooms at once. Rejects when the token is invalid
   * (404/410 via the controller), breakfast is off, the window is frozen, a room isn't the
   * booker's, a room's plate count exceeds its eZee adult cap, or a plate's slot is full (409).
   */
  async submitByToken(
    token: string,
    dto: SubmitBreakfastOrderDto,
  ): Promise<{ ok: true; rooms: RoomView[] }> {
    const resolved = await this.resolveToken(token);
    if (resolved.link_state === 'not_found') throw new NotFoundException({ ok: false, link_state: 'not_found' });
    if (resolved.link_state !== 'valid' || !resolved.booking) {
      throw new ConflictException({ ok: false, link_state: resolved.link_state });
    }
    const propertyId = resolved.booking.property_id;
    if (!(await this.isEnabled(propertyId))) {
      throw new ConflictException({ ok: false, link_state: 'disabled' });
    }
    const window = await this.windowForProperty(propertyId);
    if (window.state !== 'open') {
      throw new ConflictException({
        ok: false,
        error: 'window_frozen',
        message: `Ordering is closed right now. It opens at ${window.opens_at_ist}.`,
        window,
      });
    }

    const siblings = await this.siblingRooms(resolved.booking.ezee_reservation_id, propertyId);
    // The FE echoes back the opaque room key we emitted (the sub-booking id). Older clients may
    // still send the bare reservation id — accept it when the booking has exactly one room.
    const sibById = new Map(siblings.map((s) => [s.sub_booking_id, s]));
    for (const s of siblings) {
      if (!sibById.has(s.ezee_reservation_id)) {
        const roomsOfRes = siblings.filter((x) => x.ezee_reservation_id === s.ezee_reservation_id);
        if (roomsOfRes.length === 1) sibById.set(s.ezee_reservation_id, s);
      }
    }

    const intents: RoomIntent[] = [];
    const seen = new Set<string>();
    for (const r of dto.rooms) {
      if (seen.has(r.ezee_reservation_id)) {
        throw new BadRequestException({
          ok: false,
          error: 'duplicate_room',
          message: 'A room appears more than once in the request',
          ezee_reservation_id: r.ezee_reservation_id,
        });
      }
      seen.add(r.ezee_reservation_id);
      const sib = sibById.get(r.ezee_reservation_id);
      if (!sib) {
        throw new ForbiddenException({
          ok: false,
          error: 'room_not_yours',
          message: 'That room is not part of your booking',
          ezee_reservation_id: r.ezee_reservation_id,
        });
      }
      // The room must still be staying on the breakfast date.
      if (sib.checkout_date && this.fromDate(sib.checkout_date) < window.service_date) {
        throw new BadRequestException({
          ok: false,
          error: 'room_checked_out_before_service',
          message: `Room ${sib.room_number ?? ''} is not staying on that breakfast date`.trim(),
          ezee_reservation_id: sib.ezee_reservation_id,
          service_date: window.service_date,
        });
      }
      const plates = (r.plates ?? []).map((p) => ({
        slot_id: p.slot_id,
        items: (p.items ?? [])
          .filter((i) => i && i.menu_item_id)
          .map((i) => ({ menu_item_id: i.menu_item_id, qty: Math.max(1, i.qty ?? 1) })),
        special_requests: p.special_requests ?? null,
      }));
      // An explicit ORDER with no plates is a client error (don't silently skip the room).
      // An omitted action + empty plates is the intentional "clear this room" shorthand.
      if (r.action === 'ORDER' && plates.length === 0) {
        throw new BadRequestException({
          ok: false,
          error: 'plates_required',
          message: `Room ${sib.room_number ?? ''} was set to ORDER but has no plates`.trim(),
          ezee_reservation_id: sib.ezee_reservation_id,
        });
      }
      const action: 'ORDER' | 'SKIP' = r.action === 'SKIP' || plates.length === 0 ? 'SKIP' : 'ORDER';
      intents.push({
        eri: sib.ezee_reservation_id,
        subId: sib.sub_booking_id,
        guestId: sib.guest_id,
        roomNumber: sib.room_number,
        cap: sib.cap,
        action,
        plates: action === 'ORDER' ? plates : [],
      });
    }

    await this.writeRoomOrders({
      propertyId,
      brand: resolved.booking.brand,
      serviceDate: window.service_date,
      placedVia: 'CX_LINK',
      rooms: intents,
    });

    return { ok: true, rooms: await this.roomsView(siblings, window.service_date) };
  }

  /**
   * Validate + persist a set of room orders (shared by the Cx link and the admin manual path).
   * Enforces per-room plate caps, valid property-scoped slots/items, and PLATE-based slot
   * capacity (excluding the rooms being rewritten now), then replaces each room's plates in a
   * transaction. Frozen-window / not-your-room checks are the caller's job.
   */
  private async writeRoomOrders(p: {
    propertyId: string;
    brand: string;
    serviceDate: string;
    placedVia: 'CX_LINK' | 'ADMIN';
    rooms: RoomIntent[];
  }): Promise<void> {
    const itemIds = new Set<string>();
    const slotIds = new Set<string>();
    for (const r of p.rooms) {
      if (r.action !== 'ORDER') continue;
      if (r.plates.length > r.cap) {
        throw new BadRequestException({
          ok: false,
          error: 'plate_cap_exceeded',
          message: `Room ${r.roomNumber ?? r.eri} allows at most ${r.cap} breakfast plate(s)`,
          ezee_reservation_id: r.eri,
          max_plates: r.cap,
        });
      }
      for (const pl of r.plates) {
        if (!pl.slot_id) {
          throw new BadRequestException({
            ok: false,
            error: 'slot_required',
            message: 'Each plate needs a delivery slot',
            ezee_reservation_id: r.eri,
          });
        }
        slotIds.add(pl.slot_id);
        if (pl.items.length === 0) {
          throw new BadRequestException({
            ok: false,
            error: 'items_required',
            message: 'Each plate needs at least one item',
            ezee_reservation_id: r.eri,
          });
        }
        pl.items.forEach((i) => itemIds.add(i.menu_item_id));
      }
    }

    // Items + slots must belong to the property and be active.
    if (itemIds.size) {
      const valid = await this.prisma.breakfast_menu_item.findMany({
        where: { id: { in: [...itemIds] }, property_id: p.propertyId, is_active: true },
        select: { id: true },
      });
      if (valid.length !== itemIds.size) {
        const known = new Set(valid.map((v) => v.id));
        throw new BadRequestException({
          ok: false,
          error: 'invalid_menu_item',
          message: 'One or more menu items are invalid',
          menu_item_ids: [...itemIds].filter((id) => !known.has(id)),
        });
      }
    }
    const slotCap = new Map<string, number>();
    if (slotIds.size) {
      const valid = await this.prisma.breakfast_slot.findMany({
        where: { id: { in: [...slotIds] }, property_id: p.propertyId, is_active: true },
        select: { id: true, capacity: true },
      });
      if (valid.length !== slotIds.size) {
        const known = new Set(valid.map((v) => v.id));
        throw new BadRequestException({
          ok: false,
          error: 'invalid_slot',
          message: 'Unknown or inactive delivery slot',
          slot_ids: [...slotIds].filter((id) => !known.has(id)),
        });
      }
      valid.forEach((s) => slotCap.set(s.id, s.capacity));
    }

    // Plate-based capacity: existing PLACED plates per slot for the date, EXCLUDING the rooms
    // we're about to rewrite (their plates are being replaced), plus the new plates requested.
    const excludeSubs = p.rooms.map((r) => r.subId);
    const existing = await this.prisma.breakfast_plate.groupBy({
      by: ['slot_id'],
      where: {
        status: 'PLACED',
        breakfast_order: {
          property_id: p.propertyId,
          service_date: this.toDate(p.serviceDate),
          status: 'PLACED',
          sub_booking_id: { notIn: excludeSubs },
          // Consistent with slotsWithCapacity: test plates occupy no capacity, so a test can
          // neither be blocked by nor block anyone.
          is_test: false,
        },
      },
      _count: { _all: true },
    });
    const used = new Map(existing.map((e) => [e.slot_id, e._count._all]));
    const requested = new Map<string, number>();
    for (const r of p.rooms) {
      if (r.action !== 'ORDER') continue;
      for (const pl of r.plates) requested.set(pl.slot_id, (requested.get(pl.slot_id) ?? 0) + 1);
    }
    for (const [sid, n] of requested) {
      const cap = slotCap.get(sid) ?? 0;
      if ((used.get(sid) ?? 0) + n > cap) {
        const slots = await this.slotsWithCapacity(p.propertyId, p.serviceDate);
        throw new ConflictException({
          ok: false,
          error: 'slot_full',
          message: 'A delivery slot you picked is full. Please choose another time.',
          slots,
        });
      }
    }

    const serviceDate = this.toDate(p.serviceDate);

    // Which of these rooms belong to a test booking. Resolved per ERI rather than per call
    // because the Cx link writes sibling rooms together, and denormalised onto the order below
    // because breakfast_order has no relation to join back through at read time.
    const testEris = new Set(
      (
        await this.prisma.ezee_booking_cache.findMany({
          where: { ezee_reservation_id: { in: [...new Set(p.rooms.map((r) => r.eri))] }, is_test: true },
          select: { ezee_reservation_id: true },
        })
      ).map((b) => b.ezee_reservation_id),
    );

    await this.prisma.$transaction(async (tx) => {
      for (const r of p.rooms) {
        const status = r.action === 'SKIP' ? 'SKIPPED' : 'PLACED';
        const plateCount = r.action === 'SKIP' ? 0 : r.plates.length;
        const existingOrder = await tx.breakfast_order.findUnique({
          where: {
            ezee_reservation_id_sub_booking_id_service_date: {
              ezee_reservation_id: r.eri,
              sub_booking_id: r.subId,
              service_date: serviceDate,
            },
          },
          select: { id: true },
        });
        let orderId: string;
        if (existingOrder) {
          orderId = existingOrder.id;
          await tx.breakfast_order.update({
            where: { id: orderId },
            data: {
              status,
              no_of_guests: plateCount,
              room_number: r.roomNumber,
              placed_via: p.placedVia,
              updated_at: new Date(),
              is_test: testEris.has(r.eri),
            },
          });
          await tx.breakfast_plate.deleteMany({ where: { order_id: orderId } }); // cascades items
        } else {
          orderId = uuidv4();
          await tx.breakfast_order.create({
            data: {
              id: orderId,
              property_id: p.propertyId,
              ezee_reservation_id: r.eri,
              sub_booking_id: r.subId,
              guest_id: r.guestId,
              brand: p.brand,
              service_date: serviceDate,
              status,
              no_of_guests: plateCount,
              room_number: r.roomNumber,
              placed_via: p.placedVia,
              is_test: testEris.has(r.eri),
            },
          });
        }
        if (r.action === 'ORDER') {
          let idx = 0;
          for (const pl of r.plates) {
            idx += 1;
            const plateId = uuidv4();
            await tx.breakfast_plate.create({
              data: {
                id: plateId,
                order_id: orderId,
                plate_number: idx,
                slot_id: pl.slot_id,
                status: 'PLACED',
                special_requests: pl.special_requests,
              },
            });
            await tx.breakfast_order_item.createMany({
              data: pl.items.map((i) => ({
                id: uuidv4(),
                plate_id: plateId,
                menu_item_id: i.menu_item_id,
                qty: i.qty,
              })),
            });
          }
        }
      }
    });
  }

  private async brandOfProperty(propertyId: string): Promise<string> {
    const p = await this.prisma.properties.findUnique({
      where: { id: propertyId },
      select: { brand: true },
    });
    return p?.brand ?? 'TDS';
  }

  // ══ ADMIN: menu catalog ══════════════════════════════════════════════════════

  private requireActorProperty(actor: AdminJwtPayload): string {
    if (!actor.property_id) throw new BadRequestException('Active property missing from session — log in again');
    return actor.property_id;
  }

  private assertManages(actor: AdminJwtPayload, propertyId: string): void {
    if (!actor.property_ids?.includes(propertyId)) {
      throw new ForbiddenException('You are not authorised for this property');
    }
  }

  /**
   * The firing schedule instants for an anchor (mins from IST midnight) + interval (hours):
   * `lastDue` = the most recent scheduled firing ≤ now, `next` = the next firing > now.
   * Re-anchors to `anchor` each IST day, then steps by the interval.
   */
  static scheduleInstants(now: Date, anchorMin: number, intervalHours: number): { lastDue: Date; next: Date } {
    const { dateStr } = istParts(now);
    let base = istWallclockToUtc(dateStr, anchorMin);
    if (now.getTime() < base.getTime()) base = new Date(base.getTime() - 86_400_000); // before today's anchor
    const stepMs = (intervalHours > 0 ? intervalHours : 24) * 3_600_000;
    const k = Math.floor((now.getTime() - base.getTime()) / stepMs);
    const lastDue = new Date(base.getTime() + k * stepMs);
    return { lastDue, next: new Date(lastDue.getTime() + stepMs) };
  }

  private formatConfig(propertyId: string, cfg: {
    is_enabled: boolean;
    order_open_hour: number;
    order_freeze_hour: number;
    invite_cron_enabled: boolean;
    invite_anchor_min: number;
    invite_interval_hours: number;
    last_invite_run_at: Date | null;
    updated_at: Date | null;
  } | null) {
    const anchorMin = cfg?.invite_anchor_min ?? 1080;
    const intervalHours = cfg?.invite_interval_hours ?? 24;
    const next = BreakfastService.scheduleInstants(new Date(), anchorMin, intervalHours).next;
    const openHour = this.validHour(cfg?.order_open_hour) ?? this.envOpenHour();
    const freezeHour = this.validHour(cfg?.order_freeze_hour) ?? this.envFreezeHour();
    return {
      property_id: propertyId,
      is_enabled: cfg?.is_enabled ?? false,
      order_open_hour: openHour,
      order_freeze_hour: freezeHour,
      invite_cron_enabled: cfg?.invite_cron_enabled ?? false,
      invite_anchor_min: anchorMin,
      invite_interval_hours: intervalHours,
      last_invite_run_at: cfg?.last_invite_run_at?.toISOString() ?? null,
      last_invite_run_at_ist: toIstString(cfg?.last_invite_run_at ?? null),
      next_invite_at_ist: toIstString(next),
      updated_at: cfg?.updated_at?.toISOString() ?? null,
    };
  }

  /** The active property's breakfast config (toggle + auto-send schedule). */
  async getConfig(actor: AdminJwtPayload) {
    const propertyId = this.requireActorProperty(actor);
    const cfg = await this.prisma.breakfast_config.findUnique({ where: { property_id: propertyId } });
    return this.formatConfig(propertyId, cfg);
  }

  /** Update the active property's breakfast toggle and/or auto-send schedule (partial). */
  async setConfig(actor: AdminJwtPayload, dto: {
    enabled?: boolean;
    order_open_hour?: number;
    order_freeze_hour?: number;
    invite_cron_enabled?: boolean;
    invite_anchor_min?: number;
    invite_interval_hours?: number;
  }) {
    const propertyId = this.requireActorProperty(actor);
    this.assertManages(actor, propertyId);
    if (dto.order_open_hour !== undefined && dto.order_freeze_hour !== undefined
        && dto.order_open_hour === dto.order_freeze_hour) {
      throw new BadRequestException('order_open_hour and order_freeze_hour cannot be the same');
    }
    const cfg = await this.prisma.breakfast_config.upsert({
      where: { property_id: propertyId },
      update: {
        ...(dto.enabled !== undefined ? { is_enabled: dto.enabled } : {}),
        ...(dto.order_open_hour !== undefined ? { order_open_hour: dto.order_open_hour } : {}),
        ...(dto.order_freeze_hour !== undefined ? { order_freeze_hour: dto.order_freeze_hour } : {}),
        ...(dto.invite_cron_enabled !== undefined ? { invite_cron_enabled: dto.invite_cron_enabled } : {}),
        ...(dto.invite_anchor_min !== undefined ? { invite_anchor_min: dto.invite_anchor_min } : {}),
        ...(dto.invite_interval_hours !== undefined ? { invite_interval_hours: dto.invite_interval_hours } : {}),
        updated_at: new Date(),
      },
      create: {
        property_id: propertyId,
        is_enabled: dto.enabled ?? false,
        ...(dto.order_open_hour !== undefined ? { order_open_hour: dto.order_open_hour } : {}),
        ...(dto.order_freeze_hour !== undefined ? { order_freeze_hour: dto.order_freeze_hour } : {}),
        invite_cron_enabled: dto.invite_cron_enabled ?? false,
        ...(dto.invite_anchor_min !== undefined ? { invite_anchor_min: dto.invite_anchor_min } : {}),
        ...(dto.invite_interval_hours !== undefined ? { invite_interval_hours: dto.invite_interval_hours } : {}),
      },
    });
    return this.formatConfig(propertyId, cfg);
  }

  async createMenuItem(dto: CreateMenuItemDto, actor: AdminJwtPayload) {
    this.assertManages(actor, dto.property_id);
    const property = await this.prisma.properties.findUnique({ where: { id: dto.property_id } });
    if (!property) throw new NotFoundException('Property not found');
    return this.prisma.breakfast_menu_item.create({
      data: {
        id: uuidv4(),
        property_id: dto.property_id,
        name: dto.name,
        description: dto.description ?? null,
        category: dto.category ?? 'MAIN',
        is_veg: dto.is_veg ?? true,
        forecast_key: dto.forecast_key ?? dto.name,
        sort_order: dto.sort_order ?? 0,
      },
    });
  }

  async listMenu(actor: AdminJwtPayload, includeInactive = true) {
    const propertyId = this.requireActorProperty(actor);
    return this.prisma.breakfast_menu_item.findMany({
      where: { property_id: propertyId, ...(includeInactive ? {} : { is_active: true }) },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });
  }

  async getMenuItem(id: string, actor: AdminJwtPayload) {
    const item = await this.prisma.breakfast_menu_item.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Menu item not found');
    this.assertManages(actor, item.property_id);
    return item;
  }

  async updateMenuItem(id: string, dto: UpdateMenuItemDto, actor: AdminJwtPayload) {
    const item = await this.getMenuItem(id, actor);
    return this.prisma.breakfast_menu_item.update({
      where: { id: item.id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.is_veg !== undefined ? { is_veg: dto.is_veg } : {}),
        ...(dto.forecast_key !== undefined ? { forecast_key: dto.forecast_key } : {}),
        ...(dto.sort_order !== undefined ? { sort_order: dto.sort_order } : {}),
        ...(dto.is_active !== undefined ? { is_active: dto.is_active } : {}),
        updated_at: new Date(),
      },
    });
  }

  /** Remove = soft-delete (is_active=false) so historic orders keep resolving item names. */
  async removeMenuItem(id: string, actor: AdminJwtPayload) {
    const item = await this.getMenuItem(id, actor);
    await this.prisma.breakfast_menu_item.update({
      where: { id: item.id },
      data: { is_active: false, updated_at: new Date() },
    });
    return { ok: true, id: item.id };
  }

  // ══ ADMIN: slot config ═══════════════════════════════════════════════════════

  async listSlots(actor: AdminJwtPayload) {
    const propertyId = this.requireActorProperty(actor);
    return this.prisma.breakfast_slot.findMany({
      where: { property_id: propertyId },
      orderBy: [{ sort_order: 'asc' }, { slot_number: 'asc' }],
    });
  }

  async createSlot(dto: CreateSlotDto, actor: AdminJwtPayload) {
    this.assertManages(actor, dto.property_id);
    const existing = await this.prisma.breakfast_slot.findFirst({
      where: { property_id: dto.property_id, slot_number: dto.slot_number },
    });
    if (existing) throw new ConflictException('A slot with that number already exists for this property');
    return this.prisma.breakfast_slot.create({
      data: {
        id: uuidv4(),
        property_id: dto.property_id,
        slot_number: dto.slot_number,
        label: dto.label,
        start_min: dto.start_min,
        end_min: dto.end_min,
        capacity: dto.capacity ?? this.defaultCapacity(),
        sort_order: dto.sort_order ?? dto.slot_number,
      },
    });
  }

  async updateSlot(id: string, dto: UpdateSlotDto, actor: AdminJwtPayload) {
    const slot = await this.prisma.breakfast_slot.findUnique({ where: { id } });
    if (!slot) throw new NotFoundException('Slot not found');
    this.assertManages(actor, slot.property_id);
    return this.prisma.breakfast_slot.update({
      where: { id },
      data: {
        ...(dto.label !== undefined ? { label: dto.label } : {}),
        ...(dto.start_min !== undefined ? { start_min: dto.start_min } : {}),
        ...(dto.end_min !== undefined ? { end_min: dto.end_min } : {}),
        ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
        ...(dto.sort_order !== undefined ? { sort_order: dto.sort_order } : {}),
        ...(dto.is_active !== undefined ? { is_active: dto.is_active } : {}),
        updated_at: new Date(),
      },
    });
  }

  async removeSlot(id: string, actor: AdminJwtPayload) {
    const slot = await this.prisma.breakfast_slot.findUnique({ where: { id } });
    if (!slot) throw new NotFoundException('Slot not found');
    this.assertManages(actor, slot.property_id);
    await this.prisma.breakfast_slot.update({
      where: { id },
      data: { is_active: false, updated_at: new Date() },
    });
    return { ok: true, id };
  }

  // ══ ADMIN: order tracking ════════════════════════════════════════════════════

  /**
   * The breakfast morning an admin screen means when the caller names no date.
   *
   * This is NOT the calendar date. Guests order the EVENING BEFORE the meal, so from the moment
   * the window reopens (default 11:00 IST) every order they place lands on TOMORROW's
   * service_date — a board defaulting to "today" sits empty while orders pour in, which reads as
   * "the guest's order never arrived". Before the window reopens, today's morning is still the
   * live one (orderable until the freeze, then served). So: before open_hour → today, after →
   * tomorrow. An explicit ?date= always wins.
   */
  private async resolveDate(propertyId: string, dateStr?: string): Promise<string> {
    if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const { open_hour } = await this.windowForProperty(propertyId);
    const { hour, dateStr: today } = istParts(new Date());
    return hour < open_hour ? today : addDaysToDateStr(today, 1);
  }

  private formatAdminOrder(o: {
    id: string;
    ezee_reservation_id: string;
    sub_booking_id: string;
    room_number: string | null;
    service_date: Date;
    status: string;
    placed_via: string;
    updated_at: Date;
    breakfast_plates: Parameters<BreakfastService['formatPlate']>[0][];
  }): AdminRoomOrderView {
    const plates = o.breakfast_plates.map((p) => this.formatPlate(p));
    return {
      order_id: o.id,
      ezee_reservation_id: o.ezee_reservation_id,
      sub_booking_id: o.sub_booking_id,
      room_number: o.room_number,
      service_date: this.fromDate(o.service_date),
      status: o.status,
      placed_via: o.placed_via,
      plate_count: plates.length,
      plates,
      updated_at: o.updated_at.toISOString(),
    };
  }

  /** Every order for a service date: which room ordered which food, broken out per plate. */
  async listOrders(actor: AdminJwtPayload, dateStr?: string) {
    const propertyId = this.requireActorProperty(actor);
    const serviceDate = await this.resolveDate(propertyId, dateStr);
    const orders = await this.prisma.breakfast_order.findMany({
      where: { property_id: propertyId, service_date: this.toDate(serviceDate) },
      include: ORDER_WITH_PLATES,
      orderBy: [{ room_number: 'asc' }],
    });
    return {
      service_date: serviceDate,
      count: orders.length,
      orders: orders.map((o) => this.formatAdminOrder(o)),
    };
  }

  /**
   * The property's currently CHECKED_IN bookings, annotated with each room's order status for the
   * service date — so admins pick a guest/room from a list instead of hunting the reservation_id in
   * the DB before placing an order on their behalf. Rooms are ready to feed `POST /orders`.
   */
  async listCheckedInBookings(
    actor: AdminJwtPayload,
    dateStr?: string,
  ): Promise<{ service_date: string; count: number; bookings: AdminBookingRosterRow[] }> {
    const propertyId = this.requireActorProperty(actor);
    const serviceDate = await this.resolveDate(propertyId, dateStr);
    // Test bookings are LISTED here (not filtered out) — the roster is how an admin places an
    // order on a test guest's behalf, so hiding them would make the flow untestable. They carry
    // is_test so the UI can tag the row; only the cooked/reported totals leave them out.
    const cached = await this.prisma.$queryRaw<
      (CacheRow & { booker_phone: string | null; booker_email: string | null; is_test: boolean })[]
    >`
      SELECT b.ezee_reservation_id, b.room_number, b.no_of_adults, b.no_of_guests, b.guest_id,
             b.checkout_date, b.ezee_room_guests_json, b.booker_phone, b.booker_email, b.is_test
        FROM ezee_booking_cache b
       WHERE b.property_id = ${propertyId}
         AND b.is_active = true
         AND b.status = 'CHECKED_IN'
       ORDER BY b.room_number ASC`;

    // One roster row per ROOM — a multi-room reservation is several rooms, each orderable on its
    // own, so listing it once (as the reservation) hid every room but the first from the admin.
    const rooms = cached.flatMap((b) =>
      this.expandRooms(b).map((r) => ({
        ...r,
        booker_phone: b.booker_phone,
        booker_email: b.booker_email,
        is_test: b.is_test,
      })),
    );
    const names = await this.guestNames(rooms.map((r) => r.guest_id));

    const orders = rooms.length
      ? await this.prisma.breakfast_order.findMany({
          where: {
            sub_booking_id: { in: rooms.map((r) => r.sub_booking_id) },
            service_date: this.toDate(serviceDate),
          },
          include: ORDER_WITH_PLATES,
        })
      : [];
    const bySub = new Map(orders.map((o) => [o.sub_booking_id, o]));

    const rows: AdminBookingRosterRow[] = rooms.map((r) => {
      const o = bySub.get(r.sub_booking_id);
      const checkout = r.checkout_date ? this.fromDate(r.checkout_date) : null;
      return {
        ezee_reservation_id: r.sub_booking_id, // the room key POST /orders expects
        room_number: r.room_number,
        guest_name:
          r.guest_name ?? (r.guest_id ? names.get(r.guest_id) ?? null : null) ?? r.booker_email ?? null,
        booker_phone: r.booker_phone,
        no_of_adults: r.cap,
        max_plates: r.cap,
        checkout_date: checkout,
        eligible: checkout === null || checkout >= serviceDate,
        order_status: o?.status ?? null,
        plate_count:
          o && o.status === 'PLACED'
            ? o.breakfast_plates.filter((p) => p.status === 'PLACED').length
            : 0,
        is_test: r.is_test,
      };
    });
    return {
      service_date: serviceDate,
      count: rows.length,
      bookings: rows.sort((a, b) => (a.room_number ?? '').localeCompare(b.room_number ?? '')),
    };
  }

  private async guestNames(ids: (string | null)[]): Promise<Map<string, string>> {
    const known = [...new Set(ids.filter((i): i is string => !!i))];
    if (known.length === 0) return new Map();
    const rows = await this.prisma.guests.findMany({
      where: { id: { in: known } },
      select: { id: true, name: true },
    });
    return new Map(rows.map((g) => [g.id, g.name]));
  }

  /** Per-slot booked (plates) vs capacity for a date. */
  async slotSummary(actor: AdminJwtPayload, dateStr?: string) {
    const propertyId = this.requireActorProperty(actor);
    const serviceDate = await this.resolveDate(propertyId, dateStr);
    const slots = await this.slotsWithCapacity(propertyId, serviceDate);
    return {
      service_date: serviceDate,
      total_capacity: slots.reduce((a, s) => a + s.capacity, 0),
      total_booked: slots.reduce((a, s) => a + s.booked, 0),
      slots,
    };
  }

  /**
   * Kitchen forecast: item → total qty across PLACED plates for the date (BRD §8).
   *
   * These quantities are what the kitchen actually cooks, so test orders are excluded — a test
   * plate left in here becomes a real breakfast prepared for a guest who doesn't exist, and
   * nobody would know it was a test until it went in the bin. Unlike a roster row, an aggregated
   * quantity has nothing to hang a "test" tag on, so the count is reported separately as
   * `test_plates` instead: the total stays true and ops can still see a test is running.
   */
  async forecast(actor: AdminJwtPayload, dateStr?: string) {
    const propertyId = this.requireActorProperty(actor);
    const serviceDate = await this.resolveDate(propertyId, dateStr);
    const [rows, testPlates] = await Promise.all([
      this.prisma.breakfast_order_item.findMany({
        where: {
          breakfast_plate: {
            status: 'PLACED',
            breakfast_order: {
              property_id: propertyId,
              service_date: this.toDate(serviceDate),
              status: 'PLACED',
              is_test: false,
            },
          },
        },
        include: { breakfast_menu_item: true },
      }),
      this.prisma.breakfast_plate.count({
        where: {
          status: 'PLACED',
          breakfast_order: {
            property_id: propertyId,
            service_date: this.toDate(serviceDate),
            status: 'PLACED',
            is_test: true,
          },
        },
      }),
    ]);
    const agg = new Map<string, { key: string; name: string; qty: number }>();
    for (const r of rows) {
      const key = r.breakfast_menu_item?.forecast_key || r.breakfast_menu_item?.name || r.menu_item_id;
      const name = r.breakfast_menu_item?.name || key;
      const cur = agg.get(key) ?? { key, name, qty: 0 };
      cur.qty += r.qty;
      agg.set(key, cur);
    }
    return {
      service_date: serviceDate,
      items: [...agg.values()].sort((a, b) => b.qty - a.qty),
      /** Plates on test orders — NOT included in `items`. Do not cook these. Normally 0. */
      test_plates: testPlates,
    };
  }

  /** Headline metrics for the date (rooms ordered, plates, skips, participation, per-slot). */
  async dashboard(actor: AdminJwtPayload, dateStr?: string) {
    const propertyId = this.requireActorProperty(actor);
    const serviceDate = await this.resolveDate(propertyId, dateStr);
    // Every figure below is REAL-only. participation_rate divides rooms_ordered by
    // checked_in_bookings, so the two must be drawn from the same population — mixing a test
    // order into the numerator while excluding test bookings from the denominator would report a
    // take-up rate that never happened. Test volume is reported separately instead.
    const [placed, skipped, plates, checkedIn, testOrders, slotSummary] = await Promise.all([
      this.prisma.breakfast_order.count({
        where: {
          property_id: propertyId,
          service_date: this.toDate(serviceDate),
          status: 'PLACED',
          is_test: false,
        },
      }),
      this.prisma.breakfast_order.count({
        where: {
          property_id: propertyId,
          service_date: this.toDate(serviceDate),
          status: 'SKIPPED',
          is_test: false,
        },
      }),
      this.prisma.breakfast_plate.count({
        where: {
          status: 'PLACED',
          breakfast_order: {
            property_id: propertyId,
            service_date: this.toDate(serviceDate),
            status: 'PLACED',
            is_test: false,
          },
        },
      }),
      this.prisma.ezee_booking_cache.count({
        // Real checked-in bookings only: this is the participation denominator, and a test
        // booking would silently deflate the kitchen's take-up rate for as long as it exists.
        where: { property_id: propertyId, is_active: true, status: 'CHECKED_IN', is_test: false },
      }),
      this.prisma.breakfast_order.count({
        where: {
          property_id: propertyId,
          service_date: this.toDate(serviceDate),
          status: 'PLACED',
          is_test: true,
        },
      }),
      this.slotSummary(actor, serviceDate),
    ]);
    return {
      service_date: serviceDate,
      rooms_ordered: placed,
      plates_ordered: plates,
      skipped,
      checked_in_bookings: checkedIn,
      participation_rate: checkedIn > 0 ? Math.round((placed / checkedIn) * 100) : null,
      /** Test orders for the date — excluded from every figure above. Normally 0. */
      test_orders: testOrders,
      slots: slotSummary.slots,
    };
  }

  /** Admin places/adjusts one room's order on a guest's behalf (bypasses the window). */
  async adminPlaceOrder(dto: AdminPlaceOrderDto, actor: AdminJwtPayload) {
    // `ezee_reservation_id` here is the ROOM key the roster emitted — a sub-booking id for a
    // multi-room reservation, the reservation id otherwise. Find the cache row that owns it.
    const key = dto.ezee_reservation_id;
    const cached = await this.prisma.$queryRaw<(CacheRow & { property_id: string })[]>`
      SELECT b.ezee_reservation_id, b.property_id, b.room_number, b.no_of_adults, b.no_of_guests,
             b.guest_id, b.checkout_date, b.ezee_room_guests_json
        FROM ezee_booking_cache b
       WHERE b.ezee_reservation_id = ${key}
          OR EXISTS (
               SELECT 1
                 FROM jsonb_array_elements(coalesce(b.ezee_room_guests_json, '[]'::jsonb)) rg
                WHERE rg->>'sub_id' = ${key}
             )
       LIMIT 1`;
    const booking = cached[0];
    if (!booking) throw new NotFoundException('Booking not found');
    this.assertManages(actor, booking.property_id);
    if (!(await this.isEnabled(booking.property_id))) {
      throw new BadRequestException('Breakfast is turned off for this property');
    }
    if (booking.checkout_date && this.fromDate(booking.checkout_date) < dto.service_date) {
      throw new BadRequestException('Guest is not staying on that breakfast date');
    }

    const rooms = this.expandRooms(booking);
    const room =
      rooms.find((r) => r.sub_booking_id === key) ?? (rooms.length === 1 ? rooms[0] : undefined);
    if (!room) {
      throw new BadRequestException({
        ok: false,
        error: 'room_required',
        message:
          'That reservation has several rooms — send the room key from GET /admin/breakfast/bookings, not the reservation id',
        rooms: rooms.map((r) => ({ ezee_reservation_id: r.sub_booking_id, room_number: r.room_number })),
      });
    }
    const plates = (dto.plates ?? []).map((p) => ({
      slot_id: p.slot_id,
      items: (p.items ?? [])
        .filter((i) => i && i.menu_item_id)
        .map((i) => ({ menu_item_id: i.menu_item_id, qty: Math.max(1, i.qty ?? 1) })),
      special_requests: p.special_requests ?? null,
    }));
    // Fail loudly rather than silently downgrading an ORDER to a SKIP — an explicit ORDER
    // with no plates is almost always a caller sending the OLD {slot_id, items} shape (the
    // payload is now per-plate: { plates: [{ slot_id, items }] }).
    if (dto.action === 'ORDER' && plates.length === 0) {
      throw new BadRequestException(
        'action ORDER requires at least one plate — send { plates: [{ slot_id, items: [{ menu_item_id, qty }] }] }',
      );
    }
    const action: 'ORDER' | 'SKIP' = dto.action === 'SKIP' || plates.length === 0 ? 'SKIP' : 'ORDER';
    await this.writeRoomOrders({
      propertyId: booking.property_id,
      brand: await this.brandOfProperty(booking.property_id),
      serviceDate: dto.service_date,
      placedVia: 'ADMIN',
      rooms: [
        {
          eri: room.ezee_reservation_id,
          subId: room.sub_booking_id,
          guestId: room.guest_id,
          roomNumber: room.room_number,
          cap: room.cap,
          action,
          plates: action === 'ORDER' ? plates : [],
        },
      ],
    });
    const order = await this.prisma.breakfast_order.findUnique({
      where: {
        ezee_reservation_id_sub_booking_id_service_date: {
          ezee_reservation_id: room.ezee_reservation_id,
          sub_booking_id: room.sub_booking_id,
          service_date: this.toDate(dto.service_date),
        },
      },
      include: ORDER_WITH_PLATES,
    });
    return { ok: true, order: order ? this.formatAdminOrder(order) : null };
  }
}
