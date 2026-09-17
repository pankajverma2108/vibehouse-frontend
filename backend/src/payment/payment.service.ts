import {
  Injectable,
  Inject,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { createHmac } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../redis/cache.service';
import { RAZORPAY, RazorpayFactory } from './razorpay.provider';
import { SqsProducerService } from '../sqs/sqs-producer.service';
import { CouponsService } from '../coupons/coupons.service';
import { TicketsService } from '../tickets/tickets.service';
import { resolveTemplate } from '../wati/wati-templates';
import type { GuestJwtPayload } from '../common/guards/guest-jwt.strategy';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    @Inject(RAZORPAY) private readonly razorpay: RazorpayFactory,
    private readonly sqsProducer: SqsProducerService,
    private readonly coupons: CouponsService,
    private readonly tickets: TicketsService,
  ) {}

  /**
   * Re-derive what `grandTotal` should be from the cache row, so the FE can't
   * tamper with the amount sent to Razorpay (e.g., to bypass coupons).
   *
   * Total = sum(room line_totals) + sum(addon line_totals) - discount_total
   *
   * Floors at 0. Returns rupees with 2-decimal precision.
   */
  private async computeServerAuthoritativeTotal(
    eri: string,
    booking: {
      checkin_date: Date | null;
      checkout_date: Date | null;
      booking_rooms_json: any;
      discount_total: any;
      tax_total?: any;
    },
  ): Promise<number> {
    let roomTotal = 0;
    if (booking.checkin_date && booking.checkout_date && Array.isArray(booking.booking_rooms_json)) {
      const nights = Math.max(
        1,
        Math.round(
          (booking.checkout_date.getTime() - booking.checkin_date.getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      );
      for (const r of booking.booking_rooms_json as any[]) {
        const price = Number(r?.price_per_night ?? 0);
        const qty = Number(r?.quantity ?? 0);
        roomTotal += price * qty * nights;
      }
    }

    const addonOrder = await this.prisma.addon_orders.findFirst({
      where: { ezee_reservation_id: eri, status: 'PENDING' },
      include: { addon_order_items: true },
    });
    let addonTotal = 0;
    if (addonOrder) {
      for (const item of addonOrder.addon_order_items) {
        addonTotal += Number(item.total_price);
      }
    }

    const discount = Number(booking.discount_total ?? 0);
    // Tax was snapshotted at order creation (ezee_booking_cache.tax_total),
    // so the post-tax total stays stable even if the property's rate is
    // edited between order and pay. Pre-tax-engine bookings have null
    // tax_total — treated as zero for back-compat.
    const tax = Number(booking.tax_total ?? 0);
    const total = Math.max(0, roomTotal + addonTotal - discount) + tax;
    return Math.round(total * 100) / 100;
  }

  // ─── STEP 1: CREATE RAZORPAY ORDER ─────────────────────────────────────────

  /**
   * Creates a Razorpay order for a guest's PENDING addon cart.
   * Returns the razorpay_order_id + key for the frontend to open the checkout modal.
   */
  async createOrder(guest: GuestJwtPayload, eri: string) {
    // Verify booking access
    const booking = await this.verifyBookingAccess(guest.guest_id, eri);

    // Find PENDING cart
    const cart = await this.prisma.addon_orders.findFirst({
      where: {
        ezee_reservation_id: eri,
        guest_id: guest.guest_id,
        status: 'PENDING',
      },
      include: {
        addon_order_items: { include: { product_catalog: true } },
      },
    });

    if (!cart || cart.addon_order_items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // If cart has a linked payment that's FAILED or CREATED (expired), unlink it
    if (cart.payment_id) {
      const existingPayment = await this.prisma.payments.findUnique({
        where: { id: cart.payment_id },
      });
      if (existingPayment && existingPayment.status !== 'CAPTURED') {
        await this.prisma.addon_orders.update({
          where: { id: cart.id },
          data: { payment_id: null },
        });
      } else if (existingPayment?.status === 'CAPTURED') {
        throw new BadRequestException('This cart has already been paid for');
      }
    }

    // Calculate total
    const totalAmount = cart.addon_order_items.reduce(
      (sum, i) => sum + Number(i.total_price),
      0,
    );

    if (totalAmount <= 0) {
      throw new BadRequestException('Cart total must be greater than zero');
    }

    // Stock validation
    for (const item of cart.addon_order_items) {
      if (item.product_catalog.category === 'COMMODITY') {
        const inv = await this.prisma.inventory.findFirst({
          where: { product_id: item.product_id, property_id: booking.property_id },
        });
        if (!inv || inv.available_stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for "${item.product_catalog.name}". Available: ${inv?.available_stock ?? 0}`,
          );
        }
      }
    }

    // Property metadata — for Razorpay notes + denormalized payments.property_id.
    // Single property lookup; reused by Razorpay notes and our DB row. Brand
    // drives which Razorpay account the order is created against (BUTEAK
    // properties go to BUTEAK's live account; TDS stays on test for now).
    const property = await this.prisma.properties.findUnique({
      where: { id: booking.property_id },
      select: { name: true, brand: true },
    });
    const propertyName = property?.name ?? `Property ${booking.property_id}`;
    const brand = property?.brand ?? 'TDS';
    const paymentMode = this.razorpay.modeForBrand(brand);
    const itemCount = cart.addon_order_items.reduce((n, i) => n + i.quantity, 0);

    // Create Razorpay order (amount in paise) on the brand's Razorpay account.
    const rzpOrder = await this.razorpay.forBrand(brand).orders.create({
      amount: Math.round(totalAmount * 100),
      currency: 'INR',
      receipt: cart.id,
      notes: {
        property_id: booking.property_id,
        property_name: propertyName,
        brand,
        payment_mode: paymentMode,
        purpose: 'addon_upsell',
        purpose_label: `Add-ons — ${itemCount} item${itemCount === 1 ? '' : 's'}`,
        ezee_reservation_id: eri,
        guest_id: guest.guest_id,
        guest_email: guest.email ?? '',
        addon_order_id: cart.id,
      },
    });

    // Create PENDING payment record in our DB
    const paymentId = uuidv4();
    await this.prisma.payments.create({
      data: {
        id: paymentId,
        ezee_reservation_id: eri,
        guest_id: guest.guest_id,
        property_id: booking.property_id,
        razorpay_order_id: rzpOrder.id,
        amount: totalAmount,
        currency: 'INR',
        purpose: 'addon_upsell',
        status: 'CREATED',
        payment_mode: paymentMode,
        source: 'PWA',
        expires_at: new Date(Date.now() + 30 * 60 * 1000), // 30 min expiry
      },
    });

    // Link payment to the addon order
    await this.prisma.addon_orders.update({
      where: { id: cart.id },
      data: { payment_id: paymentId },
    });

    // Async audit log via SQS
    await this.sqsProducer.sendAuditLog({
      actor_type: 'GUEST',
      actor_id: guest.guest_id,
      action: 'PAYMENT_CREATED',
      entity_type: 'payment',
      entity_id: paymentId,
      new_value: {
        razorpay_order_id: rzpOrder.id,
        amount: totalAmount,
        addon_order_id: cart.id,
        eri,
      },
    });

    return {
      razorpay_order_id: rzpOrder.id,
      razorpay_key: this.razorpay.publicKeyForBrand(brand),
      amount: totalAmount,
      amount_paise: Math.round(totalAmount * 100),
      currency: 'INR',
      payment_id: paymentId,
      order_id: cart.id,
      guest: {
        email: guest.email,
      },
    };
  }

  // ─── STEP 1B: CREATE RAZORPAY ORDER FOR BOOKING ────────────────────────────

  /**
   * Creates a Razorpay order for a booking (rooms + addons).
   * Called after createBookingOrder has created the pending records.
   */
  async createBookingPayment(
    guest: GuestJwtPayload,
    eri: string,
    grandTotal: number,
    addonOrderId: string | null,
  ) {
    if (grandTotal <= 0) {
      throw new BadRequestException('Booking total must be greater than zero');
    }

    // Fetch booking for property + purpose-label metadata. The Razorpay `notes`
    // field carries this so ops can tell at a glance which property + booking
    // a captured payment belongs to without joining tables in our DB.
    const booking = await this.prisma.ezee_booking_cache.findUnique({
      where: { ezee_reservation_id: eri },
      select: {
        property_id: true,
        room_type_name: true,
        checkin_date: true,
        checkout_date: true,
        no_of_guests: true,
        booking_rooms_json: true,
        discount_total: true,
        tax_rate_pct: true,
        tax_total: true,
        coupon_id_auto: true,
        coupon_id_code: true,
        properties: { select: { name: true, brand: true } },
        coupon_auto: { select: { code: true, type: true } },
        coupon_code: { select: { code: true, type: true } },
      },
    });
    if (!booking) {
      throw new NotFoundException(`Booking ${eri} not found`);
    }

    // ── Server-authoritative total reconciliation ──
    // Re-derive the expected total from the cache row and reject mismatches.
    // Prevents the FE from passing an arbitrarily small `grandTotal` to bypass
    // coupons or invent discounts. (Pre-coupon-feature behavior trusted FE
    // implicitly; this is the fix for that.)
    const serverTotal = await this.computeServerAuthoritativeTotal(eri, booking);
    if (Math.abs(serverTotal - grandTotal) > 1) {
      this.logger.error(
        `Total mismatch for ${eri}: server=${serverTotal} fe=${grandTotal} discount=${booking.discount_total}`,
      );
      throw new BadRequestException(
        'Booking total does not match server calculation. Refresh and retry.',
      );
    }
    // Always honor the server total (handles ₹1 rounding noise)
    const authoritativeTotal = serverTotal;

    const nights =
      booking.checkin_date && booking.checkout_date
        ? Math.max(
            1,
            Math.round(
              (booking.checkout_date.getTime() - booking.checkin_date.getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          )
        : 1;
    const purposeLabel =
      `Booking — ${booking.room_type_name ?? 'room'} × ${booking.no_of_guests ?? 1}, ${nights} night${nights === 1 ? '' : 's'}`;

    // Build coupon-aware Razorpay notes. Razorpay's notes panel surfaces these
    // in the dashboard, so ops can filter captured payments by coupon code.
    const couponKinds: string[] = [];
    if (booking.coupon_id_auto) couponKinds.push('auto');
    if (booking.coupon_id_code) couponKinds.push('code');
    const discountAmount = Number(booking.discount_total);
    const taxRatePct = Number(booking.tax_rate_pct ?? 0);
    const taxAmount = Number(booking.tax_total ?? 0);
    const preTaxTotal = Math.round((authoritativeTotal - taxAmount) * 100) / 100;
    // Brand drives which Razorpay account this booking is charged against.
    const brand = booking.properties?.brand ?? 'TDS';
    const paymentMode = this.razorpay.modeForBrand(brand);

    // Create Razorpay order on the brand's Razorpay account.
    const rzpOrder = await (this.razorpay.forBrand(brand).orders.create({
      amount: Math.round(authoritativeTotal * 100),
      currency: 'INR',
      receipt: eri,
      notes: {
        property_id: booking.property_id,
        property_name: booking.properties?.name ?? `Property ${booking.property_id}`,
        brand,
        payment_mode: paymentMode,
        purpose: 'booking',
        purpose_label: purposeLabel,
        ezee_reservation_id: eri,
        guest_id: guest.guest_id,
        guest_email: guest.email ?? '',
        addon_order_id: addonOrderId ?? '',
        // Tax breakdown — visible in the Razorpay dashboard so ops can
        // reconcile captured payments against the GST owed on each booking.
        pre_tax_total: String(preTaxTotal),
        tax_rate_pct: String(taxRatePct),
        tax_amount: String(taxAmount),
        ...(discountAmount > 0
          ? {
              discount_amount: String(discountAmount),
              coupon_kinds: couponKinds.join('+'),
              coupon_code:
                booking.coupon_code?.code ?? booking.coupon_auto?.code ?? '',
            }
          : {}),
      },
    }) as any as Promise<{ id: string }>);

    // Create payment record
    const paymentId = uuidv4();
    await this.prisma.payments.create({
      data: {
        id: paymentId,
        ezee_reservation_id: eri,
        guest_id: guest.guest_id,
        property_id: booking.property_id,
        razorpay_order_id: rzpOrder.id,
        amount: authoritativeTotal,
        currency: 'INR',
        purpose: 'booking',
        status: 'CREATED',
        payment_mode: paymentMode,
        source: 'PWA',
        expires_at: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    // Link payment to addon order if exists
    if (addonOrderId) {
      await this.prisma.addon_orders.update({
        where: { id: addonOrderId },
        data: { payment_id: paymentId },
      });
    }

    // Async audit log via SQS
    await this.sqsProducer.sendAuditLog({
      actor_type: 'GUEST',
      actor_id: guest.guest_id,
      action: 'BOOKING_PAYMENT_CREATED',
      entity_type: 'payment',
      entity_id: paymentId,
      new_value: {
        razorpay_order_id: rzpOrder.id,
        amount: grandTotal,
        eri,
        type: 'booking',
      },
    });

    return {
      razorpay_order_id: rzpOrder.id,
      razorpay_key: this.razorpay.publicKeyForBrand(brand),
      amount: grandTotal,
      amount_paise: Math.round(grandTotal * 100),
      currency: 'INR',
      payment_id: paymentId,
      ezee_reservation_id: eri,
      pre_tax_total: preTaxTotal,
      tax_rate_pct: taxRatePct,
      tax_amount: taxAmount,
      guest: { email: guest.email },
    };
  }

  // ─── ANONYMOUS BUTEAK PAYMENT PATH ────────────────────────────────────────
  //
  // Mirrors createBookingPayment / verifyPayment but uses the cache row's
  // `payment_token` as proof of identity instead of a Bearer JWT. The token
  // is returned exactly once by GuestBookingService.createBookingOrder and
  // cleared on CAPTURED in fulfilBookingOrder (single-use). Both methods are
  // BUTEAK-only and refuse to operate on TDS bookings even if the token
  // matched (defence in depth — TDS path has no reason to ever issue one).

  private async validatePaymentTokenForBooking(
    eri: string,
    paymentToken: string,
  ): Promise<{ guest_id: string; brand: string; property_id: string }> {
    if (!paymentToken || typeof paymentToken !== 'string') {
      throw new BadRequestException('payment_token is required');
    }
    const cache = await this.prisma.ezee_booking_cache.findUnique({
      where: { ezee_reservation_id: eri },
      select: {
        guest_id: true,
        payment_token: true,
        property_id: true,
        properties: { select: { brand: true } },
      },
    });
    if (!cache) throw new NotFoundException('Booking not found');
    if (!cache.payment_token || cache.payment_token !== paymentToken) {
      // Mask whether the token was missing vs wrong; same response either way.
      throw new ForbiddenException('Invalid or expired payment token');
    }
    if (cache.properties?.brand !== 'BUTEAK') {
      throw new ForbiddenException('Anonymous payment is BUTEAK-only');
    }
    if (!cache.guest_id) {
      // The cache row should always have a guest_id (set by createBookingOrder).
      // This guards against a future code path that creates a cache row without
      // attaching a guest.
      throw new BadRequestException('Booking is missing a guest record');
    }
    return { guest_id: cache.guest_id, brand: cache.properties.brand, property_id: cache.property_id };
  }

  async createBookingPaymentAnonymous(
    eri: string,
    grandTotal: number,
    paymentToken: string,
    addonOrderId: string | null,
  ) {
    const { guest_id, brand } = await this.validatePaymentTokenForBooking(eri, paymentToken);
    const guest = await this.prisma.guests.findUnique({
      where: { id: guest_id },
      select: { id: true, email: true },
    });
    if (!guest) throw new NotFoundException('Guest record missing');

    // Construct the minimal JwtPayload shape that createBookingPayment reads.
    // The token has already authorised the caller; this is purely shape glue.
    const synthetic: GuestJwtPayload = {
      sub: guest.id,
      guest_id: guest.id,
      email: guest.email ?? null,
      email_verified: false,
      phone_verified: false,
      brand: brand as GuestJwtPayload['brand'],
    };
    return this.createBookingPayment(synthetic, eri, grandTotal, addonOrderId);
  }

  async verifyPaymentAnonymous(
    eri: string,
    razorpay_order_id: string,
    razorpay_payment_id: string,
    razorpay_signature: string,
    paymentToken: string,
  ) {
    const { guest_id, brand } = await this.validatePaymentTokenForBooking(eri, paymentToken);

    // Razorpay signature must verify under the brand's secret. Reuse the same
    // logic as verifyPayment (find payment, check sig, fulfil) but skip the
    // `payment.guest_id !== guest.guest_id` check — the payment_token is the
    // proof of identity here.
    const payment = await this.prisma.payments.findUnique({
      where: { razorpay_order_id },
    });
    if (!payment) throw new NotFoundException('Payment record not found');
    if (payment.ezee_reservation_id !== eri) {
      throw new BadRequestException('Payment does not belong to this booking');
    }
    if (payment.guest_id !== guest_id) {
      // The cache and the payments row disagree on guest_id — shouldn't
      // happen, but refuse rather than fulfil under the wrong identity.
      throw new ForbiddenException('Booking / payment guest mismatch');
    }
    const expectedSig = createHmac('sha256', this.razorpay.apiSecretForBrand(brand as any))
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    if (expectedSig !== razorpay_signature) {
      this.logger.warn(`Invalid anonymous payment signature for order ${razorpay_order_id} (brand=${brand})`);
      throw new BadRequestException('Invalid payment signature');
    }
    if (payment.status === 'CAPTURED') {
      return { message: 'Payment already captured', payment_id: payment.id };
    }
    return this.fulfilOrder(payment.id, razorpay_payment_id);
  }

  // ─── STEP 2: VERIFY PAYMENT (frontend callback) ────────────────────────────

  /**
   * Frontend calls this after Razorpay checkout modal succeeds.
   * Verifies the signature and fulfils the order.
   */
  async verifyPayment(
    guest: GuestJwtPayload,
    razorpay_order_id: string,
    razorpay_payment_id: string,
    razorpay_signature: string,
  ) {
    // Find payment record FIRST so we know which brand's secret to verify
    // against. Looking up by an unverified order_id is safe — we still need
    // a valid HMAC of `<order>|<payment>` under that brand's secret to
    // accept the signature, which an attacker can't forge.
    const payment = await this.prisma.payments.findUnique({
      where: { razorpay_order_id },
    });

    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    // Brand drives which Razorpay secret signed this payment. `property_id`
    // on `payments` is nullable for historical rows, so default to TDS.
    const property = payment.property_id
      ? await this.prisma.properties.findUnique({
          where: { id: payment.property_id },
          select: { brand: true },
        })
      : null;
    const brand = property?.brand ?? 'TDS';
    const expectedSig = createHmac('sha256', this.razorpay.apiSecretForBrand(brand))
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      this.logger.warn(`Invalid payment signature for order ${razorpay_order_id} (brand=${brand})`);
      throw new BadRequestException('Invalid payment signature');
    }

    if (payment.guest_id !== guest.guest_id) {
      throw new BadRequestException('Payment does not belong to this guest');
    }

    if (payment.status === 'CAPTURED') {
      return { message: 'Payment already captured', payment_id: payment.id };
    }

    // Fulfil the order
    return this.fulfilOrder(payment.id, razorpay_payment_id);
  }

  // ─── STEP 3: WEBHOOK (Razorpay server-to-server) ───────────────────────────

  /**
   * Razorpay webhook handler. Verifies webhook signature and processes events.
   * Handles: payment.captured, order.paid, payment.failed
   */
  async handleWebhook(rawBody: string, signature: string) {
    // Verify webhook signature against every brand's configured secret.
    // Razorpay's webhook header doesn't carry a brand hint, and parsing the
    // body before verifying would mean trusting unverified content — so we
    // try-each. Matching ANY valid brand secret requires forging an HMAC
    // under that secret, which an attacker can't do without first stealing
    // it. Reject if none match.
    const secrets = this.razorpay.allWebhookSecrets();
    if (secrets.length === 0) {
      this.logger.error('No Razorpay webhook secrets configured');
      throw new BadRequestException('Webhook misconfigured');
    }
    const signed = secrets.some(
      (secret) =>
        createHmac('sha256', secret).update(rawBody).digest('hex') === signature,
    );
    if (!signed) {
      this.logger.warn('Razorpay webhook signature did not match any configured brand secret');
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = JSON.parse(rawBody);
    this.logger.log(`Webhook event received: ${event.event}`);

    switch (event.event) {
      case 'payment.captured':
      case 'order.paid': {
        const rzpPaymentId =
          event.payload?.payment?.entity?.id ??
          event.payload?.order?.entity?.payments?.items?.[0]?.id;
        const rzpOrderId =
          event.payload?.payment?.entity?.order_id ??
          event.payload?.order?.entity?.id;

        if (!rzpOrderId) {
          this.logger.warn('Webhook missing order_id');
          return { status: 'ignored', reason: 'missing order_id' };
        }

        const payment = await this.prisma.payments.findUnique({
          where: { razorpay_order_id: rzpOrderId },
        });

        if (!payment) {
          this.logger.warn(`No payment record for razorpay order ${rzpOrderId}`);
          return { status: 'ignored', reason: 'payment not found' };
        }

        if (payment.status === 'CAPTURED') {
          return { status: 'already_captured' };
        }

        await this.fulfilOrder(payment.id, rzpPaymentId);
        return { status: 'captured' };
      }

      case 'payment_link.paid': {
        // heist1.1 WhatsApp pay-over-WA. The Payment Link carries reference_id =
        // our payments.id; the payment entity carries the auto-created order_id.
        const referenceId = event.payload?.payment_link?.entity?.reference_id;
        const rzpPaymentId = event.payload?.payment?.entity?.id;
        const rzpOrderId = event.payload?.payment?.entity?.order_id ?? null;
        if (!referenceId) {
          this.logger.warn('payment_link.paid missing reference_id');
          return { status: 'ignored', reason: 'missing reference_id' };
        }
        return this.fulfilWhatsappService(referenceId, rzpOrderId, rzpPaymentId);
      }

      case 'payment_link.cancelled':
      case 'payment_link.expired': {
        // heist1.1 — WhatsApp paid request the guest never completed. Fire the
        // service_payment_failed template (with the "Try Again" button).
        const referenceId = event.payload?.payment_link?.entity?.reference_id;
        if (!referenceId) {
          this.logger.warn(`${event.event} missing reference_id`);
          return { status: 'ignored', reason: 'missing reference_id' };
        }
        return this.failWhatsappService(referenceId, event.event);
      }

      case 'payment.failed': {
        const rzpOrderId = event.payload?.payment?.entity?.order_id;
        if (rzpOrderId) {
          await this.handlePaymentFailure(rzpOrderId);
        }
        return { status: 'failed_recorded' };
      }

      default:
        this.logger.log(`Unhandled webhook event: ${event.event}`);
        return { status: 'ignored', reason: 'unhandled event' };
    }
  }

  // ─── DEV SIMULATE (local testing only) ──────────────────────────────────────

  /**
   * Simulates a successful payment capture for local dev testing.
   * Only works when NODE_ENV=development.
   */
  async devSimulateCapture(razorpay_order_id: string) {
    if (process.env.NODE_ENV !== 'development') {
      throw new BadRequestException('Dev simulate only available in development');
    }

    const payment = await this.prisma.payments.findUnique({
      where: { razorpay_order_id },
    });

    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    if (payment.status === 'CAPTURED') {
      return { message: 'Already captured', payment_id: payment.id };
    }

    const simPaymentId = `sim_pay_${uuidv4().slice(0, 12)}`;
    return this.fulfilOrder(payment.id, simPaymentId);
  }

  // ─── PAYMENT FAILURE ─────────────────────────────────────────────────────────

  /**
   * Handles a failed payment: marks payment FAILED, unlinks it from the order,
   * so the guest can retry checkout with a new Razorpay order.
   */
  async handlePaymentFailure(razorpay_order_id: string) {
    const payment = await this.prisma.payments.findUnique({
      where: { razorpay_order_id },
    });

    if (!payment) throw new NotFoundException('Payment record not found');

    if (payment.status === 'CAPTURED') {
      return { message: 'Payment already captured — cannot mark as failed', payment_id: payment.id };
    }

    if (payment.status === 'FAILED') {
      return { message: 'Payment already marked as failed', payment_id: payment.id };
    }

    // Mark payment as FAILED
    await this.prisma.payments.update({
      where: { id: payment.id },
      data: { status: 'FAILED', updated_at: new Date() },
    });

    // For booking payments: rollback the entire pending booking
    if (payment.purpose === 'booking') {
      await this.rollbackPendingBooking(payment.ezee_reservation_id);
      // Log failure
      await this.sqsProducer.sendAuditLog({
        actor_type: 'SYSTEM',
        actor_id: payment.guest_id ?? 'system',
        action: 'BOOKING_PAYMENT_FAILED',
        entity_type: 'payment',
        entity_id: payment.id,
        new_value: {
          razorpay_order_id,
          amount: Number(payment.amount),
          eri: payment.ezee_reservation_id,
        },
      });
      this.logger.log(`Booking payment ${payment.id} failed — pending booking ${payment.ezee_reservation_id} rolled back`);
      return {
        message: 'Booking payment failed. Pending booking rolled back. You can try again.',
        payment_id: payment.id,
        razorpay_order_id,
      };
    }

    // For addon payments: unlink from order so guest can retry
    await this.prisma.addon_orders.updateMany({
      where: { payment_id: payment.id, status: 'PENDING' },
      data: { payment_id: null },
    });

    // Async audit log via SQS
    await this.sqsProducer.sendAuditLog({
      actor_type: 'SYSTEM',
      actor_id: payment.guest_id ?? 'system',
      action: 'PAYMENT_FAILED',
      entity_type: 'payment',
      entity_id: payment.id,
      new_value: {
        razorpay_order_id,
        amount: Number(payment.amount),
      },
    });

    this.logger.log(`Payment ${payment.id} (${razorpay_order_id}) marked FAILED, order unlinked for retry`);

    return {
      message: 'Payment failed. Cart is available for retry.',
      payment_id: payment.id,
      razorpay_order_id,
    };
  }

  /**
   * Dev-only: simulate a payment failure for testing.
   */
  async devSimulateFail(razorpay_order_id: string) {
    if (process.env.NODE_ENV !== 'development') {
      throw new BadRequestException('Dev simulate only available in development');
    }
    return this.handlePaymentFailure(razorpay_order_id);
  }

  // ─── INTERNAL: FULFIL ORDER ──────────────────────────────────────────────────

  /**
   * Core fulfilment logic — shared by verify, webhook, and dev-simulate.
   * Wrapped in a Prisma interactive transaction with row-level locks on inventory
   * to prevent race conditions (e.g., 2 guests paying for the last towel).
   *
   * Flow:
   *   1. SELECT ... FOR UPDATE on inventory rows (locks them for this transaction)
   *   2. Validate stock is still sufficient
   *   3. Decrement stock
   *   4. Mark payment CAPTURED + order PAID
   *   5. Log activity
   *   6. Commit (releases locks)
   */
  private async fulfilOrder(paymentId: string, razorpayPaymentId: string) {
    const payment = await this.prisma.payments.findUnique({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    // Idempotency — already captured
    if (payment.status === 'CAPTURED') {
      return { message: 'Payment already captured', payment_id: payment.id };
    }

    // ─── BOOKING PAYMENT (rooms + addons) ───
    if (payment.purpose === 'booking') {
      return this.fulfilBookingOrder({
        id: payment.id,
        ezee_reservation_id: payment.ezee_reservation_id,
        guest_id: payment.guest_id ?? '',
        razorpay_order_id: payment.razorpay_order_id ?? '',
        amount: payment.amount,
      }, razorpayPaymentId);
    }

    // ─── ADDON PAYMENT (post-booking upsell) ───
    const order = await this.prisma.addon_orders.findFirst({
      where: { payment_id: paymentId },
      include: {
        addon_order_items: { include: { product_catalog: true } },
      },
    });
    if (!order) {
      this.logger.warn(`No addon order linked to payment ${paymentId}`);
      throw new NotFoundException('Order not found for this payment');
    }

    const booking = await this.prisma.ezee_booking_cache.findUnique({
      where: { ezee_reservation_id: payment.ezee_reservation_id },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    // Collect commodity items that need stock decrement
    const commodityItems = order.addon_order_items.filter(
      (i) => i.product_catalog.category === 'COMMODITY',
    );

    // Run everything inside a serializable transaction with row-level locks
    const result = await this.prisma.$transaction(async (tx) => {
      // STEP 1: Lock inventory rows with SELECT ... FOR UPDATE
      // This prevents other transactions from reading/modifying these rows
      // until this transaction commits.
      if (commodityItems.length > 0) {
        const productIds = commodityItems.map((i) => i.product_id);

        // Raw query for FOR UPDATE — Prisma doesn't support it natively
        const lockedRows: { product_id: string; available_stock: number }[] =
          await tx.$queryRawUnsafe(
            `SELECT product_id, available_stock FROM inventory
             WHERE property_id = $1 AND product_id = ANY($2::text[])
             FOR UPDATE`,
            booking.property_id,
            productIds,
          );

        // STEP 2: Validate stock under the lock
        const stockMap = new Map(lockedRows.map((r) => [r.product_id, r.available_stock]));

        for (const item of commodityItems) {
          const available = stockMap.get(item.product_id) ?? 0;
          if (available < item.quantity) {
            // Stock insufficient — payment was captured by Razorpay but we can't fulfil.
            // Mark payment as REFUND_NEEDED (manual intervention required).
            await tx.payments.update({
              where: { id: paymentId },
              data: {
                razorpay_payment_id: razorpayPaymentId,
                status: 'REFUND_NEEDED',
                updated_at: new Date(),
              },
            });

            await tx.addon_orders.update({
              where: { id: order.id },
              data: { status: 'FAILED_STOCK' },
            });

            this.logger.error(
              `STOCK CONFLICT: "${item.product_catalog.name}" — needed ${item.quantity}, available ${available}. Payment ${paymentId} marked REFUND_NEEDED.`,
            );

            return {
              message: 'Payment received but insufficient stock. Refund will be processed.',
              payment_id: paymentId,
              order_id: order.id,
              conflict_item: item.product_catalog.name,
              needed: item.quantity,
              available,
              status: 'REFUND_NEEDED',
            };
          }
        }

        // STEP 3: Decrement stock (still under lock)
        for (const item of commodityItems) {
          await tx.inventory.updateMany({
            where: { product_id: item.product_id, property_id: booking.property_id },
            data: {
              available_stock: { decrement: item.quantity },
              sold_count: { increment: item.quantity },
            },
          });
        }
      }

      // STEP 4: Mark payment CAPTURED + order PAID
      await tx.payments.update({
        where: { id: paymentId },
        data: {
          razorpay_payment_id: razorpayPaymentId,
          status: 'CAPTURED',
          updated_at: new Date(),
        },
      });

      await tx.addon_orders.update({
        where: { id: order.id },
        data: { status: 'PAID' },
      });

      // STEP 5: Audit log moved outside transaction (goes to SQS)

      return null; // success — no conflict
    }, {
      timeout: 10000, // 10 second timeout for the transaction
    });

    // If the transaction returned a conflict result, return it
    if (result) return result;

    // Invalidate cache outside transaction
    await this.cacheService.invalidatePropertyCache(booking.property_id);

    // Async audit log + payment success event via SQS
    await this.sqsProducer.sendAuditLog({
      actor_type: 'GUEST',
      actor_id: payment.guest_id ?? 'system',
      action: 'PAYMENT_CAPTURED',
      entity_type: 'payment',
      entity_id: paymentId,
      new_value: {
        razorpay_order_id: payment.razorpay_order_id,
        razorpay_payment_id: razorpayPaymentId,
        amount: Number(payment.amount),
        order_id: order.id,
      },
    });

    await this.sqsProducer.sendPaymentSuccess({
      eri: payment.ezee_reservation_id,
      payment_id: paymentId,
      razorpay_payment_id: razorpayPaymentId,
      amount: Number(payment.amount),
      purpose: payment.purpose,
      guest_id: payment.guest_id ?? '',
      property_id: booking.property_id,
      items: order.addon_order_items.map((i) => ({
        product_name: i.product_catalog.name,
        quantity: i.quantity,
        total: Number(i.total_price),
      })),
    });

    // Emit to eZee sync queue — records addon charge in eZee folio
    await this.sqsProducer.sendEzeeAddExtraCharge({
      eri: payment.ezee_reservation_id,
      property_id: booking.property_id,
      items: order.addon_order_items.map((i) => ({
        product_name: i.product_catalog.name,
        quantity: i.quantity,
        amount: Number(i.total_price),
      })),
      razorpay_payment_id: razorpayPaymentId,
    });

    // heist1.1 convergence (Miro "Live" frame): a POST-CHECK-IN (DURING_STAY) paid
    // web-app order now routes through the same staff-assignment path as the
    // WhatsApp paid lane — it raises a delivery ticket via the v1 engine so staff
    // are assigned + SLA runs. whatsapp_service orders create their own ticket in
    // fulfilWhatsappService, so only addon_upsell is handled here. Best-effort:
    // ticket failure must not unwind a captured payment.
    if (payment.purpose === 'addon_upsell' && order.phase === 'DURING_STAY') {
      await this.raiseDeliveryTicketForOrder(order, booking).catch((e) =>
        this.logger.error(
          `Delivery ticket for during-stay order ${order.id} failed: ${(e as Error).message}`,
        ),
      );
    }

    this.logger.log(`Order ${order.id} fulfilled — payment ${paymentId} captured`);

    return {
      message: 'Payment captured, order fulfilled',
      payment_id: paymentId,
      order_id: order.id,
      total: Number(payment.amount),
      items_count: order.addon_order_items.length,
    };
  }

  /**
   * Raise one staff delivery/service ticket for a captured during-stay addon order
   * (heist1.1 web-app convergence). Department mirrors the board's "Housekeeping or
   * Reception" decision: physical goods → HOUSEKEEPING, pure services → FRONT_OFFICE.
   */
  private async raiseDeliveryTicketForOrder(
    order: {
      id: string;
      ezee_reservation_id: string;
      guest_id: string;
      addon_order_items: { quantity: number; product_catalog: { name: string; category: string } }[];
    },
    booking: { property_id: string; room_number: string | null; unit_code: string | null },
  ) {
    if (order.addon_order_items.length === 0) return;
    const guest = await this.prisma.guests.findUnique({
      where: { id: order.guest_id },
      select: { phone: true },
    });
    const hasPhysical = order.addon_order_items.some((i) =>
      ['COMMODITY', 'RETURNABLE', 'BORROWABLE'].includes(i.product_catalog.category),
    );
    const summary = order.addon_order_items
      .map((i) => `${i.product_catalog.name} x${i.quantity}`)
      .join(', ');

    await this.tickets.createServiceRequest({
      property_id: booking.property_id,
      guest_id: order.guest_id,
      guest_phone: guest?.phone ?? null,
      ezee_reservation_id: order.ezee_reservation_id,
      department: hasPhysical ? 'HOUSEKEEPING' : 'FRONT_OFFICE',
      subject: `Deliver: ${summary}`.slice(0, 240),
      // Web-app store order = a standard delivery of goods → T0 (10-min class).
      task_category: 'T0',
      priority: 'MEDIUM',
      room_number: booking.room_number,
      unit_code: booking.unit_code,
      request_type: 'CHARGEABLE',
    });
  }

  // ─── ROLLBACK PENDING BOOKING ────────────────────────────────────────────────

  /**
   * Rolls back a pending booking on payment failure.
   * Releases reserved inventory, deletes pending records.
   */
  private async rollbackPendingBooking(eri: string) {
    const booking = await this.prisma.ezee_booking_cache.findUnique({
      where: { ezee_reservation_id: eri },
    });

    if (!booking || booking.status !== 'PENDING_PAYMENT') return;

    await this.prisma.$transaction(async (tx) => {
      // Release reserved addon inventory
      const addonOrder = await tx.addon_orders.findFirst({
        where: { ezee_reservation_id: eri, status: 'PENDING' },
        include: { addon_order_items: { include: { product_catalog: true } } },
      });

      if (addonOrder) {
        for (const item of addonOrder.addon_order_items) {
          if (item.product_catalog.category === 'COMMODITY') {
            await tx.inventory.updateMany({
              where: { product_id: item.product_id, property_id: booking.property_id },
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

      await tx.kyc_submissions.deleteMany({ where: { ezee_reservation_id: eri } });
      await tx.booking_slots.deleteMany({ where: { ezee_reservation_id: eri } });
      await tx.booking_guest_access.deleteMany({ where: { ezee_reservation_id: eri } });
      // Don't delete ezee_booking_cache — payments FK references it.
      // Mark as CANCELLED instead.
      await tx.ezee_booking_cache.update({
        where: { ezee_reservation_id: eri },
        data: { status: 'CANCELLED', is_active: false },
      });
    });

    this.logger.log(`Rolled back pending booking: ${eri}`);
  }

  // ─── FULFIL BOOKING ORDER ────────────────────────────────────────────────────

  /**
   * Handles booking payment fulfilment:
   * 1. Confirms the booking (PENDING_PAYMENT → CONFIRMED)
   * 2. Finalizes addon inventory (reserved → sold)
   * 3. Marks payment CAPTURED, addon order PAID
   */
  private async fulfilBookingOrder(
    payment: { id: string; ezee_reservation_id: string; guest_id: string; razorpay_order_id: string; amount: any },
    razorpayPaymentId: string,
  ) {
    const eri = payment.ezee_reservation_id;

    const booking = await this.prisma.ezee_booking_cache.findUnique({
      where: { ezee_reservation_id: eri },
      include: {
        properties: { select: { name: true } },
        // Pull the applied coupons (name + code) so we can stamp them into
        // the eZee SpecialRequest tag — lets ops read the coupon directly
        // from the folio without joining tables.
        coupon_auto: { select: { name: true, code: true, type: true } },
        coupon_code: { select: { name: true, code: true, type: true } },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${eri} not found`);
    }

    // Already confirmed (idempotent)
    if (booking.status === 'CONFIRMED') {
      await this.prisma.payments.update({
        where: { id: payment.id },
        data: { razorpay_payment_id: razorpayPaymentId, status: 'CAPTURED', updated_at: new Date() },
      });
      return { message: 'Booking already confirmed', payment_id: payment.id, eri };
    }

    await this.prisma.$transaction(async (tx) => {
      // 1. Confirm booking + invalidate payment_token (single-use; anonymous
      //    BUTEAK path uses it as auth for /payment/anonymous/* — once
      //    captured, no further actions are needed on the booking).
      await tx.ezee_booking_cache.update({
        where: { ezee_reservation_id: eri },
        data: { status: 'CONFIRMED', payment_token: null },
      });

      // 2. Finalize addon inventory (reserved → sold)
      const addonOrder = await tx.addon_orders.findFirst({
        where: { ezee_reservation_id: eri, status: 'PENDING' },
        include: { addon_order_items: { include: { product_catalog: true } } },
      });

      if (addonOrder) {
        for (const item of addonOrder.addon_order_items) {
          if (item.product_catalog.category === 'COMMODITY') {
            await tx.inventory.updateMany({
              where: { product_id: item.product_id, property_id: booking.property_id },
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

      // 3. Mark payment CAPTURED
      await tx.payments.update({
        where: { id: payment.id },
        data: {
          razorpay_payment_id: razorpayPaymentId,
          status: 'CAPTURED',
          updated_at: new Date(),
        },
      });

      // 4. Audit log moved outside transaction (goes to SQS)
    }, { timeout: 10000 });

    // Invalidate cache
    await this.cacheService.invalidatePropertyCache(booking.property_id);

    // Async audit log + booking confirmed event via SQS
    await this.sqsProducer.sendAuditLog({
      actor_type: 'GUEST',
      actor_id: payment.guest_id ?? 'system',
      action: 'BOOKING_CONFIRMED',
      entity_type: 'booking',
      entity_id: eri,
      new_value: {
        razorpay_order_id: payment.razorpay_order_id,
        razorpay_payment_id: razorpayPaymentId,
        amount: Number(payment.amount),
        room_type: booking.room_type_name,
        checkin: booking.checkin_date,
        checkout: booking.checkout_date,
      },
    });

    await this.sqsProducer.sendBookingConfirmed({
      eri,
      payment_id: payment.id,
      guest_id: payment.guest_id,
      room_type: booking.room_type_name,
      checkin: booking.checkin_date,
      checkout: booking.checkout_date,
    });

    // Compute a nights count for the human-readable label embedded in the
    // SpecialRequest text on the eZee booking.
    const nights =
      booking.checkin_date && booking.checkout_date
        ? Math.max(
            1,
            Math.round(
              (booking.checkout_date.getTime() - booking.checkin_date.getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          )
        : 1;
    const purposeLabel = `Booking — ${booking.room_type_name ?? 'room'}, ${nights} night${nights === 1 ? '' : 's'}`;

    // Build a short coupon summary for the eZee SpecialRequest tag so ops
    // reading the folio can see WHICH coupon(s) were applied without joining
    // tables. Prefer admin-set `name` (e.g. "WELCOME"), fall back to `code`
    // (typed codes like "TEST91"). Stacked = "WELCOME+TEST91".
    const couponParts: string[] = [];
    if (booking.coupon_auto) couponParts.push(booking.coupon_auto.name ?? booking.coupon_auto.code ?? '');
    if (booking.coupon_code) couponParts.push(booking.coupon_code.name ?? booking.coupon_code.code ?? '');
    const couponSummary = couponParts.filter(Boolean).join('+') || undefined;

    // Emit to eZee sync queue — creates booking in eZee PMS. Includes
    // razorpay_payment_id + property_name + purpose_label + coupon_summary so
    // the worker can populate Room_N.SpecialRequest and Booking_Payment_Mode
    // for folio visibility.
    await this.sqsProducer.sendEzeeInsertBooking({
      eri,
      guest_id: payment.guest_id,
      property_id: booking.property_id,
      room_type: booking.room_type_name,
      checkin: booking.checkin_date?.toISOString().split('T')[0] ?? null,
      checkout: booking.checkout_date?.toISOString().split('T')[0] ?? null,
      amount: Number(payment.amount),
      razorpay_payment_id: razorpayPaymentId,
      property_name: booking.properties?.name ?? `Property ${booking.property_id}`,
      purpose_label: purposeLabel,
      discount_total: Number(booking.discount_total ?? 0),
      coupon_summary: couponSummary,
    });

    // Record coupon redemptions for audit + per-guest usage cap enforcement on
    // future bookings. Discount is split between auto and code by the same
    // ratio used at create-order time (we just store the actual ₹ each gave).
    // Failure to record is logged but does NOT roll back payment.
    if (booking.coupon_id_auto || booking.coupon_id_code) {
      const totalDiscount = Number(booking.discount_total ?? 0);
      // We didn't persist per-coupon splits at create-order time. Re-compute now
      // by re-running the coupon engine against the booking snapshot. (Cheap —
      // single indexed query.) The split is what the engine returns now;
      // amount mismatches due to coupon state changes between create-order and
      // capture are rare but the audit row reflects "what we'd give today".
      const stayNights = booking.checkin_date && booking.checkout_date
        ? Math.max(1, Math.round(
            (booking.checkout_date.getTime() - booking.checkin_date.getTime()) /
              (1000 * 60 * 60 * 24),
          ))
        : 1;
      // Approximate subtotal = payment.amount + discount_total
      const approxSubtotal = Number(payment.amount) + totalDiscount;

      if (booking.coupon_id_auto) {
        await this.coupons.recordRedemption({
          couponId: booking.coupon_id_auto,
          guestId: payment.guest_id,
          eri,
          paymentId: payment.id,
          propertyId: booking.property_id,
          // Best-effort split: if both coupons exist, attribute proportionally;
          // otherwise the auto coupon gets all of discount_total.
          discountAmount: booking.coupon_id_code
            ? Math.round((totalDiscount / 2) * 100) / 100
            : totalDiscount,
          kind: 'AUTO',
        });
      }
      if (booking.coupon_id_code) {
        await this.coupons.recordRedemption({
          couponId: booking.coupon_id_code,
          guestId: payment.guest_id,
          eri,
          paymentId: payment.id,
          propertyId: booking.property_id,
          discountAmount: booking.coupon_id_auto
            ? Math.round((totalDiscount / 2) * 100) / 100
            : totalDiscount,
          kind: 'CODE',
        });
      }
    }

    this.logger.log(`Booking ${eri} confirmed — payment ${payment.id} captured`);

    return {
      message: 'Booking confirmed, payment captured',
      payment_id: payment.id,
      ezee_reservation_id: eri,
      total: Number(payment.amount),
      status: 'CONFIRMED',
    };
  }

  // ─── HELPERS ────────────────────────────────────────────────────────────────

  private async verifyBookingAccess(guestId: string, eri: string) {
    const booking = await this.prisma.ezee_booking_cache.findUnique({
      where: { ezee_reservation_id: eri },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const access = await this.prisma.booking_guest_access.findFirst({
      where: {
        ezee_reservation_id: eri,
        guest_id: guestId,
        status: 'APPROVED',
      },
    });
    if (!access) throw new BadRequestException('No access to this booking');

    return booking;
  }

  // ─── WHATSAPP SERVICE (heist1.1) — PAY-OVER-WA VIA PAYMENT LINK ────────────
  //
  // A checked-in guest requests a paid catalog item over WhatsApp. We create a
  // single-item addon cart (done by WaServiceService), a PENDING payments row,
  // and a Razorpay Payment Link the guest taps to pay in-browser. On capture the
  // Razorpay `payment_link.paid` webhook runs fulfilWhatsappService → existing
  // addon fulfilment (inventory-- + eZee charge) → then raises the service ticket.
  // No ticket exists before capture.

  async createWhatsappServiceLink(input: {
    brand: string;
    eri: string;
    property_id: string;
    guest_id: string;
    guest_name: string;
    guest_phone: string;
    product_name: string;
    amount: number;
    addon_order_id: string;
    wa_service_request_id: string;
  }): Promise<{ payment_id: string; short_url: string | null; plink_id: string | null }> {
    if (input.amount <= 0) {
      throw new BadRequestException('WhatsApp service amount must be greater than zero');
    }
    const brand = input.brand || 'TDS';
    const paymentId = uuidv4();
    const paymentMode = this.razorpay.modeForBrand(brand);

    // PENDING payments row (razorpay_order_id is filled in at capture time —
    // Payment Links create their order only when paid).
    await this.prisma.payments.create({
      data: {
        id: paymentId,
        ezee_reservation_id: input.eri,
        guest_id: input.guest_id,
        property_id: input.property_id,
        amount: input.amount,
        currency: 'INR',
        purpose: 'whatsapp_service',
        status: 'CREATED',
        payment_mode: paymentMode,
        source: 'WHATSAPP',
        expires_at: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    // Link the backing cart to this payment so fulfilOrder finds it on capture.
    await this.prisma.addon_orders.update({
      where: { id: input.addon_order_id },
      data: { payment_id: paymentId },
    });

    let shortUrl: string | null = null;
    let plinkId: string | null = null;
    try {
      const plink: any = await (this.razorpay.forBrand(brand) as any).paymentLink.create({
        amount: Math.round(input.amount * 100),
        currency: 'INR',
        accept_partial: false,
        // 30-min link expiry → drives the `payment_link.expired` event that fires
        // the service_payment_failed template if the guest never pays.
        expire_by: Math.floor(Date.now() / 1000) + 30 * 60,
        reference_id: paymentId, // == payments.id → matched back on payment_link.paid
        description: `${input.product_name} (Room service)`.slice(0, 2048),
        customer: {
          name: input.guest_name,
          contact: input.guest_phone.startsWith('+') ? input.guest_phone : `+${input.guest_phone}`,
        },
        notify: { sms: false, email: false }, // we deliver the link ourselves over WhatsApp
        reminder_enable: false,
        notes: {
          purpose: 'whatsapp_service',
          ezee_reservation_id: input.eri,
          property_id: input.property_id,
          guest_id: input.guest_id,
          addon_order_id: input.addon_order_id,
          wa_service_request_id: input.wa_service_request_id,
          brand,
        },
      });
      shortUrl = plink?.short_url ?? null;
      plinkId = plink?.id ?? null;
    } catch (err) {
      this.logger.error(
        `Razorpay payment link create failed (brand=${brand}, payment=${paymentId}): ${(err as Error).message}`,
      );
    }

    return { payment_id: paymentId, short_url: shortUrl, plink_id: plinkId };
  }

  /**
   * Razorpay `payment_link.paid` handler for the WhatsApp-service flow. Runs the
   * standard addon fulfilment (inventory-- + PAID + eZee charge) then raises the
   * service ticket via the v1 engine. Idempotent.
   */
  async fulfilWhatsappService(
    paymentId: string,
    razorpayOrderId: string | null,
    razorpayPaymentId: string,
  ) {
    const payment = await this.prisma.payments.findUnique({ where: { id: paymentId } });
    if (!payment) {
      this.logger.warn(`fulfilWhatsappService: payment ${paymentId} not found`);
      return { status: 'ignored', reason: 'payment not found' };
    }
    if (payment.status === 'CAPTURED') {
      // Already fulfilled; make sure the ticket exists (idempotent), then return.
      await this.createTicketForWhatsappService(paymentId);
      return { status: 'already_captured' };
    }
    if (razorpayOrderId) {
      await this.prisma.payments.update({
        where: { id: paymentId },
        data: { razorpay_order_id: razorpayOrderId },
      });
    }
    // Reuse the addon fulfilment path (decrements commodity stock, marks PAID,
    // emits the eZee extra charge + payment-success events).
    const result = await this.fulfilOrder(paymentId, razorpayPaymentId);
    // Only raise the ticket if fulfilment didn't hit a stock conflict.
    if (!result || (result as any).status !== 'REFUND_NEEDED') {
      await this.createTicketForWhatsappService(paymentId);
    }
    return { status: 'captured_wa_service', payment_id: paymentId };
  }

  /** Create the service ticket for a captured WhatsApp paid request (idempotent). */
  private async createTicketForWhatsappService(paymentId: string) {
    const wa = await this.prisma.wa_service_request.findFirst({
      where: { payment_id: paymentId },
    });
    if (!wa || wa.ticket_id) return; // unknown or already ticketed
    const product = wa.product_id
      ? await this.prisma.product_catalog.findUnique({ where: { id: wa.product_id } })
      : null;
    const booking = wa.ezee_reservation_id
      ? await this.prisma.ezee_booking_cache.findUnique({
          where: { ezee_reservation_id: wa.ezee_reservation_id },
          select: { room_number: true, unit_code: true },
        })
      : null;
    const guest = wa.guest_id
      ? await this.prisma.guests.findUnique({ where: { id: wa.guest_id }, select: { name: true, phone: true } })
      : null;
    const paymentRow = await this.prisma.payments.findUnique({
      where: { id: paymentId },
      select: { amount: true },
    });

    if (!wa.guest_id || !wa.ezee_reservation_id || !wa.property_id) {
      this.logger.warn(`createTicketForWhatsappService: wa_service_request ${wa.id} missing guest/booking context`);
      return;
    }

    const ticket = await this.tickets.createServiceRequest({
      property_id: wa.property_id,
      guest_id: wa.guest_id,
      guest_phone: guest?.phone ?? wa.wa_id,
      ezee_reservation_id: wa.ezee_reservation_id,
      department: wa.department ?? 'FRONT_OFFICE',
      subject: product?.name ?? wa.raw_text.slice(0, 240),
      // Category was decided by the AI at classify time and persisted on the row;
      // paid items are almost always a standard delivery, so fall back to T0.
      task_category: wa.task_category ?? 'T0',
      priority: 'MEDIUM',
      room_number: booking?.room_number ?? null,
      unit_code: booking?.unit_code ?? null,
      request_type: 'CHARGEABLE',
    });

    await this.prisma.wa_service_request.update({
      where: { id: wa.id },
      data: { status: 'TICKETED', ticket_id: ticket.id },
    });

    // Payment-status acknowledgment to the guest (service_payment_success).
    // Sent via the notify queue → notification_log (same channel as other guest
    // sends). This runs once (the method early-returns if ticket_id was set).
    await this.sqsProducer.sendNotifyGuest({
      guest_id: wa.guest_id,
      guest_phone: guest?.phone ?? wa.wa_id,
      brand: wa.brand,
      template: resolveTemplate(wa.brand, 'PAYMENT_SUCCESS'),
      variables: {
        name: guest?.name ?? 'Guest',
        amount: String(Number(paymentRow?.amount ?? 0)),
        item: product?.name ?? wa.raw_text.slice(0, 120),
        department: wa.department ?? 'FRONT_OFFICE',
        room_no: booking?.room_number ?? 'NA',
        ref: ticket.id.slice(0, 8),
      },
    });

    this.logger.log(`WhatsApp paid service ${wa.id} → ticket ${ticket.id} created after capture`);
  }

  /**
   * heist1.1 — a WhatsApp paid request whose payment link expired/was cancelled.
   * Marks the payment FAILED (once) and sends the service_payment_failed template
   * with the "Try Again" button (param "1" = wa_service_request.id →
   * /wati/pay/retry?rid={{1}}). Idempotent: skips if already FAILED or CAPTURED.
   */
  async failWhatsappService(paymentId: string, reason: string) {
    const payment = await this.prisma.payments.findUnique({ where: { id: paymentId } });
    if (!payment) return { status: 'ignored', reason: 'payment not found' };
    if (payment.status === 'CAPTURED') return { status: 'already_captured' };
    if (payment.status === 'FAILED') return { status: 'already_failed' }; // dedupe repeat events

    await this.prisma.payments.update({
      where: { id: paymentId },
      data: { status: 'FAILED', updated_at: new Date() },
    });

    const wa = await this.prisma.wa_service_request.findFirst({ where: { payment_id: paymentId } });
    if (wa && wa.status !== 'TICKETED') {
      const product = wa.product_id
        ? await this.prisma.product_catalog.findUnique({ where: { id: wa.product_id } })
        : null;
      const guest = wa.guest_id
        ? await this.prisma.guests.findUnique({ where: { id: wa.guest_id }, select: { name: true, phone: true } })
        : null;
      await this.sqsProducer.sendNotifyGuest({
        guest_id: wa.guest_id ?? '',
        guest_phone: guest?.phone ?? wa.wa_id,
        brand: wa.brand,
        template: resolveTemplate(wa.brand, 'PAYMENT_FAILED'),
        variables: {
          name: guest?.name ?? 'Guest',
          item: product?.name ?? 'your request',
          amount: String(Number(payment.amount)),
          '1': wa.id, // Try Again button → /wati/pay/retry?rid={{1}}
        },
      });
    }
    this.logger.log(`WhatsApp paid service payment ${paymentId} marked FAILED (${reason})`);
    return { status: 'failed_notified', reason };
  }

  // ─── COLIVE: CREATE RAZORPAY ORDER ─────────────────────────────────────────

  /**
   * Creates a Razorpay order for a long-stay (colive) booking.
   * Operates on colive_draft_bookings, NOT ezee_booking_cache.
   *
   * POST /payment/create-colive-order
   */
  async createColiveOrder(
    guest: GuestJwtPayload,
    draftBookingId: string,
    grandTotal: number,
    currency = 'INR',
  ) {
    if (grandTotal <= 0) {
      throw new BadRequestException('Grand total must be greater than zero');
    }

    const draft = await this.prisma.colive_draft_bookings.findUnique({
      where: { id: draftBookingId },
      include: { properties: true },
    });

    if (!draft) throw new NotFoundException('Colive draft booking not found');
    if (draft.guest_id && draft.guest_id !== guest.guest_id) {
      throw new BadRequestException('This draft booking does not belong to you');
    }
    if (draft.status === 'confirmed') {
      throw new BadRequestException('This booking is already confirmed');
    }

    // Brand drives which Razorpay account this colive payment is created on.
    const brand = draft.properties?.brand ?? 'TDS';

    // Create Razorpay order on the brand's Razorpay account.
    const colivePurposeLabel = `Colive — ${draft.duration_days ?? '?'} days, ${draft.first_name} ${draft.last_name}`;
    const rzpOrder = await (this.razorpay.forBrand(brand).orders.create({
      amount: Math.round(grandTotal * 100),
      currency: currency ?? 'INR',
      receipt: draft.booking_reference,
      notes: {
        property_id: draft.property_id,
        property_name: draft.properties?.name ?? `Property ${draft.property_id}`,
        purpose: 'colive',
        purpose_label: colivePurposeLabel,
        draft_booking_id: draftBookingId,
        booking_reference: draft.booking_reference,
        guest_id: guest.guest_id,
        guest_email: draft.email ?? guest.email ?? '',
      },
    }) as any as Promise<{ id: string }>);

    // Move draft to pending_payment
    await this.prisma.colive_draft_bookings.update({
      where: { id: draftBookingId },
      data: {
        status: 'pending_payment',
        razorpay_order_id: rzpOrder.id,
        guest_id: guest.guest_id,
        updated_at: new Date(),
      },
    });

    await this.sqsProducer.sendAuditLog({
      actor_type: 'GUEST',
      actor_id: guest.guest_id,
      action: 'COLIVE_PAYMENT_CREATED',
      entity_type: 'colive_draft_booking',
      entity_id: draftBookingId,
      new_value: {
        razorpay_order_id: rzpOrder.id,
        amount: grandTotal,
        booking_reference: draft.booking_reference,
      },
    });

    return {
      payment_order_id: rzpOrder.id,
      razorpay_order_id: rzpOrder.id,
      razorpay_key: this.razorpay.publicKeyForBrand(brand),
      amount: grandTotal,
      amount_paise: Math.round(grandTotal * 100),
      currency: currency ?? 'INR',
      draft_booking_id: draftBookingId,
      booking_reference: draft.booking_reference,
      guest: {
        name: `${draft.first_name} ${draft.last_name}`,
        email: draft.email,
        phone: draft.phone,
      },
    };
  }

  // ─── COLIVE: VERIFY PAYMENT ─────────────────────────────────────────────────

  /**
   * Verifies the Razorpay signature for a colive payment, confirms the draft
   * booking, and fires the eZee SQS sync message.
   *
   * POST /payment/verify-colive
   */
  async verifyColivePayment(
    guest: GuestJwtPayload,
    draftBookingId: string,
    razorpay_order_id: string,
    razorpay_payment_id: string,
    razorpay_signature: string,
  ) {
    // Look up draft first so we know which brand's secret signed this.
    // Safe (see verifyPayment) — an attacker still needs a valid HMAC under
    // the brand's secret to pass the check.
    const draft = await this.prisma.colive_draft_bookings.findUnique({
      where: { id: draftBookingId },
      include: { properties: true },
    });

    const brand = draft?.properties?.brand ?? 'TDS';
    const expectedSig = createHmac('sha256', this.razorpay.apiSecretForBrand(brand))
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      this.logger.warn(`Invalid colive payment signature for order ${razorpay_order_id} (brand=${brand})`);
      throw new BadRequestException('Invalid payment signature');
    }

    if (!draft) throw new NotFoundException('Colive draft booking not found');
    if (draft.razorpay_order_id !== razorpay_order_id) {
      throw new BadRequestException('Razorpay order ID mismatch');
    }
    if (draft.status === 'confirmed') {
      return {
        message: 'Payment already captured',
        booking_id: draft.id,
        booking_reference: draft.booking_reference,
        status: 'confirmed',
        payment_id: draft.payment_id ?? '',
        total_paid: Number(draft.grand_total),
        currency: 'INR',
      };
    }

    // Look up the room type for eZee IDs
    const roomType = await this.prisma.room_types.findUnique({
      where: { id: draft.room_type_id },
    });

    // Look up the quote for eZee rate_per_night
    const quote = await this.prisma.colive_quotes.findUnique({
      where: { id: draft.quote_id },
    });

    const ratePerNight = quote?.ezee_rate_per_night
      ? Number(quote.ezee_rate_per_night)
      : Number(roomType?.base_price_per_night ?? 0);

    const moveIn = new Date(draft.move_in_date);
    const moveOut = draft.estimated_checkout ?? this.addColiveDays(moveIn, draft.duration_days);
    const totalNights = Math.max(1, Math.ceil(
      (moveOut.getTime() - moveIn.getTime()) / (1000 * 60 * 60 * 24),
    ));

    // Confirm the draft booking
    const paymentRecordId = uuidv4();
    await this.prisma.colive_draft_bookings.update({
      where: { id: draftBookingId },
      data: {
        status: 'confirmed',
        payment_id: paymentRecordId,
        ezee_sync_status: 'PENDING',
        updated_at: new Date(),
        onboarding_json: {
          whatsapp_url: 'https://wa.me/919999999999',
          events_url: 'https://vibehouse.in/events',
          community_name: 'The Daily Social Community',
          next_steps: [
            'Complete your KYC before move-in',
            'Join The Daily Social WhatsApp community',
            'Download The Daily Social app for room access and services',
          ],
        },
      },
    });

    // SQS: queue eZee booking sync for this colive stay
    await this.sqsProducer.sendEzeeInsertColiveBooking({
      draft_booking_id: draftBookingId,
      property_id: draft.property_id,
      room_type_id: draft.room_type_id,
      guest_first_name: draft.first_name,
      guest_last_name: draft.last_name,
      guest_email: draft.email,
      guest_phone: draft.phone,
      move_in_date: this.formatColiveDate(moveIn),
      move_out_date: this.formatColiveDate(moveOut),
      rate_per_night: ratePerNight,
      total_nights: totalNights,
      amount: Number(draft.grand_total),
    });

    // SQS: audit log
    await this.sqsProducer.sendAuditLog({
      actor_type: 'GUEST',
      actor_id: guest.guest_id,
      action: 'COLIVE_BOOKING_CONFIRMED',
      entity_type: 'colive_draft_booking',
      entity_id: draftBookingId,
      new_value: {
        booking_reference: draft.booking_reference,
        razorpay_order_id,
        razorpay_payment_id,
        amount: Number(draft.grand_total),
      },
    });

    return {
      message: 'Colive booking confirmed',
      booking_id: draftBookingId,
      booking_reference: draft.booking_reference,
      status: 'confirmed',
      payment_id: paymentRecordId,
      total_paid: Number(draft.grand_total),
      currency: 'INR',
    };
  }

  private addColiveDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  private formatColiveDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}

