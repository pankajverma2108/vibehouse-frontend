import { Injectable, Logger } from '@nestjs/common';
import { Prisma, coupons } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';

export interface FindApplicableInput {
  propertyId: string;
  guestId: string;
  stayNights: number;
  subtotal: number; // pre-discount room + addon total in rupees
  code?: string;
  skipAuto?: boolean; // guest unchecked the auto coupon (wants to use only their code)
  excludeEri?: string; // when re-evaluating an existing booking, exclude its own row from the new-guest check
  now?: Date;
}

export interface AppliedCoupon {
  coupon: coupons;
  discount: number;
  label: string;
}

export interface FindApplicableResult {
  auto: AppliedCoupon | null;
  code: AppliedCoupon | null;
  errors: { field: 'code' | 'auto'; message: string }[];
}

export interface RecordRedemptionInput {
  couponId: string;
  guestId: string;
  eri: string;
  propertyId: string;
  /**
   * The payments.id row that funded this redemption. Optional only because
   * the call is best-effort post-capture (failure to record is logged, not
   * thrown), but in practice the payment ID is always known at the callsite.
   */
  paymentId?: string;
  discountAmount: number;
  kind: 'AUTO' | 'CODE';
}

@Injectable()
export class CouponsService {
  private readonly logger = new Logger(CouponsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Public ─────────────────────────────────────────────────────────────

  async findApplicableForBooking(input: FindApplicableInput): Promise<FindApplicableResult> {
    const now = input.now ?? new Date();
    const errors: FindApplicableResult['errors'] = [];

    // Guest can opt out of the auto coupon (e.g. to use a better code they hold).
    const auto = input.skipAuto ? null : await this.findBestAutoCoupon(input, now, errors);
    const code = input.code
      ? await this.resolveCodeCoupon(input.code.trim().toUpperCase(), input, now, errors)
      : null;

    return { auto, code, errors };
  }

  /**
   * Lists the redeemable code coupons (`ONE_TIME_CODE`) that a guest could
   * currently use for a property — for the FE's "Have a coupon code?" panel.
   *
   * Filters applied here (cheap, in-DB):
   *   - is_active = true
   *   - currently within validity window (valid_from / valid_until honored, nulls = open)
   *   - property-scoped (applies_to_all_properties OR property in coupon_properties)
   *   - global max_total_uses not exhausted
   *
   * NOT enforced here (would need guest context + a join on redemptions):
   *   - max_uses_per_guest (the per-guest cap)
   *   - min_booking_amount (depends on the cart)
   * These are checked at preview / create-order time and surfaced as soft
   * errors, so showing the coupon in the list but having it fail at apply
   * time is acceptable and consistent with how the rest of the engine works.
   *
   * Auto coupons (NEW_GUEST, STAY_LENGTH) are NOT returned — they have no
   * code to type, the FE doesn't need to list them, and they auto-apply on
   * preview / create-order.
   */
  async listAvailableCodeCoupons(propertyId: string, now = new Date()) {
    const candidates = await this.prisma.coupons.findMany({
      where: {
        type: 'ONE_TIME_CODE',
        is_active: true,
        // Hidden = "invite-only" — coupon still applies if the code is
        // typed at checkout, but it's not advertised on the public rail.
        is_hidden: false,
        OR: [
          { applies_to_all_properties: true },
          { coupon_properties: { some: { property_id: propertyId } } },
        ],
        AND: [
          { OR: [{ valid_from: null }, { valid_from: { lte: now } }] },
          { OR: [{ valid_until: null }, { valid_until: { gte: now } }] },
        ],
      },
      orderBy: { created_at: 'desc' },
    });

    const result: Array<{
      id: string;
      code: string | null;
      name: string | null;
      description: string | null;
      discount_type: string;
      discount_value: number;
      max_discount_amount: number | null;
      min_booking_amount: number;
      valid_until: Date | null;
      summary: string;
    }> = [];

    for (const c of candidates) {
      if (await this.exceededGlobalCap(c)) continue;
      result.push({
        id: c.id,
        code: c.code,
        name: c.name,
        description: c.description,
        discount_type: c.discount_type,
        discount_value: Number(c.discount_value),
        max_discount_amount:
          c.max_discount_amount !== null ? Number(c.max_discount_amount) : null,
        min_booking_amount: Number(c.min_booking_amount),
        valid_until: c.valid_until,
        summary: this.discountSummary(c),
      });
    }
    return result;
  }

  /**
   * Short human-readable discount string for the FE.
   * Examples: "15% off", "₹500 off", "20% off up to ₹1000",
   *           "10% off (min ₹2000)".
   */
  private discountSummary(c: coupons): string {
    const isPercent = c.discount_type === 'PERCENT' || c.discount_type === 'PERCENTAGE';
    const base = isPercent
      ? `${Number(c.discount_value)}% off`
      : `₹${Number(c.discount_value)} off`;
    const cap =
      isPercent && c.max_discount_amount !== null
        ? ` up to ₹${Number(c.max_discount_amount)}`
        : '';
    const minVal = Number(c.min_booking_amount);
    const min = minVal > 0 ? ` (min ₹${minVal})` : '';
    return base + cap + min;
  }

  async recordRedemption(input: RecordRedemptionInput): Promise<void> {
    try {
      await this.prisma.coupon_redemptions.create({
        data: {
          id: `cr-${uuidv4().slice(0, 12)}`,
          coupon_id: input.couponId,
          guest_id: input.guestId,
          ezee_reservation_id: input.eri,
          property_id: input.propertyId,
          payment_id: input.paymentId ?? null,
          discount_amount: new Prisma.Decimal(input.discountAmount.toFixed(2)),
          kind: input.kind,
        },
      });
    } catch (err) {
      // Don't crash payment fulfilment on audit-row failure (FK constraint, duplicate, etc.)
      this.logger.error(
        `recordRedemption failed: coupon=${input.couponId} eri=${input.eri} kind=${input.kind}: ${(err as Error).message}`,
      );
    }
  }

  // ─── Private ────────────────────────────────────────────────────────────

  /**
   * Picks the best auto coupon (STAY_LENGTH or NEW_GUEST, highest discount wins).
   * Returns null if none apply. Pushes any "almost matched" messages to errors.
   */
  private async findBestAutoCoupon(
    input: FindApplicableInput,
    now: Date,
    errors: FindApplicableResult['errors'],
  ): Promise<AppliedCoupon | null> {
    // Pull all active auto-type coupons that pass property scope, valid window,
    // min_booking_amount. We'll then filter by stay length / new-guest status
    // in memory (cheaper than another roundtrip).
    const candidates = await this.prisma.coupons.findMany({
      where: {
        type: { in: ['STAY_LENGTH', 'NEW_GUEST'] },
        is_active: true,
        // Hidden auto-coupons would be unreachable anyway (no code to type),
        // but exclude defensively so admin can hide one to soft-disable.
        is_hidden: false,
        OR: [
          { applies_to_all_properties: true },
          { coupon_properties: { some: { property_id: input.propertyId } } },
        ],
        AND: [
          { OR: [{ valid_from: null }, { valid_from: { lte: now } }] },
          { OR: [{ valid_until: null }, { valid_until: { gte: now } }] },
        ],
        min_booking_amount: { lte: new Prisma.Decimal(input.subtotal.toFixed(2)) },
      },
    });

    // NEW_GUEST is restricted to authenticated guests only. Anonymous flows
    // (BUTEAK no-login + the anonymous coupon preview's sentinel guest_id)
    // would otherwise let anyone collect a "first-stay" discount on every
    // booking by changing their email, which is the fraud vector we want to
    // close.
    //
    // Detection: look up the guest row once. If absent (sentinel) or
    // is_anonymous=true → NEW_GUEST candidates are filtered out before
    // evaluation. The cached row also avoids a round-trip per candidate.
    let guestAnonymousCached: boolean | null = null;
    const isAnonymous = async (): Promise<boolean> => {
      if (guestAnonymousCached === null) {
        const g = await this.prisma.guests.findUnique({
          where: { id: input.guestId },
          select: { is_anonymous: true },
        });
        // Missing row (sentinel used by the anonymous coupon preview) is
        // treated as anonymous for the purpose of this rule.
        guestAnonymousCached = g === null ? true : g.is_anonymous === true;
      }
      return guestAnonymousCached;
    };

    // Lazy: only run isNewGuest if there's a NEW_GUEST candidate
    let newGuestCached: boolean | null = null;
    const isNewGuest = async (): Promise<boolean> => {
      if (newGuestCached === null) {
        newGuestCached = await this.isNewGuest(input.guestId, input.excludeEri);
      }
      return newGuestCached;
    };

    let best: AppliedCoupon | null = null;
    for (const coupon of candidates) {
      // Type-specific check
      if (coupon.type === 'STAY_LENGTH') {
        if (!coupon.min_stay_nights || input.stayNights < coupon.min_stay_nights) continue;
      } else if (coupon.type === 'NEW_GUEST') {
        // Hard gate: anonymous flows can't claim NEW_GUEST.
        if (await isAnonymous()) continue;
        if (!(await isNewGuest())) continue;
      }

      // Per-guest usage cap (skip silently — it's just "no longer eligible")
      if (await this.exceededPerGuestCap(coupon, input.guestId)) continue;
      if (await this.exceededGlobalCap(coupon)) continue;

      const discount = this.computeDiscount(coupon, input.subtotal);
      if (discount <= 0) continue;

      if (!best || discount > best.discount) {
        best = { coupon, discount, label: this.couponLabel(coupon) };
      }
    }

    return best;
  }

  /**
   * Validates a guest-typed code. Returns the applied coupon or null.
   * Pushes a soft error (so the FE can show a toast) if the code is invalid;
   * never throws (FE create-order should not fail just because a code is bad).
   */
  private async resolveCodeCoupon(
    code: string,
    input: FindApplicableInput,
    now: Date,
    errors: FindApplicableResult['errors'],
  ): Promise<AppliedCoupon | null> {
    const coupon = await this.prisma.coupons.findUnique({
      where: { code },
      include: { coupon_properties: { select: { property_id: true } } },
    });

    if (!coupon) {
      errors.push({ field: 'code', message: 'Coupon code not found' });
      return null;
    }
    if (coupon.type !== 'ONE_TIME_CODE') {
      errors.push({ field: 'code', message: 'This code is not redeemable' });
      return null;
    }
    if (!coupon.is_active) {
      errors.push({ field: 'code', message: 'This code is no longer active' });
      return null;
    }
    if (coupon.valid_from && coupon.valid_from > now) {
      errors.push({ field: 'code', message: 'This code is not yet valid' });
      return null;
    }
    if (coupon.valid_until && coupon.valid_until < now) {
      errors.push({ field: 'code', message: 'This code has expired' });
      return null;
    }
    const scoped =
      coupon.applies_to_all_properties ||
      coupon.coupon_properties.some((p) => p.property_id === input.propertyId);
    if (!scoped) {
      errors.push({ field: 'code', message: 'This code is not valid for this property' });
      return null;
    }
    if (new Prisma.Decimal(coupon.min_booking_amount).gt(input.subtotal)) {
      errors.push({
        field: 'code',
        message: `This code requires a minimum booking of ₹${coupon.min_booking_amount}`,
      });
      return null;
    }
    if (await this.exceededPerGuestCap(coupon, input.guestId)) {
      errors.push({ field: 'code', message: 'You have already used this code the maximum number of times' });
      return null;
    }
    if (await this.exceededGlobalCap(coupon)) {
      errors.push({ field: 'code', message: 'This code has reached its usage limit' });
      return null;
    }

    const discount = this.computeDiscount(coupon, input.subtotal);
    if (discount <= 0) {
      errors.push({ field: 'code', message: 'This code does not apply to your booking' });
      return null;
    }
    return { coupon, discount, label: this.couponLabel(coupon) };
  }

  /**
   * "New guest" = no rows in ezee_booking_cache for this guest_id
   * (excluding the in-progress booking itself when re-evaluated).
   * Uses idx_ezee_cache_guest.
   *
   * Test bookings don't count as stay history: if a real guest's phone/account is ever reused for
   * a test, a stray test row must not silently disqualify them from a first-time-guest coupon —
   * a discount lost this way is invisible to us and only noticed by the guest.
   */
  private async isNewGuest(guestId: string, excludeEri?: string): Promise<boolean> {
    const count = await this.prisma.ezee_booking_cache.count({
      where: {
        guest_id: guestId,
        is_active: true,
        is_test: false,
        ...(excludeEri ? { ezee_reservation_id: { not: excludeEri } } : {}),
      },
    });
    return count === 0;
  }

  private async exceededPerGuestCap(coupon: coupons, guestId: string): Promise<boolean> {
    if (coupon.max_uses_per_guest === 0) return false; // 0 = unlimited
    const used = await this.prisma.coupon_redemptions.count({
      where: { coupon_id: coupon.id, guest_id: guestId },
    });
    return used >= coupon.max_uses_per_guest;
  }

  private async exceededGlobalCap(coupon: coupons): Promise<boolean> {
    if (coupon.max_total_uses === null || coupon.max_total_uses === undefined) return false;
    const used = await this.prisma.coupon_redemptions.count({
      where: { coupon_id: coupon.id },
    });
    return used >= coupon.max_total_uses;
  }

  /**
   * Compute ₹ discount given coupon + subtotal. Rounds to 2 decimals.
   * Caps PERCENT discounts at max_discount_amount when set. Never exceeds subtotal.
   */
  private computeDiscount(coupon: coupons, subtotal: number): number {
    let discount: number;
    const isPercent = coupon.discount_type === 'PERCENT' || coupon.discount_type === 'PERCENTAGE';
    if (isPercent) {
      discount = (subtotal * Number(coupon.discount_value)) / 100;
      if (coupon.max_discount_amount !== null && coupon.max_discount_amount !== undefined) {
        const cap = Number(coupon.max_discount_amount);
        if (discount > cap) discount = cap;
      }
    } else {
      discount = Number(coupon.discount_value);
    }
    if (discount > subtotal) discount = subtotal;
    return Math.round(discount * 100) / 100;
  }

  private couponLabel(coupon: coupons): string {
    const isPercent = coupon.discount_type === 'PERCENT' || coupon.discount_type === 'PERCENTAGE';
    const value = isPercent
      ? `${coupon.discount_value}% off`
      : `₹${coupon.discount_value} off`;
    switch (coupon.type) {
      case 'STAY_LENGTH':
        return `${value} for ${coupon.min_stay_nights}+ night stays`;
      case 'NEW_GUEST':
        return `${value} on your first booking`;
      case 'ONE_TIME_CODE':
        return `${value} (${coupon.code})`;
      default:
        return value;
    }
  }
}
