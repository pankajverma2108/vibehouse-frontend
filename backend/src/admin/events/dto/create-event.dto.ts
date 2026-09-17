import { IsString, IsOptional, IsDateString, IsInt, MaxLength, Min, Matches } from 'class-validator';

export class CreateEventDto {
  // Optional: when the actor is a multi-property owner without a default property,
  // they must specify which property this event belongs to.
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]+$/, { message: 'property_id must be the numeric eZee hotel code' })
  property_id?: string;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  time?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  price_text?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  contact_link?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  poster_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  badge_label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  badge_color?: string;
}
