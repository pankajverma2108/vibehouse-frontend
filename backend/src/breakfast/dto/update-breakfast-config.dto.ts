import { IsBoolean, IsOptional, IsInt, Min, Max } from 'class-validator';

/**
 * Update a property's breakfast config — the on/off toggle and the auto-send scheduler.
 * All fields optional; only those supplied are changed.
 *   - `enabled`               : does this property serve breakfast at all
 *   - `order_open_hour`       : IST hour (0-23) ordering OPENS the evening before (default 11)
 *   - `order_freeze_hour`     : IST hour (0-23) ordering FREEZES on the service morning (default 7)
 *   - `invite_cron_enabled`   : run the auto-send scheduler for this property
 *   - `invite_anchor_min`     : "schedule at" — minutes from IST midnight (18:00 = 1080)
 *   - `invite_interval_hours` : repeat every N hours after the anchor (24 = once daily)
 */
export class UpdateBreakfastConfigDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  order_open_hour?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  order_freeze_hour?: number;

  @IsOptional()
  @IsBoolean()
  invite_cron_enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1439)
  invite_anchor_min?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  invite_interval_hours?: number;
}
