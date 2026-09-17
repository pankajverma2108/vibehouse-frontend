import { IsNumber, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePropertyTaxDto {
  /**
   * Percent rate (0–100). Stored to 2 decimals; e.g. 5 for 5%, 12.5 for
   * 12.5%. Future-proof for non-integer GST slabs.
   */
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  tax_rate_pct!: number;
}
