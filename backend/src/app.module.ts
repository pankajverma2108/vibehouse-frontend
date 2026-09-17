import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ThrottlerBehindProxyGuard } from './common/guards/throttler-behind-proxy.guard';
import { SqsModule } from './sqs/sqs.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AwsModule } from './aws/aws.module';
import { AdminAuthModule } from './admin/auth/admin-auth.module';
import { AdminUsersModule } from './admin/users/admin-users.module';
import { AdminPropertiesModule } from './admin/properties/admin-properties.module';
import { GuestAuthModule } from './guest/auth/guest-auth.module';
import { AdminInventoryModule } from './admin/inventory/admin-inventory.module';
import { AdminKycModule } from './admin/kyc/admin-kyc.module';
import { AdminBookingsModule } from './admin/bookings/admin-bookings.module';
import { GuestStoreModule } from './guest/store/guest-store.module';
import { GuestBookingModule } from './guest/booking/guest-booking.module';
import { GuestKycModule } from './guest/kyc/guest-kyc.module';
import { ColiveModule } from './guest/colive/colive.module';
import { PaymentModule } from './payment/payment.module';
import { AdminEventsModule } from './admin/events/admin-events.module';
import { AdminRoomTypesModule } from './admin/room-types/admin-room-types.module';
import { AdminCouponsModule } from './admin/coupons/admin-coupons.module';
import { AdminDashboardModule } from './admin/dashboard/admin-dashboard.module';
import { PublicModule } from './public/public.module';
import { EmailModule } from './email/email.module';
import { EzeeModule } from './ezee/ezee.module';
import { CouponsModule } from './coupons/coupons.module';
import { WatiModule } from './wati/wati.module';
import { WaModule } from './wati/wa.module';
import { ZohoDeskModule } from './zoho-desk/zoho-desk.module';
import { TicketsModule } from './tickets/tickets.module';
import { LlmModule } from './llm/llm.module';
import { FlowLogModule } from './flow-log/flow-log.module';
import { AdminStaffModule } from './admin/staff/admin-staff.module';
import { AdminStaffRolesModule } from './admin/staff-roles/admin-staff-roles.module';
import { AdminSlaConfigModule } from './admin/sla-config/admin-sla-config.module';
import { AdminConversationsModule } from './admin/conversations/admin-conversations.module';
import { FeedbackModule } from './feedback/feedback.module';
import { BreakfastModule } from './breakfast/breakfast.module';

import { UploadsModule } from './uploads/uploads.module';

@Module({
  controllers: [AppController],
  providers: [
    AppService,
    // Global rate limiting. Default backstop = 300 req/min per client IP;
    // sensitive auth routes tighten this further with @Throttle, and
    // server-to-server webhooks opt out with @SkipThrottle.
    { provide: APP_GUARD, useClass: ThrottlerBehindProxyGuard },
  ],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    PrismaModule,
    FlowLogModule,
    RedisModule,
    AwsModule,
    UploadsModule,
    EzeeModule,
    AdminAuthModule,
    AdminUsersModule,
    AdminPropertiesModule,
    GuestAuthModule,
    AdminInventoryModule,
    AdminKycModule,
    AdminBookingsModule,
    AdminEventsModule,
    AdminRoomTypesModule,
    AdminCouponsModule,
    AdminDashboardModule,
    AdminConversationsModule,
    CouponsModule,
    GuestStoreModule,
    GuestBookingModule,
    GuestKycModule,
    ColiveModule,
    PaymentModule,
    PublicModule,
    SqsModule,
    EmailModule,
    WatiModule,
    ZohoDeskModule,
    TicketsModule,
    FeedbackModule,
    BreakfastModule,
    LlmModule,
    WaModule,
    AdminStaffModule,
    AdminStaffRolesModule,
    AdminSlaConfigModule,
  ],
})
export class AppModule {}


