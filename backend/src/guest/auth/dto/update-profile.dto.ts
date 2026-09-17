import {
  IsOptional,
  IsString,
  IsNotEmpty,
  MaxLength,
  Matches,
} from 'class-validator';

/**
 * Authenticated guest self-service profile update.
 *
 * Shared across TDS + Buteak guest auth (`PATCH /guest/auth/me`). Only the
 * fields the guest is allowed to edit are here — email is deliberately NOT
 * writable (support-managed; changing it would orphan the unique login key and
 * the OTA auto-link key). Every field is optional: send only what changed.
 *
 *  - name           single canonical legal name (FE concatenates first/middle/last)
 *  - phone          E.164-ish India mobile; write allowed WITHOUT OTP, but
 *                   changing it resets phone_verified -> false
 *  - date_of_birth  ISO date YYYY-MM-DD
 */
export class UpdateGuestProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'name cannot be empty' })
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message:
      'phone must be 10-15 digits, optionally prefixed with + (e.g. +919876543210)',
  })
  phone?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date_of_birth must be in YYYY-MM-DD format',
  })
  date_of_birth?: string;
}
