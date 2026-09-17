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
import { AdminStaffRolesService } from './admin-staff-roles.service';
import { CreateStaffRoleDto } from './dto/create-staff-role.dto';
import { UpdateStaffRoleDto } from './dto/update-staff-role.dto';
import { AdminJwtGuard } from '../../common/guards/admin-jwt.guard';

/**
 * /admin/staff-roles — brand-wide catalog of staff role types.
 *
 * Feeds the role dropdowns on the staff form and the escalation-ladder editor.
 * Guarded by AdminJwtGuard (any authenticated admin) for parity with /admin/staff;
 * a finer `staff.manage` permission can be layered on later.
 */
@Controller('admin/staff-roles')
@UseGuards(AdminJwtGuard)
export class AdminStaffRolesController {
  constructor(private readonly roles: AdminStaffRolesService) {}

  @Get()
  list(@Query('include_inactive') includeInactive?: string) {
    return this.roles.list(includeInactive === 'true');
  }

  @Post()
  create(@Body() dto: CreateStaffRoleDto) {
    return this.roles.create(dto);
  }

  @Patch(':name')
  update(@Param('name') name: string, @Body() dto: UpdateStaffRoleDto) {
    return this.roles.update(name, dto);
  }

  @Delete(':name')
  deactivate(@Param('name') name: string) {
    return this.roles.deactivate(name);
  }
}
