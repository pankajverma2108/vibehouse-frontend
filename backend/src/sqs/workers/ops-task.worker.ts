import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { ZohoDeskService } from '../../zoho-desk/zoho-desk.service';
import { WatiService, GUEST_RECEPTION_ACK, GUEST_UNFULFILLED_ACK } from '../../wati/wati.service';
import { UNFULFILLED_CLASS } from '../../tickets/task-classes';
import { completedWithinTat, tatMinutes } from '../../tickets/tat';
import { feedbackCustomFields } from '../../feedback/feedback-fields';
import { resolveTemplate } from '../../wati/wati-templates';
import { SqsProducerService } from '../sqs-producer.service';
import { FlowLogService } from '../../flow-log/flow-log.service';
import { zohoPropertyName } from '../../common/property-resolver';
import { OpsMessageType } from '../sqs.constants';
import type { SqsWorker } from '../sqs-consumer.service';
import type {
  SqsMessageEnvelope,
  AuditLogPayload,
  PaymentSuccessPayload,
  BookingConfirmedPayload,
  TicketCreatedPayload,
} from '../types/messages';

/**
 * Ops Task Worker — consumes vibehouse-ops.fifo
 *
 * Handles internal side-effects that were previously inline in the request path:
 *   - audit_log       → writes to admin_activity_log
 *   - payment_success → logs + (future) triggers eZee sync
 *   - booking_confirmed → logs + (future) triggers eZee InsertBooking
 *   - ticket_created  → (future) creates Zoho Desk ticket
 */
@Injectable()
export class OpsTaskWorker implements SqsWorker {
  private readonly logger = new Logger(OpsTaskWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly zohoDesk: ZohoDeskService,
    private readonly wati: WatiService,
    private readonly producer: SqsProducerService,
    private readonly flowLog: FlowLogService,
  ) {}

  async process(message: SqsMessageEnvelope): Promise<void> {
    switch (message.type) {
      case OpsMessageType.AUDIT_LOG:
        await this.handleAuditLog(message.payload as AuditLogPayload);
        break;

      case OpsMessageType.PAYMENT_SUCCESS:
        await this.handlePaymentSuccess(message.payload as PaymentSuccessPayload);
        break;

      case OpsMessageType.BOOKING_CONFIRMED:
        await this.handleBookingConfirmed(message.payload as BookingConfirmedPayload);
        break;

      case OpsMessageType.TICKET_CREATED:
        await this.handleTicketCreated(message.payload as TicketCreatedPayload);
        break;

      default:
        this.logger.warn(`Unknown ops message type: ${message.type}`);
    }
  }

