import {
  IsString,
  IsNotEmpty,
  IsEmail,
  MaxLength,
  Matches,
} from 'class-validator';
import { CreateBookingOrderDto } from './create-booking-order.dto';

/**
 * Anonymous BUTEAK booking — extends the normal create-order DTO with inline
 * booker PII so we can persist a guests row without a prior signup. See plan
 * "BUTEAK Anonymous Booking" in reactive-popping-kernighan.md.
 *
 * Deliberately minimal: name + email + phone is what eZee InsertBooking
 * needs. No address / DOB / marketing-opt-in collected.
 */
export class AnonymousCreateBookingOrderDto extends CreateBookingOrderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  // E.164-ish; we don't enforce a strict country prefix because eZee accepts
  // assorted formats. The DB column is VARCHAR(20).
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Matches(/^\+?[0-9 \-]{7,20}$/, { message: 'phone must be 7–20 digits, optional + prefix' })
  phone: string;
}
