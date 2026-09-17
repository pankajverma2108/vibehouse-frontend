import { Module } from '@nestjs/common';
import { BreakfastService } from './breakfast.service';
import { BreakfastInviteService } from './breakfast-invite.service';
import { BreakfastController } from './breakfast.controller';
import { AdminBreakfastController } from './admin-breakfast.controller';

/**
 * Breakfast pre-ordering (BRD docs/plans/breakfast_brd.md, Phase 1). Hosts BOTH the
 * public token-protected Cx ordering page (`/public/breakfast/*`) and the admin catalog
 * + tracking console (`/admin/breakfast/*`), sharing one BreakfastService.
 *
 * PrismaService, SqsProducerService and FlowLogService come from @Global modules; the
 * admin guards resolve the globally-registered admin-jwt strategy — so, like
 * AdminInventoryModule, this module only declares its own controllers + services.
 */
@Module({
  controllers: [BreakfastController, AdminBreakfastController],
  providers: [BreakfastService, BreakfastInviteService],
  exports: [BreakfastService, BreakfastInviteService],
})
export class BreakfastModule {}
