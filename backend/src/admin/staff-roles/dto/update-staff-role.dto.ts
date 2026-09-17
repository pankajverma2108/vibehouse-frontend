import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

/**
 * Update a role. `name` is intentionally NOT editable — staff + escalation_levels
 * reference the role by string, so renaming would orphan them. To retire a role,
 * set is_active=false (or DELETE, which soft-deactivates).
 */
export class UpdateStaffRoleDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  label?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
