/**
 * Ops / Developer CLI utility to generate a live single-use feedback token.
 *
 * Usage:
 *   node --env-file=.env scripts/generate-feedback-token.js [ticket_id] [ttl_days]
 */

const { PrismaClient } = require('@prisma/client');
const { createHash, randomBytes } = require('crypto');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

function sha256(str) {
  return createHash('sha256').update(str).digest('hex');
}

async function main() {
  const args = process.argv.slice(2);
  const ticketIdArg = args[0];
  const ttlDays = parseInt(args[1] ?? '7', 10);

  let ticketId = ticketIdArg;

  if (!ticketId) {
    // Look for the latest ticket
    const latest = await prisma.zoho_ticket_ref.findFirst({
      orderBy: { created_at: 'desc' },
      select: { id: true, subject: true, status: true },
    });
    if (latest) {
      ticketId = latest.id;
      console.log(`Using latest ticket: ${ticketId} (${latest.subject} [${latest.status}])`);
    } else {
      // Create a test ticket using existing seeded booking
      const testEri = 'EZEE-KA-2026-001';

      const newTicket = await prisma.zoho_ticket_ref.create({
        data: {
          id: uuidv4(),
          ticket_type: 'SERVICE_REQUEST',
          status: 'COMPLETED',
          subject: 'CLI Seeded Service Request',
          department: 'HOUSEKEEPING',
          room_number: '101',
          unit_code: 'BED-D101-A',
          guest_id: 'guest-arjun-001',
          ezee_reservation_id: testEri,
          synced_at: new Date(),
          zoho_ticket_id: 'ZOHO-CLI-' + Math.floor(10000 + Math.random() * 90000),
        },
      });
      ticketId = newTicket.id;
      console.log(`Created new completed test ticket: ${ticketId}`);
    }
  }

  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = sha256(rawToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlDays * 24 * 60 * 60_000);

  const fb = await prisma.ticket_feedback.create({
    data: {
      id: uuidv4(),
      ticket_id: ticketId,
      brand: 'TDS',
      token_hash: tokenHash,
      expires_at: expiresAt,
      guest_id: 'guest-arjun-001',
    },
  });

  const feBase = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  const beBase = process.env.API_BASE_URL ?? 'http://localhost:8000';

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  FEEDBACK TOKEN GENERATED SUCCESSFULLY');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`Feedback ID:    ${fb.id}`);
  console.log(`Ticket ID:      ${ticketId}`);
  console.log(`Raw Token:      ${rawToken}`);
  console.log(`Expires At:     ${expiresAt.toISOString()} (${ttlDays} days)`);
  console.log('──────────────────────────────────────────────────────────');
  console.log(`Guest UI URL:   ${feBase}/feedback/${rawToken}`);
  console.log(`Public API URL: ${beBase}/public/feedback/${rawToken}`);
  console.log('══════════════════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('Failed to generate feedback token:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
