-- ============================================================
-- V8 : étendre collection_actions avec prochaine action
-- ============================================================

ALTER TABLE collection_actions ADD COLUMN next_action VARCHAR(500);
ALTER TABLE collection_actions ADD COLUMN next_action_date DATE;
