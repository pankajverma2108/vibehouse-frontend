import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { EzeeService } from './ezee.service';
import { phoneLast10 } from '../common/utils/phone.util';
import type {
  EzeeAutosyncReservation,
  EzeeAutosyncBookingTran,
} from './webhook/ezee-autosync.types';

/** One room of a (possibly multi-room) eZee reservation, with the guest eZee holds for it. */
export interface EzeeRoomGuest {
  sub_id: string;
  room_number: string | null;
  room_type: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  /** Adults eZee holds against THIS room (RentalInfo.Adult). The cache row carries only one
   * occupancy figure for the whole reservation, so this is the only per-room head count we get —
   * it's what caps a room's breakfast plates. */
  adults: number | null;
  /**
   * The `guests` row this sub-booking's occupant resolved to. This — not `phone` — is what pins a
   * WhatsApp sender to their room: eZee often carries only a name + email per BookingTran and puts
   * one mobile on the reservation, so keying the room off `phone` silently falls back to
   * BookingTran[0]'s room and every co-guest gets told they're in the same room.
   */
  guest_id: string | null;
}

/**
 * Per-room guest identity for eZee reservations.
 *
 * A multi-room booking arrives as ONE reservation (UniqueID) carrying one BookingTran per room
 * ("107-1" room 206, "107-2" room 207), each with its own guest and mobile — and we cache it as a
 * single row. Everything past BookingTran[0] used to be dropped, so the second room's guest was
 * unknown to us: their WhatsApp number matched nobody and the front door treated an in-house guest
 * as a stranger, while the booker got greeted with the other room's number and name.
 *
 * Shared by the autosync worker (push) and the admin resync endpoint (pull), so both build the
 * snapshot and link guests exactly the same way.
 */
@Injectable()
export class EzeeRoomGuestsService {
  private readonly logger = new Logger(EzeeRoomGuestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ezee: EzeeService,
  ) {}

  /**
   * Flatten a reservation's BookingTrans into one entry per room, keeping the guest eZee holds
   * against THAT sub-booking. Trans with neither a room nor a contact are dropped.
   */
  buildRoomGuests(reservation: EzeeAutosyncReservation): EzeeRoomGuest[] {
    return (reservation?.BookingTran ?? [])
      .map((t, i) => ({
        sub_id: t?.SubBookingId ?? `${reservation?.UniqueID ?? ''}-${i + 1}`,
        room_number: t?.RoomName && t.RoomName.length > 0 ? t.RoomName : null,
        room_type: t?.RoomTypeName ?? null,
        name: [t?.FirstName, t?.LastName].filter(Boolean).join(' ').trim() || null,
        email: t?.Email ?? null,
        phone: t?.Mobile ?? t?.Phone ?? null,
        adults: this.adultsOf(t),
        guest_id: null, // stamped by linkSubBookingGuests once the occupant is resolved
      }))
      .filter((r) => r.room_number || r.phone || r.email);
  }

  /** Adults on a sub-booking. RentalInfo is one entry PER NIGHT, so take the largest. */
  private adultsOf(t: EzeeAutosyncBookingTran | undefined): number | null {
    const counts = (t?.RentalInfo ?? [])
      .map((r) => Number(r?.Adult))
      .filter((n) => Number.isFinite(n) && n > 0);
    return counts.length ? Math.max(...counts) : null;
  }

  /**
   * Resolve each room's occupant, stamp their guest id onto the snapshot, then persist it.
   * The linking has to happen BEFORE the write — the guest id is what lets us map an inbound
   * WhatsApp number back to the right room.
   */
  async applyRoomGuests(
    eri: string,
    roomGuests: EzeeRoomGuest[],
    bookingGuestId: string | null,
    /**
     * 'replace' — the caller has the reservation's COMPLETE room list (a FetchSingleBooking pull).
     * 'merge'   — the caller may only have SOME of its rooms. eZee pushes a multi-room booking as
     *             one message per room, so a blind write would leave the snapshot holding only
     *             whichever room arrived last. Merge on sub_id and keep the rooms not mentioned.
     */
    mode: 'replace' | 'merge' = 'replace',
  ): Promise<{ rooms: number; linked: string[] }> {
    if (roomGuests.length === 0) return { rooms: 0, linked: [] };

    const linked = await this.linkSubBookingGuests(eri, roomGuests, bookingGuestId);
    const next = mode === 'merge' ? await this.mergeSnapshot(eri, roomGuests) : roomGuests;

    await this.prisma.ezee_booking_cache.update({
      where: { ezee_reservation_id: eri },
      data: { ezee_room_guests_json: next as unknown as Prisma.InputJsonValue },
    });

    return { rooms: next.length, linked };
  }

