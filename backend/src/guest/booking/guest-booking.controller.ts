import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Post,
  Get,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { GuestBookingService } from './guest-booking.service';
import { LinkBookingDto } from './dto/link-booking.dto';
import { LookupBookingDto } from './dto/lookup-booking.dto';
import { CreateBookingOrderDto } from './dto/create-booking-order.dto';
import { AnonymousCreateBookingOrderDto } from './dto/anonymous-create-booking-order.dto';
import { PreviewCouponDto } from './dto/preview-coupon.dto';
import { CurrentGuest } from '../../common/decorators/current-guest.decorator';
import type { GuestJwtPayload } from '../../common/guards/guest-jwt.strategy';
import { resolveBrandFromRequest, resolvePropertyFromRequest } from '../../common/property-resolver';

@Controller('guest/booking')
export class GuestBookingController {
  constructor(
    private readonly bookingService: GuestBookingService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── PUBLIC (no auth) ──────────────────────────────────────────────────────

  /**
   * GET /guest/booking/rooms?property_id=...
   *
   * Room CATALOG — no dates required.
   * Returns all active room types with base prices, amenities, and physical
   * room counts. Uses eZee Vacation Rental get_rooms API so every configured
   * room type is always returned regardless of current availability.
   *
   * Frontend use: homepage / room listing page (before dates are selected).
   */
  @Get('rooms')
  async getRoomCatalog(
    @Query('property_id') propertyId: string | undefined,
    @Req() req: Request,
  ) {
    const resolved = propertyId || resolvePropertyFromRequest(req) || '60765';
    return this.bookingService.getRoomCatalog(resolved);
  }

  /**
   * GET /guest/booking/availability?property_id=...&checkin=YYYY-MM-DD&checkout=YYYY-MM-DD
   *
   * Live AVAILABILITY — checkin and checkout are required.
   * Returns the same room types with live eZee rates and available bed counts
   * for the requested dates. Rooms with 0 availability appear with
   * inventory_state="sold_out" rather than disappearing from the response.
   *
   * Frontend use: after guest selects dates, before the create-order step.
   */
  @Get('availability')
  async getRoomAvailability(
    @Query('property_id') propertyId: string,
    @Query('checkin') checkin: string,
    @Query('checkout') checkout: string,
  ) {
    if (!checkin || !checkout) {
      throw new BadRequestException('checkin and checkout query params are required');
    }
    if (!propertyId) {
      throw new BadRequestException('property_id query param is required');
    }
    return this.bookingService.getRoomAvailability(propertyId, checkin, checkout);
  }

  /**
   * GET /guest/booking/lookup?booking_id=EZEE-KA-123456
   *
   * Public booking preview — no auth required.
   * Returns non-sensitive booking details (property, dates, room type, status).
   * Used by the "Find my booking" flow before the guest has created an account.
   * Booker email and phone are intentionally excluded.
   */
  @Get('lookup')
  async lookupBooking(@Query() dto: LookupBookingDto) {
    return this.bookingService.lookupBooking(dto.booking_id);
  }

  // ─── AUTH REQUIRED ─────────────────────────────────────────────────────────

  /**
   * POST /guest/booking/link
   * Link the authenticated guest to a booking (ERI).
   */
  @UseGuards(AuthGuard('guest-jwt'))
  @Post('link')
  async linkBooking(
    @CurrentGuest() guest: GuestJwtPayload,
    @Body() dto: LinkBookingDto,
  ) {
    return this.bookingService.linkBooking(
      guest.guest_id,
      dto.ezee_reservation_id,
    );
  }

  /**
   * GET /guest/booking/mine
   * List all bookings linked to the authenticated guest.
   */
  @UseGuards(AuthGuard('guest-jwt'))
  @Get('mine')
  async getMyBookings(@CurrentGuest() guest: GuestJwtPayload, @Req() req: Request) {
    // Brand comes from JWT (issued at login/signup time). For tokens issued
    // before brand-isolation rollout, the JWT strategy fills it in from Host
    // header, so we can safely assume it's always set here.
    const brand = guest.brand ?? resolveBrandFromRequest(req);
    return this.bookingService.getMyBookings(guest.guest_id, brand);
  }

  /**
   * POST /guest/booking/create-order
   * Validates room + addon selections, reserves inventory,
   * creates pending booking records. Returns summary for payment.
   */
  @UseGuards(AuthGuard('guest-jwt'))
  @Post('create-order')
  async createBookingOrder(
    @CurrentGuest() guest: GuestJwtPayload,
    @Body() dto: CreateBookingOrderDto,
  ) {
    return this.bookingService.createBookingOrder(guest.guest_id, dto);
  }

  /**
   * POST /guest/booking/anonymous/create-order
   *
   * BUTEAK-only "skip the login wall" booking path. Inline-collects
   * name/email/phone, silent-attaches to existing guests row by email or
   * phone, and returns a single-use payment_token so the subsequent
   * /payment/* calls can complete without a JWT. See plan
   * "BUTEAK Anonymous Booking" in reactive-popping-kernighan.md.
   *
   * Hard gates:
   *  - Host must resolve to BUTEAK (`buteak.in`-family hostnames).
   *  - Target property must have `allow_anonymous_booking = true`.
   *
   * Both checks live here (not in the service) so the service stays brand-
   * agnostic and remains reusable from the logged-in path.
   */
  @Post('anonymous/create-order')
  async createAnonymousBookingOrder(
    @Req() req: Request,
    @Body() dto: AnonymousCreateBookingOrderDto,
  ) {
    const brand = resolveBrandFromRequest(req);
    if (brand !== 'BUTEAK') {
      throw new ForbiddenException('Anonymous booking is available on BUTEAK only');
    }

    const property = await this.prisma.properties.findUnique({
      where: { id: dto.property_id },
      select: { id: true, brand: true, allow_anonymous_booking: true },
    });
    if (!property) {
      throw new BadRequestException('Unknown property_id');
    }
    if (property.brand !== 'BUTEAK' || !property.allow_anonymous_booking) {
      throw new ForbiddenException(
        'This property does not allow anonymous bookings',
      );
    }

    const { guestId } = await this.bookingService.findOrCreateAnonymousGuest({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
    });

    return this.bookingService.createBookingOrder(guestId, dto);
  }

  /**
   * GET /guest/booking/anonymous/coupons/available?property_id=<numeric>
   *
   * BUTEAK-only mirror of /guest/booking/coupons/available. Powers the
   * "Offers & Coupons" homepage rail on buteak.in where the user is not
   * logged in (and never will be — see plan
   * "BUTEAK Anonymous Booking — Skip the login wall").
   *
   * Returns the same shape as the authenticated variant: only ONE_TIME_CODE
   * coupons that are currently active and applicable to the property. Per-
   * guest cap + min-booking-amount are NOT enforced here (they depend on
   * the cart); they surface as soft errors at create-order time.
   *
   * Hard gates (defence in depth):
   *  - Host must resolve to BUTEAK (buteak.in family).
   *  - Target property must have allow_anonymous_booking = true.
   */
  @Get('anonymous/coupons/available')
  async listAvailableCouponsAnonymous(
    @Req() req: Request,
    @Query('property_id') propertyId: string,
  ) {
    if (resolveBrandFromRequest(req) !== 'BUTEAK') {
      throw new ForbiddenException('Anonymous coupon listing is BUTEAK-only');
    }
    if (!propertyId || !/^[0-9]+$/.test(propertyId)) {
      throw new BadRequestException('property_id is required (numeric eZee hotel code)');
    }
    const property = await this.prisma.properties.findUnique({
      where: { id: propertyId },
      select: { brand: true, allow_anonymous_booking: true },
    });
    if (!property) {
      throw new BadRequestException('Unknown property_id');
    }
    if (property.brand !== 'BUTEAK' || !property.allow_anonymous_booking) {
      throw new ForbiddenException(
        'This property does not allow anonymous bookings',
      );
    }
    const items = await this.bookingService.listAvailableCoupons(propertyId);
    return { items };
  }

  /**
   * POST /guest/booking/anonymous/coupons/preview
   *
   * BUTEAK-only mirror of /guest/booking/coupons/preview. Validates a typed
   * coupon code against an in-flight cart and returns the full money
   * breakdown (subtotal / discount / pre-tax / tax / grand total) — needed
   * by the booking-review summary widget before create-order runs.
   *
   * Auth: none. Hard-gated by:
   *  - Host must resolve to BUTEAK.
   *  - Target property must have allow_anonymous_booking = true.
   *
   * Response shape is identical to the JWT-gated variant (coupons_applied,
   * coupon_errors, tax breakdown all present), so the FE can share rendering
   * across both flows.
   */
  @Post('anonymous/coupons/preview')
  async previewCouponsAnonymous(
    @Req() req: Request,
    @Body() dto: PreviewCouponDto,
  ) {
    if (resolveBrandFromRequest(req) !== 'BUTEAK') {
      throw new ForbiddenException('Anonymous coupon preview is BUTEAK-only');
    }
    const property = await this.prisma.properties.findUnique({
      where: { id: dto.property_id },
      select: { brand: true, allow_anonymous_booking: true },
    });
    if (!property) {
      throw new BadRequestException('Unknown property_id');
    }
    if (property.brand !== 'BUTEAK' || !property.allow_anonymous_booking) {
      throw new ForbiddenException(
        'This property does not allow anonymous bookings',
      );
    }
    return this.bookingService.previewCouponsAnonymous(dto);
  }

  /**
   * POST /guest/booking/coupons/preview
   * Computes coupon discount for an in-flight cart without creating an order.
   * FE calls this on coupon-code blur / cart-line-change to render savings live.
   */
  @UseGuards(AuthGuard('guest-jwt'))
  @Post('coupons/preview')
  async previewCoupons(
    @CurrentGuest() guest: GuestJwtPayload,
    @Body() dto: PreviewCouponDto,
  ) {
    return this.bookingService.previewCoupons(guest.guest_id, dto);
  }

  /**
   * GET /guest/booking/coupons/available?property_id=<numeric>
   * Lists the currently-redeemable code coupons for a property — drives the
   * FE's "Have a coupon code?" panel (the list of WORKATION / GROUP10 /
   * NEWSIGNUP-style cards). Only ONE_TIME_CODE type is returned; auto coupons
   * (NEW_GUEST, STAY_LENGTH) don't need to be listed (they apply automatically
   * and have no code to type).
   *
   * Per-guest cap + min-booking-amount are NOT enforced here (they depend on
   * the cart); preview / create-order surfaces those as soft errors.
   */
  @UseGuards(AuthGuard('guest-jwt'))
  @Get('coupons/available')
  async listAvailableCoupons(@Query('property_id') propertyId: string) {
    if (!propertyId || !/^[0-9]+$/.test(propertyId)) {
      throw new BadRequestException('property_id is required (numeric eZee hotel code)');
    }
    const items = await this.bookingService.listAvailableCoupons(propertyId);
    return { items };
  }

  /**
   * GET /guest/booking/checkin-status?booking_id=<ERI>
   * Returns current check-in status and smart lock PIN for the booking.
   * Guest must be linked (approved) to the booking.
   */
  @UseGuards(AuthGuard('guest-jwt'))
  @Get('checkin-status')
  async getCheckinStatus(
    @CurrentGuest() guest: GuestJwtPayload,
    @Query('booking_id') bookingId: string,
  ) {
    if (!bookingId) {
      throw new BadRequestException('booking_id query param is required');
    }
    return this.bookingService.getCheckinStatus(guest.guest_id, bookingId);
  }
}
