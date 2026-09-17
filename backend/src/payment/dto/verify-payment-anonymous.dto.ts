import { IsString, IsNotEmpty, Length } from 'class-validator';

/**
 * Anonymous BUTEAK verify payload. Adds `payment_token` + `ezee_reservation_id`
 * to the standard verify shape; the token authenticates the call in lieu of a
 * Bearer JWT. See PaymentService.verifyPaymentAnonymous + plan
 * "BUTEAK Anonymous Booking" in reactive-popping-kernighan.md.
 */
export class VerifyPaymentAnonymousDto {
  @IsString()
  @IsNotEmpty()
  ezee_reservation_id: string;

  @IsString()
  @IsNotEmpty()
  razorpay_order_id: string;

  @IsString()
  @IsNotEmpty()
  razorpay_payment_id: string;

  @IsString()
  @IsNotEmpty()
  razorpay_signature: string;

  // 32-char hex string emitted by createBookingOrder.
  @IsString()
  @IsNotEmpty()
  @Length(32, 32)
  payment_token: string;
}
