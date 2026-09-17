import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto, SwitchPropertyDto } from './dto/login.dto';
import { AdminJwtGuard } from '../../common/guards/admin-jwt.guard';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import type { AdminJwtPayload } from '../../common/guards/admin-jwt.strategy';
import type { Request } from 'express';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body() dto: AdminLoginDto, @Req() req: Request) {
    const ip = req.ip ?? (req.socket as any)?.remoteAddress;
    return this.adminAuthService.login(dto, ip);
  }

  @Post('switch-property')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminJwtGuard)
  switchProperty(
    @CurrentAdmin() admin: AdminJwtPayload,
    @Body() dto: SwitchPropertyDto,
  ) {
    return this.adminAuthService.switchProperty(admin, dto.property_id);
  }

  @Get('me')
  @UseGuards(AdminJwtGuard)
  getProfile(@CurrentAdmin() admin: AdminJwtPayload) {
    return this.adminAuthService.getProfile(admin.admin_id, admin.property_id);
  }
}
