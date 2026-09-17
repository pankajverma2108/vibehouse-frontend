import { Module } from '@nestjs/common';
import { AdminStaffController } from './admin-staff.controller';
import { AdminStaffService } from './admin-staff.service';
import { AdminStaffRolesModule } from '../staff-roles/admin-staff-roles.module';

@Module({
  imports: [AdminStaffRolesModule],
  controllers: [AdminStaffController],
  providers: [AdminStaffService],
})
export class AdminStaffModule {}
