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
import { AdminStaffService } from './admin-staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { AdminJwtGuard } from '../../common/guards/admin-jwt.guard';

/**
 * /admin/staff — manage the ticketing staff roster.
 *
 * Guarded by AdminJwtGuard (any authenticated admin) for Phase 1; a finer
 * `staff.manage` permission can be added once seeded into admin_roles.
 */
@Controller('admin/staff')
@UseGuards(AdminJwtGuard)
export class AdminStaffController {
  constructor(private readonly staff: AdminStaffService) {}

  @Get()
  list(
    @Query('property_id') propertyId?: string,
    @Query('include_inactive') includeInactive?: string,
  ) {
    return this.staff.list(propertyId, includeInactive === 'true');
  }

  @Post()
  create(@Body() dto: CreateStaffDto) {
    return this.staff.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateStaffDto) {
    return this.staff.update(id, dto);
  }

  @Patch(':id/availability')
  setAvailability(@Param('id') id: string, @Body('is_available') isAvailable: boolean) {
    return this.staff.setAvailability(id, isAvailable);
  }

  @Delete(':id')
  deactivate(@Param('id') id: string) {
    return this.staff.deactivate(id);
  }

  /** Undo a Remove — put a deactivated staff member back on the roster (off shift). */
  @Patch(':id/restore')
  restore(@Param('id') id: string) {
    return this.staff.restore(id);
  }

  /** What a hard delete would do (live vs historic tickets, who we could reassign to). */
  @Get(':id/deletion-preflight')
  deletionPreflight(@Param('id') id: string) {
    return this.staff.deletionPreflight(id);
  }

  /**
   * Permanent delete. Finished tickets keep their assignee name (`assigned_staff_name`)
   * and are detached; live tickets must be moved via `?reassign_to=<staff_id>` or the
   * call is rejected.
   */
  @Delete(':id/hard')
  hardDelete(@Param('id') id: string, @Query('reassign_to') reassignTo?: string) {
    return this.staff.hardDelete(id, reassignTo);
  }
}
