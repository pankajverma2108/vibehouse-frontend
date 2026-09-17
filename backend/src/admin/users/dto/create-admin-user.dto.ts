import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  ArrayNotEmpty,
  MinLength,
  Matches,
} from 'class-validator';

export class CreateAdminUserDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;

  @IsNotEmpty()
  @IsString()
  role_id: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Matches(/^[0-9]+$/, { each: true, message: 'property_ids entries must be numeric eZee hotel codes' })
  property_ids: string[];
}
