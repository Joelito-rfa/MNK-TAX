-- ============================================================
-- V28 : Litiges / contentieux des créances fiscales
-- Un litige documente une contestation du contribuable sur une
-- créance : motif, montant contesté, décision. Le statut de la
-- créance passe à DISPUTED à la déclaration ; la décision est
-- enregistrée par un agent autorisé (aucune décision juridique
-- n'est jamais déduite automatiquement).
-- ============================================================

CREATE TABLE debt_disputes (
    id               BIGSERIAL PRIMARY KEY,
    reference        VARCHAR(40)  NOT NULL,
    debt_id          BIGINT       NOT NULL REFERENCES tax_debts (id) ON DELETE CASCADE,
    reason           VARCHAR(1000) NOT NULL,
    contested_amount NUMERIC(19, 2),
    contestation_date DATE        NOT NULL,
    status           VARCHAR(20)  NOT NULL DEFAULT 'OPEN',      -- OPEN / RESOLVED
    decision         VARCHAR(20),                                -- SUSTAINED / REJECTED / WITHDRAWN
    decision_notes   VARCHAR(1000),
    decided_by       VARCHAR(100),
    decided_at       TIMESTAMP,
    created_by       VARCHAR(100),
    created_at       TIMESTAMP    NOT NULL,
    updated_at       TIMESTAMP    NOT NULL,
    CONSTRAINT uk_dispute_reference UNIQUE (reference)
);
CREATE INDEX idx_dispute_debt    ON debt_disputes (debt_id);
CREATE INDEX idx_dispute_status  ON debt_disputes (status);
