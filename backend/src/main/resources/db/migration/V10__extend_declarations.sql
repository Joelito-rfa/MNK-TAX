-- V10: Extend declarations table + create annexes & history tables

-- 1. Extend declarations table
ALTER TABLE declarations ADD COLUMN exercice VARCHAR(10);
ALTER TABLE declarations ADD COLUMN regime VARCHAR(30);
ALTER TABLE declarations ADD COLUMN taux NUMERIC(19,6);
ALTER TABLE declarations ADD COLUMN penalites NUMERIC(19,2) DEFAULT 0;
ALTER TABLE declarations ADD COLUMN total_a_payer NUMERIC(19,2);
ALTER TABLE declarations ADD COLUMN montant_paye NUMERIC(19,2) DEFAULT 0;
ALTER TABLE declarations ADD COLUMN reste_a_payer NUMERIC(19,2);
ALTER TABLE declarations ADD COLUMN date_echeance DATE;
ALTER TABLE declarations ADD COLUMN rectificative BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE declarations ADD COLUMN declaration_origine_id BIGINT;
ALTER TABLE declarations ADD COLUMN motif_correction TEXT;
ALTER TABLE declarations ADD COLUMN tax_center_id BIGINT;
ALTER TABLE declarations ADD COLUMN due_date DATE;

ALTER TABLE declarations ADD CONSTRAINT fk_decl_origin
    FOREIGN KEY (declaration_origine_id) REFERENCES declarations(id);
ALTER TABLE declarations ADD CONSTRAINT fk_decl_tax_center
    FOREIGN KEY (tax_center_id) REFERENCES tax_centers(id);

-- 2. Declaration annexes
CREATE TABLE declaration_annexes (
    id              BIGSERIAL PRIMARY KEY,
    declaration_id  BIGINT NOT NULL REFERENCES declarations(id) ON DELETE CASCADE,
    nom             VARCHAR(255) NOT NULL,
    fichier         VARCHAR(500) NOT NULL,
    type_mime       VARCHAR(100),
    taille          BIGINT DEFAULT 0,
    categorie       VARCHAR(50) DEFAULT 'GENERAL',
    obligatoire     BOOLEAN NOT NULL DEFAULT FALSE,
    uploaded_by     VARCHAR(100),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_annex_decl ON declaration_annexes(declaration_id);

-- 3. Declaration history
CREATE TABLE declaration_histories (
    id              BIGSERIAL PRIMARY KEY,
    declaration_id  BIGINT NOT NULL REFERENCES declarations(id) ON DELETE CASCADE,
    user_id         BIGINT,
    username        VARCHAR(100),
    action          VARCHAR(50) NOT NULL,
    ancien_statut   VARCHAR(30),
    nouveau_statut  VARCHAR(30),
    commentaire     TEXT,
    anciennes_donnees TEXT,
    nouvelles_donnees TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_hist_decl ON declaration_histories(declaration_id);

-- 4. Declaration status enum update (add new values via CHECK)
-- PostgreSQL stores enums as text with CHECK constraint from Flyway V3
-- New statuses: LIQUIDEE, PAYEE, A_CORRIGER
-- The existing column is VARCHAR(30) with default 'DRAFT', no CHECK constraint
-- So new values will work without migration
