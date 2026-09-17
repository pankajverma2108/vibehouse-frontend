import {
  IsIn,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  Max,
  MaxLength,
  ArrayMaxSize,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsString()
  menu_item_id: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  qty?: number;
}

/**
 * One PLATE = one adult's breakfast: a delivery slot + that adult's dishes (+ an optional
 * note). The number of plates in a room is capped server-side by the room's eZee adult count.
 */
export class PlateDto {
  @IsString()
  slot_id: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  special_requests?: string;
}

/**
 * One room within the booking. `ezee_reservation_id` must be one of the booker's own
 * CHECKED_IN rooms (validated server-side against the booker_phone sibling set).
 * action=ORDER needs 1..cap plates; action=SKIP (or an empty plates list) clears the room.
 */
export class RoomOrderDto {
  @IsString()
  ezee_reservation_id: string;

  @IsOptional()
  @IsIn(['ORDER', 'SKIP'])
  action?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => PlateDto)
  plates?: PlateDto[];
}

/**
 * Cx order submission for the current service_date (resolved server-side). Carries one or
 * more of the booker's rooms; the FE may submit a single room at a time (array of one) or
 * the whole booking at once. Each room holds its own plates.
 */
export class SubmitBreakfastOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => RoomOrderDto)
  rooms: RoomOrderDto[];
}
