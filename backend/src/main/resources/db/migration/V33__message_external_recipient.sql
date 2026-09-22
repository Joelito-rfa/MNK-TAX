-- V33 : destinataire externe (email libre) pour le centre de communication.
-- Un message vers une personne externe (sans fiche contribuable / sans compte)
-- stocke l'email et le libellé directement sur la ligne message ;
-- recipient_id reste renseigné (expéditeur) car la colonne est NOT NULL.
ALTER TABLE messages ADD COLUMN recipient_email VARCHAR(255);
ALTER TABLE messages ADD COLUMN recipient_label VARCHAR(200);
CREATE INDEX idx_message_recipient_email ON messages (recipient_email);
