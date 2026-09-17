import { IsString, IsOptional, IsBoolean, IsIn, MaxLength, Matches } from 'class-validator';

// `role` is validated against the staff_roles catalog in the service (so ops can add
// roles without a code change); departments stay a fixed enum for now.
const DEPARTMENTS = ['HOUSEKEEPING', 'MAINTENANCE', 'FRONT_OFFICE'];

export class CreateStaffDto {
  @IsString()
  @MaxLength(36)
  property_id: string;

  @IsString()
  @MaxLength(255)
  name: string;

  /** WhatsApp number, digits only (country code, no +). e.g. 919812345678 */
  @IsString()
  @Matches(/^[0-9]{10,15}$/, { message: 'phone must be 10–15 digits (country code, no +)' })
  phone: string;

  /** Must exist (and be active) in the staff_roles catalog — validated in the service. */
  @IsString()
  @MaxLength(30)
  role: string;

  @IsIn(DEPARTMENTS)
  department: string;

  /** On-shift? Only available staff get assigned tickets. Defaults false. */
  @IsOptional()
  @IsBoolean()
  is_available?: boolean;
}
