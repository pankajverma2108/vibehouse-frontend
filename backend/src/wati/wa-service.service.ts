import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import {
  LlmService,
  type ClassifierCatalogItem,
  type GuestMessageClassification,
} from '../llm/llm.service';
import { WatiService, GUEST_RECEPTION_ACK, GUEST_UNFULFILLED_ACK } from './wati.service';
import { resolveTemplate } from './wati-templates';
import { TicketsService } from '../tickets/tickets.service';
import { DEFAULT_CLASS, UNFULFILLED_CLASS, type TaskClass } from '../tickets/task-classes';
import { PaymentService } from '../payment/payment.service';
import { FeedbackService, type PendingFeedback } from '../feedback/feedback.service';
import { ProspectService } from './prospect.service';
import { RoomSelectionService } from './room-selection.service';
import { BreakfastService } from '../breakfast/breakfast.service';
import { BreakfastInviteService } from '../breakfast/breakfast-invite.service';
import type { WatiInboundMessage } from './wati-inbound.types';
import { phoneLast10 } from '../common/utils/phone.util';
import { brandDisplayName, brandBookingUrl, propertyShortLabel } from '../common/property-resolver';
import { FlowLogService } from '../flow-log/flow-log.service';
import { toIstString } from '../common/utils/time.util';

/** One piece of a message the splitter broke up, with its own classification. */
interface SplitSegment {
  text: string;
  cls: GuestMessageClassification;
}

/**
 * WaServiceService — the heist1.1 WhatsApp service-request front door (Miro "Live"
 * frame). Orchestrates: identity resolution → LLM classify → catalog match →
 * free/paid/anonymous branch → handoff to the v1 ticket engine
 * (TicketsService.createServiceRequest). Paid items are paid over WhatsApp via a
 * Razorpay Payment Link (PaymentService.createWhatsappServiceLink); the ticket for
 * a paid item is created only after capture (in PaymentService) — no ticket before
 * payment.
 *
 * Out of scope (heist1.2): staff text commands, the non-checked-in prospect path,
 * and Good/Bad feedback capture.
 */
@Injectable()
export class WaServiceService {
  private readonly logger = new Logger(WaServiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
    private readonly wati: WatiService,
    private readonly tickets: TicketsService,
    private readonly payments: PaymentService,
    private readonly feedback: FeedbackService,
    private readonly flowLog: FlowLogService,
    private readonly prospect: ProspectService,
    private readonly roomSel: RoomSelectionService,
    private readonly breakfast: BreakfastService,
    private readonly breakfastInvite: BreakfastInviteService,
  ) {}

  async handleInbound(brand: string, msg: WatiInboundMessage) {
    // trace_id groups this whole request; reused as the wa_service_request id below so
    // the flow log ties cleanly to the record and, later, the ticket.
    const traceId = uuidv4();
    await this.flowLog.log({
      trace_id: traceId,
      brand,
      module: 'WA_INBOUND',
      input: msg.text,
      output: `from=${msg.waId} msgId=${msg.messageId ?? '-'}`,
    });

    // 1. Idempotency — WATI retries the same message id.
    if (msg.messageId) {
      const seen = await this.prisma.wa_service_request.findUnique({
        where: { wati_message_id: msg.messageId },
      });
      if (seen) {
        await this.flowLog.log({ trace_id: traceId, brand, module: 'WA_INBOUND', output: 'deduped (retry)', status: 'SKIP' });
        return { deduped: true, request_id: seen.id };
      }
    }

    // 1b. Staff number (heist1.2). A number that belongs to an ACTIVE staff member of
    // this brand can ONLY clock in/out here — it never enters the guest/prospect flow.
    // Checked BEFORE guest identity so a staff phone that's also seeded as a test guest
    // still clocks in/out. `resolveStaff` matches active staff only: a deactivated
    // ("deleted") staffer no longer resolves here and falls through to normal guest /
    // prospect handling, so their number can be reused as a customer.
    const staff = await this.resolveStaff(brand, msg.waId);
    if (staff) {
      const staffCmd = this.parseStaffCommand(msg.text);
      if (staffCmd) {
        return this.handleStaffCommand(traceId, brand, msg, staff, staffCmd);
      }
      // Any other message from a staff number is not a guest request — staff use this
      // line purely to go on/off shift. Reply with a fixed guardrail, don't classify.
      return this.handleStaffNonCommand(traceId, brand, msg, staff);
    }

    // 2. Identity: is this number a checked-in guest with an active booking?
    const ctx = await this.flowLog.timed(
      { trace_id: traceId, brand, module: 'IDENTITY', input: msg.waId },
      () => this.resolveCheckedInGuest(brand, msg.waId),
      (c) => (c ? `checked-in: Yes (room ${c.roomNumber ?? '-'}, eri ${c.eri}, guest ${c.guestId.slice(0, 8)})` : 'checked-in: No'),
    );
    if (!ctx) {
      // Non-checked-in (prospect) path: resolve which property the prospect means
      // (multi-property brands need a selector tap) then handle greeting / booking /
      // question (chatbot → answer, else reception + L1 page). LIVE by default now
      // that both parts are built and verified; set PROSPECT_PATH_ENABLED=false in the
      // ECS env to fall back to the graceful stub.
      if ((process.env.PROSPECT_PATH_ENABLED ?? 'true') === 'true') {
        return this.handleProspect(traceId, brand, msg);
      }
      // Legacy stub: a graceful reply when the prospect path is explicitly disabled.
      await this.replyAndLog(
        traceId,
        brand,
        msg.waId,
        'Hi! To raise an in-stay service request here, please message from the number on your booking after check-in. For anything else, our reception team is happy to help.',
        'not_checked_in',
      );
      await this.recordDropped(traceId, brand, msg, 'not_checked_in');
      return { checked_in: false };
    }

    // 2a. Group-booking room disambiguation — CONSUME a pending "which room?" prompt.
    // If we previously asked this guest which of their rooms a request is for, interpret THIS
    // reply in that context before anything else: a bare "103" only means "room 103" while that
    // question is open (with no open prompt it's just an ambiguous number, handled normally
    // below). Flag-gated (WA_ROOM_DISAMBIGUATION_ENABLED) for instant rollback.
    if ((process.env.WA_ROOM_DISAMBIGUATION_ENABLED ?? 'true') === 'true') {
      const pick = await this.roomSel.consume(brand, msg.waId, msg.text);
      if (pick.state === 'selected') {
        await this.flowLog.log({
          trace_id: traceId,
          brand,
          module: 'ROOM_SELECT',
          input: msg.text,
          output: `room ${pick.room} → resuming "${pick.pendingText.slice(0, 60)}"`,
        });
        // Resume the stashed request against the chosen room.
        return this.handleResolvedGuestText(traceId, brand, msg, ctx, pick.pendingText, pick.room);
      }
      if (pick.state === 're_prompt') {
        await this.replyAndLog(
          traceId,
          brand,
          msg.waId,
          `Sorry, ${pick.typed ? `room *${pick.typed}*` : 'that'} isn’t one of your rooms. ` +
            `Please reply with one of: *${pick.rooms.join(', ')}*.`,
          'room_select:reprompt',
        );
        await this.flowLog.log({
          trace_id: traceId,
          brand,
          module: 'ROOM_SELECT',
          input: msg.text,
          output: `not one of ${pick.rooms.join(', ')} → re-prompted`,
          status: 'SKIP',
        });
        return { awaiting_room: true, reprompt: true };
      }
      if (pick.state === 'pick_one') {
        // They answered with several of their rooms ("306, 406"). One ticket carries one room, so
        // don't guess — picking the first would silently drop the rest.
        await this.replyAndLog(
          traceId,
          brand,
          msg.waId,
          `Please pick just *one* room for this request — reply with *${pick.rooms.join('* or *')}*. ` +
            `(Need something in more than one room? Send a separate request for each.)`,
          'room_select:pick_one',
        );
        await this.flowLog.log({
          trace_id: traceId,
          brand,
          module: 'ROOM_SELECT',
          input: msg.text,
          output: `named several rooms (${pick.rooms.join(', ')}) → asked to pick one`,
          status: 'SKIP',
        });
        return { awaiting_room: true, pick_one: true };
      }
      // 'topic_change' (stash dropped) or 'none' → fall through and handle THIS message normally.
    }

    return this.handleResolvedGuestText(traceId, brand, msg, ctx, msg.text);
  }

