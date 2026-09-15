-- ============================================================
-- V30 : Centre de communication multicanal
--   * message_templates (FR / MG / EN + sujet par langue)
--   * campaigns + campaign_recipients (audiences fiscales, stats)
--   * communication_event_rules (relances automatiques configurables)
--   * messages : canal(s), type fiscal, code erreur d'envoi
-- ============================================================

-- 1. Modèles de messages (multilingues)
CREATE TABLE message_templates (
    id              BIGSERIAL PRIMARY KEY,
    code            VARCHAR(60)  NOT NULL,
    category        VARCHAR(30)  NOT NULL DEFAULT 'GENERAL',
    channels        VARCHAR(100) NOT NULL DEFAULT 'IN_APP',
    subject_fr      VARCHAR(200),
    subject_mg      VARCHAR(200),
    subject_en      VARCHAR(200),
    body_fr         TEXT         NOT NULL,
    body_mg         TEXT         NOT NULL,
    body_en         TEXT         NOT NULL,
    sms_body_fr     VARCHAR(320),
    sms_body_mg     VARCHAR(320),
    sms_body_en     VARCHAR(320),
    enabled         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP    NOT NULL,
    updated_at      TIMESTAMP    NOT NULL,
    CONSTRAINT uk_template_code UNIQUE (code)
);
CREATE INDEX idx_template_category ON message_templates (category);

-- 2. Campagnes / diffusions
CREATE TABLE campaigns (
    id              BIGSERIAL PRIMARY KEY,
    reference       VARCHAR(30)  NOT NULL,
    name            VARCHAR(200) NOT NULL,
    audience        VARCHAR(40)  NOT NULL,
    audience_filter VARCHAR(1000),
    channels        VARCHAR(100) NOT NULL,
    created_by      BIGINT,
    created_by_name VARCHAR(100),
    recipient_count INTEGER      NOT NULL DEFAULT 0,
    sent_count      INTEGER      NOT NULL DEFAULT 0,
    failed_count    INTEGER      NOT NULL DEFAULT 0,
    read_count      INTEGER      NOT NULL DEFAULT 0,
    status          VARCHAR(20)  NOT NULL DEFAULT 'QUEUED',
    created_at      TIMESTAMP    NOT NULL,
    updated_at      TIMESTAMP    NOT NULL,
    CONSTRAINT uk_campaign_reference UNIQUE (reference)
);
CREATE INDEX idx_campaign_status ON campaigns (status);
CREATE INDEX idx_campaign_created ON campaigns (created_at);

CREATE TABLE campaign_recipients (
    id            BIGSERIAL PRIMARY KEY,
    campaign_id   BIGINT   NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    taxpayer_id   BIGINT,
    user_id       BIGINT,
    status        VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at    TIMESTAMP   NOT NULL
);
CREATE INDEX idx_campaign_recipient_campaign ON campaign_recipients (campaign_id);
CREATE INDEX idx_campaign_recipient_taxpayer ON campaign_recipients (taxpayer_id);

-- 3. Règles d'automatisation (relances fiscales configurables, métier — pas frontend)
CREATE TABLE communication_event_rules (
    id              BIGSERIAL PRIMARY KEY,
    event_type      VARCHAR(60) NOT NULL,
    template_code   VARCHAR(60) NOT NULL,
    channels        VARCHAR(100) NOT NULL,
    priority        VARCHAR(20)  NOT NULL DEFAULT 'NORMAL',
    day_offset      INTEGER,
    enabled         BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP   NOT NULL,
    updated_at      TIMESTAMP   NOT NULL
);
CREATE INDEX idx_event_rule_type ON communication_event_rules (event_type, enabled);

-- 4. Colonnes supplémentaires sur messages
-- thread_id redevient nullable : le thread est posé après le premier INSERT
-- (id auto-généré), comme le font déjà les autres services.
ALTER TABLE messages ALTER COLUMN thread_id DROP NOT NULL;
ALTER TABLE messages ADD COLUMN channels       VARCHAR(100);
ALTER TABLE messages ADD COLUMN message_type   VARCHAR(30);
ALTER TABLE messages ADD COLUMN template_code  VARCHAR(60);
ALTER TABLE messages ADD COLUMN campaign_id    BIGINT;
ALTER TABLE messages ADD COLUMN last_error     VARCHAR(500);
CREATE INDEX idx_message_campaign ON messages (campaign_id);
CREATE INDEX idx_message_type     ON messages (message_type);