  /** Existing snapshot ∪ incoming rooms, keyed on sub_id (incoming wins). */
  private async mergeSnapshot(eri: string, incoming: EzeeRoomGuest[]): Promise<EzeeRoomGuest[]> {
    const row = await this.prisma.ezee_booking_cache.findUnique({
      where: { ezee_reservation_id: eri },
      select: { ezee_room_guests_json: true },
    });
    const existing = Array.isArray(row?.ezee_room_guests_json)
      ? (row!.ezee_room_guests_json as unknown as EzeeRoomGuest[])
      : [];

    const bySub = new Map<string, EzeeRoomGuest>();
    for (const rg of existing) if (rg?.sub_id) bySub.set(rg.sub_id, rg);
    for (const rg of incoming) bySub.set(rg.sub_id, rg);
    return [...bySub.values()].sort((a, b) => a.sub_id.localeCompare(b.sub_id));
  }

  /**
   * Ensure each room's occupant exists in `guests`, holds APPROVED access to the reservation, and
   * is stamped onto its snapshot entry (mutates `roomGuests` in place). Without this, the guest in
   * room 2 has no identity here: their WhatsApp number resolves to nobody and the service front
   * door treats an in-house guest as a prospect. Returns the guest ids newly granted access.
   */
  async linkSubBookingGuests(
    eri: string,
    roomGuests: EzeeRoomGuest[],
    bookingGuestId: string | null,
  ): Promise<string[]> {
    const linked: string[] = [];
    for (const rg of roomGuests) {
      if (!rg.email && !rg.phone) continue;
      const guestId = rg.email
        ? await this.findOrCreateGuestByEmail(rg.email, rg.phone, rg.name)
        : await this.findOrCreateGuestByPhone(rg.phone, rg.name);
      if (!guestId) continue;
      rg.guest_id = guestId;
      // The booker is already PRIMARY on the booking — only rooms 2..n need a new grant.
      if (guestId === bookingGuestId) continue;
      await this.ensureAccess(eri, guestId, 'SECONDARY');
      linked.push(guestId);
    }
    return linked;
  }

  /**
   * Pull a reservation straight from eZee (FetchSingleBooking) and rebuild its room-guest
   * snapshot. This is the repair path for bookings cached BEFORE per-room capture existed —
   * eZee only pushes on state changes, so an in-house booking would otherwise stay broken for
   * the rest of the stay.
   */
  async resyncFromEzee(eri: string) {
    const booking = await this.prisma.ezee_booking_cache.findUnique({
      where: { ezee_reservation_id: eri },
      select: {
        ezee_reservation_id: true,
        ezee_reservation_no: true,
        property_id: true,
        guest_id: true,
      },
    });
    if (!booking) throw new NotFoundException(`No cached booking ${eri}`);

    const bookingId = booking.ezee_reservation_no ?? booking.ezee_reservation_id;
    const reservation = (await this.ezee.fetchBooking(
      booking.property_id,
      bookingId,
    )) as EzeeAutosyncReservation | null;
    if (!reservation) {
      throw new NotFoundException(`eZee returned no reservation for BookingId=${bookingId}`);
    }

    const roomGuests = this.buildRoomGuests(reservation);
    const applied = await this.applyRoomGuests(eri, roomGuests, booking.guest_id);
    this.logger.log(
      `resync ${eri}: ${applied.rooms} room(s), ${applied.linked.length} sub-guest(s) linked`,
    );
    return {
      ezee_reservation_id: eri,
      ezee_booking_id: bookingId,
      rooms: roomGuests,
      sub_guests_linked: applied.linked.length,
    };
  }

