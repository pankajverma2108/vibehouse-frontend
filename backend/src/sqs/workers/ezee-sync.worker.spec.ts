// `uuid` ships ESM-only; ts-jest can't transform it under CJS without extra
// transformIgnorePatterns config. The worker only needs a stable sync-log id.
jest.mock('uuid', () => ({ v4: () => 'mocked-uuid-0000' }));

import { Test, TestingModule } from '@nestjs/testing';
import { EzeeSyncWorker } from './ezee-sync.worker';
import { EzeeService } from '../../ezee/ezee.service';
import { EzeeApiError } from '../../ezee/ezee.types';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../redis/cache.service';
import { AutosyncSideEffectsService } from '../../ezee/webhook/autosync-side-effects.service';
import { EmailService } from '../../email/email.service';
import { EzeeRoomGuestsService } from '../../ezee/ezee-room-guests.service';

/**
 * Unit tests for `postFolioPayment` — the folio-payment step re-enabled on
 * 2026-08-05 after eZee switched off hotel 55402's automatic (guessed) payment
 * posting.
 *
 * This step cannot be exercised end-to-end outside production (it writes to the
 * live PMS), so the double-pay guard is verified here instead. That guard is
 * the whole reason the step is safe to turn back on: the 2026-05-30 incident
 * was a double-paid folio with a negative balance, and these tests pin the
 * behaviour that prevents a repeat.
 *
 * Behaviour matrix:
 *   1. Clean folio, one room     → post the full captured amount
 *   2. Clean folio, three rooms  → split evenly, last sub absorbs the remainder
 *   3. Sub already carries a payment → skip that sub, pay the others
 *   4. Folio subs unrecognisable + money already on it → post nothing
 *   5. Folio unreadable          → post nothing, log FAILED
 *   6. Kill switch off           → post nothing, no sync-log row
 *   7. Zero / missing capture    → post nothing
 *   8. AddPayment throws         → swallowed (booking must not dead-letter)
 */
