import { IsNotEmpty, IsString, Matches } from 'class-validator';

/**
 * Request body for the server-side PMS price proxy (POST /api/prices).
 *
 * The browser sends ONLY these three fields — PMS HotelCode / AuthCode never
 * leave the server (they live in the ezee_connection table). The global
 * ValidationPipe runs with forbidNonWhitelisted, so a request that still tries
 * to smuggle HotelCode/AuthCode is rejected with 400.
 */
export class PriceQuoteDto {
  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'checkIn must use YYYY-MM-DD' })
  checkIn: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'checkOut must use YYYY-MM-DD' })
  checkOut: string;
}
