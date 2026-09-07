-- ============================================================
-- V26 : créances manuelles sans imposition préalable
-- Une créance peut être saisie directement (contrôle, autre source)
-- sans être rattachée à un acte d'imposition ni à un type d'impôt.
-- ============================================================

ALTER TABLE tax_debts ALTER COLUMN assessment_id DROP NOT NULL;
ALTER TABLE tax_debts ALTER COLUMN tax_type_id   DROP NOT NULL;
