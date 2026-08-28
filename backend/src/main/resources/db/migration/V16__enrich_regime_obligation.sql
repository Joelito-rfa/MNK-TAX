-- ============================================================
-- V15 : Enrichir régimes fiscaux + obligations
-- ============================================================

-- ── Tax Regime enrichi ───────────────────────────────────────
ALTER TABLE tax_regimes ADD COLUMN vat_applicable BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tax_regimes ADD COLUMN obligation_periodicity VARCHAR(20);
ALTER TABLE tax_regimes ADD COLUMN applicable_tax_types VARCHAR(500);

-- ── Tax Obligation enrichi ───────────────────────────────────
ALTER TABLE tax_obligations ADD COLUMN tax_regime_id BIGINT REFERENCES tax_regimes(id);
ALTER TABLE tax_obligations ADD COLUMN tax_center_id BIGINT REFERENCES tax_centers(id);
ALTER TABLE tax_obligations ADD COLUMN period VARCHAR(10);
ALTER TABLE tax_obligations ADD COLUMN declaration_deadline DATE;
ALTER TABLE tax_obligations ADD COLUMN payment_deadline DATE;
ALTER TABLE tax_obligations ADD COLUMN expected_amount NUMERIC(19,2);
ALTER TABLE tax_obligations ADD COLUMN declaration_status VARCHAR(20) NOT NULL DEFAULT 'NOT_SUBMITTED';
ALTER TABLE tax_obligations ADD COLUMN payment_status VARCHAR(20) NOT NULL DEFAULT 'UNPAID';
ALTER TABLE tax_obligations ADD COLUMN updated_at TIMESTAMP;

CREATE INDEX idx_obligation_regime ON tax_obligations(tax_regime_id);
CREATE INDEX idx_obligation_center ON tax_obligations(tax_center_id);
