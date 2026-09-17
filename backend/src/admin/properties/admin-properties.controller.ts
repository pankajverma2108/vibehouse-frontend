import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../../common/guards/admin-jwt.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import type { AdminJwtPayload } from '../../common/guards/admin-jwt.strategy';
import { AdminPropertiesService } from './admin-properties.service';
import { UpdatePropertyTaxDto } from './dto/update-property-tax.dto';

@Controller('admin/properties')
@UseGuards(AdminJwtGuard, PermissionsGuard)
export class AdminPropertiesController {
  constructor(private readonly service: AdminPropertiesService) {}

  @Get()
  list(@CurrentAdmin() admin: AdminJwtPayload) {
    return this.service.listForAdmin(admin);
  }

  @Get(':id')
  get(@CurrentAdmin() admin: AdminJwtPayload, @Param('id') id: string) {
    return this.service.getForAdmin(admin, id);
  }

  /**
   * Returns the property's current tax_rate_pct. Any admin scoped on the
   * property can read.
   */
  @Get(':id/tax')
  getTax(@CurrentAdmin() admin: AdminJwtPayload, @Param('id') id: string) {
    return this.service.getTax(admin, id);
  }

  /**
   * Updates the per-property tax rate. Affects every NEW booking order
   * created after this call — existing orders keep the rate snapshot they
   * captured at creation time (see ezee_booking_cache.tax_rate_pct).
   * Requires admin.manage so only owners/managers can shift pricing.
   */
  @Patch(':id/tax')
  @RequirePermission('admin.manage')
  updateTax(
    @CurrentAdmin() admin: AdminJwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdatePropertyTaxDto,
  ) {
    return this.service.updateTax(admin, id, dto);
  }
}
