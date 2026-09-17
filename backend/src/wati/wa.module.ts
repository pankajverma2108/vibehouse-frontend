import { Module } from '@nestjs/common';
import { WatiWebhookController } from './wati-webhook.controller';
import { WaPayController } from './wa-pay.controller';
import { WaServiceService } from './wa-service.service';
import { ProspectService } from './prospect.service';
import { RoomSelectionService } from './room-selection.service';
import { TicketsModule } from '../tickets/tickets.module';
import { PaymentModule } from '../payment/payment.module';
import { FeedbackModule } from '../feedback/feedback.module';
import { BreakfastModule } from '../breakfast/breakfast.module';

/**
 * heist1.1 — WhatsApp service-request front door.
 *
 * Wires the inbound WATI webhook → WaServiceService orchestrator. WatiService,
 * LlmService and PrismaService come from @Global modules; TicketsService and
 * PaymentService are imported for ticket creation + pay-over-WA payment links.
 * FeedbackModule powers the post-completion Good/Bad capture on the inbound path.
 */
@Module({
  imports: [TicketsModule, PaymentModule, FeedbackModule, BreakfastModule],
  controllers: [WatiWebhookController, WaPayController],
  providers: [WaServiceService, ProspectService, RoomSelectionService],
})
export class WaModule {}