  /**
   * Map our task class → the Zoho "Severity" picklist (time-tier options), by TAT:
   *   T-1 / T0 (10 min) → 15MINS · T1 (30) / T2 (60) → 60MINS · T3 (4 hr) → 12HRS
   *   T4 (emergency, broadcast) → SOS
   */
  private severityFor(taskCategory: string | null): string {
    switch (taskCategory) {
      case 'T-1':
      case 'T0':
        return '15MINS';
      case 'T3':
        return '12HRS';
      case 'T4':
        return 'SOS';
      default:
        return '60MINS'; // T1 / T2 / unknown
    }
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  private async handleAuditLog(payload: AuditLogPayload): Promise<void> {
    await this.prisma.admin_activity_log.create({
      data: {
        id: uuidv4(),
        actor_type: payload.actor_type,
        actor_id: payload.actor_id,
        action: payload.action,
        entity_type: payload.entity_type,
        entity_id: payload.entity_id,
        old_value: (payload.old_value ?? undefined) as any,
        new_value: (payload.new_value ?? undefined) as any,
        ip_address: payload.ip_address ?? null,
      },
    });
    this.logger.debug(`Audit log: ${payload.action} on ${payload.entity_type}/${payload.entity_id}`);
  }

  private async handlePaymentSuccess(payload: PaymentSuccessPayload): Promise<void> {
    this.logger.log(
      `Payment success: ${payload.payment_id} | ₹${payload.amount} | ERI: ${payload.eri}`,
    );

    // Future: Emit to eZee sync queue for AddExtraCharge
    // await this.sqsProducer.sendEzeeAddExtraCharge({ ... });

    // Future: Emit guest notification
    // await this.sqsProducer.sendNotifyGuest({ ... });
  }

  private async handleBookingConfirmed(payload: BookingConfirmedPayload): Promise<void> {
    this.logger.log(
      `Booking confirmed: ERI ${payload.eri} | Room: ${payload.room_type} | ${payload.checkin} → ${payload.checkout}`,
    );

    // Send the booking-confirmation email. For BUTEAK anonymous bookings the
    // email IS the entire post-booking surface — there's no PWA dashboard
    // they can log into. For logged-in (TDS) bookings the same email is a
    // nice-to-have; if it ever needs to be suppressed for one path or the
    // other, branch on guests.is_anonymous here.
    try {
      const booking = await this.prisma.ezee_booking_cache.findUnique({
        where: { ezee_reservation_id: payload.eri },
        select: {
          ezee_reservation_id: true,
          property_id: true,
          no_of_guests: true,
          room_number: true,
          checkin_date: true,
          checkout_date: true,
          properties: { select: { name: true } },
          guests: { select: { name: true, email: true, phone: true } },
        },
      });
      if (!booking?.guests?.email) {
        this.logger.warn(
          `Skipping booking-confirmation email for ${payload.eri}: no guest email on record`,
        );
        return;
      }

      const fullName = booking.guests.name || 'Guest';
      const firstName = fullName.split(/\s+/)[0] || fullName;
      const fmtDate = (d: Date | null) =>
        d ? d.toISOString().slice(0, 10) : 'TBD';

      await this.email.sendBookingConfirmationEmail({
        toEmail: booking.guests.email,
        firstName,
        fullName,
        phone: booking.guests.phone ?? undefined,
        bookingId: booking.ezee_reservation_id,
        propertyName: booking.properties?.name ?? 'Your stay',
        roomType: payload.room_type ?? '—',
        roomNumber: booking.room_number ?? '—',
        checkinDate: fmtDate(booking.checkin_date),
        checkoutDate: fmtDate(booking.checkout_date),
        noOfGuests: booking.no_of_guests ?? 1,
        propertyId: booking.property_id,
      });
    } catch (err) {
      // Don't fail the whole message on email failure — payment is already
      // captured + booking confirmed. Email is the user's record but not the
      // system's; ops can resend manually if it doesn't land.
      this.logger.error(
        `Failed to send booking-confirmation email for ${payload.eri}: ${(err as Error).message}`,
      );
    }
  }

  private async handleTicketCreated(payload: TicketCreatedPayload): Promise<void> {
    this.logger.log(
      `Ticket created: ${payload.service_name} | ${payload.request_type} | Room: ${payload.room_number}`,
    );

    if (!payload.ticket_id) {
      // Legacy/other producers may not carry a ticket_id — nothing to mirror.
      return;
    }

    const ticket = await this.prisma.zoho_ticket_ref.findUnique({
      where: { id: payload.ticket_id },
      include: {
        staff: true,
        guests: { select: { name: true, phone: true } },
        ezee_booking_cache: { select: { property_id: true, properties: { select: { brand: true } } } },
      },
    });
    if (!ticket) {
      this.logger.warn(`handleTicketCreated: ticket ${payload.ticket_id} not found`);
      return;
    }

    const brand = ticket.ezee_booking_cache?.properties?.brand ?? 'TDS';
    // Exact Zoho picklist value for cf_property_name (null if the property id isn't
    // one we've mapped — then we omit the field rather than send an invalid option).
    const propertyName = zohoPropertyName(ticket.ezee_booking_cache?.property_id);
    const tat = tatMinutes(ticket.created_at, ticket.sla_breach_at);

    // 1. Mirror to Zoho Desk (best-effort; local row stays authoritative).
    const zohoStart = Date.now();
    const zohoId = await this.zohoDesk.createTicket({
      subject: ticket.subject ?? payload.service_name,
      description: `${payload.service_name} — Room ${ticket.room_number ?? 'NA'}`,
      contactName: ticket.guests?.name ?? 'Guest',
      contactPhone: ticket.guest_phone ?? ticket.guests?.phone ?? null,
      priority: ticket.priority,
      // Reflect assignment in the native Zoho status so the board is trackable:
      // Open = genuinely unassigned/unhandled, Pending = assigned but not yet
      // acknowledged. (Ack → In Progress, complete → Closed happen later.)
      status: ticket.assigned_staff_id ? 'Pending' : 'Open',
      // NOTE: Zoho Desk's built-in `dueDate` is SLA/settings-governed and is IGNORED
      // when set via the API (verified: POST + PATCH both fall back to Zoho's default
      // +24h). The real SLA lives in our own timers/escalation; Zoho is a mirror. To
      // make Zoho's due date meaningful, configure a Zoho Desk SLA for the department.
      // Zoho custom fields — API names verified against the Desk ticket layout
      // (organizationFields). Picklist values must match the field's options exactly.
      customFields: {
        cf_room_bed: ticket.room_number ?? 'NA', // "Room /Bed" (was wrongly cf_room_no)
        cf_request_type: payload.request_type ?? 'FREE', // picklist FREE/BORROWABLE/CHARGEABLE/MAINTENANCE
        cf_assigned_staff_id: ticket.assigned_staff_id ?? '', // our DB staff id
        // "Handled By" — our staff aren't Zoho agents, so the native owner can't hold
        // them; this + cf_assigned_staff_id surface who's on it.
        cf_handled_by: ticket.staff?.name ?? 'Unassigned',
        // "Assigned Staff" — the ORIGINAL assignee's name, pinned at creation. Unlike
        // cf_handled_by (which advanceEscalation moves to whoever was last paged), this
        // stays put so the escalation trail always shows who it was first given to.
        cf_assigned_staff: ticket.staff?.name ?? 'Unassigned',
        // "Property Name" picklist — so an escalation viewer (e.g. a director covering
        // several sites) can see which property the ticket belongs to. Omitted when the
        // property id isn't mapped, to avoid pushing an invalid picklist option.
        ...(propertyName ? { cf_property_name: propertyName } : {}),
        cf_current_escalation_level: 'L0', // picklist NA/L0..L4; L0 = assigned, not yet escalated
        cf_severity: this.severityFor(ticket.task_category), // picklist 15MINS/60MINS/12HRS/SOS
        cf_booking_id: ticket.ezee_reservation_id ?? '',
        // "TAT" (number, minutes) — the turn-around this ticket was promised, pinned at
        // creation from sla_config so a later SLA edit never rewrites history. Omitted when
        // the class had no SLA row, so an empty cell reads "nothing was promised" rather
        // than a misleading 0. Pairs with cf_completed_within_tat, set on close.
        ...(tat !== null ? { cf_tat: tat } : {}),
        // "is_test" — raised by an admin-made test booking, so the board can filter these out of
        // real work and reporting. A CHECKBOX field, so the value is a boolean: sending the
        // string 'Yes' is rejected. Sent ONLY when true (same reasoning as cf_property_name
        // above) — the field defaults to unchecked, so a real ticket omitting it reads false, and
        // a missing/misconfigured cf_is_test can then only ever fail a TEST ticket's mirror,
        // never a real one.
        ...(ticket.is_test ? { cf_is_test: true } : {}),
      },
    });
    if (zohoId) {
      await this.prisma.zoho_ticket_ref.update({
        where: { id: ticket.id },
        data: { zoho_ticket_id: zohoId, synced_at: new Date() },
      });
      // Seed the Activity feed with the assignment note.
      await this.zohoDesk.addComment(
        zohoId,
        ticket.staff
          ? `Auto-assigned to ${ticket.staff.name} (${ticket.staff.role}). Turn-around target: ${
              ticket.sla_breach_at
                ? Math.max(1, Math.round((ticket.sla_breach_at.getTime() - ticket.created_at.getTime()) / 60_000)) + ' min'
                : 'n/a'
            }.`
          : `No available ${brand} staff — routing straight to Reception (L1 escalation).`,
      );
      // Heal the fast request→complete race: if the guest acknowledged or completed
      // this ticket BEFORE the Zoho ticket existed, complete()/acknowledge() mirrored
      // to the "SVC-" placeholder id and silently no-op'd (isRealId guard). Now that we
      // have a real id, re-read the CURRENT local state and replay it onto Zoho.
      await this.reconcileLateZohoState(ticket.id, zohoId);
    }
    await this.flowLog.log({
      trace_id: ticket.id,
      ticket_id: ticket.id,
      brand,
      module: 'ZOHO_CREATE',
      output: zohoId ? `Zoho ticket ${zohoId}` : 'skipped/failed (Zoho not configured or error)',
      status: zohoId ? 'OK' : 'SKIP',
      latency_ms: Date.now() - zohoStart,
    });

    const subject = ticket.subject ?? payload.service_name;
    const roomNo = ticket.room_number ?? 'NA';

    // NOTE: the staff-assignment WhatsApp is now sent synchronously at ticket
    // creation (TicketsService.createServiceRequest) so it always precedes the
    // first ack-window reminder — it is intentionally NOT sent here anymore.

    // Tell the guest their request was received. If a staff member was assigned we
    // name them (guest_request_notify); if NO staff was available the ticket routes
    // straight to Reception (L1), so we send the Reception reassurance instead.
    //
    // Skipped when the producer already acked the guest itself (notify_guest === false):
    // the WhatsApp front door sends a synchronous, assignee-named session reply at
    // creation, so a worker message here would just duplicate it.
    if (ticket.guest_id && payload.notify_guest !== false) {
      const guestPhone = ticket.guest_phone ?? ticket.guests?.phone ?? undefined;
      // Name the handler to the guest whenever the ticket actually HAS one. This used to
      // additionally require `staff.role === ticket.department`, on the theory that a
      // role mismatch meant a fallback to Reception — but reception-bound tickets are now
      // assigned by ladder POSITION, so the L1 holder's role legitimately differs from
      // FRONT_OFFICE and that test would wrongly suppress a perfectly good named ack.
      //
      // The one case that must never name anyone is UNFULFILLED: we don't offer the
      // thing, so "assigned to Pankaj, on it" is a promise nobody can keep.
      const unfulfilled = ticket.task_category === UNFULFILLED_CLASS;
      const namedAssignment =
        !unfulfilled && Boolean(ticket.assigned_staff_id) && ticket.staff != null;
      if (namedAssignment) {
        await this.producer.sendNotifyGuest({
          guest_id: ticket.guest_id,
          guest_phone: guestPhone,
          brand,
          template: resolveTemplate(brand, 'GUEST_ACK'),
          variables: {
            name: ticket.guests?.name ?? 'Guest',
            request: subject,
            staff_name: ticket.staff?.name ?? 'our team',
            room_no: roomNo,
          },
        });
      } else if (guestPhone) {
        // Unassigned, or an unfulfillable ask → Reception will reply. Send the
        // reassurance as a free-text session message (the guest is inside the 24h
        // window), so it needs no approved WATI template.
        await this.wati.sendSessionMessage(
          brand,
          guestPhone,
          unfulfilled ? GUEST_UNFULFILLED_ACK : GUEST_RECEPTION_ACK,
        );
      }
      await this.flowLog.log({
        trace_id: ticket.id,
        ticket_id: ticket.id,
        brand,
        module: 'NOTIFY_GUEST',
        output: guestPhone
          ? namedAssignment
            ? `"request received" → ${guestPhone} (handler: ${ticket.staff?.name ?? 'our team'})`
            : unfulfilled
              ? `"Reception will contact you" → ${guestPhone} (${UNFULFILLED_CLASS} — no assignee named, nothing promised)`
              : `"sent to Reception" → ${guestPhone} (unassigned)`
          : 'skipped — no guest phone',
        status: guestPhone ? 'OK' : 'SKIP',
      });
    }
  }

  /**
   * Replay the ticket's current terminal state onto a freshly-created Zoho ticket.
   *
   * Tickets are born with a "SVC-" placeholder id and only get their real numeric
   * Zoho id here, after the async createTicket round-trip. If the guest/staff drove
   * the ticket to IN_PROGRESS or COMPLETED in the meantime, those handlers mirrored
   * to the placeholder and the Zoho calls silently no-op'd (isRealId guard). We
   * re-read the CURRENT state (it may have advanced during createTicket) and push it.
   * Best-effort throughout — never throws.
   */
  private async reconcileLateZohoState(ticketId: string, zohoId: string): Promise<void> {
    const t = await this.prisma.zoho_ticket_ref.findUnique({
      where: { id: ticketId },
      include: { staff: { select: { name: true } } },
    });
    if (!t) return;

    if (t.status === 'IN_PROGRESS') {
      await this.zohoDesk.updateTicket(zohoId, { status: 'In Progress' }).catch(() => undefined);
      await this.zohoDesk
        .addComment(zohoId, 'Acknowledged — work in progress. (synced after Zoho ticket creation)')
        .catch(() => undefined);
      this.logger.log(`Reconciled late Zoho state for ${ticketId} → In Progress (${zohoId})`);
    } else if (t.status === 'COMPLETED') {
      const staffName = t.staff?.name ?? 'our team';
      const completedAt = t.completed_at ?? new Date();
      const elapsedMin = Math.max(
        1,
        Math.round((completedAt.getTime() - t.created_at.getTime()) / 60_000),
      );
      // Replay the TAT verdict too: complete() ran while this ticket still had its "SVC-"
      // placeholder id, so its PATCH no-op'd behind isRealId and the checkbox would stay
      // unticked forever — reading as a breach on exactly the FASTEST tickets, the ones
      // closed before the Zoho mirror even existed.
      const withinTat = completedWithinTat(t.created_at, t.sla_breach_at, completedAt);
      await this.zohoDesk
        .updateTicket(zohoId, {
          status: 'Closed',
          resolution: `Completed by ${staffName} at ${completedAt.toISOString()} (${elapsedMin} min from request).`,
          ...(withinTat !== null ? { customFields: { cf_completed_within_tat: withinTat } } : {}),
        })
        .catch(() => undefined);
      await this.zohoDesk
        .addTimeEntry(zohoId, {
          minutes: elapsedMin,
          note: `${t.subject ?? 'Service request'} — completed by ${staffName}.`,
        })
        .catch(() => undefined);
      await this.zohoDesk
        .addComment(
          zohoId,
          `Ticket completed by ${staffName}. Total time: ${elapsedMin} min. (synced after Zoho ticket creation)`,
        )
        .catch(() => undefined);
      await this.pushPendingFeedback(ticketId, zohoId);
      this.logger.log(`Reconciled late Zoho state for ${ticketId} → Closed (${zohoId})`);
    }
  }

  /**
   * Push feedback the guest already gave before the Zoho ticket existed. The write-back
   * guards on isRealId, so anything captured against the "SVC-" placeholder never reached
   * Zoho; land it on the real ticket now.
   *
   * Matches BOTH capture channels. The button flow leaves `rating` AND `submitted_at`
   * null — a tap sets only `sentiment`, and the row deliberately stays open so a
   * follow-up remark can still append — so the old `rating + submitted_at` filter matched
   * no Good/Bad tap ever and this replay was dead for the default channel.
   */
  private async pushPendingFeedback(ticketId: string, zohoId: string): Promise<void> {
    const fb = await this.prisma.ticket_feedback.findFirst({
      where: {
        ticket_id: ticketId,
        pushed_to_zoho: false,
        OR: [{ rating: { not: null } }, { sentiment: { not: null } }],
      },
      orderBy: { created_at: 'desc' },
    });
    if (!fb) return;
    const patched = await this.zohoDesk
      .updateTicket(zohoId, {
        customFields: feedbackCustomFields({
          rating: fb.rating,
          sentiment: fb.sentiment,
          comment: fb.comment,
        }),
      })
      .catch(() => false);
    if (patched) {
      await this.prisma.ticket_feedback
        .update({ where: { id: fb.id }, data: { pushed_to_zoho: true } })
        .catch(() => undefined);
    }
  }
}
