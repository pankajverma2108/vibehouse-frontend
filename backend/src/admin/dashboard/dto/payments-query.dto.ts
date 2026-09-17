import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { DashboardQueryDto } from './dashboard-query.dto';

/**
 * Query for the paginated payments list. Inherits date + scope filters from
 * DashboardQueryDto and adds status/purpose/search/pagination — search hits
 * `razorpay_order_id`, `razorpay_payment_id`, and the linked guest's email.
 */
export class ListPaymentsQueryDto extends DashboardQueryDto {
  @IsOptional()
  @IsIn(['CAPTURED', 'PENDING', 'FAILED'])
  status?: 'CAPTURED' | 'PENDING' | 'FAILED';

  @IsOptional()
  @IsIn(['BOOKING', 'ADDON_UPSELL', 'STAY_EXTENSION'])
  purpose?: 'BOOKING' | 'ADDON_UPSELL' | 'STAY_EXTENSION';

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === '' ? undefined : parseInt(value, 10),
  )
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === '' ? undefined : parseInt(value, 10),
  )
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

/** Top-coupons widget: just a limit on how many ranked coupons to return. */
export class CouponsWidgetQueryDto extends DashboardQueryDto {
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === '' ? undefined : parseInt(value, 10),
  )
  @IsInt()
  @Min(1)
  @Max(50)
  top?: number;
}
