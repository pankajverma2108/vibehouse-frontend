import {
  IsString,
  IsOptional,
  IsIn,
  IsBoolean,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';

/** Patch a menu item. `is_active:false` is the "remove" (soft-delete) path. */
export class UpdateMenuItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['MAIN', 'ADDON', 'BEVERAGE'])
  category?: string;

  @IsOptional()
  @IsBoolean()
  is_veg?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  forecast_key?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
