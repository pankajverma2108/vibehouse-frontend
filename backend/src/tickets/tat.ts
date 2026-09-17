/**
 * TAT reporting — the two Zoho Desk fields `cf_tat` and `cf_completed_within_tat`.
 *
 * Both are derived from what's already pinned on `zoho_ticket_ref` at creation:
 * `created_at` and `sla_breach_at` (= created_at + sla_config.completion_timeout_min).
 * Nothing is re-read from `sla_config`, so editing an SLA later never rewrites the
 * target a past ticket was actually held to.
 *
 * IMPORTANT — this is the GUEST's clock, deliberately not the escalation engine's.
 * `acknowledge()` re-arms the completion timer from the moment of the ack, so a
 * ticket can escalate zero times and still miss this measure. That's intended: the
 * question here is "did the guest get their towel inside the promised window", not
 * "did staff miss a deadline". Expect the two to disagree, and read this one as the
 * guest-experience KPI it is.
 */

/** The promised turn-around in whole minutes, or null if the class had no SLA row. */
export function tatMinutes(createdAt: Date, slaBreachAt: Date | null): number | null {
  if (!slaBreachAt) return null;
  return Math.max(0, Math.round((slaBreachAt.getTime() - createdAt.getTime()) / 60_000));
}

/**
 * Did the close land inside the promised window? Null when undecidable — no SLA row
 * (nothing was promised), or a zero TAT.
 *
 * T4 (Emergency) is the zero-TAT case: its target is "right now", which no real close
 * can satisfy, so every emergency would otherwise be stamped a breach. Null instead,
 * and the caller omits the field — `cf_tat = 0` is the marker to filter those out of a
 * compliance report.
 */
export function completedWithinTat(
  createdAt: Date,
  slaBreachAt: Date | null,
  completedAt: Date,
): boolean | null {
  const tat = tatMinutes(createdAt, slaBreachAt);
  if (tat === null || tat === 0) return null;
  return completedAt.getTime() <= slaBreachAt!.getTime();
}
