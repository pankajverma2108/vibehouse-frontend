import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsArray,
  IsOptional,
  IsBoolean,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RoomSelectionDto, AddonSelectionDto } from './create-booking-order.dto';

export class PreviewCouponDto {
  @IsString()
  @IsNotEmpty()
  property_id: string;

  @IsDateString()
  checkin_date: string;

  @IsDateString()
  checkout_date: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoomSelectionDto)
  rooms: RoomSelectionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddonSelectionDto)
  addons?: AddonSelectionDto[];

  @IsOptional()
  @IsString()
  @MaxLength(50)
  coupon_code?: string;

  /** When true, skip auto coupons — preview only the typed code (if any). */
  @IsOptional()
  @IsBoolean()
  skip_auto_coupon?: boolean;
}
