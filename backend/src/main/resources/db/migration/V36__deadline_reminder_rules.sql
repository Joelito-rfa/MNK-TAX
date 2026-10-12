-- V36 : Rappels d'échéance adossés au calendrier fiscal (déclarations + paiements)
--
-- Objectifs :
--  1. Le canal SMS utilise un corps court rendu (sms_content) au lieu du corps
--     email tronqué à 300 caractères.
--  2. Un modèle dédié aux échéances de paiement (FR / MG / EN + SMS).
--  3. Paliers J-7 / J-3 / J-1 / J-0 pour DECLARATION_DUE_SOON et PAYMENT_DUE_SOON.
--     Les délais restent en configuration métier (jamais codés en dur côté code).

-- ── 1. Corps SMS rendu, stocké sur le message ───────────────────
ALTER TABLE messages ADD COLUMN sms_content TEXT;

-- ── 2. Modèle : rappel d'échéance de paiement ───────────────────
INSERT INTO message_templates
    (code, category, channels, subject_fr, subject_mg, subject_en,
     body_fr, body_mg, body_en, sms_body_fr, sms_body_mg, sms_body_en,
     enabled, created_at, updated_at)
VALUES
('PAYMENT_DUE_REMINDER', 'PAYMENT', 'IN_APP,EMAIL,SMS',
 'Rappel — Échéance de paiement',
 'Fampahatsorana — Fotoana fandoavana',
 'Reminder — Payment deadline',
 'Bonjour {{taxpayer_name}},

Le paiement de votre obligation {{payment_reference}} arrive à échéance le {{due_date}}.

Montant à payer : {{amount}} MGA
NIF : {{nif}}

Veuillez procéder au règlement avant cette date afin d''éviter les pénalités de retard.

Cordialement,
L''Administration fiscale',
 'Salama {{taxpayer_name}},

Ny fandoavana ny adidinao {{payment_reference}} dia tonga amin''ny fe-potoana ny {{due_date}}.

Vola tokony aloa : {{amount}} MGA
NIF : {{nif}}

Azafady, aloavy alohan''ny {{due_date}} ny fandoavana mba tsy hisy sazy.

Voninahitra,
Ny fitantanana heti',
 'Dear {{taxpayer_name}},

The payment for your obligation {{payment_reference}} is due on {{due_date}}.

Amount due: {{amount}} MGA
TIN: {{nif}}

Please settle this payment before the due date to avoid late penalties.

Sincerely,
The Tax Administration',
 'MNK-TAX : Paiement {{payment_reference}} a regler avant le {{due_date}}. Montant : {{amount}} MGA.',
 'MNK-TAX : Ny fandoavana {{payment_reference}} dia aloa alohan''ny {{due_date}}. Vola : {{amount}} MGA.',
 'MNK-TAX: Payment {{payment_reference}} due on {{due_date}}. Amount: {{amount}} MGA.',
 TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ── 3. Paliers déclaration : J-7, J-1, J-0 (J-3 existe déjà depuis V30) ──
INSERT INTO communication_event_rules
    (event_type, template_code, channels, priority, day_offset, enabled, created_at, updated_at)
VALUES
    ('DECLARATION_DUE_SOON', 'TAX_DEADLINE_REMINDER', 'IN_APP,EMAIL,SMS', 'NORMAL', -7, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('DECLARATION_DUE_SOON', 'TAX_DEADLINE_REMINDER', 'IN_APP,EMAIL,SMS', 'HIGH',   -1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('DECLARATION_DUE_SOON', 'TAX_DEADLINE_REMINDER', 'IN_APP,EMAIL,SMS', 'URGENT',  0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ── 4. Paliers paiement : J-7, J-3, J-1, J-0 ────────────────────
INSERT INTO communication_event_rules
    (event_type, template_code, channels, priority, day_offset, enabled, created_at, updated_at)
VALUES
    ('PAYMENT_DUE_SOON', 'PAYMENT_DUE_REMINDER', 'IN_APP,EMAIL,SMS', 'NORMAL', -7, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('PAYMENT_DUE_SOON', 'PAYMENT_DUE_REMINDER', 'IN_APP,EMAIL,SMS', 'HIGH',   -3, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('PAYMENT_DUE_SOON', 'PAYMENT_DUE_REMINDER', 'IN_APP,EMAIL,SMS', 'HIGH',   -1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('PAYMENT_DUE_SOON', 'PAYMENT_DUE_REMINDER', 'IN_APP,EMAIL,SMS', 'URGENT',  0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
