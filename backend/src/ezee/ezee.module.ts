import { Module } from '@nestjs/common';
import { EzeeService } from './ezee.service';
import { EzeeReconciliationService } from './ezee-reconciliation.service';
import { EzeeRoomGuestsService } from './ezee-room-guests.service';
import { EzeeWebhookController } from './webhook/ezee-webhook.controller';
import { AutosyncSideEffectsService } from './webhook/autosync-side-effects.service';
import { MyGateModule } from '../mygate/mygate.module';

@Module({
  imports: [MyGateModule],
  controllers: [EzeeWebhookController],
  providers: [
    EzeeService,
    EzeeReconciliationService,
    EzeeRoomGuestsService,
    AutosyncSideEffectsService,
  ],
  exports: [
    EzeeService,
    EzeeReconciliationService,
    EzeeRoomGuestsService,
    AutosyncSideEffectsService,
  ],
})
export class EzeeModule {}
