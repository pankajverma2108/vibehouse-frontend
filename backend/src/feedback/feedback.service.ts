import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { SqsProducerService } from '../sqs/sqs-producer.service';
import { ZohoDeskService } from '../zoho-desk/zoho-desk.service';
import { FlowLogService } from '../flow-log/flow-log.service';
import { toIstString } from '../common/utils/time.util';
import { resolveTemplate } from '../wati/wati-templates';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { feedbackCustomFields, ratingForSentiment } from './feedback-fields';

// WATI feedback templates are resolved per-brand (src/wati/wati-templates.ts):
//   FEEDBACK_LINK    — carries the 1-5 star feedback link (legacy channel).
//   FEEDBACK_BUTTONS — two quick-reply buttons ("Good" / "Bad"), the default CSAT
//                      prompt. Body params: guest_name, request, room_no.
// Registered per-brand tenant; only BUTEAK overrides via WATI_BUTEAK_TPL_*.

export type FeedbackState = 'valid' | 'expired' | 'used' | 'not_found';

/** A pending Good/Bad feedback for a guest, and where it is in the two-step flow. */
export interface PendingFeedback {
  id: string;
  ticket_id: string;
  brand: string;
  /** 'rating' = waiting for the Good/Bad tap; 'comment' = tapped, waiting for a review. */
  stage: 'rating' | 'comment';
  rated_at: Date | null;
}

export interface FeedbackView {
  ok: boolean;
  state: FeedbackState;
  brand?: string;
  room_no?: string | null;
  request?: string | null;
  staff_name?: string | null;
  submitted_at?: string | null;
  submitted_at_ist?: string | null;
}

/**
 * FeedbackService — post-completion guest CSAT.
 *
 * On ticket completion we mint a single-use, high-entropy token, store only its
 * SHA-256 (never the raw token), and send the guest a WATI template whose dynamic
 * URL-button suffix IS that token → the FE hosts /feedback/:token. The guest rates
 * 1–5 + optional comment; we persist it once (submitted_at guard), then mirror it
 * onto the Zoho Desk ticket's cf_feedback_rating + cf_feedback_remark fields
 * (plus a private comment as an activity-feed trail).
 *
 * Zoho Desk has no API to submit its native Happiness Rating on a customer's behalf,
 * so this "own the link, write the result back" flow is the supported pattern.
 */
