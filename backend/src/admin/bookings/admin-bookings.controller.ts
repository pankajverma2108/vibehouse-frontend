import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminBookingsService } from './admin-bookings.service';
import { CreateTestBookingDto } from './dto/create-test-booking.dto';
import { EzeeReconciliationService } from '../../ezee/ezee-reconciliation.service';
import { EzeeRoomGuestsService } from '../../ezee/ezee-room-guests.service';
import { AdminJwtGuard } from '../../common/guards/admin-jwt.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import type { AdminJwtPayload } from '../../common/guards/admin-jwt.strategy';

@Controller('admin/bookings')
@UseGuards(AdminJwtGuard, PermissionsGuard)
export class AdminBookingsController {
  constructor(
    private readonly bookingsService: AdminBookingsService,
    private readonly reconciliation: EzeeReconciliationService,
    private readonly roomGuests: EzeeRoomGuestsService,
  ) {}

  /**
   * GET /admin/bookings/:eri/room-guests
   *
   * Diagnostic for multi-room reservations: what WE hold for each room (the cached snapshot +
   * who has booking access) next to what eZee returns live for the same reservation. The
   * per-room `phone` under `ezee` is the field guest recognition hangs on — if eZee leaves it
   * blank on the 2nd..nth room, that guest cannot be identified from their WhatsApp number and
   * the number has to be captured another way.
   */
  @Get(':eri/room-guests')
  @RequirePermission('bookings.view')
  inspectRoomGuests(@Param('eri') eri: string) {
    return this.roomGuests.inspect(eri);
  }

  /**
   * POST /admin/bookings/:eri/resync-rooms
   *
   * Pulls the reservation from eZee and rebuilds its per-room guest snapshot, linking each
   * sub-booking's guest. Repairs bookings cached before per-room capture existed — eZee only
   * pushes on state changes, so an in-house booking would otherwise stay broken all stay.
   */
  @Post(':eri/resync-rooms')
  @RequirePermission('bookings.view')
  resyncRooms(@Param('eri') eri: string) {
    return this.roomGuests.resyncFromEzee(eri);
  }

  // ─── BOOKING DASHBOARD ──────────────────────────────────────────────────

  /**
   * GET /admin/bookings
   * Lists all bookings with pagination and optional filters.
   * Scoped to admin's property (owners see all).
   */
  @Get()
  @RequirePermission('bookings.view')
  listBookings(
    @CurrentAdmin() admin: AdminJwtPayload,
    @Query('status') status?: string,
    @Query('property_id') propertyId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.bookingsService.listBookings(admin, {
      status,
      property_id: propertyId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // ─── TEST BOOKINGS ───────────────────────────────────────────────────────
  //
  // Declared BEFORE `@Get(':eri')` — Nest matches in declaration order, so a literal 'test'
  // segment placed after the wildcard would be swallowed by it and never reached.
  //
  // Gated on `bookings.create` (owner + tech-ops), not `bookings.view` like the routes above:
  // reading bookings is routine, minting one that talks to guests over a live WhatsApp number
  // is not.

  /**
   * POST /admin/bookings/test
   *
   * Create a booking that drives the guest flows against a LIVE property without occupying a
   * sellable room. The row is real everywhere except `is_test`, which keeps it out of eZee, off
   * real staff's phones, and out of every reported figure. See docs/setup/test_bookings.md.
   */
  @Post('test')
  @RequirePermission('bookings.create')
  createTestBooking(@Body() dto: CreateTestBookingDto, @CurrentAdmin() admin: AdminJwtPayload) {
    return this.bookingsService.createTestBooking(dto, admin);
  }

  /** GET /admin/bookings/test — test bookings on the properties you're assigned to. */
  @Get('test')
  @RequirePermission('bookings.create')
  listTestBookings(@CurrentAdmin() admin: AdminJwtPayload) {
    return this.bookingsService.listTestBookings(admin);
  }

  /**
   * DELETE /admin/bookings/test/:eri
   *
   * Removes a test booking and its children (tickets, breakfast orders/tokens, access, check-in
   * records). Refuses any booking that isn't flagged is_test.
   */
  @Delete('test/:eri')
  @RequirePermission('bookings.create')
  deleteTestBooking(@Param('eri') eri: string, @CurrentAdmin() admin: AdminJwtPayload) {
    return this.bookingsService.deleteTestBooking(eri, admin);
  }

  /**
   * GET /admin/bookings/:eri
   * Gets full booking detail with guests, slots, payments, and addon orders.
   */
  @Get(':eri')
  @RequirePermission('bookings.view')
  getBookingDetail(
    @Param('eri') eri: string,
    @CurrentAdmin() admin: AdminJwtPayload,
  ) {
    return this.bookingsService.getBookingDetail(eri, admin);
  }

  /**
   * DELETE /admin/bookings/cache/rooms?property_id=60765
   *
   * Flushes the room catalog Redis cache for a property so the next
   * catalog request fetches fresh data from eZee + DB.
   * Use after adding/updating room types or after eZee room config changes.
   */
  @Delete('cache/rooms')
  @RequirePermission('bookings.view')
  flushRoomCache(@Query('property_id') propertyId: string) {
    return this.bookingsService.flushRoomCache(propertyId);
  }

  /**
   * POST /admin/bookings/trigger-reconcile
   * Immediately runs the eZee reconciliation pass — detects check-in/checkout
   * status drift and provisions MyGate PINs. Use during testing instead of
   * waiting for the 15-minute cron poll.
   */
  @Post('trigger-reconcile')
  @RequirePermission('bookings.view')
  async triggerReconcile(@CurrentAdmin() _admin: AdminJwtPayload) {
    await this.reconciliation.reconcile();
    return { ok: true, message: 'Reconciliation complete' };
  }
}
