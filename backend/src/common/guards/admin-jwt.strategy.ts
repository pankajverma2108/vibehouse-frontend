import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../redis/cache.service';
import { getJwtSecret } from '../env.util';

export interface AdminJwtPayload {
  sub: string;
  admin_id: string;
  role: string;
  role_id: string;
  /** The active property for this session (bound at login or via switch-property). */
  property_id: string;
  /** All properties this admin is authorised on. */
  property_ids: string[];
  permissions: string[];
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
      algorithms: ['HS256'],
    });
  }

  async validate(payload: AdminJwtPayload) {
    const cacheKey = CacheService.adminJwtKey(payload.admin_id);

    // Check cache first (returns true/false for is_active, or undefined for miss)
    const cached = await this.cacheService.get<boolean>(cacheKey);
    if (cached !== undefined) {
      if (!cached) throw new UnauthorizedException('Account deactivated');
      return payload;
    }

    // Cache miss — query DB
    const admin = await this.prisma.admin_users.findUnique({
      where: { id: payload.admin_id },
      select: { id: true, is_active: true },
    });

    const isActive = admin?.is_active ?? false;
    await this.cacheService.set(cacheKey, isActive, CacheService.TTL_JWT);

    if (!admin || !isActive) {
      throw new UnauthorizedException('Account deactivated');
    }

    return payload; // attached as req.user
  }
}
