import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateStaffRoleDto {
  /**
   * Role name. Stored canonically as UPPER_SNAKE (the service normalises
   * "Night Supervisor" → "NIGHT_SUPERVISOR"), so the escalation ladder + staff
   * roster always match on the same string.
   */
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  name: string;

  /** Optional human display label for the FE (e.g. "Night Supervisor"). */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  label?: string;
}