describe('EzeeSyncWorker.postFolioPayment', () => {
  let worker: EzeeSyncWorker;
  let ezee: { addPayment: jest.Mock; fetchBooking: jest.Mock };
  let syncLogs: Array<{ id: string; action: string; status: string; error?: string | null }>;

  /** Builds a FetchSingleBooking-shaped folio: one BookingTran per room. */
  const folioOf = (subs: Array<{ sub: string; paid: string }>) => ({
    BookingTran: subs.map((s) => ({ SubBookingId: s.sub, TotalPayment: s.paid })),
  });

  const run = (over: Partial<Parameters<any>[0]> = {}) =>
    (worker as any).postFolioPayment({
      eri: 'TEST-ERI-1',
      propertyId: '60765',
      reservationNo: '500',
      subReservationNos: ['500'],
      amount: 1000,
      folio: folioOf([{ sub: '500', paid: '0.00' }]),
      ...over,
    });

  beforeEach(async () => {
    delete process.env.EZEE_FOLIO_ADDPAYMENT_ENABLED;
    syncLogs = [];
    ezee = {
      addPayment: jest.fn().mockResolvedValue('RECEIPT-1'),
      fetchBooking: jest.fn(),
    };

    const prisma = {
      ezee_sync_log: {
        create: jest.fn(({ data }: any) => {
          syncLogs.push({ id: data.id, action: data.action, status: data.status });
          return Promise.resolve(data);
        }),
        update: jest.fn(({ where, data }: any) => {
          const row = syncLogs.find((l) => l.id === where.id);
          if (row) {
            row.status = data.status;
            row.error = data.error_message;
          }
          return Promise.resolve(data);
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EzeeSyncWorker,
        { provide: EzeeService, useValue: ezee },
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: {} },
        { provide: AutosyncSideEffectsService, useValue: {} },
        { provide: EmailService, useValue: {} },
        { provide: EzeeRoomGuestsService, useValue: {} },
      ],
    }).compile();

    worker = module.get<EzeeSyncWorker>(EzeeSyncWorker);
    // The worker sleeps 1s between multi-room postings; don't pay for that here.
    jest.spyOn(worker as any, 'delay').mockResolvedValue(undefined);
  });

  it('posts the full captured amount on a clean single-room folio', async () => {
    await run();

    expect(ezee.addPayment).toHaveBeenCalledTimes(1);
    expect(ezee.addPayment).toHaveBeenCalledWith('60765', '500', 1000);
    expect(syncLogs).toEqual([
      expect.objectContaining({ action: 'ADD_PAYMENT', status: 'SUCCESS' }),
    ]);
  });

  it('splits across sub-reservations to paise, last sub absorbing the remainder', async () => {
    await run({
      subReservationNos: ['500-1', '500-2', '500-3'],
      amount: 1000,
      folio: folioOf([
        { sub: '500-1', paid: '0.00' },
        { sub: '500-2', paid: '0.00' },
        { sub: '500-3', paid: '0.00' },
      ]),
    });

    // 1000 / 3 → 333.33 + 333.33 + 333.34; the posted total must equal the
    // capture exactly. Whole-rupee splitting would lose paise on every booking.
    const amounts = ezee.addPayment.mock.calls.map((c) => c[2]);
    expect(amounts).toEqual([333.33, 333.33, 333.34]);
    expect(amounts.reduce((a, b) => a + b, 0)).toBeCloseTo(1000, 2);
  });

  it('posts a fractional capture without losing paise', async () => {
    // The real 2026-08-05 case: Razorpay captured ₹1.29 on 61766 res 187.
    await run({ amount: 1.29, folio: folioOf([{ sub: '500', paid: '0.00' }]) });

    expect(ezee.addPayment).toHaveBeenCalledWith('60765', '500', 1.29);
  });

  it('warns when the capture exceeds what the folio says the stay costs', async () => {
    // Surfaces a pricing mismatch instead of leaving a silent negative balance.
    const warn = jest.spyOn((worker as any).logger, 'warn').mockImplementation(() => undefined);

    await run({
      amount: 1.29,
      folio: {
        BookingTran: [{ SubBookingId: '500', TotalPayment: '0.00', TotalAmountAfterTax: '1.05' }],
      },
    });

    // Still posts the real captured amount — we do not silently under-post.
    expect(ezee.addPayment).toHaveBeenCalledWith('60765', '500', 1.29);
    expect(warn.mock.calls.flat().join(' ')).toContain('exceeds');
  });

  it('skips a sub-reservation that already carries a payment', async () => {
    await run({
      subReservationNos: ['500-1', '500-2'],
      amount: 1000,
      folio: folioOf([
        { sub: '500-1', paid: '500.00' }, // already settled — e.g. SQS redelivery
        { sub: '500-2', paid: '0.00' },
      ]),
    });

    expect(ezee.addPayment).toHaveBeenCalledTimes(1);
    expect(ezee.addPayment).toHaveBeenCalledWith('60765', '500-2', 500);
  });

  it('posts nothing when the folio already has money but its subs are unrecognisable', async () => {
    // Defends the case where eZee's SubBookingId labels don't line up with the
    // SubReservationNo values InsertBooking returned — the per-sub check would
    // match nothing and we would otherwise double-pay.
    await run({
      subReservationNos: ['500-1', '500-2'],
      amount: 1000,
      folio: folioOf([
        { sub: 'XX-1', paid: '600.00' },
        { sub: 'XX-2', paid: '400.00' },
      ]),
    });

    expect(ezee.addPayment).not.toHaveBeenCalled();
    expect(syncLogs[0].status).toBe('SUCCESS'); // deliberate no-op, not a failure
  });

  it('re-reads the folio when step 3 did not supply one', async () => {
    ezee.fetchBooking.mockResolvedValue(folioOf([{ sub: '500', paid: '0.00' }]));

    await run({ folio: null });

    expect(ezee.fetchBooking).toHaveBeenCalledWith('60765', '500');
    expect(ezee.addPayment).toHaveBeenCalledWith('60765', '500', 1000);
  });

  it('posts nothing when the folio cannot be read', async () => {
    // An unpaid folio is repairable; a double-paid one is not, so unknown state
    // must mean hands off.
    ezee.fetchBooking.mockRejectedValue(new Error('eZee timeout'));

    await run({ folio: null });

    expect(ezee.addPayment).not.toHaveBeenCalled();
    expect(syncLogs[0]).toMatchObject({ action: 'ADD_PAYMENT', status: 'FAILED' });
  });

  it('posts nothing when the folio has no BookingTran to verify against', async () => {
    await run({ folio: { BookingTran: [] } });

    expect(ezee.addPayment).not.toHaveBeenCalled();
    expect(syncLogs[0].status).toBe('FAILED');
  });

  it('posts nothing when the kill switch is off', async () => {
    process.env.EZEE_FOLIO_ADDPAYMENT_ENABLED = 'false';

    await run();

    expect(ezee.addPayment).not.toHaveBeenCalled();
    expect(syncLogs).toHaveLength(0);
  });

  it('posts nothing when no money was captured', async () => {
    await run({ amount: 0 });

    expect(ezee.addPayment).not.toHaveBeenCalled();
    expect(syncLogs).toHaveLength(0);
  });

  /**
   * The coupon path is where the 2026-08-05 negative balances came from: the
   * discounted eZee base rate was rounded to whole rupees while Razorpay
   * charged the unrounded price plus GST. eZee accepts fractional rates
   * (verified live, 60765 res 127), so the paise must survive.
   */
  describe('buildEzeeRooms — coupon discount baked to paise', () => {
    const sel = (pricePerNight: number, quantity = 1) => ({
      ezeeRoomTypeId: 'rt', ezeeRatePlanId: 'rp', ezeeRateTypeId: 'rtype',
      quantity, pricePerNight,
    });
    const build = (sels: any[], nights: number, discount: number) =>
      (worker as any).buildEzeeRooms(sels, nights, 'A', 'B', 'note', discount);

    it('keeps the paise instead of rounding the rate to whole rupees', () => {
      // ₹3499 with a ₹3497.77 coupon → ₹1.23 due. The old Math.round sent ₹1,
      // so the folio totalled 1.05 while Razorpay captured 1.29.
      const rooms = build([sel(3499)], 1, 3497.77);
      expect(rooms[0].baseRates).toEqual([1.23]);
    });

    it('makes the baked rates sum exactly to the discounted subtotal', () => {
      const rooms = build([sel(1000, 3)], 2, 1234.56); // 6 room-nights
      const total = rooms
        .flatMap((r: any) => r.baseRates)
        .reduce((a: number, b: number) => a + b, 0);
      expect(Math.round(total * 100) / 100).toBe(4765.44); // 6000 − 1234.56
    });

    it('never emits a negative rate when the discount exceeds the subtotal', () => {
      const rooms = build([sel(500)], 1, 900);
      expect(rooms[0].baseRates).toEqual([0]);
    });

    it('leaves rates untouched when there is no coupon', () => {
      const rooms = build([sel(458.99)], 1, 0);
      expect(rooms[0].baseRates).toBeUndefined();
      expect(rooms[0].ratePerNight).toBe(458.99);
    });
  });

  it('swallows an AddPayment failure so the booking sync is not dead-lettered', async () => {
    ezee.addPayment.mockRejectedValue(new EzeeApiError('110', 'Invalid payment id', 'AddPayment'));

    await expect(run()).resolves.toBeUndefined();

    expect(syncLogs[0]).toMatchObject({ status: 'FAILED' });
    expect(syncLogs[0].error).toContain('110');
  });
});

