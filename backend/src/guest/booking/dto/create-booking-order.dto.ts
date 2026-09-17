import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  IsOptional,
  IsIn,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GuestDetailDto {
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @IsString()
  @IsNotEmpty()
  last_name: string;

  @IsOptional()
  @IsIn(['Male', 'Female', 'Other'])
  gender?: string;
}

export class RoomSelectionDto {
  @IsString()
  @IsNotEmpty()
  room_type_id: string;

  @IsInt()
  @Min(1)
  quantity: number; // number of beds (dorm) or rooms (private)

  /**
   * Per-bed guest details. Length must equal quantity.
   * If omitted, the booker's name is used for all beds.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuestDetailDto)
  guests?: GuestDetailDto[];
}

export class AddonSelectionDto {
  @IsString()
  @IsNotEmpty()
  product_id: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class OccupancyDto {
  // Each booked room needs at least one adult (eZee InsertBooking requires
  // number_adults >= 1 per Room_N). Cross-field "adults >= rooms.length"
  // is enforced server-side because the rooms array isn't in scope here.
  @IsInt()
  @Min(1)
  adults: number;

  @IsInt()
  @Min(0)
  children: number;
}

export class CreateBookingOrderDto {
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

  /**
   * Optional coupon code typed by the guest. Validated server-side via
   * CouponsService.findApplicableForBooking. An invalid code is a soft error
   * (returned in `coupon_errors`) and does not block create-order.
   */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  coupon_code?: string;

  /**
   * When true, the guest has opted out of the auto-applied coupon (e.g. to
   * use a better code they hold). The booking flow skips STAY_LENGTH /
   * NEW_GUEST evaluation; only a typed `coupon_code` (if any) applies.
   */
  @IsOptional()
  @IsBoolean()
  skip_auto_coupon?: boolean;

  /**
   * Aggregate adults + children for the whole booking. Backend distributes
   * across rooms when sending to eZee InsertBooking. Optional for
   * backwards-compat: if omitted, backend assumes 1 adult per room and 0
   * children (the legacy behaviour). BUTEAK FE sends this from the search
   * card; TDS FE may opt in later.
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => OccupancyDto)
  occupancy?: OccupancyDto;
}
