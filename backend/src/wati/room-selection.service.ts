import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Outcome of interpreting an inbound message against a pending room-selection prompt.
 *  - `none`         → no active prompt for this (brand, wa_id) (or it lapsed) → handle normally.
 *  - `selected`     → the reply names one of the guest's rooms → resume the stashed request.
 *  - `re_prompt`    → the reply looks like a room but isn't one of theirs → ask again.
 *  - `topic_change` → the reply isn't a room at all (a greeting, a different ask) → the pending
 *                     request is dropped; the caller handles THIS message normally.
 */
export type RoomSelectionOutcome =
  | { state: 'none' }
  | { state: 'selected'; room: string; pendingText: string }
  | { state: 're_prompt'; rooms: string[]; typed?: string }
  | { state: 'pick_one'; rooms: string[] }
  | { state: 'topic_change' };

/**
 * Result of scanning a service-request message for a room the guest named inline
 * ("send a towel to 102"):
 *  - `match`     → exactly one of THEIR rooms named → file against it, don't ask.
 *  - `invalid`   → a room-shaped number that isn't theirs ("… to 402") → wrong-room prompt.
 *  - `ambiguous` → they named several of their rooms (or a valid + a wrong one) → ask which.
 *  - `none`      → no room named → ask which.
 *
 * `ambiguous` carries the rooms it actually matched: naming SEVERAL of your own rooms in one
 * message is the signature of a multi-room multi-request ("towel to 1 and soap to 2"), which the
 * caller resolves by splitting and pinning each ask to its own room instead of asking "which room?".
 */
export type InlineRoomHit =
  | { kind: 'match'; room: string }
  | { kind: 'invalid'; typed: string }
  | { kind: 'ambiguous'; rooms: string[]; wrongRoom?: string }
  | { kind: 'none' };

/**
 * RoomSelectionService — group-booking room disambiguation for the GUEST WhatsApp front door.
 *
 * A checked-in guest whose booking spans several rooms can't have a service request stamped on
 * all of them, so the bot asks "which room?" and stashes the request in `wa_pending_room_selection`
 * (one row per brand + wa_id). The next inbound is read here: a bare "103" resolves the stash to
 * room 103; a number that isn't one of their rooms re-prompts; anything that isn't a room attempt
 * drops the stash so the message is handled as a fresh turn. Scoped by an idle window
 * (WA_ROOM_SELECTION_TTL_MIN, default 30m) — mirroring `ProspectService` / `wa_prospect_session` —
 * so a stray number long after the question is treated as having no context (ambiguous).
 *
 * This service is pure state + parsing: it never sends WhatsApp messages. The caller
 * (WaServiceService) composes and sends the prompts through its single `replyAndLog` choke point.
 */
@Injectable()
export class RoomSelectionService {
  private readonly logger = new Logger(RoomSelectionService.name);

  /** Filler words stripped before deciding whether a short reply is a bare room attempt. */
  private static readonly FILLER = new Set([
    'room', 'rooms', 'no', 'no.', 'number', 'num', 'the', 'in', 'is', 'my', 'put', 'send', 'to',
    'for', 'a', 'it', 'this', 'please', 'pls', 'want', 'i',
  ]);

  constructor(private readonly prisma: PrismaService) {}

  private ttlMs(): number {
    const mins = Number(process.env.WA_ROOM_SELECTION_TTL_MIN ?? '30');
    return (Number.isFinite(mins) && mins > 0 ? mins : 30) * 60_000;
  }

  /**
   * Stash a service request and mark that we've asked which room it's for. Overwrites any prior
   * pending prompt for this (brand, wa_id). Best-effort — a failure here just means the guest's
   * next reply won't resolve, which the caller degrades gracefully.
   */
  async askAndStash(
    brand: string,
    waId: string,
    ctx: { eri: string; guestId: string | null; propertyId: string },
    pendingText: string,
    rooms: string[],
  ): Promise<void> {
    const now = new Date();
    await this.prisma.wa_pending_room_selection
      .upsert({
        where: { brand_wa_id: { brand, wa_id: waId } },
        create: {
          id: uuidv4(),
          brand,
          wa_id: waId,
          eri: ctx.eri,
          guest_id: ctx.guestId,
          property_id: ctx.propertyId,
          pending_text: pendingText.slice(0, 2000),
          candidate_rooms: JSON.stringify(rooms),
          asked_at: now,
          last_message_at: now,
        },
        update: {
          eri: ctx.eri,
          guest_id: ctx.guestId,
          property_id: ctx.propertyId,
          pending_text: pendingText.slice(0, 2000),
          candidate_rooms: JSON.stringify(rooms),
          asked_at: now,
          last_message_at: now,
        },
      })
      .catch((err) =>
        this.logger.error(`room-selection stash failed (${brand}/${waId}): ${(err as Error).message}`),
      );
  }

