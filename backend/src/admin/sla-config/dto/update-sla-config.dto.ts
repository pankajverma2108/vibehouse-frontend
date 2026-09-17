import { IsInt, IsOptional, IsBoolean, Min, Max } from 'class-validator';

/**
 * Partial update of a task class's SLA timing (class identified in the URL).
 * Only the timing fields and the active flag are editable. Applied globally.
 */
export class UpdateSlaConfigDto {
  @IsOptional() @IsInt() @Min(0) @Max(100_000)
  completion_timeout_min?: number;

  @IsOptional() @IsInt() @Min(0) @Max(100)
  ack_percent?: number;

  @IsOptional() @IsInt() @Min(0) @Max(100_000)
  escalation_gap_min?: number;

  @IsOptional() @IsInt() @Min(1) @Max(100)
  snooze_percent?: number;

  @IsOptional() @IsBoolean()
  is_active?: boolean;
}
