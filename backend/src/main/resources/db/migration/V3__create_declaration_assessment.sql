-- ============================================================
-- V3 : déclarations et impositions
-- ============================================================

CREATE TABLE declarations (
    id                  BIGSERIAL PRIMARY KEY,
    reference           VARCHAR(40)  NOT NULL,
    taxpayer_id         BIGINT       NOT NULL REFERENCES taxpayers (id),
    tax_type_id         BIGINT       NOT NULL REFERENCES tax_types (id),
    period              VARCHAR(10)  NOT NULL,
    submission_date     DATE,
    status              VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
    tax_base            NUMERIC(19, 2),
    declared_amount     NUMERIC(19, 2),
    calculated_tax      NUMERIC(19, 2),
    submitted_by        VARCHAR(100),
    submitted_at        TIMESTAMP,
    validated_by        VARCHAR(100),
    validated_at        TIMESTAMP,
    validation_comment  VARCHAR(500),
    created_at          TIMESTAMP NOT NULL,
    updated_at          TIMESTAMP NOT NULL,
    version             BIGINT,
    CONSTRAINT uk_declaration_reference UNIQUE (reference)
);
CREATE INDEX idx_declaration_taxpayer ON declarations (taxpayer_id);
CREATE INDEX idx_declaration_tax_type ON declarations (tax_type_id);
CREATE INDEX idx_declaration_status ON declarations (status);
CREATE INDEX idx_declaration_period ON declarations (period);

CREATE TABLE declaration_lines (
    id             BIGSERIAL PRIMARY KEY,
    declaration_id BIGINT NOT NULL REFERENCES declarations (id) ON DELETE CASCADE,
    line_number    INTEGER NOT NULL,
    label          VARCHAR(255) NOT NULL,
    amount         NUMERIC(19, 2) NOT NULL
);

CREATE TABLE assessments (
    id               BIGSERIAL PRIMARY KEY,
    reference        VARCHAR(40) NOT NULL,
    declaration_id   BIGINT      NOT NULL UNIQUE REFERENCES declarations (id),
    taxpayer_id      BIGINT      NOT NULL REFERENCES taxpayers (id),
    tax_type_id      BIGINT      NOT NULL REFERENCES tax_types (id),
    period           VARCHAR(10) NOT NULL,
    tax_base         NUMERIC(19, 2),
    gross_tax        NUMERIC(19, 2),
    deduction        NUMERIC(19, 2),
    credit           NUMERIC(19, 2),
    adjustment       NUMERIC(19, 2),
    net_tax          NUMERIC(19, 2),
    calculation_date DATE        NOT NULL,
    rule_code        VARCHAR(40),
    rule_version     INTEGER,
    computed_by      VARCHAR(100),
    created_at       TIMESTAMP   NOT NULL,
    version          BIGINT,
    CONSTRAINT uk_assessment_reference UNIQUE (reference)
);
CREATE INDEX idx_assessment_taxpayer ON assessments (taxpayer_id);
CREATE INDEX idx_assessment_tax_type ON assessments (tax_type_id);
CREATE INDEX idx_assessment_period ON assessments (period);

CREATE TABLE assessment_lines (
    id                BIGSERIAL PRIMARY KEY,
    assessment_id     BIGINT NOT NULL REFERENCES assessments (id) ON DELETE CASCADE,
    line_number       INTEGER NOT NULL,
    label             VARCHAR(255) NOT NULL,
    base_amount       NUMERIC(19, 2),
    rate              NUMERIC(19, 6),
    calculated_amount NUMERIC(19, 2)
);
