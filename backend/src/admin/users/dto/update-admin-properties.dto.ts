import { IsArray, ArrayNotEmpty, IsString, Matches } from 'class-validator';

export class UpdateAdminPropertiesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Matches(/^[0-9]+$/, { each: true, message: 'property_ids entries must be numeric eZee hotel codes' })
  property_ids: string[];
}
