-- ============================================================
-- V27 : Échéanciers / plans de paiement (recouvrement amiable)
-- Un plan découpe une créance en tranches ; les paiements
-- réels restent enregistrés dans le module Paiements et sont
-- répercutés automatiquement sur les tranches (source de
-- vérité unique : payment_allocations).
-- ============================================================

CREATE TABLE payment_plans (
    id          BIGSERIAL PRIMARY KEY,
    reference   VARCHAR(40)  NOT NULL,
    debt_id     BIGINT       NOT NULL REFERENCES tax_debts (id) ON DELETE CASCADE,
    label       VARCHAR(255) NOT NULL,
    total_amount NUMERIC(19, 2) NOT NULL DEFAULT 0,
    status      VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    notes       VARCHAR(1000),
    created_by  VARCHAR(100),
    created_at  TIMESTAMP    NOT NULL,
    updated_at  TIMESTAMP    NOT NULL,
    CONSTRAINT uk_payment_plan_reference UNIQUE (reference)
);
CREATE INDEX idx_plan_debt   ON payment_plans (debt_id);
CREATE INDEX idx_plan_status ON payment_plans (status);

CREATE TABLE payment_plan_installments (
    id                 BIGSERIAL PRIMARY KEY,
    plan_id            BIGINT NOT NULL REFERENCES payment_plans (id) ON DELETE CASCADE,
    installment_number INT NOT NULL,
    due_date           DATE NOT NULL,
    amount             NUMERIC(19, 2) NOT NULL,
    paid_amount        NUMERIC(19, 2) NOT NULL DEFAULT 0,
    status             VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    paid_at            TIMESTAMP,
    created_at         TIMESTAMP NOT NULL,
    updated_at         TIMESTAMP NOT NULL,
    CONSTRAINT uk_plan_installment_number UNIQUE (plan_id, installment_number)
);
CREATE INDEX idx_plan_inst_plan ON payment_plan_installments (plan_id);
CREATE INDEX idx_plan_inst_due  ON payment_plan_installments (due_date);
