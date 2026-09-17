import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../redis/cache.service';
import type { Brand } from '../property-resolver';
import { resolveBrandFromRequest } from '../property-resolver';
import { getJwtSecret } from '../env.util';
import type { Request } from 'express';

export interface GuestJwtPayload {
  sub: string;
  guest_id: string;
  email: string | null;
  email_verified: boolean;
  phone_verified: boolean;
  /**
   * Brand the JWT was issued under. Used to scope guest-facing reads
   * (getMyBookings, etc.) so a TDS-issued token can't surface Buteak data.
   *
   * Optional for backwards-compatibility with tokens issued before the
   * brand-isolation rollout — if missing, callers should fall back to
   * resolveBrandFromRequest(req) to derive brand from Host header.
   */
  brand?: Brand;
}

@Injectable()
export class GuestJwtStrategy extends PassportStrategy(Strategy, 'guest-jwt') {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
      algorithms: ['HS256'],
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: GuestJwtPayload) {
    const cacheKey = CacheService.guestJwtKey(payload.guest_id);

    // Check cache first (returns true if exists, or undefined for miss)
    const cached = await this.cacheService.get<boolean>(cacheKey);
    if (cached !== undefined) {
      if (!cached) throw new UnauthorizedException('Guest account not found');
      return payload;
    }

    // Cache miss — query DB
    const guest = await this.prisma.guests.findUnique({
      where: { id: payload.guest_id },
      select: { id: true },
    });

    const exists = !!guest;
    await this.cacheService.set(cacheKey, exists, CacheService.TTL_JWT);

    if (!guest) {
      throw new UnauthorizedException('Guest account not found');
    }

    // Brand fallback for tokens issued before the brand-isolation rollout —
    // they have no `brand` claim. Read it from Host so existing sessions
    // don't need to re-login. New tokens always have brand set at issue time.
    if (!payload.brand) {
      payload.brand = resolveBrandFromRequest(req);
    }

    return payload; // attached as req.user
  }
}

