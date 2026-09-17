import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import {
  SESClient,
  SendEmailCommand,
  type SendEmailCommandInput,
} from '@aws-sdk/client-ses';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Per-property visual identity used in every outbound email.
 *
 * Resolved from `properties.branding_config` for property-aware emails (booking
 * confirmation, check-in, OTA auto-link). Defaults to TDS when no property
 * is in scope (e.g., signup OTP before the guest has a booking).
 */
interface Branding {
  brandName: string;       // "The Daily Social" or "Buteak Suites"
  primaryColor: string;    // hex for headers/buttons/booking-card border
  secondaryColor: string;  // hex for darker text/secondary accents
  accentColor: string;     // hex for text-on-primary (usually white)
  logoUrl: string;         // absolute URL — empty string means "render brand name only"
  supportEmail: string;    // shown in footer
  fromAddress: string;     // SES Source envelope address
  websiteUrl: string;      // for CTA links + footer
  /**
   * AWS region the SES API call routes to. Different per brand so each
   * domain identity's regional sandbox/production status is honoured.
   * Configured via `properties.branding_config.ses_region`. Defaults to
   * AWS_REGION env var (currently `ap-south-1`) so TDS doesn't need an
   * explicit value while it stays on the Mumbai tenant.
   */
  sesRegion: string;
}

const DEFAULT_SES_REGION = process.env.AWS_REGION ?? 'ap-south-1';

