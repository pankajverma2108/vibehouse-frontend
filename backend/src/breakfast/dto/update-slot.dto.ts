import { IsString, IsInt, Min, Max, IsOptional, IsBoolean, MaxLength } from 'class-validator';

/** Patch a slot (capacity, label, times, active). `is_active:false` retires the slot. */
export class UpdateSlotDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  label?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1439)
  start_min?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1439)
  end_min?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  capacity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