/**
 * Unit tests for the autosync reservation-key namespacing.
 *
 * eZee numbers reservations per hotel from 1, so `UniqueID` alone collides
 * across properties. Because `ezee_reservation_id` is the primary key and
 * `property_id` was only ever written in the create branch, the first hotel to
 * push a given number owned that row forever and every later push from another
 * hotel silently overwrote its contents under the wrong property — which is how
 * a Koramangala guest's ticket reached BTM Layout's staff (ticket #479).
 *
 * Behaviour pinned here:
 *   1. New booking            → key is `{property_id}-EZEE-{UniqueID}`
 *   2. Same number, 2 hotels  → two independent rows, each with its own property
 *   3. Legacy bare row, same property     → adopted in place (history preserved)
 *   4. Legacy bare row, DIFFERENT property → left untouched (this was the bug)
 *   5. Namespaced row already exists      → updated, not duplicated
 *   6. Create sets ezee_reservation_no    → keeps it out of the "unsynced" sweep
 *   7. Bare AND namespaced both exist     → both move, neither strands
 *   8. Adoption backfills ezee_reservation_no
 *   9. A synced `-LCL-` row is adopted, not duplicated
 *  10. Three hotels sharing one number stay independent
 */
describe('EzeeSyncWorker.handleAutosyncWebhook — reservation-key namespacing', () => {
  let worker: EzeeSyncWorker;
  let table: Map<string, any>;

  const push = (property_id: string, UniqueID: string, operation = 'RESERVATION') =>
    (worker as any).handleAutosyncWebhook({
      property_id,
      operation,
      reservation: {
        UniqueID,
        BookingTran: [
          { SubBookingId: `${UniqueID}-1`, RoomName: '206', RoomTypeName: 'Suite',
            Start: '2026-08-06', End: '2026-08-09', Email: 'g@example.com', Mobile: '919986997827' },
        ],
      },
    });

  beforeEach(async () => {
    table = new Map();

    const prisma = {
      ezee_booking_cache: {
        findUnique: jest.fn(({ where }: any) => Promise.resolve(table.get(where.ezee_reservation_id) ?? null)),
        findMany: jest.fn(({ where }: any) =>
          Promise.resolve(
            [...table.values()].filter(
              (r: any) =>
                r.property_id === where.property_id &&
                r.ezee_reservation_no === where.ezee_reservation_no &&
                r.is_test === where.is_test,
            ),
          ),
        ),
        create: jest.fn(({ data }: any) => {
          if (table.has(data.ezee_reservation_id)) {
            return Promise.reject(Object.assign(new Error('Unique constraint'), { code: 'P2002' }));
          }
          table.set(data.ezee_reservation_id, { ...data });
          return Promise.resolve(data);
        }),
        update: jest.fn(({ where, data }: any) => {
          const row = table.get(where.ezee_reservation_id);
          if (!row) return Promise.reject(new Error('row not found: ' + where.ezee_reservation_id));
          Object.assign(row, data);
          return Promise.resolve(row);
        }),
      },
      ezee_sync_log: { create: jest.fn(({ data }: any) => Promise.resolve(data)), update: jest.fn().mockResolvedValue({}) },
      properties: { findUnique: jest.fn().mockResolvedValue({ brand: 'BUTEAK' }) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EzeeSyncWorker,
        { provide: EzeeService, useValue: {} },
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: {} },
        { provide: AutosyncSideEffectsService, useValue: { dispatch: jest.fn().mockResolvedValue(undefined) } },
        { provide: EmailService, useValue: {} },
        { provide: EzeeRoomGuestsService, useValue: { buildRoomGuests: () => [], applyRoomGuests: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    worker = module.get<EzeeSyncWorker>(EzeeSyncWorker);
    // Guest resolution and the payment mirror hit collaborators this test
    // doesn't care about; the key is what's under test.
    jest.spyOn(worker as any, 'findOrCreateGuestByEmail').mockResolvedValue('guest-1');
    jest.spyOn(worker as any, 'ensurePrimaryAccess').mockResolvedValue(undefined);
    jest.spyOn(worker as any, 'mirrorEzeePayments').mockResolvedValue(undefined);
  });

  it('keys a new booking by property, not by the bare reservation number', async () => {
    await push('61766', '98');

    expect([...table.keys()]).toEqual(['61766-EZEE-98']);
    expect(table.get('61766-EZEE-98')).toMatchObject({ property_id: '61766', ezee_reservation_no: '98' });
  });

  it('keeps two hotels that both have reservation 98 in separate rows', async () => {
    await push('61766', '98');
    await push('55402', '98');

    expect([...table.keys()].sort()).toEqual(['55402-EZEE-98', '61766-EZEE-98']);
    expect(table.get('61766-EZEE-98').property_id).toBe('61766');
    expect(table.get('55402-EZEE-98').property_id).toBe('55402');
  });

  it('adopts a pre-namespacing bare row when it belongs to the pushing property', async () => {
    // Its payments, tickets and access grants hang off this key — a new row
    // would strand all of them and leave the old one stuck CHECKED_IN forever.
    table.set('98', { ezee_reservation_id: '98', property_id: '61766', status: 'CONFIRMED', guest_id: 'guest-1' });

    await push('61766', '98', 'CHECKIN');

    expect([...table.keys()]).toEqual(['98']);
    expect(table.get('98')).toMatchObject({ property_id: '61766', status: 'CHECKED_IN' });
  });

  it('never touches a bare row stamped with a different property', async () => {
    // The exact #479 shape: BTM Layout squatted on key "98", then Koramangala's
    // reservation 98 pushed and used to overwrite it in place.
    table.set('98', { ezee_reservation_id: '98', property_id: '55402', status: 'CONFIRMED', room_number: '404' });

    await push('61766', '98');

    expect(table.get('98')).toMatchObject({ property_id: '55402', room_number: '404' });
    expect(table.get('61766-EZEE-98')).toMatchObject({ property_id: '61766', room_number: '206' });
  });

  it('updates the namespaced row on a repeat push instead of duplicating it', async () => {
    await push('61766', '98');
    await push('61766', '98', 'CHECKOUT');

    expect([...table.keys()]).toEqual(['61766-EZEE-98']);
    expect(table.get('61766-EZEE-98').status).toBe('CHECKED_OUT');
  });

  it('keeps a duplicate bare row in step when a namespaced row also exists', async () => {
    // 420 of 540 production bare rows have a same-property namespaced twin, and
    // for 16 of them the BARE row is the CHECKED_IN one — so it is the row the
    // guest resolver matches. Updating only the namespaced row would freeze the
    // bare one at CHECKED_IN forever: the guest would keep resolving as
    // in-house after leaving, and their checkout would never land.
    table.set('98', { ezee_reservation_id: '98', property_id: '61766', status: 'CHECKED_IN', is_active: true });
    table.set('61766-EZEE-98', { ezee_reservation_id: '61766-EZEE-98', property_id: '61766', status: 'CONFIRMED', is_active: true });

    await push('61766', '98', 'CHECKOUT');

    expect(table.get('61766-EZEE-98')).toMatchObject({ status: 'CHECKED_OUT', is_active: false });
    expect(table.get('98')).toMatchObject({ status: 'CHECKED_OUT', is_active: false });
  });

  it('backfills ezee_reservation_no when adopting a pre-namespacing row', async () => {
    // A null here reads as "created locally, never pushed to eZee", which puts
    // the booking back in reconcileUnsyncedBookings()'s InsertBooking queue for
    // a reservation that already exists in eZee.
    table.set('98', { ezee_reservation_id: '98', property_id: '61766', status: 'CONFIRMED', ezee_reservation_no: null });

    await push('61766', '98', 'CHECKIN');

    expect(table.get('98')).toMatchObject({ ezee_reservation_no: '98', status: 'CHECKED_IN' });
  });

  it('adopts a synced -LCL- row rather than creating a parallel booking', async () => {
    // We created the booking, pushed it to eZee, and eZee is now pushing it
    // back. Under the old code this produced a second row — 69 of the 79 synced
    // local bookings in production have exactly that duplicate.
    table.set('61766-LCL-ABC123', {
      ezee_reservation_id: '61766-LCL-ABC123', property_id: '61766',
      ezee_reservation_no: '98', status: 'CONFIRMED', is_test: false,
    });

    await push('61766', '98', 'CHECKIN');

    expect([...table.keys()]).toEqual(['61766-LCL-ABC123']);
    expect(table.get('61766-LCL-ABC123')).toMatchObject({ status: 'CHECKED_IN', room_number: '206' });
  });

  it('keeps the real LCL + bare shape in step, with the LCL row primary', async () => {
    // 69 of the 79 synced local bookings in production have exactly this shape.
    // The LCL row owns the payment and guest access; the bare row was written
    // by autosync before namespacing. Resolving to the bare row alone — which
    // an earlier revision did, because it checked the bare key first — leaves
    // the LCL row and the money attached to it frozen at a stale status.
    table.set('61766-LCL-ABC', {
      ezee_reservation_id: '61766-LCL-ABC', property_id: '61766',
      ezee_reservation_no: '98', status: 'CHECKED_IN', is_test: false,
    });
    table.set('98', { ezee_reservation_id: '98', property_id: '61766', status: 'CONFIRMED' });

    await push('61766', '98', 'CHECKOUT');

    expect(table.get('61766-LCL-ABC')).toMatchObject({ status: 'CHECKED_OUT', is_active: false });
    expect(table.get('98')).toMatchObject({ status: 'CHECKED_OUT', is_active: false });
    expect([...table.keys()].sort()).toEqual(['61766-LCL-ABC', '98']);
  });

  it('mirrors rather than inventing a third row when several rows claim one reservation', async () => {
    table.set('61766-LCL-AAA', { ezee_reservation_id: '61766-LCL-AAA', property_id: '61766', ezee_reservation_no: '98', is_test: false });
    table.set('61766-LCL-BBB', { ezee_reservation_id: '61766-LCL-BBB', property_id: '61766', ezee_reservation_no: '98', is_test: false });

    await push('61766', '98', 'CHECKIN');

    // Two local rows for one reservation is a data anomaly, but compounding it
    // with a third row helps nobody. Pick one deterministically, keep the other
    // in step, create nothing.
    expect([...table.keys()].sort()).toEqual(['61766-LCL-AAA', '61766-LCL-BBB']);
    expect(table.get('61766-LCL-AAA').status).toBe('CHECKED_IN');
    expect(table.get('61766-LCL-BBB').status).toBe('CHECKED_IN');
  });

  it('keeps three hotels sharing one reservation number fully independent', async () => {
    await push('55402', '98');
    await push('60765', '98', 'CHECKIN');
    await push('61766', '98', 'CHECKOUT');

    expect([...table.keys()].sort()).toEqual(['55402-EZEE-98', '60765-EZEE-98', '61766-EZEE-98']);
    // Each hotel's lifecycle moves on its own row and touches no other.
    expect(table.get('55402-EZEE-98')).toMatchObject({ property_id: '55402', status: 'PENDING_PAYMENT' });
    expect(table.get('60765-EZEE-98')).toMatchObject({ property_id: '60765', status: 'CHECKED_IN' });
    expect(table.get('61766-EZEE-98')).toMatchObject({ property_id: '61766', status: 'CHECKED_OUT' });
  });
});