  /**
   * Handle a resolved (checked-in) guest's message end-to-end: feedback capture, multi-request
   * split, classification, and routing to the right ticket/reply.
   *
   * Shared by two callers: the normal inbound path (`text` = the guest's message) and the
   * room-disambiguation RESUME path (`text` = the request we stashed while asking which room,
   * `forcedRoom` = the room they picked). When `forcedRoom` is set the context is narrowed to that
   * one room and the "which room?" ask-gate is skipped — so a group booking is asked exactly once
   * and the pick applies to every sub-ticket, including each ask of a split multi-request.
   */
  private async handleResolvedGuestText(
    traceId: string,
    brand: string,
    msg: WatiInboundMessage,
    ctx: {
      guestId: string;
      eri: string;
      propertyId: string;
      brand: string;
      roomNumber: string | null;
      roomNumbers: string[];
      unitCode: string | null;
    },
    text: string,
    forcedRoom?: string,
  ) {
    // On the resume path, pin the context to the single room the guest chose.
    if (forcedRoom) {
      ctx = { ...ctx, roomNumber: forcedRoom, roomNumbers: [forcedRoom] };
    }

    // 2b. Post-completion Good/Bad feedback (checked BEFORE we classify/ticket).
    // If this guest has a pending feedback and taps a Good/Bad button (or types exactly
    // "good"/"bad"), they're rating a just-completed request — capture it and ask for a
    // short review; never run a rating through the service pipeline. If they ignore the
    // buttons and ask for something else, we leave the feedback pending and fall through.
    // Only active in buttons mode: the legacy link flow also leaves feedback rows with a
    // null sentiment, and we must not mistake a casual "good" for a button tap there.
    const feedbackButtons = (process.env.FEEDBACK_CHANNEL ?? 'buttons') === 'buttons';
    const pending = feedbackButtons ? await this.feedback.findPendingForGuest(ctx.guestId) : null;
    if (pending && pending.stage === 'rating') {
      const sentiment = FeedbackService.toSentiment(text);
      if (sentiment) {
        return this.handleFeedbackRating(traceId, brand, msg, ctx, pending, sentiment);
      }
    }

    // 2b-bis. A bare room number with NO question open ("306" out of the blue) tells us WHERE but
    // not WHAT. It isn't a request, and the generic "I couldn't understand" reads as a bug to a
    // guest who just typed their own room number — so name the room back and ask what they need.
    // A selection answering an open prompt never reaches here (the consume gate took it), and
    // "send a towel to 306" isn't bare, so it still flows to the normal ticket path.
    if (!forcedRoom) {
      const bareRoom = this.roomSel.isBareRoomMention(text, ctx.roomNumbers);
      if (bareRoom) {
        const guest = await this.prisma.guests.findUnique({
          where: { id: ctx.guestId },
          select: { name: true },
        });
        await this.replyAndLog(
          traceId,
          brand,
          msg.waId,
          `Hi *${guest?.name ?? 'there'}*, did you need something for room *${bareRoom}*? ` +
            `Just tell me what you'd like — e.g. “a towel” or “please clean my room”. 🙏`,
          'room_select:bare_room',
        );
        await this.flowLog.log({
          trace_id: traceId,
          brand,
          module: 'ROOM_SELECT',
          input: text,
          output: `bare room ${bareRoom} with no open request → nudged for the actual ask`,
          status: 'SKIP',
        });
        return { intent: 'bare_room', room: bareRoom };
      }
    }

    // 2c. Room disambiguation — ASK gate. A group-booking guest holds several rooms, so we can't
    // stamp all of them on a ticket. Before splitting/ticketing, if this is a NEW service request,
    // ask which room and stash the WHOLE message — deferring it here (not per sub-request) means a
    // multi-request ("a towel and a water bottle") asks ONCE and the pick applies to every ticket
    // on resume. Greetings / FAQ / status checks don't need a room, so we gate on intent using one
    // classify that is reused below as `cls`. Skipped on the resume path and for single-room guests.
    // The catalog is only loaded early for this probe; single-room guests keep the original order.
    const disambigEnabled = (process.env.WA_ROOM_DISAMBIGUATION_ENABLED ?? 'true') === 'true';
    const isMultiRoom = !forcedRoom && disambigEnabled && ctx.roomNumbers.length > 1;
    let catalog = isMultiRoom
      ? await this.flowLog.timed(
          { trace_id: traceId, brand, module: 'CATALOG', input: ctx.propertyId },
          () => this.loadCatalog(ctx.propertyId),
          (items) => `${items.length} catalog item(s)`,
        )
      : null;
    let probeCls: GuestMessageClassification | null = null;
    if (isMultiRoom && catalog) {
      probeCls = await this.flowLog.timed(
        { trace_id: traceId, brand, module: 'LLM_CLASSIFY', input: text },
        () => this.llm.classifyGuestMessage(text, catalog!),
        (c) => `message_type=${c.intent} → ${this.intentLabel(c.intent)}`,
      );
      if (probeCls.intent === 'request_new') {
        // Did the guest already name a room in the request itself ("send a towel to 102")?
        // If so we don't need to ask; if they named a room that isn't theirs, prompt to correct it.
        const hit = this.roomSel.findRoomInText(text, ctx.roomNumbers);
        if (hit.kind === 'match') {
          await this.flowLog.log({
            trace_id: traceId,
            brand,
            module: 'ROOM_SELECT',
            input: text,
            output: `room ${hit.room} named in request → no prompt needed`,
          });
          // Pin the context to the named room and fall through to the split/ticket path.
          ctx = { ...ctx, roomNumber: hit.room, roomNumbers: [hit.room] };
        } else if (
          hit.kind === 'ambiguous' &&
          !hit.wrongRoom &&
          hit.rooms.length > 1 &&
          this.looksMultiRequest(text)
        ) {
          // "Send a towel to 1 and a soap to 2" — they named SEVERAL of their own rooms in one
          // message. That isn't an ambiguity to resolve by asking; it's one ask PER room. Asking
          // here used to return early and swallow the split entirely, so the guest was prompted
          // for a room they had already given twice and only ONE ticket was ever raised. Fall
          // through to the split (2d) and let each sub-request pin its own room.
          await this.flowLog.log({
            trace_id: traceId,
            brand,
            module: 'ROOM_SELECT',
            input: text,
            output: `rooms ${hit.rooms.join(', ')} named across a multi-request → no prompt; splitting per room`,
          });
        } else if (hit.kind === 'invalid') {
          // Named a room that isn't part of the booking → stash the request and ask them to correct.
          await this.roomSel.askAndStash(
            brand,
            msg.waId,
            { eri: ctx.eri, guestId: ctx.guestId, propertyId: ctx.propertyId },
            text,
            ctx.roomNumbers,
          );
          await this.replyAndLog(
            traceId,
            brand,
            msg.waId,
            `Sorry, room *${hit.typed}* isn’t part of your booking. Please reply with one of: *${ctx.roomNumbers.join(', ')}*.`,
            'room_select:wrong_inline',
          );
          await this.flowLog.log({
            trace_id: traceId,
            brand,
            module: 'ROOM_SELECT',
            input: text,
            output: `room ${hit.typed} named but not in booking (${ctx.roomNumbers.join(', ')}) → prompted`,
            status: 'SKIP',
          });
          return { awaiting_room: true, reprompt: true };
        } else {
          // No single clear room named (none, or several of theirs) → ask which one.
          await this.roomSel.askAndStash(
            brand,
            msg.waId,
            { eri: ctx.eri, guestId: ctx.guestId, propertyId: ctx.propertyId },
            text,
            ctx.roomNumbers,
          );
          const guest = await this.prisma.guests.findUnique({
            where: { id: ctx.guestId },
            select: { name: true },
          });
          await this.replyAndLog(
            traceId,
            brand,
            msg.waId,
            `Hi *${guest?.name ?? 'there'}*, your booking covers ${ctx.roomNumbers.length} rooms — ` +
              `*${ctx.roomNumbers.join(', ')}*.\nWhich room is this request for? Just reply with the room number.`,
            'room_select:ask',
          );
          await this.flowLog.log({
            trace_id: traceId,
            brand,
            module: 'ROOM_SELECT',
            input: text,
            output: `asked which room (${ctx.roomNumbers.join(', ')})`,
          });
          return { awaiting_room: true };
        }
      }
    }

    // 2d. Multi-request split. One WhatsApp message can carry several distinct asks
    // ("a towel and a handwash", "wifi password and fix the AC"). When it does, raise a
    // SEPARATE ticket per ask — each classified on its own so each gets its own
    // department AND turn-around tier (TAT). A cheap joiner check gates the extra LLM
    // call to only plausibly-multi messages. We only SKIP the split while we're actively
    // capturing a written review (feedback stage 'comment'), so a review like "fast and
    // great" isn't torn into tickets — a pending Good/Bad *rating* (the normal state right
    // after any completed ticket) must NOT block a genuine new multi-request.
    const inReviewCapture =
      !!pending && pending.stage === 'comment' && this.feedback.commentWindowOpen(pending);
    if (!inReviewCapture && this.looksMultiRequest(text)) {
      const segments = await this.flowLog.timed(
        { trace_id: traceId, brand, module: 'LLM_SPLIT', input: text },
        () => this.llm.splitServiceRequests(text),
        (segs) => `${segs.length} distinct request(s)`,
      );
      if (segments.length > 1) {
        if (!catalog) {
          catalog = await this.flowLog.timed(
            { trace_id: traceId, brand, module: 'CATALOG', input: ctx.propertyId },
            () => this.loadCatalog(ctx.propertyId),
            (items) => `${items.length} catalog item(s)`,
          );
        }
        // Classify every piece BEFORE committing to the split. A joiner isn't proof of two
        // asks — "Hi / Good morning" and "Where is my towel / it's been an hour" both split
        // cleanly yet are ONE greeting and ONE status check. Ticketing each piece turned those
        // into junk tickets, so the split only wins when it yields 2+ genuinely actionable
        // asks; otherwise we hand the whole message back to the normal single-message pipeline,
        // which knows how to answer a greeting, a status check or an FAQ.
        const segs = await this.classifySegments(traceId, brand, segments, catalog, ctx.propertyId);
        const actionable = segs.filter((s) => WaServiceService.ACTIONABLE_INTENTS.has(s.cls.intent));
        if (actionable.length > 1) {
          return this.handleMultiRequest(traceId, brand, msg, ctx, segs);
        }
        await this.flowLog.log({
          trace_id: traceId,
          brand,
          module: 'LLM_SPLIT',
          input: text,
          output: `${segments.length} piece(s) but only ${actionable.length} actionable ask → handling the message as one`,
          status: 'SKIP',
        });
      }
    }

    // 3. Persist the request shell (id = traceId so the log ties to it). On the resume path
    //    `text` is the stashed request (not the bare room number the guest just sent), so the
    //    record and ticket reflect what they actually asked for.
    const reqId = traceId;
    await this.prisma.wa_service_request.create({
      data: {
        id: reqId,
        brand,
        wa_id: msg.waId,
        wati_message_id: msg.messageId,
        guest_id: ctx.guestId,
        ezee_reservation_id: ctx.eri,
        property_id: ctx.propertyId,
        raw_text: text,
        status: 'RECEIVED',
      },
    });

    // 4. Classify against the property catalog (reusing the disambiguation probe when we have it,
    //    and loading the catalog now if the multi-room probe above didn't already).
    if (!catalog) {
      catalog = await this.flowLog.timed(
        { trace_id: traceId, brand, module: 'CATALOG', input: ctx.propertyId },
        () => this.loadCatalog(ctx.propertyId),
        (items) => `${items.length} catalog item(s)`,
      );
    }
    // ONE LLM call returns both dimensions, but we log them as two rows to match how
    // ops reason about it: (1) LLM_CLASSIFY = what KIND of message is this, and
    // (2) LLM_ROUTE = who should handle it + how urgent. LLM_CLASSIFY carries the
    // real call latency; LLM_ROUTE is the same result, split out for readability.
    const proposed =
      probeCls ??
      (await this.flowLog.timed(
        { trace_id: traceId, brand, module: 'LLM_CLASSIFY', input: text },
        () => this.llm.classifyGuestMessage(text, catalog!),
        (c) => `message_type=${c.intent} → ${this.intentLabel(c.intent)}`,
      ));
    // The model proposes; the routing policy disposes. Applied BEFORE the LLM_ROUTE log
    // and the row update, so both record where the request actually went.
    const cls = await this.applyRoutingPolicy(traceId, brand, proposed, catalog!, text, ctx.propertyId);
    await this.flowLog.log({
      trace_id: traceId,
      brand,
      module: 'LLM_ROUTE',
      input: text,
      output: `department=${cls.department} · task_class=${cls.task_category}${cls.product_id ? ' · product=' + cls.product_id : ''}`,
      // routing only actually drives a ticket for request_new; otherwise it's informational.
      status: cls.intent === 'request_new' ? 'OK' : 'SKIP',
    });
    await this.prisma.wa_service_request.update({
      where: { id: reqId },
      data: {
        status: 'CLASSIFIED',
        intent: cls.intent,
        department: cls.department,
        task_category: cls.task_category,
      },
    });

    // 4b. Review capture after a Good/Bad tap. We JUST asked the guest to say more, so
    // their reply is normally the review remark (cf_feedback_remark) — and we APPEND, so
    // several lines ("was fast" then "actually okay") all land on the same feedback row.
    // Two things pull a reply OUT of feedback and back into the normal pipeline:
    //   • request_new — a genuinely new service ask ("send me a towel"): raise a ticket.
    //   • a request_update that means the work is STILL not done ("still waiting", "where
    //     is it") — a real status check, NOT a review. "It took forever" (a past-tense
    //     complaint) stays a review; classifyFeedbackFollowup draws that line.
    if (pending && pending.stage === 'comment' && this.feedback.commentWindowOpen(pending)) {
      // The FIRST classifier is the authority — a reply in the review window is captured as
      // the CSAT remark ONLY when it's a genuine REVIEW of the completed service. Everything
      // else FALLS THROUGH to its normal route below, so it is never swallowed by the
      // feedback loop: a new ask still raises a ticket, an FAQ still gets answered, a
      // breakfast intent still gets the ordering link, a greeting still gets greeted.
      //
      // This is an ALLOW-list, and that matters. It used to default to capture=true and
      // enumerate the intents that escape — so any intent MISSING from that list was filed as
      // the review, and a plain "Hi" (greeting_hello, never listed) became the CSAT remark.
      // The deny-list also silently swallowed every intent added after it was written
      // (greeting_acknowledge, booking_confirm, booking_deny). Opt-in instead: only a message
      // that can actually BE a review is taken, and any intent added later defaults to safe.
      let capture = false;
      if (cls.intent === 'feedback') {
        capture = true; // literally a review of the service
      } else if (cls.intent === 'request_update') {
        // "It took forever" (a past-tense verdict) is a review; "where is it" is a real status
        // check on work still outstanding. Only the former counts.
        capture = (await this.llm.classifyFeedbackFollowup(text)) === 'review';
      } else if (cls.intent === 'unclear') {
        // A terse-but-real review ("Slow") also lands as `unclear`; keep those, let
        // keyboard-mash fall through to the "please resend" prompt.
        capture = (await this.llm.classifyFeedbackRemark(text)) === 'meaningful';
      }

      if (capture) {
        const { first } = await this.feedback.recordRemark(pending.id, text);
        // Thank once (on the first line); silently append any further lines.
        if (first) {
          await this.replyAndLog(
            traceId,
            brand,
            msg.waId,
            'Thank you so much for the feedback — it really helps us improve! 🙏',
            'feedback_remark',
          );
        } else {
          await this.flowLog.log({
            trace_id: traceId,
            brand,
            module: 'GUEST_REPLY',
            input: 'feedback_remark:append',
            output: `appended review line → ${msg.waId} (no extra reply)`,
            status: 'SKIP',
          });
        }
        await this.finish(reqId, 'FEEDBACK');
        return { intent: 'feedback_remark', request_id: reqId, feedback_id: pending.id, appended: !first };
      }

      // Not a review → hand it to the normal pipeline. Close the review window only when the
      // guest has clearly MOVED ON to another routed interaction (a new ask, an FAQ, a status
      // check). Keep it open for gibberish (they may resend a real review right after the
      // clarify prompt) and for a bare greeting or "thanks" — a pleasantry is not moving on,
      // and closing on it would drop the review the guest is about to type.
      const stillOpen = ['unclear', 'greeting_hello', 'greeting_acknowledge'];
      if (!stillOpen.includes(cls.intent)) {
        await this.feedback.finalizeWithoutComment(pending.id);
      }
      // fall through (no return) → 5c ambiguous / 5c-bis unclear / request_new handlers below.
    }

    // 5. Route by intent. Only `request_new` (+ catalog) falls through to the ticket
    //    pipeline below. The other intents are handled here.

    // 5a. Greeting → personalised welcome.
    if (cls.intent === 'greeting_hello') {
      const guest = await this.prisma.guests.findUnique({ where: { id: ctx.guestId }, select: { name: true } });
      // Name the SPECIFIC property (e.g. "Buteak BTM" vs "Buteak Koramangala" vs "TDS
      // Koramangala"), not the brand — a guest at BTM must never be welcomed to Koramangala.
      // Uses the curated short-label map, which is property-distinct and consistent, rather
      // than the raw properties.name column ("Buteak Suites" / "BUTEAK KORAMANGALA").
      await this.replyAndLog(
        traceId,
        brand,
        msg.waId,
        `Hi, *${guest?.name ?? 'there'}* from room *${ctx.roomNumber ?? '-'}*.\n` +
          `🏨 Welcome to ${propertyShortLabel(ctx.propertyId, brand)}. How can I assist you today?`,
        'greeting_hello',
      );
      await this.finish(reqId, 'DROPPED');
      return { intent: cls.intent, request_id: reqId };
    }

    // 5b. Status check ("where is my towel?") → report the status of the request the
    // guest ACTUALLY means. Never assume the most recent open ticket is the one they
    // asked about: with an iron-board AND a towel open, "where is my towel?" must not
    // answer about the iron board. Match the message to one of their live requests.
    if (cls.intent === 'request_update') {
      const guest = await this.prisma.guests.findUnique({ where: { id: ctx.guestId }, select: { name: true } });
      const name = guest?.name ?? 'there';

      // Candidates: everything still open, plus anything completed in the last 24h —
      // so "where is my towel?" right after it was delivered gets an accurate answer
      // instead of "no active requests".
      const since = new Date(Date.now() - 24 * 60 * 60_000);
      const candidates = await this.prisma.zoho_ticket_ref.findMany({
        where: {
          ticket_type: 'SERVICE_REQUEST',
          ezee_reservation_id: ctx.eri,
          OR: [
            { status: { in: ['OPEN', 'PENDING', 'IN_PROGRESS'] } },
            { status: 'COMPLETED', completed_at: { gte: since } },
          ],
        },
        orderBy: { created_at: 'desc' },
        take: 10,
        select: { id: true, subject: true, status: true, completed_at: true },
      });

      if (candidates.length === 0) {
        await this.replyAndLog(
          traceId,
          brand,
          msg.waId,
          `Hi ${name}, we don’t see any active requests for your room right now. Tell us what you need and we’ll raise it. 🙏`,
          'request_update:none',
        );
        await this.finish(reqId, 'DROPPED');
        return { intent: cls.intent, request_id: reqId, had_open: false };
      }

      const match = await this.flowLog.timed(
        { trace_id: traceId, brand, module: 'LLM_MATCH', input: text },
        () =>
          this.llm.matchUpdateTarget(
            text,
            candidates.map((c) => ({ id: c.id, subject: c.subject, status: c.status })),
          ),
        (m) =>
          m.ticket_id
            ? `matched ticket ${m.ticket_id.slice(0, 8)}`
            : `no match${m.item ? ` (asked for "${m.item}")` : ' (generic)'}`,
      );
      const matched = match.ticket_id ? candidates.find((c) => c.id === match.ticket_id) : null;

      let reply: string;
      let route: string;
      if (matched && matched.status === 'COMPLETED') {
        reply =
          `Good news ${name} — your request *${matched.subject ?? 'your request'}* has been completed` +
          `${matched.completed_at ? ` (${toIstString(matched.completed_at)})` : ''}. ` +
          `If it still isn’t sorted, let us know and we’ll jump right back on it. 🙏`;
        route = 'request_update:completed';
      } else if (matched) {
        reply = `Yes ${name}, your request *${matched.subject ?? 'your request'}* is ${this.statusLabel(matched.status)}. 🙌`;
        route = `request_update:${matched.status.toLowerCase()}`;
      } else if (match.item) {
        // Guest named something we have no ticket for → don't pretend it exists.
        reply =
          `Hi ${name}, we don’t see a request for *${match.item}* on your room yet. ` +
          `If you’d like it, just ask (e.g. “please send a ${match.item}”) and we’ll raise it right away. 🙏`;
        route = 'request_update:no_such_item';
      } else {
        // Generic ask ("any update?") → only surface what's still OUTSTANDING. A guest
        // asking for a status doesn't care that yesterday's tea was delivered; a wall of
        // "— completed" reads as if nothing is happening. So never list completed tickets
        // here. If everything is done, reassure instead of dumping the finished list.
        const open = candidates.filter((c) => c.status !== 'COMPLETED');
        if (open.length) {
          const lines = open
            .map((c) => `• *${c.subject ?? 'request'}* — ${this.statusLabel(c.status)}`)
            .join('\n');
          reply = `Hi ${name}, here’s where your open requests stand:\n${lines}\nSomeone’s already on it and will have it sorted shortly. 🙌`;
          route = 'request_update:list';
        } else {
          reply = `Hi ${name}, you’re all caught up — every request on your room has been taken care of. ✅ Is there anything else we can help with?`;
          route = 'request_update:all_done';
        }
      }

      await this.replyAndLog(traceId, brand, msg.waId, reply, route);
      await this.finish(reqId, 'DROPPED');
      return {
        intent: cls.intent,
        request_id: reqId,
        had_open: candidates.some((c) => c.status !== 'COMPLETED'),
      };
    }

    // 5b-bis. FAQ — a general informational question ("how far is the airport?", "nearby
    // places to visit?", "what time is breakfast?"). Raising a ticket for this is pure noise,
    // so answer it from the property knowledge base (the same RAG the non-guest front door
    // uses). If the KB can't answer, hand it to Reception (L1) as a ticket + ack, so a human
    // replies rather than the guest getting nothing. Gated by GUEST_FAQ_ENABLED (default on);
    // when off, every FAQ falls straight to the L1 ticket (the old, safe behaviour).
    if (cls.intent === 'faq') {
      const faqEnabled = (process.env.GUEST_FAQ_ENABLED ?? 'true') === 'true';
      const answer = faqEnabled
        ? await this.flowLog.timed(
            { trace_id: traceId, brand, module: 'FAQ_RAG', input: text },
            () => this.prospect.askChatbot(ctx.propertyId, text),
            (a) => (a.answered ? 'answered from knowledge base' : 'no KB answer → L1 ticket'),
          )
        : { answered: false, answer: null };

      if (answer.answered && answer.answer) {
        await this.replyAndLog(traceId, brand, msg.waId, answer.answer, 'faq:answered');
        await this.finish(reqId, 'DROPPED');
        return { intent: cls.intent, request_id: reqId, answered: true };
      }

      // Couldn't answer → Reception ticket, and ack the guest. A question we simply
      // failed to look up is ROUTINE — someone at the desk knows the answer — so it is
      // T0, never the unfulfillable class.
      const ticket = await this.raiseTicket(ctx, 'FRONT_OFFICE', cls.request_text || text, 'FREE', DEFAULT_CLASS, msg.waId, text);
      await this.flowLog.linkTicket(traceId, ticket.id);
      await this.prisma.wa_service_request.update({
        where: { id: reqId },
        data: { request_type: 'ANONYMOUS', department: 'FRONT_OFFICE', status: 'TICKETED', ticket_id: ticket.id },
      });
      await this.ackTicketToGuest(reqId, brand, msg, ticket, cls.request_text || text);
      return { intent: cls.intent, request_type: 'RECEPTION', request_id: reqId, ticket_id: ticket.id, answered: false };
    }

    // 5b-ter. Breakfast — the guest wants to ORDER breakfast ("breakfast", "order my
    // breakfast", "i need brekfast"). Instead of a ticket, send them their per-stay
    // breakfast ordering link (the `breakfast_order_invite` template with the menu/slots
    // page). Only when this property serves breakfast (per-property toggle); if it's off,
    // tell them politely — no ticket noise.
    if (cls.intent === 'breakfast') {
      const enabled = await this.breakfast.isEnabled(ctx.propertyId);
      if (enabled) {
        await this.flowLog.timed(
          { trace_id: traceId, brand, module: 'BREAKFAST_LINK', input: text },
          () =>
            this.breakfastInvite.issueForBooking({
              ezee_reservation_id: ctx.eri,
              property_id: ctx.propertyId,
              guest_id: ctx.guestId,
              phone: msg.waId, // reach them on the number that just messaged
              room_number: ctx.roomNumber,
            }),
          (sent) => (sent ? 'breakfast ordering link sent' : 'link send skipped (no phone/disabled)'),
        );
        await this.finish(reqId, 'DROPPED');
        return { intent: cls.intent, request_id: reqId, breakfast: 'link_sent' };
      }
      await this.replyAndLog(
        traceId,
        brand,
        msg.waId,
        `Sorry, in-room breakfast ordering isn’t available at your property right now. 🙏`,
        'breakfast:unavailable',
      );
      await this.finish(reqId, 'DROPPED');
      return { intent: cls.intent, request_id: reqId, breakfast: 'unavailable' };
    }

    // 5c. Ambiguous — a genuine property/stay request the bot can't confidently route
    // to a department ("someone please come up", "the thing by the bed"). Don't guess a
    // service; hand it to Reception as a ticket so a human decides. Contrast with
    // `unclear` below (gibberish).
    //
    // This is the catch-all, so it carries the UNFULFILLED class: we do not know what was
    // asked for, therefore we must not promise it. The guest gets "someone will contact
    // you" rather than "Praveer is on it" — which also makes an OpenAI outage (every
    // message falls back to `ambiguous`) degrade honestly instead of lying at scale.
    if (cls.intent === 'ambiguous') {
      const ticket = await this.raiseTicket(ctx, 'FRONT_OFFICE', cls.request_text || text, 'FREE', UNFULFILLED_CLASS, msg.waId, text);
      await this.flowLog.linkTicket(traceId, ticket.id);
      await this.prisma.wa_service_request.update({
        where: { id: reqId },
        data: { request_type: 'ANONYMOUS', department: 'FRONT_OFFICE', status: 'TICKETED', ticket_id: ticket.id },
      });
      await this.ackTicketToGuest(reqId, brand, msg, ticket, cls.request_text || text);
      return { intent: cls.intent, request_type: 'RECEPTION', request_id: reqId, ticket_id: ticket.id };
    }

    // 5c-bis. Unclear — gibberish, a fragment, or contextless text that ISN'T a readable
    // request ("asdf", "in", "ok come", "hmm"). This used to get a canned "please send it
    // again" and nothing else, which meant a guest whose message we simply failed to parse
    // was answered by a bot and never seen by a human. It is now ticketed to Reception as
    // UNFULFILLED, exactly like `ambiguous`: a person reads the guest's actual words and
    // decides. The class is already forced by applyRoutingPolicy; passing it here keeps the
    // call site honest about what it is raising.
    //
    // The subject is the guest's RAW message, never cls.request_text — for `unclear` the
    // model restates the message as boilerplate ADDRESSED TO THE GUEST ("Unclear request,
    // please resend with details"), and putting that on the ticket would show Reception a
    // sentence the guest never wrote. See META_SUBJECT.
    if (cls.intent === 'unclear') {
      // One exception. Inside an open CSAT review window we have JUST asked the guest to
      // say more about a completed ticket, so an unreadable reply is a stray tap or a
      // half-typed thought about that — not a new request. Keep the old behaviour: prompt
      // again, raise nothing, and leave the review window open so a real remark still lands.
      if (inReviewCapture) {
        await this.replyAndLog(
          traceId,
          brand,
          msg.waId,
          `Sorry, I couldn’t quite understand that. 🙏 Could you please send it again?`,
          'unclear:review_window',
        );
        await this.finish(reqId, 'DROPPED');
        return { intent: cls.intent, request_id: reqId };
      }
      const ticket = await this.raiseTicket(ctx, 'FRONT_OFFICE', text, 'FREE', UNFULFILLED_CLASS, msg.waId, text);
      await this.flowLog.linkTicket(traceId, ticket.id);
      await this.prisma.wa_service_request.update({
        where: { id: reqId },
        data: { request_type: 'ANONYMOUS', department: 'FRONT_OFFICE', status: 'TICKETED', ticket_id: ticket.id },
      });
      await this.ackTicketToGuest(reqId, brand, msg, ticket, text);
      return { intent: cls.intent, request_type: 'RECEPTION', request_id: reqId, ticket_id: ticket.id };
    }

    // 5c-ter. booking_confirm / booking_deny → the bot must NOT answer these on its
    // own: the classifier is unreliable here and a wrong canned reply silently
    // swallows a real request (a "late checkout tomorrow" ask was misread as
    // "booking confirmed" and dropped). Forward to Reception as a ticket and ack the
    // guest — a human decides, not the AI.
    if (cls.intent === 'booking_confirm' || cls.intent === 'booking_deny') {
      // A booking question the desk can answer → routine (T0), not unfulfillable.
      const ticket = await this.raiseTicket(ctx, 'FRONT_OFFICE', cls.request_text || text, 'FREE', DEFAULT_CLASS, msg.waId, text);
      await this.flowLog.linkTicket(traceId, ticket.id);
      await this.prisma.wa_service_request.update({
        where: { id: reqId },
        data: { request_type: 'ANONYMOUS', department: 'FRONT_OFFICE', status: 'TICKETED', ticket_id: ticket.id },
      });
      await this.ackTicketToGuest(reqId, brand, msg, ticket, cls.request_text || text);
      return { intent: cls.intent, request_type: 'RECEPTION', request_id: reqId, ticket_id: ticket.id };
    }

    // 5d. greeting_acknowledge / feedback → short canned closer, no ticket.
    if (cls.intent !== 'request_new') {
      await this.replyAndLog(traceId, brand, msg.waId, this.replyForIntent(cls.intent), cls.intent);
      await this.finish(reqId, 'DROPPED');
      return { intent: cls.intent, request_id: reqId };
    }

    // 6. request_new → raise the right ticket (or payment link) for the ask. Pass the
    //    guest's RAW message as the request text so the ticket subject keeps it in
    //    brackets — "Request for towel (I need a towel)" — for staff. (Passing
    //    cls.request_text here made interpreted === original, collapsing the bracket.)
    //    Shared with the multi-request path via fulfilRequestNew.
    return this.fulfilRequestNew(reqId, brand, msg, ctx, cls, text);
  }

