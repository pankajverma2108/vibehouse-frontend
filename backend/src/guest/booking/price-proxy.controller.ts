import { Body, Controller, Header, Post } from '@nestjs/common';
import { GuestBookingService } from './guest-booking.service';
import { PriceQuoteDto } from './dto/price-quote.dto';

/**
 * Server-side PMS price proxy for the marketing/hotel pages.
 *
 * Replaces the old browser-side flow that built PMS XML and shipped HotelCode /
 * AuthCode to the client (now treated as compromised — see
 * docs/FEtoBEHandoff/buteak_price_proxy_server_side_credentials_handoff_2026-06-20.md).
 *
 * The browser POSTs only { propertyId, checkIn, checkOut }. We reuse the same
 * server-side eZee integration the booking flow uses (credentials live in the
 * ezee_connection table), so the price card shows exactly what the guest will be
 * quoted at checkout — no second PMS credential to manage or rotate.
 *
 * Route is literal `/api/prices` (the app has no global prefix). OPTIONS
 * preflight + the brand CORS allowlist are handled globally in main.ts.
 */
@Controller()
export class PriceProxyController {
  constructor(private readonly booking: GuestBookingService) {}

  @Post('api/prices')
  @Header('Cache-Control', 'no-store')
  async getPrices(@Body() dto: PriceQuoteDto): Promise<{
    items: Array<{ roomTypeId: string; price: number; priceWithTax: number; taxRate: number }>;
  }> {
    // Reuses live eZee availability (cached 30 min). On eZee outage it degrades
    // to the DB-estimate path internally and never leaks upstream error bodies.
    const availability = await this.booking.getRoomAvailability(
      dto.propertyId,
      dto.checkIn,
      dto.checkOut,
    );

    const taxRate = Number(availability.tax_rate_pct ?? 0);

    // `price` is the pre-tax nightly selling rate (eZee avg_per_night_without_tax),
    // i.e. the same figure the booking flow charges — kept consistent on purpose.
    // priceWithTax applies the property tax rate. Rooms with no rate (0) are
    // omitted so the card never shows ₹0.
    const items = availability.room_types
      .filter((r) => Number(r.base_price_per_night) > 0)
      .map((r) => {
        const price = Number(r.base_price_per_night);
        return {
          roomTypeId: r.ezee_room_type_id ?? r.id,
          price,
          priceWithTax: Math.round(price * (1 + taxRate / 100) * 100) / 100,
          taxRate,
        };
      });

    return { items };
  }
}
