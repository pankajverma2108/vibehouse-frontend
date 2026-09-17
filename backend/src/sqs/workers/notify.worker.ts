import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { WatiService } from '../../wati/wati.service';
import { NotifyMessageType, OpsMessageType } from '../sqs.constants';
import type { SqsWorker } from '../sqs-consumer.service';
import type {
  SqsMessageEnvelope,
  NotifyGuestPayload,
  NotifyStaffPayload,
  LowStockAlertPayload,
} from '../types/messages';

/**
 * Notification Worker — consumes vibehouse-notify
 *
 * Delivers outbound WhatsApp via WATI (per-brand) and records every attempt in
 * notification_log. If a brand's WATI creds aren't set yet, the send is recorded
 * as SKIPPED rather than failing — so the ticketing flow works before templates
 * are approved.
 */
@Injectable()
export class NotifyWorker implements SqsWorker {
  private readonly logger = new Logger(NotifyWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wati: WatiService,
  ) {}

  private toParams(variables: Record<string, string>): { name: string; value: string }[] {
    return Object.entries(variables).map(([name, value]) => ({ name, value: String(value) }));
  }

  async process(message: SqsMessageEnvelope): Promise<void> {
    switch (message.type) {
      case NotifyMessageType.NOTIFY_GUEST:
        await this.handleNotifyGuest(message.payload as NotifyGuestPayload);
        break;

      case NotifyMessageType.NOTIFY_STAFF:
        await this.handleNotifyStaff(message.payload as NotifyStaffPayload);
        break;

      case OpsMessageType.LOW_STOCK_ALERT:
        await this.handleLowStockAlert(message.payload as LowStockAlertPayload);
        break;

      default:
        this.logger.warn(`Unknown notify message type: ${message.type}`);
    }
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  private async handleNotifyGuest(payload: NotifyGuestPayload): Promise<void> {
    const logId = uuidv4();
    await this.prisma.notification_log.create({
      data: {
        id: logId,
        recipient_guest_id: payload.guest_id,
        channel: 'WHATSAPP',
        type: payload.template,
        payload: payload.variables as object,
        status: 'QUEUED',
        sent_at: new Date(),
      },
    });

    if (!payload.guest_phone) {
      await this.markStatus(logId, 'SKIPPED');
      this.logger.warn(`Notify guest ${payload.guest_id}: no phone on payload — skipped`);
      return;
    }
    const res = await this.wati.sendTemplateMessage(
      payload.brand ?? 'TDS',
      payload.guest_phone,
      payload.template,
      this.toParams(payload.variables),
    );
    await this.markStatus(logId, res.ok ? 'SENT' : res.skipped ? 'SKIPPED' : 'FAILED');
  }

  private async handleNotifyStaff(payload: NotifyStaffPayload): Promise<void> {
    const logId = uuidv4();
    await this.prisma.notification_log.create({
      data: {
        id: logId,
        recipient_zoho_staff_id: payload.staff_phone,
        channel: 'WHATSAPP',
        type: payload.template,
        payload: payload.variables as object,
        status: 'QUEUED',
        sent_at: new Date(),
      },
    });

    const res = await this.wati.sendTemplateMessage(
      payload.brand ?? 'TDS',
      payload.staff_phone,
      payload.template,
      this.toParams(payload.variables),
    );
    await this.markStatus(logId, res.ok ? 'SENT' : res.skipped ? 'SKIPPED' : 'FAILED');
  }

  private async markStatus(id: string, status: string): Promise<void> {
    await this.prisma.notification_log
      .update({ where: { id }, data: { status } })
      .catch(() => undefined);
  }

  private async handleLowStockAlert(payload: LowStockAlertPayload): Promise<void> {
    this.logger.warn(
      `⚠️ LOW STOCK: "${payload.product_name}" (${payload.available_stock} remaining, threshold: ${payload.threshold}) — property: ${payload.property_id}`,
    );

    // Future: Notify admin via WhatsApp / dashboard alert
  }
}
