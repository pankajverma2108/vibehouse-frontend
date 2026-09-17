import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { EzeeSyncMessageType } from '../sqs.constants';
import type { SqsWorker, SqsMessageMeta } from '../sqs-consumer.service';
import type {
  SqsMessageEnvelope,
  EzeeInsertBookingPayload,
  EzeeAddExtraChargePayload,
  EzeeAutosyncWebhookPayload,
  EzeeUpdateReservationPayload,
  EzeeInsertColiveBookingPayload,
} from '../types/messages';
import { EzeeService } from '../../ezee/ezee.service';
import { EzeeApiError } from '../../ezee/ezee.types';
import { EmailService } from '../../email/email.service';
import { AutosyncSideEffectsService } from '../../ezee/webhook/autosync-side-effects.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../redis/cache.service';
import type {
  EzeeAutosyncReservation,
  EzeeAutosyncBookingTran,
} from '../../ezee/webhook/ezee-autosync.types';
import { EzeeRoomGuestsService } from '../../ezee/ezee-room-guests.service';

/**
 * eZee Sync Worker — consumes vibehouse-ezee-sync.fifo
 *
 * Processes eZee PMS API calls one at a time (maxMessages=1) to respect
 * eZee's rate limits. Each booking sync involves 5 sequential API calls
 * with 2.5s delays between them.
 */
@Injectable()
export class EzeeSyncWorker implements SqsWorker {
  private readonly logger = new Logger(EzeeSyncWorker.name);

  constructor(
    private readonly ezee: EzeeService,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly autosyncSideEffects: AutosyncSideEffectsService,
    private readonly email: EmailService,
    private readonly roomGuests: EzeeRoomGuestsService,
  ) {}

