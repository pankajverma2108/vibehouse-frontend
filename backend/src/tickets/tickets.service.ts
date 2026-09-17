import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { SqsProducerService } from '../sqs/sqs-producer.service';
import { ZohoDeskService } from '../zoho-desk/zoho-desk.service';
import { FlowLogService } from '../flow-log/flow-log.service';
import { FeedbackService } from '../feedback/feedback.service';
import { propertyShortLabel } from '../common/property-resolver';
import { resolveTemplate } from '../wati/wati-templates';
import { WatiService, guestUnfulfilledDone } from '../wati/wati.service';
import { toIstString } from '../common/utils/time.util';
import { CRITICAL_CLASS, DEFAULT_CLASS, UNFULFILLED_CLASS } from './task-classes';
import { completedWithinTat } from './tat';

/**
 * TicketsService — Phase 1 guest service-request pipeline + durable escalation.
 *
 * Flow: createServiceRequest() persists the ticket WITH assignment + escalation
 * deadlines synchronously (so the watchdog has everything it needs even if the
 * worker is briefly behind), then enqueues TICKET_CREATED for the Zoho-Desk
 * mirror + staff/guest notifications.
 *
 * Escalation is DB-persisted (escalation_level + next_deadline on zoho_ticket_ref)
 * and advanced by SlaWatchdogService — NOT an in-memory setTimeout chain. This is
 * the fix for the escalation_inspiration / make.com failure mode where a redeploy
 * silently killed every in-flight escalation.
 */
