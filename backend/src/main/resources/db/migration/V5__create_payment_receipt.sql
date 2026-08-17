-- ============================================================
-- V5 : paiements, allocations et quittances
-- ============================================================

CREATE TABLE payments (
    id               BIGSERIAL PRIMARY KEY,
    reference        VARCHAR(40) NOT NULL,
    taxpayer_id      BIGINT      NOT NULL REFERENCES taxpayers (id),
    payment_date     DATE        NOT NULL,
    amount           NUMERIC(19, 2) NOT NULL,
    method           VARCHAR(20) NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'RECORDED',
    allocated_amount NUMERIC(19, 2),
    rejection_reason VARCHAR(500),
    created_by       VARCHAR(100),
    recorded_at      TIMESTAMP   NOT NULL,
    created_at       TIMESTAMP   NOT NULL,
    updated_at       TIMESTAMP   NOT NULL,
    version          BIGINT,
    CONSTRAINT uk_payment_reference UNIQUE (reference)
);
CREATE INDEX idx_payment_taxpayer ON payments (taxpayer_id);
CREATE INDEX idx_payment_date ON payments (payment_date);
CREATE INDEX idx_payment_status ON payments (status);

CREATE TABLE payment_allocations (
    id           BIGSERIAL PRIMARY KEY,
    payment_id   BIGINT NOT NULL REFERENCES payments (id) ON DELETE CASCADE,
    debt_id      BIGINT NOT NULL REFERENCES tax_debts (id),
    amount       NUMERIC(19, 2) NOT NULL,
    component    VARCHAR(20) NOT NULL,
    allocated_at TIMESTAMP NOT NULL,
    created_by   VARCHAR(100)
);
CREATE INDEX idx_alloc_payment ON payment_allocations (payment_id);
CREATE INDEX idx_alloc_debt ON payment_allocations (debt_id);

CREATE TABLE receipts (
    id             BIGSERIAL PRIMARY KEY,
    reference      VARCHAR(40) NOT NULL,
    payment_id     BIGINT      NOT NULL UNIQUE REFERENCES payments (id),
    receipt_number VARCHAR(40) NOT NULL,
    taxpayer_id    BIGINT      NOT NULL REFERENCES taxpayers (id),
    tax_type_id    BIGINT      NOT NULL REFERENCES tax_types (id),
    period         VARCHAR(10) NOT NULL,
    amount         NUMERIC(19, 2) NOT NULL,
    method         VARCHAR(20) NOT NULL,
    status         VARCHAR(20) NOT NULL DEFAULT 'ISSUED',
    qr_code_path   VARCHAR(255),
    issued_at      TIMESTAMP NOT NULL,
    verified_at    TIMESTAMP,
    created_at     TIMESTAMP NOT NULL,
    CONSTRAINT uk_receipt_reference UNIQUE (reference),
    CONSTRAINT uk_receipt_number UNIQUE (receipt_number)
);
CREATE INDEX idx_receipt_taxpayer ON receipts (taxpayer_id);
CREATE INDEX idx_receipt_created ON receipts (issued_at);
