import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsInt,
  IsArray,
  IsDateString,
  Min,
  MaxLength,
  ArrayMinSize,
  Matches,
} from 'class-validator';

/**
 * Fields that admins can change after creation. NOT included (immutable after create):
 *   - type (a coupon's nature can't change)
 *   - code (creating a new code coupon is the correct path)
 *   - created_by, created_at
 *
 * To toggle active state, use /admin/coupons/:id/activate or /deactivate.
 */
export class UpdateCouponDto {
  /** Guest-facing display title. For auto coupons this can't be cleared to null. */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string;

  /** Short guest-facing one-liner. Pass null to clear. */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  // 'PERCENT' | 'FLAT'
  discount_type?: 'PERCENT' | 'FLAT';

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  discount_value?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  max_discount_amount?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  min_stay_nights?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  min_booking_amount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  max_uses_per_guest?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  max_total_uses?: number | null;

  @IsOptional()
  @IsBoolean()
  applies_to_all_properties?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @Matches(/^[0-9]+$/, { each: true, message: 'property_ids entries must be numeric eZee hotel codes' })
  property_ids?: string[];

  @IsOptional()
  @IsDateString()
  valid_from?: string | null;

  @IsOptional()
  @IsDateString()
  valid_until?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  admin_note?: string | null;

  /**
   * Suppresses the coupon from the customer-facing "available coupons"
   * listing. Independent of `is_active`. To toggle without sending the
   * whole update, use PATCH /admin/coupons/:id/hide or /:id/show.
   */
  @IsOptional()
  @IsBoolean()
  is_hidden?: boolean;
}
