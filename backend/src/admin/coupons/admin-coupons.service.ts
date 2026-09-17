import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import type { AdminJwtPayload } from '../../common/guards/admin-jwt.strategy';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ListCouponsQueryDto } from './dto/list-coupons-query.dto';

@Injectable()
export class AdminCouponsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Create ────────────────────────────────────────────────────────────

  async create(dto: CreateCouponDto, actor: AdminJwtPayload) {
    // Scope guard: every requested property_id must be in actor.property_ids.
    // For "all properties", actor must be authorised on ALL active properties (owner pattern).
    if (dto.applies_to_all_properties) {
      const allActive = await this.prisma.properties.findMany({ select: { id: true } });
      const missing = allActive.filter((p) => !actor.property_ids.includes(p.id));
      if (missing.length > 0) {
        throw new ForbiddenException(
          `Only admins authorised on all properties can create platform-wide coupons (missing: ${missing.map((p) => p.id).join(', ')})`,
        );
      }
    } else {
      if (!dto.property_ids || dto.property_ids.length === 0) {
        throw new BadRequestException('Provide property_ids or set applies_to_all_properties=true');
      }
      const unauthorised = dto.property_ids.filter((p) => !actor.property_ids.includes(p));
      if (unauthorised.length > 0) {
        throw new ForbiddenException(`Not authorised for properties: ${unauthorised.join(', ')}`);
      }
    }

    // Cross-field validation that DTO decorators can't express
    if (dto.type === 'ONE_TIME_CODE' && !dto.code) {
      throw new BadRequestException('code is required for ONE_TIME_CODE coupons');
    }
    if (dto.type !== 'ONE_TIME_CODE' && dto.code) {
      throw new BadRequestException('code is only allowed for ONE_TIME_CODE coupons');
    }
    if (dto.type === 'STAY_LENGTH' && !dto.min_stay_nights) {
      throw new BadRequestException('min_stay_nights is required for STAY_LENGTH coupons');
    }
    if (dto.type !== 'ONE_TIME_CODE' && !dto.name) {
      throw new BadRequestException('name is required for auto coupons (STAY_LENGTH, NEW_GUEST)');
    }
    if (dto.discount_type === 'PERCENT' && dto.discount_value > 100) {
      throw new BadRequestException('PERCENT discount_value cannot exceed 100');
    }
    if (
      dto.valid_from &&
      dto.valid_until &&
      new Date(dto.valid_from) >= new Date(dto.valid_until)
    ) {
      throw new BadRequestException('valid_from must be before valid_until');
    }

    const id = `cp-${uuidv4().slice(0, 12)}`;

    // Uniqueness check up-front for a clearer error than the DB constraint message
    if (dto.code) {
      const existing = await this.prisma.coupons.findUnique({ where: { code: dto.code } });
      if (existing) {
        throw new ConflictException(`Coupon code "${dto.code}" already exists`);
      }
    }

    const coupon = await this.prisma.coupons.create({
      data: {
        id,
        code: dto.code ?? null,
        name: dto.name ?? null,
        description: dto.description ?? null,
        type: dto.type,
        discount_type: dto.discount_type,
        discount_value: new Prisma.Decimal(dto.discount_value.toFixed(2)),
        max_discount_amount:
          dto.max_discount_amount != null
            ? new Prisma.Decimal(dto.max_discount_amount.toFixed(2))
            : null,
        min_stay_nights: dto.min_stay_nights ?? null,
        min_booking_amount: new Prisma.Decimal((dto.min_booking_amount ?? 0).toFixed(2)),
        max_uses_per_guest: dto.max_uses_per_guest ?? 1,
        max_total_uses: dto.max_total_uses ?? null,
        applies_to_all_properties: dto.applies_to_all_properties ?? false,
        valid_from: dto.valid_from ? new Date(dto.valid_from) : null,
        valid_until: dto.valid_until ? new Date(dto.valid_until) : null,
        is_hidden: dto.is_hidden ?? false,
        admin_note: dto.admin_note ?? null,
        created_by: actor.admin_id,
        ...(dto.applies_to_all_properties
          ? {}
          : {
              coupon_properties: {
                create: (dto.property_ids ?? []).map((property_id) => ({ property_id })),
              },
            }),
      },
      include: { coupon_properties: { select: { property_id: true } } },
    });

    return this.serialise(coupon, 0, 0);
  }

  // ─── List ──────────────────────────────────────────────────────────────

  async list(query: ListCouponsQueryDto, actor: AdminJwtPayload) {
    const page = Number.isFinite(query.page) && (query.page as number) >= 1 ? (query.page as number) : 1;
    const limit = Number.isFinite(query.limit) && (query.limit as number) >= 1 ? (query.limit as number) : 20;

    // Scope: admins see coupons that touch their active property (or "all properties" coupons).
    // No-property admins (e.g., during owner setup) can filter explicitly via ?property_id=
    // but otherwise see everything across their authorised properties.
    const scopeFilter = this.buildScopeFilter(actor, query.property_id);

    const where: Prisma.couponsWhereInput = {
      ...scopeFilter,
      ...(query.type ? { type: query.type } : {}),
      ...(query.is_active !== undefined ? { is_active: query.is_active } : {}),
      ...(query.search
        ? {
            OR: [
              { code: query.search.toUpperCase() },
              { admin_note: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.coupons.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          coupon_properties: { select: { property_id: true } },
          _count: { select: { coupon_redemptions: true } },
        },
      }),
      this.prisma.coupons.count({ where }),
    ]);

    // Aggregate total ₹ given for each coupon in one query
    const totals = items.length
      ? await this.prisma.coupon_redemptions.groupBy({
          by: ['coupon_id'],
          where: { coupon_id: { in: items.map((c) => c.id) } },
          _sum: { discount_amount: true },
        })
      : [];
    const totalsByCoupon = new Map(
      totals.map((t) => [t.coupon_id, Number(t._sum.discount_amount ?? 0)]),
    );

    return {
      items: items.map((c) =>
        this.serialise(c, c._count.coupon_redemptions, totalsByCoupon.get(c.id) ?? 0),
      ),
      total,
      page,
      limit,
    };
  }

  // ─── Get one ──────────────────────────────────────────────────────────

  async get(id: string, actor: AdminJwtPayload) {
    const coupon = await this.prisma.coupons.findUnique({
      where: { id },
      include: {
        coupon_properties: { select: { property_id: true } },
        _count: { select: { coupon_redemptions: true } },
        coupon_redemptions: {
          orderBy: { applied_at: 'desc' },
          take: 10,
          select: {
            id: true,
            guest_id: true,
            ezee_reservation_id: true,
            property_id: true,
            discount_amount: true,
            applied_at: true,
            kind: true,
          },
        },
      },
    });
    if (!coupon) throw new NotFoundException('Coupon not found');
    this.assertCouponInScope(coupon, actor);

    const totalSum = await this.prisma.coupon_redemptions.aggregate({
      where: { coupon_id: id },
      _sum: { discount_amount: true },
    });

    return {
      ...this.serialise(coupon, coupon._count.coupon_redemptions, Number(totalSum._sum.discount_amount ?? 0)),
      recent_redemptions: coupon.coupon_redemptions,
    };
  }

  // ─── Update ────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateCouponDto, actor: AdminJwtPayload) {
    const existing = await this.prisma.coupons.findUnique({
      where: { id },
      include: { coupon_properties: { select: { property_id: true } } },
    });
    if (!existing) throw new NotFoundException('Coupon not found');
    this.assertCouponInScope(existing, actor);

    // Validate scope changes if any
    if (dto.applies_to_all_properties === true) {
      const allActive = await this.prisma.properties.findMany({ select: { id: true } });
      const missing = allActive.filter((p) => !actor.property_ids.includes(p.id));
      if (missing.length > 0) {
        throw new ForbiddenException(
          `Only admins authorised on all properties can switch to platform-wide`,
        );
      }
    }
    if (dto.property_ids) {
      const unauthorised = dto.property_ids.filter((p) => !actor.property_ids.includes(p));
      if (unauthorised.length > 0) {
        throw new ForbiddenException(`Not authorised for properties: ${unauthorised.join(', ')}`);
      }
    }
    if (dto.discount_type === 'PERCENT' && dto.discount_value !== undefined && dto.discount_value > 100) {
      throw new BadRequestException('PERCENT discount_value cannot exceed 100');
    }
    // Auto coupons must keep a name (DB CHECK enforces this too).
    if (dto.name === '' && existing.type !== 'ONE_TIME_CODE') {
      throw new BadRequestException('name cannot be empty for auto coupons');
    }

    const data: Prisma.couponsUpdateInput = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.discount_type !== undefined ? { discount_type: dto.discount_type } : {}),
      ...(dto.discount_value !== undefined
        ? { discount_value: new Prisma.Decimal(dto.discount_value.toFixed(2)) }
        : {}),
      ...(dto.max_discount_amount !== undefined
        ? {
            max_discount_amount:
              dto.max_discount_amount === null
                ? null
                : new Prisma.Decimal(dto.max_discount_amount.toFixed(2)),
          }
        : {}),
      ...(dto.min_stay_nights !== undefined ? { min_stay_nights: dto.min_stay_nights } : {}),
      ...(dto.min_booking_amount !== undefined
        ? { min_booking_amount: new Prisma.Decimal(dto.min_booking_amount.toFixed(2)) }
        : {}),
      ...(dto.max_uses_per_guest !== undefined ? { max_uses_per_guest: dto.max_uses_per_guest } : {}),
      ...(dto.max_total_uses !== undefined ? { max_total_uses: dto.max_total_uses } : {}),
      ...(dto.applies_to_all_properties !== undefined
        ? { applies_to_all_properties: dto.applies_to_all_properties }
        : {}),
      ...(dto.valid_from !== undefined
        ? { valid_from: dto.valid_from === null ? null : new Date(dto.valid_from) }
        : {}),
      ...(dto.valid_until !== undefined
        ? { valid_until: dto.valid_until === null ? null : new Date(dto.valid_until) }
        : {}),
      ...(dto.admin_note !== undefined ? { admin_note: dto.admin_note } : {}),
      ...(dto.is_hidden !== undefined ? { is_hidden: dto.is_hidden } : {}),
      updated_at: new Date(),
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.coupons.update({ where: { id }, data });

      // Replace property links if either flag or list changed
      if (dto.property_ids !== undefined || dto.applies_to_all_properties !== undefined) {
        await tx.coupon_properties.deleteMany({ where: { coupon_id: id } });
        if (
          dto.applies_to_all_properties !== true &&
          dto.property_ids &&
          dto.property_ids.length > 0
        ) {
          await tx.coupon_properties.createMany({
            data: dto.property_ids.map((property_id) => ({ coupon_id: id, property_id })),
          });
        }
      }
    });

    return this.get(id, actor);
  }

  // ─── Activate / Deactivate ─────────────────────────────────────────────

  async setActive(id: string, isActive: boolean, actor: AdminJwtPayload) {
    const existing = await this.prisma.coupons.findUnique({
      where: { id },
      include: { coupon_properties: { select: { property_id: true } } },
    });
    if (!existing) throw new NotFoundException('Coupon not found');
    this.assertCouponInScope(existing, actor);

    await this.prisma.coupons.update({
      where: { id },
      data: { is_active: isActive, updated_at: new Date() },
    });
    return { id, is_active: isActive };
  }

  // ─── Hide / Show ──────────────────────────────────────────────────────
  //
  // Hide suppresses the coupon from the customer-facing "available coupons"
  // listing while still allowing typed-code redemption — used for VIP /
  // partner coupons that shouldn't be advertised publicly. Distinct from
  // setActive: hidden coupons still apply if redeemed; inactive coupons
  // never apply anywhere.

  async setHidden(id: string, isHidden: boolean, actor: AdminJwtPayload) {
    const existing = await this.prisma.coupons.findUnique({
      where: { id },
      include: { coupon_properties: { select: { property_id: true } } },
    });
    if (!existing) throw new NotFoundException('Coupon not found');
    this.assertCouponInScope(existing, actor);

    await this.prisma.coupons.update({
      where: { id },
      data: { is_hidden: isHidden, updated_at: new Date() },
    });
    return { id, is_hidden: isHidden };
  }

  // ─── Delete ────────────────────────────────────────────────────────────

  async delete(id: string, actor: AdminJwtPayload) {
    const existing = await this.prisma.coupons.findUnique({
      where: { id },
      include: {
        coupon_properties: { select: { property_id: true } },
        _count: { select: { coupon_redemptions: true } },
      },
    });
    if (!existing) throw new NotFoundException('Coupon not found');
    this.assertCouponInScope(existing, actor);

    if (existing._count.coupon_redemptions > 0) {
      throw new ConflictException(
        `Cannot delete coupon with ${existing._count.coupon_redemptions} redemption(s); deactivate instead`,
      );
    }

    // ezee_booking_cache holds two FKs (coupon_id_auto, coupon_id_code) back to
    // coupons with onDelete: NoAction — so any PENDING_PAYMENT / CONFIRMED /
    // CANCELLED booking that ever had this coupon attached blocks the delete
    // and bubbles a raw Prisma P2003 to the caller as a 500. Null them out
    // first; the actual discount amount is already snapshotted on the cache
    // row (`discount_total`), so reporting integrity is preserved — only the
    // FK pointer back to the deleted coupon row goes away.
    await this.prisma.$transaction([
      this.prisma.ezee_booking_cache.updateMany({
        where: { coupon_id_auto: id },
        data: { coupon_id_auto: null },
      }),
      this.prisma.ezee_booking_cache.updateMany({
        where: { coupon_id_code: id },
        data: { coupon_id_code: null },
      }),
      this.prisma.coupon_properties.deleteMany({ where: { coupon_id: id } }),
      this.prisma.coupons.delete({ where: { id } }),
    ]);
    return { id, deleted: true };
  }

  // ─── Redemptions ───────────────────────────────────────────────────────

  async listRedemptions(id: string, page: number, limit: number, actor: AdminJwtPayload) {
    const coupon = await this.prisma.coupons.findUnique({
      where: { id },
      include: { coupon_properties: { select: { property_id: true } } },
    });
    if (!coupon) throw new NotFoundException('Coupon not found');
    this.assertCouponInScope(coupon, actor);

    const [items, total] = await Promise.all([
      this.prisma.coupon_redemptions.findMany({
        where: { coupon_id: id },
        orderBy: { applied_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          guests: { select: { id: true, name: true, email: true, phone: true } },
        },
      }),
      this.prisma.coupon_redemptions.count({ where: { coupon_id: id } }),
    ]);

    return { items, total, page, limit };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────

  private buildScopeFilter(
    actor: AdminJwtPayload,
    explicitPropertyId?: string,
  ): Prisma.couponsWhereInput {
    if (explicitPropertyId) {
      // Must still be in actor's authorised set
      if (!actor.property_ids.includes(explicitPropertyId)) {
        throw new ForbiddenException(`Not authorised for property ${explicitPropertyId}`);
      }
      return {
        OR: [
          { applies_to_all_properties: true },
          { coupon_properties: { some: { property_id: explicitPropertyId } } },
        ],
      };
    }
    // Default: only coupons that touch any of the actor's authorised properties
    return {
      OR: [
        { applies_to_all_properties: true },
        { coupon_properties: { some: { property_id: { in: actor.property_ids } } } },
      ],
    };
  }

  private assertCouponInScope(
    coupon: { applies_to_all_properties: boolean; coupon_properties: { property_id: string }[] },
    actor: AdminJwtPayload,
  ) {
    if (coupon.applies_to_all_properties) {
      // Anyone scoped on at least one of its properties can view; modifying "all"
      // requires owner scope (enforced separately in update).
      return;
    }
    const touches = coupon.coupon_properties.some((p) => actor.property_ids.includes(p.property_id));
    if (!touches) {
      throw new ForbiddenException('Coupon belongs to properties outside your scope');
    }
  }

  private serialise(
    coupon: {
      id: string;
      code: string | null;
      name: string | null;
      description: string | null;
      type: string;
      discount_type: string;
      discount_value: Prisma.Decimal;
      max_discount_amount: Prisma.Decimal | null;
      min_stay_nights: number | null;
      min_booking_amount: Prisma.Decimal;
      max_uses_per_guest: number;
      max_total_uses: number | null;
      applies_to_all_properties: boolean;
      valid_from: Date | null;
      valid_until: Date | null;
      is_active: boolean;
      is_hidden: boolean;
      admin_note: string | null;
      created_by: string;
      created_at: Date;
      updated_at: Date;
      coupon_properties: { property_id: string }[];
    },
    redemptionCount: number,
    totalDiscountGiven: number,
  ) {
    return {
      id: coupon.id,
      code: coupon.code,
      name: coupon.name,
      description: coupon.description,
      type: coupon.type,
      discount_type: coupon.discount_type,
      discount_value: Number(coupon.discount_value),
      max_discount_amount:
        coupon.max_discount_amount !== null ? Number(coupon.max_discount_amount) : null,
      min_stay_nights: coupon.min_stay_nights,
      min_booking_amount: Number(coupon.min_booking_amount),
      max_uses_per_guest: coupon.max_uses_per_guest,
      max_total_uses: coupon.max_total_uses,
      applies_to_all_properties: coupon.applies_to_all_properties,
      property_ids: coupon.coupon_properties.map((p) => p.property_id),
      valid_from: coupon.valid_from,
      valid_until: coupon.valid_until,
      is_active: coupon.is_active,
      is_hidden: coupon.is_hidden,
      admin_note: coupon.admin_note,
      created_by: coupon.created_by,
      created_at: coupon.created_at,
      updated_at: coupon.updated_at,
      redemption_count: redemptionCount,
      total_discount_given: totalDiscountGiven,
    };
  }
}