  /**
   * Turn ONE classified request into the correct ticket / payment. For a ticketed item it
   * sends the guest EXACTLY ONE synchronous ack that names the resolved assignee
   * (ackTicketToGuest) — the ops worker's own guest notify is suppressed (notify_guest:
   * false) so there's no duplicate, and the ack is reliable regardless of SQS timing. The
   * wa_service_request row `reqId` must already exist; this updates it and links the
   * ticket. Used by BOTH the single-message path and each ask of a split multi-request,
   * so every ask gets its own department + turn-around tier AND its own named ack.
   */
  private async fulfilRequestNew(
    reqId: string,
    brand: string,
    msg: WatiInboundMessage,
    ctx: {
      guestId: string;
      eri: string;
      propertyId: string;
      brand: string;
      roomNumber: string | null;
      unitCode: string | null;
    },
    cls: GuestMessageClassification,
    requestText: string,
  ) {
    // Match the ask to a catalog product (null = not in catalog → anonymous ticket).
    let product = cls.product_id
      ? await this.prisma.product_catalog.findFirst({
          where: { id: cls.product_id, property_id: ctx.propertyId, is_active: true },
        })
      : null;

    // Backstop against a force-fit misclassification. The model is told to return
    // null when nothing fits, but it sometimes maps a request onto an unrelated row
    // (a "2 towel" ask came back as "Water Bottle", and the guest was shown a ₹100
    // payment for something they never asked for). Before we branch on the product —
    // and especially before charging — require that its name overlaps the guest's
    // actual words. If it doesn't, drop it and route the REAL request as a ticket.
    if (product && !this.productMatchesRequest(product.name, cls.request_text, requestText)) {
      await this.flowLog.log({
        trace_id: reqId,
        brand,
        module: 'CATALOG',
        input: requestText,
        output: `discarded mismatched product "${product.name}" (${product.id}) — not what the guest asked; routing as a ticket`,
        status: 'SKIP',
      });
      product = null;
    }

    if (!product) {
      const ticket = await this.raiseTicket(ctx, cls.department, cls.request_text || requestText, 'FREE', cls.task_category, msg.waId, requestText);
      await this.flowLog.linkTicket(reqId, ticket.id);
      await this.prisma.wa_service_request.update({
        where: { id: reqId },
        data: { request_type: 'ANONYMOUS', status: 'TICKETED', ticket_id: ticket.id },
      });
      await this.ackTicketToGuest(reqId, brand, msg, ticket, cls.request_text || requestText);
      return { intent: cls.intent, request_type: 'ANONYMOUS', request_id: reqId, ticket_id: ticket.id };
    }

    const price = Number(product.base_price);

    // 7a. BORROWABLE catalog item → ticket (no payment).
    if (product.category === 'BORROWABLE') {
      // Borrowable items (iron, umbrella, hairdryer) are a standard delivery → T0.
      const ticket = await this.raiseTicket(ctx, 'HOUSEKEEPING', product.name, 'BORROWABLE', DEFAULT_CLASS, msg.waId, requestText);
      await this.flowLog.linkTicket(reqId, ticket.id);
      await this.prisma.wa_service_request.update({
        where: { id: reqId },
        data: { request_type: 'BORROWABLE', product_id: product.id, department: 'HOUSEKEEPING', task_category: 'T0', status: 'TICKETED', ticket_id: ticket.id },
      });
      await this.ackTicketToGuest(reqId, brand, msg, ticket, product.name);
      return { request_type: 'BORROWABLE', request_id: reqId, ticket_id: ticket.id };
    }

    // 7b. FREE catalog item → (inventory-- if physical) → ticket. When out of stock we
    // still raise the ticket (so staff restock / follow up) — the guest isn't bothered
    // with an apology here; the worker's "request received" covers it.
    if (price === 0) {
      if (product.category === 'COMMODITY') {
        const ok = await this.decrementFreeCommodity(product.id, ctx.propertyId);
        if (!ok) {
          await this.flowLog.log({
            trace_id: reqId,
            brand,
            module: 'CATALOG',
            input: requestText,
            output: `${product.name} out of stock — raising ticket anyway for restock/follow-up`,
            status: 'SKIP',
          });
        }
      }
      const ticket = await this.raiseTicket(ctx, cls.department, product.name, 'FREE', cls.task_category, msg.waId, requestText);
      await this.flowLog.linkTicket(reqId, ticket.id);
      await this.prisma.wa_service_request.update({
        where: { id: reqId },
        data: { request_type: 'FREE', product_id: product.id, status: 'TICKETED', ticket_id: ticket.id },
      });
      await this.ackTicketToGuest(reqId, brand, msg, ticket, product.name);
      return { request_type: 'FREE', request_id: reqId, ticket_id: ticket.id };
    }

    // 7c. CHARGEABLE catalog item → Razorpay Payment Link over WhatsApp.
    //     Ticket is created on capture (PaymentService.fulfilWhatsappService).

    // Never take money for a physical item we can't hand over. A COMMODITY/RETURNABLE
    // with no inventory row or zero available stock is unavailable (e.g. a "towel"
    // priced ₹100 that isn't actually stocked). Forward to the team and send NO payment
    // link. (SERVICE items carry no stock → skip this check.) The guest is told by the
    // worker's "request received" — no separate apology here.
    const physical = product.category === 'COMMODITY' || product.category === 'RETURNABLE';
    if (physical) {
      const inv = await this.prisma.inventory.findFirst({
        where: { product_id: product.id, property_id: ctx.propertyId },
        select: { available_stock: true },
      });
      if (!inv || inv.available_stock <= 0) {
        const ticket = await this.raiseTicket(ctx, cls.department, product.name, 'FREE', cls.task_category, msg.waId, requestText);
        await this.flowLog.linkTicket(reqId, ticket.id);
        await this.prisma.wa_service_request.update({
          where: { id: reqId },
          data: { request_type: 'ANONYMOUS', product_id: product.id, status: 'TICKETED', ticket_id: ticket.id },
        });
        await this.flowLog.log({
          trace_id: reqId,
          brand,
          module: 'CATALOG',
          input: requestText,
          output: `${product.name} unavailable (no stock) — routed to team as a ticket, no payment link`,
          status: 'SKIP',
        });
        await this.ackTicketToGuest(reqId, brand, msg, ticket, product.name);
        return { request_type: 'UNAVAILABLE', request_id: reqId, ticket_id: ticket.id };
      }
    }

    const guest = await this.prisma.guests.findUnique({
      where: { id: ctx.guestId },
      select: { name: true, phone: true },
    });
    const addonOrderId = await this.createSingleItemCart(ctx, product.id, price);

    const link = await this.payments.createWhatsappServiceLink({
      brand: ctx.brand,
      eri: ctx.eri,
      property_id: ctx.propertyId,
      guest_id: ctx.guestId,
      guest_name: guest?.name ?? 'Guest',
      guest_phone: guest?.phone ?? msg.waId,
      product_name: product.name,
      amount: price,
      addon_order_id: addonOrderId,
      wa_service_request_id: reqId,
    });

    await this.prisma.wa_service_request.update({
      where: { id: reqId },
      data: {
        request_type: 'CHARGEABLE',
        product_id: product.id,
        addon_order_id: addonOrderId,
        payment_id: link.payment_id,
        razorpay_payment_link_id: link.plink_id,
        status: 'PENDING_PAYMENT',
      },
    });

    if (link.short_url) {
      // Authentic-looking template with a "Pay Now" dynamic-URL button. WATI's
      // button URL is https://rzp.io/i/{{1}} — {{1}} is the code at the tail of
      // the Razorpay short_url (e.g. https://rzp.io/i/AbCdEf → "AbCdEf").
      const code = link.short_url.split('/').filter(Boolean).pop() ?? '';
      const tpl = await this.wati.sendTemplateMessage(brand, msg.waId, resolveTemplate(brand, 'PAYMENT_REQUEST'), [
        { name: 'name', value: guest?.name ?? 'Guest' },
        { name: 'item', value: product.name },
        { name: 'amount', value: String(price) },
        { name: 'room_no', value: ctx.roomNumber ?? 'NA' },
        { name: '1', value: code }, // Pay Now button → https://rzp.io/i/{{1}}
      ]);
      await this.flowLog.log({
        trace_id: reqId,
        brand,
        module: 'GUEST_REPLY',
        input: 'request_new:chargeable',
        output: `payment link (₹${price}) for "${product.name}" → ${msg.waId} [${tpl.ok ? 'sent' : tpl.skipped ? 'skipped(no WATI creds)' : 'FAILED'}]`,
        status: tpl.ok ? 'OK' : tpl.skipped ? 'SKIP' : 'ERROR',
      });
    } else {
      await this.replyAndLog(reqId, brand, msg.waId, `We couldn’t create a payment link just now — our team will reach out shortly.`, 'request_new:chargeable_link_failed');
    }

    return { request_type: 'CHARGEABLE', request_id: reqId, payment_id: link.payment_id, pending_payment: true };
  }

