import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

function getEnv(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v.trim() : fallback;
}

async function main() {
  console.log('🌱 Starting comprehensive Vibehouse baseline seed...\n');

  // ─── 1. PROPERTIES ──────────────────────────────────────────────────────────
  const propAId = getEnv('DEFAULT_PROPERTY_ID', '60765');
  const propBId = '55402';

  const properties = [
    {
      id: propAId,
      name: 'The Daily Social - Koramangala A',
      address: '100 Feet Road, Koramangala 4th Block',
      city: 'Bangalore',
      brand: 'TDS',
      branding_config: {
        primary_color: '#7C3AED',
        logo_url: '/logo-tds.png',
        property_code: 'TDS-KA',
      },
      tax_rate_pct: new Prisma.Decimal(12.0),
      allow_anonymous_booking: true,
    },
    {
      id: propBId,
      name: 'Buteak Suites - BTM Layout',
      address: 'Outer Ring Road, BTM 2nd Stage',
      city: 'Bangalore',
      brand: 'BUTEAK',
      branding_config: {
        primary_color: '#0F172A',
        logo_url: '/logo-buteak.png',
        property_code: 'BUTEAK-BTM',
      },
      tax_rate_pct: new Prisma.Decimal(12.0),
      allow_anonymous_booking: true,
    },
  ];

  for (const prop of properties) {
    await prisma.properties.upsert({
      where: { id: prop.id },
      update: {
        name: prop.name,
        address: prop.address,
        city: prop.city,
        brand: prop.brand,
        branding_config: prop.branding_config,
        tax_rate_pct: prop.tax_rate_pct,
        allow_anonymous_booking: prop.allow_anonymous_booking,
      },
      create: prop,
    });
  }
  console.log(`✅ Properties seeded: ${properties.map((p) => p.name).join(', ')}`);

  // ─── 1b. EZEE CONNECTIONS ──────────────────────────────────────────────────
  const authCode = getEnv('AUTH_CODE', 'mock-auth-code-local');
  const connections = [
    {
      id: 'ezee-conn-ka-001',
      property_id: propAId,
      hotel_code: propAId,
      api_key: authCode,
      api_endpoint: 'https://live.ipms247.com/',
      is_active: true,
    },
    {
      id: 'ezee-conn-btm-001',
      property_id: propBId,
      hotel_code: propBId,
      api_key: authCode,
      api_endpoint: 'https://live.ipms247.com/',
      is_active: true,
    },
  ];

  for (const conn of connections) {
    await prisma.ezee_connection.upsert({
      where: { id: conn.id },
      update: { is_active: true, api_key: conn.api_key },
      create: conn,
    });
  }
  console.log('✅ eZee connections seeded');

  // ─── 2. ADMIN ROLES ─────────────────────────────────────────────────────────
  const roles = [
    {
      id: 'role-owner',
      name: 'OWNER',
      display_name: 'Owner / Director',
      permissions: [
        'dashboard.view', 'dashboard.analytics',
        'inventory.view', 'inventory.edit',
        'sla.config', 'sla.override',
        'staff.manage', 'staff.create', 'staff.deactivate',
        'orders.view', 'orders.refund',
        'devices.view', 'devices.manage',
        'admin.manage', 'admin.create',
        'financial.view', 'financial.export',
        'checkin.override', 'borrowable.manage', 'borrowable.return_verify',
        'returnable.manage', 'returnable.return_verify',
        'maintenance.tickets',
        'bookings.view', 'bookings.create',
        'events.view', 'events.edit',
        'kyc.view', 'kyc.delete',
        'coupons.view', 'coupons.edit',
        'breakfast.view', 'breakfast.edit',
      ],
    },
    {
      id: 'role-manager',
      name: 'MANAGER',
      display_name: 'Property Manager',
      permissions: [
        'dashboard.view', 'dashboard.analytics',
        'inventory.view', 'inventory.edit',
        'sla.config',
        'staff.manage',
        'orders.view', 'orders.refund',
        'devices.view', 'devices.manage',
        'admin.manage', 'admin.create',
        'returnable.manage', 'returnable.return_verify',
        'bookings.view', 'bookings.create',
        'events.view', 'events.edit',
        'kyc.view', 'kyc.delete',
        'coupons.view',
        'breakfast.view', 'breakfast.edit',
      ],
    },
    {
      id: 'role-reception',
      name: 'RECEPTION',
      display_name: 'Front Desk / Receptionist',
      permissions: [
        'inventory.view',
        'orders.view',
        'checkin.override',
        'borrowable.manage',
        'returnable.manage', 'returnable.return_verify',
        'bookings.view', 'bookings.create',
        'events.view',
        'kyc.view', 'kyc.delete',
        'coupons.view',
        'breakfast.view', 'breakfast.edit',
      ],
    },
    {
      id: 'role-housekeeping-lead',
      name: 'HOUSEKEEPING_LEAD',
      display_name: 'Housekeeping Supervisor',
      permissions: [
        'inventory.view', 'inventory.edit',
        'borrowable.manage', 'borrowable.return_verify',
        'returnable.manage', 'returnable.return_verify',
        'breakfast.view', 'breakfast.edit',
      ],
    },
    {
      id: 'role-maintenance-lead',
      name: 'MAINTENANCE_LEAD',
      display_name: 'Maintenance Supervisor',
      permissions: [
        'devices.view', 'devices.manage',
        'maintenance.tickets',
      ],
    },
    {
      id: 'role-tech-ops',
      name: 'TECH_OPS',
      display_name: 'Tech & Ops',
      permissions: [
        'dashboard.view', 'dashboard.analytics',
        'inventory.view', 'inventory.edit',
        'sla.config', 'sla.override',
        'staff.manage', 'staff.create', 'staff.deactivate',
        'orders.view', 'orders.refund',
        'devices.view', 'devices.manage',
        'admin.manage', 'admin.create',
        'financial.view', 'financial.export',
        'checkin.override', 'borrowable.manage', 'borrowable.return_verify',
        'returnable.manage', 'returnable.return_verify',
        'maintenance.tickets',
        'bookings.view', 'bookings.create',
        'events.view', 'events.edit',
        'kyc.view', 'kyc.delete',
        'coupons.view', 'coupons.edit',
        'breakfast.view', 'breakfast.edit',
      ],
    },
  ];

  for (const role of roles) {
    await prisma.admin_roles.upsert({
      where: { id: role.id },
      update: { permissions: role.permissions, display_name: role.display_name },
      create: role,
    });
  }
  console.log(`✅ Admin roles seeded (${roles.length} roles)`);

  // ─── 3. ADMIN USERS ─────────────────────────────────────────────────────────
  const adminPassword = getEnv('SEED_ADMIN_PASSWORD', 'Admin123!');
  const adminPasswordHash = await bcrypt.hash(adminPassword, 12);
  const legacyPasswordHash = await bcrypt.hash('Vibe@2026!', 12);

  const adminUsers: Array<{
    name: string;
    email: string;
    phone: string;
    role_id: string;
    password_hash: string;
    property_ids: 'ALL' | string[];
  }> = [
    {
      name: 'Super Admin',
      email: 'admin@vibehouse.in',
      phone: '+919876543200',
      role_id: 'role-owner',
      password_hash: adminPasswordHash,
      property_ids: 'ALL',
    },
    {
      name: 'Upamanyu (Owner)',
      email: 'owner@vibehouse.in',
      phone: '+919876543210',
      role_id: 'role-owner',
      password_hash: adminPasswordHash,
      property_ids: 'ALL',
    },
    {
      name: 'Priya Sharma (Manager)',
      email: 'manager@vibehouse.in',
      phone: '+919876543211',
      role_id: 'role-manager',
      password_hash: legacyPasswordHash,
      property_ids: [propAId],
    },
    {
      name: 'Rohit Nair (Reception)',
      email: 'reception@vibehouse.in',
      phone: '+919876543212',
      role_id: 'role-reception',
      password_hash: legacyPasswordHash,
      property_ids: [propAId],
    },
    {
      name: 'Sunita Patil (Housekeeping)',
      email: 'housekeeping@vibehouse.in',
      phone: '+919876543213',
      role_id: 'role-housekeeping-lead',
      password_hash: legacyPasswordHash,
      property_ids: [propAId],
    },
    {
      name: 'Ravi Kumar (Maintenance)',
      email: 'maintenance@vibehouse.in',
      phone: '+919876543214',
      role_id: 'role-maintenance-lead',
      password_hash: legacyPasswordHash,
      property_ids: [propAId],
    },
  ];

  const allPropertyIds = [propAId, propBId];

  for (const user of adminUsers) {
    let row = await prisma.admin_users.findUnique({ where: { email: user.email } });
    if (!row) {
      row = await prisma.admin_users.create({
        data: {
          id: uuidv4(),
          name: user.name,
          email: user.email,
          phone: user.phone,
          role_id: user.role_id,
          password_hash: user.password_hash,
          is_active: true,
        },
      });
    } else {
      await prisma.admin_users.update({
        where: { id: row.id },
        data: { password_hash: user.password_hash, is_active: true },
      });
    }

    const desired = user.property_ids === 'ALL' ? allPropertyIds : user.property_ids;
    for (const pid of desired) {
      await prisma.admin_user_properties.upsert({
        where: { admin_user_id_property_id: { admin_user_id: row.id, property_id: pid } },
        update: {},
        create: { admin_user_id: row.id, property_id: pid },
      });
    }
  }
  console.log(`✅ Admin users seeded (${adminUsers.length} users + property assignments)`);
  console.log(`   Default Admin Login: admin@vibehouse.in / ${adminPassword}`);

  // ─── 4. GUESTS ──────────────────────────────────────────────────────────────
  const guestPasswordHash = await bcrypt.hash('GuestPass123!', 12);

  const guestArjunId   = 'guest-arjun-001';
  const guestNehaId    = 'guest-neha-002';
  const guestPreethiId = 'guest-preethi-003';
  const guestSamirId   = 'guest-samir-004';
  const guestAishaId   = 'guest-aisha-005';
  const guestVikramId  = 'guest-vikram-006';
  const guestMeeraId   = 'guest-meera-007';
  const guestRahulId   = 'guest-rahul-008';

  const guests = [
    {
      id: guestArjunId,
      name: 'Arjun Mehta',
      email: 'arjun@vibehouse.in',
      phone: '+919000000001',
      email_verified: true,
      phone_verified: false,
    },
    {
      id: guestNehaId,
      name: 'Neha Kapoor',
      email: 'neha@vibehouse.in',
      phone: '+919000000002',
      email_verified: true,
      phone_verified: false,
    },
    {
      id: guestPreethiId,
      name: 'Preethi Iyer',
      email: 'preethi@vibehouse.in',
      phone: '+919000000003',
      email_verified: false,
      phone_verified: false,
    },
    {
      id: guestSamirId,
      name: 'Samir Desai',
      email: 'samir@gmail.com',
      phone: '+919000000004',
      email_verified: true,
      phone_verified: true,
    },
    {
      id: guestAishaId,
      name: 'Aisha Khan',
      email: 'aisha.khan@outlook.com',
      phone: '+919000000005',
      email_verified: true,
      phone_verified: false,
    },
    {
      id: guestVikramId,
      name: 'Vikram Singh',
      email: 'vikram.singh@yahoo.com',
      phone: '+919000000006',
      email_verified: true,
      phone_verified: true,
    },
    {
      id: guestMeeraId,
      name: 'Meera Joshi',
      email: 'meera.joshi@gmail.com',
      phone: '+919000000007',
      email_verified: true,
      phone_verified: false,
    },
    {
      id: guestRahulId,
      name: 'Rahul Verma',
      email: 'rahul.verma@protonmail.com',
      phone: '+919000000008',
      email_verified: false,
      phone_verified: true,
    },
  ];

  for (const g of guests) {
    const exists = await prisma.guests.findUnique({ where: { email: g.email } });
    if (!exists) {
      await prisma.guests.create({ data: { ...g, password_hash: guestPasswordHash } });
      await prisma.auth_providers.create({
        data: {
          id: uuidv4(),
          guest_id: g.id,
          provider: 'email',
          provider_uid: g.email,
        },
      });
    } else {
      await prisma.guests.update({
        where: { id: exists.id },
        data: { password_hash: guestPasswordHash },
      });
    }
  }
  console.log(`✅ Guests seeded (${guests.length} guests, password: GuestPass123!)`);

  // ─── 5. BOOKINGS & GUEST ACCESS ────────────────────────────────────────────
  const bookings = [
    {
      ezee_reservation_id: 'EZEE-KA-2026-001',
      property_id: propAId,
      guest_id: guestArjunId,
      booker_email: 'arjun@vibehouse.in',
      booker_phone: '+919000000001',
      room_type_name: 'Mixed Dorm 4-Bed',
      room_number: 'D-101',
      unit_code: 'BED-D101-A',
      checkin_date: new Date('2026-03-13'),
      checkout_date: new Date('2026-03-17'),
      no_of_guests: 2,
      source: 'MakeMyTrip',
      status: 'CONFIRMED',
      fetched_at: new Date(),
    },
    {
      ezee_reservation_id: 'EZEE-KA-2026-002',
      property_id: propAId,
      guest_id: guestArjunId,
      booker_email: 'arjun@vibehouse.in',
      booker_phone: '+919000000001',
      room_type_name: 'Deluxe Private',
      room_number: 'P-205',
      unit_code: 'PR-205',
      checkin_date: new Date('2026-04-05'),
      checkout_date: new Date('2026-04-08'),
      no_of_guests: 1,
      source: 'Direct',
      status: 'CONFIRMED',
      fetched_at: new Date(),
    },
    {
      ezee_reservation_id: 'EZEE-KA-2026-003',
      property_id: propAId,
      guest_id: guestSamirId,
      booker_email: 'samir@gmail.com',
      booker_phone: '+919000000004',
      room_type_name: 'Mixed Dorm 4-Bed',
      room_number: 'D-102',
      unit_code: 'BED-D102-B',
      checkin_date: new Date('2026-03-12'),
      checkout_date: new Date('2026-03-18'),
      no_of_guests: 1,
      source: 'Hostelworld',
      status: 'CONFIRMED',
      fetched_at: new Date(),
    },
    {
      ezee_reservation_id: 'EZEE-KA-2026-004',
      property_id: propAId,
      guest_id: guestAishaId,
      booker_email: 'aisha.khan@outlook.com',
      booker_phone: '+919000000005',
      room_type_name: 'Deluxe Private',
      room_number: 'P-301',
      unit_code: 'PR-301',
      checkin_date: new Date('2026-03-11'),
      checkout_date: new Date('2026-03-16'),
      no_of_guests: 2,
      source: 'Booking.com',
      status: 'CONFIRMED',
      fetched_at: new Date(),
    },
  ];

  for (const b of bookings) {
    await prisma.ezee_booking_cache.upsert({
      where: { ezee_reservation_id: b.ezee_reservation_id },
      update: { status: b.status },
      create: b,
    });
  }

  const accesses = [
    {
      id: uuidv4(),
      ezee_reservation_id: 'EZEE-KA-2026-001',
      guest_id: guestArjunId,
      role: 'PRIMARY',
      status: 'APPROVED',
      approved_by_guest_id: guestArjunId,
      approved_at: new Date(),
    },
    {
      id: uuidv4(),
      ezee_reservation_id: 'EZEE-KA-2026-001',
      guest_id: guestNehaId,
      role: 'SECONDARY',
      status: 'APPROVED',
      approved_by_guest_id: guestArjunId,
      approved_at: new Date(),
    },
    {
      id: uuidv4(),
      ezee_reservation_id: 'EZEE-KA-2026-002',
      guest_id: guestArjunId,
      role: 'PRIMARY',
      status: 'APPROVED',
      approved_by_guest_id: guestArjunId,
      approved_at: new Date(),
    },
    {
      id: uuidv4(),
      ezee_reservation_id: 'EZEE-KA-2026-003',
      guest_id: guestSamirId,
      role: 'PRIMARY',
      status: 'APPROVED',
      approved_by_guest_id: guestSamirId,
      approved_at: new Date(),
    },
    {
      id: uuidv4(),
      ezee_reservation_id: 'EZEE-KA-2026-004',
      guest_id: guestAishaId,
      role: 'PRIMARY',
      status: 'APPROVED',
      approved_by_guest_id: guestAishaId,
      approved_at: new Date(),
    },
  ];

  for (const a of accesses) {
    const exists = await prisma.booking_guest_access.findFirst({
      where: { ezee_reservation_id: a.ezee_reservation_id, guest_id: a.guest_id },
    });
    if (!exists) {
      await prisma.booking_guest_access.create({ data: a });
    }
  }
  console.log('✅ Bookings and guest accesses seeded');

  // ─── 6. ROOM TYPES ──────────────────────────────────────────────────────────
  const roomTypes = [
    // TDS Koramangala (60765)
    {
      id: 'rt-ka-4dorm',
      property_id: propAId,
      name: '4 Bed Mixed Dormitory',
      slug: '4-bed-mixed-dorm',
      type: 'DORM',
      total_rooms: 15,
      beds_per_room: 4,
      total_beds: 60,
      base_price_per_night: 500,
      colive_price_month: 12000,
      floor_range: '1-4',
      amenities: ['AC', 'Shared Bathroom', 'WiFi', 'Personal Locker', 'Reading Light'],
      ezee_room_type_id: '6076500000000000001',
      ezee_rate_plan_id: '6076500000000000001',
      ezee_rate_type_id: '6076500000000000001',
      is_active: true,
    },
    {
      id: 'rt-ka-deluxe',
      property_id: propAId,
      name: 'Deluxe Private',
      slug: 'deluxe',
      type: 'PRIVATE',
      total_rooms: 14,
      beds_per_room: 1,
      total_beds: 14,
      base_price_per_night: 1500,
      colive_price_month: 35000,
      floor_range: '1-4',
      amenities: ['AC', 'Attached Bathroom', 'WiFi', 'Work Desk', 'Smart Lock'],
      ezee_room_type_id: '6076500000000000002',
      ezee_rate_plan_id: '6076500000000000001',
      ezee_rate_type_id: '6076500000000000001',
      is_active: true,
    },
    {
      id: 'rt-ka-6dorm',
      property_id: propAId,
      name: '6 Bed Mixed Dormitory',
      slug: '6-bed-mixed-dorm',
      type: 'DORM',
      total_rooms: 5,
      beds_per_room: 6,
      total_beds: 30,
      base_price_per_night: 549,
      colive_price_month: 10500,
      floor_range: '1-2',
      amenities: ['AC', 'Shared Bathroom', 'WiFi', 'Personal Locker', 'Reading Light'],
      ezee_room_type_id: null,
      ezee_rate_plan_id: null,
      ezee_rate_type_id: null,
      is_active: true,
    },
    {
      id: 'rt-ka-queen',
      property_id: propAId,
      name: 'Queen Size Room',
      slug: 'queen-size-room',
      type: 'PRIVATE',
      total_rooms: 12,
      beds_per_room: 1,
      total_beds: 12,
      base_price_per_night: 2499,
      colive_price_month: 55000,
      floor_range: '1-4',
      amenities: ['AC', 'Attached Bathroom', 'WiFi', 'Work Desk', 'Smart Lock'],
      ezee_room_type_id: null,
      ezee_rate_plan_id: null,
      ezee_rate_type_id: null,
      is_active: true,
    },
    // Buteak Suites BTM (55402)
    {
      id: 'rt-btm-studio',
      property_id: propBId,
      name: 'Studio Suite',
      slug: 'studio-suite',
      type: 'PRIVATE',
      total_rooms: 10,
      beds_per_room: 1,
      total_beds: 10,
      base_price_per_night: 2500,
      colive_price_month: 60000,
      floor_range: '1-3',
      amenities: ['King Bed', 'Kitchenette', 'WiFi', 'AC', 'Balcony'],
      ezee_room_type_id: null,
      ezee_rate_plan_id: null,
      ezee_rate_type_id: null,
      is_active: true,
    },
    {
      id: 'rt-btm-1bhk',
      property_id: propBId,
      name: '1 BHK Executive Suite',
      slug: '1-bhk-suite',
      type: 'PRIVATE',
      total_rooms: 8,
      beds_per_room: 1,
      total_beds: 8,
      base_price_per_night: 3500,
      colive_price_month: 75000,
      floor_range: '1-4',
      amenities: ['Living Room', 'Kitchen', 'King Bed', 'WiFi', 'AC'],
      ezee_room_type_id: null,
      ezee_rate_plan_id: null,
      ezee_rate_type_id: null,
      is_active: true,
    },
  ];

  for (const rt of roomTypes) {
    await prisma.room_types.upsert({
      where: { id: rt.id },
      update: {
        name: rt.name,
        base_price_per_night: rt.base_price_per_night,
        is_active: true,
        amenities: rt.amenities,
      },
      create: rt,
    });
  }
  console.log(`✅ Room types seeded (${roomTypes.length} types across 2 properties)`);

  // ─── 7. PRODUCT CATALOG & INVENTORY ────────────────────────────────────────
  const products = [
    // Commodities
    { id: 'prod-water-bottle',  name: 'Water Bottle',  category: 'COMMODITY',  price: 100, desc: 'Sealed 1L drinking water bottle' },
    { id: 'prod-bath-towel',    name: 'Bath Towel',    category: 'RETURNABLE', price: 200, desc: 'Full-size bath towel (returned at checkout)' },
    { id: 'prod-safe-lock',     name: 'Safe Lock',     category: 'COMMODITY',  price: 150, desc: 'Combination lock for under-bed locker' },
    { id: 'prod-toilet-kit',    name: 'Toilet Kit',    category: 'COMMODITY',  price: 150, desc: 'Soap, shampoo, toothpaste, toothbrush' },
    { id: 'prod-blanket',       name: 'Blanket',       category: 'RETURNABLE', price: 300, desc: 'Extra blanket for cold nights (returned at checkout)' },
    { id: 'prod-locker',        name: 'Locker',        category: 'COMMODITY',  price: 150, desc: 'Personal locker rental' },
    // Paid Services
    { id: 'prod-laundry',       name: 'Laundry',        category: 'SERVICE', price: 150, desc: 'Pickup laundry — washed & folded' },
    { id: 'prod-early-checkin', name: 'Early Check-in', category: 'SERVICE', price: 250, desc: 'Check in before standard time' },
    { id: 'prod-late-checkout', name: 'Late Checkout',  category: 'SERVICE', price: 250, desc: 'Check out after standard time (pre-booked rate)' },
    // Free Services
    { id: 'prod-room-cleaning',     name: 'Room Cleaning',      category: 'SERVICE', price: 0, desc: 'On-demand room cleaning' },
    { id: 'prod-washroom-cleaning', name: 'Washroom Cleaning',  category: 'SERVICE', price: 0, desc: 'On-demand washroom cleaning' },
    { id: 'prod-garbage-clearance', name: 'Garbage Clearance',  category: 'SERVICE', price: 0, desc: 'Garbage pickup from room' },
    { id: 'prod-linen-change',      name: 'Linen Change',       category: 'SERVICE', price: 0, desc: 'Fresh bed linen replacement' },
    { id: 'prod-wifi-support',      name: 'WiFi Support',       category: 'SERVICE', price: 0, desc: 'WiFi connectivity issues' },
    { id: 'prod-hot-water',         name: 'Hot Water Support',  category: 'SERVICE', price: 0, desc: 'Hot water not working' },
    { id: 'prod-ac-support',        name: 'AC Support',         category: 'SERVICE', price: 0, desc: 'Air conditioning issues' },
    { id: 'prod-first-aid',         name: 'First Aid',          category: 'SERVICE', price: 0, desc: 'First aid assistance' },
    { id: 'prod-staff-assist',      name: 'Staff Assistance',   category: 'SERVICE', price: 0, desc: 'General staff help' },
    { id: 'prod-lost-found',        name: 'Lost & Found',       category: 'SERVICE', price: 0, desc: 'Report or claim lost items' },
    // Borrowables
    { id: 'prod-iron',       name: 'Iron',       category: 'BORROWABLE', price: 0, desc: 'Clothes iron — subject to availability' },
    { id: 'prod-hair-dryer', name: 'Hair Dryer', category: 'BORROWABLE', price: 0, desc: 'Hair dryer — subject to availability' },
    { id: 'prod-umbrella',   name: 'Umbrella',   category: 'BORROWABLE', price: 0, desc: 'Umbrella — subject to availability' },
  ];

  for (const p of products) {
    await prisma.product_catalog.upsert({
      where: { id: p.id },
      update: { name: p.name, category: p.category, base_price: p.price, description: p.desc },
      create: {
        id: p.id,
        property_id: propAId,
        name: p.name,
        description: p.desc,
        category: p.category,
        base_price: p.price,
      },
    });
  }
  console.log(`✅ Product catalog seeded (${products.length} products)`);

  const stockItems = [
    { productId: 'prod-water-bottle',  total: 60, threshold: 10 },
    { productId: 'prod-bath-towel',    total: 40, threshold: 8 },
    { productId: 'prod-safe-lock',     total: 25, threshold: 5 },
    { productId: 'prod-toilet-kit',    total: 50, threshold: 10 },
    { productId: 'prod-blanket',       total: 20, threshold: 4 },
    { productId: 'prod-locker',        total: 30, threshold: 5 },
    { productId: 'prod-iron',          total: 4,  threshold: 1 },
    { productId: 'prod-hair-dryer',    total: 3,  threshold: 1 },
    { productId: 'prod-umbrella',      total: 6,  threshold: 2 },
  ];

  for (const s of stockItems) {
    const existing = await prisma.inventory.findFirst({
      where: { product_id: s.productId, property_id: propAId },
    });
    if (!existing) {
      await prisma.inventory.create({
        data: {
          id: uuidv4(),
          property_id: propAId,
          product_id: s.productId,
          total_stock: s.total,
          available_stock: s.total,
          low_stock_threshold: s.threshold,
        },
      });
    }
  }
  console.log(`✅ Inventory stock seeded (${stockItems.length} items)`);

  // ─── 8. BREAKFAST CONFIG, SLOTS & MENU ─────────────────────────────────────
  await prisma.breakfast_config.upsert({
    where: { property_id: propAId },
    update: { is_enabled: true, order_open_hour: 11, order_freeze_hour: 7 },
    create: {
      property_id: propAId,
      is_enabled: true,
      order_open_hour: 11,
      order_freeze_hour: 7,
      invite_cron_enabled: false,
    },
  });

  const slots = [
    { id: 'slot-ka-01', slot_number: 1, label: '08:00 AM - 08:45 AM', start_min: 480, end_min: 525, capacity: 12, sort_order: 1 },
    { id: 'slot-ka-02', slot_number: 2, label: '08:45 AM - 09:30 AM', start_min: 525, end_min: 570, capacity: 12, sort_order: 2 },
    { id: 'slot-ka-03', slot_number: 3, label: '09:30 AM - 10:15 AM', start_min: 570, end_min: 615, capacity: 12, sort_order: 3 },
  ];

  for (const sl of slots) {
    await prisma.breakfast_slot.upsert({
      where: { property_id_slot_number: { property_id: propAId, slot_number: sl.slot_number } },
      update: { label: sl.label, start_min: sl.start_min, end_min: sl.end_min, capacity: sl.capacity },
      create: { ...sl, property_id: propAId, is_active: true },
    });
  }

  const menuItems = [
    {
      id: 'bf-menu-01',
      name: 'Indori Poha & Sev',
      description: 'Flattened rice with onions, peanuts, sev, and lemon',
      category: 'MAIN',
      is_veg: true,
      sort_order: 1,
    },
    {
      id: 'bf-menu-02',
      name: 'Masala Omelette & Toast',
      description: '2-egg fluffy omelette with green chillies, butter toast',
      category: 'MAIN',
      is_veg: false,
      sort_order: 2,
    },
    {
      id: 'bf-menu-03',
      name: 'Steamed Idli & Medu Vada',
      description: 'With piping hot sambar and fresh coconut chutney',
      category: 'MAIN',
      is_veg: true,
      sort_order: 3,
    },
    {
      id: 'bf-menu-04',
      name: 'Fresh Seasonal Fruit Bowl',
      description: 'Papaya, watermelon, banana, chia seeds',
      category: 'HEALTHY',
      is_veg: true,
      sort_order: 4,
    },
    {
      id: 'bf-menu-05',
      name: 'Filter Coffee / Chai',
      description: 'Freshly brewed South Indian filter coffee or ginger chai',
      category: 'BEVERAGE',
      is_veg: true,
      sort_order: 5,
    },
  ];

  for (const mi of menuItems) {
    await prisma.breakfast_menu_item.upsert({
      where: { id: mi.id },
      update: { name: mi.name, description: mi.description, is_veg: mi.is_veg, category: mi.category },
      create: { ...mi, property_id: propAId, is_active: true },
    });
  }
  console.log('✅ Breakfast config, slots, and menu items seeded');

  // ─── 9. COLIVING LOCATIONS, PLANS & CONTENT ────────────────────────────────
  await prisma.colive_locations.upsert({
    where: { slug: 'bangalore' },
    update: { label: 'Bangalore', is_active: true },
    create: {
      id: 'cloc-bangalore-001',
      slug: 'bangalore',
      label: 'Bangalore',
      is_active: true,
    },
  });

  const colivePlans = [
    {
      id: 'cplan-solo',
      slug: 'solo-hustle',
      title: 'Solo Hustler',
      description: 'Flexible 1-3 month stay for founders, engineers, and digital nomads.',
      recommended_stay_type: 'solo',
      accent_hex: '#7C3AED',
      badge_copy: 'Most Popular',
      sort_order: 1,
    },
    {
      id: 'cplan-duo',
      slug: 'duo-growth',
      title: 'Founder Duo',
      description: 'Private suite with 2 workstations, meeting room credits, and high-speed fiber.',
      recommended_stay_type: 'couple',
      accent_hex: '#2563EB',
      badge_copy: 'Great for Co-founders',
      sort_order: 2,
    },
    {
      id: 'cplan-quarterly',
      slug: 'long-stay',
      title: 'Quarterly Residency',
      description: '3+ months guaranteed pricing, free airport transfer, and storage locker.',
      recommended_stay_type: 'remote',
      accent_hex: '#10B981',
      badge_copy: 'Best Value',
      sort_order: 3,
    },
  ];

  for (const cp of colivePlans) {
    await prisma.colive_plans.upsert({
      where: { slug: cp.slug },
      update: { title: cp.title, description: cp.description },
      create: cp,
    });
  }

  await prisma.colive_property_content.upsert({
    where: { slug: 'koramangala-a' },
    update: {},
    create: {
      id: 'ccontent-tds-ka',
      property_id: propAId,
      location_id: 'cloc-bangalore-001',
      slug: 'koramangala-a',
      headline: 'Live in the heart of Koramangala',
      subheadline: "Where Bangalore's startup energy meets a home you'll love.",
      description: 'High-speed 1Gbps WiFi, curated community events, coworking space, and ₹0 deposit.',
      rating: new Prisma.Decimal(4.9),
      rating_label: 'Exceptional',
      amenities: ['1Gbps WiFi', 'Daily Housekeeping', 'Coworking Lounge', 'Community Kitchen', 'Rooftop Cafe'],
      is_active: true,
    },
  });

  const coliveRoomOptions = [
    {
      id: 'croom-tds-ka-private',
      property_id: propAId,
      room_type_id: 'rt-ka-deluxe',
      slug: 'private-room',
      name: 'Private Room',
      description: 'A fully private room with en-suite bathroom, work desk, and blackout curtains.',
      feature_points: ['Queen bed', 'En-suite bath', 'Work desk', 'Smart lock'],
      max_guests: 2,
      sort_order: 1,
    },
    {
      id: 'croom-tds-ka-4dorm',
      property_id: propAId,
      room_type_id: 'rt-ka-4dorm',
      slug: '4-bed-dorm',
      name: '4-Bed Mixed Dorm',
      description: 'Social dorm with privacy curtain, personal locker, and reading light.',
      feature_points: ['Privacy curtain', 'Personal locker', 'Reading light', 'Shared bath'],
      max_guests: 1,
      sort_order: 2,
    },
    {
      id: 'croom-tds-ka-6dorm',
      property_id: propAId,
      room_type_id: 'rt-ka-6dorm',
      slug: '6-bed-dorm',
      name: '6-Bed Mixed Dorm',
      description: 'Best-value bed in Koramangala. Great for budget-conscious travellers.',
      feature_points: ['Budget value', 'Locker', 'AC', 'Shared lounge'],
      max_guests: 1,
      sort_order: 3,
    },
  ];

  for (const opt of coliveRoomOptions) {
    await prisma.colive_room_options.upsert({
      where: { property_id_slug: { property_id: opt.property_id, slug: opt.slug } },
      update: { name: opt.name, room_type_id: opt.room_type_id },
      create: { ...opt, is_active: true },
    });
  }

  const coliveAddons = [
    {
      id: 'cadd-meals',
      slug: 'meals-3x-day',
      name: 'Meals Plan (3x/day)',
      description: 'Breakfast, lunch, and dinner from our in-house chef.',
      pricing_model: 'per_month',
      unit_price: 7000,
      currency: 'INR',
      category: 'meals',
      sort_order: 1,
    },
    {
      id: 'cadd-laundry',
      slug: 'laundry-plan',
      name: 'Laundry Plan',
      description: 'Unlimited laundry washes per month.',
      pricing_model: 'per_month',
      unit_price: 1500,
      currency: 'INR',
      category: 'laundry',
      sort_order: 2,
    },
    {
      id: 'cadd-desk',
      slug: 'dedicated-desk',
      name: 'Dedicated Coworking Desk',
      description: 'Reserve your own permanent desk with monitor arm and power strip.',
      pricing_model: 'per_month',
      unit_price: 2500,
      currency: 'INR',
      category: 'workspace',
      sort_order: 3,
    },
    {
      id: 'cadd-pickup',
      slug: 'airport-pickup',
      name: 'Airport Pickup (BLR)',
      description: 'One-way cab from Kempegowda International Airport to the property.',
      pricing_model: 'one_time',
      unit_price: 900,
      currency: 'INR',
      category: 'pickup',
      sort_order: 4,
    },
  ];

  for (const a of coliveAddons) {
    await prisma.colive_addons.upsert({
      where: { property_id_slug: { property_id: propAId, slug: a.slug } },
      update: { name: a.name, unit_price: a.unit_price },
      create: {
        ...a,
        property_id: propAId,
        max_quantity: 1,
        default_quantity: 0,
        icon_hint: 'sparkles',
        is_available: true,
        is_active: true,
      },
    });
  }
  console.log('✅ Coliving locations, content, options, and addons seeded');

  // ─── 10. COUPONS ────────────────────────────────────────────────────────────
  const adminOwner = await prisma.admin_users.findFirst({ where: { role_id: 'role-owner' } });
  const createdById = adminOwner?.id ?? uuidv4();

  const coupons = [
    {
      id: 'coup-welcome10',
      code: 'WELCOME10',
      name: 'Welcome Offer',
      description: '10% off on your first stay',
      type: 'ONE_TIME_CODE',
      discount_type: 'PERCENT',
      discount_value: new Prisma.Decimal(10.0),
      max_discount_amount: new Prisma.Decimal(500.0),
      min_booking_amount: new Prisma.Decimal(500.0),
      min_stay_nights: 1,
      max_uses_per_guest: 1,
      applies_to_all_properties: true,
      is_active: true,
      created_by: createdById,
    },
    {
      id: 'coup-longstay20',
      code: 'LONGSTAY20',
      name: 'Long Stay Special',
      description: '20% off on bookings of 4+ nights',
      type: 'ONE_TIME_CODE',
      discount_type: 'PERCENT',
      discount_value: new Prisma.Decimal(20.0),
      max_discount_amount: new Prisma.Decimal(1500.0),
      min_booking_amount: new Prisma.Decimal(2500.0),
      min_stay_nights: 4,
      max_uses_per_guest: 2,
      applies_to_all_properties: true,
      is_active: true,
      created_by: createdById,
    },
    {
      id: 'coup-flat200',
      code: 'FLAT200',
      name: 'Flat ₹200 Off',
      description: 'Flat ₹200 off on room charges',
      type: 'ONE_TIME_CODE',
      discount_type: 'FLAT',
      discount_value: new Prisma.Decimal(200.0),
      max_discount_amount: new Prisma.Decimal(200.0),
      min_booking_amount: new Prisma.Decimal(1000.0),
      min_stay_nights: 1,
      max_uses_per_guest: 1,
      applies_to_all_properties: true,
      is_active: true,
      created_by: createdById,
    },
  ];

  for (const c of coupons) {
    await prisma.coupons.upsert({
      where: { id: c.id },
      update: {
        code: c.code,
        type: c.type,
        discount_value: c.discount_value,
        max_discount_amount: c.max_discount_amount,
        is_active: true,
      },
      create: c,
    });

    for (const pid of allPropertyIds) {
      await prisma.coupon_properties.upsert({
        where: { coupon_id_property_id: { coupon_id: c.id, property_id: pid } },
        update: {},
        create: { coupon_id: c.id, property_id: pid },
      });
    }
  }
  console.log(`✅ Coupons seeded (${coupons.length} coupons mapped to all properties)`);

  // ─── 11. COMMUNITY EVENTS (Explicit property_id: 60765) ─────────────────────
  const today = new Date();
  const sampleEvents = [
    {
      id: 'evt-dj-night',
      property_id: propAId,
      title: 'Neon DJ Night',
      description: 'Dance the night away under neon lights with our resident DJ spinning the best tracks from around the world.',
      date: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
      time: '21:00',
      location: 'Rooftop Terrace',
      capacity: 50,
      price_text: 'Free for Guests',
      contact_link: null,
      poster_url: null,
      badge_label: 'Tonight',
      badge_color: '#ff2e62',
      is_active: true,
      created_by: null,
    },
    {
      id: 'evt-pub-crawl',
      property_id: propAId,
      title: 'Old City Pub Crawl',
      description: 'Explore the best bars in the neighborhood with fellow travelers. Includes welcome drink at each stop.',
      date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
      time: '20:30',
      location: 'Meet at Lobby',
      capacity: 30,
      price_text: 'Rs. 599',
      contact_link: 'https://wa.me/919876543210',
      poster_url: null,
      badge_label: 'Popular',
      badge_color: '#facc15',
      is_active: true,
      created_by: null,
    },
    {
      id: 'evt-live-music',
      property_id: propAId,
      title: 'Live Local Music',
      description: 'Enjoy an evening of live acoustic performances by local artists in our cozy common area.',
      date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2),
      time: '19:00',
      location: 'Common Area',
      capacity: 40,
      price_text: 'Free for Guests',
      contact_link: null,
      poster_url: null,
      badge_label: 'Live',
      badge_color: '#00d1ff',
      is_active: true,
      created_by: null,
    },
    {
      id: 'evt-yoga-past',
      property_id: propAId,
      title: 'Sunset Yoga',
      description: 'Start your evening with a relaxing rooftop yoga session overlooking the city skyline.',
      date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5),
      time: '17:30',
      location: 'Rooftop Terrace',
      capacity: 20,
      price_text: 'Free for Guests',
      contact_link: null,
      poster_url: null,
      badge_label: null,
      badge_color: null,
      is_active: true,
      created_by: null,
    },
  ];

  for (const evt of sampleEvents) {
    await prisma.events.upsert({
      where: { id: evt.id },
      update: { property_id: propAId, is_active: true },
      create: evt,
    });
  }
  console.log(`✅ Events seeded (${sampleEvents.length} events for ${propAId})`);

  // ─── 12. SLA CONFIG & ESCALATION LADDER ─────────────────────────────────────
  const SLA_DEFAULTS: Record<string, { completion: number; ack_percent: number; gap: number; snooze: number }> = {
    'T-1': { completion: 10, ack_percent: 50, gap: 5, snooze: 100 },
    T0: { completion: 10, ack_percent: 50, gap: 5, snooze: 100 },
    T1: { completion: 30, ack_percent: 50, gap: 15, snooze: 100 },
    T2: { completion: 60, ack_percent: 34, gap: 21, snooze: 100 },
    T3: { completion: 240, ack_percent: 13, gap: 30, snooze: 100 },
    T4: { completion: 0, ack_percent: 0, gap: 0, snooze: 100 },
  };

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

  const staffRoles = [
    { name: 'HOUSEKEEPING', label: 'Housekeeping' },
    { name: 'MAINTENANCE', label: 'Maintenance' },
    { name: 'FRONT_OFFICE', label: 'Front Office' },
    { name: 'TEAM_LEAD', label: 'Team Lead' },
  ];

  for (const sr of staffRoles) {
    const exists = await prisma.staff_roles.findUnique({ where: { name: sr.name } });
    if (!exists) {
      await prisma.staff_roles.create({ data: { id: uuidv4(), name: sr.name, label: sr.label } });
    }
  }

  const escalationLadder = [
    { level: 1, role: 'TEAM_LEAD', lookup_source: 'staff' },
    { level: 2, role: 'MANAGER', lookup_source: 'admin_users' },
    { level: 3, role: 'OWNER', lookup_source: 'admin_users' },
  ];

  for (const esc of escalationLadder) {
    const exists = await prisma.escalation_levels.findFirst({
      where: { property_id: propAId, level: esc.level },
    });
    if (!exists) {
      await prisma.escalation_levels.create({
        data: {
          id: uuidv4(),
          property_id: propAId,
          level: esc.level,
          role: esc.role,
          lookup_source: esc.lookup_source,
        },
      });
    }
  }

  console.log('✅ SLA config and escalation levels seeded');

  console.log('\n🎉 Baseline seed completed successfully!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔑 Credentials Summary:');
  console.log('   Admin: admin@vibehouse.in / Admin123!');
  console.log('   Owner: owner@vibehouse.in / Admin123!');
  console.log('   Guests: arjun@vibehouse.in, neha@vibehouse.in, etc. / GuestPass123!');
  console.log('   Properties: 60765 (Koramangala), 55402 (BTM Layout)');
  console.log('═══════════════════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
