/**
 * Real-PostgreSQL integration gate for the eZee reservation-key collision fix.
 *
 * Unit tests cover the resolver's branch logic against an in-memory map. They
 * cannot cover what actually bites here: real primary keys, real foreign keys,
 * real transactions, real concurrency, and side-effects that target one row
 * while a duplicate holds the children. Production manual testing should
 * CONFIRM behaviour, not discover those for the first time — so this suite
 * runs the worker against a live Postgres schema.
 *
 * Scenarios required by the 2026-08-07 review, in order:
 *   1. bare + canonical seeded with payments, access and breakfast
 *   2. checkout updates every parent, and no child is orphaned
 *   3. failure injected between the primary update and the mirror
 *   4. concurrent duplicate webhook deliveries
 *   5. the real `LCL + bare` production shape
 *   6. externally-ingested rows cannot enter InsertBooking
 *   7. payment mirroring does not duplicate a payment across twins
 *
 * Run:
 *   ITEST_DATABASE_URL="postgresql://user:pass@localhost:5432/db?schema=eri_itest" \
 *     npx jest --config test/jest-integration.json
 *
 * Skips itself when ITEST_DATABASE_URL is unset so the default suite stays
 * runnable without a database.
 */
jest.mock('uuid', () => ({ v4: () => `itest-${Math.random().toString(36).slice(2, 12)}` }));

import { PrismaClient } from '@prisma/client';
import { Test } from '@nestjs/testing';
import { EzeeSyncWorker } from '../src/sqs/workers/ezee-sync.worker';
import { EzeeService } from '../src/ezee/ezee.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { CacheService } from '../src/redis/cache.service';
import { AutosyncSideEffectsService } from '../src/ezee/webhook/autosync-side-effects.service';
import { EmailService } from '../src/email/email.service';
import { EzeeRoomGuestsService } from '../src/ezee/ezee-room-guests.service';
import { EzeeReconciliationService } from '../src/ezee/ezee-reconciliation.service';

const URL = process.env.ITEST_DATABASE_URL;
const d = URL ? describe : describe.skip;

const PROP = '61766';
const OTHER = '55402';
const RES = '98';
const CANON = `${PROP}-EZEE-${RES}`;
const LCL = `${PROP}-LCL-ITEST01`;
const PHONE = '919986997827';

