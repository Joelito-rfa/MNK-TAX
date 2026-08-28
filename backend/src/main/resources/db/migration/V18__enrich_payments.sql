-- ============================================================
-- V18 : Enrichissement du module paiements
-- ============================================================

-- Nouvelles colonnes sur payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS debt_id BIGINT REFERENCES tax_debts (id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS declaration_id BIGINT REFERENCES declarations (id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'MGA';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS transaction_reference VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS unpaid_amount NUMERIC(19, 2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS observations VARCHAR(1000);

-- Index
CREATE INDEX IF NOT EXISTS idx_payment_reference ON payments (reference);
CREATE INDEX IF NOT EXISTS idx_payment_debt ON payments (debt_id);

-- Nouvelle colonne sur payment_allocations
ALTER TABLE payment_allocations ADD COLUMN IF NOT EXISTS comment VARCHAR(500);
