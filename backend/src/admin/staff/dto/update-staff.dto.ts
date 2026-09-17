import { IsString, IsOptional, IsBoolean, IsIn, MaxLength, Matches } from 'class-validator';

// `role` is validated against the staff_roles catalog in the service.
const DEPARTMENTS = ['HOUSEKEEPING', 'MAINTENANCE', 'FRONT_OFFICE'];

export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{10,15}$/, { message: 'phone must be 10–15 digits (country code, no +)' })
  phone?: string;

  /** Must exist (and be active) in the staff_roles catalog — validated in the service. */
  @IsOptional()
  @IsString()
  @MaxLength(30)
  role?: string;

  @IsOptional()
  @IsIn(DEPARTMENTS)
  department?: string;

  @IsOptional()
  @IsBoolean()
  is_available?: boolean;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
