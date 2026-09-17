import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AdminDashboardService } from './admin-dashboard.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { BreakdownQueryDto, RevenueQueryDto } from './dto/revenue-query.dto';
import { CouponsWidgetQueryDto, ListPaymentsQueryDto } from './dto/payments-query.dto';
import { AdminJwtGuard } from '../../common/guards/admin-jwt.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import type { AdminJwtPayload } from '../../common/guards/admin-jwt.strategy';

@Controller('admin/dashboard')
@UseGuards(AdminJwtGuard, PermissionsGuard)
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  /**
   * Top-line dashboard tiles in one call. See plan at
   * C:\Users\Build91 Admin\.claude\plans\reactive-popping-kernighan.md for
   * the full endpoint catalogue and tile definitions.
   */
  @Get('summary')
  @RequirePermission('dashboard.view')
  summary(@Query() query: DashboardQueryDto, @CurrentAdmin() actor: AdminJwtPayload) {
    return this.dashboardService.summary(query, actor);
  }

  /**
   * Captured-revenue time series, bucketed by day / week / month.
   * `?groupBy=purpose` pivots each bucket into per-purpose columns
   * (BOOKING / ADDON_UPSELL / STAY_EXTENSION) for stacked charts.
   */
  @Get('revenue')
  @RequirePermission('dashboard.view')
  revenue(@Query() query: RevenueQueryDto, @CurrentAdmin() actor: AdminJwtPayload) {
    return this.dashboardService.revenue(query, actor);
  }

  /**
   * Breakdown of captured revenue + count by one of:
   *   - property: ranked by revenue, labelled with property name
   *   - brand:    grouped by TDS / BUTEAK
   *   - purpose:  BOOKING / ADDON_UPSELL / STAY_EXTENSION
   */
  @Get('breakdown')
  @RequirePermission('dashboard.view')
  breakdown(@Query() query: BreakdownQueryDto, @CurrentAdmin() actor: AdminJwtPayload) {
    return this.dashboardService.breakdown(query, actor);
  }

  /**
   * Coupon analytics — top N coupons by discount given in the window plus
   * per-type totals (STAY_LENGTH / ONE_TIME_CODE / NEW_GUEST).
   */
  @Get('coupons')
  @RequirePermission('dashboard.view')
  coupons(@Query() query: CouponsWidgetQueryDto, @CurrentAdmin() actor: AdminJwtPayload) {
    return this.dashboardService.couponsWidget(query, actor);
  }

  /**
   * Paginated, filterable payments list. Drill-down from any tile. Filters
   * via query: status, purpose, property/brand, date range, search (matches
   * razorpay_order_id, razorpay_payment_id, or guest email).
   */
  @Get('payments')
  @RequirePermission('dashboard.view')
  paymentsList(@Query() query: ListPaymentsQueryDto, @CurrentAdmin() actor: AdminJwtPayload) {
    return this.dashboardService.paymentsList(query, actor);
  }

  /**
   * Single-payment detail — joined booking, addon order if any, coupon
   * redemptions. Scope-checked after fetch so we don't leak existence.
   */
  @Get('payments/:id')
  @RequirePermission('dashboard.view')
  paymentDetail(@Param('id') id: string, @CurrentAdmin() actor: AdminJwtPayload) {
    return this.dashboardService.paymentDetail(id, actor);
  }
}
