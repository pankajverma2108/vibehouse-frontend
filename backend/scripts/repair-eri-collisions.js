/**
 * repair-eri-collisions.js — relabel ezee_booking_cache rows that the
 * reservation-number collision stamped with the wrong property.
 *
 * BACKGROUND
 *   eZee numbers reservations per hotel from 1, so `UniqueID` alone is not
 *   unique across properties. The autosync webhook used the bare number as the
 *   primary key and only ever wrote `property_id` in its create branch, so the
 *   first hotel to push a given number owned that row forever while later
 *   pushes from other hotels overwrote its contents. The key fix is in
 *   src/sqs/workers/ezee-sync.worker.ts; this script repairs the rows that were
 *   already damaged before that fix shipped.
 *
 * WHAT IT DOES
 *   Sets `property_id` on the damaged booking rows, and on the four child
 *   tables that keep their OWN copy of `property_id` (payments,
 *   wa_service_request, breakfast_order, breakfast_access_token). It does NOT
 *   touch the primary key, so no foreign key is affected and no row is deleted.
 *
 * EVIDENCE TIERS (recomputed at run time — nothing is hard-coded)
 *   Tier 1  the bare row matches `{other}-EZEE-{n}` on checkin, checkout, room
 *           AND a non-empty phone number, and matches EXACTLY ONE other
 *           property. This is a four-field fingerprint, NOT a full-row
 *           comparison — treat it as strong circumstantial evidence, not proof.
 *   Tier 2  the bare row's room number does not exist at the stamped property,
 *           exists at exactly one other property, and that property's twin row
 *           is present. WEAKER: room ownership is inferred from historical
 *           cache rows, not from authoritative property configuration, so
 *           absence from the sample is not proof of absence at the property.
 *           EXCLUDED from --apply unless --include-tier2 is passed.
 *   Anything weaker is listed as UNSURE and never touched.
 *
 * USAGE
 *   node scripts/repair-eri-collisions.js                  # dry run (default)
 *   node scripts/repair-eri-collisions.js --apply --manifest=<sha256>
 *
 *   `--manifest` is mandatory with `--apply`. The dry run prints a SHA-256 over
 *   the exact (eri, from, to, tier, child-row ids) tuples; apply recomputes it
 *   and aborts on any difference. A count-only guard would let one candidate
 *   leave and another enter unnoticed.
 */
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const APPLY = process.argv.includes('--apply');
const INCLUDE_TIER2 = process.argv.includes('--include-tier2');
const MANIFEST = (() => {
  const a = process.argv.find((x) => x.startsWith('--manifest='));
  return a ? a.split('=')[1].trim().toLowerCase() : null;
})();

const prisma = new PrismaClient();
const D = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '-');
const digits = (s) => String(s ?? '').replace(/\D/g, '');

