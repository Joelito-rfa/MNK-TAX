-- ============================================================
-- V40 : relance automatique des emails en retard / en échec
-- ============================================================
-- * auto_retry_count : nombre de cycles de relance automatique déjà
--   accordés à une livraison (plafonné par la configuration).
-- * last_error_retryable : vrai si la dernière erreur est temporaire
--   (réseau, 429/5xx, fournisseur indisponible). Les erreurs définitives
--   (adresse invalide, 422…) ne sont jamais relancées automatiquement.
-- * last_attempt_at : date de la dernière tentative réelle, utilisée pour
--   détecter une livraison restée bloquée en SENDING (arrêt brutal du serveur).
ALTER TABLE message_deliveries ADD COLUMN auto_retry_count    INTEGER   NOT NULL DEFAULT 0;
ALTER TABLE message_deliveries ADD COLUMN last_error_retryable BOOLEAN   NOT NULL DEFAULT TRUE;
ALTER TABLE message_deliveries ADD COLUMN last_attempt_at      TIMESTAMP;

CREATE INDEX idx_delivery_auto_retry
    ON message_deliveries (channel, status, last_error_retryable, auto_retry_count);
CREATE INDEX idx_delivery_sending
    ON message_deliveries (status, last_attempt_at);
