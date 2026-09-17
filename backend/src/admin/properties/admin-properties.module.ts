import { Module } from '@nestjs/common';
import { AdminPropertiesController } from './admin-properties.controller';
import { AdminPropertiesService } from './admin-properties.service';

@Module({
  controllers: [AdminPropertiesController],
  providers: [AdminPropertiesService],
  exports: [AdminPropertiesService],
})
export class AdminPropertiesModule {}
