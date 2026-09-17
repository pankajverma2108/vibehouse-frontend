import { Module } from '@nestjs/common';
import { GuestStoreController } from './guest-store.controller';
import { GuestStoreService } from './guest-store.service';
import { TicketsModule } from '../../tickets/tickets.module';

@Module({
  imports: [TicketsModule],
  controllers: [GuestStoreController],
  providers: [GuestStoreService],
})
export class GuestStoreModule {}
