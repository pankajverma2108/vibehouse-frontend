import {
  IsIn,
  IsOptional,
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  ArrayMaxSize,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PlateDto } from './submit-breakfast-order.dto';

/**
 * Admin places/adjusts an order for ONE room on a guest's behalf (post-7 AM manual
 * intervention). Bypasses the Cx ordering window. `service_date` is an explicit YYYY-MM-DD.
 * Plates are capped by the room's eZee adult count, same as the Cx path.
 */
export class AdminPlaceOrderDto {
  @IsNotEmpty()
  @IsString()
  ezee_reservation_id: string;

  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'service_date must be YYYY-MM-DD' })
  service_date: string;

  @IsIn(['ORDER', 'SKIP'])
  action: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => PlateDto)
  plates?: PlateDto[];
}