-- 5. Modèles de base (FR / MG / EN — jamais de mélange de langues)
INSERT INTO message_templates
    (code, category, channels, subject_fr, subject_mg, subject_en, body_fr, body_mg, body_en, sms_body_fr, sms_body_mg, sms_body_en, enabled, created_at, updated_at)
VALUES
('TAX_DEADLINE_REMINDER', 'DECLARATION', 'IN_APP,EMAIL,SMS',
 'Rappel d''échéance fiscale', 'Fampahatsorana ny fe-potoana hetra', 'Tax deadline reminder',
 'Bonjour {{taxpayer_name}},

Votre déclaration {{declaration_reference}} arrive à échéance le {{due_date}}.

Montant : {{amount}} MGA
NIF : {{nif}}

Veuillez effectuer votre déclaration avant cette date afin d''éviter toute pénalité de retard.

Cordialement,
L''Administration fiscale',
 'Salama {{taxpayer_name}},

Ny fanaovana fanamarinana {{declaration_reference}} dia tonga amin''ny fe-potoana ny {{due_date}}.

Vola : {{amount}} MGA
NIF : {{nif}}

Azafady, tanteraho alohan''ny {{due_date}} ny fanamarinana mba tsy hisy sazy.

Voninahitra,
Ny fitantanana heti',
 'Dear {{taxpayer_name}},

Your declaration {{declaration_reference}} is due on {{due_date}}.

Amount: {{amount}} MGA
TIN: {{nif}}

Please file your declaration before this date to avoid late penalties.

Sincerely,
The Tax Administration',
 'MNK-TAX : Declaration {{declaration_reference}} a regler avant le {{due_date}}. Montant : {{amount}} MGA.',
 'MNK-TAX : Ny fanamarinana {{declaration_reference}} dia tokony ho vita alohan''ny {{due_date}}. Vola : {{amount}} MGA.',
 'MNK-TAX: Declaration {{declaration_reference}} due on {{due_date}}. Amount: {{amount}} MGA.',
 TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('DEBT_OVERDUE', 'COLLECTION', 'IN_APP,EMAIL,SMS',
 'Créance en retard', 'Trosa tara', 'Overdue tax debt',
 'Bonjour {{taxpayer_name}},

Malgré nos rappels, votre créance fiscale {{debt_reference}} demeure impayée.

Montant restant dû : {{amount}} MGA
Échéance initiale : {{due_date}}
NIF : {{nif}}

Nous vous invitons à régulariser votre situation dans les meilleurs délais afin d''éviter une mise en demeure.

Cordialement,
Le Service du recouvrement',
 'Salama {{taxpayer_name}},

Na dia nisy fampahatsorana aza, ny trosa hetra {{debt_reference}} dia mbola tsy voaloa.

Tola sisa : {{amount}} MGA
Fe-potoana : {{due_date}}
NIF : {{nif}}

Miantsoy anay ny hamonoina ny toe-bolanao haingana araka izay azo atao.

Voninahitra,
Ny sampana fitrandrahana trosa',
 'Dear {{taxpayer_name}},

Despite our reminders, your tax debt {{debt_reference}} remains unpaid.

Outstanding amount: {{amount}} MGA
Original due date: {{due_date}}
TIN: {{nif}}

We invite you to regularize your situation as soon as possible to avoid a formal notice.

Sincerely,
The Collection Department',
 'MNK-TAX : Votre creance fiscale de {{amount}} MGA est en attente de paiement. Reference : {{debt_reference}}.',
 'MNK-TAX : Ny trosa hetra {{amount}} MGA dia miandry ny fandoavana. Ref : {{debt_reference}}.',
 'MNK-TAX: Your tax debt of {{amount}} MGA is pending payment. Ref: {{debt_reference}}.',
 TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('FORMAL_NOTICE', 'COLLECTION', 'IN_APP,EMAIL',
 'Mise en demeure', 'Fanamarihana ofisialy', 'Formal notice',
 'Bonjour {{taxpayer_name}},

OBJET : MISE EN DEMEURE

En l''absence de règlement de la créance {{debt_reference}} (montant : {{amount}} MGA, échue le {{due_date}}), vous êtes officiellement mis en demeure de procéder au paiement intégral sous 7 jours.

À défaut, votre dossier sera transmis au service des poursuites conformément à la réglementation en vigueur.

NIF : {{nif}}

Le Service du recouvrement',
 'Salama {{taxpayer_name}},

FANAMARIHANA OFISIALY

Satria tsy voaloa ny trosa {{debt_reference}} (vola : {{amount}} MGA, fe-potoana : {{due_date}}), mahereza anao ny mandoa azy feno ao anatin''ny 7 andro.

Raha tsy izany, dia halefa amin''ny sampana fanenjehana ny rakitrao.

NIF : {{nif}}

Ny sampana fitrandrahana trosa',
 'Dear {{taxpayer_name}},

SUBJECT: FORMAL NOTICE

As the debt {{debt_reference}} (amount: {{amount}} MGA, due {{due_date}}) remains unpaid, you are hereby formally requested to pay in full within 7 days.

Failing this, your file will be transferred to the enforcement department.

TIN: {{nif}}

The Collection Department',
 NULL, NULL, NULL,
 TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('PAYMENT_RECEIVED', 'PAYMENT', 'IN_APP,EMAIL',
 'Confirmation de paiement', 'Fankatoavana fandoavana', 'Payment confirmation',
 'Bonjour {{taxpayer_name}},

Nous accusons réception de votre paiement de {{amount}} MGA.

Référence : {{reference}}
NIF : {{nif}}

Votre quittance {{receipt_reference}} est disponible dans votre espace MNK-TAX.

Cordialement,
L''Administration fiscale',
 'Salama {{taxpayer_name}},

Mahazo ny fandoavanao {{amount}} MGA izahay.

Laharana : {{reference}}
NIF : {{nif}}

Misy ao amin''ny kaontinao MNK-TAX ny quitance {{receipt_reference}}.

Voninahitra,
Ny fitantanana heti',
 'Dear {{taxpayer_name}},

We acknowledge receipt of your payment of {{amount}} MGA.

Reference: {{reference}}
TIN: {{nif}}

Your receipt {{receipt_reference}} is available in your MNK-TAX account.

Sincerely,
The Tax Administration',
 'MNK-TAX : Paiement de {{amount}} MGA recu. Ref : {{reference}}. Quittance : {{receipt_reference}}.',
 'MNK-TAX : Voaloa ny {{amount}} MGA. Ref : {{reference}}. Quitance : {{receipt_reference}}.',
 'MNK-TAX: Payment of {{amount}} MGA received. Ref: {{reference}}. Receipt: {{receipt_reference}}.',
 TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('DECLARATION_VALIDATED', 'DECLARATION', 'IN_APP',
 'Déclaration validée', 'Fanamarinana ekena', 'Declaration validated',
 'Bonjour {{taxpayer_name}},

Votre déclaration {{declaration_reference}} pour la période {{period}} a été validée.

Impôt calculé : {{amount}} MGA
NIF : {{nif}}

L''Administration fiscale',
 'Salama {{taxpayer_name}},

Ekena ny fanamarinanao {{declaration_reference}} ho an''ny vanim-potoana {{period}}.

Hetra kajy : {{amount}} MGA
NIF : {{nif}}

Ny fitantanana heti',
 'Dear {{taxpayer_name}},

Your declaration {{declaration_reference}} for period {{period}} has been validated.

Calculated tax: {{amount}} MGA
TIN: {{nif}}

The Tax Administration',
 NULL, NULL, NULL,
 TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('GENERAL_ANNOUNCEMENT', 'GENERAL', 'IN_APP,EMAIL',
 '{{subject}}', '{{subject}}', '{{subject}}',
 'Bonjour {{taxpayer_name}},

{{content}}

L''Administration fiscale',
 'Salama {{taxpayer_name}},

{{content}}

Ny fitantanana heti',
 'Dear {{taxpayer_name}},

{{content}}

The Tax Administration',
 NULL, NULL, NULL,
 TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 6. Règles automatiques par défaut (délais métier configurables ici — pas dans le frontend)
INSERT INTO communication_event_rules
    (event_type, template_code, channels, priority, day_offset, enabled, created_at, updated_at)
VALUES
    ('DECLARATION_DUE_SOON',  'TAX_DEADLINE_REMINDER', 'IN_APP,EMAIL,SMS', 'HIGH',     -3, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('DEBT_OVERDUE',          'DEBT_OVERDUE',          'IN_APP,EMAIL,SMS', 'HIGH',      1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('DEBT_OVERDUE_RELANCE',  'DEBT_OVERDUE',          'IN_APP,EMAIL',     'HIGH',      7, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('FORMAL_NOTICE',         'FORMAL_NOTICE',         'IN_APP,EMAIL',     'URGENT',   15, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('PAYMENT_RECEIVED',      'PAYMENT_RECEIVED',      'IN_APP,EMAIL',     'NORMAL', NULL, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('DECLARATION_VALIDATED', 'DECLARATION_VALIDATED', 'IN_APP',           'NORMAL', NULL, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
