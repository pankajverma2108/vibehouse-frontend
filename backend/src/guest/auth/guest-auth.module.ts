import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { GuestAuthService } from './guest-auth.service';
import { GuestAuthController } from './guest-auth.controller';
import { GuestJwtStrategy } from '../../common/guards/guest-jwt.strategy';
import { GoogleStrategy } from './google.strategy';
import { getJwtSecret } from '../../common/env.util';

@Module({
  imports: [
    PassportModule.register({ session: false }),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: getJwtSecret(),
        signOptions: { expiresIn: '7d', algorithm: 'HS256' },
      }),
    }),
  ],
  providers: [GuestAuthService, GuestJwtStrategy, GoogleStrategy],
  controllers: [GuestAuthController],
  exports: [GuestAuthService],
})
export class GuestAuthModule {}
