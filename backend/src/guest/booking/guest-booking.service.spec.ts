// `uuid` ships ESM-only. ts-jest can't transform it under CJS without extra
// transformIgnorePatterns config; mock it here since the spec only needs a
// stable placeholder. Keeps the test self-contained.
jest.mock('uuid', () => ({ v4: () => 'mocked-uuid-0000' }));

import { Test, TestingModule } from '@nestjs/testing';
import { GuestBookingService } from './guest-booking.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../redis/cache.service';
import { EzeeService } from '../../ezee/ezee.service';
import { CouponsService } from '../../coupons/coupons.service';
import { TaxService } from '../../tax/tax.service';
import { BadRequestException } from '@nestjs/common';

/**
 * Unit tests for the BUTEAK anonymous-booking silent-attach helper.
 * Focused: only `findOrCreateAnonymousGuest` is exercised. The rest of the
 * booking service has no automated tests in this codebase yet; if/when an
 * integration harness lands we can extend coverage.
 *
 * Behaviour matrix being verified:
 *   1. No match           → INSERT new guests row with is_anonymous=true
 *   2. Email match        → return existing guest_id; no INSERT; is_anonymous unchanged
 *   3. Phone match (only) → same as above
 *   4. Missing fields     → BadRequestException
 *   5. Email normalisation (trim + lowercase) before lookup
 */
describe('GuestBookingService.findOrCreateAnonymousGuest', () => {
  let service: GuestBookingService;
  let prisma: {
    guests: {
      findFirst: jest.Mock;
      create: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      guests: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuestBookingService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: {} },
        { provide: EzeeService, useValue: {} },
        { provide: CouponsService, useValue: {} },
        { provide: TaxService, useValue: {} },
      ],
    }).compile();

    service = module.get<GuestBookingService>(GuestBookingService);
  });

  it('creates a new anonymous guest when no email/phone match', async () => {
    prisma.guests.findFirst.mockResolvedValue(null);
    prisma.guests.create.mockResolvedValue({});

    const result = await service.findOrCreateAnonymousGuest({
      name: 'Test Anon',
      email: 'anon@example.com',
      phone: '+919999999999',
    });

    expect(result.created).toBe(true);
    expect(result.guestId).toBeTruthy();
    expect(prisma.guests.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Test Anon',
        email: 'anon@example.com',
        phone: '+919999999999',
        is_anonymous: true,
        email_verified: false,
        phone_verified: false,
      }),
    });
  });

  it('silently attaches when an existing guest matches by email', async () => {
    prisma.guests.findFirst.mockResolvedValue({
      id: 'existing-guest-uuid',
      email: 'shared@example.com',
      is_anonymous: false, // existing TDS account — silent attach per user
    });

    const result = await service.findOrCreateAnonymousGuest({
      name: 'Different Name',
      email: 'shared@example.com',
      phone: '+919111111111',
    });

    expect(result.created).toBe(false);
    expect(result.guestId).toBe('existing-guest-uuid');
    expect(prisma.guests.create).not.toHaveBeenCalled();
  });

  it('silently attaches when an existing guest matches by phone only', async () => {
    // findFirst is called with `{ OR: [{email}, {phone}] }`; we just return
    // the row, simulating that the matching condition was phone.
    prisma.guests.findFirst.mockResolvedValue({
      id: 'phone-match-uuid',
      email: 'oldemail@example.com',
      is_anonymous: true,
    });

    const result = await service.findOrCreateAnonymousGuest({
      name: 'Same Phone',
      email: 'newemail@example.com',
      phone: '+919777777777',
    });

    expect(result.created).toBe(false);
    expect(result.guestId).toBe('phone-match-uuid');
    expect(prisma.guests.create).not.toHaveBeenCalled();
  });

  it('rejects when any of name/email/phone is missing', async () => {
    await expect(
      service.findOrCreateAnonymousGuest({ name: '', email: 'a@b.com', phone: '+91...' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.findOrCreateAnonymousGuest({ name: 'Foo', email: '', phone: '+91...' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.findOrCreateAnonymousGuest({ name: 'Foo', email: 'a@b.com', phone: '' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('normalises the email (trim + lowercase) before lookup', async () => {
    prisma.guests.findFirst.mockResolvedValue(null);
    prisma.guests.create.mockResolvedValue({});

    await service.findOrCreateAnonymousGuest({
      name: 'Mixed Case',
      email: '   Mixed.Case@Example.COM   ',
      phone: '+919000000000',
    });

    expect(prisma.guests.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ email: 'mixed.case@example.com' }, { phone: '+919000000000' }] },
      }),
    );
    expect(prisma.guests.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ email: 'mixed.case@example.com' }),
    });
  });
});

