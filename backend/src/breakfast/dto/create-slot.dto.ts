import {
  IsNotEmpty,
  IsString,
  IsInt,
  Min,
  Max,
  IsOptional,
  MaxLength,
} from 'class-validator';

/**
 * Create a delivery-slot definition (recurs daily). `start_min`/`end_min` are minutes
 * from midnight IST (7:30 AM = 450, 8:00 AM = 480). `capacity` defaults to the env
 * BREAKFAST_DEFAULT_SLOT_CAPACITY when omitted.
 */
export class CreateSlotDto {
  @IsNotEmpty()
  @IsString()
  property_id: string;

  @IsInt()
  @Min(1)
  slot_number: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  label: string;

  @IsInt()
  @Min(0)
  @Max(1439)
  start_min: number;

  @IsInt()
  @Min(0)
  @Max(1439)
  end_min: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  capacity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;
}
