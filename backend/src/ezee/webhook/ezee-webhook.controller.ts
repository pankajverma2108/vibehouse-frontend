import {
  Controller,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../../prisma/prisma.service';
import { SqsProducerService } from '../../sqs/sqs-producer.service';
import type { EzeeAutosyncReservation } from './ezee-autosync.types';
import {
  extractClientIp,
  isIpAllowed,
  parseAutosyncMessage,
  reservationsOf,
} from './ezee-autosync.parser';

/**
 * Inbound webhooks from eZee PMS.
 *
 * Phase 2B (current): IP allowlist + JSON parse + property resolve. Phase 2A
 * probe established that eZee sends NO auth header / token with the autosync
 * push — only the standard ALB-forwarded headers — so we authenticate by the
 * source IP via `x-forwarded-for` (eZee's outbound is currently
 * 50.17.189.228, captured live). Mismatches are rejected with 401 so eZee's
 * retry telemetry shows the problem instead of silently accepting spoofed
 * payloads.
 *
 * Phase 3 (next): on a valid push, enqueue one SQS message per Reservation
 * to vibehouse-ezee-sync.fifo and let the existing EzeeSyncWorker upsert
 * ezee_booking_cache with the operation-aware status matrix + the
 * preserve-PWA-enrichment rules. See
 * C:\Users\Build91 Admin\.claude\plans\reactive-popping-kernighan.md.
 */
@Controller('ezee/webhook')
@SkipThrottle()
export class EzeeWebhookController {
  private readonly logger = new Logger(EzeeWebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sqs: SqsProducerService,
  ) {}

  @Post('autosync')
  async autosync(@Req() req: any) {
    const clientIp = extractClientIp(req.headers ?? {});
    if (!isIpAllowed(clientIp)) {
      this.logger.warn(
        `eZee autosync rejected: client_ip=${clientIp ?? 'unknown'} not in allowlist`,
      );
      throw new UnauthorizedException();
    }

    const rawBody: string = req.rawBody
      ? req.rawBody.toString('utf8')
      : typeof req.body === 'string'
        ? req.body
        : JSON.stringify(req.body ?? {});

    // parseAutosyncMessage throws BadRequest on malformed JSON or wrong shape.
    const msg = parseAutosyncMessage(rawBody);
    const reservations = reservationsOf(msg);

    // Resolve hotel_code → property_id. We gracefully ack unknown hotel codes
    // so a misconfigured eZee property doesn't make our endpoint look broken
    // and trigger retries.
    const conn = await this.prisma.ezee_connection.findFirst({
      where: { hotel_code: msg.hotel_code },
      select: { property_id: true },
    });

    if (!conn) {
      this.logger.warn(
        `eZee autosync: unknown hotel_code=${msg.hotel_code} (op=${msg.operation}); ack and skip`,
      );
      return { status: 'ok', skipped: 'unknown_hotel_code' };
    }

    this.logger.log(
      `eZee autosync: property=${conn.property_id} hotel=${msg.hotel_code} op=${msg.operation} reservations=${reservations.length} bytes=${rawBody.length}`,
    );

    // A multi-room booking arrives as ONE Reservation ENTRY PER ROOM, every entry carrying the
    // SAME UniqueID and a single BookingTran. Enqueued separately they all upsert the same cache
    // row (keyed on UniqueID) and each overwrites the room snapshot with its own one room — last
    // message wins, and every other room of the booking is lost. Fold the entries into one
    // reservation per UniqueID, carrying ALL its rooms.
    const byUniqueId = new Map<string, EzeeAutosyncReservation>();
    for (const reservation of reservations) {
      const uniqueId = (reservation as EzeeAutosyncReservation).UniqueID;
      if (!uniqueId) {
        this.logger.warn(
          `eZee autosync: skipping reservation with no UniqueID (op=${msg.operation})`,
        );
        continue;
      }
      const merged = byUniqueId.get(uniqueId);
      if (merged) {
        merged.BookingTran = [...(merged.BookingTran ?? []), ...(reservation.BookingTran ?? [])];
      } else {
        byUniqueId.set(uniqueId, { ...reservation, BookingTran: [...(reservation.BookingTran ?? [])] });
      }
    }

    const receivedAt = new Date().toISOString();
    let enqueued = 0;
    for (const [uniqueId, reservation] of byUniqueId) {
      await this.sqs.sendEzeeAutosyncWebhook(
        {
          hotel_code: msg.hotel_code!,
          property_id: conn.property_id,
          operation: msg.operation ?? 'UNKNOWN',
          reservation,
          received_at: receivedAt,
        },
        uniqueId,
      );
      enqueued += 1;
    }

    return {
      status: 'ok',
      property_id: conn.property_id,
      operation: msg.operation ?? null,
      reservations: reservations.length,
      enqueued,
    };
  }
}
