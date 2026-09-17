import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminJwtGuard } from '../common/guards/admin-jwt.guard';
import { CurrentAdmin } from '../common/decorators/current-admin.decorator';
import type { AdminJwtPayload } from '../common/guards/admin-jwt.strategy';
import { FeedbackService } from './feedback.service';
import { PrismaService } from '../prisma/prisma.service';
import { toIstString } from '../common/utils/time.util';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

class GenerateFeedbackTokenDto {
  @IsString()
  ticket_id: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  @Type(() => Number)
  ttl_days?: number;
}

@Controller('admin/feedback')
@UseGuards(AdminJwtGuard)
export class AdminFeedbackController {
  constructor(
    private readonly feedback: FeedbackService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  list(
    @CurrentAdmin() _admin: AdminJwtPayload,
    @Query('brand') brand?: string,
    @Query('min_rating') min_rating?: string,
    @Query('max_rating') max_rating?: string,
    @Query('submitted') submitted?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.feedback.listFeedback({
      brand,
      min_rating: min_rating != null ? Number(min_rating) : undefined,
      max_rating: max_rating != null ? Number(max_rating) : undefined,
      submitted: submitted === 'true' ? true : submitted === 'false' ? false : undefined,
      page: page != null ? Number(page) : undefined,
      limit: limit != null ? Number(limit) : undefined,
    });
  }

  @Get('stats')
  stats(
    @CurrentAdmin() _admin: AdminJwtPayload,
    @Query('brand') brand?: string,
  ) {
    return this.feedback.getFeedbackStats(brand);
  }

  @Post('generate-token')
  @HttpCode(HttpStatus.CREATED)
  generateToken(
    @CurrentAdmin() _admin: AdminJwtPayload,
    @Body() dto: GenerateFeedbackTokenDto,
  ) {
    return this.feedback.generateTokenForTicket(dto.ticket_id, dto.ttl_days);
  }

  @Get(':id')
  async getOne(
    @CurrentAdmin() _admin: AdminJwtPayload,
    @Param('id') id: string,
  ) {
    const row = await this.prisma.ticket_feedback.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Feedback record ' + id + ' not found');

    const ticket = await this.prisma.zoho_ticket_ref.findUnique({
      where: { id: row.ticket_id },
      select: {
        id: true,
        subject: true,
        room_number: true,
        status: true,
        department: true,
        assigned_staff_name: true,
        zoho_ticket_id: true,
      },
    });

    const guest = row.guest_id
      ? await this.prisma.guests.findUnique({
          where: { id: row.guest_id },
          select: { id: true, name: true, email: true, phone: true },
        })
      : null;

    return {
      id: row.id,
      ticket_id: row.ticket_id,
      brand: row.brand,
      guest_id: row.guest_id,
      rating: row.rating,
      sentiment: row.sentiment,
      comment: row.comment,
      expires_at: row.expires_at.toISOString(),
      submitted_at: row.submitted_at?.toISOString() ?? null,
      submitted_at_ist: toIstString(row.submitted_at),
      pushed_to_zoho: row.pushed_to_zoho,
      created_at: row.created_at.toISOString(),
      ticket: ticket ?? null,
      guest: guest ?? null,
    };
  }
}
