import { Global, Module } from '@nestjs/common';
import { FlowLogService } from './flow-log.service';

/**
 * Global so any module (WA, tickets, ops worker) can inject FlowLogService without
 * import wiring — mirrors PrismaModule.
 */
@Global()
@Module({
  providers: [FlowLogService],
  exports: [FlowLogService],
})
export class FlowLogModule {}