  /**
   * A single WhatsApp message asked for several distinct things. Raise a SEPARATE ticket per
   * ask — each already classified on its own (classifySegments), so each carries its own
   * department + TAT. The first ticketed ask reuses the inbound's trace id (and its
   * wati_message_id, for WATI-retry dedupe); the rest get fresh ids with a null
   * wati_message_id (the unique column can only hold the message once). fulfilRequestNew
   * sends one synchronous, assignee-named ack per ticket, so N asks → N acknowledgements.
   */
  private async handleMultiRequest(
    traceId: string,
    brand: string,
    msg: WatiInboundMessage,
    ctx: {
      guestId: string;
      eri: string;
      propertyId: string;
      brand: string;
      roomNumber: string | null;
      /** The requester's rooms — used to pin each split ask to the room it names. */
      roomNumbers: string[];
      unitCode: string | null;
    },
    segments: SplitSegment[],
  ) {
    await this.flowLog.log({
      trace_id: traceId,
      brand,
      module: 'WA_INBOUND',
      input: msg.text,
      output: `multi-request → ${segments.length} asks: ${segments.map((s) => `"${s.text.slice(0, 40)}"`).join(', ')}`,
    });

    const results: any[] = [];
    let emitted = 0;
    for (const { text: seg, cls } of segments) {
      if (!seg) continue;
      // The splitter is told to drop pleasantries, but when it doesn't ("a towel, a soap and
      // thanks!") a "thanks" piece must not become a ticket someone has to close.
      if (WaServiceService.NOISE_INTENTS.has(cls.intent)) {
        await this.flowLog.log({
          trace_id: traceId,
          brand,
          module: 'LLM_ROUTE',
          input: seg,
          output: `pleasantry (${cls.intent}) inside a multi-request → no ticket`,
          status: 'SKIP',
        });
        continue;
      }
      const first = emitted === 0;
      emitted++;
      const reqId = first ? traceId : uuidv4();
      await this.prisma.wa_service_request
        .create({
          data: {
            id: reqId,
            brand,
            wa_id: msg.waId,
            // Only the first row can hold the (unique) source message id; the rest are
            // sibling asks of the same inbound and carry null so there's no collision.
            wati_message_id: first ? msg.messageId : null,
            guest_id: ctx.guestId,
            ezee_reservation_id: ctx.eri,
            property_id: ctx.propertyId,
            raw_text: seg,
            status: 'RECEIVED',
          },
        })
        .catch((e) => this.logger.error(`multi-request row create failed: ${(e as Error).message}`));

      await this.flowLog.log({
        trace_id: reqId,
        brand,
        module: 'LLM_ROUTE',
        input: seg,
        output: `message_type=${cls.intent} · department=${cls.department} · task_class=${cls.task_category}`,
      });
      await this.prisma.wa_service_request
        .update({
          where: { id: reqId },
          data: {
            status: 'CLASSIFIED',
            intent: cls.intent,
            department: cls.department,
            task_category: cls.task_category,
          },
        })
        .catch(() => undefined);

      // Each ask carries its OWN room when the guest named one ("towel to 1 and soap to 2"
      // → towel files against 1, soap against 2). A segment that names no room keeps the
      // parent context (already pinned to a single room when the whole message named one).
      const segHit = this.roomSel.findRoomInText(seg, ctx.roomNumbers);
      const segCtx =
        segHit.kind === 'match' && segHit.room !== ctx.roomNumber
          ? { ...ctx, roomNumber: segHit.room, roomNumbers: [segHit.room] }
          : ctx;
      if (segHit.kind === 'match') {
        await this.flowLog.log({
          trace_id: reqId,
          brand,
          module: 'ROOM_SELECT',
          input: seg,
          output: `sub-request pinned to room ${segHit.room}`,
        });
      }

      // Every ask that survived the noise filter becomes its own ticket/payment via the
      // shared fulfilment — independent department + TAT.
      const segCls = await this.sanitiseSegmentClassification(reqId, brand, cls, seg);
      const r = await this.fulfilRequestNew(reqId, brand, msg, segCtx, segCls, seg);
      results.push({ request: seg, ...r });
    }

    return { multi: true, count: results.length, requests: results };
  }