  /**
   * Interpret an inbound message against any pending room prompt for (brand, wa_id).
   * Consuming a selection or a topic change DELETES the row; a re-prompt keeps it (bumping the
   * idle window) so the guest gets another try.
   */
  async consume(brand: string, waId: string, text: string): Promise<RoomSelectionOutcome> {
    const row = await this.prisma.wa_pending_room_selection.findUnique({
      where: { brand_wa_id: { brand, wa_id: waId } },
    });
    if (!row) return { state: 'none' };

    // Lapsed idle window → treat as no context and clear it, so a late number is ambiguous.
    if (Date.now() - new Date(row.last_message_at).getTime() > this.ttlMs()) {
      await this.deleteRow(brand, waId);
      return { state: 'none' };
    }

    const rooms = this.parseRooms(row.candidate_rooms);
    const verdict = this.classifyReply(text, rooms);

    if (verdict.kind === 'match') {
      await this.deleteRow(brand, waId);
      return { state: 'selected', room: verdict.room, pendingText: row.pending_text };
    }
    if (verdict.kind === 'invalid') {
      // Keep the prompt alive for another attempt; bump the idle window.
      await this.touch(brand, waId);
      return { state: 're_prompt', rooms, typed: verdict.typed };
    }
    if (verdict.kind === 'multi') {
      // They named several of their rooms ("306, 406") — that's not a choice. Keep the prompt open
      // and ask for one; picking the first would silently drop the rest.
      await this.touch(brand, waId);
      return { state: 'pick_one', rooms: verdict.rooms };
    }
    // Not a room attempt at all → the guest moved on; drop the stash.
    await this.deleteRow(brand, waId);
    return { state: 'topic_change' };
  }

  /** Bump the idle window so a prompt the guest is actively answering doesn't lapse mid-exchange. */
  private async touch(brand: string, waId: string): Promise<void> {
    await this.prisma.wa_pending_room_selection
      .update({ where: { brand_wa_id: { brand, wa_id: waId } }, data: { last_message_at: new Date() } })
      .catch(() => undefined);
  }

  private async deleteRow(brand: string, waId: string): Promise<void> {
    await this.prisma.wa_pending_room_selection
      .delete({ where: { brand_wa_id: { brand, wa_id: waId } } })
      .catch(() => undefined);
  }

