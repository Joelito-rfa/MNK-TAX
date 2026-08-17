-- ============================================================
-- V6 : notifications, documents, audit, paramètres
-- ============================================================

CREATE TABLE notifications (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type        VARCHAR(40) NOT NULL,
    title       VARCHAR(200) NOT NULL,
    message     VARCHAR(1000),
    entity_type VARCHAR(50),
    entity_id   VARCHAR(100),
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    read_at     TIMESTAMP,
    created_at  TIMESTAMP NOT NULL
);
CREATE INDEX idx_notification_user ON notifications (user_id);
CREATE INDEX idx_notification_read ON notifications (is_read);
CREATE INDEX idx_notification_created ON notifications (created_at);

CREATE TABLE documents (
    id            BIGSERIAL PRIMARY KEY,
    taxpayer_id   BIGINT NOT NULL REFERENCES taxpayers (id) ON DELETE CASCADE,
    title         VARCHAR(200) NOT NULL,
    document_type VARCHAR(50),
    file_path     VARCHAR(500) NOT NULL,
    mime_type     VARCHAR(100),
    size          BIGINT NOT NULL DEFAULT 0,
    uploaded_by   VARCHAR(100),
    created_at    TIMESTAMP NOT NULL
);
CREATE INDEX idx_document_taxpayer ON documents (taxpayer_id);

CREATE TABLE audit_logs (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT,
    username    VARCHAR(100),
    action      VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id   VARCHAR(100),
    old_value   TEXT,
    new_value   TEXT,
    ip_address  VARCHAR(50),
    user_agent  VARCHAR(255),
    created_at  TIMESTAMP NOT NULL
);
CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs (created_at);
CREATE INDEX idx_audit_user ON audit_logs (username);
CREATE INDEX idx_audit_action ON audit_logs (action);

CREATE TABLE system_parameters (
    id          BIGSERIAL PRIMARY KEY,
    param_key   VARCHAR(100) NOT NULL,
    param_value VARCHAR(500) NOT NULL,
    description VARCHAR(500),
    category    VARCHAR(50),
    updated_at  TIMESTAMP NOT NULL,
    CONSTRAINT uk_parameter_key UNIQUE (param_key)
);
CREATE INDEX idx_parameter_category ON system_parameters (category);
