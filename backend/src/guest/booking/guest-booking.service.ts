import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../redis/cache.service';
import { EzeeService } from '../../ezee/ezee.service';
import { CouponsService } from '../../coupons/coupons.service';
import { TaxService } from '../../tax/tax.service';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'node:crypto';
import type { CreateBookingOrderDto } from './dto/create-booking-order.dto';
import type { PreviewCouponDto } from './dto/preview-coupon.dto';
import type { Brand } from '../../common/property-resolver';

// ─── Occupancy limits ─────────────────────────────────────────────────────────
// Legacy per-unit ceiling kept from the original "booked units × 6" combined
// cap. Used as the fallback when a room type has no explicit occupancy config,
// so unconfigured properties keep their pre-existing behaviour exactly.
const LEGACY_MAX_ADULTS_PER_UNIT = 6;
const LEGACY_MAX_CHILDREN_PER_UNIT = 6;

interface OccupancyLimits {
  base_adults: number;
  base_children: number;
  max_adults: number;
  max_children: number;
  // false when the room type has no explicit config and we fell back to the
  // legacy ceiling — lets the FE tell an authoritative eZee-synced cap apart
  // from a permissive default.
  configured: boolean;
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface ValidatedRoom {
  roomType: {
    id: string;
    name: string;
    base_price_per_night: number;
    ezee_room_type_id: string | null;
    ezee_rate_plan_id: string | null;
    ezee_rate_type_id: string | null;
    max_adults: number;
    max_children: number;
  };
  quantity: number;
  lineTotal: number;
  guests?: { first_name: string; last_name: string; gender?: string }[];
}

interface ValidatedAddon {
  product: { id: string; name: string; category: string; base_price: number };
  quantity: number;
  lineTotal: number;
}

// ─── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class GuestBookingService {
  private readonly logger = new Logger(GuestBookingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly ezee: EzeeService,
    private readonly coupons: CouponsService,
    private readonly tax: TaxService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // LOOKUP BOOKING (public, no auth — booking preview by ERI)
  // ═══════════════════════════════════════════════════════════════════════════

  async lookupBooking(bookingId: string) {
    const booking = await this.prisma.ezee_booking_cache.findFirst({
      where: { ezee_reservation_id: bookingId, is_active: true },
      include: { properties: { select: { name: true } } },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Intentionally exclude booker_email and booker_phone — this endpoint is public
    return {
      found: true,
      booking_id: booking.ezee_reservation_id,
      property_name: booking.properties?.name ?? 'The Daily Social',
      checkin_date: booking.checkin_date,
      checkout_date: booking.checkout_date,
      room_type_name: booking.room_type_name,
      status: booking.status,
      // SYNCED once the room lands in eZee; FAILED if the async insert terminally
      // failed (eZee down / out of inventory); PENDING while still finalizing.
      // The website polls this after payment to reassure the guest. See
      // deriveBookingSyncStatus + docs/FEtoBEHandoff/booking_sync_status_handoff.
      booking_sync_status: this.deriveBookingSyncStatus(booking),
      source: booking.source,
    };
  }

  /**
   * Derive the eZee sync state of a booking from the cache row.
   *
   *   SYNCED  — the room is in eZee (`ezee_reservation_no` set). Takes precedence
   *             so a successful DLQ redrive after a failure self-heals to SYNCED.
   *   FAILED  — the async InsertBooking terminally failed (`ezee_sync_failed_at`
   *             stamped on the last SQS attempt). Guest gets the reassurance copy.
   *   PENDING — payment captured / booking confirmed, still finalizing in eZee.
   */
  private deriveBookingSyncStatus(booking: {
    ezee_reservation_no: string | null;
    ezee_sync_failed_at: Date | null;
  }): 'SYNCED' | 'FAILED' | 'PENDING' {
    if (booking.ezee_reservation_no) return 'SYNCED';
    if (booking.ezee_sync_failed_at) return 'FAILED';
    return 'PENDING';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LINK BOOKING (existing ERI → guest)
  // ═══════════════════════════════════════════════════════════════════════════

  async linkBooking(guestId: string, eri: string) {
    const booking = await this.findBookingOrThrow(eri);

    // Already linked?
    const existingAccess = await this.prisma.booking_guest_access.findFirst({
      where: { ezee_reservation_id: eri, guest_id: guestId },
    });

    if (existingAccess) {
      const slots = await this.ensureSlots(eri, guestId, booking.no_of_guests ?? 1);
      return {
        message: 'Already linked to this booking',
        access: { role: existingAccess.role, status: existingAccess.status },
        booking: this.formatBooking(booking),
        slots: slots.map(this.formatSlot),
      };
    }

    // Determine role
    const guest = await this.prisma.guests.findUnique({
      where: { id: guestId },
      select: { email: true, phone: true },
    });

    const isBookerMatch =
      (guest?.email && guest.email === booking.booker_email) ||
      (guest?.phone && guest.phone === booking.booker_phone);

    const role = isBookerMatch ? 'PRIMARY' : 'SECONDARY';

    // Create access
    const access = await this.prisma.booking_guest_access.create({
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

    this.logger.log(`Guest ${guestId} linked to ${eri} as ${role}`);

    // Ensure slots exist and assign guest to first unassigned
    const slots = await this.ensureSlots(eri, guestId, booking.no_of_guests ?? 1);

    return {
      message: `Successfully linked as ${role}`,
      access: { role: access.role, status: access.status },
      booking: this.formatBooking(booking),
      slots: slots.map(this.formatSlot),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MY BOOKINGS
  // ═══════════════════════════════════════════════════════════════════════════

  async getMyBookings(guestId: string, brand: Brand) {
    // Brand-scoped: only return bookings whose property belongs to the brand
    // the guest is currently authenticating under. Same guest on TDS frontend
    // sees TDS bookings; on Buteak frontend, only Buteak bookings.
    const accesses = await this.prisma.booking_guest_access.findMany({
      where: {
        guest_id: guestId,
        status: 'APPROVED',
        ezee_booking_cache: {
          properties: { brand },
        },
      },
      include: { ezee_booking_cache: true },
      orderBy: { created_at: 'desc' },
    });

    // Today at midnight UTC — used for bucket date comparisons. Booking
    // dates are stored as @db.Date so they land as UTC midnight.
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    return Promise.all(
      accesses.map(async (access) => {
        const booking = access.ezee_booking_cache;
        const slots = await this.prisma.booking_slots.findMany({
          where: { ezee_reservation_id: access.ezee_reservation_id },
        });

        const bookingStatus = booking.status ?? 'CONFIRMED';
        return {
          ezee_reservation_id: access.ezee_reservation_id,
          role: access.role,
          // Booking status sourced from ezee_booking_cache, kept fresh by
          // the eZee autosync webhook worker. Values: PENDING_PAYMENT,
          // CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELLED, NO_SHOW.
          status: bookingStatus,
          is_active: booking.is_active,
          // Server-computed bucket so the FE doesn't have to mirror our
          // status semantics. Drives the UPCOMING / ACTIVE / PAST tabs.
          bucket: this.bookingBucket(bookingStatus, booking.checkin_date, booking.checkout_date, today),
          // Backwards-compat: previous `status` was the access linkage state
          // (always 'APPROVED' since we filter on it). Renamed so FE can
          // tell the two apart if needed.
          access_status: access.status,
          room_type_name: booking.room_type_name,
          room_number: booking.room_number,
          checkin_date: booking.checkin_date,
          checkout_date: booking.checkout_date,
          property_id: booking.property_id,
          source: booking.source,
          // Lets the FE show "last synced X min ago" so guests can tell
          // whether they're seeing the latest state from eZee.
          last_updated_at: booking.fetched_at,
          total_slots: slots.length,
          kyc_completed_slots: slots.filter(
            (s) => s.kyc_status === 'PRE_VERIFIED' || s.kyc_status === 'VERIFIED',
          ).length,
        };
      }),
    );
  }

  /**
   * Server-side classification for the FE's UPCOMING / ACTIVE / PAST tabs.
   *
   * Status wins over dates when it's terminal — a CANCELLED booking with a
   * future check-in date still belongs in PAST (the guest's tab decision
   * should match what they see on the confirmation receipt, not a
   * not-yet-arrived date).
   */
  private bookingBucket(
    status: string,
    checkin: Date | null,
    checkout: Date | null,
    today: Date,
  ): 'UPCOMING' | 'ACTIVE' | 'PAST' {
    if (status === 'CANCELLED' || status === 'NO_SHOW' || status === 'CHECKED_OUT') {
      return 'PAST';
    }
    if (status === 'CHECKED_IN') {
      return 'ACTIVE';
    }
    // Pre-arrival status (PENDING_PAYMENT / CONFIRMED) → date-based.
    if (!checkin || !checkout) return 'UPCOMING';
    if (checkout < today) return 'PAST';
    if (checkin > today) return 'UPCOMING';
    return 'ACTIVE';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ROOM CATALOG  (no dates — all rooms regardless of availability)
  // Used by: GET /guest/booking/rooms?property_id=...
  // Frontend use: homepage room listing, before user selects dates
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Returns all active room types for a property — no date filter.
   * Source: eZee Vacation Rental ‘get_rooms’ API (all rooms unconditionally),
   * enriched with base prices, amenities, and descriptions from local DB.
   *
   * Use this for the homepage catalog / room listing page.
   * Use getRoomAvailability() when the guest has selected specific dates.
   */
  async getRoomCatalog(propertyId: string) {
    const cacheKey = CacheService.roomCatalogKey(propertyId);
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) {
      this.logger.debug(`Room catalog cache hit: ${cacheKey}`);
      return cached;
    }

    // ── eZee is source of truth for what room types exist ────────────────
    let ezeeRooms: { roomId: string; roomName: string; physicalRoomNos: string[] }[] = [];
    try {
      const catalog = await this.ezee.getPhysicalRooms(propertyId);
      ezeeRooms = catalog.rooms;
      this.logger.debug(`eZee get_rooms: ${catalog.rooms.length} room type(s)`);
    } catch (err) {
      this.logger.warn(`eZee get_rooms unavailable, falling back to DB: ${(err as Error).message}`);
    }

    // ── DB provides enrichment (slugs, amenities, pricing, type) ─────────
    // DB is the canonical source for what's bookable online; eZee just
    // provides physical_room_count. We iterate DB rows so that properties
    // with multiple rate plans per physical room (e.g. 61766's EP+CP pair
    // sharing one ezee_room_type_id) surface as separate, individually
    // selectable entries — each with its own id/slug/name.
    const dbRoomTypes = await this.prisma.room_types.findMany({
      where: { property_id: propertyId, is_active: true },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        beds_per_room: true,
        total_beds: true,
        base_price_per_night: true,
        floor_range: true,
        amenities: true,
        ezee_room_type_id: true,
        ezee_rate_plan_id: true,
        ezee_rate_type_id: true,
        base_adults: true,
        base_children: true,
        max_adults: true,
        max_children: true,
      },
    });
    const ezeeByRoomTypeId = new Map(ezeeRooms.map((r) => [r.roomId, r]));

    let roomTypes: any[];

    if (dbRoomTypes.length > 0) {
      roomTypes = dbRoomTypes.map((rt) => {
        const ez = rt.ezee_room_type_id ? ezeeByRoomTypeId.get(rt.ezee_room_type_id) : undefined;
        return {
          id: rt.id,
          name: rt.name,
          slug: rt.slug,
          type: rt.type,
          beds_per_room: rt.beds_per_room,
          total_beds: rt.total_beds,
          base_price_per_night: Number(rt.base_price_per_night),
          floor_range: rt.floor_range ?? undefined,
          amenities: (rt.amenities as string[]) ?? [],
          ezee_room_type_id: rt.ezee_room_type_id,
          ezee_rate_plan_id: rt.ezee_rate_plan_id,
          ezee_rate_type_id: rt.ezee_rate_type_id,
          occupancy_limits: this.resolveOccupancyLimits(rt),
          physical_room_count: ez?.physicalRoomNos.length ?? null,
          bookable_online: true,
          source: ezeeRooms.length > 0 ? 'db' : 'db_fallback',
        };
      });

      // Append any eZee rooms with no DB mapping (shown but not online-bookable).
      const dbRoomTypeIds = new Set(
        dbRoomTypes.map((r) => r.ezee_room_type_id).filter(Boolean) as string[],
      );
      for (const ezRoom of ezeeRooms) {
        if (dbRoomTypeIds.has(ezRoom.roomId)) continue;
        const nameLower = ezRoom.roomName.toLowerCase();
        roomTypes.push({
          id: ezRoom.roomId,
          name: ezRoom.roomName,
          slug: nameLower.replace(/\s+/g, '-'),
          type: nameLower.includes('dorm') ? 'DORM' : 'PRIVATE',
          beds_per_room: null,
          total_beds: ezRoom.physicalRoomNos.length,
          base_price_per_night: null,
          floor_range: null,
          amenities: [],
          ezee_room_type_id: ezRoom.roomId,
          ezee_rate_plan_id: null,
          ezee_rate_type_id: null,
          occupancy_limits: this.resolveOccupancyLimits(null),
          physical_room_count: ezRoom.physicalRoomNos.length,
          bookable_online: false,
          source: 'ezee_only',
        });
      }

      // Sort: priced rows ascending, null-priced (ezee_only) last
      roomTypes.sort((a, b) => {
        if (a.base_price_per_night === null) return 1;
        if (b.base_price_per_night === null) return -1;
        return a.base_price_per_night - b.base_price_per_night;
      });
    } else {
      throw new NotFoundException('No room types found for this property');
    }

    const result = { property_id: propertyId, room_types: roomTypes };
    await this.cache.set(cacheKey, result, CacheService.TTL_CATALOG);
    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ROOM AVAILABILITY  (dates required — live counts + rates for booking step)
  // Used by: GET /guest/booking/availability?property_id=...&checkin=...&checkout=...
  // Frontend use: date picker confirmed, before payment
  // ═══════════════════════════════════════════════════════════════════════════

  async getRoomAvailability(propertyId: string, checkinDate: string, checkoutDate: string) {
    // Check cache first
    const cacheKey = CacheService.roomAvailabilityKey(propertyId, checkinDate, checkoutDate);
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) {
      this.logger.debug(`Room availability cache hit: ${cacheKey}`);
      return cached;
    }

    const { noOfNights } = this.parseDateRange(checkinDate, checkoutDate);

    // Fetch the property's tax rate once — surfaced top-level on the
    // response so the FE can render "+X% tax" alongside each room rate
    // without a second call. Properties that don't exist still let the
    // room query below decide whether to 404.
    const propertyTax = await this.prisma.properties.findUnique({
      where: { id: propertyId },
      select: { tax_rate_pct: true },
    });
    const taxRatePct = propertyTax ? Number(propertyTax.tax_rate_pct) : 0;

    // ── DB enrichment map (keyed by ezee_room_type_id) ───────────────────
    // Explicit select keeps this safe if colive_price_month hasn't migrated yet.
    const dbRoomTypes = await this.prisma.room_types.findMany({
      where: { property_id: propertyId, is_active: true },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        total_beds: true,
        base_price_per_night: true,
        floor_range: true,
        amenities: true,
        ezee_room_type_id: true,
        ezee_rate_plan_id: true,
        ezee_rate_type_id: true,
        base_adults: true,
        base_children: true,
        max_adults: true,
        max_children: true,
      },
    });
    // Group DB rows by ezee_room_type_id. When >1 rate plan shares a
    // physical room (e.g. 61766's EP+CP pair), we disambiguate by
    // ezee_rate_plan_id so each eZee inventory row resolves to its own DB
    // identity (id/slug/name) — without that, both rate plans would
    // collapse onto the same DB row and the FE would see duplicate ids.
    const dbByEzeeId = new Map<string, typeof dbRoomTypes>();
    for (const r of dbRoomTypes) {
      if (!r.ezee_room_type_id) continue;
      const bucket = dbByEzeeId.get(r.ezee_room_type_id) ?? [];
      bucket.push(r);
      dbByEzeeId.set(r.ezee_room_type_id, bucket);
    }
    const resolveDbRow = (roomTypeId: string, ratePlanId: string) => {
      const candidates = dbByEzeeId.get(roomTypeId) ?? [];
      if (candidates.length <= 1) return candidates[0];
      return (
        candidates.find((c) => c.ezee_rate_plan_id === ratePlanId) ??
        // Defensive: if the rate plan ids don't match (eZee config drift),
        // fall back to the first candidate so the row is still bookable.
        candidates[0]
      );
    };

    // ── eZee: live rates and availability — source of truth ───────────────
    let ezeeInventory: { roomTypeId: string; roomTypeName: string; availability: number; ratePerNight: number; ratePlanId: string; rateTypeId: string }[] = [];
    let availabilitySource: 'ezee_live' | 'local_db_estimate' = 'ezee_live';

    try {
      const inventory = await this.ezee.getRoomInventory(propertyId, checkinDate, checkoutDate);
      ezeeInventory = inventory.rooms;
      this.logger.debug(
        `eZee RoomList: ${inventory.rooms.length} type(s) for ${checkinDate}→${checkoutDate}`,
      );
    } catch (err) {
      availabilitySource = 'local_db_estimate';
      this.logger.warn(`eZee unavailable, falling back to DB estimate: ${(err as Error).message}`);
    }

    let resultRoomTypes: any[];

    if (ezeeInventory.length > 0) {
      // ── eZee drives the list; DB enriches where a mapping exists ────────
      resultRoomTypes = ezeeInventory.map((room) => {
        const db = resolveDbRow(room.roomTypeId, room.ratePlanId);
        const available = room.availability;
        // || not ?? — eZee returns 0 for unconfigured rate plans, fall back to DB price
        const ratePerNight = room.ratePerNight || (db ? Number(db.base_price_per_night) : 0);
        const nameLower = room.roomTypeName.toLowerCase();

        return {
          id: db?.id ?? room.roomTypeId,
          name: db?.name ?? room.roomTypeName,
          slug: db?.slug ?? nameLower.replace(/\s+/g, '-'),
          type: db?.type ?? (nameLower.includes('dorm') ? 'DORM' : 'PRIVATE'),
          available_beds: available,
          inventory_state: available <= 0 ? 'sold_out' : available <= 2 ? 'limited' : 'available',
          base_price_per_night: ratePerNight,
          total_price: ratePerNight * noOfNights,
          amenities: (db?.amenities as string[]) ?? [],
          floor_range: db?.floor_range ?? undefined,
          ezee_room_type_id: room.roomTypeId,
          ezee_rate_plan_id: room.ratePlanId || db?.ezee_rate_plan_id,
          ezee_rate_type_id: room.rateTypeId || db?.ezee_rate_type_id,
          occupancy_limits: this.resolveOccupancyLimits(db),
          bookable_online: !!db,
          source: db ? 'db' : 'ezee_only',
        };
      });
      // Sort: cheapest first; rooms with rate=0 last
      resultRoomTypes.sort((a, b) => {
        if (!a.base_price_per_night) return 1;
        if (!b.base_price_per_night) return -1;
        return a.base_price_per_night - b.base_price_per_night;
      });
    } else if (dbRoomTypes.length > 0) {
      // ── eZee unavailable — DB-estimated availability ─────────────────────
      const { checkin, checkout } = this.parseDateRange(checkinDate, checkoutDate);
      const bookedMap = await this.getBookedBedsMap(propertyId, checkin, checkout, dbRoomTypes);
      resultRoomTypes = dbRoomTypes
        .sort((a, b) => Number(a.base_price_per_night) - Number(b.base_price_per_night))
        .map((rt) => {
          const available = Math.max(0, rt.total_beds - (bookedMap.get(rt.id) ?? 0));
          const ratePerNight = Number(rt.base_price_per_night);
          return {
            id: rt.id,
            name: rt.name,
            slug: rt.slug,
            type: rt.type,
            available_beds: available,
            inventory_state: available <= 0 ? 'sold_out' : available <= 2 ? 'limited' : 'available',
            base_price_per_night: ratePerNight,
            total_price: ratePerNight * noOfNights,
            amenities: (rt.amenities as string[]) ?? [],
            floor_range: rt.floor_range ?? undefined,
            ezee_room_type_id: rt.ezee_room_type_id,
            ezee_rate_plan_id: rt.ezee_rate_plan_id,
            ezee_rate_type_id: rt.ezee_rate_type_id,
            occupancy_limits: this.resolveOccupancyLimits(rt),
            bookable_online: true,
            source: 'db_fallback',
          };
        });
    } else {
      throw new NotFoundException('No room types found for this property');
    }

    const result = {
      property_id: propertyId,
      checkin_date: checkinDate,
      checkout_date: checkoutDate,
      no_of_nights: noOfNights,
      availability_source: availabilitySource,
      tax_rate_pct: taxRatePct,
      room_types: resultRoomTypes,
    };

    // Cache for 30 minutes
    await this.cache.set(cacheKey, result, CacheService.TTL_ROOM_AVAILABILITY);
    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE BOOKING ORDER
  // ═══════════════════════════════════════════════════════════════════════════

  async createBookingOrder(guestId: string, dto: CreateBookingOrderDto) {
    const { checkin, checkout, noOfNights } = this.parseDateRange(dto.checkin_date, dto.checkout_date);

    if (!dto.rooms || dto.rooms.length === 0) {
      throw new BadRequestException('At least one room selection is required');
    }

    const property = await this.prisma.properties.findUnique({ where: { id: dto.property_id } });
    if (!property) throw new NotFoundException('Property not found');

    // Invalidate cache so we get fresh availability before booking
    const cacheKey = CacheService.roomAvailabilityKey(dto.property_id, dto.checkin_date, dto.checkout_date);
    await this.cache.del(cacheKey);

    // Validate rooms (will fetch fresh data from eZee + DB)
    const availability = await this.getRoomAvailability(dto.property_id, dto.checkin_date, dto.checkout_date);
    const { validatedRooms, roomTotal, totalGuests, adults, children } =
      this.validateRoomSelections(
        dto.rooms, availability.room_types, noOfNights, dto.occupancy,
      );

    // Validate addons
    const { validatedAddons, addonTotal } = await this.validateAddonSelections(
      dto.addons ?? [], dto.property_id,
    );

    const subtotal = roomTotal + addonTotal;

    // Apply coupons (auto + optional code). Server is the source of truth for
    // discount; payment.service later reconciles the FE-passed grandTotal
    // against cache.discount_total to block tampering.
    const couponResult = await this.coupons.findApplicableForBooking({
      propertyId: dto.property_id,
      guestId,
      stayNights: noOfNights,
      subtotal,
      code: dto.coupon_code,
      skipAuto: dto.skip_auto_coupon === true,
    });
    const discountAuto = couponResult.auto?.discount ?? 0;
    const discountCode = couponResult.code?.discount ?? 0;
    const discountTotal = Math.min(subtotal, discountAuto + discountCode);
    const preTaxTotal = Math.max(0, subtotal - discountTotal);

    // Snapshot the property's tax rate at order-creation time so the booking
    // total stays stable even if ops edits the rate later (see TaxService).
    const taxBreakdown = this.tax.applyRate(preTaxTotal, Number(property.tax_rate_pct));
    const grandTotal = taxBreakdown.total_with_tax;

    const eri = this.generateERI(property.id);
    const roomTypeSummary = validatedRooms.map((r) => `${r.roomType.name} x${r.quantity}`).join(', ');

    // payment_token authenticates the subsequent /payment/* calls when the
    // booker has no guest JWT (anonymous BUTEAK flow). Always generated —
    // logged-in flows simply ignore it. 32-char hex = 128 bits, ~10^38
    // entropy; cleared on first CAPTURED webhook in PaymentService.
    const paymentToken = randomBytes(16).toString('hex');

    // Source string mirrors the brand; anonymous + logged-in bookings funnel
    // through the same path so this is the only place we set it.
    const sourceLabel = property.brand === 'BUTEAK' ? 'Buteak' : 'The Daily Social';

    // Persist everything in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Lock addon inventory rows before reserving — prevents two concurrent create-order
      // calls for the same last unit from both passing the stock check and both decrementing.
      for (const addon of validatedAddons) {
        if (addon.product.category !== 'COMMODITY') continue;

        const locked = await tx.$queryRawUnsafe<{ available_stock: number }[]>(
          `SELECT available_stock FROM inventory
           WHERE product_id = $1 AND property_id = $2 FOR UPDATE`,
          addon.product.id,
          dto.property_id,
        );

        const available = locked[0]?.available_stock ?? 0;
        if (available < addon.quantity) {
          throw new BadRequestException(
            `"${addon.product.name}" — requested ${addon.quantity} but only ${available} available`,
          );
        }
      }

      // Reserve addon inventory
      await this.reserveAddonInventory(tx, validatedAddons, dto.property_id);

      // Create booking cache
      await tx.ezee_booking_cache.create({
        data: {
          ezee_reservation_id: eri,
          property_id: dto.property_id,
          guest_id: guestId,
          room_type_name: roomTypeSummary,
          checkin_date: checkin,
          checkout_date: checkout,
          no_of_guests: totalGuests,
          source: sourceLabel,
          status: 'PENDING_PAYMENT',
          is_active: true,
          fetched_at: new Date(),
          no_of_adults: adults,
          no_of_children: children,
          payment_token: paymentToken,
          booking_rooms_json: validatedRooms.map((r) => ({
            room_type_id: r.roomType.id,
            ezee_room_type_id: r.roomType.ezee_room_type_id,
            ezee_rate_plan_id: r.roomType.ezee_rate_plan_id,
            ezee_rate_type_id: r.roomType.ezee_rate_type_id,
            quantity: r.quantity,
            price_per_night: Number(r.roomType.base_price_per_night),
            // Persisted so the eZee sync worker applies the SAME capacity-aware
            // split we return below — never overflowing a small unit.
            max_adults: r.roomType.max_adults,
            max_children: r.roomType.max_children,
            guests: r.guests ?? null,
          })),
          coupon_id_auto: couponResult.auto?.coupon.id ?? null,
          coupon_id_code: couponResult.code?.coupon.id ?? null,
          discount_total: discountTotal,
          tax_rate_pct: taxBreakdown.tax_rate_pct,
          tax_total: taxBreakdown.tax_amount,
        },
      });

      // Create guest access
      await tx.booking_guest_access.create({
        data: {
          id: uuidv4(),
          ezee_reservation_id: eri,
          guest_id: guestId,
          role: 'PRIMARY',
          status: 'APPROVED',
          approved_by_guest_id: guestId,
          approved_at: new Date(),
        },
      });

      // Create addon order if needed
      let addonOrderId: string | null = null;
      if (validatedAddons.length > 0) {
        addonOrderId = uuidv4();
        await tx.addon_orders.create({
          data: {
            id: addonOrderId,
            ezee_reservation_id: eri,
            guest_id: guestId,
            phase: 'BOOKING',
            status: 'PENDING',
          },
        });
        for (const addon of validatedAddons) {
          await tx.addon_order_items.create({
            data: {
              id: uuidv4(),
              addon_order_id: addonOrderId,
              product_id: addon.product.id,
              quantity: addon.quantity,
              unit_price: addon.product.base_price,
              total_price: addon.lineTotal,
            },
          });
        }
      }

      // Create booking slots
      await this.createBookingSlots(tx, eri, totalGuests, guestId);

      return { addonOrderId };
    });

    // Invalidate cache after booking so next caller gets fresh availability
    await this.cache.del(cacheKey);

    this.logger.log(`Booking order: ERI=${eri}, rooms=${roomTypeSummary}, total=₹${grandTotal}, occupancy=${adults}A/${children}C`);

    // Derive per-room split for the response so the FE can echo what backend
    // actually accepted. Expand `rooms[].quantity` into a flat list of booked
    // units, then distribute occupancy across the flat list. This is the
    // exact same distribution the eZee worker will apply at InsertBooking
    // time, so the FE and eZee folio agree.
    const flatUnits = validatedRooms.flatMap((r) =>
      Array.from({ length: r.quantity }, () => ({
        room_type_id: r.roomType.id,
        room_type_name: r.roomType.name,
        max_adults: r.roomType.max_adults,
        max_children: r.roomType.max_children,
      })),
    );
    // Capacity-aware split so a mixed booking (e.g. one 2BHK + one 1BHK) never
    // lands more guests in a unit than its physical cap. Same algorithm the
    // eZee sync worker runs off the persisted caps, so response and folio agree.
    const adultsAlloc = this.distributeCapped(adults, flatUnits.map((u) => u.max_adults));
    const childrenAlloc = this.distributeCapped(children, flatUnits.map((u) => u.max_children));
    const roomOccupancy = flatUnits.map((u, i) => ({
      room_type_id: u.room_type_id,
      room_type_name: u.room_type_name,
      room_index: i,
      adults: adultsAlloc[i],
      children: childrenAlloc[i],
      guest_count: adultsAlloc[i] + childrenAlloc[i],
    }));

    return {
      ezee_reservation_id: eri,
      property_id: dto.property_id,
      property_name: property.name,
      checkin_date: dto.checkin_date,
      checkout_date: dto.checkout_date,
      no_of_nights: noOfNights,
      total_guests: totalGuests,
      occupancy: { adults, children, guest_count: totalGuests },
      room_occupancy: roomOccupancy,
      rooms: validatedRooms.map((r) => ({
        room_type_id: r.roomType.id,
        room_type_name: r.roomType.name,
        quantity: r.quantity,
        price_per_night: r.roomType.base_price_per_night,
        line_total: r.lineTotal,
      })),
      addons: validatedAddons.map((a) => ({
        product_id: a.product.id,
        product_name: a.product.name,
        quantity: a.quantity,
        unit_price: a.product.base_price,
        line_total: a.lineTotal,
      })),
      subtotal_rooms: roomTotal,
      subtotal_addons: addonTotal,
      discount_total: discountTotal,
      pre_tax_total: preTaxTotal,
      tax_rate_pct: taxBreakdown.tax_rate_pct,
      tax_amount: taxBreakdown.tax_amount,
      coupons_applied: this.buildCouponsAppliedPayload(couponResult),
      coupon_errors: couponResult.errors,
      grand_total: grandTotal,
      addon_order_id: result.addonOrderId,
      payment_token: paymentToken,
      status: 'PENDING_PAYMENT',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FIND-OR-CREATE ANONYMOUS GUEST (BUTEAK only)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Resolves the guests row for an anonymous BUTEAK booking.
   *
   * Lookup order: email match → phone match → create new. If a match is found
   * we attach silently regardless of whether the row already has a password
   * (e.g. the same person also has a TDS account). The user explicitly chose
   * silent attach for the email-collision case; the existing guest's data is
   * never returned to the anonymous caller, so there's no leakage.
   *
   * `is_anonymous` is set to true ONLY on freshly-created rows. Pre-existing
   * rows keep whatever flag they had — a TDS guest's row stays
   * `is_anonymous=false` even if they later book anonymously.
   */
  async findOrCreateAnonymousGuest(args: {
    name: string;
    email: string;
    phone: string;
  }): Promise<{ guestId: string; created: boolean }> {
    const email = args.email.trim().toLowerCase();
    const phone = args.phone.trim();
    const name = args.name.trim();

    if (!name || !email || !phone) {
      throw new BadRequestException('name, email, and phone are required');
    }

    // Email is the primary lookup key (the FE will most often have it); fall
    // back to phone match for the (rarer) case where the same person used a
    // different email this time but reused their phone.
    const existing = await this.prisma.guests.findFirst({
      where: { OR: [{ email }, { phone }] },
      orderBy: [{ created_at: 'asc' }], // oldest match wins → stable attach
    });

    if (existing) {
      return { guestId: existing.id, created: false };
    }

    const guestId = uuidv4();
    await this.prisma.guests.create({
      data: {
        id: guestId,
        name,
        email,
        phone,
        is_anonymous: true,
        email_verified: false,
        phone_verified: false,
      },
    });
    this.logger.log(`Anonymous guest created: ${guestId} (${email})`);
    return { guestId, created: true };
  }

  /**
   * Computes coupon eligibility WITHOUT creating a booking. Used by the FE
   * to render a live "you saved ₹X" badge as the guest fills the checkout form.
   */
  async previewCoupons(guestId: string, dto: PreviewCouponDto) {
    const { noOfNights } = this.parseDateRange(dto.checkin_date, dto.checkout_date);
    const availability = await this.getRoomAvailability(
      dto.property_id,
      dto.checkin_date,
      dto.checkout_date,
    );
    const { roomTotal } = this.validateRoomSelections(dto.rooms, availability.room_types, noOfNights);
    const { addonTotal } = await this.validateAddonSelections(dto.addons ?? [], dto.property_id);
    const subtotal = roomTotal + addonTotal;

    const result = await this.coupons.findApplicableForBooking({
      propertyId: dto.property_id,
      guestId,
      stayNights: noOfNights,
      subtotal,
      code: dto.coupon_code,
      skipAuto: dto.skip_auto_coupon === true,
    });

    const discountAuto = result.auto?.discount ?? 0;
    const discountCode = result.code?.discount ?? 0;
    const discountTotal = Math.min(subtotal, discountAuto + discountCode);
    const preTaxTotal = Math.max(0, subtotal - discountTotal);
    const taxBreakdown = await this.tax.computeTax(dto.property_id, preTaxTotal);

    return {
      property_id: dto.property_id,
      checkin_date: dto.checkin_date,
      checkout_date: dto.checkout_date,
      no_of_nights: noOfNights,
      subtotal,
      discount_total: discountTotal,
      pre_tax_total: preTaxTotal,
      tax_rate_pct: taxBreakdown.tax_rate_pct,
      tax_amount: taxBreakdown.tax_amount,
      grand_total: taxBreakdown.total_with_tax,
      coupons_applied: this.buildCouponsAppliedPayload(result),
      coupon_errors: result.errors,
    };
  }

  /**
   * Thin wrapper over CouponsService for the FE's "available coupons" panel.
   */
  async listAvailableCoupons(propertyId: string) {
    return this.coupons.listAvailableCodeCoupons(propertyId);
  }

  /**
   * Anonymous BUTEAK variant of previewCoupons — same response shape, no JWT.
   *
   * Uses a sentinel guest_id so the underlying coupons service runs unchanged:
   *   - `max_uses_per_guest` counts redemptions by guest_id; the sentinel
   *     has zero, so per-guest caps never trip on preview (correct — the
   *     real cap evaluation happens at create-order with the silent-attached
   *     guest_id, not at preview time).
   *   - `NEW_GUEST` eligibility checks prior bookings by guest_id; the
   *     sentinel has zero, so NEW_GUEST appears eligible at preview. If the
   *     guest is in fact a returning silent-attach target, the create-order
   *     pass will refuse the NEW_GUEST coupon at that point.
   *
   * The sentinel is never written to any FK column — it's only used for
   * read-only counts inside CouponsService.
   */
  async previewCouponsAnonymous(dto: PreviewCouponDto) {
    const ANONYMOUS_PREVIEW_GUEST = '00000000-0000-0000-0000-000000000000';
    return this.previewCoupons(ANONYMOUS_PREVIEW_GUEST, dto);
  }

  private buildCouponsAppliedPayload(result: {
    auto: {
      coupon: { id: string; code: string | null; name: string | null; description: string | null; type: string };
      discount: number;
      label: string;
    } | null;
    code: {
      coupon: { id: string; code: string | null; name: string | null; description: string | null; type: string };
      discount: number;
      label: string;
    } | null;
  }) {
    const applied: {
      kind: 'AUTO' | 'CODE';
      coupon_id: string;
      code: string | null;
      // Display title: admin-set `name` if present, else the code (for
      // ONE_TIME_CODE), else the computed label as a last resort.
      name: string | null;
      description: string | null;
      type: string;
      label: string;
      discount_amount: number;
    }[] = [];
    const toEntry = (
      kind: 'AUTO' | 'CODE',
      r: {
        coupon: { id: string; code: string | null; name: string | null; description: string | null; type: string };
        discount: number;
        label: string;
      },
    ) => ({
      kind,
      coupon_id: r.coupon.id,
      code: r.coupon.code,
      name: r.coupon.name ?? r.coupon.code ?? r.label,
      description: r.coupon.description,
      type: r.coupon.type,
      label: r.label,
      discount_amount: r.discount,
    });
    if (result.auto) applied.push(toEntry('AUTO', result.auto));
    if (result.code) applied.push(toEntry('CODE', result.code));
    return applied;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ROLLBACK PENDING BOOKING
  // ═══════════════════════════════════════════════════════════════════════════

  async rollbackPendingBooking(eri: string) {
    const booking = await this.prisma.ezee_booking_cache.findUnique({
      where: { ezee_reservation_id: eri },
    });

    if (!booking || booking.status !== 'PENDING_PAYMENT') return;

    await this.prisma.$transaction(async (tx) => {
      await this.releaseAddonInventory(tx, eri, booking.property_id);
      await tx.kyc_submissions.deleteMany({ where: { ezee_reservation_id: eri } });
      await tx.booking_slots.deleteMany({ where: { ezee_reservation_id: eri } });
      await tx.booking_guest_access.deleteMany({ where: { ezee_reservation_id: eri } });
      await tx.ezee_booking_cache.update({
        where: { ezee_reservation_id: eri },
        data: { status: 'CANCELLED', is_active: false },
      });
    });

    this.logger.log(`Rolled back pending booking: ${eri}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIRM BOOKING (after payment)
  // ═══════════════════════════════════════════════════════════════════════════

  async confirmBooking(eri: string) {
    const booking = await this.findBookingOrThrow(eri);
    if (booking.status === 'CONFIRMED') return;

    await this.prisma.$transaction(async (tx) => {
      await tx.ezee_booking_cache.update({
        where: { ezee_reservation_id: eri },
        data: { status: 'CONFIRMED' },
      });
      await this.finalizeAddonInventory(tx, eri, booking.property_id);
    });

    this.logger.log(`Booking confirmed: ${eri}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Date parsing ─────────────────────────────────────────────────────────

  private parseDateRange(checkinDate: string, checkoutDate: string) {
    if (!checkinDate || !checkoutDate) {
      throw new BadRequestException('checkin and checkout dates are required');
    }

    const checkin = new Date(checkinDate);
    const checkout = new Date(checkoutDate);

    if (isNaN(checkin.getTime())) {
      throw new BadRequestException(`Invalid checkin date: "${checkinDate}"`);
    }
    if (isNaN(checkout.getTime())) {
      throw new BadRequestException(`Invalid checkout date: "${checkoutDate}"`);
    }
    if (checkout <= checkin) {
      throw new BadRequestException('Checkout must be after checkin');
    }

    const noOfNights = Math.ceil(
      (checkout.getTime() - checkin.getTime()) / (1000 * 60 * 60 * 24),
    );

    return { checkin, checkout, noOfNights };
  }

  // ─── Admin: cache flush ───────────────────────────────────────────────────

  /**
   * Flush all room catalog and availability cache entries for a property.
   * Called by admin endpoints after room type changes or eZee re-sync.
   */
  async flushRoomCache(propertyId: string): Promise<{ flushed: string[] }> {
    const keys = [CacheService.roomCatalogKey(propertyId)];
    await Promise.all(keys.map((k) => this.cache.del(k)));
    this.logger.log(`Admin flushed room cache for property ${propertyId}: ${keys.join(', ')}`);
    return { flushed: keys };
  }

  // ─── ERI generation ───────────────────────────────────────────────────────

  private generateERI(hotelCode: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = uuidv4().slice(0, 4).toUpperCase();
    return `${hotelCode}-LCL-${timestamp}-${random}`;
  }

  // ─── Booking lookup ───────────────────────────────────────────────────────

  private async findBookingOrThrow(eri: string) {
    const booking = await this.prisma.ezee_booking_cache.findUnique({
      where: { ezee_reservation_id: eri },
    });
    if (!booking) {
      throw new NotFoundException(`Booking "${eri}" not found`);
    }
    return booking;
  }

  // ─── Booked beds map ──────────────────────────────────────────────────────

  private async getBookedBedsMap(
    propertyId: string, checkin: Date, checkout: Date,
    roomTypes: { id: string; name: string }[],
  ) {
    const overlapping = await this.prisma.ezee_booking_cache.findMany({
      where: {
        property_id: propertyId,
        status: { in: ['CONFIRMED', 'PENDING_PAYMENT'] },
        is_active: true,
        checkin_date: { lt: checkout },
        checkout_date: { gt: checkin },
      },
    });

    const map = new Map<string, number>();
    for (const b of overlapping) {
      if (Array.isArray(b.booking_rooms_json) && (b.booking_rooms_json as any[]).length > 0) {
        for (const item of b.booking_rooms_json as any[]) {
          if (item?.room_type_id) {
            map.set(item.room_type_id, (map.get(item.room_type_id) ?? 0) + (item.quantity ?? 1));
          }
        }
      } else {
        const rt = roomTypes.find(
          (r) => r.name === b.room_type_name || (b.room_type_name && b.room_type_name.startsWith(r.name)),
        );
        if (rt) {
          map.set(rt.id, (map.get(rt.id) ?? 0) + (b.no_of_guests ?? 1));
        }
      }
    }
    return map;
  }

  // ─── Slots ────────────────────────────────────────────────────────────────

  private async ensureSlots(eri: string, guestId: string, numGuests: number) {
    let slots = await this.prisma.booking_slots.findMany({
      where: { ezee_reservation_id: eri },
      orderBy: { slot_number: 'asc' },
    });

    // Create if missing
    if (slots.length === 0) {
      const newSlots = Array.from({ length: numGuests }, (_, i) => ({
        id: uuidv4(),
        ezee_reservation_id: eri,
        slot_number: i + 1,
        guest_id: null as string | null,
        label: `Guest ${i + 1}`,
        kyc_status: 'NOT_STARTED',
      }));
      await this.prisma.booking_slots.createMany({ data: newSlots });
      slots = await this.prisma.booking_slots.findMany({
        where: { ezee_reservation_id: eri },
        orderBy: { slot_number: 'asc' },
      });
      this.logger.log(`Created ${numGuests} slots for ${eri}`);
    }

    // Assign guest to first unassigned slot
    const unassigned = slots.find((s) => s.guest_id === null);
    if (unassigned) {
      await this.prisma.booking_slots.update({
        where: { id: unassigned.id },
        data: { guest_id: guestId },
      });
      unassigned.guest_id = guestId;
      this.logger.log(`Assigned guest ${guestId} to slot ${unassigned.slot_number}`);
    }

    return slots;
  }

  private async createBookingSlots(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    eri: string, totalGuests: number, primaryGuestId: string,
  ) {
    for (let i = 1; i <= totalGuests; i++) {
      await tx.booking_slots.create({
        data: {
          id: uuidv4(),
          ezee_reservation_id: eri,
          slot_number: i,
          guest_id: i === 1 ? primaryGuestId : null,
          label: `Guest ${i}`,
          kyc_status: 'NOT_STARTED',
        },
      });
    }
  }

  // ─── Room validation ──────────────────────────────────────────────────────

  private validateRoomSelections(
    selections: { room_type_id: string; quantity: number; guests?: { first_name: string; last_name: string; gender?: string }[] }[],
    availableRooms: { id: string; name: string; available_beds: number; base_price_per_night: number; ezee_room_type_id: string | null; ezee_rate_plan_id: string | null; ezee_rate_type_id: string | null; occupancy_limits?: OccupancyLimits }[],
    noOfNights: number,
    occupancy?: { adults: number; children: number },
  ) {
    const totalRequested = selections.reduce((sum, s) => sum + s.quantity, 0);
    if (totalRequested > 6) {
      throw new BadRequestException('Cannot book more than 6 units in a single order');
    }

    let roomTotal = 0;
    // Summed physical capacity across the whole selection, from each room
    // type's eZee-synced limits (falling back to the legacy ceiling when a
    // room type is unconfigured).
    let allowedAdults = 0;
    let allowedChildren = 0;
    const validatedRooms: ValidatedRoom[] = [];

    for (const sel of selections) {
      const rt = availableRooms.find((r) => r.id === sel.room_type_id);
      if (!rt) throw new NotFoundException(`Room type "${sel.room_type_id}" not found`);

      if (sel.quantity > rt.available_beds) {
        throw new BadRequestException(
          `"${rt.name}" — requested ${sel.quantity} but only ${rt.available_beds} available`,
        );
      }

      if (sel.guests && sel.guests.length !== sel.quantity) {
        throw new BadRequestException(
          `"${rt.name}" — guests array length (${sel.guests.length}) must match quantity (${sel.quantity})`,
        );
      }

      const limits = rt.occupancy_limits ?? this.resolveOccupancyLimits(null);
      allowedAdults += limits.max_adults * sel.quantity;
      allowedChildren += limits.max_children * sel.quantity;

      const lineTotal = rt.base_price_per_night * noOfNights * sel.quantity;
      roomTotal += lineTotal;
      validatedRooms.push({
        roomType: {
          id: rt.id,
          name: rt.name,
          base_price_per_night: rt.base_price_per_night,
          ezee_room_type_id: rt.ezee_room_type_id,
          ezee_rate_plan_id: rt.ezee_rate_plan_id,
          ezee_rate_type_id: rt.ezee_rate_type_id,
          max_adults: limits.max_adults,
          max_children: limits.max_children,
        },
        quantity: sel.quantity,
        lineTotal,
        guests: sel.guests,
      });
    }

    // ── Resolve occupancy ─────────────────────────────────────────────────
    // If the caller supplied aggregate { adults, children }, validate it
    // against: (1) >= 1 adult per booked unit (eZee needs number_adults >= 1
    // per Room_N); (2) the summed PHYSICAL capacity of the selected room types
    // (the authoritative, eZee-aligned rule); and (3) the legacy generous
    // "6 combined per unit" outer ceiling as a final safety stop.
    //
    // If omitted, fall back to the legacy "1 adult per booked unit, 0
    // children" — keeps the existing TDS flow + older FE builds working
    // unchanged.
    let adults: number;
    let children: number;
    if (occupancy) {
      if (occupancy.adults < totalRequested) {
        throw new BadRequestException(
          `adults (${occupancy.adults}) must be >= number of booked units (${totalRequested}) — eZee requires at least 1 adult per room`,
        );
      }
      if (occupancy.adults > allowedAdults) {
        throw new BadRequestException({
          statusCode: 400,
          code: 'ROOM_OCCUPANCY_EXCEEDED',
          message: `Selected apartments allow a maximum of ${allowedAdults} adult${allowedAdults === 1 ? '' : 's'}, but ${occupancy.adults} adults were requested.`,
        });
      }
      if (occupancy.children > allowedChildren) {
        throw new BadRequestException({
          statusCode: 400,
          code: 'ROOM_OCCUPANCY_EXCEEDED',
          message: `Selected apartments allow a maximum of ${allowedChildren} child${allowedChildren === 1 ? '' : 'ren'}, but ${occupancy.children} children were requested.`,
        });
      }
      const total = occupancy.adults + occupancy.children;
      if (total > totalRequested * 6) {
        throw new BadRequestException(
          `total guests (${total}) exceeds the per-booking cap of ${totalRequested * 6} (6 per booked unit)`,
        );
      }
      adults = occupancy.adults;
      children = occupancy.children;
    } else {
      adults = totalRequested;
      children = 0;
    }
    const totalGuests = adults + children;

    return { validatedRooms, roomTotal, totalGuests, adults, children };
  }

  /**
   * Distribute aggregate adults/children across `numRooms` booked units as
   * evenly as possible, guaranteeing >= 1 adult per room (eZee requirement).
   * Pure / deterministic so the create-order response and the eZee worker
   * agree on the split without coordination.
   */
  private distributeOccupancy(
    adults: number,
    children: number,
    numRooms: number,
  ): { adults: number; children: number }[] {
    if (numRooms < 1) return [];
    if (adults < numRooms) {
      // Should already be caught by validation; defend in depth.
      throw new BadRequestException('adults must be >= numRooms');
    }
    const allocAdults = this.spread(adults, numRooms);
    const allocChildren = this.spread(children, numRooms);
    return allocAdults.map((a, i) => ({ adults: a, children: allocChildren[i] }));
  }

  /**
   * Splits `n` into `bins` slots, base-equal with the remainder spilling into
   * the FIRST `remainder` slots. Examples:
   *   spread(6, 3) → [2, 2, 2]
   *   spread(8, 3) → [3, 3, 2]
   *   spread(2, 3) → [1, 1, 0]
   */
  private spread(n: number, bins: number): number[] {
    const base = Math.floor(n / bins);
    const rem = n - base * bins;
    return Array.from({ length: bins }, (_, i) => base + (i < rem ? 1 : 0));
  }

  /**
   * Resolve a room type's occupancy limits from its persisted config, falling
   * back to the legacy generous ceiling when unconfigured (NULL columns). This
   * is why every pre-existing property keeps its old behaviour: with no config,
   * `max_adults`/`max_children` resolve to the same 6-per-unit ceiling the old
   * `× 6` cap enforced.
   */
  private resolveOccupancyLimits(row?: {
    base_adults?: number | null;
    base_children?: number | null;
    max_adults?: number | null;
    max_children?: number | null;
  } | null): OccupancyLimits {
    return {
      base_adults: row?.base_adults ?? 1,
      base_children: row?.base_children ?? 0,
      max_adults: row?.max_adults ?? LEGACY_MAX_ADULTS_PER_UNIT,
      max_children: row?.max_children ?? LEGACY_MAX_CHILDREN_PER_UNIT,
      configured: row?.max_adults != null,
    };
  }

  /**
   * Capacity-aware distribution: start from an even spread, then spill any
   * per-unit overflow into units that still have headroom under their cap.
   * Reduces EXACTLY to `spread()` when no cap binds, so homogeneous and
   * unconfigured bookings split identically to before. Assumes the caller has
   * already validated `total <= sum(caps)` (create-order does), so the overflow
   * always finds a home. For adults, validation also guarantees `total >= n`,
   * so every unit keeps its eZee-required ≥1 adult.
   */
  private distributeCapped(total: number, caps: number[]): number[] {
    const n = caps.length;
    if (n === 0) return [];
    const alloc = this.spread(total, n);
    let overflow = 0;
    for (let i = 0; i < n; i++) {
      if (alloc[i] > caps[i]) {
        overflow += alloc[i] - caps[i];
        alloc[i] = caps[i];
      }
    }
    let progressed = true;
    while (overflow > 0 && progressed) {
      progressed = false;
      for (let i = 0; i < n && overflow > 0; i++) {
        if (alloc[i] < caps[i]) {
          alloc[i] += 1;
          overflow -= 1;
          progressed = true;
        }
      }
    }
    return alloc;
  }

  // ─── Addon validation ─────────────────────────────────────────────────────

  private async validateAddonSelections(
    addons: { product_id: string; quantity: number }[],
    propertyId: string,
  ) {
    let addonTotal = 0;
    const validatedAddons: ValidatedAddon[] = [];

    for (const addon of addons) {
      const product = await this.prisma.product_catalog.findFirst({
        where: { id: addon.product_id, property_id: propertyId, is_active: true },
      });

      if (!product) throw new NotFoundException(`Product "${addon.product_id}" not found`);
      if (product.category === 'BORROWABLE') {
        throw new BadRequestException('Borrowable items cannot be added to booking cart');
      }
      if (Number(product.base_price) === 0) {
        throw new BadRequestException(`"${product.name}" is a free service — no need to add to cart`);
      }

      // RETURNABLE items: no stock reservation at booking (allocated at check-in)
      // COMMODITY items: validate available stock now
      if (product.category === 'COMMODITY') {
        const inv = await this.prisma.inventory.findFirst({
          where: { product_id: product.id, property_id: propertyId },
        });
        if (!inv || inv.available_stock < addon.quantity) {
          throw new BadRequestException(
            `Insufficient stock for "${product.name}". Available: ${inv?.available_stock ?? 0}`,
          );
        }
      }

      const lineTotal = Number(product.base_price) * addon.quantity;
      addonTotal += lineTotal;
      validatedAddons.push({
        product: { id: product.id, name: product.name, category: product.category, base_price: Number(product.base_price) },
        quantity: addon.quantity,
        lineTotal,
      });
    }

    return { validatedAddons, addonTotal };
  }

  // ─── Inventory helpers ────────────────────────────────────────────────────

  private async reserveAddonInventory(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    addons: ValidatedAddon[], propertyId: string,
  ) {
    for (const addon of addons) {
      if (addon.product.category === 'COMMODITY') {
        await tx.inventory.updateMany({
          where: { product_id: addon.product.id, property_id: propertyId },
          data: {
            available_stock: { decrement: addon.quantity },
            reserved_stock: { increment: addon.quantity },
          },
        });
      }
    }
  }

  private async releaseAddonInventory(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    eri: string, propertyId: string,
  ) {
    const addonOrder = await tx.addon_orders.findFirst({
      where: { ezee_reservation_id: eri, status: 'PENDING' },
      include: { addon_order_items: { include: { product_catalog: true } } },
    });

    if (!addonOrder) return;

    for (const item of addonOrder.addon_order_items) {
      if (item.product_catalog.category === 'COMMODITY') {
        await tx.inventory.updateMany({
          where: { product_id: item.product_id, property_id: propertyId },
          data: {
            available_stock: { increment: item.quantity },
            reserved_stock: { decrement: item.quantity },
          },
        });
      }
    }

    await tx.addon_order_items.deleteMany({ where: { addon_order_id: addonOrder.id } });
    await tx.addon_orders.delete({ where: { id: addonOrder.id } });
  }

  private async finalizeAddonInventory(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    eri: string, propertyId: string,
  ) {
    const addonOrder = await tx.addon_orders.findFirst({
      where: { ezee_reservation_id: eri, status: 'PENDING' },
      include: { addon_order_items: { include: { product_catalog: true } } },
    });

    if (!addonOrder) return;

    for (const item of addonOrder.addon_order_items) {
      if (item.product_catalog.category === 'COMMODITY') {
        await tx.inventory.updateMany({
          where: { product_id: item.product_id, property_id: propertyId },
          data: {
            reserved_stock: { decrement: item.quantity },
            sold_count: { increment: item.quantity },
          },
        });
      }
    }

    await tx.addon_orders.update({
      where: { id: addonOrder.id },
      data: { status: 'PAID' },
    });
  }

  // ─── Formatters ───────────────────────────────────────────────────────────

  private formatBooking(booking: any) {
    return {
      ezee_reservation_id: booking.ezee_reservation_id,
      property_id: booking.property_id,
      room_type_name: booking.room_type_name,
      room_number: booking.room_number,
      checkin_date: booking.checkin_date,
      checkout_date: booking.checkout_date,
      no_of_guests: booking.no_of_guests,
      source: booking.source,
      status: booking.status,
    };
  }

  private formatSlot(slot: any) {
    return {
      slot_id: slot.id,
      slot_number: slot.slot_number,
      label: slot.label,
      guest_id: slot.guest_id,
      kyc_status: slot.kyc_status,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK-IN STATUS (auth required — guest must be linked to the booking)
  // ═══════════════════════════════════════════════════════════════════════════

  async getCheckinStatus(guestId: string, bookingId: string) {
    const booking = await this.prisma.ezee_booking_cache.findFirst({
      where: { ezee_reservation_id: bookingId },
      include: { properties: { select: { name: true } } },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const access = await this.prisma.booking_guest_access.findFirst({
      where: { ezee_reservation_id: bookingId, guest_id: guestId, status: 'APPROVED' },
    });

    if (!access) {
      throw new ForbiddenException('You are not linked to this booking');
    }

    const lockAccess = await this.prisma.smart_lock_access.findFirst({
      where: { ezee_reservation_id: bookingId, pin_status: 'ACTIVE' },
      orderBy: { created_at: 'desc' },
    });

    return {
      booking_id: booking.ezee_reservation_id,
      status: booking.status,
      booking_sync_status: this.deriveBookingSyncStatus(booking),
      room_number: booking.room_number,
      property_name: booking.properties?.name ?? 'The Daily Social',
      checkin_date: booking.checkin_date,
      checkout_date: booking.checkout_date,
      lock_access: lockAccess
        ? {
            pin: lockAccess.mygate_pin,
            valid_from: lockAccess.valid_from,
            valid_until: lockAccess.valid_until,
            pin_status: lockAccess.pin_status,
          }
        : null,
    };
  }
}