  /**
   * What eZee holds vs what we hold, side by side. The per-room `phone` in `ezee` is the field
   * everything depends on — if eZee leaves it blank on the 2nd..nth room, no amount of parsing
   * will make that guest recognisable and the number has to come from somewhere else.
   */
  async inspect(eri: string) {
    const booking = await this.prisma.ezee_booking_cache.findUnique({
      where: { ezee_reservation_id: eri },
      select: {
        ezee_reservation_id: true,
        ezee_reservation_no: true,
        property_id: true,
        guest_id: true,
        room_number: true,
        booker_phone: true,
        booker_email: true,
        status: true,
        is_active: true,
        ezee_sub_reservation_nos: true,
        ezee_room_guests_json: true,
      },
    });
    if (!booking) throw new NotFoundException(`No cached booking ${eri}`);

    const access = await this.prisma.booking_guest_access.findMany({
      where: { ezee_reservation_id: eri },
      select: {
        role: true,
        status: true,
        guests_booking_guest_access_guest_idToguests: {
          select: { id: true, name: true, phone: true, secondary_phone: true },
        },
      },
    });

    let ezeeRooms: EzeeRoomGuest[] | null = null;
    let ezeeError: string | null = null;
    try {
      const bookingId = booking.ezee_reservation_no ?? booking.ezee_reservation_id;
      const reservation = (await this.ezee.fetchBooking(
        booking.property_id,
        bookingId,
      )) as EzeeAutosyncReservation | null;
      ezeeRooms = reservation ? this.buildRoomGuests(reservation) : null;
    } catch (err) {
      ezeeError = (err as Error).message;
    }

    return {
      cached: booking,
      access: access.map((a) => ({
        role: a.role,
        status: a.status,
        guest: a.guests_booking_guest_access_guest_idToguests,
      })),
      ezee: ezeeRooms,
      ezee_error: ezeeError,
    };
  }

  // ─── guest identity ────────────────────────────────────────────────────────

  /**
   * Email is the primary identity key (docs/setup/guest-matching-policy.md). Reuse the guest that
   * owns the email; otherwise create a shell. A phone that another guest already owns goes to the
   * secondary slot so the unique constraint on `guests.phone` can't trip.
   */
  async findOrCreateGuestByEmail(
    email: string | null,
    phone: string | null,
    name: string | null,
  ): Promise<string | null> {
    if (!email || email.length === 0) return null;

    const existing = await this.prisma.guests.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true, phone: true, secondary_phone: true },
    });

    if (existing) {
      // Registered guest has p1, the eZee push carries p2 — keep p2 as an alternative contact
      // rather than overwriting a verified primary.
      const incoming = phoneLast10(phone ?? '');
      const current = phoneLast10(existing.phone ?? '');
      if (incoming && incoming !== current && !existing.secondary_phone) {
        await this.prisma.guests.update({
          where: { id: existing.id },
          data: { secondary_phone: phone },
        });
      }
      return existing.id;
    }

    let primaryPhone: string | null = phone;
    let secondaryPhone: string | null = null;
    if (phone && (await this.guestIdByPhone(phone))) {
      primaryPhone = null;
      secondaryPhone = phone;
    }

    try {
      const created = await this.prisma.guests.create({
        data: {
          id: uuidv4(),
          name: name ?? 'Guest',
          email,
          phone: primaryPhone,
          secondary_phone: secondaryPhone,
        },
      });
      return created.id;
    } catch (err) {
      // Race: a concurrent push created the same email row between findFirst and create.
      const fallback = await this.prisma.guests.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true },
      });
      if (fallback) return fallback.id;
      this.logger.warn(`shell guest create failed for email: ${(err as Error).message}`);
      return null;
    }
  }

  /** Phone-keyed shell guest, for a sub-booking eZee gave a mobile but no email for. */
  async findOrCreateGuestByPhone(
    phone: string | null,
    name: string | null,
  ): Promise<string | null> {
    if (!phoneLast10(phone ?? '')) return null;

    const existing = await this.guestIdByPhone(phone!);
    if (existing) return existing;

    try {
      const created = await this.prisma.guests.create({
        data: { id: uuidv4(), name: name ?? 'Guest', phone },
      });
      return created.id;
    } catch (err) {
      const fallback = await this.guestIdByPhone(phone!);
      if (fallback) return fallback;
      this.logger.warn(`shell guest create failed for phone: ${(err as Error).message}`);
      return null;
    }
  }

  /** Match on the last 10 digits — eZee formats vary ("+91 …", "91…", bare 10-digit). */
  private async guestIdByPhone(phone: string): Promise<string | null> {
    const last10 = phoneLast10(phone);
    if (!last10) return null;
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM guests
      WHERE right(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'), 10) = ${last10}
         OR right(regexp_replace(coalesce(secondary_phone, ''), '[^0-9]', '', 'g'), 10) = ${last10}
      LIMIT 1
    `;
    return rows[0]?.id ?? null;
  }

  async ensureAccess(eri: string, guestId: string, role: 'PRIMARY' | 'SECONDARY'): Promise<void> {
    const existing = await this.prisma.booking_guest_access.findFirst({
      where: { ezee_reservation_id: eri, guest_id: guestId },
      select: { id: true },
    });
    if (existing) return;
    await this.prisma.booking_guest_access.create({
      data: {
        id: uuidv4(),
        ezee_reservation_id: eri,
        guest_id: guestId,
        role,
        status: 'APPROVED',
        approved_by_guest_id: guestId,
        approved_at: new Date(),
      },
    });
  }
}
