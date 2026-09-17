import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../redis/cache.service';
import { MyGateService } from '../../mygate/mygate.service';
import { istDateStr } from '../../common/utils/time.util';

/**
 * Operations whose status indicates the guest is in-house and a smart-lock
 * PIN must exist. Provisioning is idempotent (the underlying
 * MyGateService.provisionLockAccess short-circuits if an ACTIVE row already
 * exists for the ERI) so a re-push during the eZee historical replay or a
 * subsequent UPDATEGUEST won't double-issue.
 */
const PROVISION_OPS = new Set([
  'RESERVATIONTOCHECKIN',
  'CHECKIN',
  'UNDO_CHECKOUT',
]);

/**
 * Operations that revoke any active PIN. Includes the eZee bundled
 * VOID_CANCEL_NOSHOW_RESERVATION because the worker has already mapped its
 * sub-state (CANCELLED / NO_SHOW) by the time we get here.
 */
const REVOKE_OPS = new Set([
  'UNDO_CHECKIN',
  'VOID_CHECKIN',
  'CHECKOUT',
  'CANCEL',
  'NOSHOW',
  'VOID_CANCEL_NOSHOW_RESERVATION',
]);

/**
 * Operations that release inventory and so should bust the availability
 * cache so the next /guest/booking/availability call returns a fresh count.
 * Brand-agnostic — Buteak benefits from a fresh cache just as much as TDS.
 */
const AVAILABILITY_BUST_OPS = new Set([
  'CHECKOUT',
  'CANCEL',
  'NOSHOW',
  'VOID_CANCEL_NOSHOW_RESERVATION',
  'AMEND_STAY',
  'RELEASE_ROOM',
]);

/**
 * Operations that END the stay. Any breakfast the guest pre-ordered for a morning they will no
 * longer be here for must be cancelled — otherwise the kitchen cooks for a departed guest and the
 * plate keeps holding a delivery slot that a staying guest could have used. Brand-agnostic.
 */
const STAY_END_OPS = new Set([
  'CHECKOUT',
  'CANCEL',
  'NOSHOW',
  'VOID_CANCEL_NOSHOW_RESERVATION',
]);

/**
 * Brand restriction: today only TDS has MyGate locks installed AND the
 * check-in welcome email is approved as part of the journey. Buteak skips
 * both — its operations refresh the cache row and bust availability, but
 * no PIN or email goes out.
 */
const SIDE_EFFECT_BRANDS = new Set(['TDS']);

export interface AutosyncSideEffectContext {
  propertyId: string;
  brand: string | null;
  operation: string;
  eri: string;
  roomNumber: string | null;
  checkinDate: Date | null;
  checkoutDate: Date | null;
  /**
   * The sub-bookings this push is about. A multi-room reservation is ONE cache row, so a checkout
   * naming only room 2 must not cancel room 1's breakfast — the guest still in-house keeps theirs.
   * Empty ⇒ the whole reservation is ending.
   */
  subBookingIds?: string[];
}

/**
 * Wraps the post-cache-write side effects of an inbound eZee autosync push:
 *   - MyGate PIN provision / revoke (TDS only — Buteak isn't on MyGate)
 *   - Welcome email (delegated to MyGateService.provisionLockAccess, which
 *     calls EmailService.sendCheckinEmail internally when a PIN is issued)
 *   - Availability cache invalidation (brand-agnostic)
 *
 * Every method is best-effort. Failures are logged but never thrown so the
 * worker doesn't retry the SQS message just because a downstream side-effect
 * blipped — the cache write is already committed.
 */
@Injectable()
export class AutosyncSideEffectsService {
  private readonly logger = new Logger(AutosyncSideEffectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly mygate: MyGateService,
  ) {}

  async dispatch(ctx: AutosyncSideEffectContext): Promise<void> {
    const op = (ctx.operation ?? '').toUpperCase();

    // Availability cache busts run for everyone — pure cache invalidation.
    if (AVAILABILITY_BUST_OPS.has(op)) {
      await this.bustAvailabilityCache(ctx).catch((err) =>
        this.logger.warn(
          `autosync side-effects: availability bust failed for ERI=${ctx.eri}: ${(err as Error).message}`,
        ),
      );
    }

    // Breakfast cancellation runs for everyone — the kitchen must not cook for a guest who left.
    if (STAY_END_OPS.has(op)) {
      await this.cancelUpcomingBreakfast(ctx).catch((err) =>
        this.logger.warn(
          `autosync side-effects: breakfast cancel failed for ERI=${ctx.eri}: ${(err as Error).message}`,
        ),
      );
    }

    // MyGate / welcome email gated to TDS only.
    if (!ctx.brand || !SIDE_EFFECT_BRANDS.has(ctx.brand)) {
      if (PROVISION_OPS.has(op) || REVOKE_OPS.has(op)) {
        this.logger.log(
          `autosync side-effects: skipping MyGate/email for ERI=${ctx.eri} (brand=${ctx.brand ?? 'unknown'} not in allowlist)`,
        );
      }
      return;
    }

    if (PROVISION_OPS.has(op)) {
      await this.provision(ctx).catch((err) =>
        this.logger.error(
          `autosync side-effects: provision failed for ERI=${ctx.eri}: ${(err as Error).message}`,
        ),
      );
    } else if (REVOKE_OPS.has(op)) {
      await this.revoke(ctx).catch((err) =>
        this.logger.warn(
          `autosync side-effects: revoke failed for ERI=${ctx.eri}: ${(err as Error).message}`,
        ),
      );
    }
  }

