-- Two-timer escalation: SLA timing per task class becomes ack + completion + gap.
--
-- Replaces the old single breach (sla_minutes) + 4 hardcoded escalation step
-- columns (l0..l3) with: ack_timeout_min (escalate if unacknowledged),
-- completion_timeout_min (after ack, escalate if not completed — also the guest
-- turn-around), escalation_gap_min (wait between dynamic ladder levels).
--
-- New columns are BACKFILLED per class in this migration (CASE below) so prod is
-- never left null even if the ts-node seed step is skipped. No row deletes here.

ALTER TABLE sla_config ADD COLUMN ack_timeout_min        INT;
ALTER TABLE sla_config ADD COLUMN completion_timeout_min INT;
ALTER TABLE sla_config ADD COLUMN escalation_gap_min     INT;

UPDATE sla_config SET
  ack_timeout_min = CASE task_category
    WHEN 'T0' THEN 5  WHEN 'T1' THEN 10 WHEN 'T2' THEN 15 WHEN 'T3' THEN 0 ELSE 10 END,
  completion_timeout_min = CASE task_category
    WHEN 'T0' THEN 10 WHEN 'T1' THEN 20 WHEN 'T2' THEN 30 WHEN 'T3' THEN 0 ELSE 20 END,
  escalation_gap_min = CASE task_category
    WHEN 'T0' THEN 3  WHEN 'T1' THEN 5  WHEN 'T2' THEN 8  WHEN 'T3' THEN 0 ELSE 5 END;

ALTER TABLE sla_config ALTER COLUMN ack_timeout_min        SET NOT NULL;
ALTER TABLE sla_config ALTER COLUMN completion_timeout_min SET NOT NULL;
ALTER TABLE sla_config ALTER COLUMN escalation_gap_min     SET NOT NULL;

ALTER TABLE sla_config DROP COLUMN sla_minutes;
ALTER TABLE sla_config DROP COLUMN l0_timeout_min;
ALTER TABLE sla_config DROP COLUMN l1_timeout_min;
ALTER TABLE sla_config DROP COLUMN l2_timeout_min;
ALTER TABLE sla_config DROP COLUMN l3_timeout_min;
