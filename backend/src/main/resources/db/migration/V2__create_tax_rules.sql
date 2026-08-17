-- ============================================================
-- V2 : moteur de règles fiscales + échéances configurables
-- ============================================================

CREATE TABLE tax_rules (
    id                BIGSERIAL PRIMARY KEY,
    code              VARCHAR(40)  NOT NULL,
    name              VARCHAR(200) NOT NULL,
    tax_type_id       BIGINT       NOT NULL REFERENCES tax_types (id),
    taxpayer_type     VARCHAR(20),
    regime_id         BIGINT       REFERENCES tax_regimes (id),
    activity_code     VARCHAR(40),
    calculation_method VARCHAR(30) NOT NULL,
    rate              NUMERIC(19, 6),
    minimum           NUMERIC(19, 2),
    maximum           NUMERIC(19, 2),
    deduction         NUMERIC(19, 2),
    exemption         NUMERIC(19, 2),
    legal_reference   VARCHAR(255),
    is_demo           BOOLEAN      NOT NULL DEFAULT TRUE,
    effective_from    DATE         NOT NULL,
    effective_to      DATE,
    is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMP    NOT NULL,
    created_by        VARCHAR(100),
    CONSTRAINT uk_tax_rule_code UNIQUE (code)
);
CREATE INDEX idx_rule_tax_type ON tax_rules (tax_type_id);
CREATE INDEX idx_rule_effective ON tax_rules (effective_from, effective_to);
CREATE INDEX idx_rule_active ON tax_rules (is_active);

CREATE TABLE tax_rule_versions (
    id             BIGSERIAL PRIMARY KEY,
    rule_id        BIGINT NOT NULL REFERENCES tax_rules (id) ON DELETE CASCADE,
    version_number INTEGER      NOT NULL,
    snapshot       TEXT         NOT NULL,
    reason         VARCHAR(500),
    changed_by     VARCHAR(100),
    created_at     TIMESTAMP    NOT NULL
);
CREATE INDEX idx_rule_version_rule ON tax_rule_versions (rule_id);
CREATE INDEX idx_rule_version_number ON tax_rule_versions (rule_id, version_number);

CREATE TABLE deadlines (
    id                    BIGSERIAL PRIMARY KEY,
    tax_type_id           BIGINT NOT NULL REFERENCES tax_types (id),
    period                VARCHAR(10) NOT NULL,
    declaration_deadline  DATE    NOT NULL,
    payment_deadline      DATE    NOT NULL,
    created_at            TIMESTAMP NOT NULL
);
CREATE INDEX idx_deadline_tax_type ON deadlines (tax_type_id);
CREATE INDEX idx_deadline_period ON deadlines (period);
