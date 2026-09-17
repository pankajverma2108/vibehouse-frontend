import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminLoginDto } from './dto/login.dto';
import { AdminJwtPayload } from '../../common/guards/admin-jwt.strategy';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: AdminLoginDto, ipAddress?: string) {
    const admin = await this.prisma.admin_users.findFirst({
      where: { email: dto.email, is_active: true },
      include: {
        admin_roles: true,
        admin_user_properties: true,
      },
    });

    if (!admin || !admin.admin_roles.is_active) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (admin.admin_roles.name !== dto.role) {
      throw new ForbiddenException('You are not authorised for this role');
    }

    const passwordValid = await bcrypt.compare(dto.password, admin.password_hash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const propertyIds = admin.admin_user_properties.map((p) => p.property_id);
    if (propertyIds.length === 0) {
      throw new ForbiddenException(
        'Your account has no properties assigned. Ask an owner to grant access.',
      );
    }
    if (!propertyIds.includes(dto.property_id)) {
      throw new ForbiddenException('You are not authorised for this property');
    }

    const permissions = admin.admin_roles.permissions as string[];
    const payload: AdminJwtPayload = {
      sub: admin.id,
      admin_id: admin.id,
      role: admin.admin_roles.name,
      role_id: admin.role_id,
      property_id: dto.property_id,
      property_ids: propertyIds,
      permissions,
    };

    const access_token = this.jwtService.sign(payload);

    await this.prisma.admin_users.update({
      where: { id: admin.id },
      data: { last_login_at: new Date() },
    });

    await this.prisma.admin_activity_log.create({
      data: {
        id: uuidv4(),
        actor_type: 'ADMIN',
        actor_id: admin.id,
        action: 'LOGIN',
        entity_type: 'SESSION',
        entity_id: uuidv4(),
        ip_address: ipAddress ?? null,
        new_value: { property_id: dto.property_id },
      },
    });

    return {
      access_token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.admin_roles.name,
        display_name: admin.admin_roles.display_name,
        property_ids: propertyIds,
        active_property_id: dto.property_id,
        permissions,
      },
    };
  }

  async switchProperty(actor: AdminJwtPayload, propertyId: string) {
    if (!actor.property_ids.includes(propertyId)) {
      throw new ForbiddenException('You are not authorised for this property');
    }

    // The JWT carried `iat`/`exp` from the original sign; jsonwebtoken refuses
    // to re-sign with those claims AND the configured `expiresIn`, so drop them
    // along with any other reserved claims and rebuild the payload by hand.
    const payload: AdminJwtPayload = {
      sub: actor.sub,
      admin_id: actor.admin_id,
      role: actor.role,
      role_id: actor.role_id,
      property_id: propertyId,
      property_ids: actor.property_ids,
      permissions: actor.permissions,
    };

    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      active_property_id: propertyId,
    };
  }

  async getProfile(adminId: string, activePropertyId?: string) {
    const admin = await this.prisma.admin_users.findUnique({
      where: { id: adminId },
      include: {
        admin_roles: true,
        admin_user_properties: true,
      },
    });

    if (!admin || !admin.is_active) {
      throw new UnauthorizedException('Account not found or deactivated');
    }

    const propertyIds = admin.admin_user_properties.map((p) => p.property_id);

    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      role: admin.admin_roles.name,
      display_name: admin.admin_roles.display_name,
      property_ids: propertyIds,
      active_property_id: activePropertyId ?? null,
      permissions: admin.admin_roles.permissions,
      two_fa_enabled: admin.two_fa_enabled,
      last_login_at: admin.last_login_at,
      created_at: admin.created_at,
    };
  }
}
