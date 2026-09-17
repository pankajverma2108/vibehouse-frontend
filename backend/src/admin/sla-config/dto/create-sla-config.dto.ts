import { IsIn, IsInt, IsOptional, IsBoolean, Min, Max } from 'class-validator';
import { TASK_CLASSES, type TaskClass } from '../../../tickets/task-classes';

/**
 * Create the SLA timing for one task class. Keyed by `task_category` and applied
 * globally — the timing depends only on the urgency class, not department/priority.
 *   completion_timeout_min — TAT: minutes to RESOLVE after acknowledging (= guest turn-around)
 *   ack_percent            — PRIMARY ack window as a PERCENT of the TAT; escalate if unacked by then
 *   escalation_gap_min     — base minutes between successive escalation ladder levels
 *   snooze_percent         — ESCALATED-level ack/snooze window as a PERCENT of the gap; each paged
 *                            person has this % of the gap to acknowledge before the ladder climbs
 *                            again (default 100 = the full gap)
 *
 * The class list lives in src/tickets/task-classes.ts:
 *   T-1 Unfulfilled · T0 Routine · T1 Standard · T2 Major issue · T3 Maintenance ·
 *   T4 Emergency (broadcast; TAT = 0)
 */
export class CreateSlaConfigDto {
  @IsIn(TASK_CLASSES as readonly string[])
  task_category: TaskClass;

  @IsInt() @Min(0) @Max(100_000)
  completion_timeout_min: number;

  @IsInt() @Min(0) @Max(100)
  ack_percent: number;

  @IsInt() @Min(0) @Max(100_000)
  escalation_gap_min: number;

  @IsOptional() @IsInt() @Min(1) @Max(100)
  snooze_percent?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
