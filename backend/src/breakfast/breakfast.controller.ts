import { Body, Controller, Get, HttpCode, Param, Post, ValidationPipe } from '@nestjs/common';
import { BreakfastService, BreakfastPageView } from './breakfast.service';
import { SubmitBreakfastOrderDto } from './dto/submit-breakfast-order.dto';

/**
 * The GET hands the FE canonical rooms/plates/items that carry read-only fields the POST body
 * doesn't declare (`room_number`, `max_plates`, `plate_number`, `slot_label`, `name`, …), and the
 * FE's whole flow is "edit what you were given, send it back". The global pipe's
 * `forbidNonWhitelisted` turns every one of those echoed fields into a 400, so the order can never
 * be submitted. Strip unknown keys here instead of rejecting — `whitelist` still drops them, so
 * nothing unvalidated reaches the service.
 */
const ECHO_TOLERANT = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false });

/**
 * Guest-facing breakfast ordering page — PUBLIC (no JWT). The per-stay opaque token IS
 * the credential (same pattern as /public/feedback). The FE hosts the page at
 * <brand-domain>/breakfast/:token and calls these two endpoints.
 *
 * GET always returns 200 with `link_state` + `window` so the FE can render the right
 * screen (valid / checked_out / revoked / not_found, open / frozen). POST places or
 * modifies the order and mirrors failures in the HTTP status: 404 not_found,
 * 409 checked_out/revoked/window_frozen/slot_full.
 */
@Controller('public/breakfast')
export class BreakfastController {
  constructor(private readonly breakfast: BreakfastService) {}

  @Get(':token')
  async get(@Param('token') token: string): Promise<BreakfastPageView> {
    return this.breakfast.getByToken(token);
  }

  @Post(':token')
  @HttpCode(200)
  async submit(
    @Param('token') token: string,
    @Body(ECHO_TOLERANT) dto: SubmitBreakfastOrderDto,
  ) {
    return this.breakfast.submitByToken(token, dto);
  }
}
