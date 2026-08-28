-- ============================================================
-- V14 : Contrôle fiscal, Réclamations, Remboursements
-- ============================================================

-- ── Contrôle fiscal ──────────────────────────────────────────
CREATE TABLE tax_controls (
    id              BIGSERIAL PRIMARY KEY,
    reference       VARCHAR(40) NOT NULL UNIQUE,
    taxpayer_id     BIGINT NOT NULL REFERENCES taxpayers(id),
    agent_id        BIGINT REFERENCES users(id),
    control_type    VARCHAR(30) NOT NULL,
    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,
    reason          VARCHAR(500) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    started_at      TIMESTAMP,
    completed_at    TIMESTAMP,
    observations    TEXT,
    anomalies       TEXT,
    redressement    NUMERIC(19,2),
    penalty_amount  NUMERIC(19,2),
    debt_id         BIGINT REFERENCES tax_debts(id),
    created_at      TIMESTAMP NOT NULL,
    updated_at      TIMESTAMP NOT NULL,
    version         BIGINT
);
CREATE INDEX idx_tc_taxpayer ON tax_controls(taxpayer_id);
CREATE INDEX idx_tc_status ON tax_controls(status);
CREATE INDEX idx_tc_agent ON tax_controls(agent_id);

-- ── Documents de contrôle ────────────────────────────────────
CREATE TABLE control_documents (
    id              BIGSERIAL PRIMARY KEY,
    control_id      BIGINT NOT NULL REFERENCES tax_controls(id) ON DELETE CASCADE,
    title           VARCHAR(200) NOT NULL,
    document_type   VARCHAR(50),
    requested       BOOLEAN NOT NULL DEFAULT TRUE,
    received        BOOLEAN NOT NULL DEFAULT FALSE,
    notes           VARCHAR(500),
    created_at      TIMESTAMP NOT NULL
);
CREATE INDEX idx_cd_control ON control_documents(control_id);

-- ── Réclamations ─────────────────────────────────────────────
CREATE TABLE complaints (
    id              BIGSERIAL PRIMARY KEY,
    reference       VARCHAR(40) NOT NULL UNIQUE,
    taxpayer_id     BIGINT NOT NULL REFERENCES taxpayers(id),
    subject         VARCHAR(200) NOT NULL,
    description     TEXT NOT NULL,
    context_type    VARCHAR(30) NOT NULL DEFAULT 'GENERAL',
    context_ref     VARCHAR(40),
    declaration_id  BIGINT REFERENCES declarations(id),
    debt_id         BIGINT REFERENCES tax_debts(id),
    payment_id      BIGINT REFERENCES payments(id),
    control_id      BIGINT REFERENCES tax_controls(id),
    refund_id       BIGINT,
    status          VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    assigned_to     BIGINT REFERENCES users(id),
    resolution      TEXT,
    resolved_at     TIMESTAMP,
    closed_at       TIMESTAMP,
    created_at      TIMESTAMP NOT NULL,
    updated_at      TIMESTAMP NOT NULL,
    version         BIGINT
);
CREATE INDEX idx_cmpl_taxpayer ON complaints(taxpayer_id);
CREATE INDEX idx_cmpl_status ON complaints(status);
CREATE INDEX idx_cmpl_context ON complaints(context_type, context_ref);

-- ── Réponses aux réclamations ────────────────────────────────
CREATE TABLE complaint_responses (
    id              BIGSERIAL PRIMARY KEY,
    complaint_id    BIGINT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    author_id       BIGINT REFERENCES users(id),
    author_name     VARCHAR(100) NOT NULL,
    content         TEXT NOT NULL,
    created_at      TIMESTAMP NOT NULL
);
CREATE INDEX idx_cres_complaint ON complaint_responses(complaint_id);

-- ── Remboursements ───────────────────────────────────────────
CREATE TABLE refunds (
    id              BIGSERIAL PRIMARY KEY,
    reference       VARCHAR(40) NOT NULL UNIQUE,
    taxpayer_id     BIGINT NOT NULL REFERENCES taxpayers(id),
    debt_id         BIGINT REFERENCES tax_debts(id),
    declaration_id  BIGINT REFERENCES declarations(id),
    reason          VARCHAR(30) NOT NULL,
    description     TEXT,
    amount          NUMERIC(19,2) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    requested_by    VARCHAR(100),
    reviewed_by     VARCHAR(100),
    reviewed_at     TIMESTAMP,
    approved_amount NUMERIC(19,2),
    payment_method  VARCHAR(20),
    payment_reference VARCHAR(100),
    paid_at         TIMESTAMP,
    rejection_reason VARCHAR(500),
    created_at      TIMESTAMP NOT NULL,
    updated_at      TIMESTAMP NOT NULL,
    version         BIGINT
);
CREATE INDEX idx_ref_taxpayer ON refunds(taxpayer_id);
CREATE INDEX idx_ref_status ON refunds(status);