@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  // WATI template names are resolved per-brand via resolveTemplate(brand, KEY)
  // (src/wati/wati-templates.ts). TDS keeps its live names; BUTEAK overrides them
  // with WATI_BUTEAK_TPL_* env. Param names in each send below MUST match the
  // registered template's customParams exactly, per brand.
  //   STAFF_ASSIGNED    name, request, room_no, turn_around_time, job_id (+ URL btn "1")
  //   STAFF_ESCALATION  severity, system, text, roomNo, userName, phone, level,
  //                     original_assignee, created_at, time_to_next (+ URL btn "1" = jobId)
  //   STAFF_REMINDER    system, text, roomNo, userName, phone, time_to_next (+ URL btn "1")
  //   GUEST_ACK         name, request, staff_name, room_no
  //   GUEST_DONE        guest_name, request, staff_name, room_no

  constructor(
    private readonly prisma: PrismaService,
    private readonly sqs: SqsProducerService,
    private readonly zohoDesk: ZohoDeskService,
    private readonly flowLog: FlowLogService,
    private readonly feedback: FeedbackService,
    // WatiModule is @Global. Used only for the T-1 close, which is fixed free text
    // rather than a template, so it bypasses the notify worker's template-only path.
    private readonly wati: WatiService,
  ) {}

  // ─── CREATE ────────────────────────────────────────────────────────────────

  async createServiceRequest(input: {
    property_id: string;
    guest_id: string;
    guest_phone?: string | null;
    ezee_reservation_id: string;
    department: string; // HOUSEKEEPING | MAINTENANCE | FRONT_OFFICE
    subject: string; // service name / request text
    task_category?: string; // urgency class, see src/tickets/task-classes.ts (default T0)
    priority?: string; // default MEDIUM
    room_number?: string | null;
    unit_code?: string | null;
    request_type?: 'FREE' | 'BORROWABLE' | 'CHARGEABLE' | 'MAINTENANCE';
    /**
     * Let the caller own the guest "request received" message. The WhatsApp front door
     * acks the guest synchronously (naming the resolved assignee), so it passes `false`
     * to stop the ops worker from sending a duplicate. Defaults to true for callers that
     * rely on the worker (payment capture, PWA store).
     */
    notify_guest?: boolean;
  }) {
    const taskCategory = input.task_category ?? DEFAULT_CLASS;
    const priority = input.priority ?? 'MEDIUM';
    const now = new Date();

    // SLA timing depends only on the task class (global) — not department/priority.
    const sla = await this.prisma.sla_config.findUnique({
      where: { task_category: taskCategory },
    });

    // Emergency → broadcast to all levels at once, no ladder wait.
    const isCritical = taskCategory === CRITICAL_CLASS;

    // Raised by a test booking? The ticket is then handled EXACTLY like a real one — same
    // assignment, same SLA timers, same escalation to real staff and real managers — because the
    // point of a test is to rehearse the real path. Staff recognise it from the "Test-" room
    // number and are instructed to ignore it. The flag is carried only so the Zoho board can
    // filter it (cf_is_test) and so it stays out of reported figures. Resolved from the ERI, so
    // callers don't have to know test bookings exist.
    const isTest = await this.isTestFor(input.ezee_reservation_id);

    // Assign to the least-loaded available staff whose ROLE handles this task.
    // Routing is by role, not department: the classifier's worker-type (HOUSEKEEPING /
    // MAINTENANCE / FRONT_OFFICE, carried in `input.department`) is matched against
    // `staff.role`, so supervisor / escalation-only roles in the same department are
    // never first-assigned. Repairs reach Reception because the classifier's routing
    // policy has already collapsed MAINTENANCE into FRONT_OFFICE before we get here.
    let assignee = await this.prisma.staff.findFirst({
      where: {
        property_id: input.property_id,
        role: input.department,
        is_available: true,
        is_active: true,
      },
      orderBy: [{ active_ticket_count: 'asc' }, { created_at: 'asc' }],
    });

    // Fallback: nobody on the request's own role is available (or the role has no
    // staff at all — e.g. a FRONT_OFFICE "please send the manager" ask). The request
    // must never sit unanswered NOR reach the first responder as a red "Escalation /
    // Unassigned" alert. Hand it to the FIRST escalation rung (L1) as a NORMAL
    // assignment: that person gets the standard staff message + ack window, and if
    // they don't acknowledge it climbs to L2 the usual way (assigneeLadderStart skips
    // past L1). Only works when L1 is staff-backed; otherwise the ticket stays OPEN
    // and the watchdog pages L1 (last resort).
    let fallbackAssigned = false;
    if (!assignee && !isCritical) {
      assignee = await this.firstLevelStaffFallback(input.property_id, input.department);
      fallbackAssigned = !!assignee;
    }

    // Emergency (broadcast) → OWN it at L1. A broadcast used to be assigned to nobody,
    // so it sat unowned and — because everyone was paged only with the escalation template
    // (Acknowledge, no "Mark Complete") — no one could resolve it over WhatsApp. Now the
    // ticket is assigned to the L1 (Reception) staffer, who receives the normal staff ticket
    // template (Acknowledge + Mark Complete) at creation and can close it from WhatsApp. All
    // levels are still paged immediately (broadcastAllLevels); there is no timed laddering.
    let criticalAssigned = false;
    if (isCritical) {
      const l1 = await this.criticalL1Staff(input.property_id);
      if (l1) {
        assignee = l1;
        criticalAssigned = true;
      }
    }
    // slaBreachAt = the full TAT (completion window), shown to staff as turn-around.
    const slaBreachAt = sla ? new Date(now.getTime() + sla.completion_timeout_min * 60_000) : null;
    // The FIRST watchdog deadline is the ACK window = ack_percent% of the TAT (min 1 min).
    // If the assignee doesn't acknowledge by then, escalation begins (advanceEscalation,
    // ACK phase). On ack, the timer is re-armed to the FULL TAT for completion.
    const ackWindowMin =
      sla && sla.completion_timeout_min > 0
        ? Math.max(1, Math.ceil((sla.completion_timeout_min * sla.ack_percent) / 100))
        : 0;
    // First watchdog deadline:
    //   • emergency (T4)     → null: broadcastAllLevels pages everyone right now.
    //   • no staff available → now: the request must never sit unanswered, so the
    //     next watchdog tick escalates it straight to L1 (Reception) via
    //     advanceEscalation's OPEN@level-0 path (ladder L1, irrespective of role).
    //   • normal assignment  → now + ack window (the assignee's time to acknowledge).
    const nextDeadline = isCritical
      ? null
      : !assignee
        ? now
        : sla && ackWindowMin > 0
          ? new Date(now.getTime() + ackWindowMin * 60_000)
          : null;

    const ticketId = uuidv4();
    const ticket = await this.prisma.zoho_ticket_ref.create({
      data: {
        id: ticketId,
        ezee_reservation_id: input.ezee_reservation_id,
        guest_id: input.guest_id,
        guest_phone: input.guest_phone ?? null,
        zoho_ticket_id: `SVC-${ticketId.slice(0, 8)}`, // placeholder until Desk returns the real id
        ticket_type: 'SERVICE_REQUEST',
        subject: input.subject,
        department: input.department,
        task_category: taskCategory,
        priority,
        room_number: input.room_number ?? null,
        unit_code: input.unit_code ?? null,
        assigned_staff_id: assignee?.id ?? null,
        // Pinned so the ticket still names its assignee if that staff row is later deleted.
        assigned_staff_name: assignee?.name ?? null,
        status: assignee ? 'PENDING' : 'OPEN',
        escalation_level: 0,
        next_deadline: nextDeadline,
        sla_breach_at: slaBreachAt,
        synced_at: now,
        is_test: isTest,
      },
    });

    if (assignee) {
      await this.prisma.staff.update({
        where: { id: assignee.id },
        data: { active_ticket_count: { increment: 1 } },
      });
    } else {
      this.logger.warn(
        `Ticket ${ticketId}: no available ${input.department} staff at property ${input.property_id} — left OPEN/unassigned`,
      );
    }

    await this.flowLog.log({
      trace_id: ticketId,
      ticket_id: ticketId,
      module: 'TICKET_CREATE',
      input: `role=${input.department} class=${taskCategory}`,
      output: assignee
        ? `PENDING → ${criticalAssigned ? 'CRITICAL broadcast, owned by L1: ' : fallbackAssigned ? `no ${input.department} staff, fell back to L1: ` : 'assigned '}${assignee.name} (${assignee.role}); ${isCritical ? 'broadcast to all levels now' : `ack in ~${ackWindowMin}m`}, TAT ${sla?.completion_timeout_min ?? '-'}m`
        : `OPEN → no available ${input.department} staff and no L1 fallback → watchdog pages L1 now`,
      status: assignee ? 'OK' : 'SKIP',
    });

    // Notify the assigned staff RIGHT NOW (not via the ops worker). The staff
    // assignment is the most time-critical message and must land before the first
    // ack-window reminder — routing it through the ops worker (Zoho mirror + SQS)
    // meant any ops-worker lag (a deploy rollover, a slow Zoho call, a retry storm)
    // could delay it past the reminder, so staff saw "please complete" before the
    // request itself. Enqueue it here at creation instead.
    if (assignee) {
      const brand = await this.brandFor(input.ezee_reservation_id);
      const turnAround = slaBreachAt
        ? `${Math.max(1, Math.round((slaBreachAt.getTime() - now.getTime()) / 60_000))} min`
        : 'soon';
      // Group booking → show the staffer every room the guest holds, not just one.
      const roomsLabel = await this.allRoomsLabel(input.ezee_reservation_id, input.property_id);
      await this.sqs.sendNotifyStaff({
        staff_phone: assignee.phone,
        staff_name: assignee.name,
        brand,
        template: resolveTemplate(brand, 'STAFF_ASSIGNED'),
        variables: {
          name: assignee.name,
          request: input.subject,
          room_no: roomsLabel ?? input.room_number ?? 'NA',
          turn_around_time: turnAround,
          job_id: ticketId,
          '1': ticketId, // dynamic URL-button param (jobId)
        },
      });
      await this.flowLog.log({
        trace_id: ticketId,
        ticket_id: ticketId,
        module: 'NOTIFY_STAFF',
        output: `assignment → ${assignee.name} (${assignee.phone}); TAT ${turnAround}`,
      });
    }

    // Remaining side-effects (Zoho Desk mirror + guest notify) run in the ops worker.
    await this.sqs.sendTicketCreated({
      ticket_id: ticketId,
      eri: input.ezee_reservation_id,
      guest_id: input.guest_id,
      property_id: input.property_id,
      request_type: input.request_type ?? 'FREE',
      service_name: input.subject,
      room_number: input.room_number ?? null,
      unit_code: input.unit_code ?? null,
      department: input.department,
      priority,
      notify_guest: input.notify_guest,
    });

    // Emergency → broadcast to every escalation level right away.
    if (isCritical) {
      await this.broadcastAllLevels(ticketId).catch((e) =>
        this.logger.error(`${CRITICAL_CLASS} broadcast failed for ${ticketId}: ${(e as Error).message}`),
      );
    }

    return ticket;
  }

  // ─── STAFF ACTIONS (Phase 1: via admin/ops; WhatsApp staff replies in Phase 2) ──

  async acknowledge(ticketId: string) {
    const ticket = await this.prisma.zoho_ticket_ref.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.status === 'COMPLETED' || ticket.status === 'IN_PROGRESS') return ticket;

    // Ack STOPS the ack-phase escalation and STARTS the completion-phase timer:
    // if the work isn't completed within completion_timeout_min, escalation resumes.
    const now = new Date();
    const sla = ticket.task_category
      ? await this.prisma.sla_config.findUnique({ where: { task_category: ticket.task_category } })
      : null;
    const completionDeadline =
      sla && sla.completion_timeout_min > 0
        ? new Date(now.getTime() + sla.completion_timeout_min * 60_000)
        : null;

    const updated = await this.prisma.zoho_ticket_ref.update({
      where: { id: ticketId },
      data: {
        status: 'IN_PROGRESS',
        acked_at: now,
        // Restart the ladder for the completion phase.
        escalation_level: 0,
        next_deadline: completionDeadline,
      },
    });
    await this.zohoDesk
      .updateTicket(ticket.zoho_ticket_id, { status: 'In Progress' })
      .catch(() => undefined);
    await this.zohoDesk
      .addComment(
        ticket.zoho_ticket_id,
        `Acknowledged — work in progress.${completionDeadline ? ` Completion due by ${completionDeadline.toISOString()}.` : ''}`,
      )
      .catch(() => undefined);
    this.logger.log(
      `Ticket ${ticketId} acknowledged → completion timer armed` +
        (completionDeadline ? ` (due ${completionDeadline.toISOString()})` : ' (no completion SLA)'),
    );
    await this.flowLog.log({
      trace_id: ticketId,
      ticket_id: ticketId,
      module: 'ACK',
      output: `IN_PROGRESS — escalation held; completion ${completionDeadline ? 'due ' + completionDeadline.toISOString() : '(no TAT)'}`,
    });
    return updated;
  }

  async complete(ticketId: string) {
    const ticket = await this.prisma.zoho_ticket_ref.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.status === 'COMPLETED') return ticket;

    const updated = await this.prisma.zoho_ticket_ref.update({
      where: { id: ticketId },
      data: { status: 'COMPLETED', completed_at: new Date(), next_deadline: null },
    });
    if (ticket.assigned_staff_id) {
      await this.prisma.staff.update({
        where: { id: ticket.assigned_staff_id },
        data: { active_ticket_count: { decrement: 1 } },
      });
    }
    const staffName = ticket.assigned_staff_id
      ? (await this.prisma.staff.findUnique({ where: { id: ticket.assigned_staff_id } }))?.name ??
        'our team'
      : 'our team';
    const elapsedMin = Math.max(
      1,
      Math.round((updated.completed_at!.getTime() - ticket.created_at.getTime()) / 60_000),
    );
    // "Completed_Within_TAT" (checkbox) — the GUEST's measure: did the close land inside
    // the window we promised at creation. Deliberately not the escalation engine's view;
    // see the note in tat.ts. Null (no SLA row, or T4's zero TAT) omits the field, which
    // leaves it unticked — a checkbox can't say "not applicable".
    const withinTat = completedWithinTat(
      ticket.created_at,
      ticket.sla_breach_at,
      updated.completed_at!,
    );

    // Close in Zoho + write the Resolution field, a Time Entry (worklog) and a note.
    await this.zohoDesk
      .updateTicket(ticket.zoho_ticket_id, {
        status: 'Closed',
        resolution: `Completed by ${staffName} at ${updated.completed_at!.toISOString()} (${elapsedMin} min from request).`,
        ...(withinTat !== null ? { customFields: { cf_completed_within_tat: withinTat } } : {}),
      })
      .catch(() => undefined);
    await this.zohoDesk
      .addTimeEntry(ticket.zoho_ticket_id, {
        minutes: elapsedMin,
        note: `${ticket.subject ?? 'Service request'} — completed by ${staffName}.`,
      })
      .catch(() => undefined);
    await this.zohoDesk
      .addComment(ticket.zoho_ticket_id, `Ticket completed by ${staffName}. Total time: ${elapsedMin} min.`)
      .catch(() => undefined);

    // Notify guest the task is done, then invite them to rate the service.
    //
    // UNFULFILLED (T-1) closes differently on both counts. GUEST_DONE reads "your request
    // has been completed by <staff>", which is untrue for something we never offered — so
    // it gets the soft close, which promises nothing and simply ends the conversation
    // politely. And we do NOT ask for a rating: prompting "how did we do?" immediately
    // after telling someone we can't help is the wrong question.
    //
    // This runs for EVERY close, not just ours: the staff "done" button, the admin
    // dashboard, the Zoho Desk webhook (an agent flipping the ticket to Closed/Resolved
    // in Zoho) and the polling backstop all land here, so a T-1 closed from Zoho sends
    // the same message as one closed from WhatsApp.
    const unfulfilled = ticket.task_category === UNFULFILLED_CLASS;
    if (ticket.guest_id) {
      const guest = await this.guestInfo(ticket.guest_id);
      const brand = await this.brandFor(ticket.ezee_reservation_id);
      const guestPhone = ticket.guest_phone ?? guest.phone ?? undefined;
      if (unfulfilled) {
        await this.closeUnfulfilledToGuest(ticketId, brand, guestPhone, ticket.guest_id, ticket.subject);
      } else {
        await this.sqs.sendNotifyGuest({
          guest_id: ticket.guest_id,
          guest_phone: guestPhone,
          brand,
          template: resolveTemplate(brand, 'GUEST_DONE'),
          variables: {
            guest_name: guest.name,
            request: ticket.subject ?? 'your request',
            staff_name: staffName,
            room_no: ticket.room_number ?? 'NA',
          },
        });
      }
      // Post-completion CSAT (best-effort, never blocks). FEEDBACK_CHANNEL selects the
      // prompt: 'buttons' → the Good/Bad quick-reply template (the manager's flow, now
      // LIVE — template + cf_feedback_sentiment field in place); set FEEDBACK_CHANNEL=link
      // to fall back to the legacy 1-5 star link.
      if (unfulfilled) {
        await this.flowLog.log({
          trace_id: ticketId,
          ticket_id: ticketId,
          brand,
          module: 'FEEDBACK',
          output: `${UNFULFILLED_CLASS} — soft close sent, no CSAT invite (nothing was delivered to rate)`,
          status: 'SKIP',
        });
      } else if ((process.env.FEEDBACK_CHANNEL ?? 'buttons') === 'buttons') {
        await this.feedback.issueButtonInvite(updated, brand, guest, ticket.guest_phone);
      } else {
        await this.feedback.issueInvite(updated, brand, guest, ticket.guest_phone);
      }
    }
    this.logger.log(`Ticket ${ticketId} completed`);
    await this.flowLog.log({
      trace_id: ticketId,
      ticket_id: ticketId,
      module: 'COMPLETE',
      output: 'COMPLETED — timers stopped, guest notified',
    });
    return updated;
  }

  /**
   * The T-1 closing message. Fixed copy, sent as a free-text session message, so it needs
   * no WATI template approval and lands the moment the ticket is closed — including when
   * that close came from an agent inside Zoho Desk.
   *
   * The session channel only works inside WhatsApp's 24-hour window, which is open in the
   * normal case (the guest messaged us to raise this) but can have shut on a T-1 left open
   * overnight. `GUEST_DONE_SOFT` is the backstop for exactly that, and it is the only
   * reason a template is still involved — if it isn't registered on the tenant this send
   * simply fails and is logged, it never blocks the close.
   */
  private async closeUnfulfilledToGuest(
    ticketId: string,
    brand: string,
    guestPhone: string | undefined,
    guestId: string,
    subject: string | null,
  ): Promise<void> {
    const message = guestUnfulfilledDone(brand);
    const sent = guestPhone
      ? await this.wati.sendSessionMessage(brand, guestPhone, message)
      : { ok: false, skipped: true };

    if (!sent.ok) {
      // Window shut, or WATI rejected it. Fall back to the approved template so the guest
      // still hears that we're done, rather than the thread just going quiet.
      await this.sqs.sendNotifyGuest({
        guest_id: guestId,
        guest_phone: guestPhone,
        brand,
        template: resolveTemplate(brand, 'GUEST_DONE_SOFT'),
        variables: { guest_name: 'there', request: subject ?? 'your request' },
      });
    }
    await this.flowLog.log({
      trace_id: ticketId,
      ticket_id: ticketId,
      brand,
      module: 'NOTIFY_GUEST',
      output: sent.ok
        ? `${UNFULFILLED_CLASS} close → ${guestPhone} (session message, nothing promised)`
        : `${UNFULFILLED_CLASS} close → session send unavailable, queued ${resolveTemplate(brand, 'GUEST_DONE_SOFT')} instead`,
      status: sent.ok ? undefined : 'SKIP',
    });
  }

  // ─── ESCALATION ENGINE (driven by SlaWatchdogService) ───────────────────────

  /**
   * Tickets due for an escalation step now. Covers BOTH phases:
   *   PENDING/OPEN  → ack phase (assignee hasn't acknowledged)
   *   IN_PROGRESS   → completion phase (acknowledged but not completed)
   */
  async findDueTickets(limit = 50) {
    return this.prisma.zoho_ticket_ref.findMany({
      where: {
        status: { in: ['OPEN', 'PENDING', 'IN_PROGRESS'] },
        next_deadline: { not: null, lte: new Date() },
      },
      orderBy: { next_deadline: 'asc' },
      take: limit,
    });
  }

  /**
   * Advance one ticket by one escalation step. Works in BOTH phases (the phase is
   * derived from status): PENDING/OPEN = ack phase, IN_PROGRESS = completion phase.
   * escalation_level semantics within a phase:
   *   0 → nudge the assigned staff, then arm level 1
   *   k → page ladder level k (escalation_levels), arm k+1 — until k > maxLevel → stop
   * Steps are spaced escalation_gap_min apart (gap-based, not fixed windows), and
   * the ladder is walked dynamically up to however many escalation_levels exist (Ln).
   */
  async advanceEscalation(ticketId: string) {
    const ticket = await this.prisma.zoho_ticket_ref.findUnique({ where: { id: ticketId } });
    if (!ticket || ticket.next_deadline === null) return; // completed in the meantime
    const phase =
      ticket.status === 'IN_PROGRESS'
        ? 'Completion'
        : ticket.status === 'PENDING' || ticket.status === 'OPEN'
          ? 'Ack'
          : null;
    if (!phase) return; // COMPLETED / closed

    const sla = ticket.task_category
      ? await this.prisma.sla_config.findUnique({ where: { task_category: ticket.task_category } })
      : null;
    const gapMin = sla ? sla.escalation_gap_min : null;
    // The paged person's ack/snooze window before the ladder climbs again is
    // snooze_percent% of the base gap (default 100% = the full gap).
    const snoozePct = sla ? sla.snooze_percent : 100;
    const snoozeMin =
      gapMin !== null && gapMin > 0 ? (gapMin * snoozePct) / 100 : null;
    const propertyId = await this.propertyIdFor(ticket.ezee_reservation_id);
    const brand = await this.brandFor(ticket.ezee_reservation_id);
    const maxLevel = await this.maxEscalationLevel(propertyId);
    const n = ticket.escalation_level;
    let newLevel = n + 1;
    let paged = 'no targets';

    // Context for the staff templates: who originally owned it + how long the paged
    // person has to ack before the ladder climbs again (the snooze window).
    const originalAssignee = ticket.assigned_staff_id
      ? (await this.prisma.staff.findUnique({ where: { id: ticket.assigned_staff_id }, select: { name: true } }))?.name ?? 'Unassigned'
      : 'Unassigned';
    const timeToNext = snoozeMin && snoozeMin > 0 ? this.fmtDuration(snoozeMin) : 'shortly';
    // Short property label (e.g. "TDS Koramangala") so a paged director covering several
    // sites can tell which property — and whom to call — the request belongs to. Shown
    // next to the room number in the staff templates (no template change needed).
    const propertyLabel = propertyShortLabel(propertyId, brand);
    // Group booking → page every room the guest holds, not just this ticket's room.
    const roomsLabel = await this.allRoomsLabel(ticket.ezee_reservation_id, propertyId);
    const staffCtx = { timeToNext, originalAssignee, propertyLabel, roomsLabel };

    if (n === 0 && ticket.assigned_staff_id) {
      // Assigned but unacked (ack phase), or acked-but-not-done (completion phase):
      // nudge the assignee first, then climb the ladder from ONE LEVEL ABOVE the
      // assignee's own rung (so we never page peers/juniors below them, or re-page
      // the assignee). If their role isn't in the ladder, climb from L1.
      const staff = await this.prisma.staff.findUnique({ where: { id: ticket.assigned_staff_id } });
      if (staff) {
        await this.notifyStaff(staff.phone, staff.name, brand, 'Reminder', ticket, staffCtx);
        newLevel = await this.assigneeLadderStart(propertyId, staff.role);
        paged =
          newLevel > maxLevel
            ? `reminder → assignee ${staff.name} (top of ladder — no one above)`
            : `reminder → assignee ${staff.name}; next escalates to L${newLevel}`;
      }
    } else {
      // A ladder level (n >= 1), OR an OPEN/unassigned ticket at level 0 (no one to
      // nudge) → page the first ladder level (L1) straight away, no wasted cycle.
      const level = n === 0 ? 1 : n;
      const targets = await this.escalationTargets(propertyId, level, brand);
      for (const t of targets) {
        await this.notifyStaff(t.phone, t.name, t.brand, `L${level}`, ticket, staffCtx);
      }
      paged = `L${level} → ${targets.length ? targets.map((t) => t.name).join(', ') : 'no one configured'}`;
      if (n === 0) newLevel = 2; // paged L1 in the level-0 slot → next step is L2
    }

    // Arm the next step only if a further ladder level exists. The interval is the
    // snooze window = snooze_percent% of the base gap (the paged person's window to
    // acknowledge before the ladder climbs again).
    const nextDeadline =
      snoozeMin !== null && snoozeMin > 0 && newLevel <= maxLevel
        ? new Date(Date.now() + snoozeMin * 60_000)
        : null; // top level paged (or no ladder/gap) → stop

    await this.prisma.zoho_ticket_ref.update({
      where: { id: ticketId },
      data: {
        escalation_level: newLevel,
        is_escalated: n >= 1 ? true : ticket.is_escalated,
        next_deadline: nextDeadline,
      },
    });

    // Mirror to Zoho. A level-0 *nudge* to the assignee is only a reminder → just a
    // comment. A real ladder step (OPEN@0 or n>=1) bumps the escalated custom fields
    // and moves "Handled By" to whoever we just paged.
    const isLadderStep = !(n === 0 && ticket.assigned_staff_id);
    if (isLadderStep) {
      const pagedLevel = n === 0 ? 1 : n;
      await this.zohoDesk
        .updateTicket(ticket.zoho_ticket_id, {
          customFields: {
            cf_is_escalated: 'true',
            cf_current_escalation_level: `L${pagedLevel}`, // picklist NA/L0..L4 (was wrongly cf_escalation_level)
            cf_handled_by: paged.replace(/^L\d+ → /, ''),
          },
        })
        .catch(() => undefined);
    }
    await this.zohoDesk
      .addComment(
        ticket.zoho_ticket_id,
        `${phase}-phase ${isLadderStep ? 'escalation' : 'reminder'}: ${paged}.` +
          (nextDeadline ? ` Next step in ${gapMin} min.` : ' (top of ladder).'),
      )
      .catch(() => undefined);
    const firedIst = toIstString(new Date());
    this.logger.log(
      `Ticket ${ticketId} ${phase}-phase escalation fired at level ${n} → ${newLevel} [${firedIst}]` +
        (nextDeadline ? `, next at ${nextDeadline.toISOString()}` : ' (ladder complete)'),
    );
    await this.flowLog.log({
      trace_id: ticketId,
      ticket_id: ticketId,
      brand,
      module: 'ESCALATION',
      input: `${phase} phase, level ${n}`,
      output: `[${firedIst}] ${paged}${nextDeadline ? `; next in ${timeToNext} (${snoozePct}% of ${gapMin}m gap)` : ' (ladder complete)'}`,
    });
  }

  /** Compact human duration for a fractional-minutes value ("2 min" / "45 sec"). */
  private fmtDuration(minutes: number): string {
    if (minutes >= 1) return `${Math.round(minutes)} min`;
    return `${Math.max(1, Math.round(minutes * 60))} sec`;
  }

  /**
   * Zoho → our-system reverse sync (polled). For each still-open ticket that has a
   * real Zoho mirror, read Zoho's status and reflect a staff change made INSIDE Zoho:
   *   "In Progress"          → acknowledge()  (hold escalation, arm completion timer)
   *   "Closed" | "Resolved"  → complete()     (stop timers, notify guest)
   * Loop-safe: acknowledge()/complete() no-op once we're already IN_PROGRESS/COMPLETED,
   * and our own outbound status PATCH just reads back as the same state (no action).
   */
  async syncOpenTicketsFromZoho(limit = 50): Promise<{ checked: number; changed: number }> {
    const open = await this.prisma.zoho_ticket_ref.findMany({
      where: {
        ticket_type: 'SERVICE_REQUEST',
        status: { in: ['OPEN', 'PENDING', 'IN_PROGRESS'] },
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      select: { id: true, status: true, zoho_ticket_id: true },
    });
    let checked = 0;
    let changed = 0;
    for (const t of open) {
      if (!t.zoho_ticket_id || !/^\d+$/.test(t.zoho_ticket_id)) continue; // no real Zoho mirror yet
      const zStatus = await this.zohoDesk.getTicketStatus(t.zoho_ticket_id);
      if (!zStatus) continue;
      checked++;
      const s = zStatus.trim().toLowerCase();
      let action: string | null = null;
      if (s === 'in progress' && (t.status === 'PENDING' || t.status === 'OPEN')) {
        await this.acknowledge(t.id);
        action = 'acknowledged (Zoho In Progress)';
      } else if ((s === 'closed' || s === 'resolved') && t.status !== 'COMPLETED') {
        await this.complete(t.id);
        action = `completed (Zoho ${zStatus})`;
      }
      if (action) {
        changed++;
        await this.flowLog.log({
          trace_id: t.id,
          ticket_id: t.id,
          module: 'ZOHO_SYNC',
          input: `zoho status=${zStatus}`,
          output: `→ ${action}`,
        });
      }
    }
    return { checked, changed };
  }

  /**
   * Where escalation starts climbing when the assignee fails to respond. If the
   * assignee's own ROLE is a rung in the ladder, we skip PAST it (start one level
   * above their own position). Otherwise we climb from L1. This prevents paging
   * peers/juniors below the assignee, and re-paging the assignee themselves.
   * Example: ladder B(L1)→A(L2)→C(L3), assignee = A → escalation starts at L3 (C).
   */
  private async assigneeLadderStart(propertyId: string, assigneeRole: string | null): Promise<number> {
    if (!assigneeRole) return 1;
    const rung = await this.prisma.escalation_levels.findFirst({
      where: { property_id: propertyId, is_active: true, lookup_source: 'staff', role: assigneeRole },
      orderBy: { level: 'desc' }, // if the role appears at multiple rungs, skip past the highest
      select: { level: true },
    });
    return rung ? rung.level + 1 : 1;
  }

  /**
   * When no one on a request's own role is available, hand it to the FIRST
   * escalation rung (L1) as a normal assignee — but only if that rung is backed by
   * the staff table (an admin_users L1 can't be a direct assignee / hold a ticket
   * count). Returns the least-loaded ACTIVE L1 staff, or null. Availability is NOT
   * required: L1 is the safety net and is paged regardless of the availability flag
   * (mirrors escalationTargets, which filters only on is_active).
   */
  private async firstLevelStaffFallback(propertyId: string, requestRole: string) {
    const l1 = await this.prisma.escalation_levels.findUnique({
      where: { property_id_level: { property_id: propertyId, level: 1 } },
    });
    if (!l1 || !l1.is_active || l1.lookup_source !== 'staff') return null;
    if (l1.role === requestRole) return null; // same role already had no one available
    return this.prisma.staff.findFirst({
      where: { property_id: propertyId, role: l1.role, is_active: true },
      orderBy: [{ active_ticket_count: 'asc' }, { created_at: 'asc' }],
    });
  }

  /**
   * The L1 (Reception) staffer who OWNS a broadcast/critical ticket — least-loaded active
   * L1-role staff. Unlike firstLevelStaffFallback this has no "same role" guard (a critical
   * ticket is owned at L1 regardless of which team the request nominally belongs to) and is
   * used for T3 so the ticket is never orphaned. Returns null when L1 is admin_users-backed
   * (can't hold a ticket) or has no active staff — the ticket then stays OPEN but is still
   * broadcast to everyone.
   */
  private async criticalL1Staff(propertyId: string) {
    const l1 = await this.prisma.escalation_levels.findUnique({
      where: { property_id_level: { property_id: propertyId, level: 1 } },
    });
    if (!l1 || !l1.is_active || l1.lookup_source !== 'staff') return null;
    return this.prisma.staff.findFirst({
      where: { property_id: propertyId, role: l1.role, is_active: true },
      orderBy: [{ active_ticket_count: 'asc' }, { created_at: 'asc' }],
    });
  }

  /** Highest active escalation ladder level configured for a property (dynamic Ln). */
  private async maxEscalationLevel(propertyId: string): Promise<number> {
    const top = await this.prisma.escalation_levels.findFirst({
      where: { property_id: propertyId, is_active: true },
      orderBy: { level: 'desc' },
      select: { level: true },
    });
    return top?.level ?? 0;
  }

  /** T4 critical: notify every configured escalation level at once, no waiting. */
  private async broadcastAllLevels(ticketId: string) {
    const ticket = await this.prisma.zoho_ticket_ref.findUnique({ where: { id: ticketId } });
    if (!ticket) return;
    const propertyId = await this.propertyIdFor(ticket.ezee_reservation_id);
    const brand = await this.brandFor(ticket.ezee_reservation_id);
    const levels = await this.prisma.escalation_levels.findMany({
      where: { property_id: propertyId, is_active: true },
    });
    // The assignee (L1 owner) already received the full staff ticket template — with the
    // "Mark Complete" button so they can resolve it from WhatsApp — at creation. Don't
    // re-page them here with the (Acknowledge-only) escalation template; everyone ELSE gets
    // the broadcast alert. Match by phone since escalationTargets returns no staff id.
    const owner = ticket.assigned_staff_id
      ? await this.prisma.staff.findUnique({
          where: { id: ticket.assigned_staff_id },
          select: { name: true, phone: true },
        })
      : null;
    const originalAssignee = owner?.name ?? 'Unassigned';
    const ownerPhone = owner?.phone ?? null;
    const propertyLabel = propertyShortLabel(propertyId, brand);
    const roomsLabel = await this.allRoomsLabel(ticket.ezee_reservation_id, propertyId);
    const staffCtx = { timeToNext: 'now (critical)', originalAssignee, propertyLabel, roomsLabel };
    const paged = new Set<string>();
    if (ownerPhone) paged.add(ownerPhone);
    for (const lvl of levels) {
      const targets = await this.escalationTargets(propertyId, lvl.level, brand);
      for (const t of targets) {
        if (paged.has(t.phone)) continue; // owner already got the resolvable ticket, or dedupe across rungs
        paged.add(t.phone);
        await this.notifyStaff(t.phone, t.name, t.brand, 'CRITICAL', ticket, staffCtx);
      }
    }
    // Park the ticket at the TOP of this property's ladder — everyone has already been
    // paged, so there is nowhere further to climb. This used to be a hard-coded 4, which
    // was both wrong for a property with a shorter ladder and now dangerously readable as
    // the class name "T4".
    await this.prisma.zoho_ticket_ref.update({
      where: { id: ticketId },
      data: {
        is_escalated: true,
        escalation_level: await this.maxEscalationLevel(propertyId),
        next_deadline: null,
      },
    });
  }

  // ─── helpers ────────────────────────────────────────────────────────────────

  /**
   * Public accessor for the staff/admins configured at a given escalation rung —
   * used by the prospect front door to notify the BOTTOM of the ladder (level 1)
   * about an unanswered enquiry WITHOUT creating a ticket. Thin pass-through to the
   * private escalationTargets so ladder-resolution logic lives in one place.
   */
  async ladderTargets(
    propertyId: string,
    level: number,
    brand: string,
  ): Promise<{ name: string; phone: string; brand: string }[]> {
    return this.escalationTargets(propertyId, level, brand);
  }

  private async escalationTargets(
    propertyId: string,
    level: number,
    brand: string,
  ): Promise<{ name: string; phone: string; brand: string }[]> {
    const cfg = await this.prisma.escalation_levels.findUnique({
      where: { property_id_level: { property_id: propertyId, level } },
    });
    if (!cfg || !cfg.is_active) return [];

    if (cfg.lookup_source === 'admin_users') {
      const admins = await this.prisma.admin_users.findMany({
        where: {
          admin_roles: { name: cfg.role },
          admin_user_properties: { some: { property_id: propertyId } },
          phone: { not: null },
        },
        select: { name: true, phone: true },
      });
      return admins
        .filter((a) => a.phone)
        .map((a) => ({ name: a.name, phone: a.phone as string, brand }));
    }

    // default: staff table
    const staff = await this.prisma.staff.findMany({
      where: { property_id: propertyId, role: cfg.role, is_active: true },
      select: { name: true, phone: true },
    });
    return staff.map((s) => ({ name: s.name, phone: s.phone, brand }));
  }

  /**
   * Staff nudge/escalation send. Two templates:
   *   - 'Reminder'  (to the CURRENT assignee) → staff_reminder_complete_v1, a
   *     "Mark Complete" button — "you still own this, please finish it".
   *   - 'L1'/'L2'/… /'CRITICAL' (to the NEXT person up the ladder) →
   *     escalation_template_v4, an "Acknowledge" button + who it was originally
   *     assigned to + how long they have before it climbs again.
   */
  /**
   * For a GROUP booking (one booker holding several rooms, each its own eZee reservation
   * row sharing the same booker_phone), list ALL the room numbers so a staff member sees
   * every room the guest occupies — not just the single room the ticket was raised against
   * (a group booker asking for a towel could mean any of their rooms). Returns e.g.
   * "105, 106, 107", or `null` when the booker holds a single room, in which case the
   * caller keeps the ticket's own room_number. Staff-facing only — the guest ack/done
   * message still shows the ticket's own room. Best-effort; any error → null.
   */
  private async allRoomsLabel(eri: string | null, propertyId: string | null): Promise<string | null> {
    if (!eri || !propertyId) return null;
    try {
      const rows = await this.prisma.$queryRaw<{ room_number: string | null }[]>`
        SELECT DISTINCT b.room_number
        FROM ezee_booking_cache b
        WHERE b.property_id = ${propertyId}
          AND b.is_active = true
          AND b.status = 'CHECKED_IN'
          AND b.room_number IS NOT NULL
          AND length(right(regexp_replace(coalesce(b.booker_phone, ''), '[^0-9]', '', 'g'), 10)) = 10
          AND right(regexp_replace(coalesce(b.booker_phone, ''), '[^0-9]', '', 'g'), 10) = (
            SELECT right(regexp_replace(coalesce(bx.booker_phone, ''), '[^0-9]', '', 'g'), 10)
            FROM ezee_booking_cache bx
            WHERE bx.ezee_reservation_id = ${eri}
            LIMIT 1
          )
      `;
      const rooms = rows.map((r) => r.room_number).filter((r): r is string => !!r);
      if (rooms.length <= 1) return null; // single room → caller keeps ticket.room_number
      rooms.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      return rooms.join(', ');
    } catch {
      return null;
    }
  }

  private async notifyStaff(
    phone: string,
    name: string,
    brand: string,
    levelLabel: string, // 'Reminder' | 'L1' | 'L2' | 'L3' | 'CRITICAL'
    ticket: {
      id: string;
      subject: string | null;
      room_number: string | null;
      guest_phone: string | null;
      department: string;
      guest_id: string | null;
      created_at: Date;
    },
    ctx: { timeToNext: string; originalAssignee: string; propertyLabel: string; roomsLabel?: string | null },
  ) {
    const guestName = ticket.guest_id ? (await this.guestInfo(ticket.guest_id)).name : 'Guest';
    const isReminder = levelLabel === 'Reminder';
    // Room number with the property appended so the recipient (esp. a director paged
    // across properties) knows the site — e.g. "101A (TDS Koramangala)". For a group
    // booking, ctx.roomsLabel lists ALL the guest's rooms ("105, 106, 107"); otherwise
    // we show the ticket's single room. Falls back to just the property label when unknown.
    const roomBase = ctx.roomsLabel ?? ticket.room_number;
    const roomNo = roomBase ? `${roomBase} (${ctx.propertyLabel})` : ctx.propertyLabel;

    if (isReminder) {
      await this.sqs.sendNotifyStaff({
        staff_phone: phone,
        staff_name: name,
        brand,
        template: resolveTemplate(brand, 'STAFF_REMINDER'),
        variables: {
          // Param names MUST match the WATI template's customParams exactly.
          system: brand,
          text: ticket.subject ?? 'Service request',
          roomNo,
          userName: guestName,
          phone: ticket.guest_phone ?? 'NA',
          time_to_next: ctx.timeToNext,
          '1': ticket.id, // dynamic URL-button param (jobId) — "Mark Complete"
        },
      });
      return;
    }

    await this.sqs.sendNotifyStaff({
      staff_phone: phone,
      staff_name: name,
      brand,
      template: resolveTemplate(brand, 'STAFF_ESCALATION'),
      variables: {
        // Param names MUST match escalation_template_v4's customParams exactly.
        severity: levelLabel === 'CRITICAL' ? 'CRITICAL' : 'Escalation',
        system: brand,
        text: ticket.subject ?? 'Service request',
        roomNo,
        userName: guestName,
        phone: ticket.guest_phone ?? 'NA',
        level: levelLabel,
        original_assignee: ctx.originalAssignee,
        // When the ticket was originally raised (IST) — lets the escalated person
        // gauge how long the guest has actually been waiting. (escalation_template_v5)
        created_at: toIstString(ticket.created_at) ?? 'NA',
        time_to_next: ctx.timeToNext,
        '1': ticket.id, // dynamic URL-button param (jobId) — "Acknowledge"
      },
    });
  }

  private async guestInfo(guestId: string): Promise<{ name: string; phone: string | null }> {
    const g = await this.prisma.guests.findUnique({
      where: { id: guestId },
      select: { name: true, phone: true },
    });
    return { name: g?.name ?? 'Guest', phone: g?.phone ?? null };
  }

  private async propertyIdFor(eri: string | null): Promise<string> {
    if (!eri) return '';
    const b = await this.prisma.ezee_booking_cache.findUnique({
      where: { ezee_reservation_id: eri },
      select: { property_id: true },
    });
    return b?.property_id ?? '';
  }

  private async brandFor(eri: string | null): Promise<string> {
    if (!eri) return 'TDS';
    const b = await this.prisma.ezee_booking_cache.findUnique({
      where: { ezee_reservation_id: eri },
      select: { properties: { select: { brand: true } } },
    });
    return b?.properties?.brand ?? 'TDS';
  }

  /**
   * Was this request raised by a test booking? Resolved from the ERI here rather than passed in,
   * so every caller (WhatsApp front door, payment capture, PWA store) inherits the flag without
   * knowing test bookings exist.
   *
   * This does NOT change how the ticket is handled — routing, SLA and escalation are identical to
   * a real request by design. It only labels the ticket, so Zoho can filter it (cf_is_test) and
   * reporting can leave it out. An unknown/absent ERI is treated as real.
   */
  private async isTestFor(eri: string | null): Promise<boolean> {
    if (!eri) return false;
    const b = await this.prisma.ezee_booking_cache.findUnique({
      where: { ezee_reservation_id: eri },
      select: { is_test: true },
    });
    return b?.is_test ?? false;
  }
}
