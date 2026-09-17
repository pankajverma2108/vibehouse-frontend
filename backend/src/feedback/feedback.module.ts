import { Module } from '@nestjs/common';
import { FeedbackController } from './feedback.controller';
import { AdminFeedbackController } from './admin-feedback.controller';
import { FeedbackService } from './feedback.service';

/**
 * Post-completion guest feedback (CSAT). PrismaService, SqsProducerService,
 * ZohoDeskService and FlowLogService are all provided by @Global modules, so no
 * imports are needed. Exports FeedbackService so TicketsModule can send the invite
 * from complete().
 */
@Module({
  controllers: [FeedbackController, AdminFeedbackController],
  providers: [FeedbackService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
