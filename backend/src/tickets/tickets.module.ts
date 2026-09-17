import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { StaffActionsController } from './staff-actions.controller';
import { ZohoWebhookController } from './zoho-webhook.controller';
import { SlaWatchdogService } from './sla-watchdog.service';
import { ZohoSyncService } from './zoho-sync.service';
import { FeedbackModule } from '../feedback/feedback.module';

/**
 * Phase-1 guest service-request ticketing + durable SLA escalation.
 *
 * PrismaService, SqsProducerService, ZohoDeskService are all provided by @Global
 * modules, so no imports are needed here. FeedbackModule is imported so complete()
 * can send the post-completion feedback link (FeedbackModule does NOT import this
 * module → no circular dependency). Exports TicketsService so other modules
 * (e.g. GuestStoreModule) can raise service requests.
 */
@Module({
  imports: [FeedbackModule],
  controllers: [TicketsController, StaffActionsController, ZohoWebhookController],
  providers: [TicketsService, SlaWatchdogService, ZohoSyncService],
  exports: [TicketsService],
})
export class TicketsModule {}
