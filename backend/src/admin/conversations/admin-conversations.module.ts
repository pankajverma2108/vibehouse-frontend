import { Module } from '@nestjs/common';
import { AdminConversationsController } from './admin-conversations.controller';

/**
 * Read-only admin view over wa_service_request + flow_log. PrismaService is provided
 * by the global PrismaModule, so no imports are needed.
 */
@Module({
  controllers: [AdminConversationsController],
})
export class AdminConversationsModule {}
