import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../redis/cache.service';
import type { AdminJwtPayload } from '../../common/guards/admin-jwt.strategy';
import { phoneLast10, toIndianMsisdn } from '../../common/utils/phone.util';
import type { CreateTestBookingDto } from './dto/create-test-booking.dto';

@Injectable()
export class AdminBookingsService {
  private readonly logger = new Logger(AdminBookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // LIST ALL BOOKINGS (dashboard)
  // ═══════════════════════════════════════════════════════════════════════════

  async listBookings(
    actor: AdminJwtPayload,
    filters?: { status?: string; property_id?: string; page?: number; limit?: number },
  ) {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    // The active property bound at login wins. If a filter is passed and the
    // admin has access to it, it overrides the active selection (lets owners
    // peek into another of their properties without a switch round-trip).
    if (filters?.property_id) {
      if (!actor.property_ids.includes(filters.property_id)) {
        throw new ForbiddenException('You are not authorised for this property');
      }
      where.property_id = filters.property_id;
    } else if (actor.property_id) {
      where.property_id = actor.property_id;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    const [bookings, total] = await Promise.all([
      this.prisma.ezee_booking_cache.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          guests: { select: { id: true, name: true, email: true, phone: true } },
          properties: { select: { id: true, name: true } },
          payments: {
            select: { id: true, amount: true, status: true, purpose: true, razorpay_order_id: true, created_at: true },
            orderBy: { created_at: 'desc' },
            take: 1,
          },
          booking_guest_access: {
            select: { guest_id: true, role: true, status: true },
          },
        },
      }),
      this.prisma.ezee_booking_cache.count({ where }),
    ]);

