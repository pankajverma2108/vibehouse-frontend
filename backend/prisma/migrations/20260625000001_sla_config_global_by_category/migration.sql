-- Decouple SLA timing from department / priority / property.
--
-- The turn-around time depends ONLY on the task class (T0 immediate / T1 housekeeping
-- / T2 maintenance / T3 critical) — a T0 is 10 min whether Housekeeping delivers a
-- towel or Reception sends an invoice. Department is decided separately and only
-- drives assignment; priority was redundant with the class. So sla_config becomes a
-- single GLOBAL row per task_category.

-- 1. Collapse to one row per task_category. The old per-(property×department×priority)
--    rows carry identical timings, so keep an arbitrary representative per class.
DELETE FROM sla_config
WHERE id NOT IN (
  SELECT DISTINCT ON (task_category) id
  FROM sla_config
  ORDER BY task_category, id
);

-- 2. Drop the now-meaningless columns. CASCADE also removes the composite unique
--    constraint, the lookup index, and the properties FK that reference them.
ALTER TABLE sla_config DROP COLUMN IF EXISTS property_id CASCADE;
ALTER TABLE sla_config DROP COLUMN IF EXISTS department  CASCADE;
ALTER TABLE sla_config DROP COLUMN IF EXISTS priority    CASCADE;

-- 3. task_category is now the natural unique key.
ALTER TABLE sla_config ADD CONSTRAINT sla_config_task_category_key UNIQUE (task_category);
