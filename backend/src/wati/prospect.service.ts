import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { WatiService } from './wati.service';
import { resolveTemplate } from './wati-templates';
import { TicketsService } from '../tickets/tickets.service';
import { FlowLogService } from '../flow-log/flow-log.service';
import {
  type Brand,
  resolvePropertyFromSelectorKey,
} from '../common/property-resolver';

// WATI templates are resolved per-brand (src/wati/wati-templates.ts):
//   PROPERTY_SELECTOR — shown when we don't yet know which property a prospect means.
//   PROSPECT_NOTIFY   — pages the BOTTOM of the escalation ladder (L1, reception) that
//                       a prospect asked a question the chatbot couldn't answer, so a
//                       human can reply on WATI. Purpose-built (NOT a ticket): register
//                       per tenant with body params {userName, phone, property, question}.

/** Result of asking the property chatbot (RAG) a prospect's question. */
export interface ChatbotAnswer {
  answered: boolean;
  answer: string | null;
}

/**
 * Outcome of resolving which property a NON-GUEST (prospect) message is about.
 *  - `resolved`           → we know the property; `pendingQuery` is the question to
 *                           answer next (their current message, or the one they asked
 *                           just before tapping a property).
 *  - `awaiting_selection` → property unknown; we've sent the selector template and
 *                           stashed their question. Nothing more to do this turn.
 */
export type ProspectResolution =
  | {
      state: 'resolved';
      propertyId: string;
      propertyName: string;
      pendingQuery: string | null;
      viaSelectionTap: boolean;
    }
  | { state: 'awaiting_selection' };

/**
 * ProspectService — property resolution for the non-guest WhatsApp front door.
 *
 * A prospect (number with no active booking) may be asking about any of a brand's
 * properties. BUTEAK has two (BTM `55402`, Koramangala `61766`); TDS has one, so its
 * property is auto-resolved with no selector. When the brand has several, we ask the
 * prospect to tap a property in `property_selector_v3`; the tap arrives as an inbound
 * message whose text is the button payload (`KORAMANGALA_A`, …) which we map back to a
 * property id.
 *
 * The choice is remembered in `wa_prospect_session` for the length of a chat session,
 * scoped by an idle window (`PROSPECT_SESSION_TTL_HOURS`, default 12h) — mirroring how
 * WATI's own bot auto-closes an idle chat. A prospect who returns after the window is
 * treated as a fresh session and re-prompted, so "yesterday's property" never leaks
 * into a new enquiry.
 */
@Injectable()
export class ProspectService {
  private readonly logger = new Logger(ProspectService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wati: WatiService,
    private readonly flowLog: FlowLogService,
    private readonly tickets: TicketsService,
  ) {}

  private sessionTtlMs(): number {
    const hours = Number(process.env.PROSPECT_SESSION_TTL_HOURS ?? '12');
    return (Number.isFinite(hours) && hours > 0 ? hours : 12) * 3600_000;
  }

  /** Active properties for a brand (id + name), used to decide if a selector is needed. */
  private async propertiesForBrand(
    brand: string,
  ): Promise<{ id: string; name: string }[]> {
    return this.prisma.properties.findMany({
      where: { brand },
      select: { id: true, name: true },
      orderBy: { id: 'asc' },
    });
  }

  /**
   * Resolve the property for a prospect inbound. Reads/writes `wa_prospect_session`
   * and, when the property is unknown, sends the selector template.
   */
  async resolveForInbound(
    traceId: string,
    brand: string,
    msg: { waId: string; text: string },
  ): Promise<ProspectResolution> {
    const props = await this.propertiesForBrand(brand);

    // Single-property brand (TDS today): nothing to disambiguate — auto-resolve.
    if (props.length === 1) {
      const only = props[0];
      await this.upsertSession(brand, msg.waId, { property_id: only.id, pending_query: null });
      await this.flowLog.log({
        trace_id: traceId,
        brand,
        module: 'PROSPECT_PROPERTY',
        input: msg.text,
        output: `single-property brand → ${only.name} (${only.id})`,
      });
      return {
        state: 'resolved',
        propertyId: only.id,
        propertyName: only.name,
        pendingQuery: msg.text,
        viaSelectionTap: false,
      };
    }

    // Multi-property brand (BUTEAK): is this message itself a property-selector tap?
    const tapped = resolvePropertyFromSelectorKey(brand as Brand, msg.text);
    const existing = await this.prisma.wa_prospect_session.findUnique({
      where: { brand_wa_id: { brand, wa_id: msg.waId } },
    });

    if (tapped) {
      // A tap overrides any prior pick. The question to answer is whatever they asked
      // just before tapping (stashed as pending_query); a bare tap has none.
      const pendingQuery = existing?.pending_query ?? null;
      await this.upsertSession(brand, msg.waId, { property_id: tapped });
      const name = props.find((p) => p.id === tapped)?.name ?? tapped;
      await this.flowLog.log({
        trace_id: traceId,
        brand,
        module: 'PROSPECT_PROPERTY',
        input: msg.text,
        output: `selector tap → ${name} (${tapped})${pendingQuery ? ` · pending="${pendingQuery.slice(0, 60)}"` : ''}`,
      });
      return {
        state: 'resolved',
        propertyId: tapped,
        propertyName: name,
        pendingQuery,
        viaSelectionTap: true,
      };
    }

    // Not a tap. Do we have a still-fresh property from this chat session?
    const fresh =
      existing?.property_id &&
      Date.now() - new Date(existing.last_message_at).getTime() <= this.sessionTtlMs();

    if (fresh && existing?.property_id) {
      await this.upsertSession(brand, msg.waId, { property_id: existing.property_id });
      const name = props.find((p) => p.id === existing.property_id)?.name ?? existing.property_id;
      await this.flowLog.log({
        trace_id: traceId,
        brand,
        module: 'PROSPECT_PROPERTY',
        input: msg.text,
        output: `session property → ${name} (${existing.property_id})`,
      });
      return {
        state: 'resolved',
        propertyId: existing.property_id,
        propertyName: name,
        pendingQuery: msg.text,
        viaSelectionTap: false,
      };
    }

    // Unknown property (no session, or the session lapsed → treat as a new enquiry).
    // Stash the question and ask them to pick a property.
    await this.upsertSession(brand, msg.waId, {
      property_id: null,
      pending_query: msg.text,
      selector_sent_at: new Date(),
    });
    const selectorTpl = resolveTemplate(brand, 'PROPERTY_SELECTOR');
    const sent = await this.wati.sendTemplateMessage(
      brand,
      msg.waId,
      selectorTpl,
      [],
      'property_selector',
    );
    await this.flowLog.log({
      trace_id: traceId,
      brand,
      module: 'PROSPECT_PROPERTY',
      input: msg.text,
      output: `property unknown → sent ${selectorTpl}`,
      status: sent.ok ? 'OK' : sent.skipped ? 'SKIP' : 'ERROR',
    });
    return { state: 'awaiting_selection' };
  }