  async process(message: SqsMessageEnvelope, meta?: SqsMessageMeta): Promise<void> {
    switch (message.type) {
      case EzeeSyncMessageType.INSERT_BOOKING:
        await this.handleInsertBooking(message.payload as EzeeInsertBookingPayload, meta);
        break;

      case EzeeSyncMessageType.INSERT_COLIVE_BOOKING:
        await this.handleInsertColiveBooking(message.payload as EzeeInsertColiveBookingPayload);
        break;

      case EzeeSyncMessageType.ADD_EXTRA_CHARGE:
        await this.handleAddExtraCharge(message.payload as EzeeAddExtraChargePayload);
        break;

      case EzeeSyncMessageType.UPDATE_RESERVATION:
        await this.handleUpdateReservation(message.payload as EzeeUpdateReservationPayload);
        break;

      case EzeeSyncMessageType.AUTOSYNC_WEBHOOK:
        await this.handleAutosyncWebhook(message.payload as EzeeAutosyncWebhookPayload);
        break;

      default:
        this.logger.warn(`Unknown eZee sync message type: ${message.type}`);
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private delay(ms = 2500): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async createSyncLog(entityType: string, entityId: string, action: string): Promise<string> {
    const id = uuidv4();
    await this.prisma.ezee_sync_log.create({
      data: {
        id,
        entity_type: entityType,
        entity_id: entityId,
        action,
        status: 'PENDING',
        attempts: 1,
        last_attempted_at: new Date(),
      },
    });
    return id;
  }

  private async updateSyncLog(id: string, status: string, error?: string): Promise<void> {
    await this.prisma.ezee_sync_log.update({
      where: { id },
      data: {
        status,
        error_message: error ?? null,
        last_attempted_at: new Date(),
      },
    });
  }

  // ── INSERT BOOKING ───────────────────────────────────────────────────────

  /**
   * Full booking sync flow:
   * 1. InsertBooking → get ReservationNo
   * 2. ProcessBooking → confirm (eZee auto-assigns room)
   * 3. FetchSingleBooking → capture auto-assigned room name/ID + folio snapshot
   * 4. AddPayment → record the Razorpay capture in the folio (postFolioPayment)
   *
   * Idempotent: checks ezee_reservation_no to skip already-completed steps.
   */
  // Mirrors the eZee-sync queue's RedrivePolicy maxReceiveCount (scripts/create-sqs-queues.ts).
  // On the receive whose count reaches this, a failed attempt is the LAST one
  // before the message is dead-lettered — so we stamp the terminal-failure marker.
  private static readonly EZEE_MAX_RECEIVE_COUNT = 3;

  private async handleInsertBooking(
    payload: EzeeInsertBookingPayload,
    meta?: SqsMessageMeta,
  ): Promise<void> {
    const { eri, property_id } = payload;

    const booking = await this.prisma.ezee_booking_cache.findUnique({
      where: { ezee_reservation_id: eri },
    });
    if (!booking) {
      this.logger.error(`Booking ${eri} not found — skipping`);
      return;
    }

    const guest = await this.prisma.guests.findUnique({
      where: { id: booking.guest_id! },
    });
    if (!guest) {
      this.logger.error(`Guest ${booking.guest_id} not found for booking ${eri} — skipping`);
      return;
    }

    const syncLogId = await this.createSyncLog('booking', eri, 'INSERT_BOOKING');

    try {
      // Parse room selections from booking_rooms_json (with DB fallback for older bookings)
      const roomSelections = await this.parseBookingRooms(booking);
      if (roomSelections.length === 0) {
        throw new Error(`No room selections found for booking ${eri}`);
      }

      // ── Step 1: InsertBooking (skip if already done) ──────────────────
      let reservationNo = booking.ezee_reservation_no ?? null;
      let subReservationNos: string[] = booking.ezee_sub_reservation_nos
        ? booking.ezee_sub_reservation_nos.split(',')
        : [];

      if (!reservationNo) {
        // Parse guest name
        const nameParts = (guest.name || 'Guest').trim().split(/\s+/);
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : firstName;

        // Build per-room SpecialRequest tag so the eZee booking shows where it
        // came from. Format is short + machine-parseable in case ops ever
        // wants to grep folio exports for Razorpay payment IDs.
        // Example: "VHM Online | RP: pay_OPaQp1jGGv2bxk | Booking — Apt 1, 2 nights"
        const rpTag = payload.razorpay_payment_id
          ? `RP: ${payload.razorpay_payment_id}`
          : `ERI: ${eri}`;
        const labelTag = payload.purpose_label ?? 'Booking';
        const couponTag = payload.coupon_summary ? ` | Coupon: ${payload.coupon_summary}` : '';
        const specialRequest = `VHM Online | ${rpTag}${couponTag} | ${labelTag}`.slice(0, 250);

        // Build rooms for eZee. Any coupon discount is baked into the room
        // base rates so the eZee folio room charge nets to what the guest
        // actually paid (no phantom balance) — see buildEzeeRooms.
        const numberOfNights = this.calcNights(booking.checkin_date, booking.checkout_date);
        const ezeeRooms = this.buildEzeeRooms(
          roomSelections,
          numberOfNights,
          firstName,
          lastName,
          specialRequest,
          payload.discount_total ?? 0,
          // Per-room occupancy: when the cache row has an adults/children
          // split (BUTEAK anonymous + any opted-in FE), distribute it across
          // the booked units exactly the way GuestBookingService did at
          // create-order. When null, buildEzeeRooms keeps the legacy
          // "1 adult per room, 0 children" default.
          booking.no_of_adults ?? null,
          booking.no_of_children ?? null,
        );

        const checkin = this.formatDate(booking.checkin_date);
        const checkout = this.formatDate(booking.checkout_date);

        this.logger.log(`eZee InsertBooking: ERI=${eri}, ${ezeeRooms.length} room(s), ${checkin} → ${checkout}`);

        const result = await this.ezee.insertBooking(property_id, {
          checkin,
          checkout,
          email: guest.email ?? '',
          phone: guest.phone ?? '',
          rooms: ezeeRooms,
          paymentMode: 'Online-Razorpay',
        });

        reservationNo = result.reservationNo;
        subReservationNos = result.subReservationNos;

        // Persist eZee reservation number
        await this.prisma.ezee_booking_cache.update({
          where: { ezee_reservation_id: eri },
          data: {
            ezee_reservation_no: reservationNo,
            ezee_sub_reservation_nos: subReservationNos.join(','),
          },
        });

        await this.delay();
      } else {
        this.logger.log(`eZee InsertBooking already done for ${eri}: ReservationNo=${reservationNo}`);
      }

      // ── Step 2: ProcessBooking (Confirm) ──────────────────────────────
      // eZee auto-assigns a room when the booking is confirmed.
      this.logger.log(`eZee ProcessBooking: confirming ${reservationNo}`);
      await this.ezee.processBooking(property_id, reservationNo);
      await this.delay();

      // ── Step 3: FetchSingleBooking → capture auto-assigned room ───────
      // Kept for Step 4 as well: it is our snapshot of what the folio already
      // carries before we post a payment to it.
      let reservationData: any = null;
      try {
        reservationData = await this.ezee.fetchBooking(property_id, reservationNo);
        const tran = reservationData?.BookingTran?.[0];
        if (tran?.RoomName) {
          await this.prisma.ezee_booking_cache.update({
            where: { ezee_reservation_id: eri },
            data: {
              room_number: tran.RoomName,
              unit_code: tran.RoomID ?? null,
            },
          });
          this.logger.log(`eZee room auto-assigned: ${tran.RoomName} (${tran.RoomID}) for ${eri}`);
        }
      } catch (err) {
        // Non-fatal — room info can be looked up in eZee UI
        this.logger.warn(`eZee FetchSingleBooking failed for ${eri}: ${(err as Error).message}`);
      }
      await this.delay();

      // ── Step 4: AddPayment → record the Razorpay capture on the folio ─
      await this.postFolioPayment({
        eri,
        propertyId: property_id,
        reservationNo,
        subReservationNos,
        amount: payload.amount,
        folio: reservationData,
      });

      // ── Done ──────────────────────────────────────────────────────────
      await this.updateSyncLog(syncLogId, 'SUCCESS');

      // Invalidate room availability cache for this property + date range
      const checkin = this.formatDate(booking.checkin_date);
      const checkout = this.formatDate(booking.checkout_date);
      const cacheKey = CacheService.roomAvailabilityKey(property_id, checkin, checkout);
      await this.cache.del(cacheKey);

      this.logger.log(`eZee booking sync complete: ERI=${eri}, eZee=${reservationNo}`);
    } catch (err) {
      const message = err instanceof EzeeApiError
        ? `[${err.code}] ${err.message}`
        : (err as Error).message;

      this.logger.error(`eZee InsertBooking failed for ${eri}: ${message}`);
      await this.updateSyncLog(syncLogId, 'FAILED', message);

      // On the FINAL SQS attempt (about to dead-letter), stamp a terminal-failure
      // marker so the website can show the guest a reassurance ("payment received,
      // we're finalizing your booking; if it can't complete our team will reach
      // out"). Only on the last attempt → a transient blip that recovers within
      // the retry window never flips a booking to FAILED. Retries are unchanged:
      // we still re-throw so SQS dead-letters as before. Self-heals on a later
      // successful redrive (ezee_reservation_no takes precedence in the derived
      // status). Guarded on null (updateMany count) so it's done at most once.
      // All best-effort: neither the marker write nor the email may swallow the
      // original error.
      const receiveCount = meta?.receiveCount ?? 1;
      if (receiveCount >= EzeeSyncWorker.EZEE_MAX_RECEIVE_COUNT) {
        let newlyFailed = false;
        try {
          const res = await this.prisma.ezee_booking_cache.updateMany({
            where: { ezee_reservation_id: eri, ezee_sync_failed_at: null },
            data: { ezee_sync_failed_at: new Date() },
          });
          newlyFailed = res.count > 0;
          if (newlyFailed) {
            this.logger.warn(
              `eZee InsertBooking terminally failed for ${eri} (attempt ${receiveCount}) — marked ezee_sync_failed_at`,
            );
          }
        } catch (markErr) {
          this.logger.error(
            `Failed to stamp ezee_sync_failed_at for ${eri}: ${(markErr as Error).message}`,
          );
        }

        // Email the guest exactly once (only when we just flipped to failed):
        // payment received but the room couldn't be confirmed; team will reach
        // out or refund. Works for anonymous bookings (booker email always set).
        if (newlyFailed) {
          const toEmail = guest.email ?? booking.booker_email ?? null;
          if (toEmail) {
            await this.email
              .sendBookingSyncFailedEmail({
                toEmail,
                firstName: guest.name ?? 'there',
                bookingId: eri,
                propertyName: payload.property_name ?? booking.room_type_name ?? 'your stay',
                propertyId: property_id,
              })
              .catch((mailErr) =>
                this.logger.error(
                  `Failed to send booking sync-failed email for ${eri}: ${(mailErr as Error).message}`,
                ),
              );
          } else {
            this.logger.warn(`No email on booking ${eri} — sync-failed notice not sent`);
          }
        }
      }

      throw err; // Let SQS retry / dead-letter (unchanged)
    }
  }

  /**
   * Records what the guest actually paid us (the Razorpay capture) on the eZee
   * folio, split across the booking's sub-reservations.
   *
   * ── Why this exists again ──
   * This step was disabled globally on 2026-05-30 (commit ec442e3) because
   * hotel 55402 had eZee's own Razorpay gateway configured and auto-posted a
   * payment ~4s after InsertBooking, so posting again double-paid the folio.
   * That fix over-generalised: ONLY 55402 auto-posted. 60765 and 61766 never
   * had a gateway configured, so they have recorded Paid = 0 / full balance on
   * every online booking since. eZee switched 55402's auto-post off at our
   * request — verified live 2026-08-05 on reservations 1645 (55402), 123
   * (60765) and 184 (61766): identical prod parameters, all three settle at
   * TotalPayment 0.00. One uniform code path is correct again, with no
   * per-property branching.
   *
   * ── Why we guard anyway ──
   * We do not trust that config to stay off. Before posting we read each
   * sub-reservation's current TotalPayment and skip any that already carries
   * one, so a re-enabled gateway (or an SQS redelivery) can't double-pay. If
   * the folio can't be read at all we skip rather than post blind: an unpaid
   * folio is far easier to repair than a double-paid one with a negative
   * balance.
   *
   * ── Amount ──
   * We post `payload.amount`, the amount Razorpay actually captured — not the
   * folio total. Our charge is pre-tax today while the folio total is post-tax,
   * so a GST-sized balance will remain outstanding. That gap is the known,
   * separate tax issue; posting the folio total instead would silently claim
   * money we never collected.
   *
   * Non-fatal by design: the booking is already confirmed in eZee, and a failed
   * folio posting must not dead-letter the sync (which would re-run
   * ProcessBooking). Failures are logged and land in ezee_sync_log as
   * action ADD_PAYMENT / status FAILED.
   *
   * Kill switch: EZEE_FOLIO_ADDPAYMENT_ENABLED=false restores the old
   * skip-everything behaviour without a code deploy.
   */
  private async postFolioPayment(params: {
    eri: string;
    propertyId: string;
    reservationNo: string;
    subReservationNos: string[];
    amount: number;
    folio: any | null;
  }): Promise<void> {
    const { eri, propertyId, reservationNo, subReservationNos, amount, folio } = params;

    if (process.env.EZEE_FOLIO_ADDPAYMENT_ENABLED === 'false') {
      this.logger.warn(
        `eZee AddPayment disabled by flag — folio left unpaid for ${reservationNo} (ERI=${eri}, ₹${amount})`,
      );
      return;
    }

    if (!(amount > 0)) {
      this.logger.log(`eZee AddPayment skipped for ${reservationNo}: nothing captured (₹${amount})`);
      return;
    }

    const syncLogId = await this.createSyncLog('booking', eri, 'ADD_PAYMENT');

    try {
      // Step 3's fetch is reused when it succeeded; re-read when it didn't, so
      // the "already paid?" check is never made on missing data.
      const reservation = folio ?? (await this.ezee.fetchBooking(propertyId, reservationNo));
      const trans: any[] = reservation?.BookingTran ?? [];
      if (trans.length === 0) {
        throw new Error('folio returned no BookingTran — cannot verify existing payments');
      }

      // What the folio already carries, per sub-reservation.
      const paidBySub = new Map<string, number>();
      for (const tran of trans) {
        const sub = String(tran?.SubBookingId ?? '');
        paidBySub.set(sub, (paidBySub.get(sub) ?? 0) + Number(tran?.TotalPayment ?? 0));
      }

      const targets = subReservationNos.length > 0 ? subReservationNos : [reservationNo];

      // Belt and braces: if eZee's SubBookingId labels don't line up with the
      // SubReservationNo values InsertBooking handed us, the per-sub check
      // above would silently match nothing. In that case fall back to a
      // whole-folio check — any payment anywhere means hands off.
      const subsRecognised = targets.some((t) => paidBySub.has(String(t)));
      const folioTotalPaid = [...paidBySub.values()].reduce((sum, v) => sum + v, 0);
      if (!subsRecognised && folioTotalPaid > 0) {
        this.logger.warn(
          `eZee AddPayment skipped for ${reservationNo}: folio already shows ₹${folioTotalPaid} ` +
            `and sub-reservations [${targets.join(',')}] don't match folio subs [${[...paidBySub.keys()].join(',')}]`,
        );
        await this.updateSyncLog(syncLogId, 'SUCCESS');
        return;
      }

      // Visibility, not enforcement. If the capture exceeds what eZee thinks
      // the stay costs, posting it leaves the folio negative. We still post the
      // real captured amount — under-posting would hide a pricing mismatch
      // rather than fix it — but it must not be silent, which is precisely how
      // the coupon rounding bug reached production on 2026-08-05.
      const folioTotal = trans.reduce((sum, t) => sum + Number(t?.TotalAmountAfterTax ?? 0), 0);
      const outstanding = EzeeSyncWorker.roundPaise(folioTotal - folioTotalPaid);
      if (amount > outstanding) {
        this.logger.warn(
          `eZee folio mismatch for ${reservationNo} (ERI=${eri}): capture ₹${amount} exceeds ` +
            `outstanding ₹${outstanding} (folio total ₹${folioTotal}) — posting the capture anyway, ` +
            `folio will show a negative balance`,
        );
      }

      // Split to PAISE, not whole rupees — the last target absorbs the
      // remainder so the total posted equals the total captured exactly.
      const perTarget = Math.floor((amount / targets.length) * 100) / 100;
      let posted = 0;

      for (let i = 0; i < targets.length; i++) {
        const target = targets[i];
        const share =
          i === targets.length - 1
            ? EzeeSyncWorker.roundPaise(amount - perTarget * i)
            : perTarget;

        const alreadyPaid = paidBySub.get(String(target)) ?? 0;
        if (alreadyPaid > 0) {
          this.logger.warn(
            `eZee AddPayment skipped for sub ${target}: folio already shows ₹${alreadyPaid}`,
          );
          continue;
        }
        if (!(share > 0)) continue;

        const receipt = await this.ezee.addPayment(propertyId, target, share);
        posted += share;
        this.logger.log(
          `eZee AddPayment: sub ${target} ₹${share} (${i + 1}/${targets.length}) receipt=${receipt}`,
        );
        if (i < targets.length - 1) await this.delay(1000);
      }

      this.logger.log(
        `eZee folio payment recorded for ${reservationNo} (ERI=${eri}): ₹${posted} of ₹${amount} captured`,
      );
      await this.updateSyncLog(syncLogId, 'SUCCESS');
    } catch (err) {
      const message =
        err instanceof EzeeApiError ? `[${err.code}] ${err.message}` : (err as Error).message;
      // Deliberately swallowed — see the doc comment. The booking stands; the
      // folio needs a manual payment entry.
      this.logger.error(
        `eZee AddPayment failed for ${reservationNo} (ERI=${eri}) — folio left unpaid: ${message}`,
      );
      await this.updateSyncLog(syncLogId, 'FAILED', message);
    }
  }

  // ── ADD EXTRA CHARGE ─────────────────────────────────────────────────────

  private async handleAddExtraCharge(payload: EzeeAddExtraChargePayload): Promise<void> {
    const { eri, property_id, items } = payload;

    const booking = await this.prisma.ezee_booking_cache.findUnique({
      where: { ezee_reservation_id: eri },
    });

    if (!booking) {
      this.logger.error(`Booking ${eri} not found for AddExtraCharge — skipping`);
      return;
    }

    // Need the eZee reservation number — if not synced yet, retry later
    const reservationNo = booking.ezee_reservation_no;
    if (!reservationNo) {
      this.logger.warn(`eZee reservation not yet synced for ${eri} — retrying`);
      throw new Error(`eZee reservation not synced yet for ${eri}`);
    }

    const subNos = booking.ezee_sub_reservation_nos?.split(',') ?? [];
    const bookingId = subNos[0] ?? reservationNo;

    const totalAmount = items.reduce((sum, item) => sum + item.amount * item.quantity, 0);

    const syncLogId = await this.createSyncLog('addon', eri, 'ADD_EXTRA_CHARGE');

    try {
      this.logger.log(`eZee AddPayment (addon): Booking ${bookingId}, ₹${totalAmount}, ${items.length} items`);
      await this.ezee.addPayment(property_id, bookingId, totalAmount);
      await this.updateSyncLog(syncLogId, 'SUCCESS');
      this.logger.log(`eZee addon charge synced for ${eri}`);
    } catch (err) {
      const message = err instanceof EzeeApiError
        ? `[${err.code}] ${err.message}`
        : (err as Error).message;

      this.logger.error(`eZee AddExtraCharge failed for ${eri}: ${message}`);
      await this.updateSyncLog(syncLogId, 'FAILED', message);
      throw err; // Let SQS retry
    }
  }

  // ── UPDATE RESERVATION ───────────────────────────────────────────────────

  private async handleUpdateReservation(payload: EzeeUpdateReservationPayload): Promise<void> {
    this.logger.log(`[STUB] eZee UpdateReservation: ERI ${payload.eri}`);
    // Phase 2: stay extensions, cancellations, date changes
  }

  // ── INSERT COLIVE BOOKING ─────────────────────────────────────────────────

  /**
   * Syncs a confirmed colive (long-stay) booking to eZee PMS.
   * Same pipeline as nightly bookings:
   *   InsertBooking → ProcessBooking → (FetchSingleBooking) → AddPayment
   *
   * On success: updates colive_draft_bookings.ezee_reservation_no + ezee_sync_status
   */
  private async handleInsertColiveBooking(payload: EzeeInsertColiveBookingPayload): Promise<void> {
    const {
      draft_booking_id, property_id, room_type_id,
      guest_first_name, guest_last_name, guest_email, guest_phone,
      move_in_date, move_out_date, rate_per_night, total_nights, amount,
    } = payload;

    const draft = await this.prisma.colive_draft_bookings.findUnique({
      where: { id: draft_booking_id },
    });
    if (!draft) {
      this.logger.error(`Colive draft booking ${draft_booking_id} not found — skipping`);
      return;
    }

    // Idempotency check — skip if already synced
    if (draft.ezee_reservation_no) {
      this.logger.log(`Colive booking ${draft_booking_id} already synced (${draft.ezee_reservation_no})`);
      return;
    }

    // Fetch room type for eZee IDs
    const roomType = await this.prisma.room_types.findUnique({ where: { id: room_type_id } });
    if (!roomType?.ezee_room_type_id) {
      // Throw so SQS retries — do NOT silently return or the booking is lost
      throw new Error(
        `Room type ${room_type_id} has no ezee_room_type_id configured. ` +
        `Run scripts/detect-ezee-room-types.ts and set the ID, then the retry will succeed.`,
      );
    }

    const syncLogId = await this.createSyncLog('colive_draft_booking', draft_booking_id, 'INSERT_COLIVE_BOOKING');

    try {
      // ── Step 1: InsertBooking ─────────────────────────────────────────────
      const title = 'Mr';
      const rateStr = Array(total_nights).fill(String(Math.round(rate_per_night))).join(',');
      const zeroStr = Array(total_nights).fill('0').join(',');

      this.logger.log(`eZee InsertBooking (colive): ${draft_booking_id}, ${total_nights} nights, ${move_in_date} → ${move_out_date}`);

      const result = await this.ezee.insertBooking(property_id, {
        checkin: move_in_date,
        checkout: move_out_date,
        email: guest_email,
        phone: guest_phone,
        rooms: [{
          ezeeRoomTypeId: roomType.ezee_room_type_id,
          ezeeRatePlanId: roomType.ezee_rate_plan_id ?? '',
          ezeeRateTypeId: roomType.ezee_rate_type_id ?? roomType.ezee_rate_plan_id ?? '',
          adults: 1,
          children: 0,
          ratePerNight: rate_per_night,
          numberOfNights: total_nights,
          guestTitle: title,
          guestFirstName: guest_first_name,
          guestLastName: guest_last_name,
          guestGender: 'Male',
        }],
      });

      const reservationNo = result.reservationNo;
      const subReservationNos = result.subReservationNos;

      // Persist eZee reservation number to draft
      await this.prisma.colive_draft_bookings.update({
        where: { id: draft_booking_id },
        data: {
          ezee_reservation_no: reservationNo,
          ezee_sync_status: 'PARTIAL',
          updated_at: new Date(),
        },
      });
      await this.delay();

      // ── Step 2: ProcessBooking ────────────────────────────────────────────
      this.logger.log(`eZee ProcessBooking (colive): confirming ${reservationNo}`);
      await this.ezee.processBooking(property_id, reservationNo);
      await this.delay();

      // ── Step 3: AddPayment ────────────────────────────────────────────────
      const paymentTargets = subReservationNos.length > 0 ? subReservationNos : [reservationNo];
      const amountPerBed = Math.floor(amount / paymentTargets.length);

      for (let i = 0; i < paymentTargets.length; i++) {
        const bedAmount = i === paymentTargets.length - 1
          ? amount - amountPerBed * i
          : amountPerBed;

        this.logger.log(`eZee AddPayment (colive): ${paymentTargets[i]}, ₹${bedAmount}`);
        try {
          await this.ezee.addPayment(property_id, paymentTargets[i], bedAmount);
          if (i < paymentTargets.length - 1) await this.delay(1000);
        } catch (err) {
          this.logger.warn(`eZee AddPayment (colive) failed for ${paymentTargets[i]}: ${(err as Error).message}`);
        }
      }

      // ── Done ──────────────────────────────────────────────────────────────
      await this.prisma.colive_draft_bookings.update({
        where: { id: draft_booking_id },
        data: { ezee_sync_status: 'SYNCED', updated_at: new Date() },
      });

      await this.updateSyncLog(syncLogId, 'SUCCESS');
      this.logger.log(`eZee colive sync complete: draftId=${draft_booking_id}, eZee=${reservationNo}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`eZee colive sync failed for ${draft_booking_id}: ${message}`);
      await this.updateSyncLog(syncLogId, 'FAILED', message);
      await this.prisma.colive_draft_bookings.update({
        where: { id: draft_booking_id },
        data: { ezee_sync_status: 'FAILED', updated_at: new Date() },
      });
      throw err; // Let SQS retry
    }
  }

  // ── Room picking helpers ─────────────────────────────────────────────────

  private async parseBookingRooms(booking: any): Promise<Array<{
    ezeeRoomTypeId: string;
    ezeeRatePlanId: string;
    ezeeRateTypeId: string;
    quantity: number;
    pricePerNight: number;
    maxAdults?: number | null;
    maxChildren?: number | null;
    guests?: Array<{ first_name: string; last_name: string; gender?: string }>;
  }>> {
    if (booking.booking_rooms_json) {
      const rooms = typeof booking.booking_rooms_json === 'string'
        ? JSON.parse(booking.booking_rooms_json)
        : booking.booking_rooms_json;
      return rooms.map((r: any) => ({
        ezeeRoomTypeId: r.ezee_room_type_id,
        ezeeRatePlanId: r.ezee_rate_plan_id,
        ezeeRateTypeId: r.ezee_rate_type_id ?? r.ezee_rate_plan_id,
        quantity: r.quantity,
        pricePerNight: r.price_per_night,
        // Persisted at create-order for capacity-aware distribution. Absent on
        // bookings created before that change → treated as uncapped below.
        maxAdults: r.max_adults ?? null,
        maxChildren: r.max_children ?? null,
        guests: r.guests ?? null,
      }));
    }

    // Fallback for older bookings without booking_rooms_json:
    // parse room_type_name string ("6 Bed Mixed Dormitory x1, Queen Size Room x1")
    // and look up eZee IDs from the room_types table.
    this.logger.warn(`No booking_rooms_json for ${booking.ezee_reservation_id} — falling back to room_type_name parsing`);

    if (!booking.room_type_name) return [];

    const dbRoomTypes = await this.prisma.room_types.findMany({
      where: { property_id: booking.property_id, is_active: true },
    });

    const selections: Array<{
      ezeeRoomTypeId: string;
      ezeeRatePlanId: string;
      ezeeRateTypeId: string;
      quantity: number;
      pricePerNight: number;
    }> = [];

    for (const segment of (booking.room_type_name as string).split(',')) {
      const match = segment.trim().match(/^(.+?)\s+x(\d+)$/i);
      if (!match) continue;
      const [, name, qtyStr] = match;
      const rt = dbRoomTypes.find(
        (r) => r.name.toLowerCase() === name.toLowerCase().trim(),
      );
      if (!rt) {
        this.logger.warn(`Room type "${name}" not found in DB for fallback parsing`);
        continue;
      }
      selections.push({
        ezeeRoomTypeId: rt.ezee_room_type_id ?? '',
        ezeeRatePlanId: rt.ezee_rate_plan_id ?? '',
        ezeeRateTypeId: rt.ezee_rate_type_id ?? rt.ezee_rate_plan_id ?? '',
        quantity: parseInt(qtyStr, 10),
        pricePerNight: Number(rt.base_price_per_night),
      });
    }

    return selections;
  }

  private buildEzeeRooms(
    roomSelections: Array<{
      ezeeRoomTypeId: string;
      ezeeRatePlanId: string;
      ezeeRateTypeId: string;
      quantity: number;
      pricePerNight: number;
      maxAdults?: number | null;
      maxChildren?: number | null;
      guests?: Array<{ first_name: string; last_name: string; gender?: string }>;
    }>,
    numberOfNights: number,
    defaultFirstName: string,
    defaultLastName: string,
    specialRequest?: string,
    discountTotal = 0,
    totalAdults: number | null = null,
    totalChildren: number | null = null,
  ) {
    const nights = Math.max(1, numberOfNights);

    // Total booked units (sum of quantities). Used to distribute aggregate
    // occupancy across rooms; same capacity-aware algorithm GuestBookingService
    // uses at create-order so the eZee folio matches the response we returned.
    const totalUnits = roomSelections.reduce((s, r) => s + r.quantity, 0);
    // Per-unit caps, expanded to the flat unit list (one entry per quantity).
    // When a selection carries no persisted cap (pre-change bookings) it is
    // treated as effectively uncapped, so the split reduces to the old even
    // spread — nothing changes for in-flight legacy bookings.
    const adultCaps: number[] = [];
    const childCaps: number[] = [];
    for (const sel of roomSelections) {
      for (let q = 0; q < sel.quantity; q++) {
        adultCaps.push(sel.maxAdults ?? Number.MAX_SAFE_INTEGER);
        childCaps.push(sel.maxChildren ?? Number.MAX_SAFE_INTEGER);
      }
    }
    const adultsAlloc =
      totalAdults !== null && totalUnits > 0
        ? this.distributeCapped(totalAdults, adultCaps)
        : null;
    const childrenAlloc =
      totalChildren !== null && totalUnits > 0
        ? this.distributeCapped(totalChildren, childCaps)
        : null;

    // Expand selections into individual room entries (one per quantity).
    const rooms: any[] = [];
    let unitIdx = 0;
    for (const sel of roomSelections) {
      for (let q = 0; q < sel.quantity; q++) {
        const guestDetail = sel.guests?.[q];
        const firstName = guestDetail?.first_name ?? defaultFirstName;
        const lastName = guestDetail?.last_name ?? defaultLastName;
        const gender = guestDetail?.gender ?? 'Male';
        const title = gender === 'Female' ? 'Ms' : 'Mr';

        // Per-unit occupancy: distributed split when caller supplied
        // aggregates; otherwise the legacy "1 adult per room, 0 children".
        const adults = adultsAlloc ? adultsAlloc[unitIdx] : 1;
        const children = childrenAlloc ? childrenAlloc[unitIdx] : 0;

        rooms.push({
          ezeeRoomTypeId: sel.ezeeRoomTypeId,
          ezeeRatePlanId: sel.ezeeRatePlanId,
          ezeeRateTypeId: sel.ezeeRateTypeId,
          adults,
          children,
          ratePerNight: sel.pricePerNight,
          numberOfNights: nights,
          // baseRates filled below when a discount applies
          guestTitle: title,
          guestFirstName: firstName,
          guestLastName: lastName,
          guestGender: gender,
          // Same payment trace on every room of the booking — applied
          // uniformly so eZee folio rows are consistently tagged.
          specialRequest,
        });
        unitIdx += 1;
      }
    }

    // ── Bake the coupon discount into per-night base rates (Option A) ──
    // The discount is booking-level; eZee only carries the room charges, so we
    // spread the discount proportionally across every room-night and let the
    // LAST room-night absorb rounding, guaranteeing the room charge total lands
    // EXACTLY on (roomSubtotal - discount). Result: eZee folio room charge ==
    // amount paid -> zero balance. The rack rate is not shown in eZee; the
    // discount audit trail lives in our coupon_redemptions table.
    //
    // Note: for room+addon bookings the full discount is applied against rooms
    // (addons aren't pushed to the eZee folio today). Buteak — the only
    // coupon-enabled property — is room-only, so this is exact there.
    if (discountTotal > 0 && rooms.length > 0) {
      const roomSubtotal = rooms.reduce((sum, r) => sum + r.ratePerNight * nights, 0);
      if (roomSubtotal > 0) {
        // Rates are carried to PAISE, not whole rupees. Rounding the target to
        // ₹1 here is what put coupon bookings into a negative balance once we
        // began posting payments on 2026-08-05: eZee was told the room cost
        // ₹1 while Razorpay captured ₹1.10 / ₹1.29 (55402 res 1647, 61766 res
        // 187). eZee accepts fractional base rates — verified live, 60765 res
        // 127. The error was bounded (one rounding for the whole booking, so
        // ≤ ₹0.50 pre-tax) but it is a real mismatch and it is avoidable.
        const target = Math.max(0, EzeeSyncWorker.roundPaise(roomSubtotal - discountTotal));
        const ratio = target / roomSubtotal;

        // Discounted rate for each (room, night), tracking a running total so
        // the final room-night absorbs the rounding remainder.
        let assigned = 0;
        const totalNightsAllRooms = rooms.length * nights;
        let counter = 0;
        for (const room of rooms) {
          const perNight: number[] = [];
          for (let n = 0; n < nights; n++) {
            counter++;
            const isLast = counter === totalNightsAllRooms;
            let rate = isLast
              ? EzeeSyncWorker.roundPaise(target - assigned) // remainder → exact total
              : EzeeSyncWorker.roundPaise(room.ratePerNight * ratio);
            if (rate < 0) rate = 0;
            assigned = EzeeSyncWorker.roundPaise(assigned + rate);
            perNight.push(rate);
          }
          room.baseRates = perNight;
        }
      }
    }

    return rooms;
  }

  /**
   * Rounds to paise. Money is carried at 2 dp throughout the eZee payload;
   * this also flattens float artefacts (0.1 + 0.2) so a per-night split sums
   * back to its target exactly.
   */
  private static roundPaise(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private calcNights(checkin: Date | null | undefined, checkout: Date | null | undefined): number {
    if (!checkin || !checkout) return 1;
    const ms = new Date(checkout).getTime() - new Date(checkin).getTime();
    return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  }

  private formatDate(date: Date | null | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  /**
   * Splits `n` into `bins` slots, base-equal with the remainder spilling into
   * the FIRST `remainder` slots. Identical to GuestBookingService.spread —
   * kept here so the worker has no cross-module dependency.
   *   spreadEvenly(6, 3) → [2, 2, 2]
   *   spreadEvenly(8, 3) → [3, 3, 2]
   *   spreadEvenly(2, 3) → [1, 1, 0]
   */
  private spreadEvenly(n: number, bins: number): number[] {
    if (bins < 1) return [];
    const base = Math.floor(n / bins);
    const rem = n - base * bins;
    return Array.from({ length: bins }, (_, i) => base + (i < rem ? 1 : 0));
  }

  /**
   * Capacity-aware distribution — mirror of GuestBookingService.distributeCapped
   * (kept here so the worker has no cross-module dependency, exactly like
   * spreadEvenly). Starts from an even spread, then spills any per-unit overflow
   * into units with headroom under their cap. Reduces to spreadEvenly when no
   * cap binds, so the eZee folio split matches the create-order response and
   * legacy uncapped bookings are unchanged.
   */
  private distributeCapped(total: number, caps: number[]): number[] {
    const n = caps.length;
    if (n < 1) return [];
    const alloc = this.spreadEvenly(total, n);
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

  /**
   * Sums a numeric string field across every BookingTran (one tran per
   * sub-reservation in a multi-room booking). Returns the rupee total, or
   * null when no tran carries a usable amount — so the caller can leave the
   * persisted value untouched rather than zeroing it on an op (e.g. VOID,
   * UPDATEGUEST) that omits folio amounts.
   */
  private sumTranAmounts(
    trans: EzeeAutosyncBookingTran[] | undefined,
    field: 'TotalAmountAfterTax' | 'TotalAmountBeforeTax',
  ): number | null {
    if (!trans || trans.length === 0) return null;
    let total = 0;
    let sawAny = false;
    for (const t of trans) {
      const raw = t?.[field];
      if (raw === undefined || raw === null || raw === '') continue;
      const n = Number(raw);
      if (Number.isFinite(n)) {
        total += n;
        sawAny = true;
      }
    }
    if (!sawAny) return null;
    return Math.round(total * 100) / 100;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTOSYNC WEBHOOK — Inbound push from eZee (RESERVATION / UPDATEGUEST /
  // CHECKIN / CHECKOUT / VOID / NOSHOW / ASSIGN_ROOM / ...). Upserts
  // ezee_booking_cache with the operation-aware status matrix and the
  // preserve-PWA-enrichment rules from the plan. See
  // docs/setup/ezee_autosync_webhook.md for the contract.
  // ═══════════════════════════════════════════════════════════════════════════

  private async handleAutosyncWebhook(payload: EzeeAutosyncWebhookPayload): Promise<void> {
    const { property_id, operation } = payload;
    const reservation = payload.reservation as EzeeAutosyncReservation;
    const uniqueId = reservation?.UniqueID;
    if (!uniqueId) {
      this.logger.warn(`autosync: payload missing UniqueID — skipping`);
      return;
    }

    // ── Reservation-number namespacing ──────────────────────────────────────
    // eZee numbers reservations PER HOTEL starting from 1, so `UniqueID` on its
    // own is not unique across properties: 61766's reservation 98 and 55402's
    // reservation 98 are different bookings. `ezee_reservation_id` is the
    // primary key, so keying on the bare number meant whichever hotel pushed a
    // given number FIRST owned that row forever — every later push from another
    // hotel overwrote the contents while `property_id` (only ever written in the
    // create branch below) kept pointing at the first hotel. The guest then
    // resolved to the wrong property and their tickets went to the wrong
    // hotel's staff.
    //
    // Namespace exactly the way reconciliation already does
    // (`{property_id}-EZEE-{no}`, see ezee-reconciliation.service.ts) so the
    // push and poll paths converge on ONE row per booking per property instead
    // of racing to write two.
    const canonicalEri = `${property_id}-EZEE-${uniqueId}`;
    const legacyEri = String(uniqueId);

    // The row this push actually lands on. Stays `canonicalEri` unless an older
    // row for THIS property is still carrying the booking.
    let eri = canonicalEri;
    // Other rows at this property that represent the SAME booking under a
    // different key, and must be kept in lockstep with the primary. See below.
    let mirrorEris: string[] = [];
    const firstTran: EzeeAutosyncBookingTran | undefined = reservation.BookingTran?.[0];
    const syncLogId = await this.createSyncLog('booking', canonicalEri, `autosync:${operation}`);

    try {
      // ── Resolve every row at THIS property that already represents this
      // provider reservation ──────────────────────────────────────────────
      // One booking can be present under up to three keys at once: the
      // canonical `{property}-EZEE-{n}` written by reconciliation, the bare
      // `{n}` written by autosync before namespacing, and
      // `{property}-LCL-{...}` if we created the booking ourselves and pushed
      // it into eZee. In production 420 of 540 pre-namespacing rows have a
      // canonical twin and 69 of 79 synced local bookings have a bare twin, so
      // multiple rows is the norm here, not an edge case — and looking for
      // only one of them leaves the others frozen at a stale status while the
      // guest keeps resolving through them.
      const canonical = await this.prisma.ezee_booking_cache.findUnique({
        where: { ezee_reservation_id: canonicalEri },
      });
      const bare = await this.prisma.ezee_booking_cache.findUnique({
        where: { ezee_reservation_id: legacyEri },
      });
      if (bare && bare.property_id !== property_id) {
        // A bare row stamped with a DIFFERENT property is the collision
        // artefact itself. Touching it is the bug — never a candidate.
        this.logger.warn(
          `autosync ${operation}: legacy row ${legacyEri} belongs to property ${bare.property_id}, ` +
            `not ${property_id} — leaving it untouched and using ${canonicalEri}`,
        );
      }
      const byResNo = await this.prisma.ezee_booking_cache.findMany({
        where: { property_id, ezee_reservation_no: legacyEri, is_test: false },
      });

      const candidates = new Map<string, (typeof byResNo)[number]>();
      for (const row of [
        canonical,
        bare && bare.property_id === property_id ? bare : null,
        ...byResNo,
      ]) {
        if (row) candidates.set(row.ezee_reservation_id, row);
      }

      // Which row stays PRIMARY. This has to be the row that already owns the
      // booking's children, because the payment mirror, the room-guest
      // snapshot and the checkout side-effects further down all target the
      // primary alone: moving the primary would fire a checkout's breakfast
      // cancellation and lock revocation against a row holding neither.
      //   1. `-LCL-`    — we created this booking, so it owns the payment,
      //                   coupon redemption and guest access from our own flow.
      //   2. bare `{n}` — pre-namespacing autosync rows own the service
      //                   history: tickets, WhatsApp requests, breakfast
      //                   tokens, lock PINs.
      //   3. canonical  — reconciliation-created, typically childless.
      const rank = (key: string) =>
        key.includes('-LCL-') ? 0 : key === legacyEri ? 1 : key === canonicalEri ? 2 : 3;
      const ordered = [...candidates.keys()].sort(
        (a, b) => rank(a) - rank(b) || a.localeCompare(b),
      );

      const existing = ordered.length ? candidates.get(ordered[0])! : null;
      if (existing) eri = ordered[0];
      // Every other row for the same booking. They receive the same
      // eZee-canonical fields so none can strand at a stale status, but no
      // side-effect fires against them.
      mirrorEris = ordered.slice(1);

      // Map eZee operation → our status + is_active.
      const { status, isActive } = this.mapAutosyncOperationToStatus(operation, firstTran);

      // Build the booker contact set — first BookingTran wins, top-level
      // Reservation fields are the fallback for ops where eZee omits them
      // on the tran (e.g. some VOID / UPDATEGUEST shapes).
      const bookerEmail = firstTran?.Email ?? reservation.Email ?? null;
      const bookerPhone = firstTran?.Mobile ?? reservation.Mobile ?? reservation.Phone ?? null;
      const bookerFirstName = firstTran?.FirstName ?? reservation.FirstName ?? null;
      const bookerLastName = firstTran?.LastName ?? reservation.LastName ?? null;
      const bookerName =
        [bookerFirstName, bookerLastName].filter(Boolean).join(' ').trim() || null;

      // Resolve guest_id per the email-priority policy in
      // docs/setup/guest-matching-policy.md. Preserve existing link if set;
      // otherwise email-only match against `guests` (case-insensitive),
      // creating a shell guest when there's no match. Phone-only pushes
      // leave guest_id null (the guest can self-link later when they sign
      // up + verify their phone).
      const resolvedGuestId = existing?.guest_id
        ? existing.guest_id
        : await this.findOrCreateGuestByEmail(bookerEmail, bookerPhone, bookerName);

      // Always-overwrite fields (eZee is canonical for these).
      const subReservationNos = (reservation.BookingTran ?? [])
        .map((t) => t?.SubBookingId)
        .filter((s): s is string => typeof s === 'string' && s.length > 0)
        .join(',');

      // Per-room guest snapshot. A 2-room booking arrives as ONE reservation (UniqueID) with
      // two BookingTrans ("107-1" room 206, "107-2" room 207), each carrying ITS OWN guest and
      // mobile. We cache one row per UniqueID, so without this every room past the first — its
      // number, its guest, its phone — was discarded: that guest's WhatsApp number matched
      // nothing (→ treated as a stranger) and the booker got greeted with the other room's
      // number and name.
      const roomGuests = this.roomGuests.buildRoomGuests(reservation);

      // Folio totals — sum across every BookingTran (multi-room bookings have
      // one tran per sub-reservation). eZee is canonical for these; they power
      // the admin dashboard's "total revenue incl. OTA" tile. Returns null
      // when the payload carries no usable amounts so we don't overwrite a
      // previously-good value with 0 on an op that omits them.
      const folioAfterTax = this.sumTranAmounts(reservation.BookingTran, 'TotalAmountAfterTax');
      const folioBeforeTax = this.sumTranAmounts(reservation.BookingTran, 'TotalAmountBeforeTax');

      // UNASSIGN_ROOM / RELEASE_ROOM explicitly clear the room. Without
      // this carve-out, an empty `RoomName` from the payload falls through
      // to the existing cached value via `??`, leaving the stale room in
      // place. For those two ops we want the cache to reflect "no room
      // assigned" so admin views show the booking back in the unassigned
      // queue.
      const clearsRoom = ['UNASSIGN_ROOM', 'RELEASE_ROOM'].includes((operation ?? '').toUpperCase());
      const incomingRoomName = clearsRoom
        ? null
        : firstTran?.RoomName && firstTran.RoomName.length > 0
          ? firstTran.RoomName
          : existing?.room_number ?? null;

      const update: Prisma.ezee_booking_cacheUncheckedUpdateInput = {
        room_type_name: firstTran?.RoomTypeName ?? existing?.room_type_name ?? null,
        room_number: incomingRoomName,
        checkin_date: firstTran?.Start ? new Date(firstTran.Start) : existing?.checkin_date ?? null,
        checkout_date: firstTran?.End ? new Date(firstTran.End) : existing?.checkout_date ?? null,
        no_of_guests: this.computeOccupancy(firstTran, reservation, existing?.no_of_guests ?? 1),
        source: reservation.BookedBy ?? existing?.source ?? null,
        // Backfill on every path, not just create. reconcileUnsyncedBookings()
        // reads a NULL here as "created locally, never pushed to eZee" and
        // queues an InsertBooking — so a pre-namespacing row we adopt would
        // keep being queued for a reservation that already exists in eZee.
        // Idempotent: canonical and `-LCL-` rows already hold this exact value.
        ezee_reservation_no: legacyEri,
        ezee_sub_reservation_nos: subReservationNos || existing?.ezee_sub_reservation_nos || null,
        booker_email: bookerEmail ?? existing?.booker_email ?? null,
        booker_phone: bookerPhone ?? existing?.booker_phone ?? null,
        fetched_at: new Date(),
        ...(folioAfterTax !== null ? { folio_total_after_tax: folioAfterTax } : {}),
        ...(folioBeforeTax !== null ? { folio_total_before_tax: folioBeforeTax } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(isActive !== undefined ? { is_active: isActive } : {}),
      };

      if (existing) {
        // Don't clobber PWA enrichment (guest_id, coupon_id_*, discount_total,
        // tax_rate_pct, tax_total, booking_rooms_json) — Prisma `update` only
        // touches the fields we name above, so those are naturally preserved.
        await this.prisma.ezee_booking_cache.update({
          where: { ezee_reservation_id: eri },
          data: update,
        });

        // If the autosync push just discovered a guest we didn't have a link
        // to before, set the link + grant PRIMARY booking_guest_access (the
        // unique constraint @@unique([ezee_reservation_id, guest_id]) keeps
        // re-discoveries idempotent).
        if (!existing.guest_id && resolvedGuestId) {
          await this.prisma.ezee_booking_cache.update({
            where: { ezee_reservation_id: eri },
            data: { guest_id: resolvedGuestId },
          });
          await this.ensurePrimaryAccess(eri, resolvedGuestId);
        }

        // Keep every duplicate row for this booking in step with the primary,
        // so none can strand at a stale status while the others move on. Only
        // the eZee-canonical fields above are copied — PWA enrichment on any of
        // them is left alone, as Prisma only touches the fields named in
        // `update`.
        for (const dup of mirrorEris) {
          await this.prisma.ezee_booking_cache.update({
            where: { ezee_reservation_id: dup },
            data: update,
          });
        }
        if (mirrorEris.length) {
          this.logger.log(
            `autosync ${operation}: mirrored onto ${mirrorEris.length} duplicate row(s) ` +
              `[${mirrorEris.join(', ')}] of the same booking as ${eri}`,
          );
        }
      } else {
        // First-seen: full insert. is_active defaults to true unless the
        // matrix said otherwise (e.g. VOID arrives before RESERVATION — rare
        // but possible for back-dated voids during the historical replay).
        await this.prisma.ezee_booking_cache.create({
          data: {
            ezee_reservation_id: eri,
            property_id,
            // Keeps the row out of reconcileUnsyncedBookings() (see the update
            // payload above) and lets reconciliation dedupe per property now
            // that both ingest paths share one keyspace.
            ezee_reservation_no: legacyEri,
            guest_id: resolvedGuestId,
            is_active: isActive ?? true,
            status: status ?? 'CONFIRMED',
            fetched_at: update.fetched_at as Date,
            room_type_name: update.room_type_name as string | null,
            room_number: update.room_number as string | null,
            checkin_date: update.checkin_date as Date | null,
            checkout_date: update.checkout_date as Date | null,
            no_of_guests: update.no_of_guests as number,
            source: update.source as string | null,
            ezee_sub_reservation_nos: update.ezee_sub_reservation_nos as string | null,
            booker_email: update.booker_email as string | null,
            booker_phone: update.booker_phone as string | null,
            folio_total_after_tax: folioAfterTax,
            folio_total_before_tax: folioBeforeTax,
              },
        });
        if (resolvedGuestId) {
          await this.ensurePrimaryAccess(eri, resolvedGuestId);
        }
      }

      // Give every OTHER sub-booking guest a profile + APPROVED access to this reservation, so
      // the room-206 guest is recognised on WhatsApp under their own name — not the booker's.
      // 'merge': eZee pushes a multi-room booking as one message PER ROOM, so this payload may
      // carry only one of the booking's rooms — never let it erase the others.
      await this.roomGuests.applyRoomGuests(eri, roomGuests, resolvedGuestId, 'merge').catch((err) =>
        this.logger.warn(`autosync: sub-guest linking failed for ${eri}: ${(err as Error).message}`),
      );

      // Log the provider's identity AND the row we actually wrote — they differ
      // whenever a pre-namespacing or `-LCL-` row was adopted, and the sync log
      // above is keyed on the canonical name.
      this.logger.log(
        `autosync ${operation}: provider=${property_id}/${legacyEri} row=${eri}` +
          `${mirrorEris.length ? ` (+mirrored ${mirrorEris.join(',')})` : ''}` +
          ` status=${status ?? 'unchanged'} active=${isActive ?? 'unchanged'} guest_id=${resolvedGuestId ?? 'null'}`,
      );
      await this.updateSyncLog(syncLogId, 'SUCCESS');

      // ── Mirror eZee-side payment captures into our payments ledger ───────
      // Catches OTA / front-desk / channel payments that didn't go through
      // our PWA flow, so the admin payments dashboard reflects total
      // revenue, not just our-Razorpay revenue. Dedup is by ERI — if a
      // CAPTURED row already exists for this booking (because the PWA flow
      // recorded it), we skip. Cancellations are intentionally NOT
      // reflected here yet (no refund policy wired in).
      await this.mirrorEzeePayments(eri, property_id, reservation, resolvedGuestId).catch(
        (err) =>
          this.logger.warn(
            `autosync payment-mirror failed for ERI=${eri}: ${(err as Error).message}`,
          ),
      );

      // ── Post-upsert side-effects (best-effort; never throws) ────────────
      // Fire AFTER the sync log success so a MyGate / cache hiccup never
      // causes SQS to retry — the cache row is the durable record.
      // MyGate + welcome email are gated to brand=TDS inside the service;
      // availability cache busts run for everyone on the relevant ops.
      const property = await this.prisma.properties.findUnique({
        where: { id: property_id },
        select: { brand: true },
      });
      await this.autosyncSideEffects
        .dispatch({
          propertyId: property_id,
          brand: property?.brand ?? null,
          operation,
          eri,
          roomNumber: (update.room_number as string | null) ?? null,
          checkinDate: (update.checkin_date as Date | null) ?? null,
          checkoutDate: (update.checkout_date as Date | null) ?? null,
          // Which rooms this push is actually about — so a checkout of one room of a multi-room
          // booking doesn't cancel the breakfast of the roommate who's still here.
          subBookingIds: roomGuests.map((rg) => rg.sub_id).filter(Boolean),
        })
        .catch((err) =>
          this.logger.warn(
            `autosync side-effects dispatch threw for ERI=${eri}: ${(err as Error).message}`,
          ),
        );
    } catch (err) {
      const message = (err as Error).message;
      this.logger.error(`autosync ${operation} failed for ERI=${eri}: ${message}`);
      await this.updateSyncLog(syncLogId, 'FAILED', message);
      throw err; // let SQS retry
    }
  }

  /**
   * eZee operation → our cache `status` + `is_active` effect. Operations not
   * in the explicit list return undefined for both, meaning "refresh the
   * always-overwrite fields but leave status untouched" (covers
   * ASSIGN_ROOM / ROOMMOVE / UPDATE_CFORM / etc).
   */
  private mapAutosyncOperationToStatus(
    operation: string,
    firstTran?: EzeeAutosyncBookingTran,
  ): { status?: string; isActive?: boolean } {
    const op = (operation ?? '').toUpperCase();
    const isConfirmed = firstTran?.IsConfirmed === '1';
    const currentStatus = (firstTran?.CurrentStatus ?? '').toLowerCase();

    switch (op) {
      case 'RESERVATION':
      case 'RESERVATION_GOT_CONFIRMED':
      case 'RESERVATIONTOCHECKIN':
        return { status: isConfirmed ? 'CONFIRMED' : 'PENDING_PAYMENT', isActive: true };
      case 'RESERVATION_GOT_UNCONFIRMED':
      case 'UNCONFIRMED_BOOKING':
        return { status: 'PENDING_PAYMENT', isActive: true };
      case 'CHECKIN':
        return { status: 'CHECKED_IN', isActive: true };
      case 'CHECKOUT':
        return { status: 'CHECKED_OUT', isActive: false };
      case 'UNDO_CHECKIN':
      case 'VOID_CHECKIN':
        // Staff reverses an accidental check-in → back to CONFIRMED, active.
        // PIN that was issued at check-in is killed by the side-effect
        // dispatcher (TDS only).
        return { status: 'CONFIRMED', isActive: true };
      case 'UNDO_CHECKOUT':
        // Staff re-opens a stay after accidental checkout → back to in-house.
        // Side-effect dispatcher re-provisions the PIN with the original
        // expiry (TDS only).
        return { status: 'CHECKED_IN', isActive: true };
      case 'CANCEL':
      case 'NOSHOW':
      case 'VOID_CANCEL_NOSHOW_RESERVATION':
        // eZee bundles these three into one event type; differentiate from
        // CurrentStatus (e.g. "Void", "Cancelled", "No Show") so the cache
        // reflects what staff actually selected in eZee admin.
        if (currentStatus.includes('void')) return { status: 'CANCELLED', isActive: false };
        if (currentStatus.includes('no show')) return { status: 'NO_SHOW', isActive: false };
        return { status: 'CANCELLED', isActive: false };
      // Field-refresh-only ops: status stays as-is.
      case 'UPDATEGUEST':
      case 'ASSIGN_ROOM':
      case 'UNASSIGN_ROOM':
      case 'ROOMMOVE':
      case 'EXCHANGE_ROOM':
      case 'AMEND_STAY':
      case 'CHANGE_RATE':
      case 'UPDATE_CFORM':
      case 'RELEASE_ROOM':
      case 'INSERT_TRANSACTION':
      case 'BLOCK_ROOM':
      case 'MODIFY_BLOCK_ROOM':
      case 'UNBLOCK_ROOM':
        return {};
      default:
        this.logger.warn(`autosync: unmapped operation '${operation}' — treating as field-refresh-only`);
        return {};
    }
  }

  /**
   * Email-priority guest resolution for autosync-discovered bookings.
   * See docs/setup/guest-matching-policy.md for the full 5-case ruleset.
   *
   * Summary:
   *   - No email → null (booking stays unlinked; guest self-links later
   *     by verifying their phone via signup / profile-edit).
   *   - Email matches an existing guest → return that ID, and if the
   *     payload's phone differs from the matched guest's primary AND
   *     the matched guest has no secondary_phone yet, store the
   *     payload's phone as secondary (case iv).
   *   - Email doesn't match any existing guest → create a shell guest
   *     with this email. Phone goes on `primary` if it's free, on
   *     `secondary_phone` if a different guest already owns it
   *     (case v keeps both identities distinct).
   *
   * Returns guest_id or null.
   */
  private async findOrCreateGuestByEmail(
    email: string | null,
    phone: string | null,
    name: string | null,
  ): Promise<string | null> {
    if (!email || email.length === 0) {
      return null;
    }

    // Email is the primary identity key. `guests.email` is unique, so at
    // most one row matches.
    const existing = await this.prisma.guests.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true, phone: true, secondary_phone: true },
    });

    if (existing) {
      // Case (iv): registered guest has p1, OTA push has p2. Stash p2 as
      // secondary so the verified primary isn't overwritten and the
      // alternative contact isn't lost.
      const normalized = this.normalizePhone(phone);
      const normalizedPrimary = this.normalizePhone(existing.phone);
      if (
        normalized &&
        normalized !== normalizedPrimary &&
        !existing.secondary_phone
      ) {
        await this.prisma.guests.update({
          where: { id: existing.id },
          data: { secondary_phone: phone },
        });
        this.logger.log(
          `autosync: stored secondary_phone on guest ${existing.id} (email match, phone differs)`,
        );
      }
      return existing.id;
    }

    // No existing guest for this email → create a shell. Phone goes on the
    // primary slot when free; if another guest already owns it, fall back
    // to secondary so the unique constraint doesn't trip.
    let primaryPhone: string | null = phone;
    let secondaryPhone: string | null = null;
    if (phone) {
      const phoneOwner = await this.prisma.guests.findFirst({
        where: { phone },
        select: { id: true },
      });
      if (phoneOwner) {
        primaryPhone = null;
        secondaryPhone = phone;
      }
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
      this.logger.log(
        `autosync: created shell guest ${created.id} for email=${email} (phone=${primaryPhone ? 'primary' : secondaryPhone ? 'secondary' : 'none'})`,
      );
      return created.id;
    } catch (err) {
      // Race: another autosync message may have created the same email-row
      // between our findFirst and create. Re-look-up and use it.
      const fallback = await this.prisma.guests.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true },
      });
      if (fallback) return fallback.id;
      this.logger.warn(
        `autosync: shell guest create failed for email=${email}: ${(err as Error).message}`,
      );
      return null;
    }
  }

  /** Strip whitespace, dashes, parens, leading + so phones compare cleanly. */
  private normalizePhone(phone: string | null | undefined): string | null {
    if (!phone) return null;
    const s = phone.replace(/[\s+\-()]/g, '');
    return s.length > 0 ? s : null;
  }

  /**
   * Total occupancy for a booking: prefer RentalInfo per-night max (since
   * eZee occasionally varies adult/child counts across nights), fall back
   * to the existing cache value to avoid downgrading a known count to 1.
   */
  private computeOccupancy(
    firstTran: EzeeAutosyncBookingTran | undefined,
    reservation: EzeeAutosyncReservation,
    fallback: number,
  ): number {
    const ri = firstTran?.RentalInfo ?? [];
    if (ri.length > 0) {
      return ri.reduce((max, r) => {
        const adults = Number(r.Adult ?? 0);
        const children = Number(r.Child ?? 0);
        const sum = adults + children;
        return sum > max ? sum : max;
      }, 1);
    }
    return fallback || 1;
  }

  /**
   * Mirror eZee `PaymentDetail` entries into our `payments` table so the
   * admin payments dashboard reflects channel-direct payments (OTAs,
   * walk-ins charged via eZee's Razorpay integration, manual Cash entries)
   * — not only our PWA-originated captures.
   *
   * Dedup strategy: at-most-one mirrored row per (ERI). If a CAPTURED
   * payment already exists for this booking from any source, we skip —
   * the PWA flow recorded it, or a prior autosync pass already did.
   * For typical hostel bookings (one folio total per stay) this gives
   * an accurate channel-completeness view without double-counting.
   */
  private async mirrorEzeePayments(
    eri: string,
    propertyId: string,
    reservation: EzeeAutosyncReservation,
    guestId: string | null,
  ): Promise<void> {
    // Already have a captured payment row? Nothing to mirror.
    const existing = await this.prisma.payments.findFirst({
      where: { ezee_reservation_id: eri, status: 'CAPTURED' },
      select: { id: true },
    });
    if (existing) return;

    // Find the first non-zero PaymentDetail across all BookingTran subs.
    // eZee duplicates the same payment line across sub-reservations in
    // multi-room bookings; one mirrored row per ERI is enough for the
    // dashboard "OTA was paid" signal.
    let mirroredAmount = 0;
    let mirroredMethod: string | null = null;
    for (const tran of reservation.BookingTran ?? []) {
      for (const pd of tran.PaymentDetail ?? []) {
        const amt = Number(pd?.amount ?? 0);
        if (amt > 0) {
          mirroredAmount = amt;
          mirroredMethod = pd?.method ?? null;
          break;
        }
      }
      if (mirroredAmount > 0) break;
    }
    if (mirroredAmount <= 0) return; // booking exists but no payment yet

    await this.prisma.payments.create({
      data: {
        id: uuidv4(),
        ezee_reservation_id: eri,
        property_id: propertyId,
        guest_id: guestId, // nullable; null for OTA bookings without a matched guest
        amount: new Prisma.Decimal(mirroredAmount.toFixed(2)),
        currency: 'INR',
        purpose: 'booking',
        status: 'CAPTURED',
        // payment_mode is null for AUTOSYNC rows — eZee doesn't tell us
        // whether the underlying channel was test or live. The presence
        // of source='AUTOSYNC' is enough to differentiate from our PWA
        // rows in the dashboard.
        source: 'AUTOSYNC',
        ezee_method: mirroredMethod,
      },
    });
    this.logger.log(
      `autosync payment-mirror: ERI=${eri} amount=${mirroredAmount} method=${mirroredMethod ?? 'unknown'}`,
    );
  }

  /**
   * Idempotent PRIMARY booking_guest_access grant — used when autosync
   * discovers a guest we didn't know about. Skips if a row for this
   * (eri, guest_id) pair already exists (the table has @@unique on that
   * pair, but we don't want a P2002 in the worker).
   */
  private async ensurePrimaryAccess(eri: string, guestId: string): Promise<void> {
    await this.roomGuests.ensureAccess(eri, guestId, 'PRIMARY');
  }
}
