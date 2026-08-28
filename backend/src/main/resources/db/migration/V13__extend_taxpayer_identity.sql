-- ============================================================
-- V12 : identité complète du contribuable
-- ============================================================

ALTER TABLE taxpayers ADD COLUMN birth_date DATE;
ALTER TABLE taxpayers ADD COLUMN legal_representative VARCHAR(200);
ALTER TABLE taxpayers ADD COLUMN registration_date DATE;