  /**
   * Ask the property chatbot (RAG) whether it can answer a prospect's question.
   * Replicates the make.com contract: POST { question, n_results, property_id } →
   * { answer, answered_from_db }. Endpoint is env-overridable (PROSPECT_RAG_URL) and
   * the whole call is best-effort — any failure or an empty/unanswered response
   * returns `answered:false` so the caller falls back to reception + L1 notify.
   */
  async askChatbot(propertyId: string, question: string): Promise<ChatbotAnswer> {
    const url = process.env.PROSPECT_RAG_URL || 'https://api.buteak.in/chat';
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, n_results: 3, property_id: propertyId }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (!res.ok) {
        this.logger.warn(`chatbot ${url} → HTTP ${res.status} for property=${propertyId}`);
        return { answered: false, answer: null };
      }
      const json: any = await res.json().catch(() => null);
      // The workflow RAG nests fields under `data`; accept either shape.
      const d = json?.data ?? json ?? {};
      const answeredFlag = d.answered_from_db;
      const answered =
        answeredFlag === 1 || answeredFlag === '1' || answeredFlag === true;
      const answer = typeof d.answer === 'string' ? d.answer.trim() : '';
      return answered && answer ? { answered: true, answer } : { answered: false, answer: null };
    } catch (err) {
      this.logger.warn(`chatbot call failed (${url}): ${(err as Error).message}`);
      return { answered: false, answer: null };
    }
  }

  /**
   * Notify the BOTTOM of the escalation ladder (level 1 — reception) that a prospect
   * asked a question we couldn't answer, so a human replies to them on WATI. This does
   * NOT create a ticket; it's a heads-up template send to each L1 target. Best-effort.
   * Returns the number of staff notified.
   */
  async notifyUnanswered(
    traceId: string,
    brand: string,
    propertyId: string,
    propertyName: string,
    prospect: { name: string; phone: string; question: string },
  ): Promise<number> {
    const targets = await this.tickets.ladderTargets(propertyId, 1, brand);
    if (targets.length === 0) {
      await this.flowLog.log({
        trace_id: traceId,
        brand,
        module: 'PROSPECT_ESCALATE',
        input: prospect.question,
        output: `no L1 staff configured for property ${propertyId} — nobody notified`,
        status: 'ERROR',
      });
      return 0;
    }
    let sent = 0;
    for (const t of targets) {
      const res = await this.wati.sendTemplateMessage(
        brand,
        t.phone,
        resolveTemplate(brand, 'PROSPECT_NOTIFY'),
        [
          { name: 'userName', value: prospect.name || 'A prospect' },
          { name: 'phone', value: prospect.phone },
          { name: 'property', value: propertyName },
          { name: 'question', value: prospect.question.slice(0, 600) },
        ],
        'prospect_notify',
      );
      if (res.ok) sent += 1;
    }
    await this.flowLog.log({
      trace_id: traceId,
      brand,
      module: 'PROSPECT_ESCALATE',
      input: prospect.question,
      output: `notified L1 (${sent}/${targets.length}) about unanswered enquiry re ${propertyName}`,
      status: sent > 0 ? 'OK' : 'ERROR',
    });
    return sent;
  }

  /**
   * Upsert the (brand, wa_id) session row, always bumping `last_message_at` so the
   * idle window tracks activity. `property_id`/`pending_query` are only written when
   * provided (undefined = leave as-is).
   */
  private async upsertSession(
    brand: string,
    waId: string,
    patch: {
      property_id?: string | null;
      pending_query?: string | null;
      selector_sent_at?: Date;
    },
  ): Promise<void> {
    const now = new Date();
    await this.prisma.wa_prospect_session
      .upsert({
        where: { brand_wa_id: { brand, wa_id: waId } },
        create: {
          id: uuidv4(),
          brand,
          wa_id: waId,
          property_id: patch.property_id ?? null,
          pending_query: patch.pending_query ?? null,
          selector_sent_at: patch.selector_sent_at ?? null,
          last_message_at: now,
        },
        update: {
          ...(patch.property_id !== undefined ? { property_id: patch.property_id } : {}),
          ...(patch.pending_query !== undefined ? { pending_query: patch.pending_query } : {}),
          ...(patch.selector_sent_at !== undefined ? { selector_sent_at: patch.selector_sent_at } : {}),
          last_message_at: now,
        },
      })
      .catch((err) =>
        this.logger.error(`prospect session upsert failed (${brand}/${waId}): ${(err as Error).message}`),
      );
  }
}
