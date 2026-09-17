/**
 * The ticket URGENCY CLASSES — the single source of truth for the taxonomy.
 *
 * A class answers "how fast, and how hard do we chase it", NOT "who does it".
 * The timings for each class live in `sla_config` (one row per class, global,
 * admin-editable) and the department is decided separately.
 *
 *   T-1 Unfulfilled  — we don't offer it / it's against policy. Ticketed and
 *                      escalated like anything else, but the guest is never
 *                      promised delivery (see GUEST_UNFULFILLED_ACK).
 *   T0  Routine      — invoice, billing, towel, water, toiletries, complaints.
 *   T1  Standard     — cleaning.
 *   T2  Major issue  — AC, geyser, wifi, TV, plumbing, electrical, drainage, noise.
 *   T3  Maintenance  — power, water pipes, leakage, overflow.
 *   T4  Emergency    — fire, smoke, gas, medical, flood, lockout, door. Broadcast.
 */
export const TASK_CLASSES = ['T-1', 'T0', 'T1', 'T2', 'T3', 'T4'] as const;

export type TaskClass = (typeof TASK_CLASSES)[number];

/**
 * Emergency. Paged to every ladder position at once with no timed laddering, and
 * owned at L1 so it can still be resolved from WhatsApp.
 */
export const CRITICAL_CLASS: TaskClass = 'T4';

/**
 * We can't fulfil this. The ticket flows exactly like any other — same routing,
 * same SLA, same escalation — but the guest-facing wording never promises the
 * thing will arrive, and no CSAT is requested on completion.
 */
export const UNFULFILLED_CLASS: TaskClass = 'T-1';

/**
 * What a request is worth when nothing better is known: the 10-minute Reception
 * class. Deliberately NOT the unfulfilled class — a caller that simply didn't
 * pass a class (the PWA store, a payment capture) is asking for something real.
 */
export const DEFAULT_CLASS: TaskClass = 'T0';

export function isTaskClass(v: unknown): v is TaskClass {
  return typeof v === 'string' && (TASK_CLASSES as readonly string[]).includes(v);
}
