import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AdminJwtPayload } from '../../common/guards/admin-jwt.strategy';
import { DashboardQueryDto, ensureSingleScopeAxis } from './dto/dashboard-query.dto';
import { BreakdownQueryDto, RevenueQueryDto } from './dto/revenue-query.dto';
import { CouponsWidgetQueryDto, ListPaymentsQueryDto } from './dto/payments-query.dto';
import { classifyBookingSource, type BookingChannel } from './booking-sources';

const DEFAULT_TOP_COUPONS = 10;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

const STALE_PENDING_MINUTES = 30;

interface DateWindow {
  fromInclusive: Date;
  toExclusive: Date;
}

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Top-line tiles for the dashboard header. One call returns everything
   * the FE needs to render the row of summary cards, computed in parallel
   * over the date window + property scope. Per-payment-row details and
   * drill-downs are exposed on separate endpoints (Phase 2/3).
   */
  async summary(query: DashboardQueryDto, actor: AdminJwtPayload) {
    ensureSingleScopeAxis(query);
    const propertyIds = await this.resolvePropertyScope(query, actor);
    const window = this.resolveDateWindow(query);

    // No accessible properties → return zeros instead of throwing; lets the
    // FE render the dashboard for fresh admins who haven't been assigned yet.
    if (propertyIds.length === 0) {
      return this.emptySummary(window, propertyIds);
    }

    const baseWhere: Prisma.paymentsWhereInput = {
      property_id: { in: propertyIds },
      created_at: { gte: window.fromInclusive, lt: window.toExclusive },
    };

    const [
      capturedByPurpose,
      bookingCountAgg,
      discountAgg,
      capturedCount,
      failedAgg,
      stalePendingCount,
      bookingsBreakdown,
    ] = await Promise.all([
      // Revenue per purpose in a single group-by — covers gross + per-purpose
      // tiles without N round trips.
      this.prisma.payments.groupBy({
        by: ['purpose'],
        where: { ...baseWhere, status: 'CAPTURED' },
        _sum: { amount: true },
      }),
      // Distinct bookings count: payments grouped by reservation, then we
      // count the buckets in JS — Prisma doesn't expose COUNT(DISTINCT) but
      // groupBy + .length is fine at dashboard volumes.
      this.prisma.payments.groupBy({
        by: ['ezee_reservation_id'],
        // purpose is stored LOWERCASE by PaymentService ('booking' /
        // 'addon_upsell' / 'colive'). The dashboard previously filtered
        // uppercase 'BOOKING' → matched nothing → every booking tile read 0
        // while the breakdown (no purpose filter) showed the real total.
        where: { ...baseWhere, status: 'CAPTURED', purpose: 'booking' },
        _count: { _all: true },
      }),
      // Coupon discount applied: join via payment.status to only count
      // discounts that actually backed a captured payment (avoids inflating
      // with redemptions that were rolled back when a payment failed).
      this.prisma.coupon_redemptions.aggregate({
        where: {
          property_id: { in: propertyIds },
          applied_at: { gte: window.fromInclusive, lt: window.toExclusive },
          payments: { is: { status: 'CAPTURED' } },
        },
        _sum: { discount_amount: true },
      }),
      this.prisma.payments.count({ where: { ...baseWhere, status: 'CAPTURED' } }),
      this.prisma.payments.aggregate({
        where: { ...baseWhere, status: 'FAILED' },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      // Operational alert: PENDING rows older than 30 min are stuck — the
      // Razorpay order was never paid or the webhook was never received.
      this.prisma.payments.count({
        where: {
          property_id: { in: propertyIds },
          status: 'PENDING',
          created_at: { lt: new Date(Date.now() - STALE_PENDING_MINUTES * 60_000) },
        },
      }),
      // Layer B + C: bookings counted from ezee_booking_cache (every channel —
      // PWA-Razorpay, OTA, walk-in), on the CHECK-IN date axis, plus a
      // double-count-free total-revenue figure. See computeBookingsBreakdown.
      this.computeBookingsBreakdown(propertyIds, window),
    ]);

    const revenueByPurpose = this.mapPurposeRevenue(capturedByPurpose);
    const bookingsCount = bookingCountAgg.length;
    const aov =
      bookingsCount > 0 ? Number((revenueByPurpose.booking / bookingsCount).toFixed(2)) : 0;
    const discountValue = Number(discountAgg._sum.discount_amount ?? 0);
    // Gross = every captured purpose, so it matches the breakdown + trend
    // (which never filtered by purpose). Previously this summed only the three
    // named buckets, which all read 0 due to the case mismatch.
    const grossRevenue = revenueByPurpose.total;
    const denominator = revenueByPurpose.booking + discountValue;
    const discountRate =
      denominator > 0 ? Number(((discountValue / denominator) * 100).toFixed(2)) : 0;
    const captureRate =
      capturedCount + failedAgg._count._all + stalePendingCount > 0
        ? Number(
            (
              (capturedCount /
                (capturedCount + failedAgg._count._all + stalePendingCount)) *
              100
            ).toFixed(2),
          )
        : 0;

    return {
      window: {
        from: this.formatDate(window.fromInclusive),
        to: this.formatDate(this.toInclusiveDate(window.toExclusive)),
      },
      scope: { property_ids: propertyIds, brand: query.brand ?? null },
      revenue: {
        gross: grossRevenue,
        booking: revenueByPurpose.booking,
        addon: revenueByPurpose.addon,
        extension: revenueByPurpose.extension,
        currency: 'INR',
      },
      bookings: {
        count: bookingsCount,
        avg_value: aov,
      },
      coupons: {
        discount_value: discountValue,
        discount_rate_pct: discountRate,
      },
      payments: {
        captured_count: capturedCount,
        failed_count: failedAgg._count._all,
        failed_amount: Number(failedAgg._sum.amount ?? 0),
        stale_pending_count: stalePendingCount,
        capture_rate_pct: captureRate,
      },
      // Layer B — all bookings the property actually has in the window (every
      // channel), so the FE can show a "Total bookings" tile that matches the
      // admin Bookings list. Counted on the CHECK-IN date axis.
      bookings_all: bookingsBreakdown.bookings_all,
      // Test bookings in the window. Deliberately NOT folded into bookings_all or revenue — an
      // aggregate has no row to tag, so the only way to both keep the numbers honest and let ops
      // see what's test is to report it separately. Usually 0.
      test_bookings: bookingsBreakdown.test_bookings,
      bookings_by_source: bookingsBreakdown.bookings_by_source,
      // Layer C — revenue across every channel, no double-counting: each
      // booking contributes its Razorpay-captured amount if we collected it,
      // else its eZee folio total. OTA folio is GROSS of OTA commission —
      // see the doc + the FE handoff for the caveat.
      total_revenue: bookingsBreakdown.total_revenue,
    };
  }

  /**
   * Bookings + revenue counted from `ezee_booking_cache` (the canonical record
   * of every booking, regardless of payment channel) rather than `payments`
   * (Razorpay-captured only). This is what closes the "dashboard shows 0 but
   * I have bookings" gap for OTA-heavy properties.
   *
   * Date axis: CHECK-IN date (the natural "bookings this month" question for
   * ops), distinct from the Razorpay-revenue tiles which use payment
   * created_at. The two axes are intentionally different — each is the right
   * one for its tile.
   *
   * total_revenue avoids double-counting: a booking contributes its
   * Razorpay-captured sum if we collected the money, otherwise its eZee folio
   * total (OTA / walk-in). Cancelled / no-show bookings are excluded from both
   * counts and revenue (but surfaced as `cancelled` for context).
   */
  private async computeBookingsBreakdown(
    propertyIds: string[],
    window: DateWindow,
  ): Promise<{
    bookings_all: {
      total: number;
      ota: number;
      direct: number;
      own: number;
      other: number;
      cancelled: number;
      razorpay_paid: number;
    };
    /** Test bookings in the window — excluded from every figure above; reported so ops can see them. */
    test_bookings: number;
    bookings_by_source: Array<{ source: string; channel: BookingChannel; count: number }>;
    total_revenue: {
      razorpay: number;
      ota_folio: number;
      direct_folio: number;
      total: number;
      currency: 'INR';
    };
  }> {
    // All cache rows with check-in in the window (active = excludes soft-deleted
    // rows). We fetch the few columns we need and classify in JS because the
    // OTA / direct mapping is app-side logic Prisma groupBy can't express.
    const rows = await this.prisma.ezee_booking_cache.findMany({
      where: {
        property_id: { in: propertyIds },
        is_active: true,
        checkin_date: { gte: window.fromInclusive, lt: window.toExclusive },
      },
      select: {
        ezee_reservation_id: true,
        source: true,
        status: true,
        folio_total_after_tax: true,
        is_test: true,
      },
    });

    // Which of these bookings have a Razorpay-captured BOOKING payment, and how
    // much we actually collected per booking. Keyed by ERI so we can prefer the
    // real collection over the folio rate.
    const eris = rows.map((r) => r.ezee_reservation_id);
    const capturedByEri = new Map<string, number>();
    if (eris.length > 0) {
      const captured = await this.prisma.payments.groupBy({
        by: ['ezee_reservation_id'],
        where: {
          ezee_reservation_id: { in: eris },
          status: 'CAPTURED',
          purpose: 'booking', // lowercase — see note on bookingCountAgg above
        },
        _sum: { amount: true },
      });
      for (const c of captured) {
        if (c.ezee_reservation_id) {
          capturedByEri.set(c.ezee_reservation_id, Number(c._sum.amount ?? 0));
        }
      }
    }

    const TERMINAL = new Set(['CANCELLED', 'NO_SHOW']);
    const bookings_all = {
      total: 0,
      ota: 0,
      direct: 0,
      own: 0,
      other: 0,
      cancelled: 0,
      razorpay_paid: 0,
    };
    const bySource = new Map<string, { channel: BookingChannel; count: number }>();
    let razorpayRevenue = 0;
    let otaFolio = 0;
    let directFolio = 0;

    let testBookings = 0;

    for (const r of rows) {
      // Admin-made test bookings are real rows describing an unreal stay: no one paid, no room
      // was sold. They're kept out of every count and out of revenue (a test's folio total would
      // otherwise land straight in the headline figure), and surfaced as their own number so ops
      // can still see that tests are running rather than wondering where a booking went.
      if (r.is_test) {
        testBookings += 1;
        continue;
      }

      const status = (r.status ?? '').toUpperCase();
      if (TERMINAL.has(status)) {
        bookings_all.cancelled += 1;
        continue; // excluded from active counts + revenue
      }

      const channel = classifyBookingSource(r.source);
      bookings_all.total += 1;
      bookings_all[channel] += 1;

      // by-source histogram (raw source string preserved so ops can spot
      // un-classified channels; null → "Walk-In / Direct" bucket label).
      const label = r.source && r.source.trim() ? r.source.trim() : 'Walk-In / Direct';
      const entry = bySource.get(label) ?? { channel, count: 0 };
      entry.count += 1;
      bySource.set(label, entry);

      // Revenue: prefer what we actually collected via Razorpay; otherwise the
      // eZee folio total (OTA / walk-in guest-facing rate).
      const captured = capturedByEri.get(r.ezee_reservation_id);
      if (captured !== undefined && captured > 0) {
        razorpayRevenue += captured;
        bookings_all.razorpay_paid += 1;
      } else {
        const folio = r.folio_total_after_tax !== null ? Number(r.folio_total_after_tax) : 0;
        if (channel === 'ota') otaFolio += folio;
        else directFolio += folio;
      }
    }

    const round2 = (n: number) => Math.round(n * 100) / 100;
    return {
      bookings_all,
      test_bookings: testBookings,
      bookings_by_source: Array.from(bySource.entries())
        .map(([source, v]) => ({ source, channel: v.channel, count: v.count }))
        .sort((a, b) => b.count - a.count),
      total_revenue: {
        razorpay: round2(razorpayRevenue),
        ota_folio: round2(otaFolio),
        direct_folio: round2(directFolio),
        total: round2(razorpayRevenue + otaFolio + directFolio),
        currency: 'INR',
      },
    };
  }

  /**
   * Time-series of captured revenue, bucketed by day / week / month. When
   * `groupBy=purpose` each bucket is pivoted into BOOKING/ADDON/EXTENSION
   * columns so the FE can render a stacked chart in one pass.
   *
   * Implemented with `$queryRaw` because Prisma's `groupBy` can't bucket on
   * `date_trunc(...)`. The query keeps the same `property_id IN (...)`
   * scoping the rest of the dashboard uses.
   */
  async revenue(query: RevenueQueryDto, actor: AdminJwtPayload) {
    ensureSingleScopeAxis(query);
    const propertyIds = await this.resolvePropertyScope(query, actor);
    const window = this.resolveDateWindow(query);
    const granularity = query.granularity ?? 'day';

    if (propertyIds.length === 0) {
      return {
        window: this.serialiseWindow(window),
        scope: { property_ids: propertyIds, brand: query.brand ?? null },
        granularity,
        groupBy: query.groupBy ?? null,
        series: [],
      };
    }

    const rows = await this.prisma.$queryRaw<
      Array<{ bucket: Date; purpose: string; total: Prisma.Decimal }>
    >(Prisma.sql`
      SELECT
        date_trunc(${granularity}, "created_at") AS bucket,
        "purpose"                                AS purpose,
        SUM("amount")                            AS total
      FROM "payments"
      WHERE "status" = 'CAPTURED'
        AND "property_id" IN (${Prisma.join(propertyIds)})
        AND "created_at" >= ${window.fromInclusive}
        AND "created_at" <  ${window.toExclusive}
      GROUP BY bucket, purpose
      ORDER BY bucket ASC
    `);

    const series = query.groupBy === 'purpose'
      ? this.pivotByPurpose(rows)
      : this.collapsePurpose(rows);

    return {
      window: this.serialiseWindow(window),
      scope: { property_ids: propertyIds, brand: query.brand ?? null },
      granularity,
      groupBy: query.groupBy ?? null,
      series,
    };
  }

  /**
   * Aggregate captured revenue + booking count by one of: property, brand,
   * purpose. Used for the dashboard's drill-down cards (pie/donut, ranked
   * lists). Brand grouping is done in-process — we fetch the property→brand
   * map once, then fold the per-property groupBy result by brand.
   */
  async breakdown(query: BreakdownQueryDto, actor: AdminJwtPayload) {
    ensureSingleScopeAxis(query);
    const propertyIds = await this.resolvePropertyScope(query, actor);
    const window = this.resolveDateWindow(query);

    if (propertyIds.length === 0) {
      return {
        window: this.serialiseWindow(window),
        scope: { property_ids: propertyIds, brand: query.brand ?? null },
        by: query.by,
        items: [],
      };
    }

    const baseWhere: Prisma.paymentsWhereInput = {
      status: 'CAPTURED',
      property_id: { in: propertyIds },
      created_at: { gte: window.fromInclusive, lt: window.toExclusive },
    };

    let items: Array<{ key: string; label: string; revenue: number; count: number }>;

    if (query.by === 'purpose') {
      const rows = await this.prisma.payments.groupBy({
        by: ['purpose'],
        where: baseWhere,
        _sum: { amount: true },
        _count: { _all: true },
      });
      items = rows.map((r) => ({
        key: r.purpose,
        label: this.purposeLabel(r.purpose),
        revenue: Number(r._sum.amount ?? 0),
        count: r._count._all,
      }));
    } else {
      // Both `property` and `brand` start from the same per-property groupBy.
      const rows = await this.prisma.payments.groupBy({
        by: ['property_id'],
        where: baseWhere,
        _sum: { amount: true },
        _count: { _all: true },
      });

      const props = await this.prisma.properties.findMany({
        where: { id: { in: propertyIds } },
        select: { id: true, name: true, brand: true },
      });
      const propMap = new Map(props.map((p) => [p.id, p]));

      if (query.by === 'property') {
        items = rows.map((r) => {
          const p = propMap.get(r.property_id!);
          return {
            key: r.property_id ?? 'unknown',
            label: p?.name ?? r.property_id ?? 'unknown',
            revenue: Number(r._sum.amount ?? 0),
            count: r._count._all,
          };
        });
      } else {
        // by === 'brand'
        const byBrand = new Map<string, { revenue: number; count: number }>();
        for (const r of rows) {
          const brand = (r.property_id && propMap.get(r.property_id)?.brand) ?? 'UNKNOWN';
          const bucket = byBrand.get(brand) ?? { revenue: 0, count: 0 };
          bucket.revenue += Number(r._sum.amount ?? 0);
          bucket.count += r._count._all;
          byBrand.set(brand, bucket);
        }
        items = Array.from(byBrand.entries()).map(([brand, v]) => ({
          key: brand,
          label: brand,
          revenue: v.revenue,
          count: v.count,
        }));
      }
    }

    items.sort((a, b) => b.revenue - a.revenue);

    return {
      window: this.serialiseWindow(window),
      scope: { property_ids: propertyIds, brand: query.brand ?? null },
      by: query.by,
      items,
    };
  }

  /**
   * Coupon analytics widget: top N coupons by discount given in the window
   * (only counting redemptions whose backing payment was CAPTURED — avoids
   * inflating with abandoned-checkout redemptions if we ever pre-write
   * them) + per-type totals (STAY_LENGTH / ONE_TIME_CODE / NEW_GUEST).
   */
  async couponsWidget(query: CouponsWidgetQueryDto, actor: AdminJwtPayload) {
    ensureSingleScopeAxis(query);
    const propertyIds = await this.resolvePropertyScope(query, actor);
    const window = this.resolveDateWindow(query);
    const topN = query.top ?? DEFAULT_TOP_COUPONS;

    if (propertyIds.length === 0) {
      return {
        window: this.serialiseWindow(window),
        scope: { property_ids: propertyIds, brand: query.brand ?? null },
        top_coupons: [],
        by_type: [],
      };
    }

    const redemptionWhere: Prisma.coupon_redemptionsWhereInput = {
      property_id: { in: propertyIds },
      applied_at: { gte: window.fromInclusive, lt: window.toExclusive },
      payments: { is: { status: 'CAPTURED' } },
    };

    const grouped = await this.prisma.coupon_redemptions.groupBy({
      by: ['coupon_id'],
      where: redemptionWhere,
      _sum: { discount_amount: true },
      _count: { _all: true },
    });

    // Sort + slice in-memory: dashboard volumes (a few hundred coupons at
    // most) make this cheaper than orderBy + take at the DB layer.
    grouped.sort((a, b) => Number(b._sum.discount_amount ?? 0) - Number(a._sum.discount_amount ?? 0));
    const topGrouped = grouped.slice(0, topN);

    const coupons = topGrouped.length
      ? await this.prisma.coupons.findMany({
          where: { id: { in: topGrouped.map((g) => g.coupon_id) } },
          select: { id: true, code: true, name: true, type: true, discount_type: true },
        })
      : [];
    const couponById = new Map(coupons.map((c) => [c.id, c]));

    const topCoupons = topGrouped.map((g) => {
      const c = couponById.get(g.coupon_id);
      return {
        coupon_id: g.coupon_id,
        code: c?.code ?? null,
        name: c?.name ?? null,
        type: c?.type ?? null,
        discount_type: c?.discount_type ?? null,
        discount_value: Number(g._sum.discount_amount ?? 0),
        redemption_count: g._count._all,
      };
    });

    // Per-type totals: same redemption filter, group by coupon.type via a
    // separate query (Prisma groupBy can't pivot through a relation).
    const allRedemptions = await this.prisma.coupon_redemptions.findMany({
      where: redemptionWhere,
      select: { discount_amount: true, coupons: { select: { type: true } } },
    });
    const byType = new Map<string, { discount_value: number; redemption_count: number }>();
    for (const r of allRedemptions) {
      const type = r.coupons.type;
      const bucket = byType.get(type) ?? { discount_value: 0, redemption_count: 0 };
      bucket.discount_value += Number(r.discount_amount);
      bucket.redemption_count += 1;
      byType.set(type, bucket);
    }

    return {
      window: this.serialiseWindow(window),
      scope: { property_ids: propertyIds, brand: query.brand ?? null },
      top_coupons: topCoupons,
      by_type: Array.from(byType.entries())
        .map(([type, v]) => ({ type, ...v }))
        .sort((a, b) => b.discount_value - a.discount_value),
    };
  }

  /**
   * Paginated, filterable payments list. Ops drill from any tile into the
   * underlying rows. Returns the `admin-bookings.service.ts` pagination
   * envelope shape so the FE can reuse its existing list component.
   */
  async paymentsList(query: ListPaymentsQueryDto, actor: AdminJwtPayload) {
    ensureSingleScopeAxis(query);
    const propertyIds = await this.resolvePropertyScope(query, actor);
    const window = this.resolveDateWindow(query);
    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;

    if (propertyIds.length === 0) {
      return { items: [], pagination: { page, limit, total: 0, total_pages: 0 } };
    }

    const where: Prisma.paymentsWhereInput = {
      property_id: { in: propertyIds },
      created_at: { gte: window.fromInclusive, lt: window.toExclusive },
      ...(query.status ? { status: query.status } : {}),
      ...(query.purpose ? { purpose: query.purpose } : {}),
      ...(query.search
        ? {
            OR: [
              { razorpay_order_id: { contains: query.search, mode: 'insensitive' } },
              { razorpay_payment_id: { contains: query.search, mode: 'insensitive' } },
              { guests: { is: { email: { contains: query.search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.payments.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          ezee_reservation_id: true,
          property_id: true,
          razorpay_order_id: true,
          razorpay_payment_id: true,
          amount: true,
          currency: true,
          purpose: true,
          status: true,
          created_at: true,
          updated_at: true,
          guests: { select: { email: true } },
          coupon_redemptions: {
            select: {
              discount_amount: true,
              coupons: { select: { code: true, name: true, type: true } },
            },
          },
        },
      }),
      this.prisma.payments.count({ where }),
    ]);

    return {
      items: items.map((p) => ({
        id: p.id,
        ezee_reservation_id: p.ezee_reservation_id,
        property_id: p.property_id,
        razorpay_order_id: p.razorpay_order_id,
        razorpay_payment_id: p.razorpay_payment_id,
        amount: Number(p.amount),
        currency: p.currency,
        purpose: p.purpose,
        status: p.status,
        guest_email: p.guests?.email ?? null,
        coupons_applied: p.coupon_redemptions.map((r) => ({
          code: r.coupons.code,
          name: r.coupons.name,
          type: r.coupons.type,
          discount_amount: Number(r.discount_amount),
        })),
        created_at: p.created_at,
        updated_at: p.updated_at,
      })),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Single-payment detail — joined booking, addon order (if any), and
   * coupon redemptions. Convenience wrapper over findUnique with includes.
   */
  async paymentDetail(id: string, actor: AdminJwtPayload) {
    const payment = await this.prisma.payments.findUnique({
      where: { id },
      include: {
        guests: { select: { id: true, name: true, email: true, phone: true } },
        ezee_booking_cache: {
          select: {
            ezee_reservation_id: true,
            ezee_reservation_no: true,
            property_id: true,
            room_type_name: true,
            checkin_date: true,
            checkout_date: true,
            no_of_guests: true,
            status: true,
            discount_total: true,
          },
        },
        addon_orders: {
          select: {
            id: true,
            phase: true,
            status: true,
            ezee_sync_status: true,
            created_at: true,
          },
        },
        coupon_redemptions: {
          include: {
            coupons: { select: { id: true, code: true, name: true, type: true } },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Scope check after fetch so we don't leak the existence of payments
    // belonging to properties outside the actor's scope.
    if (payment.property_id && !actor.property_ids.includes(payment.property_id)) {
      throw new ForbiddenException('Payment belongs to a property outside your scope');
    }

    return {
      id: payment.id,
      ezee_reservation_id: payment.ezee_reservation_id,
      property_id: payment.property_id,
      razorpay_order_id: payment.razorpay_order_id,
      razorpay_payment_id: payment.razorpay_payment_id,
      amount: Number(payment.amount),
      currency: payment.currency,
      purpose: payment.purpose,
      status: payment.status,
      expires_at: payment.expires_at,
      created_at: payment.created_at,
      updated_at: payment.updated_at,
      guest: payment.guests,
      booking: payment.ezee_booking_cache
        ? {
            ezee_reservation_id: payment.ezee_booking_cache.ezee_reservation_id,
            ezee_reservation_no: payment.ezee_booking_cache.ezee_reservation_no,
            property_id: payment.ezee_booking_cache.property_id,
            room_type_name: payment.ezee_booking_cache.room_type_name,
            checkin_date: payment.ezee_booking_cache.checkin_date,
            checkout_date: payment.ezee_booking_cache.checkout_date,
            no_of_guests: payment.ezee_booking_cache.no_of_guests,
            status: payment.ezee_booking_cache.status,
            discount_total: Number(payment.ezee_booking_cache.discount_total),
          }
        : null,
      addon_orders: payment.addon_orders,
      coupon_redemptions: payment.coupon_redemptions.map((r) => ({
        id: r.id,
        coupon_id: r.coupon_id,
        coupon_code: r.coupons.code,
        coupon_name: r.coupons.name,
        coupon_type: r.coupons.type,
        kind: r.kind,
        discount_amount: Number(r.discount_amount),
        applied_at: r.applied_at,
      })),
    };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  /**
   * Resolves the effective `property_id IN (…)` list for the request:
   *   - If `property_id` is given: that single property, validated against
   *     the actor's allowed set.
   *   - If `brand` is given: every property of that brand that the actor is
   *     also allowed to see.
   *   - Otherwise: every property the actor is allowed to see.
   *
   * Returning `[]` is valid (means "no scope" — service will short-circuit
   * to a zeroed response rather than running queries with no filter).
   */
  private async resolvePropertyScope(
    query: DashboardQueryDto,
    actor: AdminJwtPayload,
  ): Promise<string[]> {
    if (query.property_id) {
      if (!actor.property_ids.includes(query.property_id)) {
        throw new ForbiddenException(`Not authorised for property ${query.property_id}`);
      }
      return [query.property_id];
    }
    if (query.brand) {
      const brandProps = await this.prisma.properties.findMany({
        where: { brand: query.brand, id: { in: actor.property_ids } },
        select: { id: true },
      });
      return brandProps.map((p) => p.id);
    }
    return actor.property_ids;
  }

  /**
   * Resolves `from`/`to` to a half-open [fromInclusive, toExclusive) window.
   * Defaults: 30 days ago → today (so `to` defaults include the current
   * partial day). We convert `to` to "next day at 00:00" so equality on
   * inclusive boundaries works without timezone games.
   */
  private resolveDateWindow(query: DashboardQueryDto): DateWindow {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const fromInclusive = query.from
      ? this.parseDateUTC(query.from)
      : new Date(today.getTime() - 30 * 24 * 60 * 60_000);
    const toInclusive = query.to ? this.parseDateUTC(query.to) : today;
    const toExclusive = new Date(toInclusive.getTime() + 24 * 60 * 60_000);
    return { fromInclusive, toExclusive };
  }

  private parseDateUTC(s: string): Date {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }

  private toInclusiveDate(toExclusive: Date): Date {
    return new Date(toExclusive.getTime() - 24 * 60 * 60_000);
  }

  private formatDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private mapPurposeRevenue(
    rows: Array<{ purpose: string; _sum: { amount: Prisma.Decimal | null } }>,
  ) {
    // `total` sums EVERY captured purpose (booking / addon / extension /
    // colive / anything new) so `revenue.gross` always reconciles with the
    // breakdown + trend (which don't filter by purpose). The named buckets
    // are sub-categories and may not add up to total (e.g. colive sits
    // outside them). purpose is stored lowercase — compare case-insensitively
    // so a future casing change can't silently zero a tile again.
    const out = { booking: 0, addon: 0, extension: 0, total: 0 };
    for (const row of rows) {
      const amount = Number(row._sum.amount ?? 0);
      out.total += amount;
      switch ((row.purpose ?? '').toLowerCase()) {
        case 'booking':
          out.booking += amount;
          break;
        case 'addon_upsell':
          out.addon += amount;
          break;
        case 'stay_extension':
          out.extension += amount;
          break;
        // colive + any unknown purpose still count toward `total` (gross)
        // but aren't broken out into a named bucket.
      }
    }
    return out;
  }

  private serialiseWindow(window: DateWindow) {
    return {
      from: this.formatDate(window.fromInclusive),
      to: this.formatDate(this.toInclusiveDate(window.toExclusive)),
    };
  }

  private purposeLabel(purpose: string): string {
    switch ((purpose ?? '').toLowerCase()) {
      case 'booking':
        return 'Bookings';
      case 'addon_upsell':
        return 'Addons';
      case 'stay_extension':
        return 'Stay extensions';
      case 'colive':
        return 'Co-live';
      default:
        return purpose;
    }
  }

  /**
   * Collapse "rows per (bucket × purpose)" into a flat series where each
   * entry is one bucket with the total revenue across all purposes.
   */
  private collapsePurpose(
    rows: Array<{ bucket: Date; purpose: string; total: Prisma.Decimal }>,
  ) {
    const byBucket = new Map<string, number>();
    for (const r of rows) {
      const key = this.formatDate(r.bucket);
      byBucket.set(key, (byBucket.get(key) ?? 0) + Number(r.total));
    }
    return Array.from(byBucket.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({ date, revenue }));
  }

  /**
   * Pivot "rows per (bucket × purpose)" into one entry per bucket with one
   * column per purpose — what a stacked chart wants.
   */
  private pivotByPurpose(
    rows: Array<{ bucket: Date; purpose: string; total: Prisma.Decimal }>,
  ) {
    const byBucket = new Map<
      string,
      { date: string; BOOKING: number; ADDON_UPSELL: number; STAY_EXTENSION: number }
    >();
    for (const r of rows) {
      const date = this.formatDate(r.bucket);
      const entry =
        byBucket.get(date) ?? { date, BOOKING: 0, ADDON_UPSELL: 0, STAY_EXTENSION: 0 };
      const amount = Number(r.total);
      // Input purpose is lowercase; output column keys stay uppercase for FE
      // chart compatibility.
      switch ((r.purpose ?? '').toLowerCase()) {
        case 'booking':
          entry.BOOKING += amount;
          break;
        case 'addon_upsell':
          entry.ADDON_UPSELL += amount;
          break;
        case 'stay_extension':
          entry.STAY_EXTENSION += amount;
          break;
      }
      byBucket.set(date, entry);
    }
    return Array.from(byBucket.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  private emptySummary(window: DateWindow, propertyIds: string[]) {
    return {
      window: {
        from: this.formatDate(window.fromInclusive),
        to: this.formatDate(this.toInclusiveDate(window.toExclusive)),
      },
      scope: { property_ids: propertyIds, brand: null },
      revenue: { gross: 0, booking: 0, addon: 0, extension: 0, currency: 'INR' },
      bookings: { count: 0, avg_value: 0 },
      coupons: { discount_value: 0, discount_rate_pct: 0 },
      payments: {
        captured_count: 0,
        failed_count: 0,
        failed_amount: 0,
        stale_pending_count: 0,
        capture_rate_pct: 0,
      },
      bookings_all: {
        total: 0,
        ota: 0,
        direct: 0,
        own: 0,
        other: 0,
        cancelled: 0,
        razorpay_paid: 0,
      },
      bookings_by_source: [] as Array<{ source: string; channel: BookingChannel; count: number }>,
      total_revenue: {
        razorpay: 0,
        ota_folio: 0,
        direct_folio: 0,
        total: 0,
        currency: 'INR' as const,
      },
    };
  }
}
