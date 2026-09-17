import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AdminSlaConfigService } from './admin-sla-config.service';
import { CreateSlaConfigDto } from './dto/create-sla-config.dto';
import { UpdateSlaConfigDto } from './dto/update-sla-config.dto';
import { UpsertEscalationLevelDto } from './dto/upsert-escalation-level.dto';
import { AdminJwtGuard } from '../../common/guards/admin-jwt.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import type { AdminJwtPayload } from '../../common/guards/admin-jwt.strategy';

/**
 * Admin SLA-timing config (was seed-only). Global: a change applies to every
 * property. Guarded by the existing `sla.config` permission (held by OWNER,
 * MANAGER, and the new TECH_OPS role).
 */
@Controller('admin/sla-config')
@UseGuards(AdminJwtGuard, PermissionsGuard)
export class AdminSlaConfigController {
  constructor(private readonly service: AdminSlaConfigService) {}

  @Get()
  @RequirePermission('sla.config')
  list() {
    return this.service.listSlaConfig();
  }

  @Post()
  @RequirePermission('sla.config')
  create(@Body() dto: CreateSlaConfigDto) {
    return this.service.createSlaConfig(dto);
  }

  @Patch(':taskCategory')
  @RequirePermission('sla.config')
  update(
    @Param('taskCategory') taskCategory: string,
    @Body() dto: UpdateSlaConfigDto,
  ) {
    return this.service.updateSlaConfig(taskCategory, dto);
  }

  @Delete(':taskCategory')
  @RequirePermission('sla.config')
  remove(@Param('taskCategory') taskCategory: string) {
    return this.service.deleteSlaConfig(taskCategory);
  }
}

/**
 * Admin escalation-ladder config (level → role) — **per hotel (property)**. Each
 * hotel has its own ladder; a change targets only that hotel. The admin must be
 * authorised on the property. (SLA timings above stay global; the ladder is per-hotel.)
 */
@Controller('admin/escalation-levels')
@UseGuards(AdminJwtGuard, PermissionsGuard)
export class AdminEscalationLevelsController {
  constructor(private readonly service: AdminSlaConfigService) {}

  @Get(':propertyId')
  @RequirePermission('sla.config')
  list(@Param('propertyId') propertyId: string, @CurrentAdmin() actor: AdminJwtPayload) {
    return this.service.listEscalationLevels(propertyId, actor);
  }

  @Patch(':propertyId/:level')
  @RequirePermission('sla.config')
  upsert(
    @Param('propertyId') propertyId: string,
    @Param('level', ParseIntPipe) level: number,
    @Body() dto: UpsertEscalationLevelDto,
    @CurrentAdmin() actor: AdminJwtPayload,
  ) {
    return this.service.upsertEscalationLevel(propertyId, level, dto, actor);
  }

  @Delete(':propertyId/:level')
  @RequirePermission('sla.config')
  remove(
    @Param('propertyId') propertyId: string,
    @Param('level', ParseIntPipe) level: number,
    @CurrentAdmin() actor: AdminJwtPayload,
  ) {
    return this.service.deleteEscalationLevel(propertyId, level, actor);
  }
}
