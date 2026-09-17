import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { RazorpayProvider } from './razorpay.provider';
import { CouponsModule } from '../coupons/coupons.module';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
  // TicketsModule: heist1.1 pay-over-WA raises the service ticket on capture.
  imports: [CouponsModule, TicketsModule],
  controllers: [PaymentController],
  providers: [RazorpayProvider, PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
