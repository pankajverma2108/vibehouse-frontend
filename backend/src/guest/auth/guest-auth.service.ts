import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { GuestSignupDto } from './dto/signup.dto';
import { GuestLoginDto } from './dto/login.dto';
import type { GuestJwtPayload } from '../../common/guards/guest-jwt.strategy';
import type { GoogleOAuthUser } from './google.strategy';
import type { Brand } from '../../common/property-resolver';
import { BRAND_TO_DEFAULT_PROPERTY } from '../../common/property-resolver';

@Injectable()
export class GuestAuthService {
  private readonly logger = new Logger(GuestAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async signup(dto: GuestSignupDto, brand: Brand) {
    const existing = await this.prisma.guests.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      // Privacy: do not reveal which brand the original signup happened on.
      throw new ConflictException('Account exists — sign in');
    }

    if (dto.phone) {
      const phoneExists = await this.prisma.guests.findUnique({
        where: { phone: dto.phone },
      });
      if (phoneExists) {
        throw new ConflictException('Account exists — sign in');
      }
    }

    const password_hash = await bcrypt.hash(dto.password, 12);
    const id = uuidv4();

    const guest = await this.prisma.guests.create({
      data: {
        id,
        name: dto.name,
        email: dto.email,
        phone: dto.phone ?? null,
        password_hash,
        email_verified: false,
        phone_verified: false,
      },
    });

    // Record the auth provider
    await this.prisma.auth_providers.create({
      data: {
        id: uuidv4(),
        guest_id: id,
        provider: 'email',
        provider_uid: dto.email,
      },
    });

    const token = this.issueToken(guest, brand);

    // Auto-link any eZee bookings matching this guest's email/phone, scoped
    // to the brand they signed up under (so a Buteak signup doesn't surface
    // TDS OTA bookings sharing the same email).
    this.autoLinkBookings(guest, brand);

    // Auto-send email verification OTP so FE can immediately show the OTP screen.
    // Fire-and-forget — a send failure must not break signup.
    let otp_sent = false;
    let generatedOtp: string | undefined;
    try {
      const otp = String(Math.floor(100_000 + Math.random() * 900_000));
      generatedOtp = otp;
      const otp_hash = await bcrypt.hash(otp, 10);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1_000); // 10 minutes

      await this.prisma.otp_logs.create({
        data: {
          id: uuidv4(),
          guest_id: id,
          recipient: dto.email,
          channel: 'email',
          purpose: 'email_verification',
          otp_hash,
          expires_at: expiresAt,
        },
      });

      await this.emailService.sendOtpEmail({
        toEmail: dto.email,
        toName: dto.name,
        otp,
        expiresAt,
        propertyId: BRAND_TO_DEFAULT_PROPERTY[brand],
      });

      otp_sent = true;
      this.logger.log(`Verification OTP auto-sent to ${dto.email} on signup`);
    } catch (err) {
      this.logger.warn(`Auto-send OTP failed for ${dto.email}: ${(err as Error).message}`);
    }