  /**
   * Provision the smart-lock PIN for an in-house booking. Delegates to the
   * existing MyGateService.provisionLockAccess which is idempotent AND
   * sends the welcome email with the PIN inside — so we don't need a
   * separate email step.
   */
  private async provision(ctx: AutosyncSideEffectContext): Promise<void> {
    if (!ctx.roomNumber) {
      this.logger.log(
        `autosync side-effects: skipping provision for ERI=${ctx.eri} (no room assigned yet)`,
      );
      return;
    }
    if (!ctx.checkinDate || !ctx.checkoutDate) {
      this.logger.log(
        `autosync side-effects: skipping provision for ERI=${ctx.eri} (missing checkin/checkout)`,
      );
      return;
    }
    await this.mygate.provisionLockAccess({
      eri: ctx.eri,
      propertyId: ctx.propertyId,
      roomNumber: ctx.roomNumber,
      checkin: ctx.checkinDate,
      checkout: ctx.checkoutDate,
    });
  }

  /**
   * Revoke any ACTIVE smart_lock_access row for this ERI. Looks up the
   * stored PIN, finds the MyGate room id via the device row, and calls
   * MyGate's revokeAccessByPin (we don't store the MyGate access id
   * directly, so revoke-by-PIN is the right path).
   */
  private async revoke(ctx: AutosyncSideEffectContext): Promise<void> {
    const access = await this.prisma.smart_lock_access.findFirst({
      where: { ezee_reservation_id: ctx.eri, pin_status: 'ACTIVE' },
      include: { mygate_devices: { select: { mygate_room_id: true } } },
    });
    if (!access) {
      // Nothing to revoke — either never provisioned, or already cleaned up.
      return;
    }
    try {
      await this.mygate.revokeAccessByPin(
        ctx.propertyId,
        access.mygate_devices.mygate_room_id,
        access.mygate_pin,
      );
    } catch (err) {
      this.logger.warn(
        `autosync side-effects: MyGate revoke API failed for ERI=${ctx.eri} (continuing to mark row revoked): ${(err as Error).message}`,
      );
    }
    // Always flip our row to REVOKED — even if MyGate's API call failed,
    // we don't want a stale ACTIVE row to block future provisions and the
    // PIN expires server-side on the booking's checkout date anyway.
    await this.prisma.smart_lock_access.update({
      where: { id: access.id },
      data: { pin_status: 'REVOKED', revoked_at: new Date() },
    });
  }

  /**
   * Bust the room-availability cache for every overlapping window we know
   * we cached. CacheService stores availability under
   * `rooms:<propertyId>:<checkin>:<checkout>`, so any window that strictly
   * intersects the booking's dates is invalidated.
   *
   * Without a Redis SCAN helper exposed, the safe approach today is to
   * bust the exact window of the booking and let any other cached windows
   * tick over on their normal TTL. The cache TTL on availability is short
   * (30 min) so a slightly stale entry is bounded.
   */
  private async bustAvailabilityCache(ctx: AutosyncSideEffectContext): Promise<void> {
    if (!ctx.checkinDate || !ctx.checkoutDate) return;
    const checkin = this.formatDate(ctx.checkinDate);
    const checkout = this.formatDate(ctx.checkoutDate);
    const key = CacheService.roomAvailabilityKey(ctx.propertyId, checkin, checkout);
    await this.cache.del(key);
    this.logger.log(
      `autosync side-effects: availability cache busted for ${ctx.propertyId} ${checkin}→${checkout}`,
    );
  }

  private formatDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  /**
   * Cancel breakfast the guest pre-ordered for a morning they will no longer be here for.
   *
   * Only FUTURE service dates: today's breakfast is served around 07:00–10:00 and checkout is
   * later, so a same-day order was very likely already eaten — cancelling it would erase a meal
   * the kitchen really did make. Tomorrow's, which is what they'd have ordered last night, is the
   * one that must go: left PLACED it puts a phantom plate in the forecast and keeps holding a
   * delivery slot another guest could use.
   *
   * Scoped to the sub-bookings that actually ended, so on a multi-room reservation the roommate
   * still in-house keeps their breakfast.
   */
  private async cancelUpcomingBreakfast(ctx: AutosyncSideEffectContext): Promise<void> {
    const today = new Date(`${istDateStr()}T00:00:00.000Z`);
    const subIds = ctx.subBookingIds ?? [];

    const cancelled = await this.prisma.breakfast_order.updateMany({
      where: {
        ezee_reservation_id: ctx.eri,
        ...(subIds.length > 0 ? { sub_booking_id: { in: subIds } } : {}),
        status: 'PLACED',
        service_date: { gt: today },
      },
      data: { status: 'CANCELLED', updated_at: new Date() },
    });

    if (cancelled.count > 0) {
      this.logger.log(
        `autosync side-effects: ${ctx.operation} ERI=${ctx.eri} → cancelled ${cancelled.count} upcoming breakfast order(s)` +
          (subIds.length > 0 ? ` for sub-booking(s) ${subIds.join(', ')}` : ''),
      );
    }
  }
}
