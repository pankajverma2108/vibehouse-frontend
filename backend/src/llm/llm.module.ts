import { Global, Module } from '@nestjs/common';
import { LlmService } from './llm.service';

/**
 * Global so any service/worker can inject LlmService without importing this module.
 */
@Global()
@Module({
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}
