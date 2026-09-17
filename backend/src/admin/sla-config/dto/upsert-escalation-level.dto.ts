import { IsIn, IsOptional, IsString, MaxLength, IsBoolean } from 'class-validator';

/**
 * Upsert one escalation ladder level (identified by the level number in the URL).
 * Defines WHO is notified at that step and where to look them up. Applied to every
 * property (escalation ladder is global per Vibe House policy).
 *
 *   lookup_source = 'staff'       → `role` is matched against the staff table
 *                                   (e.g. HOUSEKEEPING, MAINTENANCE, FRONT_OFFICE, TEAM_LEAD)
 *   lookup_source = 'admin_users' → `role` is matched against admin_roles.name
 *                                   (e.g. Manager, Owner)
 */
export class UpsertEscalationLevelDto {
  @IsString()
  @MaxLength(30)
  role: string;

  @IsIn(['staff', 'admin_users'])
  lookup_source: 'staff' | 'admin_users';

  /** Notification channel. WATI for launch; reserved for future channels. */
  @IsOptional()
  @IsIn(['WATI'])
  channel?: 'WATI';

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
