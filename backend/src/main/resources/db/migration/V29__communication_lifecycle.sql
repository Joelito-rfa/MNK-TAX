-- ============================================================
-- V29 : Centre de communication — cycle de vie réel des envois
--   * messages.status / scheduled_at / created_by
--   * message_deliveries (canal, statut, retry, provider refs)
--   * taxpayers.language / preferred_channels / phone_normalized
-- ============================================================

-- 1. Statut d'envoi sur messages (historique existant = déjà distribué en interne)
ALTER TABLE messages ADD COLUMN status         VARCHAR(30) NOT NULL DEFAULT 'SENT';
ALTER TABLE messages ADD COLUMN scheduled_at   TIMESTAMP;
ALTER TABLE messages ADD COLUMN created_by     VARCHAR(100);
CREATE INDEX idx_message_status    ON messages (status);
CREATE INDEX idx_message_scheduled ON messages (scheduled_at);

-- 2. Livraisons par canal
CREATE TABLE message_deliveries (
    id                  BIGSERIAL PRIMARY KEY,
    message_id          BIGINT       NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    channel             VARCHAR(20)  NOT NULL,
    recipient_address   VARCHAR(255),
    status              VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    attempt_count       INTEGER      NOT NULL DEFAULT 0,
    max_attempts        INTEGER      NOT NULL DEFAULT 3,
    last_error          VARCHAR(1000),
    next_retry_at       TIMESTAMP,
    provider_message_id VARCHAR(100),
    sent_at             TIMESTAMP,
    delivered_at        TIMESTAMP,
    read_at             TIMESTAMP,
    created_at          TIMESTAMP    NOT NULL,
    updated_at          TIMESTAMP    NOT NULL
);
CREATE INDEX idx_delivery_message  ON message_deliveries (message_id);
CREATE INDEX idx_delivery_due      ON message_deliveries (status, next_retry_at);
CREATE INDEX idx_delivery_channel  ON message_deliveries (channel, status);

-- 3. Historique : chaque message existant a été remis en interne (lu ou non)
INSERT INTO message_deliveries
    (message_id, channel, recipient_address, status, attempt_count, max_attempts,
     sent_at, delivered_at, read_at, created_at, updated_at)
SELECT id, 'IN_APP', NULL,
       CASE WHEN is_read THEN 'READ' ELSE 'DELIVERED' END,
       1, 3,
       created_at, created_at, read_at, created_at, created_at
FROM messages;

-- 4. Préférences de communication du contribuable
ALTER TABLE taxpayers ADD COLUMN language            VARCHAR(5)   NOT NULL DEFAULT 'FR';
ALTER TABLE taxpayers ADD COLUMN preferred_channels  VARCHAR(100) NOT NULL DEFAULT 'IN_APP';
ALTER TABLE taxpayers ADD COLUMN phone_normalized    VARCHAR(20);
UPDATE taxpayers SET phone_normalized = regexp_replace(COALESCE(phone, ''), '[^0-9]', '');
CREATE INDEX idx_taxpayer_phone_norm ON taxpayers (phone_normalized);