@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sqs: SqsProducerService,
    private readonly zohoDesk: ZohoDeskService,
    private readonly flowLog: FlowLogService,
  ) {}

  private ttlDays(): number {
    const n = Number(process.env.FEEDBACK_LINK_TTL_DAYS);
    return Number.isFinite(n) && n > 0 ? n : 7;
  }

  /**
   * Seconds to hold the feedback invite back so it always lands AFTER the
   * "task completed" message (both share the unordered NOTIFY queue). Default 8s.
   */
  private inviteDelaySeconds(): number {
    const n = Number(process.env.FEEDBACK_DELAY_SECONDS);
    return Number.isFinite(n) && n >= 0 ? n : 8;
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private stateOf(row: { submitted_at: Date | null; expires_at: Date }): FeedbackState {
    if (row.submitted_at) return 'used';
    if (row.expires_at.getTime() < Date.now()) return 'expired';
    return 'valid';
  }

  /**
   * Mint a feedback token for a just-completed ticket and send the guest the
   * feedback WATI template. Best-effort: never throws (completion must not fail
   * because feedback couldn't be queued). No-op when FEEDBACK_ENABLED=false, when
   * the ticket has no guest, or when we have no phone to reach them on.
   */
  async issueInvite(
    ticket: {
      id: string;
      zoho_ticket_id: string | null;
      guest_id: string | null;
      room_number: string | null;
      subject: string | null;
    },
    brand: string,
    guest: { name: string; phone: string | null },
    guestPhoneOverride?: string | null,
  ): Promise<void> {
    try {
      if (process.env.FEEDBACK_ENABLED === 'false') return;
      const phone = guestPhoneOverride ?? guest.phone ?? undefined;
      if (!ticket.guest_id || !phone) return;

      const token = randomBytes(32).toString('hex'); // 256-bit, URL-safe (hex)
      const now = new Date();
      const expires = new Date(now.getTime() + this.ttlDays() * 24 * 60 * 60_000);

      await this.prisma.ticket_feedback.create({
        data: {
          id: uuidv4(),
          ticket_id: ticket.id,
          zoho_ticket_id: ticket.zoho_ticket_id ?? null,
          guest_id: ticket.guest_id,
          brand,
          token_hash: this.hash(token),
          expires_at: expires,
        },
      });

      await this.sqs.sendNotifyGuest(
        {
          guest_id: ticket.guest_id,
          guest_phone: phone,
          brand,
          template: resolveTemplate(brand, 'FEEDBACK_LINK'),
          variables: {
            guest_name: guest.name,
            request: ticket.subject ?? 'your request',
            room_no: ticket.room_number ?? 'NA',
            '1': token, // dynamic URL-button suffix → <brand-domain>/feedback/<token>
          },
        },
        // Delay so the invite arrives AFTER the "task completed" message.
        this.inviteDelaySeconds(),
      );

      await this.flowLog.log({
        trace_id: ticket.id,
        ticket_id: ticket.id,
        brand,
        module: 'FEEDBACK_INVITE',
        output: `feedback link queued → ${phone} (expires ${toIstString(expires)})`,
      });
    } catch (err) {
      this.logger.warn(`issueInvite failed for ticket ${ticket.id}: ${(err as Error).message}`);
    }
  }

  // ─── WhatsApp Good/Bad button flow ──────────────────────────────────────────

  /** Minutes after the Good/Bad tap during which the next guest reply is captured as the review. */
  private commentWindowMin(): number {
    const n = Number(process.env.FEEDBACK_COMMENT_WINDOW_MIN);
    return Number.isFinite(n) && n > 0 ? n : 360; // 6h
  }

  /**
   * Normalise a guest reply to 'Good' | 'Bad' | null. Accepts the quick-reply
   * button title (which may carry an emoji, e.g. "👍 Good") or a typed word, but
   * ONLY an exact one-word good/bad — so a review like "not bad" or "very good
   * service" is NOT mistaken for a button tap (it flows on as a normal message).
   */
  static toSentiment(text: string): 'Good' | 'Bad' | null {
    const t = (text || '').toLowerCase().replace(/[^a-z]/g, '');
    if (t === 'good' || t === 'excellent') return 'Good';
    if (t === 'bad' || t === 'poor') return 'Bad';
    return null;
  }

  /**
   * On completion, send the Good/Bad button template and open a pending feedback
   * row (sentiment/rated_at null = awaiting the tap). Best-effort; never throws.
   * A token is still minted only to satisfy the NOT NULL unique column — it is
   * never sent anywhere in this flow (there is no link).
   */
  async issueButtonInvite(
    ticket: {
      id: string;
      zoho_ticket_id: string | null;
      guest_id: string | null;
      room_number: string | null;
      subject: string | null;
    },
    brand: string,
    guest: { name: string; phone: string | null },
    guestPhoneOverride?: string | null,
  ): Promise<void> {
    try {
      if (process.env.FEEDBACK_ENABLED === 'false') return;
      const phone = guestPhoneOverride ?? guest.phone ?? undefined;
      if (!ticket.guest_id || !phone) return;

      const now = new Date();
      const expires = new Date(now.getTime() + this.ttlDays() * 24 * 60 * 60_000);

      await this.prisma.ticket_feedback.create({
        data: {
          id: uuidv4(),
          ticket_id: ticket.id,
          zoho_ticket_id: ticket.zoho_ticket_id ?? null,
          guest_id: ticket.guest_id,
          brand,
          token_hash: this.hash(randomBytes(32).toString('hex')), // unused; column is NOT NULL
          expires_at: expires,
        },
      });

      await this.sqs.sendNotifyGuest(
        {
          guest_id: ticket.guest_id,
          guest_phone: phone,
          brand,
          template: resolveTemplate(brand, 'FEEDBACK_BUTTONS'),
          variables: {
            guest_name: guest.name,
            request: ticket.subject ?? 'your request',
            room_no: ticket.room_number ?? 'NA',
          },
        },
        // Delay so the prompt arrives AFTER the "task completed" message.
        this.inviteDelaySeconds(),
      );

      await this.flowLog.log({
        trace_id: ticket.id,
        ticket_id: ticket.id,
        brand,
        module: 'FEEDBACK_INVITE',
        output: `Good/Bad prompt queued → ${phone}`,
      });
    } catch (err) {
      this.logger.warn(`issueButtonInvite failed for ticket ${ticket.id}: ${(err as Error).message}`);
    }
  }

  /**
   * The guest's most recent still-open feedback (not submitted, not expired) and
   * which step it's on: 'rating' (awaiting Good/Bad) or 'comment' (tapped, awaiting
   * a review). Returns null when there's nothing pending. Never throws.
   */
  async findPendingForGuest(guestId: string): Promise<PendingFeedback | null> {
    try {
      const row = await this.prisma.ticket_feedback.findFirst({
        where: { guest_id: guestId, submitted_at: null, expires_at: { gt: new Date() } },
        orderBy: { created_at: 'desc' },
        select: { id: true, ticket_id: true, brand: true, sentiment: true, rated_at: true },
      });
      if (!row) return null;
      return {
        id: row.id,
        ticket_id: row.ticket_id,
        brand: row.brand,
        stage: row.sentiment ? 'comment' : 'rating',
        rated_at: row.rated_at,
      };
    } catch (err) {
      this.logger.warn(`findPendingForGuest failed for ${guestId}: ${(err as Error).message}`);
      return null;
    }
  }

  /** True while the guest's next reply after tapping should still be captured as a review. */
  commentWindowOpen(pending: PendingFeedback): boolean {
    if (pending.stage !== 'comment' || !pending.rated_at) return false;
    return Date.now() - pending.rated_at.getTime() <= this.commentWindowMin() * 60_000;
  }

  /**
   * Record the tapped Good/Bad, atomically (only the first tap wins), and mirror it
   * onto the Zoho ticket's cf_feedback_sentiment field (+ an activity-feed comment).
   * Leaves submitted_at null: the row now awaits an optional review remark.
   * Returns false if it was already rated (a duplicate tap) or gone.
   */
  async recordSentiment(feedbackId: string, sentiment: 'Good' | 'Bad'): Promise<boolean> {
    const claim = await this.prisma.ticket_feedback.updateMany({
      where: { id: feedbackId, sentiment: null, submitted_at: null },
      data: { sentiment, rated_at: new Date() },
    });
    if (claim.count === 0) return false;

    const row = await this.prisma.ticket_feedback.findUnique({
      where: { id: feedbackId },
      select: { ticket_id: true, brand: true },
    });
    const zohoTicketId = await this.liveZohoId(row?.ticket_id);
    if (zohoTicketId) {
      // Write BOTH fields. `cf_feedback_sentiment` is a Picklist whose only values are
      // literally "Good" and "Bad", so the tap maps onto it verbatim — it went unwritten
      // for a while on the mistaken belief the field was missing, which is why closed
      // tickets showed a remark and a rating over an empty sentiment column.
      const ratingValue = ratingForSentiment(sentiment) ?? 0;
      const patched = await this.zohoDesk
        .updateTicket(zohoTicketId, { customFields: feedbackCustomFields({ sentiment }) })
        .catch(() => false);
      await this.zohoDesk
        .addComment(zohoTicketId, `WhatsApp guest feedback: ${sentiment === 'Good' ? '👍' : '👎'} ${sentiment} (rating ${ratingValue}/5)`, false)
        .catch(() => undefined);
      if (patched) {
        await this.prisma.ticket_feedback
          .update({ where: { id: feedbackId }, data: { pushed_to_zoho: true } })
          .catch(() => undefined);
      }
    }
    if (row) {
      await this.flowLog.log({
        trace_id: row.ticket_id,
        ticket_id: row.ticket_id,
        brand: row.brand,
        module: 'FEEDBACK_SUBMIT',
        output: `sentiment=${sentiment}`,
      });
    }
    return true;
  }

  /**
   * APPEND a review line to the remark (a guest may send several: "was fast" then
   * "actually, okay") and keep the feedback OPEN so more can land within the window —
   * we tolerate the noise. The append is atomic (SQL concat) so rapid replies can't
   * clobber each other, and capped at 2000 chars. Mirrors the FULL multiline remark
   * onto cf_feedback_remark (+ the new line as an activity comment). Returns whether
   * this was the FIRST line (so the caller only thanks once). Does NOT set submitted_at
   * — the window is closed by finalizeWithoutComment (new ask) or by simply expiring.
   */
  async recordRemark(feedbackId: string, comment: string): Promise<{ recorded: boolean; first: boolean }> {
    const add = comment.trim().slice(0, 1900);
    if (!add) return { recorded: false, first: false };

    const before = await this.prisma.ticket_feedback.findUnique({
      where: { id: feedbackId },
      select: { comment: true, submitted_at: true, ticket_id: true, brand: true, sentiment: true },
    });
    if (!before || before.submitted_at) return { recorded: false, first: false }; // window closed
    const first = !before.comment;

    // Atomic append: prepend a newline only when there is existing text; hard-cap 2000.
    await this.prisma.$executeRaw`
      UPDATE ticket_feedback
         SET comment = left(
               coalesce(comment, '') ||
               CASE WHEN comment IS NULL OR comment = '' THEN '' ELSE E'\n' END ||
               ${add},
               2000)
       WHERE id = ${feedbackId} AND submitted_at IS NULL`;

    const after = await this.prisma.ticket_feedback.findUnique({
      where: { id: feedbackId },
      select: { comment: true },
    });
    const full = after?.comment ?? add;

    const zohoTicketId = await this.liveZohoId(before.ticket_id);
    if (zohoTicketId) {
      // Re-send the sentiment alongside the remark. Same values, so it's a no-op when the
      // tap already landed — but it repairs the case where the tap's PATCH failed or hit a
      // still-placeholder Zoho id, which would otherwise strand the sentiment forever
      // while the remark (written later, against the real id) went in fine.
      await this.zohoDesk
        .updateTicket(zohoTicketId, {
          customFields: feedbackCustomFields({ sentiment: before.sentiment, comment: full }),
        })
        .catch(() => undefined);
      await this.zohoDesk
        .addComment(zohoTicketId, `WhatsApp guest review${before.sentiment ? ` (${before.sentiment})` : ''}: "${add}"`, false)
        .catch(() => undefined);
    }
    await this.flowLog.log({
      trace_id: before.ticket_id,
      ticket_id: before.ticket_id,
      brand: before.brand,
      module: 'FEEDBACK_SUBMIT',
      output: `remark ${first ? 'recorded' : 'appended'} (+${add.length} chars, ${full.length} total)`,
    });
    return { recorded: true, first };
  }

  /** Close a rated feedback with no review (the guest moved on to a new request). */
  async finalizeWithoutComment(feedbackId: string): Promise<void> {
    await this.prisma.ticket_feedback
      .updateMany({ where: { id: feedbackId, submitted_at: null }, data: { submitted_at: new Date() } })
      .catch(() => undefined);
  }

  /**
   * Resolve the LIVE Zoho id from the ticket row (not the invite-time snapshot) so a
   * fast request→complete race that froze a "SVC-" placeholder doesn't no-op the write.
   */
  private async liveZohoId(ticketId: string | undefined | null): Promise<string | null> {
    if (!ticketId) return null;
    const ref = await this.prisma.zoho_ticket_ref.findUnique({
      where: { id: ticketId },
      select: { zoho_ticket_id: true },
    });
    return ref?.zoho_ticket_id ?? null;
  }

  /** Validate a token and return the ticket context for the FE to render. Read-only. */
  async getByToken(token: string): Promise<FeedbackView> {
    const row = await this.prisma.ticket_feedback.findUnique({
      where: { token_hash: this.hash(token) },
    });
    if (!row) return { ok: false, state: 'not_found' };

    const state = this.stateOf(row);
    const ticket = await this.prisma.zoho_ticket_ref.findUnique({
      where: { id: row.ticket_id },
      select: {
        room_number: true,
        subject: true,
        assigned_staff_id: true,
        assigned_staff_name: true,
      },
    });
    let staffName = 'our team';
    if (ticket?.assigned_staff_id) {
      const s = await this.prisma.staff.findUnique({
        where: { id: ticket.assigned_staff_id },
        select: { name: true },
      });
      staffName = s?.name ?? staffName;
    }
    // Staff row deleted since the ticket closed — fall back to the name pinned on the ticket.
    if (staffName === 'our team' && ticket?.assigned_staff_name) {
      staffName = ticket.assigned_staff_name;
    }
    const view: FeedbackView = {
      ok: state === 'valid',
      state,
      brand: row.brand,
      room_no: ticket?.room_number ?? null,
      request: ticket?.subject ?? null,
      staff_name: staffName,
      submitted_at: row.submitted_at?.toISOString() ?? null,
      submitted_at_ist: toIstString(row.submitted_at),
    };
    return view;
  }

  /**
   * Resolve the ZohoTicketRef associated with a feedback row's ticket_id.
   * Used internally by submit() to enrich the success response.
   */
  private async ticketContextForRow(row: { ticket_id: string }): Promise<{
    room_number: string | null;
    subject: string | null;
  } | null> {
    return this.prisma.zoho_ticket_ref.findUnique({
      where: { id: row.ticket_id },
      select: { room_number: true, subject: true },
    });
  }

  /**
   * Record the guest's rating exactly once (atomic submitted_at guard), then mirror
   * it onto the Zoho ticket's cf_feedback_rating + cf_feedback_remark fields.
   */
  async submit(token: string, dto: SubmitFeedbackDto): Promise<FeedbackView> {
    const row = await this.prisma.ticket_feedback.findUnique({
      where: { token_hash: this.hash(token) },
    });
    if (!row) return { ok: false, state: 'not_found' };

    const state = this.stateOf(row);
    if (state !== 'valid') return { ok: false, state };

    // Atomic single-use claim: only the first submit whose row is still unsubmitted
    // wins. A concurrent second POST updates 0 rows and is treated as already-used.
    const claim = await this.prisma.ticket_feedback.updateMany({
      where: { id: row.id, submitted_at: null },
      data: {
        rating: dto.rating,
        comment: dto.comment ?? null,
        submitted_at: new Date(),
      },
    });
    if (claim.count === 0) return { ok: false, state: 'used' };

    // Resolve the LIVE Zoho id from the ticket row, not the snapshot taken at
    // invite time. A fast request→complete race can freeze the "SVC-" placeholder
    // into this row before the ops worker writes the real numeric id back; reading
    // the ticket row now picks up the real id so the write-back actually lands.
    const liveRef = await this.prisma.zoho_ticket_ref.findUnique({
      where: { id: row.ticket_id },
      select: { zoho_ticket_id: true },
    });
    const zohoTicketId = liveRef?.zoho_ticket_id ?? row.zoho_ticket_id;

    // Best-effort write-back to Zoho Desk (never blocks the guest's success response).
    // Rating + remark land in their dedicated fields, and the star score is also mapped
    // onto the Good/Bad picklist so this channel and the button channel report together;
    // a 3 carries no sentiment (see feedback-fields.ts). We also drop a private comment
    // as an activity-feed trail.
    if (zohoTicketId) {
      const stars = '⭐'.repeat(dto.rating);
      const body =
        `WhatsApp guest feedback: ${stars} ${dto.rating}/5` +
        (dto.comment ? ` — ${dto.comment}` : '');
      const patched = await this.zohoDesk
        .updateTicket(zohoTicketId, {
          customFields: feedbackCustomFields({ rating: dto.rating, comment: dto.comment }),
        })
        .catch(() => false);
      const commented = await this.zohoDesk
        .addComment(zohoTicketId, body, false)
        .catch(() => false);
      if (commented || patched) {
        await this.prisma.ticket_feedback
          .update({ where: { id: row.id }, data: { pushed_to_zoho: true } })
          .catch(() => undefined);
      }
    }

    await this.flowLog.log({
      trace_id: row.ticket_id,
      ticket_id: row.ticket_id,
      brand: row.brand,
      module: 'FEEDBACK_SUBMIT',
      output: `rating=${dto.rating}/5${dto.comment ? ' +comment' : ''}`,
    });

    // Return full FeedbackView (= FeedbackSubmitResponse on the FE) so the FE can
    // render the thank-you screen without a second GET.
    const submittedRow = await this.prisma.ticket_feedback.findUnique({
      where: { id: row.id },
      select: { submitted_at: true, brand: true },
    });
    const ticketCtx = await this.ticketContextForRow(row);
    return {
      ok: true,
      state: 'valid' as FeedbackState,
      brand: submittedRow?.brand ?? row.brand,
      room_no: ticketCtx?.room_number ?? null,
      request: ticketCtx?.subject ?? null,
      submitted_at: submittedRow?.submitted_at?.toISOString() ?? null,
      submitted_at_ist: toIstString(submittedRow?.submitted_at ?? null),
    };
  }

  // ─── Admin helpers ──────────────────────────────────────────────────────────

  /**
   * Paginated list of submitted feedback rows for admin review.
   * Filters: brand, min_rating, max_rating, submitted (boolean).
   */
  async listFeedback(filters: {
    brand?: string;
    min_rating?: number;
    max_rating?: number;
    submitted?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    items: Array<{
      id: string;
      ticket_id: string;
      brand: string;
      guest_id: string | null;
      rating: number | null;
      sentiment: string | null;
      comment: string | null;
      submitted_at: string | null;
      submitted_at_ist: string | null;
      created_at: string;
    }>;
    pagination: { page: number; limit: number; total: number; total_pages: number };
  }> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (filters.brand) where['brand'] = filters.brand;
    if (filters.min_rating != null || filters.max_rating != null) {
      where['rating'] = {
        ...(filters.min_rating != null ? { gte: filters.min_rating } : {}),
        ...(filters.max_rating != null ? { lte: filters.max_rating } : {}),
      };
    }
    if (filters.submitted === true) where['submitted_at'] = { not: null };
    if (filters.submitted === false) where['submitted_at'] = null;

    const [rows, total] = await Promise.all([
      this.prisma.ticket_feedback.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          ticket_id: true,
          brand: true,
          guest_id: true,
          rating: true,
          sentiment: true,
          comment: true,
          submitted_at: true,
          created_at: true,
        },
      }),
      this.prisma.ticket_feedback.count({ where }),
    ]);

    return {
      items: rows.map((r) => ({
        ...r,
        submitted_at: r.submitted_at?.toISOString() ?? null,
        submitted_at_ist: toIstString(r.submitted_at),
        created_at: r.created_at.toISOString(),
      })),
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Aggregated CSAT stats across all submitted feedback for admin dashboard.
   */
  async getFeedbackStats(brand?: string): Promise<{
    total_feedback: number;
    total_submitted: number;
    avg_rating: number | null;
    csat_score_pct: number | null;
    star_breakdown: Record<string, number>;
    good_count: number;
    bad_count: number;
  }> {
    const brandFilter = brand ? { brand } : {};
    const submittedFilter = { submitted_at: { not: null } };

    const [total_feedback, total_submitted, submittedRows] = await Promise.all([
      this.prisma.ticket_feedback.count({ where: brandFilter }),
      this.prisma.ticket_feedback.count({ where: { ...brandFilter, ...submittedFilter } }),
      this.prisma.ticket_feedback.findMany({
        where: { ...brandFilter, ...submittedFilter },
        select: { rating: true, sentiment: true },
      }),
    ]);

    const star_breakdown: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    let rating_sum = 0;
    let rating_count = 0;
    let good_count = 0;
    let bad_count = 0;

    for (const row of submittedRows) {
      if (row.rating != null) {
        const key = String(row.rating);
        star_breakdown[key] = (star_breakdown[key] ?? 0) + 1;
        rating_sum += row.rating;
        rating_count++;
        if (row.rating >= 4) good_count++;
        if (row.rating <= 2) bad_count++;
      }
      if (row.sentiment === 'Good') good_count++;
      if (row.sentiment === 'Bad') bad_count++;
    }

    const avg_rating = rating_count > 0 ? Math.round((rating_sum / rating_count) * 100) / 100 : null;
    const csat_denominator = good_count + bad_count;
    const csat_score_pct = csat_denominator > 0 ? Math.round((good_count / csat_denominator) * 10000) / 100 : null;

    return { total_feedback, total_submitted, avg_rating, csat_score_pct, star_breakdown, good_count, bad_count };
  }

  /**
   * Admin-triggered token mint for a completed ticket (e.g., for testing or re-send).
   * Returns the RAW token so the admin/script can construct the link immediately.
   * The token itself is never stored — only its SHA-256.
   */
  async generateTokenForTicket(
    ticketId: string,
    ttlDays?: number,
  ): Promise<{ id: string; token: string; expires_at: string; feedback_url: string }> {
    const ticket = await this.prisma.zoho_ticket_ref.findUnique({
      where: { id: ticketId },
      select: { id: true, zoho_ticket_id: true, guest_id: true, room_number: true, subject: true },
    });
    if (!ticket) throw new Error(`Ticket ${ticketId} not found`);

    const token = randomBytes(32).toString('hex');
    const now = new Date();
    const days = ttlDays ?? this.ttlDays();
    const expires = new Date(now.getTime() + days * 24 * 60 * 60_000);

    // Determine brand from the booking linked to the ticket
    let brand = 'TDS';
    const ref = await this.prisma.zoho_ticket_ref.findUnique({
      where: { id: ticketId },
      select: { ezee_reservation_id: true },
    });
    if (ref?.ezee_reservation_id) {
      const booking = await this.prisma.ezee_booking_cache.findUnique({
        where: { ezee_reservation_id: ref.ezee_reservation_id },
        select: { properties: { select: { brand: true } } },
      });
      brand = booking?.properties?.brand ?? 'TDS';
    }

    const row = await this.prisma.ticket_feedback.create({
      data: {
        id: uuidv4(),
        ticket_id: ticket.id,
        zoho_ticket_id: ticket.zoho_ticket_id ?? null,
        guest_id: ticket.guest_id ?? null,
        brand,
        token_hash: this.hash(token),
        expires_at: expires,
      },
    });

    const apiBase = process.env.API_BASE_URL ?? 'http://localhost:8000';
    const feedback_url = `${apiBase}/public/feedback/${token}`;

    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`\n========================================`);
      this.logger.log(`🔗 [DEV FEEDBACK TOKEN] Ticket: ${ticketId}`);
      this.logger.log(`   Token: ${token}`);
      this.logger.log(`   URL:   ${feedback_url}`);
      this.logger.log(`   Expires: ${toIstString(expires)}`);
      this.logger.log(`========================================`);
    }

    return {
      id: row.id,
      token,
      expires_at: expires.toISOString(),
      feedback_url,
    };
  }
}