  private parseRooms(raw: string): string[] {
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.map((r) => String(r)).filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  /**
   * Decide whether `text` selects a candidate room, is a wrong room, or isn't a room reply.
   *
   *  - `match`   → a candidate appears as a token (bare "103", "room 103", "put it in 103").
   *  - `invalid` → the reply, once filler is stripped, is a SINGLE room-shaped token that isn't a
   *                candidate (a bare "203"). We deliberately DON'T flag a longer sentence that
   *                merely contains a number ("send 2 towels") as a wrong room — that's a new ask.
   *  - `none`    → anything else (a greeting, a fresh multi-word request).
   */
  private classifyReply(
    text: string,
    candidates: string[],
  ):
    | { kind: 'match'; room: string }
    | { kind: 'multi'; rooms: string[] }
    | { kind: 'invalid'; typed: string }
    | { kind: 'none' } {
    const raw = (text ?? '').trim();
    if (!raw || candidates.length === 0) return { kind: 'none' };

    const cand = candidates.map((c) => ({
      room: c,
      lower: c.toLowerCase(),
      digits: (c.match(/\d+/g) ?? []).join(''),
    }));
    const tokens = raw.toLowerCase().split(/[^a-z0-9-]+/).filter(Boolean);

    // 1. Collect EVERY room of theirs named in the reply ("room 103", "in 103", "306, 406").
    //    A guest who answers with more than one hasn't chosen — reporting `multi` lets the caller
    //    ask for a single room, because taking the first would silently drop the others.
    const matched = new Set<string>();
    for (const t of tokens) {
      for (const c of cand) {
        if (t === c.lower) matched.add(c.room);
        else if (c.digits && /^\d+$/.test(t) && t === c.digits) matched.add(c.room);
      }
    }
    if (matched.size === 1) return { kind: 'match', room: [...matched][0] };
    if (matched.size > 1) return { kind: 'multi', rooms: candidates.filter((c) => matched.has(c)) };

    // 2. A bare room attempt that doesn't match any candidate → invalid (re-prompt). Only when the
    //    reply, minus filler words, is a single room-shaped token — never a real sentence.
    const substantive = tokens.filter((t) => !RoomSelectionService.FILLER.has(t));
    if (substantive.length === 1 && /^[a-z]?-?\d{1,4}[a-z]?$/.test(substantive[0])) {
      return { kind: 'invalid', typed: substantive[0] };
    }

    return { kind: 'none' };
  }

  /**
   * Scan a NEW service-request message for a room the guest named inline ("send a towel to 102"),
   * so we can skip the "which room?" question when they already told us — or flag a wrong room.
   *
   * A token counts as room-shaped only if it's an exact candidate label OR an all-digit token whose
   * length matches one of the candidates' digit lengths. That distinguishes a real room ("102",
   * 3 digits like their rooms) from a quantity ("send 1 towel" — the "1" is 1 digit, ignored).
   */
  findRoomInText(text: string, candidates: string[]): InlineRoomHit {
    const raw = (text ?? '').trim();
    if (!raw || candidates.length === 0) return { kind: 'none' };

    const cand = candidates.map((c) => ({
      room: c,
      lower: c.toLowerCase(),
      digits: (c.match(/\d+/g) ?? []).join(''),
    }));
    const digitLens = new Set(cand.map((c) => c.digits.length).filter((n) => n > 0));
    const byLower = new Map(cand.map((c) => [c.lower, c.room]));
    const byDigits = new Map(cand.filter((c) => c.digits).map((c) => [c.digits, c.room]));

    const tokens = raw.toLowerCase().split(/[^a-z0-9-]+/).filter(Boolean);
    const validHits = new Set<string>();
    let wrongRoom: string | null = null;

    for (const t of tokens) {
      if (byLower.has(t)) {
        validHits.add(byLower.get(t)!);
        continue;
      }
      // Only pure-digit tokens that are shaped like a room count (guards against quantities).
      if (/^\d+$/.test(t) && digitLens.has(t.length)) {
        if (byDigits.has(t)) validHits.add(byDigits.get(t)!);
        else if (!wrongRoom) wrongRoom = t;
      }
    }

    if (validHits.size === 1 && !wrongRoom) return { kind: 'match', room: [...validHits][0] };
    if (validHits.size >= 1) {
      return { kind: 'ambiguous', rooms: [...validHits], ...(wrongRoom ? { wrongRoom } : {}) };
    }
    if (wrongRoom) return { kind: 'invalid', typed: wrongRoom };
    return { kind: 'none' };
  }

  /**
   * Is this message JUST one of the guest's own room numbers ("306", "room 306 please") with no
   * actual request in it? Returns the room, else null.
   *
   * With a "which room?" question open such a message is a selection (handled by `consume`). With
   * NO question open it tells us where but not what — it is not a request, and answering it with a
   * blank "I couldn't understand" reads as a bug to a guest who just typed their own room number.
   * The caller uses this to nudge for the actual request instead. "send a towel to 306" is NOT
   * bare (it has a real ask) and must keep flowing to the normal ticket path.
   */
  isBareRoomMention(text: string, candidates: string[]): string | null {
    const hit = this.findRoomInText(text, candidates);
    if (hit.kind !== 'match') return null;
    const roomLower = hit.room.toLowerCase();
    const roomDigits = (hit.room.match(/\d+/g) ?? []).join('');
    const tokens = (text ?? '').toLowerCase().split(/[^a-z0-9-]+/).filter(Boolean);
    const leftover = tokens.filter(
      (t) =>
        !RoomSelectionService.FILLER.has(t) &&
        t !== roomLower &&
        !(/^\d+$/.test(t) && t === roomDigits),
    );
    return leftover.length === 0 ? hit.room : null;
  }
}
