import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminRoomTypesService } from './admin-room-types.service';
import { UpdateColivePriceDto } from './dto/update-colive-price.dto';
import { AdminJwtGuard } from '../../common/guards/admin-jwt.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import type { AdminJwtPayload } from '../../common/guards/admin-jwt.strategy';

@Controller('admin/room-types')
@UseGuards(AdminJwtGuard, PermissionsGuard)
export class AdminRoomTypesController {
  constructor(private readonly roomTypesService: AdminRoomTypesService) {}

  @Get()
  @RequirePermission('colive.price_manage')
  listRoomTypes(
    @CurrentAdmin() actor: AdminJwtPayload,
    @Query('property_id') propertyId?: string,
  ) {
    const effective = propertyId ?? actor.property_id;
    if (!actor.property_ids.includes(effective)) {
      throw new ForbiddenException('You are not authorised for this property');
    }
    return this.roomTypesService.listRoomTypes(effective);
  }

  @Patch(':id/colive-price')
  @RequirePermission('colive.price_manage')
  updateColivePrice(
    @Param('id') id: string,
    @Body() dto: UpdateColivePriceDto,
    @CurrentAdmin() actor: AdminJwtPayload,
  ) {
    return this.roomTypesService.updateColivePrice(id, dto, actor);
  }
}
