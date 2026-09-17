import { Module } from '@nestjs/common';
import { AdminStaffRolesController } from './admin-staff-roles.controller';
import { AdminStaffRolesService } from './admin-staff-roles.service';

@Module({
  controllers: [AdminStaffRolesController],
  providers: [AdminStaffRolesService],
  exports: [AdminStaffRolesService], // consumed by staff + sla-config for role validation
})
export class AdminStaffRolesModule {}
