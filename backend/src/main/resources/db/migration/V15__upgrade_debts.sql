-- ============================================================
-- V15 : Upgrade debts module — origin, priority, history, new statuses
-- ============================================================

-- ── New columns on tax_debts ─────────────────────────────────
ALTER TABLE tax_debts ADD COLUMN origin           VARCHAR(30)  NOT NULL DEFAULT 'ASSESSMENT';
ALTER TABLE tax_debts ADD COLUMN collection_priority VARCHAR(15) NOT NULL DEFAULT 'NORMAL';
ALTER TABLE tax_debts ADD COLUMN observations     TEXT;
ALTER TABLE tax_debts ADD COLUMN created_by       VARCHAR(100);
ALTER TABLE tax_debts ADD COLUMN last_due_date    DATE;
ALTER TABLE tax_debts ADD COLUMN suspended_at     TIMESTAMP;
ALTER TABLE tax_debts ADD COLUMN taxpayer_center  VARCHAR(40);

CREATE INDEX idx_debt_origin        ON tax_debts (origin);
CREATE INDEX idx_debt_priority      ON tax_debts (collection_priority);
CREATE INDEX idx_debt_center        ON tax_debts (taxpayer_center);

-- ── Debt history / timeline ──────────────────────────────────
CREATE TABLE debt_history (
    id          BIGSERIAL PRIMARY KEY,
    debt_id     BIGINT      NOT NULL REFERENCES tax_debts(id) ON DELETE CASCADE,
    event_type  VARCHAR(40) NOT NULL,
    description TEXT        NOT NULL,
    old_value   TEXT,
    new_value   TEXT,
    performed_by VARCHAR(100),
    event_date  TIMESTAMP   NOT NULL,
    created_at  TIMESTAMP   NOT NULL
);
CREATE INDEX idx_dh_debt   ON debt_history (debt_id);
CREATE INDEX idx_dh_type   ON debt_history (event_type);
CREATE INDEX idx_dh_date   ON debt_history (event_date);
