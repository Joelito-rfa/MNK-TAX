-- ============================================================
-- V22 : Permettre plusieurs quittances par paiement
-- ============================================================
-- Le remplacement d'une quittance (RECEIPT_REPLACE) crée une NOUVELLE
-- quittance pour le MÊME paiement. L'unicité sur receipts.payment_id
-- imposée par V5 empêche donc ce flux métier légitime.

-- PostgreSQL : nom déterministe <table>_<colonne>_key
ALTER TABLE receipts DROP CONSTRAINT IF EXISTS receipts_payment_id_key;

-- H2 : contrainte UNIQUE anonyme créée par V5 sur payment_id
ALTER TABLE receipts DROP CONSTRAINT IF EXISTS "CONSTRAINT_CF";

-- Sur H2, l'index unique généré est possédé par la contrainte FK anonyme
-- voisine ("CONSTRAINT_CFC") : on la supprime pour libérer l'index,
-- puis on recrée la FK sans unicité.
ALTER TABLE receipts DROP CONSTRAINT IF EXISTS "CONSTRAINT_CFC";
DROP INDEX IF EXISTS "CONSTRAINT_CF_INDEX_F";
ALTER TABLE receipts ADD CONSTRAINT fk_receipts_payment
    FOREIGN KEY (payment_id) REFERENCES payments (id);

-- L'index de performance non unique (idx_receipt_payment, V19) est conservé.