  /**
   * Intents that PROVE a piece of a split message is a real ask. Only these count toward the
   * "is this genuinely a multi-request?" test — a message whose pieces are all greetings,
   * status checks or FAQs is one message with a joiner in it, not several requests.
   */
  private static readonly ACTIONABLE_INTENTS = new Set(['request_new', 'ambiguous']);

  /** Social noise the splitter should have dropped — never worth a ticket on its own. */
  private static readonly NOISE_INTENTS = new Set([
    'greeting_hello',
    'greeting_acknowledge',
    'feedback',
  ]);

  /**
   * Classify each piece of a split message up front, so the caller can decide whether the split
   * is real BEFORE any row, ticket or ack is written. Logged against the parent trace (the
   * pieces have no request id yet, and half of them may never get one).
   */
  private async classifySegments(
    traceId: string,
    brand: string,
    segments: string[],
    catalog: ClassifierCatalogItem[],
    propertyId: string,
  ): Promise<SplitSegment[]> {
    const out: SplitSegment[] = [];
    for (const raw of segments) {
      const text = raw.trim();
      if (!text) continue;
      const raw2 = await this.flowLog.timed(
        { trace_id: traceId, brand, module: 'LLM_CLASSIFY', input: text },
        () => this.llm.classifyGuestMessage(text, catalog),
        (c) => `message_type=${c.intent} · dept=${c.department} · ${c.task_category}`,
      );
      const cls = await this.applyRoutingPolicy(traceId, brand, raw2, catalog, text, propertyId);
      out.push({ text, cls });
    }
    return out;
  }

  /**
   * Classes that ALWAYS belong to Reception, whatever the model proposed. There is no
   * maintenance team on the guest-facing line — Reception owns every repair and dispatches
   * a technician themselves — so a T2/T3 must never be routed away from them, and an
   * unfulfillable ask (T-1) or an emergency (T4) is theirs by definition.
   */
  private static readonly RECEPTION_ONLY_CLASSES: ReadonlySet<string> = new Set([
    UNFULFILLED_CLASS,
    'T2',
    'T3',
    'T4',
  ]);

