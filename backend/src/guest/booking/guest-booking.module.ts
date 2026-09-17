import { Module } from '@nestjs/common';
import { GuestBookingService } from './guest-booking.service';
import { GuestBookingController } from './guest-booking.controller';
import { PriceProxyController } from './price-proxy.controller';
import { EzeeModule } from '../../ezee/ezee.module';
import { CouponsModule } from '../../coupons/coupons.module';
import { TaxModule } from '../../tax/tax.module';

@Module({
  imports: [EzeeModule, CouponsModule, TaxModule],
  controllers: [GuestBookingController, PriceProxyController],
  providers: [GuestBookingService],
  exports: [GuestBookingService],
})
export class GuestBookingModule {}