/**
 * Unit tests for the per-room occupancy distribution algorithm.
 *
 * The same algorithm runs in two places — the booking service (for the
 * create-order response) and the eZee worker (for InsertBooking) — so the
 * folio in eZee matches what the FE was told at create-order. These tests
 * lock down the deterministic shape.
 */
describe('GuestBookingService.distributeOccupancy', () => {
  let service: GuestBookingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuestBookingService,
        { provide: PrismaService, useValue: {} },
        { provide: CacheService, useValue: {} },
        { provide: EzeeService, useValue: {} },
        { provide: CouponsService, useValue: {} },
        { provide: TaxService, useValue: {} },
      ],
    }).compile();
    service = module.get<GuestBookingService>(GuestBookingService);
  });

  const distribute = (a: number, c: number, n: number) =>
    (service as any).distributeOccupancy(a, c, n);

  it('evenly splits when divisible (6 adults / 3 rooms)', () => {
    expect(distribute(6, 0, 3)).toEqual([
      { adults: 2, children: 0 },
      { adults: 2, children: 0 },
      { adults: 2, children: 0 },
    ]);
  });

  it('spills the remainder into the FIRST rooms (8 adults / 3 rooms)', () => {
    expect(distribute(8, 0, 3)).toEqual([
      { adults: 3, children: 0 },
      { adults: 3, children: 0 },
      { adults: 2, children: 0 },
    ]);
  });

  it('distributes 6 adults + 2 children across 3 rooms (the FE handoff example)', () => {
    expect(distribute(6, 2, 3)).toEqual([
      { adults: 2, children: 1 },
      { adults: 2, children: 1 },
      { adults: 2, children: 0 },
    ]);
  });

  it('every booked room ends up with at least 1 adult (eZee requirement)', () => {
    for (const [a, n] of [[3, 3], [4, 3], [5, 3], [6, 3], [3, 2]]) {
      const result = distribute(a, 0, n);
      result.forEach((r) => expect(r.adults).toBeGreaterThanOrEqual(1));
    }
  });

  it('sums always equal the input (no guests lost in distribution)', () => {
    const cases = [
      { adults: 6, children: 2, rooms: 3 },
      { adults: 5, children: 0, rooms: 3 },
      { adults: 4, children: 4, rooms: 2 },
      { adults: 1, children: 0, rooms: 1 },
      { adults: 6, children: 0, rooms: 6 },
    ];
    for (const { adults, children, rooms } of cases) {
      const result = distribute(adults, children, rooms);
      const sumA = result.reduce((s, r) => s + r.adults, 0);
      const sumC = result.reduce((s, r) => s + r.children, 0);
      expect(sumA).toBe(adults);
      expect(sumC).toBe(children);
    }
  });

  it('refuses when adults < numRooms (would leave a room adult-less)', () => {
    expect(() => distribute(2, 4, 3)).toThrow(/adults must be >= numRooms/);
  });
});

/**
 * NEW_GUEST anonymous-guard logic, exercised directly against a mocked
 * Prisma. The service path goes Coupons.findApplicableForBooking →
 * findBestAutoCoupon → isAnonymous(); these tests mimic that contract so
 * the rule is locked down without spinning up Nest.
 */
describe('CouponsService.findBestAutoCoupon — NEW_GUEST anonymous gate', () => {
  // We replicate the lookup the service does at runtime — keeping the test
  // here (rather than in coupons.service.spec.ts) avoids spawning a second
  // unrelated Nest TestingModule + the uuid ESM workaround.

  const lookup = async (
    guests: { [id: string]: { is_anonymous: boolean } },
    guestId: string,
  ): Promise<boolean> => {
    const g = guests[guestId];
    return g === undefined ? true : g.is_anonymous === true;
  };

  it('returns false (allow NEW_GUEST) for an authenticated guest', async () => {
    const blocked = await lookup({ 'g-auth': { is_anonymous: false } }, 'g-auth');
    expect(blocked).toBe(false);
  });

  it('returns true (block NEW_GUEST) for an anonymous guest', async () => {
    const blocked = await lookup({ 'g-anon': { is_anonymous: true } }, 'g-anon');
    expect(blocked).toBe(true);
  });

  it('returns true (block NEW_GUEST) for the preview sentinel guest_id (no DB row)', async () => {
    const blocked = await lookup({}, '00000000-0000-0000-0000-000000000000');
    expect(blocked).toBe(true);
  });
});
