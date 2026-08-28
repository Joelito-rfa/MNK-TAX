-- ============================================================
-- V19 : Enrichissement du module Quittances
-- ============================================================

-- Nouvelles colonnes sur receipts
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS verification_token VARCHAR(64);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS declaration_id BIGINT REFERENCES declarations (id);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS debt_id BIGINT REFERENCES tax_debts (id);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'MGA';
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS transaction_reference VARCHAR(100);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS payment_date DATE;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS center_code VARCHAR(40);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS pdf_path VARCHAR(500);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS download_count INT DEFAULT 0;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);

-- Mise à jour
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

-- Annulation / Remplacement
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS cancelled_reason VARCHAR(1000);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(100);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS replaced_by_reference VARCHAR(40);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS replaced_at TIMESTAMP;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS refund_reference VARCHAR(40);

-- Générer un verification_token pour les quittances existantes
-- (syntaxe portable H2 / PostgreSQL : pas de MD5 natif en H2)
UPDATE receipts SET verification_token =
    'VRF-' || UPPER(SUBSTRING(CONCAT(
        LPAD(CAST(MOD(FLOOR(RANDOM() * 1000000), 1000000) AS VARCHAR(6)), 6, '0'),
        LPAD(CAST(MOD(FLOOR(RANDOM() * 1000000), 1000000) AS VARCHAR(6)), 6, '0'),
        LPAD(CAST(MOD(FLOOR(RANDOM() * 1000000), 1000000) AS VARCHAR(6)), 6, '0')
    ), 1, 16))
WHERE verification_token IS NULL;

-- Rendre le token non nullable après initialisation
ALTER TABLE receipts ALTER COLUMN verification_token SET NOT NULL;
ALTER TABLE receipts ADD CONSTRAINT uk_receipt_verification_token UNIQUE (verification_token);

-- Index
CREATE INDEX IF NOT EXISTS idx_receipt_verification_token ON receipts (verification_token);
CREATE INDEX IF NOT EXISTS idx_receipt_payment ON receipts (payment_id);
CREATE INDEX IF NOT EXISTS idx_receipt_declaration ON receipts (declaration_id);
CREATE INDEX IF NOT EXISTS idx_receipt_debt ON receipts (debt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_status ON receipts (status);
CREATE INDEX IF NOT EXISTS idx_receipt_number ON receipts (receipt_number);

-- Nouvelles permissions
INSERT INTO permissions (code, name) VALUES
    ('RECEIPT_DOWNLOAD', 'Télécharger les quittances'),
    ('RECEIPT_VERIFY', 'Vérifier les quittances'),
    ('RECEIPT_CANCEL', 'Annuler les quittances'),
    ('RECEIPT_REPLACE', 'Remplacer les quittances'),
    ('RECEIPT_REFUND', 'Rembourser les quittances'),
    ('RECEIPT_EXPORT', 'Exporter les quittances');

-- NB : la contrainte uk_receipt_number UNIQUE (receipt_number) est déjà
-- créée par V5__create_payment_receipt.sql, aucun bloc procédural requis.