  /**
   * The model PROPOSES a department and a class; this table DISPOSES. Two corrections,
   * both deterministic, both logged so a misroute is readable straight off the trace:
   *
   *  1. **A catalog match can never be T-1.** T-1 means "we don't offer this", but the
   *     property's own catalog is the authority on what it offers. Lending an iron is a
   *     normal borrowable request; ironing FOR the guest is not — and the only reliable
   *     way to tell them apart is whether the ask resolved to a live catalog row. This
   *     also makes T-1 correct PER PROPERTY for free: deactivate the iron at one
   *     property and it becomes unfulfillable there and nowhere else.
   *  2. **Department follows the class.** T-1/T2/T3/T4 are Reception's. For T0/T1 the
   *     model's HOUSEKEEPING/FRONT_OFFICE split stands — but MAINTENANCE collapses to
   *     FRONT_OFFICE everywhere, since no property staffs that role.
   */
  /**
   * Does the guest's message name a product this property has DEACTIVATED? Returns the
   * product name, or null. Matched with a `\bname\w*` prefix so "Iron" also catches
   * "irons" and "ironing" — which is the whole point, since a property that stopped
   * lending irons certainly does not press shirts either.
   */
  private async retiredCatalogMatch(propertyId: string, text: string): Promise<string | null> {
    const retired = await this.prisma.product_catalog.findMany({
      where: { property_id: propertyId, is_active: false },
      select: { name: true },
    });
    if (retired.length === 0) return null;
    const haystack = (text || '').toLowerCase();
    for (const { name } of retired) {
      const needle = name.trim().toLowerCase();
      if (!needle) continue;
      const re = new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\w*`, 'i');
      if (re.test(haystack)) return name;
    }
    return null;
  }

  private async applyRoutingPolicy(
    traceId: string,
    brand: string,
    cls: GuestMessageClassification,
    catalog: ClassifierCatalogItem[],
    text: string,
    propertyId: string,
  ): Promise<GuestMessageClassification> {
    let taskCategory = cls.task_category;

    if (taskCategory === UNFULFILLED_CLASS && cls.product_id) {
      const match = catalog.find((c) => c.id === cls.product_id);
      if (match) {
        taskCategory = DEFAULT_CLASS;
        await this.flowLog.log({
          trace_id: traceId,
          brand,
          module: 'LLM_ROUTE',
          input: text,
          output: `${UNFULFILLED_CLASS} overruled → ${DEFAULT_CLASS}: "${match.name}" is in this property's catalog, so we DO offer it`,
          status: 'SKIP',
        });
      }
    } else if (
      cls.intent === 'request_new' &&
      !cls.product_id &&
      (taskCategory === DEFAULT_CLASS || taskCategory === 'T1')
    ) {
      // The mirror image, and the half the model cannot see. It is only ever shown the
      // ACTIVE catalog, so an item the property has deliberately switched off just looks
      // like an item it has never heard of — and "can I borrow an iron" reads as a
      // perfectly routine T0 ask. Ticketing that with the normal ack promises a delivery
      // that will never come.
      //
      // Deactivating a product IS the admin's "we don't offer this" switch, so honour it:
      // name a retired product and the request is unfulfillable. Restricted to delivery /
      // service classes — a T2/T3 repair ("the towel rail is broken") is about a fault,
      // not about whether we stock the thing.
      const retired = await this.retiredCatalogMatch(propertyId, text);
      if (retired) {
        taskCategory = UNFULFILLED_CLASS;
        await this.flowLog.log({
          trace_id: traceId,
          brand,
          module: 'LLM_ROUTE',
          input: text,
          output: `${cls.task_category} → ${UNFULFILLED_CLASS}: "${retired}" is deactivated in this property's catalog, so we do NOT offer it`,
          status: 'SKIP',
        });
      }
    }

    // Neither "not sure" intent can be promised, so both are UNFULFILLED regardless of what
    // the model guessed at. `ambiguous` is a real ask we can't route ("the thing by the bed
    // is broken"); `unclear` is a message we couldn't read at all ("asdf", "yo", "123").
    // Leadership's call is that a guest who typed *something* gets a human, not a bot
    // telling them to try again — so it is ticketed to Reception like any other class, and
    // the guest is told someone will contact them rather than that a named staff member is
    // on it. Forced here rather than at the call site so a message and each piece of a
    // split message behave identically. Runs AFTER the catalog guards: those only fire for
    // request_new / a T-1 the model proposed, neither of which applies here.
    if (cls.intent === 'ambiguous' || cls.intent === 'unclear') {
      if (taskCategory !== UNFULFILLED_CLASS) {
        await this.flowLog.log({
          trace_id: traceId,
          brand,
          module: 'LLM_ROUTE',
          input: text,
          output: `${cls.task_category} → ${UNFULFILLED_CLASS}: intent=${cls.intent}, we can't tell what was asked so we must not promise it`,
          status: 'SKIP',
        });
      }
      taskCategory = UNFULFILLED_CLASS;
    }

    const department = WaServiceService.RECEPTION_ONLY_CLASSES.has(taskCategory)
      ? 'FRONT_OFFICE'
      : cls.department === 'HOUSEKEEPING'
        ? 'HOUSEKEEPING'
        : 'FRONT_OFFICE';

    if (department !== cls.department) {
      await this.flowLog.log({
        trace_id: traceId,
        brand,
        module: 'LLM_ROUTE',
        input: text,
        output: `department ${cls.department} → ${department} (routing policy for ${taskCategory})`,
        status: 'SKIP',
      });
    }

    if (department === cls.department && taskCategory === cls.task_category) return cls;
    return { ...cls, department, task_category: taskCategory };
  }

  /**
   * The classifier answers about a MESSAGE; a split segment is only a fragment of one, so when
   * the splitter drops the shared context ("Send sandwich, idly and dosa to 106" → "idly") the
   * classifier rightly calls that fragment `unclear` — and its `request_text` comes back as
   * boilerplate ADDRESSED TO THE GUEST ("Unclear request, please resend with details"). That
   * string used to become the ticket subject and the ack, so the guest was told their request
   * "Unclear request, please resend with details" had been assigned to a staff member.
   *
   * The segment is still a genuine ask — the splitter only emits distinct asks — so we keep the
   * ticket and fall back to the guest's OWN words for the subject. Never surface classifier
   * boilerplate as something a human is working on.
   */
  private static readonly META_SUBJECT =
    /\b(unclear|not clear|cannot (be )?determine|could ?n[o']?t understand|please (resend|clarify|provide)|resend|more (details?|context)|no (actionable )?request)\b/i;

  private async sanitiseSegmentClassification(
    reqId: string,
    brand: string,
    cls: GuestMessageClassification,
    seg: string,
  ): Promise<GuestMessageClassification> {
    const subject = (cls.request_text ?? '').trim();
    const meta = cls.intent !== 'request_new' || !subject || WaServiceService.META_SUBJECT.test(subject);
    if (!meta) return cls;
    await this.flowLog.log({
      trace_id: reqId,
      brand,
      module: 'LLM_CLASSIFY',
      input: seg,
      output: `fragment lost its context (intent=${cls.intent}, restated "${subject.slice(0, 60)}") → ticketing it with the guest's own words`,
      status: 'SKIP',
    });
    return { ...cls, request_text: seg };
  }

  /**
   * Cheap gate before spending an LLM call on the multi-request splitter: only messages
   * with a plausible joiner ("and", "&", ",", "plus", "also", "/") and a few words can
   * carry two asks. Single requests, greetings and status checks skip the split entirely.
   *
   * A LINE BREAK counts as a joiner too — guests routinely list items one per line
   * ("Sandwich\nIdly\nDosa\nSend to my room"). Without it that message never reached the
   * splitter and was classified as one blob, which came back `unclear` and was dropped.
   * The splitter still returns a single-element array when the lines are really one
   * request, so a multi-line sentence behaves exactly as before (one extra cheap call).
   */
  private looksMultiRequest(text: string): boolean {
    const t = (text || '').trim();
    if (t.split(/\s+/).length < 3) return false;
    return /\b(and|also|plus|then|as well as|along with)\b|[,&/+]|\r?\n/i.test(t);
  }

  /**
   * Mint a fresh payment link for a previously-failed/expired WhatsApp paid
   * request. Powers the "Try Again" button on service_payment_failed
   * (GET /wati/pay/retry?rid=<wa_service_request.id>). Returns the new Razorpay
   * short_url to redirect the guest to, or a reason when retry isn't possible.
   */
  async retryPayment(rid: string): Promise<{ url: string | null; reason?: string }> {
    const wa = await this.prisma.wa_service_request.findUnique({ where: { id: rid } });
    if (!wa) return { url: null, reason: 'not_found' };
    if (wa.status === 'TICKETED' || wa.status === 'FULFILLED') {
      return { url: null, reason: 'already_paid' };
    }
    if (
      wa.request_type !== 'CHARGEABLE' ||
      !wa.product_id ||
      !wa.ezee_reservation_id ||
      !wa.property_id ||
      !wa.guest_id
    ) {
      return { url: null, reason: 'not_retryable' };
    }
    const product = await this.prisma.product_catalog.findUnique({ where: { id: wa.product_id } });
    if (!product || Number(product.base_price) <= 0) return { url: null, reason: 'not_retryable' };
    const price = Number(product.base_price);
    const guest = await this.prisma.guests.findUnique({
      where: { id: wa.guest_id },
      select: { name: true, phone: true },
    });

    // Reuse the existing cart if present, else create one.
    const addonOrderId =
      wa.addon_order_id ??
      (await this.createSingleItemCart({ guestId: wa.guest_id, eri: wa.ezee_reservation_id }, product.id, price));

    const link = await this.payments.createWhatsappServiceLink({
      brand: wa.brand,
      eri: wa.ezee_reservation_id,
      property_id: wa.property_id,
      guest_id: wa.guest_id,
      guest_name: guest?.name ?? 'Guest',
      guest_phone: guest?.phone ?? wa.wa_id,
      product_name: product.name,
      amount: price,
      addon_order_id: addonOrderId,
      wa_service_request_id: wa.id,
    });

    await this.prisma.wa_service_request.update({
      where: { id: wa.id },
      data: {
        payment_id: link.payment_id,
        razorpay_payment_link_id: link.plink_id,
        addon_order_id: addonOrderId,
        status: 'PENDING_PAYMENT',
      },
    });

    return { url: link.short_url, reason: link.short_url ? undefined : 'link_failed' };
  }

  // ─── post-completion feedback (Good/Bad) ────────────────────────────────────

  /**
   * Guest tapped Good/Bad on the post-completion prompt. Record the sentiment (mirrors
   * to Zoho cf_feedback_sentiment), persist a lightweight FEEDBACK request row (so WATI
   * retries dedupe), and ask for a one-line review — their next reply is captured as the
   * remark by the comment-window branch above.
   */
  private async handleFeedbackRating(
    traceId: string,
    brand: string,
    msg: WatiInboundMessage,
    ctx: { guestId: string; eri: string; propertyId: string },
    pending: PendingFeedback,
    sentiment: 'Good' | 'Bad',
  ) {
    const reqId = traceId;
    await this.prisma.wa_service_request.create({
      data: {
        id: reqId,
        brand,
        wa_id: msg.waId,
        wati_message_id: msg.messageId,
        guest_id: ctx.guestId,
        ezee_reservation_id: ctx.eri,
        property_id: ctx.propertyId,
        raw_text: msg.text,
        status: 'FEEDBACK',
        intent: 'feedback_rating',
      },
    });

    const recorded = await this.feedback.recordSentiment(pending.id, sentiment);
    const ask =
      sentiment === 'Good'
        ? 'Thank you! 🌟 So glad we could help. If you have a moment, please reply with a quick review — it really helps our team.'
        : 'Thank you for the honest feedback. 🙏 We’re sorry it fell short — please reply telling us what went wrong so we can put it right.';
    await this.replyAndLog(traceId, brand, msg.waId, ask, `feedback_rating:${sentiment.toLowerCase()}`);

    await this.flowLog.log({
      trace_id: traceId,
      ticket_id: pending.ticket_id,
      brand,
      module: 'FEEDBACK',
      input: msg.text,
      output: `rating=${sentiment}${recorded ? '' : ' (dup — already rated)'}`,
      status: recorded ? 'OK' : 'SKIP',
    });

    return { intent: 'feedback_rating', sentiment, request_id: reqId, feedback_id: pending.id };
  }

  // ─── helpers ────────────────────────────────────────────────────────────────

  /** Resolve a WhatsApp number → checked-in guest + active booking, or null. */
  private async resolveCheckedInGuest(brand: string, waId: string): Promise<{
    guestId: string;
    eri: string;
    propertyId: string;
    brand: string;
    roomNumber: string | null;
    /**
     * The requester's rooms, parsed from `roomNumber` (which for a group booking is the
     * comma-joined `matched_room` list). Single source for "does this guest hold >1 room" and
     * for the room-disambiguation candidate set. Empty when no room is known.
     */
    roomNumbers: string[];
    unitCode: string | null;
  } | null> {
    // Match on the last 10 digits so any eZee format ("+91 …", "91…", bare 10-digit)
    // reconciles with the WhatsApp sender id.
    const last10 = phoneLast10(waId);
    if (!last10) return null;

    // Primary signal: an active eZee booking marked CHECKED_IN, reached from this
    // WhatsApp number by ANY of three links — because eZee (not our guests table) is the
    // source of truth for who is in-house:
    //   (1) the number is the phone on the guest profile the booking is LINKED to;
    //   (2) the number is eZee's own booker phone on the reservation — this is what
    //       rescues a GROUP booking's co-guest (e.g. room 106 messaging on their own
    //       number while the cache row is linked to the lead booker of room 105), so a
    //       valid in-house guest is no longer misrouted to the prospect path;
    //   (3) the number belongs to a guest granted access (booking_guest_access) to the
    //       reservation — an explicitly linked secondary guest;
    //   (4) the number is the guest phone on ANY sub-booking of the reservation
    //       (`ezee_room_guests_json`). A 2-room booking is ONE cache row, so rooms 2..n live
    //       only in that snapshot — this is what makes the guest in the second room a guest.
    // `ng` tags the guest profile that actually OWNS the inbound number (if any) so the
    // reply/ack names the real sender; for a pure booker-phone match with no profile we
    // fall back to the booking's linked guest.
    // `matched_room` lists EVERY room of the reservation that this number belongs to — prefer it
    // over the row's `room_number`, which is only ever BookingTran[0]'s (i.e. someone else's room).
    // It is aggregated, not a single pick: on a group booking one person holds several rooms (eZee
    // stamps the same guest on each sub-booking), so taking the first match named 306 and silently
    // dropped 406 — the guest and the staff task must name both rooms the requester actually holds.
    const rows = await this.prisma.$queryRaw<{
      booking_guest_id: string | null;
      number_guest_id: string | null;
      eri: string;
      property_id: string;
      room_number: string | null;
      matched_room: string | null;
      all_rooms: string | null;
      unit_code: string | null;
      brand: string | null;
    }[]>`
      SELECT b.guest_id            AS booking_guest_id,
             ng.id                 AS number_guest_id,
             b.ezee_reservation_id AS eri,
             b.property_id         AS property_id,
             b.room_number         AS room_number,
             (
               SELECT string_agg(DISTINCT rg->>'room_number', ', ' ORDER BY rg->>'room_number')
               FROM jsonb_array_elements(coalesce(b.ezee_room_guests_json, '[]'::jsonb)) rg
               WHERE coalesce(rg->>'room_number', '') <> ''
                 AND (
                      (ng.id IS NOT NULL AND rg->>'guest_id' = ng.id)
                   OR right(regexp_replace(coalesce(rg->>'phone', ''), '[^0-9]', '', 'g'), 10) = ${last10}
                 )
             )                     AS matched_room,
             (
               SELECT string_agg(DISTINCT rg->>'room_number', ', ' ORDER BY rg->>'room_number')
               FROM jsonb_array_elements(coalesce(b.ezee_room_guests_json, '[]'::jsonb)) rg
               WHERE coalesce(rg->>'room_number', '') <> ''
             )                     AS all_rooms,
             b.unit_code           AS unit_code,
             p.brand               AS brand
      FROM ezee_booking_cache b
      JOIN properties p ON p.id = b.property_id
      LEFT JOIN guests bg ON bg.id = b.guest_id
      LEFT JOIN guests ng
        ON right(regexp_replace(coalesce(ng.phone, ''), '[^0-9]', '', 'g'), 10) = ${last10}
        OR right(regexp_replace(coalesce(ng.secondary_phone, ''), '[^0-9]', '', 'g'), 10) = ${last10}
      WHERE b.is_active = true
        AND b.status = 'CHECKED_IN'
        -- Scope to the brand whose WhatsApp number the guest actually messaged. A phone
        -- can be checked in at more than one property (e.g. staying at a TDS AND a Buteak
        -- site, or test data), and without this the newest check-in of ANY brand wins —
        -- so a message on the Buteak line could resolve to a TDS booking. Mirror the same
        -- brand fencing resolveStaff() already applies.
        AND upper(trim(p.brand)) = ${brand}
        AND (
             right(regexp_replace(coalesce(bg.phone, ''), '[^0-9]', '', 'g'), 10) = ${last10}
          OR right(regexp_replace(coalesce(bg.secondary_phone, ''), '[^0-9]', '', 'g'), 10) = ${last10}
          OR right(regexp_replace(coalesce(b.booker_phone, ''), '[^0-9]', '', 'g'), 10) = ${last10}
          OR EXISTS (
               SELECT 1
               FROM jsonb_array_elements(coalesce(b.ezee_room_guests_json, '[]'::jsonb)) rg
               WHERE right(regexp_replace(coalesce(rg->>'phone', ''), '[^0-9]', '', 'g'), 10) = ${last10}
             )
          OR EXISTS (
               SELECT 1
               FROM booking_guest_access acc
               JOIN guests ag ON ag.id = acc.guest_id
               WHERE acc.ezee_reservation_id = b.ezee_reservation_id
                 AND acc.status = 'APPROVED'
                 AND (
                      right(regexp_replace(coalesce(ag.phone, ''), '[^0-9]', '', 'g'), 10) = ${last10}
                   OR right(regexp_replace(coalesce(ag.secondary_phone, ''), '[^0-9]', '', 'g'), 10) = ${last10}
                 )
             )
        )
      ORDER BY b.checkin_date DESC NULLS LAST
      LIMIT 1
    `;
    if (rows.length > 0) {
      const r = rows[0];
      const guestId = r.number_guest_id ?? r.booking_guest_id;
      if (guestId) {
        return {
          guestId,
          eri: r.eri,
          propertyId: r.property_id,
          brand: r.brand ?? 'TDS',
          // Pin them to their own room. If we can't (eZee gave us nothing to tie this person to a
          // sub-booking), name EVERY room on the reservation rather than assert one of them —
          // sending staff to the wrong room is worse than sending them to check both.
          roomNumber: r.matched_room ?? r.all_rooms ?? r.room_number,
          roomNumbers: this.splitRooms(r.matched_room ?? r.all_rooms ?? r.room_number),
          unitCode: r.unit_code,
        };
      }
    }

    // Fallback: a completed digital/kiosk check-in against an active booking whose cache
    // row isn't yet flipped to CHECKED_IN. Matched on the guest profile(s) owning this number.
    const candidates = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM guests
      WHERE right(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'), 10) = ${last10}
         OR right(regexp_replace(coalesce(secondary_phone, ''), '[^0-9]', '', 'g'), 10) = ${last10}
    `;
    if (candidates.length === 0) return null;
    const guestIds = candidates.map((c) => c.id);
    const checkin = await this.prisma.checkin_records.findFirst({
      where: {
        guest_id: { in: guestIds },
        status: 'COMPLETED',
        // Same brand fence as the primary path: only a booking of the messaged brand counts.
        ezee_booking_cache: {
          is_active: true,
          properties: { is: { brand: { equals: brand, mode: 'insensitive' } } },
        },
      },
      orderBy: { checked_in_at: 'desc' },
      select: {
        guest_id: true,
        ezee_reservation_id: true,
        ezee_booking_cache: {
          select: {
            property_id: true,
            room_number: true,
            unit_code: true,
            properties: { select: { brand: true } },
          },
        },
      },
    });
    if (!checkin?.ezee_booking_cache) return null;

    return {
      guestId: checkin.guest_id,
      eri: checkin.ezee_reservation_id,
      propertyId: checkin.ezee_booking_cache.property_id,
      brand: checkin.ezee_booking_cache.properties?.brand ?? 'TDS',
      roomNumber: checkin.ezee_booking_cache.room_number,
      roomNumbers: this.splitRooms(checkin.ezee_booking_cache.room_number),
      unitCode: checkin.ezee_booking_cache.unit_code,
    };
  }

  /** Parse a room value ("101" or the comma-joined "101, 102, 103") into a de-duped list. */
  private splitRooms(value: string | null): string[] {
    if (!value) return [];
    return Array.from(
      new Set(
        value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    );
  }

  // ─── staff shift commands (heist1.2) ────────────────────────────────────────

  /**
   * Detect a staff shift command in free text. Matches the keyword ANYWHERE in the
   * message, case-insensitive ("login", "please log in", "Logout now"). `logout`
   * wins if somehow both appear. Returns null when neither is present.
   */
  private parseStaffCommand(text: string): 'login' | 'logout' | null {
    const t = (text || '').toLowerCase();
    if (t.includes('logout') || /\blog\s+out\b/.test(t)) return 'logout';
    if (t.includes('login') || /\blog\s+in\b/.test(t)) return 'login';
    return null;
  }

  /**
   * Resolve a WhatsApp sender to an ACTIVE staff member of THIS brand, matched on the
   * last 10 digits (staff phones are stored full "91…", the sender id likewise; match
   * is format-agnostic). Scoped to the brand's properties so a TDS webhook can't clock
   * in a BUTEAK staffer. Only `is_active` rows match: a deactivated ("deleted") staffer
   * is intentionally NOT resolved here, so their number stops being treated as staff and
   * is free to be reused as a customer/guest.
   */
  private async resolveStaff(brand: string, waId: string) {
    const last10 = phoneLast10(waId);
    if (!last10) return null;
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT s.id
      FROM staff s
      JOIN properties p ON p.id = s.property_id
      WHERE upper(trim(p.brand)) = ${brand}
        AND s.is_active = true
        AND right(regexp_replace(coalesce(s.phone, ''), '[^0-9]', '', 'g'), 10) = ${last10}
      ORDER BY s.updated_at DESC
      LIMIT 1
    `;
    if (rows.length === 0) return null;
    return this.prisma.staff.findUnique({
      where: { id: rows[0].id },
      select: { id: true, name: true, property_id: true, is_active: true, is_available: true },
    });
  }

  /**
   * Apply a staff login/logout: flip `is_available` (on/off shift) and confirm. A
   * lightweight wa_service_request row is persisted so WATI retries dedupe. An
   * account an admin has disabled (is_active=false) cannot clock in.
   */
  private async handleStaffCommand(
    traceId: string,
    brand: string,
    msg: WatiInboundMessage,
    staff: { id: string; name: string; property_id: string; is_active: boolean; is_available: boolean },
    cmd: 'login' | 'logout',
  ) {
    const reqId = traceId;
    await this.prisma.wa_service_request.create({
      data: {
        id: reqId,
        brand,
        wa_id: msg.waId,
        wati_message_id: msg.messageId,
        property_id: staff.property_id,
        raw_text: msg.text,
        status: 'STAFF_CMD',
        intent: cmd === 'login' ? 'staff_login' : 'staff_logout',
      },
    });

    const goingOnShift = cmd === 'login';

    // A disabled account can't go on shift (admin marked them inactive).
    if (goingOnShift && !staff.is_active) {
      await this.replyAndLog(
        traceId,
        brand,
        msg.waId,
        `Hi ${staff.name}, your account is currently inactive, so you can't log in. Please ask your manager to reactivate it. 🙏`,
        'staff_login:inactive',
      );
      await this.flowLog.log({
        trace_id: traceId,
        brand,
        module: 'STAFF_CMD',
        input: msg.text,
        output: `login refused — ${staff.name} (${staff.id.slice(0, 8)}) is_active=false`,
        status: 'SKIP',
      });
      return { staff_command: cmd, staff_id: staff.id, applied: false, reason: 'inactive' };
    }

    // Idempotent: if they're already in the target state, tell them so (no-op write);
    // otherwise flip the flag and confirm the change.
    const alreadyInState = staff.is_available === goingOnShift;
    if (!alreadyInState) {
      await this.prisma.staff.update({
        where: { id: staff.id },
        data: { is_available: goingOnShift, updated_at: new Date() },
      });
    }

    let reply: string;
    if (alreadyInState) {
      reply = goingOnShift
        ? `You're already *logged in* and on shift, ${staff.name}. ✅`
        : `You're already *logged out*, ${staff.name}. 👋`;
    } else {
      reply = goingOnShift
        ? `✅ You're *logged in* and on shift, ${staff.name}. You'll now receive assigned requests.`
        : `👋 You're *logged out*, ${staff.name}. You won't receive new requests until you log in again.`;
    }
    await this.replyAndLog(traceId, brand, msg.waId, reply, `staff_${cmd}${alreadyInState ? ':noop' : ''}`);

    await this.flowLog.log({
      trace_id: traceId,
      brand,
      module: 'STAFF_CMD',
      input: msg.text,
      output: `${staff.name} (${staff.id.slice(0, 8)}) → ${
        goingOnShift ? 'ON shift (is_available=true)' : 'OFF shift (is_available=false)'
      }${alreadyInState ? ' (already)' : ''}`,
    });

    return { staff_command: cmd, staff_id: staff.id, applied: true, is_available: goingOnShift };
  }

  /**
   * A staff number sent something that ISN'T login/logout. Staff use this WhatsApp line
   * only to clock in/out — they never raise guest service requests here. Reply with a
   * fixed guardrail (no LLM classify, no ticket) and record the turn so it still appears
   * in the conversation log. A lightweight wa_service_request row (id = traceId, so the
   * flow log ties to it) is persisted for WATI-retry dedupe.
   */
  private async handleStaffNonCommand(
    traceId: string,
    brand: string,
    msg: WatiInboundMessage,
    staff: { id: string; name: string; property_id: string },
  ) {
    const reqId = traceId;
    await this.prisma.wa_service_request
      .create({
        data: {
          id: reqId,
          brand,
          wa_id: msg.waId,
          wati_message_id: msg.messageId,
          property_id: staff.property_id,
          raw_text: msg.text,
          status: 'STAFF_CMD',
          intent: 'staff_blocked',
        },
      })
      .catch(() => undefined);

    await this.replyAndLog(
      traceId,
      brand,
      msg.waId,
      `Hi ${staff.name}, this is a *staff* account — you can only *login* or *logout* from here.\n` +
        `Reply *login* to go on shift, or *logout* to go off shift.`,
      'staff_blocked',
    );

    await this.flowLog.log({
      trace_id: traceId,
      brand,
      module: 'STAFF_CMD',
      input: msg.text,
      output: `non-command from staff ${staff.name} (${staff.id.slice(0, 8)}) → guardrail reply`,
      status: 'SKIP',
    });

    return { staff_command: null, staff_id: staff.id, blocked: true };
  }

  private async loadCatalog(propertyId: string): Promise<ClassifierCatalogItem[]> {
    const rows = await this.prisma.product_catalog.findMany({
      where: { property_id: propertyId, is_active: true },
      select: { id: true, name: true, category: true },
      orderBy: { name: 'asc' },
    });
    return rows;
  }

  private async raiseTicket(
    ctx: { guestId: string; eri: string; propertyId: string; roomNumber: string | null; unitCode: string | null },
    department: string,
    subject: string,
    requestType: 'FREE' | 'BORROWABLE' | 'CHARGEABLE',
    taskCategory: string,
    waId: string,
    originalText?: string,
  ) {
    const guest = await this.prisma.guests.findUnique({
      where: { id: ctx.guestId },
      select: { phone: true, secondary_phone: true },
    });
    return this.tickets.createServiceRequest({
      property_id: ctx.propertyId,
      guest_id: ctx.guestId,
      // The guest's contact number for the "request received" WhatsApp. guests.phone
      // is often null (eZee stores it in secondary_phone), so fall back to the actual
      // WhatsApp sender id — always present and in WATI's expected format.
      guest_phone: guest?.phone ?? guest?.secondary_phone ?? waId,
      ezee_reservation_id: ctx.eri,
      department,
      // Subject carries BOTH our interpretation AND the guest's own words, e.g.
      // "Request for towel (I need a towel)", so staff can catch a misread / decode an
      // ambiguous ask from the raw message. See ticketSubject().
      subject: this.ticketSubject(subject, originalText),
      task_category: taskCategory,
      priority: 'MEDIUM',
      room_number: ctx.roomNumber,
      unit_code: ctx.unitCode,
      request_type: requestType,
      // The WhatsApp flow acks the guest synchronously (naming the assignee) via
      // ackTicketToGuest — stop the ops worker from sending a duplicate.
      notify_guest: false,
    });
  }

  /**
   * Build a staff-facing ticket subject that keeps the guest's ORIGINAL words alongside
   * our cleaned interpretation: `"Request for towel (I need a towel)"`. This lets staff
   * spot a misclassification or decode an ambiguous ask from the raw message. Collapses
   * to just the interpretation when the two are effectively the same (avoids
   * "Towel (towel)") or when there's no original text to append.
   */
  private ticketSubject(interpreted: string, original?: string): string {
    const clean = (interpreted || '').trim();
    const raw = (original || '').trim();
    if (!raw || clean.toLowerCase() === raw.toLowerCase() || clean.toLowerCase().includes(raw.toLowerCase())) {
      return clean.slice(0, 240);
    }
    return `${clean} (${raw})`.slice(0, 240);
  }

  /**
   * Send the guest ONE synchronous "request received" reply that NAMES the staff member
   * the ticket was assigned to (assignment is resolved synchronously in
   * createServiceRequest, so the returned ticket already carries assigned_staff_id).
   * When nobody could be assigned (truly unassigned/OPEN) we fall back to the Reception
   * reassurance. This is the sole guest ack for a WhatsApp-raised ticket — the ops worker
   * is suppressed (notify_guest:false) — so it's reliable regardless of worker/SQS timing.
   */
  private async ackTicketToGuest(
    traceId: string,
    brand: string,
    msg: WatiInboundMessage,
    ticket: { assigned_staff_id: string | null; room_number: string | null; task_category: string | null },
    displayRequest: string,
  ): Promise<void> {
    // UNFULFILLED — we don't offer this, or we couldn't tell what was asked. Someone will
    // still reply, but naming a staff member and saying "on it" would promise a delivery
    // that is never coming. Read the class off the ticket so every call site gets this
    // for free.
    if (ticket.task_category === UNFULFILLED_CLASS) {
      await this.replyAndLog(traceId, brand, msg.waId, GUEST_UNFULFILLED_ACK, 'ticket_ack:unfulfilled');
      return;
    }
    let staffName: string | null = null;
    if (ticket.assigned_staff_id) {
      const s = await this.prisma.staff.findUnique({
        where: { id: ticket.assigned_staff_id },
        select: { name: true },
      });
      staffName = s?.name ?? null;
    }
    const room = ticket.room_number ?? '';
    const req = (displayRequest || 'your request').trim().slice(0, 80);
    if (staffName) {
      const text =
        `✅ Got it! Your request *"${req}"* has been assigned to *${staffName}*` +
        `${room ? ` — Room ${room}` : ''}. Our team is on it. 🙌`;
      await this.replyAndLog(traceId, brand, msg.waId, text, 'ticket_ack:assigned');
    } else {
      // No one on the request's team was free → routed to Reception; keep the existing
      // reassurance so the guest still hears back.
      await this.replyAndLog(traceId, brand, msg.waId, GUEST_RECEPTION_ACK, 'ticket_ack:reception');
    }
  }

  /** Decrement a free COMMODITY's stock under a row lock. Returns false if OOS. */
  private async decrementFreeCommodity(productId: string, propertyId: string): Promise<boolean> {
    const inv = await this.prisma.inventory.findFirst({
      where: { product_id: productId, property_id: propertyId },
      select: { id: true },
    });
    if (!inv) return false;
    try {
      return await this.prisma.$transaction(async (tx) => {
        const locked = await tx.$queryRawUnsafe<{ available_stock: number }[]>(
          `SELECT available_stock FROM inventory WHERE id = $1 FOR UPDATE`,
          inv.id,
        );
        if (!locked[0] || locked[0].available_stock <= 0) return false;
        await tx.inventory.update({
          where: { id: inv.id },
          data: { available_stock: { decrement: 1 }, sold_count: { increment: 1 } },
        });
        return true;
      });
    } catch (e) {
      this.logger.error(`Free commodity decrement failed (${productId}): ${(e as Error).message}`);
      return false;
    }
  }

  /** Create a single-item PENDING addon cart to back a WhatsApp paid request. */
  private async createSingleItemCart(
    ctx: { guestId: string; eri: string },
    productId: string,
    unitPrice: number,
  ): Promise<string> {
    const orderId = uuidv4();
    await this.prisma.addon_orders.create({
      data: {
        id: orderId,
        ezee_reservation_id: ctx.eri,
        guest_id: ctx.guestId,
        phase: 'DURING_STAY',
        status: 'PENDING',
        addon_order_items: {
          create: {
            id: uuidv4(),
            product_id: productId,
            quantity: 1,
            unit_price: unitPrice,
            total_price: unitPrice,
          },
        },
      },
    });
    return orderId;
  }

  /**
   * Non-guest (prospect) front door.
   *
   * Step 1 — resolve WHICH property they mean (auto for single-property brands like
   * TDS; a `property_selector_v3` tap for multi-property brands like BUTEAK). If still
   * unknown, ProspectService has sent the selector and we wait.
   *
   * Step 2 — act on the question (their current message, or the one stashed before a
   * property tap):
   *   • greeting → greet back.
   *   • booking  → point them at the brand's booking site.
   *   • question → ask the property chatbot; if it answers, send that; otherwise tell
   *                them reception will follow up AND notify the bottom of the escalation
   *                ladder (L1) so a human replies on WATI. No ticket is created.
   */
  private async handleProspect(traceId: string, brand: string, msg: WatiInboundMessage) {
    const resolution = await this.prospect.resolveForInbound(traceId, brand, msg);

    if (resolution.state === 'awaiting_selection') {
      await this.recordDropped(traceId, brand, msg, 'prospect_awaiting_property');
      return { prospect: true, awaiting_property: true };
    }

    const { propertyId, propertyName, pendingQuery, viaSelectionTap } = resolution;
    // A bare property tap with nothing asked yet → invite them to ask.
    const question = (pendingQuery ?? msg.text ?? '').trim();
    if (viaSelectionTap && !question) {
      await this.replyAndLog(
        traceId,
        brand,
        msg.waId,
        `Thanks! How can we help you with ${propertyName}? 💬`,
        'prospect_property_ack',
      );
      await this.recordProspect(traceId, brand, msg, propertyId, 'prospect_property_ack');
      return { prospect: true, property_id: propertyId, awaiting_question: true };
    }

    const intent = await this.flowLog.timed(
      { trace_id: traceId, brand, module: 'PROSPECT_CLASSIFY', input: question },
      () => this.llm.classifyProspectMessage(question),
      (i) => `intent=${i}`,
    );

    if (intent === 'greeting') {
      await this.replyAndLog(
        traceId,
        brand,
        msg.waId,
        `Hi! 👋 Welcome to ${brandDisplayName(brand)}. How can we help you today? 💬`,
        'prospect_greeting',
      );
      await this.recordProspect(traceId, brand, msg, propertyId, 'prospect_greeting');
      return { prospect: true, property_id: propertyId, intent };
    }

    if (intent === 'booking') {
      await this.replyAndLog(
        traceId,
        brand,
        msg.waId,
        `You can explore rooms and book directly at ${brandBookingUrl(brand)} 🛏️\n` +
          `If you'd like a hand, just reply here and our team will help. 🙏`,
        'prospect_booking',
      );
      await this.recordProspect(traceId, brand, msg, propertyId, 'prospect_booking');
      return { prospect: true, property_id: propertyId, intent };
    }

    // intent === 'service' → a non-guest is asking us to DO something now (a towel, cleaning,
    // a repair). The chatbot must NOT field this — it only ever deflects ("use the service
    // platform"), which is exactly the wrong answer here. Skip the bot and page a human at
    // L1 (reception): this is often a genuine in-house guest messaging from a number that
    // isn't linked to their booking, so a person needs to look. No ticket.
    if (intent === 'service') {
      await this.replyAndLog(
        traceId,
        brand,
        msg.waId,
        `Thanks for reaching out! 🙏 Our reception team will get back to you shortly to help with this.`,
        'prospect_service_escalated',
      );
      await this.prospect.notifyUnanswered(traceId, brand, propertyId, propertyName, {
        name: msg.senderName ?? '',
        phone: msg.waId,
        question,
      });
      await this.recordProspect(traceId, brand, msg, propertyId, 'prospect_service_escalated');
      return { prospect: true, property_id: propertyId, intent, escalated: true };
    }

    // intent === 'question' → try the property chatbot first.
    const bot = await this.flowLog.timed(
      { trace_id: traceId, brand, module: 'PROSPECT_CHATBOT', input: question },
      () => this.prospect.askChatbot(propertyId, question),
      (b) => (b.answered ? 'answered from knowledge base' : 'no confident answer'),
    );

    if (bot.answered && bot.answer) {
      await this.replyAndLog(traceId, brand, msg.waId, bot.answer, 'prospect_answered');
      await this.recordProspect(traceId, brand, msg, propertyId, 'prospect_answered');
      return { prospect: true, property_id: propertyId, intent, answered: true };
    }

    // Not answerable by the bot → reassure the prospect and page the bottom of the ladder.
    await this.replyAndLog(
      traceId,
      brand,
      msg.waId,
      `Thanks for reaching out! 🙏 Our reception team will get back to you shortly regarding your query.`,
      'prospect_reception_ack',
    );
    await this.prospect.notifyUnanswered(traceId, brand, propertyId, propertyName, {
      name: msg.senderName ?? '',
      phone: msg.waId,
      question,
    });
    await this.recordProspect(traceId, brand, msg, propertyId, 'prospect_escalated');
    return { prospect: true, property_id: propertyId, intent, answered: false, escalated: true };
  }

  /**
   * Persist a prospect turn as a wa_service_request shell (property-scoped, no guest).
   * `id = traceId` so the conversation row ties to the same flow log (WA_INBOUND →
   * IDENTITY → PROSPECT_* → GUEST_REPLY) the admin conversation viewer reads by trace_id;
   * a fresh uuid here would orphan the trace and make the non-guest chat look unlogged.
   */
  private async recordProspect(
    traceId: string,
    brand: string,
    msg: WatiInboundMessage,
    propertyId: string,
    intent: string,
  ) {
    await this.prisma.wa_service_request
      .create({
        data: {
          id: traceId,
          brand,
          wa_id: msg.waId,
          wati_message_id: msg.messageId,
          property_id: propertyId,
          raw_text: msg.text,
          status: 'PROSPECT',
          intent,
        },
      })
      .catch(() => undefined);
  }

  /** Record a dropped/awaiting turn. `id = traceId` ties it to its flow-log trace. */
  private async recordDropped(
    traceId: string,
    brand: string,
    msg: WatiInboundMessage,
    reason: string,
  ) {
    await this.prisma.wa_service_request
      .create({
        data: {
          id: traceId,
          brand,
          wa_id: msg.waId,
          wati_message_id: msg.messageId,
          raw_text: msg.text,
          status: 'DROPPED',
          intent: reason,
        },
      })
      .catch(() => undefined);
  }

  private async finish(reqId: string, status: string) {
    await this.prisma.wa_service_request
      .update({ where: { id: reqId }, data: { status } })
      .catch(() => undefined);
  }

  /**
   * Send a guest-facing WhatsApp session reply AND record it in the flow log with
   * the WATI delivery status — so EVERY conversation route (not just ticketed ones)
   * has a complete, viewable trace ending in what we replied and whether it sent.
   */
  private async replyAndLog(
    traceId: string,
    brand: string,
    waId: string,
    text: string,
    route: string,
  ): Promise<{ ok: boolean; skipped?: boolean }> {
    const res = await this.wati.sendSessionMessage(brand, waId, text);
    await this.flowLog.log({
      trace_id: traceId,
      brand,
      module: 'GUEST_REPLY',
      input: route,
      output: `"${text.replace(/\s+/g, ' ').slice(0, 90)}" → ${waId} [${res.ok ? 'sent' : res.skipped ? 'skipped(no WATI creds)' : 'FAILED'}]`,
      status: res.ok ? 'OK' : res.skipped ? 'SKIP' : 'ERROR',
    });
    return res;
  }

  /** Human label for the message-type classifier row in the flow log. */
  private intentLabel(intent: string): string {
    switch (intent) {
      case 'request_new':
        return 'SERVICE REQUEST (new)';
      case 'request_update':
        return 'status check / follow-up';
      case 'faq':
        return 'FAQ / info question';
      case 'breakfast':
        return 'breakfast order (→ send link)';
      case 'greeting_hello':
        return 'greeting';
      case 'greeting_acknowledge':
        return 'acknowledgement';
      case 'feedback':
        return 'feedback';
      case 'booking_confirm':
        return 'booking confirm';
      case 'booking_deny':
        return 'booking deny';
      case 'unclear':
        return 'unclear (ask to rephrase)';
      default:
        return 'ambiguous (→ reception)';
    }
  }

  /** Session-message reply for the non-actionable intents (everything but request_new). */
  private replyForIntent(intent: string): string {
    switch (intent) {
      case 'greeting_hello':
        return 'Hi! How can we help with your stay? Just tell us what you need and we’ll take care of it.';
      case 'greeting_acknowledge':
        return 'You’re welcome! 🙏 We’re here if you need anything else.';
      case 'feedback':
        return 'Thank you for the feedback — we really appreciate it! 🙏';
      case 'request_update':
        return 'Thanks for checking in — our team is on it and will update you shortly.';
      case 'booking_confirm':
        return 'Thanks for confirming! Your booking details are noted. See you soon. 🙌';
      case 'booking_deny':
        return 'Thanks for letting us know — our reception team will reach out to correct your booking details.';
      default: // ambiguous
        return 'Sorry, I didn’t quite catch that. Could you tell us a bit more about what you need (e.g. “please send a towel”)?';
    }
  }

  /**
   * Guest-facing phrasing for a ticket's status. Guests read OPEN / PENDING /
   * IN_PROGRESS as the same thing — "it's being handled" — so showing a different
   * phrase per internal status made the bot look inconsistent (a PENDING item
   * "will be picked up shortly" vs an IN_PROGRESS one "our staff is on it"), which
   * reads as untrustworthy. Collapse every non-terminal state into one calm line;
   * only COMPLETED differs.
   */
  private statusLabel(status: string): string {
    return status === 'COMPLETED' ? 'completed' : 'being taken care of by our team';
  }

  /**
   * True when `productName` plausibly refers to what the guest asked for — i.e. a
   * meaningful word of the product name appears in the guest's request. Guards
   * against the classifier force-fitting a request onto an unrelated catalog row
   * (charging for a product the guest never named). Tolerant of simple plurals
   * ("towels" ⊇ "towel"); ignores filler/quantity words. Fails OPEN (returns true)
   * when there's nothing meaningful to compare, so it only ever blocks a CLEAR
   * mismatch — a wrongly-blocked item still gets raised as a normal ticket.
   */
  private productMatchesRequest(productName: string, ...texts: string[]): boolean {
    const stop = new Set([
      'a', 'an', 'the', 'me', 'my', 'mine', 'i', 'we', 'us', 'you', 'your', 'please',
      'pls', 'send', 'bring', 'need', 'needs', 'want', 'wants', 'get', 'got', 'give',
      'can', 'could', 'would', 'some', 'any', 'for', 'to', 'of', 'and', 'with', 'in',
      'on', 'at', 'is', 'are', 'it', 'room', 'have', 'has', 'like', 'kindly', 'do',
      'now', 'asap', 'here', 'there', 'extra', 'more', 'one', 'two', 'this', 'that',
    ]);
    const toTokens = (s: string) =>
      (s || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length >= 3 && !stop.has(t) && !/^\d+$/.test(t));
    const nameTokens = toTokens(productName);
    if (nameTokens.length === 0) return true; // nothing meaningful to check → don't block
    const reqTokens = toTokens(texts.join(' '));
    if (reqTokens.length === 0) return true;
    return nameTokens.some((n) =>
      reqTokens.some((r) => r === n || r.includes(n) || n.includes(r)),
    );
  }
}
