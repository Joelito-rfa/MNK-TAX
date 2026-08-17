-- ============================================================
-- MNK-TAX - Prototype académique - Schéma initial
-- V1 : sécurité (rôles, permissions, utilisateurs) + contribuables
-- ============================================================

CREATE TABLE roles (
    id          BIGSERIAL PRIMARY KEY,
    code        VARCHAR(40)  NOT NULL,
    name        VARCHAR(80)  NOT NULL,
    description VARCHAR(255),
    is_system   BOOLEAN      NOT NULL DEFAULT FALSE,
    CONSTRAINT uk_role_code UNIQUE (code)
);

CREATE TABLE permissions (
    id          BIGSERIAL PRIMARY KEY,
    code        VARCHAR(80) NOT NULL,
    name        VARCHAR(120) NOT NULL,
    description VARCHAR(255),
    CONSTRAINT uk_permission_code UNIQUE (code)
);

CREATE TABLE role_permissions (
    role_id       BIGINT NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
    permission_id BIGINT NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
    CONSTRAINT uk_role_permission UNIQUE (role_id, permission_id)
);

CREATE TABLE users (
    id                   BIGSERIAL PRIMARY KEY,
    username             VARCHAR(50)  NOT NULL,
    email                VARCHAR(120) NOT NULL,
    password             VARCHAR(255) NOT NULL,
    first_name           VARCHAR(80),
    last_name            VARCHAR(80),
    phone                VARCHAR(30),
    enabled              BOOLEAN      NOT NULL DEFAULT TRUE,
    must_change_password BOOLEAN      NOT NULL DEFAULT FALSE,
    mfa_enabled          BOOLEAN      NOT NULL DEFAULT FALSE,
    last_login_at        TIMESTAMP,
    created_at           TIMESTAMP    NOT NULL,
    updated_at           TIMESTAMP    NOT NULL,
    version              BIGINT,
    CONSTRAINT uk_user_username UNIQUE (username),
    CONSTRAINT uk_user_email UNIQUE (email)
);
CREATE INDEX idx_user_email ON users (email);
CREATE INDEX idx_user_status ON users (enabled);

CREATE TABLE user_roles (
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
    CONSTRAINT uk_user_role UNIQUE (user_id, role_id)
);

CREATE TABLE refresh_tokens (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token      VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP    NOT NULL,
    revoked    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP    NOT NULL,
    CONSTRAINT uk_refresh_token UNIQUE (token)
);
CREATE INDEX idx_refresh_token_user ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_token_expiry ON refresh_tokens (expires_at);

CREATE TABLE tax_centers (
    id         BIGSERIAL PRIMARY KEY,
    code       VARCHAR(20)  NOT NULL,
    name       VARCHAR(120) NOT NULL,
    address    VARCHAR(255),
    created_at TIMESTAMP    NOT NULL,
    CONSTRAINT uk_tax_center_code UNIQUE (code)
);

CREATE TABLE tax_regimes (
    id          BIGSERIAL PRIMARY KEY,
    code        VARCHAR(20) NOT NULL,
    name        VARCHAR(120) NOT NULL,
    description VARCHAR(500),
    category    VARCHAR(50),
    CONSTRAINT uk_tax_regime_code UNIQUE (code)
);

CREATE TABLE taxpayers (
    id             BIGSERIAL PRIMARY KEY,
    nif            VARCHAR(10)  NOT NULL,
    type           VARCHAR(20)  NOT NULL,
    name           VARCHAR(200) NOT NULL,
    business_name  VARCHAR(200),
    first_name     VARCHAR(80),
    last_name      VARCHAR(80),
    phone          VARCHAR(30),
    email          VARCHAR(120),
    address        VARCHAR(255),
    tax_center_id  BIGINT REFERENCES tax_centers (id),
    tax_regime_id  BIGINT REFERENCES tax_regimes (id),
    status         VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    created_at     TIMESTAMP    NOT NULL,
    updated_at     TIMESTAMP    NOT NULL,
    version        BIGINT,
    CONSTRAINT uk_taxpayer_nif UNIQUE (nif)
);
CREATE INDEX idx_taxpayer_name ON taxpayers (name);
CREATE INDEX idx_taxpayer_status ON taxpayers (status);

CREATE TABLE taxpayer_addresses (
    id             BIGSERIAL PRIMARY KEY,
    taxpayer_id    BIGINT NOT NULL REFERENCES taxpayers (id) ON DELETE CASCADE,
    type           VARCHAR(30)  NOT NULL,
    address_line1  VARCHAR(255),
    address_line2  VARCHAR(255),
    city           VARCHAR(100),
    region         VARCHAR(100),
    country        VARCHAR(60),
    postal_code    VARCHAR(20)
);

CREATE TABLE taxpayer_activities (
    id          BIGSERIAL PRIMARY KEY,
    taxpayer_id BIGINT NOT NULL REFERENCES taxpayers (id) ON DELETE CASCADE,
    code        VARCHAR(40)  NOT NULL,
    label       VARCHAR(200),
    description VARCHAR(500),
    is_primary  BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_activity_taxpayer ON taxpayer_activities (taxpayer_id);

CREATE TABLE tax_types (
    id          BIGSERIAL PRIMARY KEY,
    code        VARCHAR(20)  NOT NULL,
    name        VARCHAR(150) NOT NULL,
    category    VARCHAR(50),
    description VARCHAR(500),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uk_tax_type_code UNIQUE (code)
);

CREATE TABLE tax_obligations (
    id          BIGSERIAL PRIMARY KEY,
    taxpayer_id BIGINT NOT NULL REFERENCES taxpayers (id) ON DELETE CASCADE,
    tax_type_id BIGINT NOT NULL REFERENCES tax_types (id),
    periodicity VARCHAR(20)  NOT NULL,
    start_date  DATE    NOT NULL,
    end_date    DATE,
    status      VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    created_at  TIMESTAMP NOT NULL
);
CREATE INDEX idx_obligation_taxpayer ON tax_obligations (taxpayer_id);
CREATE INDEX idx_obligation_status ON tax_obligations (status);
