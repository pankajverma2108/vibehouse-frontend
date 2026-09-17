import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AdminEventsService } from '../admin/events/admin-events.service';
import { S3Service } from '../aws/s3.service';
import { resolvePropertyFromRequest } from '../common/property-resolver';

@Controller('public/events')
export class PublicEventsController {
  constructor(
    private readonly eventsService: AdminEventsService,
    private readonly s3: S3Service,
  ) {}

  @Get('poster')
  async getPoster(
    @Query('key') key: string,
    @Res() res: Response,
  ) {
    if (!key || !key.startsWith('events/')) {
      throw new BadRequestException('Invalid or missing key');
    }

    try {
      const { stream, contentType } = await this.s3.getObjectStream(key);
      res.set({
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      });
      stream.pipe(res);
    } catch (err: any) {
      if (err.name === 'NoSuchKey') {
        throw new NotFoundException('Poster not found');
      }
      throw err;
    }
  }

  @Get()
  listPublicEvents(
    @Req() req: Request,
    @Query('property_id') propertyId: string | undefined,
    @Query('filter') filter?: string,
  ) {
    const resolved = propertyId || resolvePropertyFromRequest(req);
    if (!resolved) {
      throw new BadRequestException('property_id is required (or call from a known host)');
    }
    return this.eventsService.listPublicEvents(resolved, filter);
  }

  @Get(':id')
  getPublicEvent(@Param('id') id: string) {
    return this.eventsService.getPublicEvent(id);
  }
}
