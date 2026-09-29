import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';

export interface GoogleOAuthUser {
  google_id: string;
  email: string;
  name: string;
  profile_photo_url: string | null;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor() {
    const clientID =
      process.env.GOOGLE_OAUTH_CLIENT_ID ||
      process.env.GOOGLE_CLIENT_ID ||
      'mock-google-client-id';
    const clientSecret =
      process.env.GOOGLE_OAUTH_CLIENT_SECRET ||
      process.env.GOOGLE_CLIENT_SECRET ||
      'mock-google-client-secret';
    const callbackURL =
      process.env.GOOGLE_OAUTH_CALLBACK_URL ||
      process.env.GOOGLE_CALLBACK_URL ||
      'http://localhost:8000/guest/auth/google/callback';

    super({
      clientID: clientID!,
      clientSecret: clientSecret!,
      callbackURL,
      scope: ['openid', 'email', 'profile'],
    });

    // Log env var status at startup (values masked for security)
    const log = new Logger(GoogleStrategy.name);
    const isMock = !clientID || clientID === 'mock-google-client-id';
    log.log(`Google OAuth config:`);
    log.log(`  clientID:     ${isMock ? '⚠️  MOCK / MISSING (Real OAuth will fail with Error 401: invalid_client)' : clientID.substring(0, 12) + '...'}`);
    log.log(`  clientSecret: ${clientSecret && clientSecret !== 'mock-google-client-secret' ? '***SET***' : '⚠️  MOCK / MISSING'}`);
    log.log(`  callbackURL:  ${callbackURL}`);
    if (isMock) {
      log.warn(`Google OAuth is not configured with a valid client ID. Check GOOGLE_OAUTH_CLIENT_ID in .env.`);
    }
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    this.logger.log(`Google OAuth validate() called for: ${profile.displayName ?? profile.id}`);

    const email = profile.emails?.[0]?.value ?? null;
    const photo = profile.photos?.[0]?.value ?? null;

    const user: GoogleOAuthUser = {
      google_id: profile.id,
      email: email ?? '',
      name: profile.displayName || email || 'Guest',
      profile_photo_url: photo,
    };

    done(null, user);
  }
}
