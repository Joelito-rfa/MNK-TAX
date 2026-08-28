-- Lien contribuable → utilisateur pour notifications ciblées
ALTER TABLE taxpayers ADD COLUMN user_id BIGINT;
ALTER TABLE taxpayers ADD CONSTRAINT fk_taxpayer_user FOREIGN KEY (user_id) REFERENCES users(id);
CREATE INDEX idx_taxpayer_user_id ON taxpayers(user_id);
