import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

/**
 * Phase-1 ticketing seed (idempotent). Run with:  npx ts-node prisma/seed-ticketing.ts
 *
 * Seeds:
 *   1. sla_config   — GLOBAL timing per task class (one row per T-1…T4; NOT per property/department)
 *   2. escalation_levels — per-property L1→L2→L3 level→role map (role same everywhere; resolved per-property)
 *   3. staff        — per-property PLACEHOLDER roster (overwrite phones/names with the real roster before launch)
 *
 * Urgency-tier task classes (department-agnostic). Timings admin-configurable via
 * /admin/sla-config. Two timers per class + the gap between escalation ladder levels:
 *   T-1 Unfulfilled · T0 Routine · T1 Standard (cleaning) · T2 Major issue ·
 *   T3 Maintenance · T4 Emergency → broadcast to all levels immediately (timers = 0).
 */
const prisma = new PrismaClient();

// task_category → SLA. completion = TAT, minutes to RESOLVE after ack (also guest
// turn-around) · ack_percent = ack window as a % of TAT (escalate if unacked by then)
// · gap = minutes between ladder levels.
// snooze = escalated-level ack window as % of the gap (default 100 = full gap).
const SLA_DEFAULTS: Record<
  string,
  { completion: number; ack_percent: number; gap: number; snooze: number }
> = {
  // Unfulfilled — we don't offer it. Same 10-minute Reception clock as T0: a human still
  // has to reply, they just aren't delivering anything.
  'T-1': { completion: 10, ack_percent: 50, gap: 5, snooze: 100 },
  // Routine — invoice/billing/feedback/documentation/complaints, and the quick
  // deliveries (towel, water, toiletries, pillow, blanket, laundry).
  T0: { completion: 10, ack_percent: 50, gap: 5, snooze: 100 },
  // Standard — cleaning.
  T1: { completion: 30, ack_percent: 50, gap: 15, snooze: 100 },
  // Major issue — AC, geyser, wifi, TV, plumbing, electrical, fridge, drainage, noise.
  T2: { completion: 60, ack_percent: 34, gap: 21, snooze: 100 },
  // Maintenance — power, water pipes, leakage, overflow. 13% of 4 hr ≈ a 32-minute ack.
  T3: { completion: 240, ack_percent: 13, gap: 30, snooze: 100 },
  // Emergency — fire, smoke, gas, medical, flood, lockout, door. Broadcast immediately.
  T4: { completion: 0, ack_percent: 0, gap: 0, snooze: 100 },
};

// Per-property escalation ladder. lookup_source tells the engine WHERE to find the role:
//   'staff'       → query our staff table
//   'admin_users' → query admin_users (Manager/Owner are admins, not ground staff)
// admin_users roles MUST match admin_roles.name exactly (UPPERCASE) or the
// engine's admin_users lookup won't resolve anyone (see escalationTargets).
const ESCALATION_LADDER = [
  { level: 1, role: 'TEAM_LEAD', lookup_source: 'staff' },
  { level: 2, role: 'MANAGER', lookup_source: 'admin_users' },
  { level: 3, role: 'OWNER', lookup_source: 'admin_users' },
];

// Brand-wide staff role catalog (canonical UPPER_SNAKE). Ops adds more via
// /admin/staff-roles; both the staff form and the escalation ladder validate against it.
const STAFF_ROLES = [
  { name: 'HOUSEKEEPING', label: 'Housekeeping' },
  { name: 'MAINTENANCE', label: 'Maintenance' },
  { name: 'FRONT_OFFICE', label: 'Front Office' },
  { name: 'TEAM_LEAD', label: 'Team Lead' },
];

// PLACEHOLDER staff — replace phones (and add the real roster) before go-live.
// Phone numbers are obviously-fake sentinels so a stray WATI send can't reach a real person.
const PLACEHOLDER_STAFF = [
  { name: 'HK Worker (placeholder)', phone: '910000000001', role: 'HOUSEKEEPING', department: 'HOUSEKEEPING' },
  { name: 'Maintenance Tech (placeholder)', phone: '910000000002', role: 'MAINTENANCE', department: 'MAINTENANCE' },
  { name: 'Reception (placeholder)', phone: '910000000003', role: 'FRONT_OFFICE', department: 'FRONT_OFFICE' },
  { name: 'Team Lead (placeholder)', phone: '910000000004', role: 'TEAM_LEAD', department: 'HOUSEKEEPING' },
];

