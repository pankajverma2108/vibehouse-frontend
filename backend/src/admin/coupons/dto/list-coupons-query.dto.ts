import { IsOptional, IsString, IsIn, IsInt, Min, Max, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class ListCouponsQueryDto {
  @IsOptional()
  @IsIn(['STAY_LENGTH', 'ONE_TIME_CODE', 'NEW_GUEST'])
  type?: 'STAY_LENGTH' | 'ONE_TIME_CODE' | 'NEW_GUEST';

  /** Pass `true` / `false` as a string in the query param. */
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  is_active?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]+$/, { message: 'property_id must be the numeric eZee hotel code' })
  property_id?: string;

  /** Matches code (exact, case-insensitive) or admin_note (substring). */
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null || value === '' ? undefined : parseInt(value, 10)))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null || value === '' ? undefined : parseInt(value, 10)))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