    return {
      bookings: bookings.map((b) => ({
        ezee_reservation_id: b.ezee_reservation_id,
        property: b.properties ? { id: b.properties.id, name: b.properties.name } : null,
        guest: b.guests ? { id: b.guests.id, name: b.guests.name, email: b.guests.email, phone: b.guests.phone } : null,
        room_type_name: b.room_type_name,
        room_number: b.room_number,
        checkin_date: b.checkin_date,
        checkout_date: b.checkout_date,
        no_of_guests: b.no_of_guests,
        source: b.source,
        status: b.status,
        is_active: b.is_active,
        // Admin-made test booking (no real guest, no room sold). Listed like any other so it can
        // be found and cleaned up; tagged so it's never mistaken for business.
        is_test: b.is_test,
        created_at: b.created_at,
        latest_payment: b.payments[0] ?? null,
        guest_count: b.booking_guest_access.length,
      })),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BOOKING DETAIL (with addons)
  // ═══════════════════════════════════════════════════════════════════════════

  async getBookingDetail(eri: string, actor: AdminJwtPayload) {
    const booking = await this.prisma.ezee_booking_cache.findUnique({
      where: { ezee_reservation_id: eri },
      include: {
        guests: { select: { id: true, name: true, email: true, phone: true } },
        properties: { select: { id: true, name: true, city: true } },
        booking_guest_access: {
          include: {
            guests_booking_guest_access_guest_idToguests: {
              select: { id: true, name: true, email: true, phone: true },
            },
          },
        },
        booking_slots: {
          orderBy: { slot_number: 'asc' },
          include: {
            guests: { select: { id: true, name: true } },
          },
        },
        payments: {
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            amount: true,
            currency: true,
            purpose: true,
            status: true,
            razorpay_order_id: true,
            razorpay_payment_id: true,
            created_at: true,
            updated_at: true,
          },
        },
        addon_orders: {
          include: {
            addon_order_items: {
              include: {
                product_catalog: { select: { id: true, name: true, category: true } },
              },
            },
          },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!booking) throw new NotFoundException(`Booking "${eri}" not found`);

    if (!actor.property_ids.includes(booking.property_id)) {
      throw new ForbiddenException('You do not have access to this booking');
    }

    return {
      ezee_reservation_id: booking.ezee_reservation_id,
      property: booking.properties,
      booker: booking.guests,
      booker_email: booking.booker_email,
      booker_phone: booking.booker_phone,
      room_type_name: booking.room_type_name,
      room_number: booking.room_number,
      checkin_date: booking.checkin_date,
      checkout_date: booking.checkout_date,
      no_of_guests: booking.no_of_guests,
      source: booking.source,
      status: booking.status,
      is_active: booking.is_active,
      created_at: booking.created_at,
      guests: booking.booking_guest_access.map((a) => ({
        guest: a.guests_booking_guest_access_guest_idToguests,
        role: a.role,
        status: a.status,
      })),
      slots: booking.booking_slots.map((s) => ({
        slot_number: s.slot_number,
        label: s.label,
        guest: s.guests ? { id: s.guests.id, name: s.guests.name } : null,
        kyc_status: s.kyc_status,
      })),
      payments: booking.payments,
      addon_orders: booking.addon_orders.map((o) => ({
        id: o.id,
        phase: o.phase,
        status: o.status,
        created_at: o.created_at,
        items: o.addon_order_items.map((i) => ({
          product: i.product_catalog,
          quantity: i.quantity,
          unit_price: Number(i.unit_price),
          total_price: Number(i.total_price),
          unit_code: i.unit_code,
        })),
      })),
    };
  }

  // ─── Cache management ─────────────────────────────────────────────────────

  async flushRoomCache(propertyId: string): Promise<{ flushed: string[] }> {
    const catalogKey = CacheService.catalogKey(propertyId);
    await this.cache.del(catalogKey);
    this.logger.log(`Admin flushed room catalog cache for property ${propertyId}`);
    return { flushed: [catalogKey] };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST BOOKINGS
  //
  // A test booking lets us drive the guest flows (WhatsApp front door, breakfast) against a LIVE
  // property without occupying a sellable room. It is a normal ezee_booking_cache row in every
  // respect except `is_test`, which taints its side effects: it is never synced to eZee, its
  // tickets reach only test staff, it provisions no lock PIN, and it stays out of every reported
  // figure. See docs/setup/test_bookings.md.
  // ═══════════════════════════════════════════════════════════════════════════

  /** ERIs are prefixed so a test booking is recognisable on sight, in logs and in Zoho. */
  private static readonly TEST_ERI_PREFIX = 'TEST-';

  async createTestBooking(dto: CreateTestBookingDto, actor: AdminJwtPayload) {
    const propertyId = dto.property_id.trim();
    if (!actor.property_ids?.includes(propertyId)) {
      throw new ForbiddenException({
        ok: false,
        error: 'not_authorised_for_property',
        message: `You are not assigned to property ${propertyId}`,
      });
    }
    const property = await this.prisma.properties.findUnique({
      where: { id: propertyId },
      select: { id: true, name: true, brand: true },
    });
    if (!property) {
      throw new NotFoundException({ ok: false, error: 'property_not_found', property_id: propertyId });
    }

    const last10 = phoneLast10(dto.phone);
    const msisdn = toIndianMsisdn(dto.phone);
    if (!last10 || !msisdn) {
      throw new BadRequestException({
        ok: false,
        error: 'invalid_phone',
        message: 'phone must contain at least 10 digits',
      });
    }

    // Refuse to shadow a real guest. resolveCheckedInGuest matches on the last 10 digits and takes
    // the LATEST check-in (ORDER BY checkin_date DESC LIMIT 1), so a test booking on a number that
    // already belongs to a live stay would hijack that guest's WhatsApp thread — their requests
    // would be filed against a fake room and routed to test staff who don't exist. Never allow it.
    const realBooking = await this.prisma.$queryRaw<{ ezee_reservation_id: string }[]>`
      SELECT b.ezee_reservation_id
        FROM ezee_booking_cache b
        LEFT JOIN guests g ON g.id = b.guest_id
       WHERE b.is_active = true
         AND b.status = 'CHECKED_IN'
         AND b.is_test = false
         AND (
              right(regexp_replace(coalesce(g.phone, ''), '[^0-9]', '', 'g'), 10) = ${last10}
           OR right(regexp_replace(coalesce(b.booker_phone, ''), '[^0-9]', '', 'g'), 10) = ${last10}
         )
       LIMIT 1`;
    if (realBooking.length > 0) {
      throw new ConflictException({
        ok: false,
        error: 'phone_belongs_to_real_booking',
        message:
          'That number is currently checked in on a real booking. A test booking would hijack ' +
          'their WhatsApp thread. Use a different number.',
        ezee_reservation_id: realBooking[0].ezee_reservation_id,
      });
    }

    // The front door discards a booking whose guest can't be identified (it needs a guests row to
    // hang the conversation on), so a test booking always has one. guests.phone is UNIQUE — reuse
    // the existing profile rather than colliding on it.
    const existingGuest = await this.prisma.guests.findFirst({
      where: { phone: msisdn },
      select: { id: true, name: true },
    });
    const guestId = existingGuest?.id ?? uuidv4();
    if (!existingGuest) {
      await this.prisma.guests.create({
        data: {
          id: guestId,
          name: dto.guest_name?.trim() || 'Test Guest',
          phone: msisdn,
          phone_verified: true,
        },
      });
    }

    const rooms = dto.rooms?.map((r) => r.trim()).filter(Boolean) ?? [];
    const primaryRoom = rooms[0] ?? dto.room_number?.trim() ?? 'Test-101';
    const eri = `${AdminBookingsService.TEST_ERI_PREFIX}${propertyId}-${Date.now()}`;
    const now = new Date();
    const checkout = new Date(now.getTime() + 30 * 24 * 60 * 60_000); // far enough out to not expire mid-test

    // A group booking is ONE cache row carrying a BookingTran per room, so several rooms means
    // ezee_room_guests_json — that json is what resolveCheckedInGuest aggregates into roomNumbers,
    // and therefore what triggers the "which room is this for?" prompt.
    const roomGuests = rooms.length
      ? rooms.map((room, i) => ({
          sub_id: `${eri}-${i + 1}`,
          room_number: room,
          room_type: 'Test',
          name: dto.guest_name?.trim() || 'Test Guest',
          email: null,
          phone: msisdn,
          guest_id: guestId,
        }))
      : null;

    const booking = await this.prisma.ezee_booking_cache.create({
      data: {
        ezee_reservation_id: eri,
        property_id: propertyId,
        guest_id: guestId,
        booker_phone: msisdn,
        room_type_name: 'Test',
        room_number: primaryRoom,
        checkin_date: now,
        checkout_date: checkout,
        no_of_guests: rooms.length || 1,
        no_of_adults: rooms.length || 1,
        source: 'TEST',
        status: 'CHECKED_IN',
        is_active: true,
        is_test: true,
        // Non-null so the row can never match reconcileUnsyncedBookings' selector
        // (status=CONFIRMED + ezee_reservation_no IS NULL), which queues a real InsertBooking to
        // the live PMS. That pass already filters is_test, but this booking must not depend on a
        // single filter staying correct to avoid creating a real reservation.
        ezee_reservation_no: `TEST-${Date.now()}`,
        // Left null on purpose: the dashboard adds folio_total_after_tax straight into reported
        // revenue for any booking without a captured payment.
        folio_total_after_tax: null,
        fetched_at: now, // NOT NULL, no DB default
        ...(roomGuests ? { ezee_room_guests_json: roomGuests } : {}),
      },
    });

    this.logger.warn(
      `TEST booking created by admin ${actor.admin_id}: ${eri} at ${propertyId} (${property.brand}) ` +
        `rooms=[${rooms.length ? rooms.join(', ') : primaryRoom}] phone=***${last10.slice(-4)}`,
    );

    return {
      ok: true,
      ezee_reservation_id: booking.ezee_reservation_id,
      property_id: propertyId,
      brand: property.brand,
      guest_id: guestId,
      rooms: rooms.length ? rooms : [primaryRoom],
      room_number: primaryRoom,
      checkout_date: checkout,
      note:
        'Message the WhatsApp number for this brand from the phone above to drive the bot. ' +
        'Requests are handled by REAL staff and escalate normally — they identify the test by the ' +
        `"${primaryRoom}" room number. Close the ticket out when done, or it will escalate to ` +
        'managers and owners like any ignored request.',
    };
  }

  async listTestBookings(actor: AdminJwtPayload) {
    const rows = await this.prisma.ezee_booking_cache.findMany({
      where: { is_test: true, property_id: { in: actor.property_ids ?? [] } },
      orderBy: { created_at: 'desc' },
      select: {
        ezee_reservation_id: true,
        property_id: true,
        room_number: true,
        booker_phone: true,
        status: true,
        is_active: true,
        checkout_date: true,
        created_at: true,
        ezee_room_guests_json: true,
      },
    });
    return { count: rows.length, bookings: rows };
  }

  /**
   * Hard-delete a test booking and everything hanging off it.
   *
   * Every FK into ezee_booking_cache is ON DELETE NO ACTION, so children must go first and in
   * dependency order — the booking row cannot be removed while anything still points at it.
   * breakfast_plate (and its items) cascade from breakfast_order, so deleting the order is enough.
   */
  async deleteTestBooking(eri: string, actor: AdminJwtPayload) {
    const booking = await this.prisma.ezee_booking_cache.findUnique({
      where: { ezee_reservation_id: eri },
      select: { ezee_reservation_id: true, property_id: true, is_test: true, guest_id: true },
    });
    if (!booking) {
      throw new NotFoundException({ ok: false, error: 'booking_not_found', ezee_reservation_id: eri });
    }
    // The whole point of the flag: this endpoint can only ever destroy data it created. A real
    // booking is never deletable here, whatever the caller passes.
    if (!booking.is_test) {
      throw new ForbiddenException({
        ok: false,
        error: 'not_a_test_booking',
        message: 'Refusing to delete a real booking.',
      });
    }
    if (!actor.property_ids?.includes(booking.property_id)) {
      throw new ForbiddenException({ ok: false, error: 'not_authorised_for_property' });
    }

    const deleted = await this.purgeTestBookingRows(eri);

    this.logger.warn(`TEST booking ${eri} deleted by admin ${actor.admin_id}: ${JSON.stringify(deleted)}`);
    // The guests row is deliberately left behind: it may be shared with a prior real stay (phone is
    // UNIQUE, so we reuse rather than duplicate), and deleting it could orphan real history.
    return { ok: true, ezee_reservation_id: eri, deleted };
  }

  /**
   * Delete a test booking's children in dependency order, in one transaction.
   *
   * A leftover reference surfaces as Prisma P2003. That used to escape as a bare 500 saying
   * nothing; it is now re-thrown naming the constraint, so the next un-cleared table can be
   * read straight off the response instead of dug out of CloudWatch.
   */
  private async purgeTestBookingRows(eri: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const orders = await tx.breakfast_order.deleteMany({ where: { ezee_reservation_id: eri } });
        const tokens = await tx.breakfast_access_token.deleteMany({ where: { ezee_reservation_id: eri } });

        // The WhatsApp request rows and the CSAT rows both hang off zoho_ticket_ref and must go
        // FIRST. wa_service_request.ticket_id is a real FK (ON DELETE NO ACTION, added in
        // 20260619000001 but never mirrored into schema.prisma, so it isn't visible on the model)
        // — which meant every test ticket raised over WhatsApp, i.e. all of them, failed this
        // whole delete with P2003. ticket_feedback carries no FK so it never blocked, but it
        // points at the same tickets and would otherwise be left orphaned.
        const ticketIds = (
          await tx.zoho_ticket_ref.findMany({
            where: { ezee_reservation_id: eri },
            select: { id: true },
          })
        ).map((t) => t.id);
        const requests = await tx.wa_service_request.deleteMany({
          where: { OR: [{ ezee_reservation_id: eri }, { ticket_id: { in: ticketIds } }] },
        });
        const feedback = await tx.ticket_feedback.deleteMany({ where: { ticket_id: { in: ticketIds } } });

        const tickets = await tx.zoho_ticket_ref.deleteMany({ where: { ezee_reservation_id: eri } });
        const access = await tx.booking_guest_access.deleteMany({ where: { ezee_reservation_id: eri } });
        const checkins = await tx.checkin_records.deleteMany({ where: { ezee_reservation_id: eri } });
        await tx.ezee_booking_cache.delete({ where: { ezee_reservation_id: eri } });
        return {
          breakfast_orders: orders.count,
          breakfast_tokens: tokens.count,
          wa_service_requests: requests.count,
          ticket_feedback: feedback.count,
          tickets: tickets.count,
          guest_access: access.count,
          checkin_records: checkins.count,
        };
      });
    } catch (err) {
      const e = err as { code?: string; meta?: { field_name?: unknown } };
      if (e?.code !== 'P2003') throw err;
      const constraint = String(e.meta?.field_name ?? 'unknown constraint');
      this.logger.error(`TEST booking ${eri} delete blocked by ${constraint}`);
      throw new ConflictException({
        ok: false,
        error: 'booking_has_dependent_rows',
        constraint,
        message:
          `Cannot delete ${eri}: rows in another table still reference it (${constraint}). ` +
          'That table has to be cleared here before the booking can be removed.',
      });
    }
  }
}
