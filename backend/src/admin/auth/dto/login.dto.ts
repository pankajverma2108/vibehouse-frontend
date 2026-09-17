import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

export class AdminLoginDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsNotEmpty()
  @IsString()
  role: string; // OWNER | MANAGER | RECEPTION | HOUSEKEEPING_LEAD | MAINTENANCE_LEAD

  @IsNotEmpty()
  @IsString()
  @Matches(/^[0-9]+$/, { message: 'property_id must be a numeric eZee hotel code' })
  property_id: string;
}

export class SwitchPropertyDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^[0-9]+$/, { message: 'property_id must be a numeric eZee hotel code' })
  property_id: string;
}