    return {
      access_token: token,
      guest: this.formatGuest(guest),
      otp_sent,
      ...(process.env.NODE_ENV !== 'production' && generatedOtp ? { dev_otp: generatedOtp } : {}),
    };
  }

  async login(dto: GuestLoginDto, brand: Brand) {
    const guest = await this.prisma.guests.findUnique({
      where: { email: dto.email },
    });

    if (!guest || !guest.password_hash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, guest.password_hash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2FA: send OTP email and require a second step before issuing the token
    if (guest.two_fa_enabled && guest.email) {
      const twoFaOtp = await this.sendTwoFaOtp(guest.id, guest.email, guest.name, brand);
      return {
        requires_2fa: true,
        ...(process.env.NODE_ENV !== 'production' && twoFaOtp ? { dev_otp: twoFaOtp } : {}),
      };
    }

    const token = this.issueToken(guest, brand);
    this.autoLinkBookings(guest, brand);
    return { access_token: token, guest: this.formatGuest(guest) };
  }

  async verifyTwoFa(email: string, otp: string, brand: Brand) {
    const guest = await this.prisma.guests.findUnique({ where: { email } });
    if (!guest) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const log = await this.prisma.otp_logs.findFirst({
      where: {
        guest_id: guest.id,
        channel: 'email',
        purpose: 'two_fa',
        used_at: null,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' },
    });

    if (!log) {
      throw new BadRequestException('OTP expired or not found. Please log in again.');
    }

    const valid = await bcrypt.compare(otp, log.otp_hash);
    if (!valid) {
      throw new UnauthorizedException('Invalid OTP');
    }

    await this.prisma.otp_logs.update({
      where: { id: log.id },
      data: { used_at: new Date() },
    });

    const token = this.issueToken(guest, brand);
    this.autoLinkBookings(guest, brand);
    return { access_token: token, guest: this.formatGuest(guest) };
  }

  async toggleTwoFa(guestId: string, enabled: boolean) {
    const guest = await this.prisma.guests.update({
      where: { id: guestId },
      data: { two_fa_enabled: enabled },
    });
    return { two_fa_enabled: guest.two_fa_enabled };
  }

  private async sendTwoFaOtp(guestId: string, email: string, name: string | null, brand: Brand): Promise<string | null> {
    // Rate-limit: one OTP per 60 seconds
    const recent = await this.prisma.otp_logs.findFirst({
      where: {
        guest_id: guestId,
        channel: 'email',
        purpose: 'two_fa',
        used_at: null,
        created_at: { gte: new Date(Date.now() - 60_000) },
      },
    });
    if (recent) return null; // silently skip — frontend just shows "check your email"

    const otp = String(Math.floor(100_000 + Math.random() * 900_000));
    const otp_hash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1_000);

    const otpId = uuidv4();
    await this.prisma.otp_logs.create({
      data: {
        id: otpId,
        guest_id: guestId,
        recipient: email,
        channel: 'email',
        purpose: 'two_fa',
        otp_hash,
        expires_at: expiresAt,
      },
    });

    try {
      await this.emailService.sendOtpEmail({
        toEmail: email,
        toName: name || 'Guest',
        otp,
        expiresAt,
        purpose: 'two_fa',
        propertyId: BRAND_TO_DEFAULT_PROPERTY[brand],
      });
      return otp;
    } catch (err) {
      await this.prisma.otp_logs.delete({ where: { id: otpId } }).catch(() => null);
      throw err;
    }
  }

  async getMe(guestId: string) {
    const guest = await this.prisma.guests.findUnique({
      where: { id: guestId },
    });

    if (!guest) {
      throw new UnauthorizedException('Guest not found');
    }

    // Fetch linked bookings summary
    const bookings = await this.prisma.booking_guest_access.findMany({
      where: { guest_id: guestId },
      include: { ezee_booking_cache: true },
      orderBy: { created_at: 'desc' },
    });

    return {
      ...this.formatGuest(guest),
      bookings: bookings
        .filter((b) => b.ezee_booking_cache !== null)
        .map((b) => ({
          ezee_reservation_id: b.ezee_reservation_id,
          role: b.role,
          status: b.status,
          checkin_date: b.ezee_booking_cache.checkin_date,
          checkout_date: b.ezee_booking_cache.checkout_date,
          room_type_name: b.ezee_booking_cache.room_type_name,
          property_id: b.ezee_booking_cache.property_id,
        })),
    };
  }

  // ─── PROFILE UPDATE ───────────────────────────────────────────────────────

  /**
   * Self-service profile update for an authenticated guest.
   *
   * Writable: name, phone, date_of_birth. Email is NOT writable here (it's the
   * unique login key + OTA auto-link key — changing it is support-managed).
   *
   * Phone rules: write allowed without OTP, but changing the phone resets
   * phone_verified -> false (a new number hasn't been proven). The phone column
   * is globally UNIQUE, so a clash with another guest's number returns 409.
   *
   * DOB rules: must be a real calendar date in the past, and the guest must be
   * at least 18 (account holders book paid stays) and under 120.
   *
   * Returns the same shape as getMe() so the FE can refresh its cached guest
   * in one round-trip.
   */
  async updateProfile(
    guestId: string,
    dto: {
      name?: string;
      phone?: string;
      date_of_birth?: string;
    },
  ) {
    const guest = await this.prisma.guests.findUnique({ where: { id: guestId } });
    if (!guest) {
      throw new NotFoundException('Guest not found');
    }

    const data: {
      name?: string;
      phone?: string;
      phone_verified?: boolean;
      date_of_birth?: Date;
    } = {};

    if (dto.name !== undefined) {
      const trimmed = dto.name.trim();
      if (!trimmed) throw new BadRequestException('name cannot be empty');
      data.name = trimmed;
    }

    if (dto.phone !== undefined) {
      const phone = dto.phone.trim();
      // Only touch the column / reset verification if the value actually changed.
      if (phone !== guest.phone) {
        const clash = await this.prisma.guests.findFirst({
          where: { phone, id: { not: guestId } },
          select: { id: true },
        });
        if (clash) {
          throw new ConflictException(
            'This phone number is already linked to another account',
          );
        }
        data.phone = phone;
        data.phone_verified = false;
      }
    }

    if (dto.date_of_birth !== undefined) {
      data.date_of_birth = this.parseDateOfBirth(dto.date_of_birth);
    }

    if (Object.keys(data).length === 0) {
      // Nothing changed — return current state rather than a pointless write.
      return this.getMe(guestId);
    }

    try {
      await this.prisma.guests.update({ where: { id: guestId }, data });
    } catch (err: any) {
      // P2002 = unique constraint (phone) — defensive, the pre-check should
      // have caught it but a race could slip through.
      if (err?.code === 'P2002') {
        throw new ConflictException(
          'This phone number is already linked to another account',
        );
      }
      throw err;
    }

    return this.getMe(guestId);
  }

  /**
   * Validate + parse a YYYY-MM-DD birth date. Stored as a date-only value
   * (midnight UTC) so it round-trips without timezone drift.
   */
  private parseDateOfBirth(raw: string): Date {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (!m) {
      throw new BadRequestException('date_of_birth must be in YYYY-MM-DD format');
    }
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const dob = new Date(Date.UTC(y, mo - 1, d));
    // Reject impossible dates (e.g. 2026-02-31 rolls over) and parse failures.
    if (
      dob.getUTCFullYear() !== y ||
      dob.getUTCMonth() !== mo - 1 ||
      dob.getUTCDate() !== d
    ) {
      throw new BadRequestException('date_of_birth is not a valid calendar date');
    }

    const now = new Date();
    if (dob.getTime() > now.getTime()) {
      throw new BadRequestException('date_of_birth cannot be in the future');
    }

    // Age bounds: 18+ (account holders book paid stays), under 120.
    const age =
      (now.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (age < 18) {
      throw new BadRequestException('Guest must be at least 18 years old');
    }
    if (age > 120) {
      throw new BadRequestException('date_of_birth is out of range');
    }

    return dob;
  }

  // ─── EMAIL OTP ────────────────────────────────────────────────────────────

  async sendOtp(email: string, brand: Brand) {
    // Look up the guest (must already have an account)
    const guest = await this.prisma.guests.findUnique({ where: { email } });
    if (!guest) {
      throw new NotFoundException('No account found with this email address');
    }
    if (guest.email_verified) {
      throw new BadRequestException('Email is already verified');
    }

    // Rate-limit: block re-send within 60 seconds
    const recentOtp = await this.prisma.otp_logs.findFirst({
      where: {
        guest_id: guest.id,
        channel: 'email',
        purpose: 'email_verification',
        used_at: null,
        created_at: { gte: new Date(Date.now() - 60_000) },
      },
      orderBy: { created_at: 'desc' },
    });
    if (recentOtp) {
      throw new BadRequestException(
        'Please wait 60 seconds before requesting another OTP',
      );
    }

    // Generate 6-digit OTP and hash it
    const otp = String(Math.floor(100_000 + Math.random() * 900_000));
    const otp_hash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1_000); // +10 minutes

    const otpId = uuidv4();
    await this.prisma.otp_logs.create({
      data: {
        id: otpId,
        guest_id: guest.id,
        recipient: email,
        channel: 'email',
        purpose: 'email_verification',
        otp_hash,
        expires_at: expiresAt,
      },
    });

    try {
      await this.emailService.sendOtpEmail({
        toEmail: email,
        toName: guest.name || 'Guest',
        otp,
        expiresAt,
        propertyId: BRAND_TO_DEFAULT_PROPERTY[brand],
      });
    } catch (err) {
      await this.prisma.otp_logs.delete({ where: { id: otpId } }).catch(() => null);
      throw err;
    }

    return {
      message: 'OTP sent to your email address',
      expires_in_seconds: 600,
      ...(process.env.NODE_ENV !== 'production' ? { dev_otp: otp } : {}),
    };
  }

  async verifyOtp(email: string, otp: string, brand: Brand) {
    const guest = await this.prisma.guests.findUnique({ where: { email } });
    if (!guest) {
      throw new NotFoundException('No account found with this email address');
    }

    // Find the most recent unused + non-expired OTP
    const log = await this.prisma.otp_logs.findFirst({
      where: {
        guest_id: guest.id,
        channel: 'email',
        purpose: 'email_verification',
        used_at: null,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' },
    });

    if (!log) {
      throw new BadRequestException('OTP expired or not found. Please request a new one.');
    }

    const valid = await bcrypt.compare(otp, log.otp_hash);
    if (!valid) {
      throw new BadRequestException('Invalid OTP');
    }

    // Mark OTP as used + set email verified in a transaction
    const [updatedGuest] = await this.prisma.$transaction([
      this.prisma.guests.update({
        where: { id: guest.id },
        data: { email_verified: true },
      }),
      this.prisma.otp_logs.update({
        where: { id: log.id },
        data: { used_at: new Date() },
      }),
    ]);

    return {
      message: 'Email verified successfully',
      access_token: this.issueToken(updatedGuest, brand),
      guest: this.formatGuest(updatedGuest),
    };
  }

  // ─── PASSWORD RESET ───────────────────────────────────────────────────────

  async forgotPassword(email: string, brand: Brand) {
    const guest = await this.prisma.guests.findUnique({ where: { email } });
    if (!guest) {
      throw new NotFoundException('No account found with this email address');
    }

    // OAuth-only accounts have no password — can't reset what doesn't exist
    if (!guest.password_hash) {
      throw new BadRequestException(
        'This account uses Google login. Please sign in with Google instead.',
      );
    }

    // Rate-limit: block re-send within 60 seconds
    const recentOtp = await this.prisma.otp_logs.findFirst({
      where: {
        guest_id: guest.id,
        channel: 'email',
        purpose: 'password_reset',
        used_at: null,
        created_at: { gte: new Date(Date.now() - 60_000) },
      },
      orderBy: { created_at: 'desc' },
    });
    if (recentOtp) {
      throw new BadRequestException(
        'Please wait 60 seconds before requesting another OTP',
      );
    }

    const otp = String(Math.floor(100_000 + Math.random() * 900_000));
    const otp_hash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1_000);

    const otpId = uuidv4();
    await this.prisma.otp_logs.create({
      data: {
        id: otpId,
        guest_id: guest.id,
        recipient: email,
        channel: 'email',
        purpose: 'password_reset',
        otp_hash,
        expires_at: expiresAt,
      },
    });

    try {
      await this.emailService.sendOtpEmail({
        toEmail: email,
        toName: guest.name || 'Guest',
        otp,
        expiresAt,
        purpose: 'password_reset',
        propertyId: BRAND_TO_DEFAULT_PROPERTY[brand],
      });
    } catch (err) {
      // Roll back the OTP record so the guest isn't blocked by the rate limit
      await this.prisma.otp_logs.delete({ where: { id: otpId } }).catch(() => null);
      throw err;
    }

    return {
      message: 'Password reset OTP sent to your email',
      expires_in_seconds: 600,
      ...(process.env.NODE_ENV !== 'production' ? { dev_otp: otp } : {}),
    };
  }

  async resetPassword(email: string, otp: string, newPassword: string, brand: Brand) {
    const guest = await this.prisma.guests.findUnique({ where: { email } });
    if (!guest) {
      throw new NotFoundException('No account found with this email address');
    }

    // Find the most recent unused + non-expired password_reset OTP
    const log = await this.prisma.otp_logs.findFirst({
      where: {
        guest_id: guest.id,
        channel: 'email',
        purpose: 'password_reset',
        used_at: null,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' },
    });

    if (!log) {
      throw new BadRequestException('OTP expired or not found. Please request a new one.');
    }

    const valid = await bcrypt.compare(otp, log.otp_hash);
    if (!valid) {
      throw new BadRequestException('Invalid OTP');
    }

    const password_hash = await bcrypt.hash(newPassword, 10);

    const [updatedGuest] = await this.prisma.$transaction([
      this.prisma.guests.update({
        where: { id: guest.id },
        data: { password_hash },
      }),
      this.prisma.otp_logs.update({
        where: { id: log.id },
        data: { used_at: new Date() },
      }),
    ]);

    return {
      message: 'Password updated successfully',
      access_token: this.issueToken(updatedGuest, brand),
      guest: this.formatGuest(updatedGuest),
    };
  }

  // ─── GOOGLE OAUTH ─────────────────────────────────────────────────────────

  async googleLogin(googleUser: GoogleOAuthUser, brand: Brand) {
    this.logger.log(`[GoogleOAuth] Starting login for google_id=${googleUser.google_id}, email=${googleUser.email}, name=${googleUser.name}`);

    // 1. Check if this Google ID is already linked
    const existingProvider = await this.prisma.auth_providers.findUnique({
      where: {
        provider_provider_uid: {
          provider: 'google',
          provider_uid: googleUser.google_id,
        },
      },
      include: { guests: true },
    });

    if (existingProvider) {
      // Returning Google user — just issue token
      const guest = existingProvider.guests;
      this.logger.log(`[GoogleOAuth] Returning user found: guest_id=${guest.id}`);
      this.autoLinkBookings(guest, brand);
      return {
        access_token: this.issueToken(guest, brand),
        guest: this.formatGuest(guest),
      };
    }

    this.logger.log(`[GoogleOAuth] No existing provider found, checking email...`);

    // 2. No Google provider found — check if email already exists (email/password account)
    let guest = googleUser.email
      ? await this.prisma.guests.findUnique({ where: { email: googleUser.email } })
      : null;

    if (guest) {
      this.logger.log(`[GoogleOAuth] Email match found: guest_id=${guest.id}, linking Google provider...`);
      // Existing email account — link Google as an additional provider
      await this.prisma.auth_providers.create({
        data: {
          id: uuidv4(),
          guest_id: guest.id,
          provider: 'google',
          provider_uid: googleUser.google_id,
        },
      });
      this.logger.log(`[GoogleOAuth] Provider linked successfully`);

      // Mark email as verified since Google has verified it
      if (!guest.email_verified) {
        guest = await this.prisma.guests.update({
          where: { id: guest.id },
          data: {
            email_verified: true,
            profile_photo_url: guest.profile_photo_url ?? googleUser.profile_photo_url,
          },
        });
        this.logger.log(`[GoogleOAuth] Email marked as verified`);
      }

      this.autoLinkBookings(guest, brand);
      return {
        access_token: this.issueToken(guest, brand),
        guest: this.formatGuest(guest),
      };
    }

    // 3. Completely new user — create guest + provider in one go
    this.logger.log(`[GoogleOAuth] New user — creating guest record...`);
    const newId = uuidv4();
    const newGuest = await this.prisma.guests.create({
      data: {
        id: newId,
        name: googleUser.name,
        email: googleUser.email || null,
        phone: null,
        password_hash: null,           // OAuth-only account — no password
        email_verified: true,          // Google already verified the email
        phone_verified: false,
        profile_photo_url: googleUser.profile_photo_url,
      },
    });
    this.logger.log(`[GoogleOAuth] Guest created: id=${newId}`);

    await this.prisma.auth_providers.create({
      data: {
        id: uuidv4(),
        guest_id: newId,
        provider: 'google',
        provider_uid: googleUser.google_id,
      },
    });
    this.logger.log(`[GoogleOAuth] Provider created. OAuth flow complete.`);

    this.autoLinkBookings(newGuest, brand);
    return {
      access_token: this.issueToken(newGuest, brand),
      guest: this.formatGuest(newGuest),
    };
  }

  private issueToken(
    guest: {
      id: string;
      email: string | null;
      email_verified: boolean;
      phone_verified: boolean;
    },
    brand: Brand,
  ): string {
    const payload: GuestJwtPayload = {
      sub: guest.id,
      guest_id: guest.id,
      email: guest.email,
      email_verified: guest.email_verified,
      phone_verified: guest.phone_verified,
      brand,
    };
    return this.jwt.sign(payload);
  }

  // ─── AUTO-LINK: match unlinked bookings by email/phone on login/signup ──

  /**
   * After a guest authenticates, check if any ezee_booking_cache entries
   * match their email or phone but have no booking_guest_access yet.
   * If found, auto-create the link so the booking appears in "My Bookings"
   * immediately — no manual linking required.
   *
   * Non-fatal: failures are logged but never block auth.
   */
  private async autoLinkBookings(
    guest: {
      id: string;
      name: string | null;
      email: string | null;
      phone: string | null;
    },
    brand: Brand,
  ): Promise<void> {
    try {
      if (!guest.email && !guest.phone) return;

      const conditions: any[] = [];
      if (guest.email) conditions.push({ booker_email: guest.email });
      if (guest.phone) conditions.push({ booker_phone: guest.phone });

      // Brand-scoped: only match bookings at properties belonging to the
      // brand the guest is currently authenticating under. A Buteak signup
      // does NOT silently inherit TDS OTA bookings sharing the same email.
      const matchingBookings = await this.prisma.ezee_booking_cache.findMany({
        where: {
          OR: conditions,
          is_active: true,
          properties: { brand },
        },
        select: {
          ezee_reservation_id: true,
          booker_email: true,
          booker_phone: true,
          no_of_guests: true,
          room_type_name: true,
          checkin_date: true,
          checkout_date: true,
          source: true,
          property_id: true,
        },
      });

      if (matchingBookings.length === 0) return;

      // Filter out bookings already linked to this guest
      const existingLinks = await this.prisma.booking_guest_access.findMany({
        where: {
          guest_id: guest.id,
          ezee_reservation_id: { in: matchingBookings.map((b) => b.ezee_reservation_id) },
        },
        select: { ezee_reservation_id: true },
      });
      const linkedSet = new Set(existingLinks.map((l) => l.ezee_reservation_id));

      const toLink = matchingBookings.filter((b) => !linkedSet.has(b.ezee_reservation_id));
      if (toLink.length === 0) return;

      for (const booking of toLink) {
        const isBookerMatch =
          (guest.email && guest.email === booking.booker_email) ||
          (guest.phone && guest.phone === booking.booker_phone);

        await this.prisma.booking_guest_access.create({
          data: {
            id: uuidv4(),
            ezee_reservation_id: booking.ezee_reservation_id,
            guest_id: guest.id,
            role: isBookerMatch ? 'PRIMARY' : 'SECONDARY',
            status: 'APPROVED',
            approved_by_guest_id: guest.id,
            approved_at: new Date(),
          },
        });

        this.logger.log(
          `Auto-linked guest ${guest.id} to booking ${booking.ezee_reservation_id} as ${isBookerMatch ? 'PRIMARY' : 'SECONDARY'}`,
        );

        // Email nudge for OTA bookings only.
        //
        // This used to key off the `-EZEE-` infix in the primary key. That was
        // never a business-source classification — it is a storage format, and
        // it does not distinguish an Agoda reservation from a walk-in typed in
        // at reception or an old booking touched during a PMS operation.
        // Namespacing the autosync path makes every externally-ingested row
        // carry that infix, which would have started sending this email to
        // guests who never booked through an OTA.
        //
        // Gate on the booking's actual `source` instead, and keep the whole
        // thing behind a kill switch that is OFF until the copy is signed off.
        if (
          process.env.OTA_LINK_EMAIL_ENABLED === 'true' &&
          this.isOtaSource(booking.source) &&
          guest.email
        ) {
          try {
            const prop = await this.prisma.properties.findUnique({
              where: { id: booking.property_id },
              select: { name: true },
            });
            this.emailService.sendOtaBookingLinkedEmail({
              toEmail: guest.email,
              firstName: guest.name?.split(' ')[0] ?? 'there',
              bookingId: booking.ezee_reservation_id,
              propertyName: prop?.name ?? 'The Daily Social',
              roomTypeName: booking.room_type_name ?? 'your room',
              checkinDate: booking.checkin_date?.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) ?? '',
              checkoutDate: booking.checkout_date?.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) ?? '',
              source: booking.source ?? 'an OTA',
              propertyId: booking.property_id,
            }).catch((e: Error) => this.logger.warn(`Auto-link email failed for ${booking.ezee_reservation_id}: ${e.message}`));
          } catch (emailErr) {
            this.logger.warn(`Failed to resolve property for auto-link email: ${(emailErr as Error).message}`);
          }
        }
      }
    } catch (err) {
      // Non-fatal — guest can always link manually
      this.logger.warn(`Auto-link failed for guest ${guest.id}: ${(err as Error).message}`);
    }
  }

  /**
   * Channels whose bookings genuinely arrive through an OTA, matched as a
   * case-insensitive prefix because eZee appends a channel account id
   * (`Airbnb-694019199`, `Booking.com-16804934`, `go-mmt-1000649546`).
   *
   * Deliberately an allow-list. Production `source` values are mostly NOT
   * OTAs: `Walk-in` (201 rows), `Internet Booking Engine` (108, our own
   * engine), `WEB`, `Buteak`, `The Daily Social`, and a long tail that is just
   * the guest's own name typed in by reception. Anything unrecognised is
   * treated as not-an-OTA, so a new channel silently misses one nudge email
   * rather than a walk-in guest being told they booked through an OTA.
   */
  private static readonly OTA_SOURCE_PREFIXES = [
    'airbnb',
    'booking.com',
    'makemytrip',
    'go-mmt',
    'expedia',
    'agoda',
    'brevistay',
  ];

  private isOtaSource(source: string | null | undefined): boolean {
    const s = (source ?? '').trim().toLowerCase();
    if (!s) return false;
    return GuestAuthService.OTA_SOURCE_PREFIXES.some((p) => s.startsWith(p));
  }

  private formatGuest(guest: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    date_of_birth?: Date | null;
    email_verified: boolean;
    phone_verified: boolean;
    two_fa_enabled: boolean;
    profile_photo_url: string | null;
    created_at: Date;
  }) {
    return {
      id: guest.id,
      name: guest.name,
      email: guest.email,
      phone: guest.phone,
      // Date-only field — serialise as YYYY-MM-DD (no time / TZ noise).
      date_of_birth: guest.date_of_birth
        ? guest.date_of_birth.toISOString().slice(0, 10)
        : null,
      email_verified: guest.email_verified,
      phone_verified: guest.phone_verified,
      two_fa_enabled: guest.two_fa_enabled,
      profile_photo_url: guest.profile_photo_url,
      created_at: guest.created_at,
    };
  }
}
