import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsIn,
  IsBoolean,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';

/** Add a breakfast menu item to a property's catalog (no stock/inventory). */
export class CreateMenuItemDto {
  @IsNotEmpty()
  @IsString()
  property_id: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['MAIN', 'ADDON', 'BEVERAGE'])
  category?: string;

  @IsOptional()
  @IsBoolean()
  is_veg?: boolean;

  /** Kitchen-forecast label this item rolls up under (e.g. "Idli"). Defaults to name. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  forecast_key?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;
}
