-- ============================================================
-- V12 : Upgrade messagerie — contexte fiscal, threads,
--       priorités, statuts, pièces jointes
-- ============================================================

-- 1. Nouvelles colonnes sur messages
ALTER TABLE messages ADD COLUMN thread_id       BIGINT;
ALTER TABLE messages ADD COLUMN context_type    VARCHAR(30)  NOT NULL DEFAULT 'GENERAL';
ALTER TABLE messages ADD COLUMN context_ref     VARCHAR(40);
ALTER TABLE messages ADD COLUMN taxpayer_id     BIGINT REFERENCES taxpayers(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN declaration_id  BIGINT REFERENCES declarations(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN debt_id         BIGINT REFERENCES tax_debts(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN payment_id      BIGINT REFERENCES payments(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN priority        VARCHAR(20)  NOT NULL DEFAULT 'NORMAL';
ALTER TABLE messages ADD COLUMN processing_status VARCHAR(30) NOT NULL DEFAULT 'WAITING_RESPONSE';
ALTER TABLE messages ADD COLUMN closed_at       TIMESTAMP;
ALTER TABLE messages ADD COLUMN archived_at     TIMESTAMP;
ALTER TABLE messages ADD COLUMN updated_at      TIMESTAMP;

-- thread_id : les messages sans thread pointent vers eux-mêmes
UPDATE messages SET thread_id = id WHERE thread_id IS NULL;
ALTER TABLE messages ALTER COLUMN thread_id SET NOT NULL;

-- 2. Index
CREATE INDEX idx_message_thread     ON messages (thread_id, created_at);
CREATE INDEX idx_message_context    ON messages (context_type);
CREATE INDEX idx_message_taxpayer   ON messages (taxpayer_id);
CREATE INDEX idx_message_priority   ON messages (priority);
CREATE INDEX idx_message_proc       ON messages (processing_status);
CREATE INDEX idx_message_archived   ON messages (archived_at);

-- 3. Table des pièces jointes
CREATE TABLE message_attachments (
    id              BIGSERIAL PRIMARY KEY,
    message_id      BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    file_name       VARCHAR(255) NOT NULL,
    original_name   VARCHAR(255) NOT NULL,
    mime_type       VARCHAR(100) NOT NULL,
    size            BIGINT       NOT NULL,
    uploaded_by     VARCHAR(100) NOT NULL,
    created_at      TIMESTAMP    NOT NULL
);
CREATE INDEX idx_attach_message ON message_attachments (message_id);
