import { Global, Module } from '@nestjs/common';
import { WatiService } from './wati.service';

/**
 * Global so any worker/service can inject WatiService without importing this module.
 */
@Global()
@Module({
  providers: [WatiService],
  exports: [WatiService],
})
export class WatiModule {}
