import { Injectable, Logger } from '@nestjs/common';
import {
  TASK_CLASSES,
  DEFAULT_CLASS,
  UNFULFILLED_CLASS,
  type TaskClass,
} from '../tickets/task-classes';

/**
 * Catalog item the classifier is allowed to match against. Price is deliberately
 * NOT passed to the LLM — free-vs-paid is decided server-side from base_price so
 * the model can never make a request "free".
 */
export interface ClassifierCatalogItem {
  id: string;
  name: string;
  category: string; // COMMODITY | SERVICE | BORROWABLE | RETURNABLE
}

export interface GuestMessageClassification {
  /**
   * greeting_hello | greeting_acknowledge | request_new | request_update |
   * feedback | booking_confirm | booking_deny | ambiguous
   */
  intent: string;
  /** WHO handles it: HOUSEKEEPING | MAINTENANCE | FRONT_OFFICE */
  department: string;
  /**
   * The task PURPOSE class (drives the SLA/turn-around time, which is admin-
   * configurable per class in sla_config). Decided independently of department.
   * See src/tickets/task-classes.ts for the canonical list.
   */
  task_category: TaskClass;
  /** matched catalog product id, or null when the request isn't in the catalog */
  product_id: string | null;
  /** short, cleaned restatement of what the guest wants */
  request_text: string;
}

const TASK_CATEGORIES = TASK_CLASSES;