async function main() {
  const all = await prisma.ezee_booking_cache.findMany({
    select: {
      ezee_reservation_id: true, property_id: true, status: true, is_active: true,
      room_number: true, booker_phone: true, checkin_date: true, checkout_date: true,
    },
  });
  const byKey = new Map(all.map((r) => [r.ezee_reservation_id, r]));
  const properties = [...new Set(all.map((r) => r.property_id))];
  const sig = (r) => [D(r.checkin_date), D(r.checkout_date), String(r.room_number ?? '').trim(), digits(r.booker_phone)].join('|');

  // Room inventory per property, taken only from key shapes that carry the
  // property IN the key (`-EZEE-` from reconciliation, `-LCL-` from the
  // website). Those cannot themselves be collision artefacts.
  const inv = new Map();
  for (const r of all) {
    if (!/-EZEE-|-LCL-/.test(r.ezee_reservation_id)) continue;
    const rn = String(r.room_number ?? '').trim();
    if (!rn) continue;
    if (!inv.has(r.property_id)) inv.set(r.property_id, new Set());
    inv.get(r.property_id).add(rn);
  }

  const repairs = [];
  const unsure = [];
  for (const r of all) {
    if (!/^\d+$/.test(r.ezee_reservation_id)) continue;
    const n = r.ezee_reservation_id;
    const others = properties.filter((x) => x !== r.property_id);

    // A blank or shared phone makes the fingerprint far too weak to move a
    // booking (and a real payment) between properties on, so require one.
    const phone = digits(r.booker_phone);
    const exact = phone
      ? others.map((x) => byKey.get(`${x}-EZEE-${n}`)).filter((o) => o && sig(o) === sig(r))
      : [];
    if (exact.length > 1) {
      unsure.push({ eri: n, from: r.property_id, room: String(r.room_number ?? '').trim(), why: `fingerprint matches ${exact.length} properties (${exact.map((o) => o.property_id).join('/')}) — ambiguous` });
      continue;
    }
    if (exact.length === 1) {
      repairs.push({ eri: n, from: r.property_id, to: exact[0].property_id, tier: 1, why: `checkin+checkout+room+phone match ${exact[0].ezee_reservation_id}`, row: r });
      continue;
    }
    if (!phone && others.some((x) => byKey.get(`${x}-EZEE-${n}`))) {
      unsure.push({ eri: n, from: r.property_id, room: String(r.room_number ?? '').trim(), why: 'twin exists elsewhere but booker_phone is blank — fingerprint too weak' });
      continue;
    }

    const rn = String(r.room_number ?? '').trim();
    if (!rn || (inv.get(r.property_id) || new Set()).has(rn)) continue;
    const owners = others.filter((x) => (inv.get(x) || new Set()).has(rn));
    if (owners.length === 1 && byKey.get(`${owners[0]}-EZEE-${n}`)) {
      repairs.push({ eri: n, from: r.property_id, to: owners[0], tier: 2, why: `room ${rn} exists only at ${owners[0]}, twin present`, row: r });
    } else if (owners.length) {
      unsure.push({ eri: n, from: r.property_id, room: rn, why: owners.length > 1 ? `room ${rn} ambiguous (${owners.join('/')})` : `room ${rn} points at ${owners[0]} but no twin row` });
    }
  }

  console.log(`\n=== repair set: ${repairs.length} rows (tier1=${repairs.filter((r) => r.tier === 1).length} tier2=${repairs.filter((r) => r.tier === 2).length}) ===`);
  for (const r of repairs) {
    console.log(`  ${r.eri.padEnd(6)} ${r.from} -> ${r.to}  T${r.tier}  ${String(r.row.status).padEnd(11)}` +
      `${r.row.is_active ? ' active' : '       '}  room ${String(r.row.room_number ?? '').trim().padEnd(7)} out ${D(r.row.checkout_date)}  ${r.why}`);
  }
  console.log(`\n=== UNSURE — NOT touched, needs an eZee lookup: ${unsure.length} ===`);
  for (const u of unsure) console.log(`  ${u.eri.padEnd(6)} ${u.from}  room ${u.room.padEnd(7)} ${u.why}`);

  // Tier 2 infers room ownership from historical cache rows rather than from
  // authoritative property configuration, so it is review-only by default.
  const applySet = INCLUDE_TIER2 ? repairs : repairs.filter((r) => r.tier === 1);
  if (!INCLUDE_TIER2 && repairs.length !== applySet.length) {
    console.log(`\nNOTE: ${repairs.length - applySet.length} Tier 2 rows are listed but EXCLUDED from apply.` +
      `\n      Verify each against eZee, then pass --include-tier2 to act on them.`);
  }

  // Child rows that keep their own copy of property_id. All five of them —
  // `coupon_redemptions` is easy to miss because it is the only one whose
  // property_id is not adjacent to ezee_reservation_id in the schema.
  const eris = applySet.map((r) => r.eri);
  const target = new Map(applySet.map((r) => [r.eri, r.to]));
  const CHILD = ['payments', 'wa_service_request', 'coupon_redemptions', 'breakfast_order', 'breakfast_access_token'];
  console.log('\n=== child rows carrying their own property_id ===');
  const childPlan = {};
  for (const t of CHILD) {
    const rows = await prisma[t].findMany({
      where: { ezee_reservation_id: { in: eris } },
      select: { id: true, ezee_reservation_id: true, property_id: true },
    });
    childPlan[t] = rows
      .filter((x) => x.property_id !== target.get(x.ezee_reservation_id))
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));
    console.log(`  ${t.padEnd(24)} attached=${String(rows.length).padEnd(5)} to relabel=${childPlan[t].length}`);
  }

  // Exact manifest: every tuple that apply would write. A count-only guard
  // would let one candidate leave and another enter while the total held.
  const manifest = JSON.stringify({
    rows: applySet.map((r) => [r.eri, r.from, r.to, r.tier]).sort(),
    children: CHILD.map((t) => [t, childPlan[t].map((c) => String(c.id))]),
  });
  const manifestHash = crypto.createHash('sha256').update(manifest).digest('hex');
  console.log(`\n=== manifest ===\n  rows=${applySet.length} childRows=${CHILD.reduce((a, t) => a + childPlan[t].length, 0)}` +
    `\n  sha256=${manifestHash}`);

  console.log('\n=== rollback snapshot (save this before applying) ===');
  console.log('-- bookings');
  for (const r of applySet) {
    console.log(`UPDATE ezee_booking_cache SET property_id='${r.from}' WHERE ezee_reservation_id='${r.eri}';`);
  }
  console.log('-- children (by exact id, not by ERI)');
  for (const t of CHILD) {
    for (const c of childPlan[t]) {
      console.log(`UPDATE ${t} SET property_id='${c.property_id}' WHERE id='${c.id}';`);
    }
  }

  // This relabels property attribution. It does NOT merge the bare row with its
  // canonical twin, so the booking's history stays on one row while future
  // autosync updates land on the other. That split is tolerable only because
  // the worker now mirrors lifecycle onto a same-property duplicate; without
  // that, an active repaired row would strand.
  const stillActive = applySet.filter((r) => r.row.is_active);
  if (stillActive.length) {
    console.log(`\nNOTE: ${stillActive.length} row(s) in the apply set are still active ` +
      `(${stillActive.map((r) => r.eri).join(',')}). This is an attribution fix, not a consolidation — ` +
      `each keeps a separate canonical twin. Confirm the deployed worker mirrors lifecycle before applying.`);
  }

  if (!APPLY) {
    console.log(`\nDRY RUN — nothing written. To apply:\n` +
      `  node scripts/repair-eri-collisions.js --apply --manifest=${manifestHash}` +
      `${INCLUDE_TIER2 ? ' --include-tier2' : ''}`);
    return;
  }
  if (MANIFEST !== manifestHash) {
    console.error(`\nABORT: manifest mismatch. Nothing was written.` +
      `\n  approved: ${MANIFEST ?? '(none supplied)'}` +
      `\n  current:  ${manifestHash}` +
      `\nThe exact rows, properties, tiers or child rows have changed since the dry run you reviewed.` +
      `\nRe-run the dry run, re-review, and get the new hash approved.`);
    process.exitCode = 1;
    return;
  }

  console.log('\n=== APPLYING ===');
  await prisma.$transaction(async (tx) => {
    for (const r of applySet) {
      await tx.ezee_booking_cache.update({
        where: { ezee_reservation_id: r.eri },
        data: { property_id: r.to },
      });
    }
    for (const t of CHILD) {
      for (const c of childPlan[t]) {
        await tx[t].update({ where: { id: c.id }, data: { property_id: target.get(c.ezee_reservation_id) } });
      }
    }
  });
  console.log(`  bookings relabelled: ${applySet.length}`);
  for (const t of CHILD) console.log(`  ${t}: ${childPlan[t].length}`);
  console.log('DONE');
}

main()
  .catch((e) => { console.error('FAILED: ' + (e.stack || e.message)); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
