import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  Param,
  Post,
} from '@nestjs/common';
import { FeedbackService, FeedbackView } from './feedback.service';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';

/**
 * Guest-facing feedback link — PUBLIC (no JWT). The single-use token IS the
 * credential, exactly like the staff action links (/tickets/staff/*). The FE hosts
 * the page at <brand-domain>/feedback/:token and calls these two endpoints.
 *
 * GET returns the ticket context + link state so the FE can render the right screen;
 * POST records the rating once. HTTP status mirrors `state` so the FE can branch on
 * status alone: 200 valid, 404 not_found, 409 used, 410 expired.
 */
@Controller('public/feedback')
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Get(':token')
  async get(@Param('token') token: string): Promise<FeedbackView> {
    return this.feedback.getByToken(token);
  }

  @Post(':token')
  @HttpCode(200)
  async submit(
    @Param('token') token: string,
    @Body() dto: SubmitFeedbackDto,
  ): Promise<FeedbackView> {
    const result = await this.feedback.submit(token, dto);
    if (result.ok) return result;
    // Reflect the outcome in the HTTP status; the body still carries the state.
    const code =
      result.state === 'not_found' ? 404 : result.state === 'expired' ? 410 : 409;
    throw new HttpException(result as unknown as Record<string, unknown>, code);
  }
}