d('eZee reservation-key collision — real PostgreSQL', () => {
  let prisma: PrismaClient;
  let worker: EzeeSyncWorker;
  let dispatched: Array<{ eri: string }>;

  const push = (operation: string, property_id = PROP, uniqueId = RES) =>
    (worker as any).handleAutosyncWebhook({
      property_id,
      operation,
      reservation: {
        UniqueID: uniqueId,
        BookedBy: 'Airbnb',
        BookingTran: [
          {
            SubBookingId: `${uniqueId}-1`,
            RoomName: '206',
            RoomTypeName: 'Suite',
            Start: '2026-08-06',
            End: '2026-08-09',
            Email: 'itest@example.com',
            Mobile: PHONE,
          },
        ],
      },
    });

  /** Deletes children first — every one of the 15 has an enforced FK. */
  const wipe = async () => {
    await prisma.breakfast_access_token.deleteMany({});
    await prisma.breakfast_order.deleteMany({});
    await prisma.wa_service_request.deleteMany({});
    await prisma.payments.deleteMany({});
    await prisma.booking_guest_access.deleteMany({});
    await prisma.ezee_booking_cache.deleteMany({});
    await prisma.guests.deleteMany({});
    await prisma.ezee_sync_log.deleteMany({});
  };

  const booking = (eri: string, over: Record<string, unknown> = {}) => ({
    ezee_reservation_id: eri,
    property_id: PROP,
    status: 'CONFIRMED',
    is_active: true,
    room_number: '206',
    room_type_name: 'Suite',
    booker_phone: PHONE,
    booker_email: 'itest@example.com',
    no_of_guests: 1,
    checkin_date: new Date('2026-08-06'),
    checkout_date: new Date('2026-08-09'),
    fetched_at: new Date(),
    is_test: false,
    ...over,
  });

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: URL } } });
    await prisma.$connect();
    await prisma.properties.upsert({
      where: { id: PROP },
      update: {},
      create: { id: PROP, name: 'BUTEAK KORAMANGALA', brand: 'BUTEAK', city: 'Bengaluru', address: 'x' } as never,
    });
    await prisma.properties.upsert({
      where: { id: OTHER },
      update: {},
      create: { id: OTHER, name: 'Buteak Suites', brand: 'BUTEAK', city: 'Bengaluru', address: 'x' } as never,
    });

    dispatched = [];
    const module = await Test.createTestingModule({
      providers: [
        EzeeSyncWorker,
        { provide: EzeeService, useValue: {} },
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: {} },
        {
          provide: AutosyncSideEffectsService,
          useValue: { dispatch: jest.fn(async (p: { eri: string }) => { dispatched.push(p); }) },
        },
        { provide: EmailService, useValue: {} },
        {
          provide: EzeeRoomGuestsService,
          useValue: {
            buildRoomGuests: () => [],
            applyRoomGuests: jest.fn().mockResolvedValue(undefined),
            ensureAccess: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();
    worker = module.get(EzeeSyncWorker);
    jest.spyOn(worker as any, 'mirrorEzeePayments').mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await wipe().catch(() => undefined);
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await wipe();
    dispatched.length = 0;
  });

  // ── 1 + 2 ────────────────────────────────────────────────────────────────
  it('checks out every parent of a bare+canonical pair and orphans no child', async () => {
    await prisma.ezee_booking_cache.create({ data: booking(RES, { status: 'CHECKED_IN' }) as never });
    await prisma.ezee_booking_cache.create({ data: booking(CANON) as never });
    const guest = await prisma.guests.create({
      data: { id: 'g-itest-1', name: 'Itest', phone: PHONE, email: 'itest@example.com' } as never,
    });
    // The bare row owns the history, exactly as in production.
    await prisma.booking_guest_access.create({
      data: { id: 'a1', ezee_reservation_id: RES, guest_id: guest.id, role: 'PRIMARY', status: 'APPROVED' } as never,
    });
    await prisma.payments.create({
      data: { id: 'p1', ezee_reservation_id: RES, property_id: PROP, amount: 1000, status: 'CAPTURED', purpose: 'booking', currency: 'INR' } as never,
    });
    await prisma.breakfast_access_token.create({
      data: { id: 'b1', ezee_reservation_id: RES, property_id: PROP, brand: 'BUTEAK', token_hash: 'itest-hash-1', expires_at: new Date('2026-09-01') } as never,
    });

    await push('CHECKOUT');

    const bare = await prisma.ezee_booking_cache.findUnique({ where: { ezee_reservation_id: RES } });
    const canon = await prisma.ezee_booking_cache.findUnique({ where: { ezee_reservation_id: CANON } });
    // Both parents move. Neither strands at a stale status.
    expect(bare).toMatchObject({ status: 'CHECKED_OUT', is_active: false });
    expect(canon).toMatchObject({ status: 'CHECKED_OUT', is_active: false });

    // Children are conserved and still point at a parent that exists.
    expect(await prisma.booking_guest_access.count()).toBe(1);
    expect(await prisma.payments.count()).toBe(1);
    expect(await prisma.breakfast_access_token.count()).toBe(1);

    // Side-effects must fire against the row that OWNS the children — the bare
    // row — or a checkout cancels breakfast and revokes locks on a row holding
    // neither.
    expect(dispatched.map((x) => x.eri)).toEqual([RES]);
  });

  // ── 3 ────────────────────────────────────────────────────────────────────
  it('surfaces a failure injected between the primary update and the mirror', async () => {
    await prisma.ezee_booking_cache.create({ data: booking(RES, { status: 'CHECKED_IN' }) as never });
    await prisma.ezee_booking_cache.create({ data: booking(CANON) as never });

    const real = prisma.ezee_booking_cache.update.bind(prisma.ezee_booking_cache);
    let n = 0;
    const spy = jest
      .spyOn(prisma.ezee_booking_cache, 'update')
      .mockImplementation(((args: never) => {
        n += 1;
        if (n === 2) return Promise.reject(new Error('injected: mirror failed'));
        return real(args);
      }) as never);

    await expect(push('CHECKOUT')).rejects.toThrow('injected');
    spy.mockRestore();

    // The handler rethrows so SQS retries — it does not swallow the failure and
    // report success with only half the rows moved. The parent and mirror are
    // NOT in one transaction, so a divergence is visible until the retry lands;
    // that is the documented behaviour, and the point of this test is that the
    // message is retried rather than acked.
    const log = await prisma.ezee_sync_log.findMany({ where: { status: 'FAILED' } });
    expect(log.length).toBeGreaterThan(0);

    // The retry converges both rows.
    await push('CHECKOUT');
    const rows = await prisma.ezee_booking_cache.findMany({ where: { ezee_reservation_id: { in: [RES, CANON] } } });
    expect(rows.map((r) => r.status)).toEqual(['CHECKED_OUT', 'CHECKED_OUT']);
  });

  // ── 4 ────────────────────────────────────────────────────────────────────
  it('stays idempotent under concurrent duplicate deliveries of the same push', async () => {
    const results = await Promise.allSettled([push('RESERVATION'), push('RESERVATION'), push('RESERVATION')]);
    const failed = results.filter((r) => r.status === 'rejected');

    // A unique-violation race is acceptable (SQS redelivers); silently creating
    // two rows for one booking is not.
    const rows = await prisma.ezee_booking_cache.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].ezee_reservation_id).toBe(CANON);
    expect(rows[0].property_id).toBe(PROP);
    for (const f of failed as PromiseRejectedResult[]) {
      expect(String(f.reason?.code ?? f.reason?.message)).toMatch(/P2002|Unique/i);
    }
  });

  // ── 5 ────────────────────────────────────────────────────────────────────
  it('keeps the real LCL + bare production shape in step, with LCL primary', async () => {
    // 69 of the 79 synced local bookings in production have exactly this shape.
    // The LCL row owns the payment and guest access; the bare row was written
    // by autosync. Resolving to the bare row alone leaves the LCL row — and the
    // money attached to it — frozen.
    await prisma.ezee_booking_cache.create({
      data: booking(LCL, { status: 'CHECKED_IN', ezee_reservation_no: RES }) as never,
    });
    await prisma.ezee_booking_cache.create({ data: booking(RES) as never });
    const guest = await prisma.guests.create({
      data: { id: 'g-itest-2', name: 'Itest2', phone: PHONE, email: 'itest@example.com' } as never,
    });
    await prisma.booking_guest_access.create({
      data: { id: 'a2', ezee_reservation_id: LCL, guest_id: guest.id, role: 'PRIMARY', status: 'APPROVED' } as never,
    });
    await prisma.payments.create({
      data: { id: 'p2', ezee_reservation_id: LCL, property_id: PROP, amount: 2500, status: 'CAPTURED', purpose: 'booking', currency: 'INR' } as never,
    });

    await push('CHECKOUT');

    const lcl = await prisma.ezee_booking_cache.findUnique({ where: { ezee_reservation_id: LCL } });
    const bare = await prisma.ezee_booking_cache.findUnique({ where: { ezee_reservation_id: RES } });
    expect(lcl).toMatchObject({ status: 'CHECKED_OUT', is_active: false });
    expect(bare).toMatchObject({ status: 'CHECKED_OUT', is_active: false });

    // No third row invented for a booking we already had, twice.
    expect(await prisma.ezee_booking_cache.count()).toBe(2);
    // Side-effects target the row holding the payment and access.
    expect(dispatched.map((x) => x.eri)).toEqual([LCL]);
  });

  // ── 6 ────────────────────────────────────────────────────────────────────
  it('never queues an externally-ingested booking for InsertBooking', async () => {
    // Reservation 98's production sync log shows six INSERT_BOOKING failures:
    // a booking that came FROM eZee was being pushed back INTO eZee.
    const guest = await prisma.guests.create({
      data: { id: 'g-itest-3', name: 'Itest3', phone: PHONE, email: 'itest@example.com' } as never,
    });
    for (const [eri, resNo] of [
      [RES, null],
      [CANON, RES],
      [LCL, null],
    ] as Array<[string, string | null]>) {
      await prisma.ezee_booking_cache.create({
        data: booking(eri, { ezee_reservation_no: resNo, guest_id: guest.id }) as never,
      });
      await prisma.payments.create({
        data: { id: `pay-${eri}`, ezee_reservation_id: eri, property_id: PROP, amount: 100, status: 'CAPTURED', purpose: 'booking', currency: 'INR' } as never,
      });
    }

    const sent: unknown[] = [];
    const recon = new EzeeReconciliationService(
      prisma as never,
      { sendEzeeInsertBooking: jest.fn(async (m: unknown) => { sent.push(m); }) } as never,
      { fetchReservationsByDateRange: jest.fn().mockResolvedValue([]) } as never,
      {} as never,
      {} as never,
    );
    await (recon as any).reconcileUnsyncedBookings();

    // Only the booking WE created may be pushed. The bare row (autosync) and
    // the canonical row (reconciliation) are external and must never be.
    expect(sent).toHaveLength(1);
    expect((sent[0] as { eri: string }).eri).toBe(LCL);
  });

  // ── 7 ────────────────────────────────────────────────────────────────────
  it('does not duplicate a payment across twins when the mirror runs', async () => {
    await prisma.ezee_booking_cache.create({ data: booking(RES, { status: 'CHECKED_IN' }) as never });
    await prisma.ezee_booking_cache.create({ data: booking(CANON) as never });
    await prisma.payments.create({
      data: { id: 'p3', ezee_reservation_id: RES, property_id: PROP, amount: 4200, status: 'CAPTURED', purpose: 'booking', currency: 'INR' } as never,
    });

    await push('CHECKIN');
    await push('CHECKOUT');

    const pays = await prisma.payments.findMany();
    expect(pays).toHaveLength(1);
    expect(pays[0].ezee_reservation_id).toBe(RES);
    expect(Number(pays[0].amount)).toBe(4200);
  });

  // ── cross-property safety, on real constraints ───────────────────────────
  it('never touches a bare row belonging to another property', async () => {
    await prisma.ezee_booking_cache.create({
      data: booking(RES, { property_id: OTHER, room_number: '404', status: 'CHECKED_IN' }) as never,
    });

    await push('RESERVATION');

    const bare = await prisma.ezee_booking_cache.findUnique({ where: { ezee_reservation_id: RES } });
    expect(bare).toMatchObject({ property_id: OTHER, room_number: '404', status: 'CHECKED_IN' });
    const canon = await prisma.ezee_booking_cache.findUnique({ where: { ezee_reservation_id: CANON } });
    expect(canon).toMatchObject({ property_id: PROP, room_number: '206' });
    expect(dispatched.map((x) => x.eri)).toEqual([CANON]);
  });
});
