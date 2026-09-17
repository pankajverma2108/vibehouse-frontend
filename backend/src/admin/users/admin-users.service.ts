import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../redis/cache.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminProfileDto } from './dto/update-admin-profile.dto';
import { UpdateAdminPropertiesDto } from './dto/update-admin-properties.dto';
import { SqsProducerService } from '../../sqs/sqs-producer.service';
import { AdminJwtPayload } from '../../common/guards/admin-jwt.strategy';
import { ROLE_HIERARCHY } from '../../common/constants/role-hierarchy';

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly sqsProducer: SqsProducerService,
  ) {}

  /** Owners may grant any property; everyone else can only grant properties they themselves have. */
  private assertActorCanGrant(actor: AdminJwtPayload, propertyIds: string[]) {
    if (actor.role === 'OWNER') return;
    const missing = propertyIds.filter((p) => !actor.property_ids.includes(p));
    if (missing.length > 0) {
      throw new ForbiddenException(
        `You cannot assign properties you don't have access to: ${missing.join(', ')}`,
      );
    }
  }

  private async assertPropertiesExist(propertyIds: string[]) {
    const rows = await this.prisma.properties.findMany({
      where: { id: { in: propertyIds } },
      select: { id: true },
    });
    const found = new Set(rows.map((r) => r.id));
    const missing = propertyIds.filter((p) => !found.has(p));
    if (missing.length > 0) {
      throw new BadRequestException(`Unknown property_ids: ${missing.join(', ')}`);
    }
  }

  private projectAdmin(admin: any) {
    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      role: admin.admin_roles.name,
      display_name: admin.admin_roles.display_name,
      property_ids: admin.admin_user_properties.map((p: any) => p.property_id),
      is_active: admin.is_active,
      two_fa_enabled: admin.two_fa_enabled,
      last_login_at: admin.last_login_at,
      created_at: admin.created_at,
      updated_at: admin.updated_at,
    };
  }

  async create(dto: CreateAdminUserDto, actor: AdminJwtPayload) {
    const existing = await this.prisma.admin_users.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const role = await this.prisma.admin_roles.findUnique({
      where: { id: dto.role_id },
    });
    if (!role || !role.is_active) {
      throw new NotFoundException('Role not found or inactive');
    }

    const allowedTargets = ROLE_HIERARCHY[actor.role] ?? [];
    if (!allowedTargets.includes(role.name)) {
      throw new ForbiddenException(
        `A ${actor.role} cannot create a ${role.name} account`,
      );
    }

    const uniquePropertyIds = Array.from(new Set(dto.property_ids));
    this.assertActorCanGrant(actor, uniquePropertyIds);
    await this.assertPropertiesExist(uniquePropertyIds);

    const password_hash = await bcrypt.hash(dto.password, 12);
    const id = uuidv4();

    const admin = await this.prisma.$transaction(async (tx) => {
      const created = await tx.admin_users.create({
        data: {
          id,
          name: dto.name,
          email: dto.email,
          phone: dto.phone ?? null,
          password_hash,
          role_id: dto.role_id,
        },
      });
      await tx.admin_user_properties.createMany({
        data: uniquePropertyIds.map((property_id) => ({
          admin_user_id: created.id,
          property_id,
        })),
      });
      return tx.admin_users.findUniqueOrThrow({
        where: { id: created.id },
        include: { admin_roles: true, admin_user_properties: true },
      });
    });

    await this.sqsProducer.sendAuditLog({
      actor_type: 'ADMIN',
      actor_id: actor.admin_id,
      action: 'ADMIN_CREATE',
      entity_type: 'admin_users',
      entity_id: id,
      new_value: {
        email: dto.email,
        role: role.name,
        property_ids: uniquePropertyIds,
      },
    });

    return this.projectAdmin(admin);
  }

  async findAll(actor: AdminJwtPayload) {
    // Property-scoped admins only see users that share at least one property with them.
    // Owners see everyone.
    const where = actor.role === 'OWNER'
      ? {}
      : {
          admin_user_properties: {
            some: { property_id: { in: actor.property_ids } },
          },
        };

    const admins = await this.prisma.admin_users.findMany({
      where,
      include: { admin_roles: true, admin_user_properties: true },
      orderBy: { created_at: 'desc' },
    });

    return admins.map((a) => this.projectAdmin(a));
  }

  async findOne(id: string) {
    const admin = await this.prisma.admin_users.findUnique({
      where: { id },
      include: { admin_roles: true, admin_user_properties: true },
    });

    if (!admin) throw new NotFoundException('Admin user not found');

    return this.projectAdmin(admin);
  }

  async updateProperties(
    id: string,
    dto: UpdateAdminPropertiesDto,
    actor: AdminJwtPayload,
  ) {
    const target = await this.prisma.admin_users.findUnique({
      where: { id },
      include: { admin_roles: true },
    });
    if (!target) throw new NotFoundException('Admin user not found');

    const allowedTargets = ROLE_HIERARCHY[actor.role] ?? [];
    const isSelf = actor.admin_id === id;
    if (!isSelf && !allowedTargets.includes(target.admin_roles.name)) {
      throw new ForbiddenException(
        `You cannot edit a ${target.admin_roles.name} account`,
      );
    }

    const uniquePropertyIds = Array.from(new Set(dto.property_ids));
    this.assertActorCanGrant(actor, uniquePropertyIds);
    await this.assertPropertiesExist(uniquePropertyIds);

    await this.prisma.$transaction([
      this.prisma.admin_user_properties.deleteMany({ where: { admin_user_id: id } }),
      this.prisma.admin_user_properties.createMany({
        data: uniquePropertyIds.map((property_id) => ({
          admin_user_id: id,
          property_id,
        })),
      }),
    ]);

    // Force this admin to reissue a JWT on next call — their active property may no
    // longer be in the set.
    await this.cacheService.invalidateAdminJwt(id);

    await this.sqsProducer.sendAuditLog({
      actor_type: 'ADMIN',
      actor_id: actor.admin_id,
      action: 'ADMIN_PROPERTIES_UPDATE',
      entity_type: 'admin_users',
      entity_id: id,
      new_value: { property_ids: uniquePropertyIds },
    });

    return this.findOne(id);
  }

  async deactivate(id: string, actor: AdminJwtPayload) {
    const admin = await this.prisma.admin_users.findUnique({ where: { id } });
    if (!admin) throw new NotFoundException('Admin user not found');

    await this.prisma.admin_users.update({
      where: { id },
      data: { is_active: false, updated_at: new Date() },
    });

    await this.sqsProducer.sendAuditLog({
      actor_type: 'ADMIN',
      actor_id: actor.admin_id,
      action: 'ADMIN_DEACTIVATE',
      entity_type: 'admin_users',
      entity_id: id,
      old_value: { is_active: true },
      new_value: { is_active: false },
    });

    await this.cacheService.invalidateAdminJwt(id);

    return { message: 'Admin user deactivated successfully' };
  }

  async updateProfile(
    id: string,
    dto: UpdateAdminProfileDto,
    actor: AdminJwtPayload,
  ) {
    const target = await this.prisma.admin_users.findUnique({
      where: { id },
      include: { admin_roles: true },
    });
    if (!target) throw new NotFoundException('Admin user not found');

    const isSelf = actor.admin_id === id;

    if (!isSelf) {
      const allowedTargets = ROLE_HIERARCHY[actor.role] ?? [];
      if (!allowedTargets.includes(target.admin_roles.name)) {
        throw new ForbiddenException(
          `You cannot edit a ${target.admin_roles.name} account`,
        );
      }
    }

    const data: Record<string, unknown> = { updated_at: new Date() };

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.phone !== undefined) data.phone = dto.phone || null;

    if (dto.email !== undefined) {
      const clash = await this.prisma.admin_users.findFirst({
        where: { email: dto.email, id: { not: id } },
      });
      if (clash) throw new ConflictException('Email already in use');
      data.email = dto.email;
    }

    if (dto.new_password) {
      if (isSelf) {
        if (!dto.current_password) {
          throw new BadRequestException(
            'current_password is required to change your password',
          );
        }
        const valid = await bcrypt.compare(
          dto.current_password,
          target.password_hash,
        );
        if (!valid) {
          throw new UnauthorizedException('Current password is incorrect');
        }
      }
      data.password_hash = await bcrypt.hash(dto.new_password, 12);
    }

    await this.prisma.admin_users.update({ where: { id }, data });

    await this.sqsProducer.sendAuditLog({
      actor_type: 'ADMIN',
      actor_id: actor.admin_id,
      action: isSelf ? 'SELF_PROFILE_UPDATE' : 'ADMIN_PROFILE_UPDATE',
      entity_type: 'admin_users',
      entity_id: id,
      new_value: {
        name: dto.name,
        email: dto.email,
        password_changed: !!dto.new_password,
      },
    });

    return this.findOne(id);
  }

  async remove(id: string, actor: AdminJwtPayload) {
    if (actor.admin_id === id) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    const target = await this.prisma.admin_users.findUnique({
      where: { id },
      include: { admin_roles: true },
    });
    if (!target) throw new NotFoundException('Admin user not found');

    const allowedTargets = ROLE_HIERARCHY[actor.role] ?? [];
    if (!allowedTargets.includes(target.admin_roles.name)) {
      throw new ForbiddenException(
        `You cannot delete a ${target.admin_roles.name} account`,
      );
    }

    await this.sqsProducer.sendAuditLog({
      actor_type: 'ADMIN',
      actor_id: actor.admin_id,
      action: 'ADMIN_DELETE',
      entity_type: 'admin_users',
      entity_id: id,
      old_value: { email: target.email, role: target.admin_roles.name },
    });

    await this.prisma.admin_users.delete({ where: { id } });

    await this.cacheService.invalidateAdminJwt(id);

    return { message: 'Admin user deleted successfully' };
  }

  async listRoles() {
    return this.prisma.admin_roles.findMany({
      where: { is_active: true },
      select: {
        id: true,
        name: true,
        display_name: true,
        permissions: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}