/**
 * LlmService — OpenAI classifier for the WhatsApp service-request front door
 * (heist1.1). Ports the make.com gpt-3.5 "Guest Message Classifier" [34] +
 * "Intent Classifier" [44] (see docs/ticketing/make_blueprint_index.md §2) onto
 * gpt-4o-mini, and additionally maps the message to a catalog product so the
 * orchestrator can branch free / paid / anonymous.
 *
 * Calls the OpenAI REST API directly via global fetch (no SDK dependency, same
 * style as WatiService). Reads OPENAI_API_KEY_SF. If the key is missing or the
 * call fails, returns an `ambiguous` classification so the flow still acks the
 * guest and raises an anonymous ticket rather than dropping the message.
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly model = process.env.OPENAI_MODEL_SF ?? 'gpt-4o-mini';
  // The FIRST (guest message) classifier is the linchpin of ALL routing, so it runs on a
  // stronger model than the cheap auxiliary classifiers (splitter / prospect / feedback,
  // which stay on `model`). Own env so we can A/B without touching the rest — no deploy
  // needed to change it. Defaults to gpt-4o.
  private readonly classifierModel =
    process.env.OPENAI_MODEL_SF_CLASSIFIER ?? 'gpt-4o';

  isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY_SF;
  }

  /**
   * What we return when the model is unreachable or unusable. `ambiguous` sends the
   * message to Reception for a human to triage, and the UNFULFILLED class makes the
   * failure HONEST: the guest is told someone will contact them, rather than being
   * promised by name that a specific staff member is already on a request we never
   * actually understood.
   */
  private fallback(text: string): GuestMessageClassification {
    return {
      intent: 'ambiguous',
      department: 'FRONT_OFFICE',
      task_category: UNFULFILLED_CLASS,
      product_id: null,
      request_text: text.trim().slice(0, 240),
    };
  }

  async classifyGuestMessage(
    text: string,
    catalog: ClassifierCatalogItem[],
  ): Promise<GuestMessageClassification> {
    const key = process.env.OPENAI_API_KEY_SF;
    if (!key) {
      this.logger.warn('[SKIP] OPENAI_API_KEY_SF not set — returning ambiguous classification');
      return this.fallback(text);
    }

    const catalogLines = catalog
      .map((c) => `${c.id} | ${c.name} | ${c.category}`)
      .join('\n');

    const system = [
      'You are the intent classifier for a hotel guest-services WhatsApp line.',
      'A checked-in guest sends a free-text message. Classify it and, if it asks for',
      'a specific item or service, match it to ONE catalog row.',
      '',
      'Return STRICT JSON with exactly these keys:',
      '  intent: one of "greeting_hello" | "greeting_acknowledge" | "request_new" |',
      '          "request_update" | "faq" | "breakfast" | "feedback" | "booking_confirm" |',
      '          "booking_deny" | "ambiguous" | "unclear"',
      '  department: one of "HOUSEKEEPING" | "MAINTENANCE" | "FRONT_OFFICE"  (WHO handles it)',
      '  task_category: one of "T-1" | "T0" | "T1" | "T2" | "T3" | "T4"  (the task PURPOSE/urgency class)',
      '  product_id: the matching catalog id from the list below, or null if nothing fits',
      '  request_text: a short (<=120 char) plain restatement of the request',
      '',
      'Intent rules (apply strictly, in this order; do NOT infer beyond the wording):',
      '1. Exact feedback token "good"/"bad" (or clear synonyms "excellent"/"poor") => feedback.',
      '2. The guest wants to ORDER or HAVE breakfast ("breakfast", "order breakfast", "order my',
      '   breakfast", "i want/need breakfast", "breakfast please", or a clear misspelling like',
      '   "brekfast"/"brakfast") => breakfast. We reply with the breakfast ordering link. NOTE: a',
      '   breakfast TIMING/inclusion question ("what time is breakfast", "is breakfast included",',
      '   "breakfast hours") is NOT this — that is faq (next rule).',
      '3. A general INFORMATIONAL question the front desk / a knowledge base would answer —',
      '   about the property (breakfast/checkout timings, wifi availability, parking, amenities,',
      '   house rules) or the local area (directions, distance/transport to the airport/station,',
      '   nearby places to eat or visit) => faq. These want an ANSWER, not a task done for them.',
      '   faq is only "what IS the rule / timing / fact" — "what time is checkout", "is breakfast',
      '   included", "do you have parking".',
      '   IMPORTANT: asking us to ARRANGE or ALLOW something for THEIR OWN stay is NOT faq, even',
      '   when it touches a policy topic and even when it is phrased as a question — "I want to',
      '   check out at 7pm", "can I get a late checkout?", "I want to check out at 7pm without',
      '   extra charges", "can I check in early at 9am?", "can I keep my luggage after checkout?",',
      '   "can I extend my stay by a day?". A human has to decide or arrange those, so they are',
      '   request_new (FRONT_OFFICE). The knowledge base only knows the STANDARD policy, so',
      '   answering "checkout is 11 AM" to a guest asking to leave at 7pm does nothing for them.',
      '   IMPORTANT: a status check about the guest\'s OWN pending service request ("where is my',
      '   towel", "any update on my AC") is NOT faq — that is request_update (next rule).',
      '4. Status check on something the guest ASKED FOR and is still WAITING on ("where is my …",',
      '   "any update", "still waiting", "when will it", "how long") => request_update.',
      '   IMPORTANT: a complaint about the STATE of the room or the QUALITY of work already done',
      '   ("floor was not cleaned properly", "the room is dirty", "cleaning is not upto the mark",',
      '   "the water bottle is not cold", "bathroom smells") is NOT a status check — nobody is',
      '   waiting on a pending delivery, there is fresh work to do => request_new. A trailing',
      '   "can you check / please look into it" does not turn a complaint into a status check.',
      '5. Explicit action verb without a status-check ("need/send/bring/clean/fix/replace/deliver/want") => request_new.',
      '6. Short acknowledgement/closer ("ok/okay/thanks/thank you/thx/k/got it/noted/done") => greeting_acknowledge.',
      '7. Simple greeting ("hi/hello/hey/good morning/good evening") => greeting_hello.',
      '8. "confirm" / "confirm my details" => booking_confirm.  "deny" / "deny my details" => booking_deny.',
      '9. When torn between request_new and request_update => request_update.',
      '10. Distinguish the two "not sure" cases:',
      '   - "ambiguous": it IS a genuine stay/property request or concern, but you cannot tell',
      '     which team should handle it or exactly what is needed ("someone please come up",',
      '     "the thing next to the bed is broken", "it is not working"). A human should triage it.',
      '   - "unclear": gibberish, a random fragment, or contextless text that is NOT an actionable',
      '     request ("asdf", "in", "out", "yes", "no", "come", "ready", "here", "hmm", "yo", "123").',
      '   Both are handed to a human at Reception, so you are choosing a LABEL, not deciding',
      '   whether the guest gets help. When a fragment could plausibly be a real request, prefer',
      '   "ambiguous" over "unclear". Keep using rule 6 for a plain acknowledgement ("ok",',
      '   "thanks", "noted") and rule 7 for a plain greeting — those close the conversation and',
      '   are NOT unclear.',
      '- product_id MUST be an exact id from the catalog or null. Never invent ids.',
      '- Only set product_id when the guest clearly names THAT item or an obvious synonym',
      '  (e.g. "fresh towel" -> a Towel row). If the requested item is NOT in the catalog,',
      '  product_id MUST be null. NEVER substitute a different/unrelated catalog item just',
      "  to return a match (e.g. do not answer a \"towel\" request with a \"Water Bottle\").",
      '- product_id, department and task_category matter only for request_new; otherwise product_id=null.',
      '',
      'Department rules (WHO does the work):',
      '- Cleaning, towels, linen, toiletries, water, pillow, blanket, laundry, room items => HOUSEKEEPING.',
      '- Everything else — front desk, billing, checkout, keys, info, complaints, and ALL',
      '  technical/repair work (AC, geyser, plumbing, electrical, wifi, leaks, power) => FRONT_OFFICE.',
      '  Reception triages repairs and dispatches a technician themselves; there is no',
      '  maintenance team on the guest-facing line, so never route a repair away from them.',
      '',
      'task_category rules — the URGENCY/EFFORT tier. Decide it INDEPENDENTLY of department',
      '(a tier can span departments: "send invoice" and "extra towel" are BOTH T0):',
      '- T-1 Unfulfilled: the guest wants something this property does NOT provide, or that is',
      '    against policy — cooked food or food delivery of any kind (a sandwich, a dosa, lunch,',
      '    a snack), an ironing / clothes-pressing SERVICE, an extra mattress, or anything else',
      '    plainly outside what a co-living front desk offers. Still a real message that a human',
      '    must answer, so classify it request_new and let Reception reply — we simply never',
      '    promise it will arrive.',
      '    CAREFUL, these ARE things we do and are NOT T-1: lending an item that appears in the',
      '    catalog below (an iron, an umbrella, a hairdryer — lending an iron is fine, ironing FOR',
      '    the guest is not), collecting laundry for pickup, and breakfast (its own intent).',
      '    If the request matches a catalog row, it is never T-1.',
      '- T0 Routine (10 min): invoice, billing, feedback, inspection, documentation, scheduling,',
      '    a suggestion, a COMPLAINT with no physical task attached — and the quick deliveries:',
      '    towel, toiletries, water, pillow, blanket, laundry pickup, hanger, tissues, key card, wifi password.',
      '- T1 Standard (30 min): cleaning. Room cleaning, bathroom cleaning, a re-clean, deep cleaning,',
      '    changing linen, clearing rubbish.',
      '- T2 Major issue (60 min): AC, geyser / hot water, WiFi not working, TV, plumbing, electrical,',
      '    refrigerator, drainage, noise.',
      '- T3 Maintenance (4 hr): power, water pipes, leakage, overflow.',
      '- T4 Emergency (immediate broadcast — use rarely): fire, smoke, gas leak, a medical emergency,',
      '    flooding, a guest locked out, a door that will not open or will not lock.',
      '- Tier = how time-sensitive/complex; department = who does it. They are separate (a T0 towel is HOUSEKEEPING; a T0 invoice is FRONT_OFFICE).',
      '- CRITICAL — pick the tier from the WORK REQUIRED, never from the guest\'s TONE. An unhappy',
      '  message is not automatically a "complaint". "The floor was not cleaned properly" and "the',
      '  room is dirty" need CLEANING done, so they are T1. "The AC is not working" needs a repair,',
      '  so it is T2 — even phrased as "I want to complain about the AC". T0-complaint is only the',
      '  leftover case where there is NO physical task to do: a staff member was rude, a billing',
      '  dispute, an objection to a policy, unhappiness about the stay in general.',
      '',
      'Catalog (id | name | category):',
      catalogLines || '(empty)',
    ].join('\n');

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12_000);
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: this.classifierModel,
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: text.slice(0, 2000) },
          ],
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        this.logger.error(`OpenAI classify failed (${res.status}): ${body.slice(0, 200)}`);
        return this.fallback(text);
      }

      const json: any = await res.json();
      const content = json?.choices?.[0]?.message?.content;
      if (!content) return this.fallback(text);

      const parsed = JSON.parse(content);
      const validProduct =
        typeof parsed.product_id === 'string' &&
        catalog.some((c) => c.id === parsed.product_id)
          ? parsed.product_id
          : null;
      const department = ['HOUSEKEEPING', 'MAINTENANCE', 'FRONT_OFFICE'].includes(
        parsed.department,
      )
        ? parsed.department
        : 'FRONT_OFFICE';
      const task_category: TaskClass = TASK_CATEGORIES.includes(parsed.task_category)
        ? (parsed.task_category as TaskClass)
        : DEFAULT_CLASS;

      return {
        intent: typeof parsed.intent === 'string' ? parsed.intent : 'ambiguous',
        department,
        task_category,
        product_id: validProduct,
        request_text:
          typeof parsed.request_text === 'string' && parsed.request_text.trim()
            ? parsed.request_text.trim().slice(0, 240)
            : text.trim().slice(0, 240),
      };
    } catch (err) {
      this.logger.error(`OpenAI classify error: ${(err as Error).message}`);
      return this.fallback(text);
    }
  }

  /**
   * Split ONE guest WhatsApp message into its DISTINCT actionable service requests, so
   * the orchestrator can raise a separate ticket (own department + TAT) for each.
   *   "a towel and a handwash"        → ["a towel", "a handwash"]
   *   "wifi password and fix the AC"  → ["wifi password", "fix the AC"]
   *
   * Returns a SINGLE-element array (the original text) when the message is one request,
   * a greeting, a status check, or anything not clearly two-or-more distinct asks — the
   * caller then runs its normal single-message pipeline. Never throws; any error, missing
   * key, or low-confidence parse falls back to `[text]` so behaviour is unchanged.
   */
  async splitServiceRequests(text: string): Promise<string[]> {
    const clean = (text || '').trim();
    const key = process.env.OPENAI_API_KEY_SF;
    if (!key || clean.length === 0) return [clean];

    const system = [
      "You split a hotel guest's WhatsApp message into DISTINCT actionable service requests.",
      'Return STRICT JSON: { "requests": string[] }.',
      'Rules:',
      '- Each array item = ONE separate thing the guest wants done, in the guest\'s own words (trimmed).',
      '- SPLIT whenever the message names two or more DIFFERENT items or actions — even when they',
      '  share a verb or are joined by "and"/"&"/","/"also"/"plus". A different item OR a different',
      '  action = a separate request.',
      '- Do NOT split a single request that just has extra descriptive words ("two clean bath towels",',
      '  "fix the AC in room 103" each stay as ONE request).',
      '- Do NOT split a quantity ("2 towels" is ONE request).',
      '- EXCLUDE greetings/thanks/pleasantries — never make them their own request.',
      '- CRITICAL — every item must stand ALONE. A reader who sees ONLY that item, with no',
      '  memory of the original message, must still understand what to do. So COPY any shared',
      '  context onto EVERY item: the shared verb ("send"/"bring"/"clean"), the shared',
      '  destination ("to 106", "to my room") and any shared timing ("at 9AM"). NEVER return a',
      '  bare noun ("idly", "dosa") when the message gave a verb or a room — write',
      '  "Send idly to 106". A lone fragment cannot be routed and becomes a junk ticket.',
      '- Shared context copies to ALL items, but an item that already names its OWN destination',
      '  keeps only that one — never move room 1 onto the item the guest asked for room 2.',
      '- A trailing clause that just asks us to ACT ON WHAT WAS ALREADY SAID is part of that same',
      '  request, NOT a new one. If a clause names no item and no new action of its own — "can you',
      '  check", "please look into it", "do the needful", "let me know", "sort it out", "asap" —',
      '  keep it with the request it belongs to. "The floor was not cleaned properly, can you',
      '  check" is ONE complaint. But "check the AC" names a thing, so that IS its own request.',
      '- If it is genuinely a single request, a greeting, or a status check, return the WHOLE',
      '  message unchanged as a single-element array. Never invent a request not in the message.',
      '',
      'Examples:',
      'Input: "I need a towel and need to fix my ac"',
      'Output: {"requests":["I need a towel","need to fix my ac"]}',
      'Input: "Please send me a towel and fix the ac of my room"',
      'Output: {"requests":["send me a towel","fix the ac of my room"]}',
      'Input: "wifi password and the room is not cleaned"',
      'Output: {"requests":["wifi password","the room is not cleaned"]}',
      'Input: "a towel, a handwash and 2 water bottles"',
      'Output: {"requests":["a towel","a handwash","2 water bottles"]}',
      'Input: "please send two clean bath towels"',
      'Output: {"requests":["please send two clean bath towels"]}',
      'Input: "hi, can you fix the AC in room 103"',
      'Output: {"requests":["fix the AC in room 103"]}',
      '// shared verb + shared room copied onto every item — no bare nouns:',
      'Input: "Send sandwich, idly and dosa to 106"',
      'Output: {"requests":["Send sandwich to 106","Send idly to 106","Send dosa to 106"]}',
      'Input: "Sandwich, idli, dosa - send to my room"',
      'Output: {"requests":["Send sandwich to my room","Send idli to my room","Send dosa to my room"]}',
      '// each item already names its OWN room — do NOT copy one room onto the other:',
      'Input: "Send towel to 1 and a soap to 2"',
      'Output: {"requests":["Send towel to 1","Send a soap to 2"]}',
      '// a "please act on it" clause is NOT a second request:',
      'Input: "Floor was not cleaned properly, can you check"',
      'Output: {"requests":["Floor was not cleaned properly, can you check"]}',
      'Input: "The water bottle is not cold, can you check? Room 106"',
      'Output: {"requests":["The water bottle is not cold, can you check? Room 106"]}',
      'Input: "The AC is not working, please fix it soon"',
      'Output: {"requests":["The AC is not working, please fix it soon"]}',
      '// ...but a clause that names its own thing IS a second request:',
      'Input: "The floor is dirty, and can you check the AC"',
      'Output: {"requests":["The floor is dirty","check the AC"]}',
    ].join('\n');

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: this.model,
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: clean.slice(0, 1000) },
          ],
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (!res.ok) {
        this.logger.error(`OpenAI splitServiceRequests failed (${res.status})`);
        return [clean];
      }
      const json: any = await res.json();
      const content = json?.choices?.[0]?.message?.content;
      if (!content) return [clean];
      const parsed = JSON.parse(content);
      const items: string[] = Array.isArray(parsed?.requests)
        ? parsed.requests
            .filter((r: unknown): r is string => typeof r === 'string')
            .map((r: string) => r.trim())
            .filter((r: string) => r.length > 0)
            .map((r: string) => r.slice(0, 200))
        : [];
      // De-dupe (case-insensitive) and cap the fan-out so a runaway parse can't
      // spawn a flood of tickets. Only trust a genuine 2+ split; else stay single.
      const seen = new Set<string>();
      const deduped = items.filter((r) => {
        const k = r.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      // Deterministic backstop for the one split the model keeps getting wrong: a trailing
      // "can you check" / "please look into it" is a plea about the SAME problem, not a second
      // ask. Dropping it usually leaves one real request, and one request means the whole
      // message goes down the single-message path — subject and all — which is what we want.
      const real = deduped.filter((r) => !LlmService.isFollowUpOnly(r));
      if (real.length < deduped.length) {
        this.logger.debug(
          `split dropped ${deduped.length - real.length} follow-up clause(s): ${deduped
            .filter((r) => LlmService.isFollowUpOnly(r))
            .join(' | ')}`,
        );
      }
      return real.length >= 2 ? real.slice(0, 5) : [clean];
    } catch (err) {
      this.logger.error(`OpenAI splitServiceRequests error: ${(err as Error).message}`);
      return [clean];
    }
  }

  /**
   * Verbs that, on their own, only ask us to act on something ALREADY said. Each still needs
   * an object to be a request in its own right: "check the AC" is a request, "can you check"
   * is not.
   */
  private static readonly FOLLOW_UP_VERBS = new Set([
    'check', 'look', 'see', 'fix', 'do', 'sort', 'resolve', 'handle', 'attend', 'help',
    'let', 'know', 'update', 'inform', 'revert', 'confirm', 'take', 'have', 'follow',
    'send', 'bring', 'get', 'arrange', 'note', 'ensure',
  ]);

  /** Words that carry no request of their own — politeness, pronouns, urgency, glue. */
  private static readonly FOLLOW_UP_FILLER = new Set([
    'can', 'could', 'would', 'will', 'shall', 'you', 'u', 'please', 'pls', 'plz', 'kindly',
    'it', 'this', 'that', 'the', 'a', 'an', 'to', 'into', 'on', 'in', 'at', 'out', 'up',
    'over', 'me', 'my', 'we', 'us', 'asap', 'fast', 'quick', 'quickly', 'soon', 'urgent',
    'urgently', 'now', 'once', 'again', 'and', 'also', 'so', 'but', 'then', 'needful',
    'if', 'possible', 'about', 'for', 'is', 'not', 'yet', 'still', 'done', 'sir', 'madam',
    'ok', 'okay',
  ]);
  // NB: "room" is deliberately NOT filler — "clean the room" is a real request, and treating
  // "room" as noise would let this helper swallow it.

  /**
   * Is this piece of a split message ONLY a plea to act on the previous ask ("can you check",
   * "please look into it", "do the needful", "sort it out asap")? True only when every word is
   * either one of those verbs or pure filler — so anything naming a real thing ("check the AC",
   * "send a towel") is never mistaken for one. Deliberately conservative: a false negative just
   * leaves today's behaviour, a false positive would swallow a real request.
   */
  static isFollowUpOnly(segment: string): boolean {
    const tokens = (segment || '').toLowerCase().split(/[^a-z]+/).filter(Boolean);
    if (tokens.length === 0 || tokens.length > 8) return false;
    let sawVerb = false;
    for (const t of tokens) {
      if (LlmService.FOLLOW_UP_VERBS.has(t)) {
        sawVerb = true;
        continue;
      }
      if (!LlmService.FOLLOW_UP_FILLER.has(t)) return false;
    }
    return sawVerb;
  }

  /**
   * For a status-check / follow-up ("where is my towel?"), decide WHICH of the
   * guest's current requests they mean. Returns the matched ticket id (or null)
   * plus the item they referenced (or null when the ask is generic). Never throws
   * — on any failure returns {ticket_id:null, item:null} so the caller falls back
   * to a safe, non-committal reply rather than naming the wrong request.
   *
   * Tickets are passed as an opaque list; we ask the model for a 1-based index (not
   * the raw id) and map it back ourselves, so the model can never invent an id.
   */
  async matchUpdateTarget(
    message: string,
    tickets: { id: string; subject: string | null; status: string }[],
  ): Promise<{ ticket_id: string | null; item: string | null }> {
    const key = process.env.OPENAI_API_KEY_SF;
    if (!key || tickets.length === 0) return { ticket_id: null, item: null };

    const list = tickets
      .map((t, i) => `${i + 1}. ${t.subject ?? 'request'} [${t.status}]`)
      .join('\n');

    const system = [
      'A checked-in hotel guest sent a status-check / follow-up about a service request.',
      'Below is the numbered list of THEIR current requests. Decide which one they mean.',
      '',
      'Return STRICT JSON: { "match_index": <integer>, "item": <string|null> }',
      '- match_index: the 1-based list number of the request the guest is asking about, or 0 if none match.',
      '- If the guest names a specific item that is NOT in the list, match_index=0 and item=<that item, short>.',
      '- If the ask is generic ("any update?") and there is EXACTLY ONE request, match that one.',
      '- If the ask is generic and there are MULTIPLE requests, match_index=0 and item=null.',
      '- Match on meaning, tolerant of wording ("iron board" ≈ "ironing board"; "fresh towel" ≈ "towel").',
      '- Never output a number outside 1..N.',
      '',
      'Current requests:',
      list,
    ].join('\n');

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: this.model,
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: message.slice(0, 500) },
          ],
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (!res.ok) {
        this.logger.error(`OpenAI matchUpdateTarget failed (${res.status})`);
        return { ticket_id: null, item: null };
      }
      const json: any = await res.json();
      const content = json?.choices?.[0]?.message?.content;
      if (!content) return { ticket_id: null, item: null };
      const parsed = JSON.parse(content);
      const idx = Number(parsed.match_index);
      const ticket_id =
        Number.isInteger(idx) && idx >= 1 && idx <= tickets.length ? tickets[idx - 1].id : null;
      const item =
        typeof parsed.item === 'string' && parsed.item.trim()
          ? parsed.item.trim().slice(0, 60)
          : null;
      return { ticket_id, item };
    } catch (err) {
      this.logger.error(`OpenAI matchUpdateTarget error: ${(err as Error).message}`);
      return { ticket_id: null, item: null };
    }
  }

  /**
   * Disambiguate a reply sent in the post-completion feedback window that looks like
   * a status update. After a Good/Bad tap we asked the guest to say more, so most
   * replies are reviews — but the classifier can't tell a PAST-tense complaint from an
   * ONGOING unfulfilled request, and they need opposite handling:
   *   'review' = a comment about the service ALREADY received ("it took forever",
   *              "too slow", "staff was rude", "service was okay") → save as the remark.
   *   'status' = the request is STILL not done / needs action ("still waiting",
   *              "where is it", "not yet", "haven't received it") → route to the status
   *              flow, NOT feedback.
   * When unsure, prefers 'review' (the guest was explicitly asked for feedback). Falls
   * back to a keyword heuristic if the LLM isn't configured or errors.
   */
  async classifyFeedbackFollowup(text: string): Promise<'review' | 'status'> {
    const key = process.env.OPENAI_API_KEY_SF;
    if (!key) return this.followupHeuristic(text);

    const system = [
      'A hotel guest rated a JUST-COMPLETED service request and was asked to say more.',
      'Classify their reply as exactly one of:',
      '  "review": a comment/opinion about the service they ALREADY received',
      '            (e.g. "it took forever", "too slow", "staff was rude", "loved it",',
      '             "service was okay", "fast and exactly what I wanted").',
      '  "status": they indicate the request is STILL not fulfilled or need further action',
      '            (e.g. "still waiting", "where is it", "not yet", "haven\'t received it",',
      '             "when will it come", "still not done", "no one came").',
      'Key test: is it about a PAST experience (review) or an UNFULFILLED/ongoing need (status)?',
      'When genuinely unsure, answer "review" — they were asked for feedback.',
      'Return STRICT JSON: { "kind": "review" | "status" }.',
    ].join('\n');

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: this.model,
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: text.slice(0, 500) },
          ],
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (!res.ok) return this.followupHeuristic(text);
      const json: any = await res.json();
      const content = json?.choices?.[0]?.message?.content;
      if (!content) return this.followupHeuristic(text);
      const parsed = JSON.parse(content);
      return parsed.kind === 'status' ? 'status' : 'review';
    } catch (err) {
      this.logger.error(`OpenAI classifyFeedbackFollowup error: ${(err as Error).message}`);
      return this.followupHeuristic(text);
    }
  }

  /** Cheap fallback for classifyFeedbackFollowup: only strong "still-unfulfilled" markers → status. */
  private followupHeuristic(text: string): 'review' | 'status' {
    const t = (text || '').toLowerCase();
    const stillUnfulfilled =
      /\b(still (waiting|not|no|didn'?t|haven'?t)|not yet|where('?s| is| are)|haven'?t (got|received|gotten)|hasn'?t (come|arrived)|when will|not done yet|no one (came|has come)|nobody came)\b/;
    return stillUnfulfilled.test(t) ? 'status' : 'review';
  }

  /**
   * Is a guest's review-window reply MEANINGFUL feedback or just noise? The general
   * `classify` tags both a terse-but-real review ("slow", "great", "rude") AND
   * keyboard-mash ("zzzcg", "dixon nononnon", "asdfgh") as `unclear`, so we can't use it
   * to decide what to save as the CSAT remark. This narrow classifier keeps real feedback
   * (even one word / an emoji) and drops gibberish. Falls back to a permissive heuristic
   * (KEEP unless the text is clearly non-lexical) when the LLM is absent/errors, so real
   * feedback is never lost just because the model was unreachable.
   */
  async classifyFeedbackRemark(text: string): Promise<'meaningful' | 'gibberish'> {
    const key = process.env.OPENAI_API_KEY_SF;
    if (!key) return this.remarkHeuristic(text);

    const system = [
      'A hotel guest was asked to review a JUST-COMPLETED service. Classify their reply as:',
      '  "meaningful": ANY genuine feedback about the service/stay, however short — a rating',
      '                word ("slow", "great", "clean", "rude", "okay", "fast"), a sentence, or',
      '                even just an emoji (👍/👎/🙂). Err toward this when it could be a real comment.',
      '  "gibberish":  random letters / keyboard-mash / nonsense with no meaning',
      '                ("zzzcg", "asdfgh", "dixon nononnon", "djdndnfmxiejrbd", "hjkl").',
      'Return STRICT JSON: { "kind": "meaningful" | "gibberish" }.',
    ].join('\n');

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: this.model,
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: text.slice(0, 500) },
          ],
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (!res.ok) return this.remarkHeuristic(text);
      const json: any = await res.json();
      const content = json?.choices?.[0]?.message?.content;
      if (!content) return this.remarkHeuristic(text);
      const parsed = JSON.parse(content);
      return parsed.kind === 'gibberish' ? 'gibberish' : 'meaningful';
    } catch (err) {
      this.logger.error(`OpenAI classifyFeedbackRemark error: ${(err as Error).message}`);
      return this.remarkHeuristic(text);
    }
  }

  /**
   * Permissive gibberish fallback. Only flags text where EVERY alphabetic token looks
   * non-lexical (no vowel, or a 4+ consonant run) — so "zzzcg"/"hjkl" are caught while any
   * word with a normal vowel pattern ("slow", "great") is kept. Errs toward "meaningful".
   */
  private remarkHeuristic(text: string): 'meaningful' | 'gibberish' {
    const tokens = (text || '').toLowerCase().match(/[a-z]+/g) ?? [];
    if (tokens.length === 0) return 'meaningful'; // emoji/punctuation-only → keep (could be 👍)
    const looksWord = (w: string) =>
      /[aeiou]/.test(w) && !/[bcdfghjklmnpqrstvwxyz]{4,}/.test(w);
    return tokens.some(looksWord) ? 'meaningful' : 'gibberish';
  }

  /**
   * Classify a NON-GUEST (prospect) WhatsApp message into a coarse intent that drives
   * the prospect front door:
   *   - "greeting"  → a social greeting / acknowledgement (hi, thanks, ok).
   *   - "booking"   → wants to reserve / asks about availability, rooms, rates to book.
   *   - "service"   → wants an in-room item / service done now (a towel, cleaning, a repair) →
   *                   handed straight to a human at L1 (a non-guest can't self-serve, and it's
   *                   often a real in-house guest on an unlinked number). No chatbot.
   *   - "question"  → any other informational query (amenities, policies, directions) →
   *                   routed to the property chatbot, else reception.
   * Falls back to a keyword heuristic when the OpenAI key is absent or the call fails.
   */
  async classifyProspectMessage(text: string): Promise<'greeting' | 'booking' | 'question' | 'service'> {
    const key = process.env.OPENAI_API_KEY_SF;
    if (!key) return this.prospectHeuristic(text);

    const system = [
      'You classify a message from a NON-GUEST contacting a hotel/hostel on WhatsApp.',
      'Return exactly one of:',
      '  "greeting": a bare social greeting or acknowledgement (hi, hello, good morning, ok, thanks).',
      '  "booking":  wants to book / reserve, or asks about availability, room types, or nightly rates',
      '              in order to book (e.g. "do you have rooms tomorrow", "how much per night", "want to book").',
      '  "service":  wants an in-room item or a service delivered/done RIGHT NOW — a towel, water,',
      '              toiletries, cleaning, laundry, a repair, room service, etc. ("send me a towel",',
      '              "please clean my room", "the AC isn\'t working"). Someone asking us to DO something',
      '              for them, not asking for information.',
      '  "question": any other genuine informational query — amenities, check-in time, location, policies,',
      '              parking, food options.',
      'If it is a greeting AND something else together, prefer the non-greeting intent. When unsure between',
      '"question" and "service", prefer "service" for an explicit item/action request; else answer "question".',
      'Return STRICT JSON: { "intent": "greeting" | "booking" | "service" | "question" }.',
    ].join('\n');

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: this.model,
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: text.slice(0, 500) },
          ],
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (!res.ok) return this.prospectHeuristic(text);
      const json: any = await res.json();
      const content = json?.choices?.[0]?.message?.content;
      if (!content) return this.prospectHeuristic(text);
      const parsed = JSON.parse(content);
      if (parsed.intent === 'greeting' || parsed.intent === 'booking' || parsed.intent === 'service') {
        return parsed.intent;
      }
      return 'question';
    } catch (err) {
      this.logger.error(`OpenAI classifyProspectMessage error: ${(err as Error).message}`);
      return this.prospectHeuristic(text);
    }
  }

  /** Fallback for classifyProspectMessage: greetings, obvious booking asks, obvious service asks; else question. */
  private prospectHeuristic(text: string): 'greeting' | 'booking' | 'question' | 'service' {
    const t = (text || '').trim().toLowerCase();
    if (/^(hi|hii+|hey|hello|helo|good (morning|afternoon|evening)|ok|okay|thanks|thank you|thx|ty|namaste|yo)[!.\s]*$/.test(t)) {
      return 'greeting';
    }
    if (/\b(book|booking|reserve|reservation|availab|vacan|room type|per night|tariff|rate|price|check[- ]?in date)\b/.test(t)) {
      return 'booking';
    }
    // Explicit "bring/fix me X" service asks → straight to a human (L1), never the chatbot.
    if (/\b(towel|water|toilet(ry|ries)|soap|shampoo|toothbrush|blanket|pillow|bedsheet|linen|clean(ing)?|housekeeping|laundry|iron|dryer|room service|repair|fix|not working|broken|leak|plumb|electric)\b/.test(t)) {
      return 'service';
    }
    return 'question';
  }
}
