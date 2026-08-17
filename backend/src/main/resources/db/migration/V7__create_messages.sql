-- ============================================================
-- V7 : messagerie interne
-- ============================================================

CREATE TABLE messages (
    id            BIGSERIAL PRIMARY KEY,
    sender_id     BIGINT REFERENCES users (id) ON DELETE SET NULL,
    sender_name   VARCHAR(100) NOT NULL,
    recipient_id  BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    subject       VARCHAR(200),
    content       TEXT NOT NULL,
    is_read       BOOLEAN NOT NULL DEFAULT FALSE,
    read_at       TIMESTAMP,
    created_at    TIMESTAMP NOT NULL
);
CREATE INDEX idx_message_recipient ON messages (recipient_id, created_at);
CREATE INDEX idx_message_sender ON messages (sender_id);
CREATE INDEX idx_message_read ON messages (recipient_id, is_read);
