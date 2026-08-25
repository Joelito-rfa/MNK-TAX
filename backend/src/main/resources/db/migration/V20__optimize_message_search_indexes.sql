-- ============================================================
-- V20 : Optimisation des index de recherche messages
-- ============================================================

-- 1. Recherche envoyés : WHERE sender_id = ? AND archived_at IS NULL
--    + filtres processing_status, priority, context_type
CREATE INDEX idx_message_sent_active ON messages (sender_id, archived_at, created_at DESC);

-- 2. Recherche boîte de réception : WHERE recipient_id = ? AND archived_at IS NULL
--    + filtres is_read, processing_status, priority, context_type
CREATE INDEX idx_message_inbox_active ON messages (recipient_id, archived_at, is_read, created_at DESC);

-- 3. Index couvrant pour les filtres combinés sur réception
CREATE INDEX idx_message_inbox_filters ON messages (recipient_id, archived_at, processing_status, priority, context_type, created_at DESC);

-- 4. Index couvrant pour les filtres combinés sur envoi
CREATE INDEX idx_message_sent_filters ON messages (sender_id, archived_at, processing_status, priority, context_type, created_at DESC);

-- 5. Index sur subject pour accélérer les recherches par sujet
CREATE INDEX idx_message_subject ON messages (subject);

-- 6. Index sur context_ref pour accélérer les recherches par référence dossier
CREATE INDEX idx_message_context_ref ON messages (context_ref);
