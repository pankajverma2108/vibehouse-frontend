import { IsIn, IsOptional } from 'class-validator';
import { DashboardQueryDto } from './dashboard-query.dto';

export class RevenueQueryDto extends DashboardQueryDto {
  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  granularity?: 'day' | 'week' | 'month';

  /** When set to 'purpose', each bucket pivots into BOOKING/ADDON/EXTENSION columns. */
  @IsOptional()
  @IsIn(['purpose'])
  groupBy?: 'purpose';
}

export class BreakdownQueryDto extends DashboardQueryDto {
  @IsIn(['property', 'brand', 'purpose'])
  by!: 'property' | 'brand' | 'purpose';
}
