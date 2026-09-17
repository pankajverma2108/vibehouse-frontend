import { Global, Module } from '@nestjs/common';
import { ZohoDeskService } from './zoho-desk.service';

@Global()
@Module({
  providers: [ZohoDeskService],
  exports: [ZohoDeskService],
})
export class ZohoDeskModule {}
