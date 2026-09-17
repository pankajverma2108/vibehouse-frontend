import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Create a booking that exists only to drive the guest flows against a LIVE property without
 * occupying a sellable room. See docs/setup/test_bookings.md.
 */
export class CreateTestBookingDto {
  /**
   * The tester's WhatsApp number. Matched the way the front door matches — on the last 10 digits
   * (see phone.util) — so any of "+91 98…", "9198…", "98…" works.
   */
  @IsString()
  @Matches(/^[+\d][\d\s-]{9,19}$/, {
    message: 'phone must be a plausible phone number (digits, spaces or dashes; 10-20 chars)',
  })
  phone!: string;

  /** eZee hotel code of the property to test against, e.g. "55402". Must be one you're assigned. */
  @IsString()
  @MinLength(1)
  @MaxLength(36)
  property_id!: string;

  /** Shown to staff on the ticket. Defaults to "Test-101" — keep the Test- prefix so it's obvious. */
  @IsOptional()
  @IsString()
  @MaxLength(20) // ezee_booking_cache.room_number is VarChar(20)
  room_number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  guest_name?: string;

  /**
   * Multiple rooms → a synthetic group booking, so the room-disambiguation prompt ("which room is
   * this for?") can be tested. Omit for the normal single-room case. When given, `room_number` is
   * ignored in favour of this list.
   */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(20, { each: true })
  rooms?: string[];
}
