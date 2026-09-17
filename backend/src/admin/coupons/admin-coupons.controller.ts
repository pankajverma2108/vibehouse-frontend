import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminCouponsService } from './admin-coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ListCouponsQueryDto } from './dto/list-coupons-query.dto';
import { AdminJwtGuard } from '../../common/guards/admin-jwt.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import type { AdminJwtPayload } from '../../common/guards/admin-jwt.strategy';

@Controller('admin/coupons')
@UseGuards(AdminJwtGuard, PermissionsGuard)
export class AdminCouponsController {
  constructor(private readonly couponsService: AdminCouponsService) {}

  @Post()
  @RequirePermission('coupons.edit')
  create(@Body() dto: CreateCouponDto, @CurrentAdmin() actor: AdminJwtPayload) {
    return this.couponsService.create(dto, actor);
  }

  @Get()
  @RequirePermission('coupons.view')
  list(@Query() query: ListCouponsQueryDto, @CurrentAdmin() actor: AdminJwtPayload) {
    return this.couponsService.list(query, actor);
  }

  @Get(':id')
  @RequirePermission('coupons.view')
  get(@Param('id') id: string, @CurrentAdmin() actor: AdminJwtPayload) {
    return this.couponsService.get(id, actor);
  }

  @Patch(':id')
  @RequirePermission('coupons.edit')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCouponDto,
    @CurrentAdmin() actor: AdminJwtPayload,
  ) {
    return this.couponsService.update(id, dto, actor);
  }

  @Patch(':id/activate')
  @RequirePermission('coupons.edit')
  activate(@Param('id') id: string, @CurrentAdmin() actor: AdminJwtPayload) {
    return this.couponsService.setActive(id, true, actor);
  }

  @Patch(':id/deactivate')
  @RequirePermission('coupons.edit')
  deactivate(@Param('id') id: string, @CurrentAdmin() actor: AdminJwtPayload) {
    return this.couponsService.setActive(id, false, actor);
  }

  /**
   * PATCH /admin/coupons/:id/hide
   * Suppress the coupon from the customer-facing "available coupons" listing.
   * Typed-code redemption still works — this is invite-only visibility, not
   * a disable. Use /deactivate to disable entirely.
   */
  @Patch(':id/hide')
  @RequirePermission('coupons.edit')
  hide(@Param('id') id: string, @CurrentAdmin() actor: AdminJwtPayload) {
    return this.couponsService.setHidden(id, true, actor);
  }

  /**
   * PATCH /admin/coupons/:id/show
   * Surface the coupon on the customer-facing listing again.
   */
  @Patch(':id/show')
  @RequirePermission('coupons.edit')
  show(@Param('id') id: string, @CurrentAdmin() actor: AdminJwtPayload) {
    return this.couponsService.setHidden(id, false, actor);
  }

  @Delete(':id')
  @RequirePermission('coupons.edit')
  delete(@Param('id') id: string, @CurrentAdmin() actor: AdminJwtPayload) {
    return this.couponsService.delete(id, actor);
  }

  @Get(':id/redemptions')
  @RequirePermission('coupons.view')
  listRedemptions(
    @Param('id') id: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @CurrentAdmin() actor: AdminJwtPayload,
  ) {
    return this.couponsService.listRedemptions(
      id,
      parseInt(page, 10),
      Math.min(parseInt(limit, 10), 200),
      actor,
    );
  }
}
