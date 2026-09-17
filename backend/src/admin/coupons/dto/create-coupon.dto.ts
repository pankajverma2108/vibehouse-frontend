import {
  IsString,
  IsOptional,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsArray,
  IsDateString,
  Min,
  Max,
  MaxLength,
  Matches,
  ArrayMinSize,
  ValidateIf,
} from 'class-validator';

export class CreateCouponDto {
  /**
   * STAY_LENGTH and NEW_GUEST auto-apply (no code).
   * ONE_TIME_CODE is redeemed by the guest entering a code at checkout.
   */
  @IsIn(['STAY_LENGTH', 'ONE_TIME_CODE', 'NEW_GUEST'])
  type: 'STAY_LENGTH' | 'ONE_TIME_CODE' | 'NEW_GUEST';

  /** Required for ONE_TIME_CODE, forbidden for the other two. */
  @ValidateIf((o) => o.type === 'ONE_TIME_CODE')
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Z0-9_-]+$/, { message: 'code must be uppercase alphanumeric (- and _ allowed)' })
  code?: string;

  /**
   * Guest-facing display title. REQUIRED for auto coupons (STAY_LENGTH,
   * NEW_GUEST) — that's the card title the guest sees (e.g. "WELCOME").
   * Optional for ONE_TIME_CODE (the FE uses `code` as the title there).
   */
  @ValidateIf((o) => o.type !== 'ONE_TIME_CODE')
  @IsString()
  @MaxLength(60)
  name?: string;

  /** Short guest-facing one-liner shown under the title (all types). */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsIn(['PERCENT', 'FLAT'])
  discount_type: 'PERCENT' | 'FLAT';

  /** For PERCENT: 1-100. For FLAT: positive rupees. */
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  discount_value: number;

  /** Cap on a PERCENT discount (₹). Ignored for FLAT. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  max_discount_amount?: number;

  /** Required for STAY_LENGTH (e.g., 3 = 3+ nights). */
  @ValidateIf((o) => o.type === 'STAY_LENGTH')
  @IsInt()
  @Min(1)
  min_stay_nights?: number;

  /** Minimum pre-discount subtotal (₹) required for this coupon to apply. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  min_booking_amount?: number;

  /** 0 = unlimited. Default = 1 (single-use per guest). */
  @IsOptional()
  @IsInt()
  @Min(0)
  max_uses_per_guest?: number;

  /** Hard cap on total redemptions across all guests. Omit for unlimited. */
  @IsOptional()
  @IsInt()
  @Min(1)
  max_total_uses?: number;

  /**
   * Either supply `property_ids` (subset of actor.property_ids) OR set
   * `applies_to_all_properties=true`. Owner-level admins can do "all";
   * others must enumerate.
   */
  @IsOptional()
  @IsBoolean()
  applies_to_all_properties?: boolean;

  @ValidateIf((o) => !o.applies_to_all_properties)
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @Matches(/^[0-9]+$/, { each: true, message: 'property_ids entries must be numeric eZee hotel codes' })
  property_ids?: string[];

  @IsOptional()
  @IsDateString()
  valid_from?: string;

  @IsOptional()
  @IsDateString()
  valid_until?: string;

  /** Internal description shown to admins, not to guests. */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  admin_note?: string;

  /**
   * Invite-only flag. When true the coupon is suppressed from the customer-
   * facing "available coupons" listing — admins still see it, and typing the
   * code at checkout still applies it. Use this for one-off VIP / partner
   * coupons that shouldn't be advertised publicly.
   *
   * Defaults to false. Independent of `is_active` (which disables redemption
   * entirely).
   */
  @IsOptional()
  @IsBoolean()
  is_hidden?: boolean;
}
