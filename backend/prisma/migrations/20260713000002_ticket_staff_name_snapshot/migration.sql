-- Snapshot the assignee's NAME onto the ticket so a ticket's "who worked it" survives the
-- staff row being deleted. Until now the name was only resolvable by joining live on
-- assigned_staff_id, which made a staff hard-delete lossy (historic tickets would read
-- "Unassigned" forever). Zoho Desk already pins the name (cf_handled_by / cf_assigned_staff);
-- this brings our own cache to parity so a delete costs nothing.
ALTER TABLE "zoho_ticket_ref"
  ADD COLUMN "assigned_staff_name" VARCHAR(255);

-- Backfill from the staff rows that still exist.
UPDATE "zoho_ticket_ref" t
   SET "assigned_staff_name" = s."name"
  FROM "staff" s
 WHERE t."assigned_staff_id" = s."id"
   AND t."assigned_staff_name" IS NULL;
