import { Module } from '@nestjs/common';
import {
  AdminSlaConfigController,
  AdminEscalationLevelsController,
} from './admin-sla-config.controller';
import { AdminSlaConfigService } from './admin-sla-config.service';
import { AdminStaffRolesModule } from '../staff-roles/admin-staff-roles.module';

@Module({
  imports: [AdminStaffRolesModule],
  controllers: [AdminSlaConfigController, AdminEscalationLevelsController],
  providers: [AdminSlaConfigService],
})
export class AdminSlaConfigModule {}