const TDS_DEFAULT: Branding = {
  brandName: 'The Daily Social',
  primaryColor: '#C62828',
  secondaryColor: '#000000',
  accentColor: '#ffffff',
  logoUrl: 'https://www.thedailysocial.co.in/brands/tds/logo.png',
  supportEmail: 'noreply@thedailysocial.co.in',
  fromAddress: 'noreply@thedailysocial.co.in',
  websiteUrl: 'https://www.thedailysocial.co.in',
  sesRegion: DEFAULT_SES_REGION,
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  /**
   * Cache of SESClient instances keyed by region. Each region's identity has
   * its own verification + sandbox status, so a single send call routes to
   * the region of the brand's MAIL FROM domain (e.g., Buteak → ap-south-2
   * after the migration, TDS → ap-south-1).
   */
  private readonly clientsByRegion = new Map<string, SESClient>();

  constructor(private readonly prisma: PrismaService) {}

  private getClient(region: string): SESClient {
    let client = this.clientsByRegion.get(region);
    if (!client) {
      // Explicit env-var creds so the SDK doesn't fall through to an ECS task
      // role that may not have ses:SendEmail in the target region.
      const accessKeyId     = process.env.AWS_ACCESS_KEY_ID;
      const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
      client = new SESClient({
        region,
        ...(accessKeyId && secretAccessKey
          ? { credentials: { accessKeyId, secretAccessKey } }
          : {}),
      });
      this.clientsByRegion.set(region, client);
      this.logger.log(`Initialized SES client for region: ${region}`);
    }
    return client;
  }

  // ─── BRANDING ──────────────────────────────────────────────────────────────

  /**
   * Look up the brand identity for a property. Falls back to TDS if propertyId
   * is missing or the row has no branding_config — that keeps single-property
   * (legacy) callsites working without a forced migration.
   */
  private async getBranding(propertyId?: string): Promise<Branding> {
    if (!propertyId) return TDS_DEFAULT;
    try {
      const prop = await this.prisma.properties.findUnique({
        where: { id: propertyId },
        select: { name: true, branding_config: true },
      });
      if (!prop) return TDS_DEFAULT;
      const bc = (prop.branding_config as Record<string, unknown> | null) ?? {};

      const support = (bc.support_email as string) || TDS_DEFAULT.supportEmail;
      const logoRel = (bc.logo_url as string) || '';
      // Buteak FE is still S3-static and doesn't host its own brand assets yet —
      // serve from TDS's frontend until the Buteak rebuild. Once Buteak FE is
      // dynamic, flip branding_config.logo_url to an absolute https://www.buteak.in URL.
      const logoUrl = logoRel
        ? (logoRel.startsWith('http')
            ? logoRel
            : `${TDS_DEFAULT.websiteUrl}${logoRel.startsWith('/') ? '' : '/'}${logoRel}`)
        : '';

      return {
        brandName:      (bc.brand_name as string) || prop.name || TDS_DEFAULT.brandName,
        primaryColor:   (bc.primary_color_hex as string) || TDS_DEFAULT.primaryColor,
        secondaryColor: (bc.secondary_color_hex as string) || TDS_DEFAULT.secondaryColor,
        accentColor:    (bc.accent_color_hex as string) || TDS_DEFAULT.accentColor,
        logoUrl,
        supportEmail:   support,
        fromAddress:    support,
        websiteUrl:     (bc.domain as string)
          ? `https://${bc.domain as string}`
          : TDS_DEFAULT.websiteUrl,
        sesRegion:      (bc.ses_region as string) || DEFAULT_SES_REGION,
      };
    } catch (err) {
      this.logger.warn(`getBranding(${propertyId}) failed, defaulting to TDS: ${(err as Error).message}`);
      return TDS_DEFAULT;
    }
  }

  private logoBlock(b: Branding, padding = '24px 36px'): string {
    // Brand-name text only — no <img> tag. Gmail and other providers flag
    // emails containing external images as commercial/promotional, which
    // bumps them into spam/promotions tabs. Text-only header has cleaner
    // deliverability + accessible across all email clients.
    // (b.logoUrl is still resolved in getBranding for any future use, just
    // not rendered in transactional templates.)
    return `<td style="background:${b.primaryColor};padding:${padding};">
              <p style="margin:0;font-size:24px;font-weight:900;color:${b.accentColor};
                         font-family:'Segoe UI',Arial,sans-serif;letter-spacing:-0.4px;">
                ${b.brandName}
              </p>
            </td>`;
  }

  private footerBlock(b: Branding): string {
    return `<tr>
      <td style="background:#fafafa;border-top:1px solid #f0f0f0;padding:18px 36px;">
        <p style="margin:0;font-size:13px;color:#999;">
          From the <strong style="color:${b.primaryColor};">${b.brandName}</strong> Support Team
        </p>
        <p style="margin:3px 0 0;font-size:12px;color:#ccc;">${b.supportEmail}</p>
      </td>
    </tr>`;
  }

  // ─── OTP ───────────────────────────────────────────────────────────────────

  async sendOtpEmail(opts: {
    toEmail: string;
    toName: string;
    otp: string;
    expiresAt: Date;
    purpose?: 'email_verification' | 'password_reset' | 'two_fa';
    propertyId?: string;
  }): Promise<void> {
    const { toEmail, toName, otp, expiresAt, purpose = 'email_verification', propertyId } = opts;
    const branding = await this.getBranding(propertyId);

    const expiresFormatted = expiresAt.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });

    // Emoji removed from subject lines — they push deliverability into the
    // promotions tab on Gmail and trigger heuristics on some corporate
    // email gateways. Plain text subjects keep transactional emails landing
    // in the primary inbox.
    const copy =
      purpose === 'password_reset'
        ? {
            subject: `${branding.brandName} — Password reset code`,
            heading: 'We received a request to reset the password for your account.',
            label: 'Password reset code',
            cta: 'Reset password',
            footerHint: 'Didn\'t ask to reset your password? You can safely ignore this email — your account is unchanged until the code is used.',
          }
        : purpose === 'two_fa'
          ? {
              subject: `${branding.brandName} — Login verification code`,
              heading: 'Enter this code on the login screen to finish signing in.',
              label: 'Login verification code',
              cta: 'Continue sign-in',
              footerHint: 'Didn\'t try to log in? Someone may have your password — change it immediately.',
            }
          : {
              subject: `Your ${branding.brandName} verification code`,
              heading: `Welcome to ${branding.brandName}! Use the code below to verify your email address.`,
              label: 'Email verification code',
              cta: `Open ${branding.brandName}`,
              footerHint: 'Didn\'t sign up? You can safely ignore this email — no account will be activated without this code.',
            };

    const html = this.buildOtpHtml(toName, otp, expiresFormatted, copy.heading, copy.label, copy.cta, copy.footerHint, branding);
    const text = this.buildOtpText(toName, otp, expiresFormatted, copy.heading, copy.footerHint, branding);

    // In local dev, skip SES and log the OTP so the flow is testable without AWS config
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n======================================================');
      console.log(`📧 [DEV EMAIL OTP] To: ${toEmail} | Name: ${toName}`);
      console.log(`🔑 OTP CODE: [ ${otp} ] (Purpose: ${purpose})`);
      console.log(`⏰ Expires: ${expiresFormatted} | Brand: ${branding.brandName}`);
      console.log('======================================================\n');
      this.logger.warn(
        `[DEV] OTP email NOT sent via SES. ` +
        `to=${toEmail} purpose=${purpose} otp=${otp} expires=${expiresFormatted} brand=${branding.brandName}`,
      );
      return;
    }

    const input: SendEmailCommandInput = {
      Source: `${branding.brandName} <${branding.fromAddress}>`,
      Destination: { ToAddresses: [toEmail] },
      Message: {
        Subject: { Data: copy.subject, Charset: 'UTF-8' },
        Body: {
          Html: { Data: html, Charset: 'UTF-8' },
          Text: { Data: text, Charset: 'UTF-8' },
        },
      },
    };

    try {
      await this.getClient(branding.sesRegion).send(new SendEmailCommand(input));
      this.logger.log(`${purpose} OTP email sent to ${toEmail} (brand=${branding.brandName}, region=${branding.sesRegion})`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`SES send failed to=${toEmail} purpose=${purpose} error=${msg}`);
      throw new ServiceUnavailableException(
        'Could not send OTP email. Please try again in a moment.',
      );
    }
  }

  private buildOtpHtml(
    name: string,
    otp: string,
    expiresAt: string,
    heading: string,
    label: string,
    ctaText: string,
    footerHint: string,
    b: Branding,
  ): string {
    const firstName = name?.trim()?.split(' ')[0] || 'there';
    // The OTP code sits in a tinted card using the brand's primary color at
    // low opacity (12% — readable on white, clearly branded). The code itself
    // uses the brand's secondary color for high contrast. Letter-spacing
    // visually separates the digits without breaking copy-paste.
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${b.brandName}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">

      <table width="480" cellpadding="0" cellspacing="0" border="0"
             style="background:#ffffff;border-radius:14px;overflow:hidden;max-width:480px;width:100%;
                    box-shadow:0 1px 4px rgba(0,0,0,0.04);">

        <tr>${this.logoBlock(b)}</tr>

        <tr><td style="padding:36px 36px 8px;">

          <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111;letter-spacing:-0.2px;">
            Hey ${firstName},
          </p>
          <p style="margin:0 0 28px;font-size:15px;color:#555;line-height:1.55;">${heading}</p>

          <!-- Branded OTP card -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="background:${b.primaryColor}1A;border:1.5px solid ${b.primaryColor}40;
                        border-radius:10px;margin-bottom:24px;">
            <tr><td align="center" style="padding:20px 24px 18px;">
              <p style="margin:0 0 8px;font-size:10px;font-weight:700;color:${b.secondaryColor};
                         letter-spacing:2px;text-transform:uppercase;opacity:0.65;">
                ${label}
              </p>
              <p style="margin:0 0 6px;font-size:38px;font-weight:900;color:${b.secondaryColor};
                         font-family:'Segoe UI',Arial,sans-serif;letter-spacing:8px;line-height:1.1;">
                ${otp}
              </p>
              <p style="margin:0;font-size:12px;color:${b.secondaryColor};opacity:0.7;">
                Valid until <strong>${expiresAt} IST</strong>
              </p>
            </td></tr>
          </table>

          <!-- CTA back to the brand site -->
          <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
            <tr><td style="background:${b.primaryColor};border-radius:8px;">
              <a href="${b.websiteUrl}"
                 style="display:inline-block;padding:12px 26px;font-size:14px;font-weight:700;
                        color:${b.accentColor};text-decoration:none;
                        font-family:'Segoe UI',Arial,sans-serif;letter-spacing:0.3px;">
                ${ctaText} →
              </a>
            </td></tr>
          </table>

          <hr style="border:none;border-top:1px solid #eee;margin:0 0 16px;" />
          <p style="margin:0 0 6px;font-size:13px;color:#666;line-height:1.55;">
            ⚠️ Never share this code with anyone — not even ${b.brandName} staff.
          </p>
          <p style="margin:0 0 28px;font-size:13px;color:#aaa;line-height:1.55;">
            ${footerHint}
          </p>
        </td></tr>

        ${this.footerBlock(b)}

      </table>

      <p style="margin:14px 0 0;font-size:11px;color:#bbb;font-family:'Segoe UI',Arial,sans-serif;">
        Sent via ${b.brandName} · ${b.supportEmail}
      </p>

    </td></tr>
  </table>

</body>
</html>`;
  }

  private buildOtpText(
    name: string,
    otp: string,
    expiresAt: string,
    heading: string,
    footerHint: string,
    b: Branding,
  ): string {
    const firstName = name?.trim()?.split(' ')[0] || 'there';
    return [
      b.brandName.toUpperCase(),
      '─'.repeat(40),
      '',
      `Hey ${firstName},`,
      '',
      heading,
      '',
      `  Your code:  ${otp}`,
      `  Valid until: ${expiresAt} IST`,
      '',
      'NEVER share this code with anyone — not even support staff.',
      '',
      footerHint,
      '',
      `Open ${b.brandName}: ${b.websiteUrl}`,
      '',
      '─'.repeat(40),
      `From the ${b.brandName} Support Team`,
      b.supportEmail,
    ].join('\n');
  }

  // ─── OTA BOOKING LINKED ──────────────────────────────────────────────────

  async sendOtaBookingLinkedEmail(opts: {
    toEmail: string;
    firstName: string;
    bookingId: string;
    propertyName: string;
    roomTypeName: string;
    checkinDate: string;
    checkoutDate: string;
    source: string;
    propertyId?: string;
  }): Promise<void> {
    const branding = await this.getBranding(opts.propertyId);
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`[DEV] OTA booking linked email to=${opts.toEmail} bookingId=${opts.bookingId} property=${opts.propertyName}`);
      return;
    }
    const html = this.buildOtaLinkedHtml(opts, branding);
    const text = this.buildOtaLinkedText(opts, branding);

    const input: SendEmailCommandInput = {
      Source: `${branding.brandName} <${branding.fromAddress}>`,
      Destination: { ToAddresses: [opts.toEmail] },
      Message: {
        Subject: {
          Data: `Your ${opts.propertyName} booking is linked — complete pre-checkin`,
          Charset: 'UTF-8',
        },
        Body: {
          Html: { Data: html, Charset: 'UTF-8' },
          Text: { Data: text, Charset: 'UTF-8' },
        },
      },
    };

    await this.getClient(branding.sesRegion).send(new SendEmailCommand(input));
    this.logger.log(`OTA booking linked email sent to ${opts.toEmail} for booking ${opts.bookingId} (brand=${branding.brandName}, region=${branding.sesRegion})`);
  }

  private buildOtaLinkedHtml(opts: {
    firstName: string; bookingId: string; propertyName: string;
    roomTypeName: string; checkinDate: string; checkoutDate: string; source: string;
  }, b: Branding): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${b.brandName}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">

      <table width="480" cellpadding="0" cellspacing="0" border="0"
             style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:480px;width:100%;">

        <tr>${this.logoBlock(b)}</tr>

        <tr><td style="padding:36px 36px 0;">

          <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111;">Hey ${opts.firstName},</p>
          <p style="margin:0 0 28px;font-size:15px;color:#555;line-height:1.6;">
            We spotted your booking from <strong style="color:#333;">${opts.source}</strong>.
            It's now linked to your ${b.brandName} account — your pre-checkin is ready to complete.
          </p>

          <p style="margin:0 0 10px;font-size:11px;font-weight:600;color:#999;letter-spacing:2px;text-transform:uppercase;">
            Booking Details
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="background:#fff7e6;border:2px solid ${b.primaryColor};border-radius:8px;margin-bottom:28px;">
            <tr><td style="padding:16px 20px 12px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="40%" style="padding:5px 0;font-size:12px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;">Booking ID</td>
                  <td style="padding:5px 0;font-size:14px;font-weight:700;color:${b.primaryColor};font-family:'Courier New',monospace;">${opts.bookingId}</td>
                </tr>
                <tr>
                  <td style="padding:5px 0;font-size:12px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;border-top:1px solid #f0ddb0;">Property</td>
                  <td style="padding:5px 0;font-size:15px;color:#111;border-top:1px solid #f0ddb0;">${opts.propertyName}</td>
                </tr>
                <tr>
                  <td style="padding:5px 0;font-size:12px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;border-top:1px solid #f0ddb0;">Room</td>
                  <td style="padding:5px 0;font-size:15px;color:#111;border-top:1px solid #f0ddb0;">${opts.roomTypeName}</td>
                </tr>
                <tr>
                  <td style="padding:5px 0;font-size:12px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;border-top:1px solid #f0ddb0;">Check-in</td>
                  <td style="padding:5px 0;font-size:15px;color:#111;border-top:1px solid #f0ddb0;">${opts.checkinDate}</td>
                </tr>
                <tr>
                  <td style="padding:5px 0;font-size:12px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;border-top:1px solid #f0ddb0;">Check-out</td>
                  <td style="padding:5px 0;font-size:15px;color:#111;border-top:1px solid #f0ddb0;">${opts.checkoutDate}</td>
                </tr>
              </table>
            </td></tr>
          </table>

          <p style="margin:0 0 20px;font-size:15px;color:#555;line-height:1.6;">
            Save time at check-in — complete your pre-checkin now and upload your ID in advance.
          </p>
          <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
            <tr><td style="background:${b.primaryColor};border-radius:8px;">
              <a href="${b.websiteUrl}/pre-checkin"
                 style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:700;
                        color:${b.accentColor};text-decoration:none;font-family:'Segoe UI',Arial,sans-serif;">
                Complete Pre-Checkin →
              </a>
            </td></tr>
          </table>

          <hr style="border:none;border-top:1px solid #eee;margin:0 0 20px;" />
          <p style="margin:0;font-size:13px;color:#aaa;line-height:1.6;">Not your booking? You can safely ignore this email.</p>

        </td></tr>

        ${this.footerBlock(b)}

      </table>

    </td></tr>
  </table>

</body>
</html>`;
  }

  private buildOtaLinkedText(opts: {
    firstName: string; bookingId: string; propertyName: string;
    roomTypeName: string; checkinDate: string; checkoutDate: string; source: string;
  }, b: Branding): string {
    return [
      `${b.brandName.toUpperCase()} — Your booking is linked`,
      '─'.repeat(40),
      '',
      `Hey ${opts.firstName},`,
      '',
      `We spotted your booking from ${opts.source}.`,
      `It's now linked to your ${b.brandName} account.`,
      '',
      '── BOOKING DETAILS ──',
      `  Booking ID  : ${opts.bookingId}`,
      `  Property    : ${opts.propertyName}`,
      `  Room        : ${opts.roomTypeName}`,
      `  Check-in    : ${opts.checkinDate}`,
      `  Check-out   : ${opts.checkoutDate}`,
      '',
      'Complete your pre-checkin at:',
      `  ${b.websiteUrl}/pre-checkin`,
      '',
      'Not your booking? You can safely ignore this email.',
      '',
      '─'.repeat(40),
      `From the ${b.brandName} Support Team`,
      b.supportEmail,
    ].join('\n');
  }

  // ─── BOOKING CONFIRMATION ────────────────────────────────────────────────

  async sendBookingConfirmationEmail(opts: {
    toEmail: string;
    firstName: string;
    fullName: string;
    gender?: string;
    phone?: string;
    bookingId: string;
    propertyName: string;
    roomType: string;
    roomNumber: string;
    checkinDate: string;
    checkoutDate: string;
    noOfGuests: number;
    propertyId?: string;
  }): Promise<void> {
    const branding = await this.getBranding(opts.propertyId);
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`[DEV] Booking confirmation email to=${opts.toEmail} bookingId=${opts.bookingId} room=${opts.roomNumber}`);
      return;
    }
    const html = this.buildBookingHtml(opts, branding);
    const text = this.buildBookingText(opts, branding);

    const input: SendEmailCommandInput = {
      Source: `${branding.brandName} <${branding.fromAddress}>`,
      Destination: { ToAddresses: [opts.toEmail] },
      Message: {
        Subject: { Data: `Booking confirmed — ${opts.propertyName}`, Charset: 'UTF-8' },
        Body: {
          Html: { Data: html, Charset: 'UTF-8' },
          Text: { Data: text, Charset: 'UTF-8' },
        },
      },
    };

    await this.getClient(branding.sesRegion).send(new SendEmailCommand(input));
    this.logger.log(`Booking confirmation email sent to ${opts.toEmail} for ${opts.bookingId} (brand=${branding.brandName}, region=${branding.sesRegion})`);
  }

  private buildBookingHtml(opts: {
    firstName: string; fullName: string; gender?: string;
    toEmail: string; phone?: string; bookingId: string;
    propertyName: string; roomType: string; roomNumber: string;
    checkinDate: string; checkoutDate: string; noOfGuests: number;
  }, b: Branding): string {
    const phoneRow = opts.phone
      ? `<tr><td style="padding:8px 0;border-top:1px solid #eee;">
          <span style="font-size:11px;font-weight:600;color:#999;letter-spacing:1.5px;text-transform:uppercase;display:block;margin-bottom:3px;">Phone</span>
          <span style="font-size:15px;color:#111;">${opts.phone}</span>
        </td></tr>`
      : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${b.brandName}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">

      <table width="480" cellpadding="0" cellspacing="0" border="0"
             style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:480px;width:100%;">

        <tr>${this.logoBlock(b)}</tr>

        <tr><td style="padding:36px 36px 0;">

          <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111;">Hey ${opts.firstName},</p>
          <p style="margin:0 0 28px;font-size:15px;color:#555;line-height:1.6;">
            Thanks for your booking! Here are your booking details.
          </p>

          <p style="margin:0 0 10px;font-size:11px;font-weight:600;color:#999;letter-spacing:2px;text-transform:uppercase;">
            Guest Information
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="background:#f9f9f9;border:1px solid #eee;border-radius:8px;margin-bottom:24px;">
            <tr><td style="padding:16px 20px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding:0 0 8px;">
                  <span style="font-size:11px;font-weight:600;color:#999;letter-spacing:1.5px;text-transform:uppercase;display:block;margin-bottom:3px;">Name</span>
                  <span style="font-size:15px;color:#111;">${opts.fullName}</span>
                </td></tr>
                <tr><td style="padding:8px 0;border-top:1px solid #eee;">
                  <span style="font-size:11px;font-weight:600;color:#999;letter-spacing:1.5px;text-transform:uppercase;display:block;margin-bottom:3px;">Gender</span>
                  <span style="font-size:15px;color:#111;">${opts.gender ?? '—'}</span>
                </td></tr>
                <tr><td style="padding:8px 0;border-top:1px solid #eee;">
                  <span style="font-size:11px;font-weight:600;color:#999;letter-spacing:1.5px;text-transform:uppercase;display:block;margin-bottom:3px;">Email</span>
                  <span style="font-size:15px;color:#111;">${opts.toEmail}</span>
                </td></tr>
                ${phoneRow}
              </table>
            </td></tr>
            <tr><td style="padding:0 0 4px;"></td></tr>
          </table>

          <p style="margin:0 0 10px;font-size:11px;font-weight:600;color:#999;letter-spacing:2px;text-transform:uppercase;">
            Booking Details
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="background:#fff7e6;border:2px solid ${b.primaryColor};border-radius:8px;margin-bottom:28px;">
            <tr><td style="padding:16px 20px 12px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="40%" style="padding:5px 0;font-size:12px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;">Booking ID</td>
                  <td style="padding:5px 0;font-size:14px;font-weight:700;color:${b.primaryColor};font-family:'Courier New',monospace;">${opts.bookingId}</td>
                </tr>
                <tr>
                  <td style="padding:5px 0;font-size:12px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;border-top:1px solid #f0ddb0;">Property</td>
                  <td style="padding:5px 0;font-size:15px;color:#111;border-top:1px solid #f0ddb0;">${opts.propertyName}</td>
                </tr>
                <tr>
                  <td style="padding:5px 0;font-size:12px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;border-top:1px solid #f0ddb0;">Room / Bed</td>
                  <td style="padding:5px 0;font-size:15px;color:#111;border-top:1px solid #f0ddb0;">${opts.roomType} — ${opts.roomNumber}</td>
                </tr>
                <tr>
                  <td style="padding:5px 0;font-size:12px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;border-top:1px solid #f0ddb0;">Check-in</td>
                  <td style="padding:5px 0;font-size:15px;color:#111;border-top:1px solid #f0ddb0;">${opts.checkinDate}</td>
                </tr>
                <tr>
                  <td style="padding:5px 0;font-size:12px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;border-top:1px solid #f0ddb0;">Check-out</td>
                  <td style="padding:5px 0;font-size:15px;color:#111;border-top:1px solid #f0ddb0;">${opts.checkoutDate}</td>
                </tr>
                <tr>
                  <td style="padding:5px 0;font-size:12px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;border-top:1px solid #f0ddb0;">Guests</td>
                  <td style="padding:5px 0;font-size:15px;color:#111;border-top:1px solid #f0ddb0;">${opts.noOfGuests}</td>
                </tr>
              </table>
            </td></tr>
          </table>

          <hr style="border:none;border-top:1px solid #eee;margin:0 0 20px;" />
          <p style="margin:0 0 12px;font-size:11px;font-weight:600;color:#999;letter-spacing:2px;text-transform:uppercase;">
            The Essentials
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:4px 0;font-size:14px;color:#555;">📎&nbsp; Carry a valid government-issued photo ID</td></tr>
            <tr><td style="padding:4px 0;font-size:14px;color:#555;">🕑&nbsp; Check-in time: <strong style="color:#333;">2:00 PM</strong> onwards</td></tr>
            <tr><td style="padding:4px 0;font-size:14px;color:#555;">⏳&nbsp; Early check-in subject to availability — reach out to us</td></tr>
            <tr><td style="padding:4px 0;font-size:14px;color:#555;">📶&nbsp; Wi-Fi details will be shared at the property</td></tr>
            <tr><td style="padding:4px 0;font-size:14px;color:#555;">📱&nbsp; Manage your stay at <a href="${b.websiteUrl}" style="color:${b.primaryColor};text-decoration:none;font-weight:600;">${b.websiteUrl.replace('https://', '')}</a></td></tr>
          </table>

        </td></tr>

        ${this.footerBlock(b)}

      </table>

    </td></tr>
  </table>

</body>
</html>`;
  }

  private buildBookingText(opts: {
    firstName: string; fullName: string; gender?: string;
    toEmail: string; phone?: string; bookingId: string;
    propertyName: string; roomType: string; roomNumber: string;
    checkinDate: string; checkoutDate: string; noOfGuests: number;
  }, b: Branding): string {
    const lines = [
      `${b.brandName.toUpperCase()} — Booking Confirmed`,
      '─'.repeat(40),
      '',
      `Hey ${opts.firstName},`,
      '',
      'Thanks for your booking! Here are your details.',
      '',
      '── GUEST INFORMATION ──',
      `  Name    : ${opts.fullName}`,
      `  Gender  : ${opts.gender ?? '—'}`,
      `  Email   : ${opts.toEmail}`,
    ];
    if (opts.phone) lines.push(`  Phone   : ${opts.phone}`);
    lines.push(
      '',
      '── BOOKING DETAILS ──',
      `  Booking ID  : ${opts.bookingId}`,
      `  Property    : ${opts.propertyName}`,
      `  Room / Bed  : ${opts.roomType} — ${opts.roomNumber}`,
      `  Check-in    : ${opts.checkinDate}`,
      `  Check-out   : ${opts.checkoutDate}`,
      `  Guests      : ${opts.noOfGuests}`,
      '',
      '── THE ESSENTIALS ──',
      '  • Carry a valid government-issued photo ID',
      '  • Check-in time: 2:00 PM onwards',
      '  • Early check-in subject to availability',
      '  • Wi-Fi details shared at the property',
      `  • Manage your stay: ${b.websiteUrl}`,
      '',
      '─'.repeat(40),
      `From the ${b.brandName} Support Team`,
      b.supportEmail,
    );
    return lines.join('\n');
  }

  // ─── BOOKING SYNC FAILURE (post-payment, after all retries) ───────────────

  /**
   * Sent when a paid booking's room could NOT be finalized in the PMS after all
   * retries are exhausted (eZee down / out of inventory) and the message has
   * dead-lettered. The guest has paid but we couldn't confirm the room — this
   * reassures them their money is safe and the team will reach out (or refund).
   *
   * Works for anonymous bookings too (we always have the booker email). Callers
   * should treat sending as best-effort and not let a failure break their flow.
   */
  async sendBookingSyncFailedEmail(opts: {
    toEmail: string;
    firstName: string;
    bookingId: string;
    propertyName: string;
    propertyId?: string;
  }): Promise<void> {
    const branding = await this.getBranding(opts.propertyId);
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`[DEV] Booking sync-failed email to=${opts.toEmail} bookingId=${opts.bookingId}`);
      return;
    }
    const html = this.buildBookingSyncFailedHtml(opts, branding);
    const text = this.buildBookingSyncFailedText(opts, branding);

    const input: SendEmailCommandInput = {
      Source: `${branding.brandName} <${branding.fromAddress}>`,
      Destination: { ToAddresses: [opts.toEmail] },
      Message: {
        Subject: { Data: `We're sorting out your ${opts.propertyName} booking`, Charset: 'UTF-8' },
        Body: {
          Html: { Data: html, Charset: 'UTF-8' },
          Text: { Data: text, Charset: 'UTF-8' },
        },
      },
    };

    await this.getClient(branding.sesRegion).send(new SendEmailCommand(input));
    this.logger.log(
      `Booking sync-failed email sent to ${opts.toEmail} for ${opts.bookingId} (brand=${branding.brandName}, region=${branding.sesRegion})`,
    );
  }

  private static readonly SUPPORT_PHONE = '+91 99931 77238';

  private buildBookingSyncFailedHtml(
    opts: { firstName: string; bookingId: string; propertyName: string },
    b: Branding,
  ): string {
    const firstName = opts.firstName?.trim()?.split(' ')[0] || 'there';
    const phone = EmailService.SUPPORT_PHONE;
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${b.brandName}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">

      <table width="480" cellpadding="0" cellspacing="0" border="0"
             style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:480px;width:100%;">

        <tr>${this.logoBlock(b)}</tr>

        <tr><td style="padding:36px 36px 0;">

          <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111;">Hey ${firstName},</p>
          <p style="margin:0 0 20px;font-size:15px;color:#555;line-height:1.6;">
            We've received your payment in full — thank you. We hit a snag while
            confirming your room with the property, so your booking isn't fully
            confirmed yet.
          </p>
          <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
            Our team has been alerted and someone will reach out to you shortly to
            confirm your booking or arrange a full refund — you don't need to do
            anything. If you'd like to reach us sooner, <strong>call on
            ${phone}</strong>.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="background:${b.primaryColor}1A;border:1.5px solid ${b.primaryColor}40;border-radius:10px;margin-bottom:28px;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:${b.secondaryColor};letter-spacing:1.5px;text-transform:uppercase;opacity:0.65;">Booking reference</p>
              <p style="margin:0 0 10px;font-size:16px;font-weight:700;color:${b.secondaryColor};font-family:'Courier New',monospace;">${opts.bookingId}</p>
              <p style="margin:0;font-size:14px;color:#444;">Property: <strong>${opts.propertyName}</strong></p>
            </td></tr>
          </table>

          <hr style="border:none;border-top:1px solid #eee;margin:0 0 16px;" />
          <p style="margin:0 0 28px;font-size:13px;color:#aaa;line-height:1.55;">
            Your payment is safe. We're on it.
          </p>
        </td></tr>

        ${this.footerBlock(b)}

      </table>

    </td></tr>
  </table>

</body>
</html>`;
  }

  private buildBookingSyncFailedText(
    opts: { firstName: string; bookingId: string; propertyName: string },
    b: Branding,
  ): string {
    const firstName = opts.firstName?.trim()?.split(' ')[0] || 'there';
    return [
      `${b.brandName.toUpperCase()} — We're sorting out your booking`,
      '─'.repeat(40),
      '',
      `Hey ${firstName},`,
      '',
      "We've received your payment in full — thank you. We hit a snag while",
      "confirming your room with the property, so your booking isn't fully",
      'confirmed yet.',
      '',
      'Our team has been alerted and someone will reach out to you shortly to',
      'confirm your booking or arrange a full refund — you don\'t need to do',
      `anything. If you'd like to reach us sooner, call on ${EmailService.SUPPORT_PHONE}.`,
      '',
      '── BOOKING ──',
      `  Reference : ${opts.bookingId}`,
      `  Property  : ${opts.propertyName}`,
      '',
      'Your payment is safe. We\'re on it.',
      '',
      '─'.repeat(40),
      `From the ${b.brandName} Support Team`,
      b.supportEmail,
    ].join('\n');
  }

  // ─── CHECK-IN CONFIRMATION ────────────────────────────────────────────────

  async sendCheckinEmail(opts: {
    toEmail: string;
    firstName: string;
    passkeys: Array<{ key: string; roomNumber: string }>;
    lockerKeys?: Array<{ key: string; lockerLabel: string }>;
    propertyId?: string;
  }): Promise<void> {
    const branding = await this.getBranding(opts.propertyId);
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`[DEV] Check-in confirmation email to=${opts.toEmail} passkeys=${JSON.stringify(opts.passkeys)}`);
      return;
    }
    const html = this.buildCheckinHtml(opts, branding);
    const text = this.buildCheckinText(opts, branding);

    const input: SendEmailCommandInput = {
      Source: `${branding.brandName} <${branding.fromAddress}>`,
      Destination: { ToAddresses: [opts.toEmail] },
      Message: {
        Subject: { Data: `You're checked in — welcome to ${branding.brandName}`, Charset: 'UTF-8' },
        Body: {
          Html: { Data: html, Charset: 'UTF-8' },
          Text: { Data: text, Charset: 'UTF-8' },
        },
      },
    };

    await this.getClient(branding.sesRegion).send(new SendEmailCommand(input));
    this.logger.log(`Check-in confirmation email sent to ${opts.toEmail} (brand=${branding.brandName}, region=${branding.sesRegion})`);
  }

  private buildCheckinHtml(opts: {
    firstName: string;
    passkeys: Array<{ key: string; roomNumber: string }>;
    lockerKeys?: Array<{ key: string; lockerLabel: string }>;
  }, b: Branding): string {
    const passkeyRows = opts.passkeys
      .map(
        (p) => `<tr>
          <td style="padding:10px 0;">
            <span style="font-size:34px;font-weight:900;color:${b.primaryColor};
                         font-family:'Courier New',monospace;letter-spacing:6px;line-height:1;">${p.key}</span>
            <span style="font-size:15px;font-weight:600;color:#555;margin-left:14px;
                         font-family:'Segoe UI',Arial,sans-serif;">
              → Room ${p.roomNumber}
            </span>
          </td>
        </tr>`,
      )
      .join('');

    const lockerSection =
      opts.lockerKeys && opts.lockerKeys.length > 0
        ? `<p style="margin:0 0 10px;font-size:11px;font-weight:600;color:#999;letter-spacing:2px;text-transform:uppercase;">
            Locker Keys
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="background:#f9f9f9;border:1px solid #eee;border-radius:8px;margin-bottom:28px;">
            <tr><td style="padding:16px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${opts.lockerKeys
                  .map(
                    (lk, i) => `<tr>
                      <td style="${i > 0 ? 'border-top:1px solid #eee;' : ''}padding:8px 0;">
                        <span style="font-size:15px;font-weight:700;color:#333;font-family:'Courier New',monospace;">${lk.key}</span>
                        <span style="font-size:14px;color:#777;margin-left:12px;">→ ${lk.lockerLabel}</span>
                      </td>
                    </tr>`,
                  )
                  .join('')}
              </table>
            </td></tr>
          </table>`
        : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${b.brandName}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">

      <table width="480" cellpadding="0" cellspacing="0" border="0"
             style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:480px;width:100%;">

        <tr>${this.logoBlock(b)}</tr>

        <tr><td style="padding:36px 36px 0;">

          <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111;">Hey ${opts.firstName},</p>
          <p style="margin:0 0 28px;font-size:15px;color:#555;line-height:1.6;">
            Welcome to ${b.brandName}! Hope you have a wonderful stay with us.
          </p>

          <p style="margin:0 0 10px;font-size:11px;font-weight:600;color:#999;letter-spacing:2px;text-transform:uppercase;">
            Your Room Passkey${opts.passkeys.length > 1 ? 's' : ''}
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="background:#fff7e6;border:2.5px solid ${b.primaryColor};border-radius:8px;margin-bottom:28px;">
            <tr><td style="padding:20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${passkeyRows}
              </table>
            </td></tr>
          </table>

          ${lockerSection}

          <p style="margin:0 0 20px;font-size:15px;color:#555;line-height:1.6;">
            Need anything during your stay? Log in and request services anytime.
          </p>
          <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
            <tr><td style="background:${b.primaryColor};border-radius:8px;">
              <a href="${b.websiteUrl}"
                 style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:700;
                        color:${b.accentColor};text-decoration:none;font-family:'Segoe UI',Arial,sans-serif;">
                Go to ${b.brandName} →
              </a>
            </td></tr>
          </table>

          <hr style="border:none;border-top:1px solid #eee;margin:0 0 20px;" />
          <p style="margin:0;font-size:13px;color:#aaa;line-height:1.6;">
            Keep this email safe — your passkeys are confidential. Do not share them.
          </p>

        </td></tr>

        ${this.footerBlock(b)}

      </table>

    </td></tr>
  </table>

</body>
</html>`;
  }

  private buildCheckinText(opts: {
    firstName: string;
    passkeys: Array<{ key: string; roomNumber: string }>;
    lockerKeys?: Array<{ key: string; lockerLabel: string }>;
  }, b: Branding): string {
    const lines = [
      `${b.brandName.toUpperCase()} — You're Checked In!`,
      '─'.repeat(40),
      '',
      `Hey ${opts.firstName},`,
      '',
      `Welcome to ${b.brandName}! Hope you have a wonderful stay.`,
      '',
      '── YOUR ROOM PASSKEY/S ──',
    ];
    for (const p of opts.passkeys) {
      lines.push(`  ${p.key}  →  Room ${p.roomNumber}`);
    }
    if (opts.lockerKeys && opts.lockerKeys.length > 0) {
      lines.push('', '── LOCKER KEYS ──');
      for (const lk of opts.lockerKeys) {
        lines.push(`  ${lk.key}  →  ${lk.lockerLabel}`);
      }
    }
    lines.push(
      '',
      `Need anything? Log in at ${b.websiteUrl}`,
      '',
      'Keep this email safe — your passkeys are confidential.',
      '',
      '─'.repeat(40),
      `From the ${b.brandName} Support Team`,
      b.supportEmail,
    );
    return lines.join('\n');
  }
}