async function main() {
  const properties = await prisma.properties.findMany({ select: { id: true, name: true } });
  if (properties.length === 0) {
    console.warn('⚠ No properties found — run the main seed first.');
    return;
  }

  // 1. sla_config — GLOBAL, one row per task class (keyed by task_category alone).
  for (const [cat, t] of Object.entries(SLA_DEFAULTS)) {
    await prisma.sla_config.upsert({
      where: { task_category: cat },
      update: {
        completion_timeout_min: t.completion,
        ack_percent: t.ack_percent,
        escalation_gap_min: t.gap,
        snooze_percent: t.snooze,
      },
      create: {
        id: uuidv4(),
        task_category: cat,
        completion_timeout_min: t.completion,
        ack_percent: t.ack_percent,
        escalation_gap_min: t.gap,
        snooze_percent: t.snooze,
      },
    });
  }
  // Prune retired task classes so the taxonomy stays exactly Object.keys(SLA_DEFAULTS).
  const pruned = await prisma.sla_config.deleteMany({
    where: { task_category: { notIn: Object.keys(SLA_DEFAULTS) } },
  });
  if (pruned.count > 0) console.log(`↳ pruned ${pruned.count} stale sla_config row(s)`);
  console.log(`✅ Global SLA config seeded (${Object.keys(SLA_DEFAULTS).join(', ')})`);

  // 1b. staff_roles — GLOBAL catalog (idempotent; never prunes, roles may be in use).
  for (const r of STAFF_ROLES) {
    await prisma.staff_roles.upsert({
      where: { name: r.name },
      update: { label: r.label },
      create: { id: uuidv4(), name: r.name, label: r.label },
    });
  }
  console.log('✅ Staff role catalog seeded');

  // 2 + 3. Per-property escalation ladder and the PLACEHOLDER roster.
  //
  // OFF unless SEED_PLACEHOLDER_STAFF=true. Everything above this line (sla_config,
  // staff_roles) is safe to run anywhere and is what you re-run after a taxonomy change.
  // What follows writes fake staff rows into `staff` for EVERY property, which must never
  // happen against a live database — a placeholder sitting at is_available=true would be
  // handed real guest tickets and silently swallow them.
  if (process.env.SEED_PLACEHOLDER_STAFF !== 'true') {
    console.log(
      '↷ Skipped placeholder staff + escalation ladder defaults (set SEED_PLACEHOLDER_STAFF=true on a fresh dev DB). ' +
        'A configured ladder is never overwritten by this seed.',
    );
    console.log('\n🎉 Ticketing seed complete.');
    return;
  }

  for (const prop of properties) {
    // 2. escalation_levels — the ladder itself: level → role, per property. The engine
    //    resolves "who is L2" by reading the role at that rung and finding staff with it,
    //    so adding a person with a mapped role puts them on the ladder automatically.
    //    Seeded ONLY for a fresh dev DB — a live ladder is configured through
    //    /admin/escalation-levels and must never be clobbered by a re-run of this seed.
    for (const lvl of ESCALATION_LADDER) {
      await prisma.escalation_levels.upsert({
        where: { property_id_level: { property_id: prop.id, level: lvl.level } },
        update: { role: lvl.role, lookup_source: lvl.lookup_source },
        create: {
          id: uuidv4(),
          property_id: prop.id,
          level: lvl.level,
          role: lvl.role,
          lookup_source: lvl.lookup_source,
        },
      });
    }

    // 3. placeholder staff (unique on property_id + phone)
    for (const s of PLACEHOLDER_STAFF) {
      await prisma.staff.upsert({
        where: { property_id_phone: { property_id: prop.id, phone: s.phone } },
        update: {},
        create: {
          id: uuidv4(),
          property_id: prop.id,
          name: s.name,
          phone: s.phone,
          role: s.role,
          department: s.department,
          is_available: true, // so assignment works in dev; flip real staff via login/logout
          is_active: true,
        },
      });
    }

    console.log(`✅ Ticketing config seeded for ${prop.name} (${prop.id})`);
  }

  console.log('\n🎉 Ticketing seed complete. Replace placeholder staff before launch.');
}

main()
  .catch((e) => {
    console.error('❌ Ticketing seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
