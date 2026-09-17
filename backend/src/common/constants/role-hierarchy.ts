/**
 * Defines which roles each actor role is allowed to create.
 * OWNER / TECH_OPS → can create all non-owner roles (incl. TECH_OPS)
 * MANAGER → can create RECEPTION, HOUSEKEEPING_LEAD, MAINTENANCE_LEAD
 * RECEPTION / HOUSEKEEPING_LEAD / MAINTENANCE_LEAD → cannot create anyone
 *
 * TECH_OPS is the dev/ops super-role (owner-equivalent), so it mirrors OWNER's
 * create list. Neither OWNER nor TECH_OPS can create OWNER accounts.
 */
export const ROLE_HIERARCHY: Record<string, string[]> = {
  OWNER: ['MANAGER', 'RECEPTION', 'HOUSEKEEPING_LEAD', 'MAINTENANCE_LEAD', 'TECH_OPS'],
  TECH_OPS: ['MANAGER', 'RECEPTION', 'HOUSEKEEPING_LEAD', 'MAINTENANCE_LEAD', 'TECH_OPS'],
  MANAGER: ['RECEPTION', 'HOUSEKEEPING_LEAD', 'MAINTENANCE_LEAD'],
  RECEPTION: [],
  HOUSEKEEPING_LEAD: [],
  MAINTENANCE_LEAD: [],
};
