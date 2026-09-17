import { BadRequestException } from '@nestjs/common';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

/**
 * Shared query shape for every /admin/dashboard/* endpoint.
 *
 * Date semantics: both `from` and `to` are inclusive at day granularity, applied
 * against `created_at`. Defaults: last 30 days through today (resolved in the
 * service, not the DTO — the DTO only validates what came in).
 *
 * Mutual exclusivity: `property_id` and `brand` cannot be combined. Either pick
 * a single property or scope to a brand; specifying both makes no sense and
 * throwing early gives the caller a clearer error.
 */
export class DashboardQueryDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'from must be YYYY-MM-DD' })
  from?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'to must be YYYY-MM-DD' })
  to?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]+$/, { message: 'property_id must be the numeric eZee hotel code' })
  property_id?: string;

  @IsOptional()
  @IsIn(['TDS', 'BUTEAK'])
  brand?: 'TDS' | 'BUTEAK';
}

/**
 * Helper used by both the controller and service to enforce mutual exclusivity
 * between `property_id` and `brand`. Throws a 400 if both are present.
 */
export function ensureSingleScopeAxis(query: DashboardQueryDto): void {
  if (query.property_id && query.brand) {
    throw new BadRequestException(
      'property_id and brand are mutually exclusive — pass one or neither',
    );
  }
}
