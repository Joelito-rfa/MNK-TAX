-- ============================================================
-- V34 : cycle de vie complet des impositions
-- - origines : DECLARATIVE, RECTIFICATIVE (delta), REDRESSEMENT, OFFICE
-- - statut, exonération, imposition parente, traçabilité
-- - declaration_id devient nullable (office / redressement sans déclaration)
-- ============================================================

ALTER TABLE assessments ALTER COLUMN declaration_id DROP NOT NULL;

ALTER TABLE assessments ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'EMISED';
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS origin VARCHAR(20) NOT NULL DEFAULT 'DECLARATIVE';
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS exemption NUMERIC(19, 2);
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS parent_id BIGINT REFERENCES assessments (id);
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS notified_at TIMESTAMP;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS observations VARCHAR(500);

-- Index simple (compatible H2 + Postgres). L'unicité métier
-- (1 déclarative par contribuable/impôt/période) est contrôlée
-- dans AssessmentService avec l'erreur ASSESSMENT_PERIOD_EXISTS.
CREATE INDEX IF NOT EXISTS idx_assessment_taxpayer_period
    ON assessments (taxpayer_id, tax_type_id, period);

CREATE INDEX IF NOT EXISTS idx_assessment_status ON assessments (status);
CREATE INDEX IF NOT EXISTS idx_assessment_origin ON assessments (origin);

CREATE TABLE IF NOT EXISTS assessment_history (
    id            BIGSERIAL PRIMARY KEY,
    assessment_id BIGINT NOT NULL REFERENCES assessments (id) ON DELETE CASCADE,
    username      VARCHAR(100),
    action        VARCHAR(40) NOT NULL,
    old_value     VARCHAR(500),
    new_value     VARCHAR(500),
    commentaire   VARCHAR(500),
    created_at    TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_assessment_history_assessment ON assessment_history (assessment_id);
