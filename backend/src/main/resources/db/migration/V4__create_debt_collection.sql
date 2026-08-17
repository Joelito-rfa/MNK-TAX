-- ============================================================
-- V4 : créances fiscales + recouvrement
-- ============================================================

CREATE TABLE penalties (
    id          BIGSERIAL PRIMARY KEY,
    code        VARCHAR(40) NOT NULL,
    name        VARCHAR(150) NOT NULL,
    rate        NUMERIC(19, 6) NOT NULL,
    min_amount  NUMERIC(19, 2),
    max_amount  NUMERIC(19, 2),
    description VARCHAR(500),
    CONSTRAINT uk_penalty_code UNIQUE (code)
);

CREATE TABLE interests (
    id          BIGSERIAL PRIMARY KEY,
    code        VARCHAR(40) NOT NULL,
    name        VARCHAR(150) NOT NULL,
    rate        NUMERIC(19, 6) NOT NULL,
    periodicity VARCHAR(30) NOT NULL,
    description VARCHAR(500),
    CONSTRAINT uk_interest_code UNIQUE (code)
);

CREATE TABLE tax_debts (
    id                 BIGSERIAL PRIMARY KEY,
    reference          VARCHAR(40) NOT NULL,
    taxpayer_id        BIGINT      NOT NULL REFERENCES taxpayers (id),
    assessment_id      BIGINT      NOT NULL REFERENCES assessments (id),
    tax_type_id        BIGINT      NOT NULL REFERENCES tax_types (id),
    period             VARCHAR(10) NOT NULL,
    principal_amount   NUMERIC(19, 2) NOT NULL DEFAULT 0,
    penalty_amount     NUMERIC(19, 2) NOT NULL DEFAULT 0,
    interest_amount    NUMERIC(19, 2) NOT NULL DEFAULT 0,
    adjustments_amount NUMERIC(19, 2) NOT NULL DEFAULT 0,
    credits_amount     NUMERIC(19, 2) NOT NULL DEFAULT 0,
    total_amount       NUMERIC(19, 2) NOT NULL DEFAULT 0,
    paid_amount        NUMERIC(19, 2) NOT NULL DEFAULT 0,
    balance            NUMERIC(19, 2) NOT NULL DEFAULT 0,
    issue_date         DATE    NOT NULL,
    due_date           DATE    NOT NULL,
    status             VARCHAR(20) NOT NULL DEFAULT 'ISSUED',
    closed_at          TIMESTAMP,
    created_at         TIMESTAMP NOT NULL,
    updated_at         TIMESTAMP NOT NULL,
    version            BIGINT,
    CONSTRAINT uk_debt_reference UNIQUE (reference)
);
CREATE INDEX idx_debt_taxpayer ON tax_debts (taxpayer_id);
CREATE INDEX idx_debt_status ON tax_debts (status);
CREATE INDEX idx_debt_due_date ON tax_debts (due_date);
CREATE INDEX idx_debt_assessment ON tax_debts (assessment_id);

CREATE TABLE debt_items (
    id         BIGSERIAL PRIMARY KEY,
    debt_id    BIGINT NOT NULL REFERENCES tax_debts (id) ON DELETE CASCADE,
    kind       VARCHAR(20) NOT NULL,
    label      VARCHAR(255) NOT NULL,
    amount     NUMERIC(19, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL
);
CREATE INDEX idx_debt_items_debt ON debt_items (debt_id);

CREATE TABLE collection_actions (
    id                  BIGSERIAL PRIMARY KEY,
    debt_id             BIGINT NOT NULL REFERENCES tax_debts (id) ON DELETE CASCADE,
    type                VARCHAR(30) NOT NULL,
    description         VARCHAR(1000) NOT NULL,
    action_date         DATE NOT NULL,
    outcome             VARCHAR(500),
    responsible_user_id BIGINT REFERENCES users (id),
    status              VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
    created_at          TIMESTAMP NOT NULL
);
CREATE INDEX idx_collection_debt ON collection_actions (debt_id);
CREATE INDEX idx_collection_date ON collection_actions (action_date);

CREATE TABLE collection_notices (
    id            BIGSERIAL PRIMARY KEY,
    debt_id       BIGINT NOT NULL REFERENCES tax_debts (id) ON DELETE CASCADE,
    notice_number VARCHAR(40) NOT NULL,
    notice_date   DATE NOT NULL,
    notice_type   VARCHAR(30) NOT NULL,
    content       VARCHAR(2000),
    sent_at       TIMESTAMP,
    status        VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    created_at    TIMESTAMP NOT NULL
);
CREATE INDEX idx_notice_debt ON collection_notices (debt_id);
CREATE INDEX idx_notice_number ON collection_notices (notice_number);
