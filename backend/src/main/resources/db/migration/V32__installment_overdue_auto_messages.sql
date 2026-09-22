-- V32 : Messages automatiques pour tranches d'échéancier en retard
-- Relances à J+1 (rappel), J+3 (relance), J+7 (alerte urgente)
-- Tous canaux : IN_APP, EMAIL, SMS — 3 langues (FR, MG, EN)

-- ═══════════════════════════════════════════════════════════════
-- 1. TEMPLATES
-- ═══════════════════════════════════════════════════════════════

-- Rappel initial : tranche en retard de 1 jour
INSERT INTO message_templates (code, category, channels, subject_fr, subject_mg, subject_en,
    body_fr, body_mg, body_en,
    sms_body_fr, sms_body_mg, sms_body_en,
    enabled, created_at, updated_at)
VALUES
('INSTALLMENT_OVERDUE_J1', 'COLLECTION', 'IN_APP,EMAIL,SMS',
 'Rappel — Tranche d''échéancier en retard', 'Fampahatsorana — Tranon-taram-parihiko an-tara', 'Reminder — Overdue payment installment',
 'Bonjour {{taxpayer_name}},

Nous vous informons que la tranche n°{{installment_number}} de votre échéancier {{plan_reference}} (créance {{debt_reference}}) était due le {{due_date}}.

Montant de la tranche : {{amount}} MGA
Solde restant de la créance : {{balance}} MGA
NIF : {{nif}}

Merci de procéder au règlement dans les meilleurs délais afin d''éviter les pénalités de retard.

Cordialement,
Le Service du recouvrement',
 'Salama {{taxpayer_name}},

Manambara anao fa ny tranon-taram-parihiko {{installment_number}} ao amin''ny échéancier {{plan_reference}} (trosa {{debt_reference}}) dia tokony ho lavo ny {{due_date}}.

Vola : {{amount}} MGA
Tola sisa : {{balance}} MGA
NIF : {{nif}}

Miantsoy anay ny hamonoina ny fandoavana.

Voninahitra,
Ny sampana fitrandrahana trosa',
 'Dear {{taxpayer_name}},

Please note that installment n°{{installment_number}} of your payment plan {{plan_reference}} (debt {{debt_reference}}) was due on {{due_date}}.

Installment amount: {{amount}} MGA
Outstanding balance: {{balance}} MGA
TIN: {{nif}}

Please settle this payment promptly to avoid late penalties.

Sincerely,
The Collection Department',
 'MNK-TAX : Rappel — Tranche {{installment_number}} de l''échéancier {{plan_reference}} de {{amount}} MGA due le {{due_date}}.',
 'MNK-TAX : Fampahatsorana — Tranon-taram-parihiko {{installment_number}} ao amin''ny {{plan_reference}} dia {{amount}} MGA, fe-potoana : {{due_date}}.',
 'MNK-TAX: Reminder — Installment {{installment_number}} of plan {{plan_reference}} for {{amount}} MGA was due on {{due_date}}.',
 TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Relance : tranche en retard de 3 jours
INSERT INTO message_templates (code, category, channels, subject_fr, subject_mg, subject_en,
    body_fr, body_mg, body_en,
    sms_body_fr, sms_body_mg, sms_body_en,
    enabled, created_at, updated_at)
VALUES
('INSTALLMENT_OVERDUE_J3', 'COLLECTION', 'IN_APP,EMAIL,SMS',
 'Relance — Échéancier : tranche en retard de 3 jours', 'Fampahatsorana — Tranon-taram-parihiko tara 3 andro', 'Reminder — Installment 3 days overdue',
 'Bonjour {{taxpayer_name}},

Malgré notre rappel initial, la tranche n°{{installment_number}} de votre échéancier {{plan_reference}} (créance {{debt_reference}}) demeure impayée depuis le {{due_date}}.

Montant de la tranche : {{amount}} MGA
Jours de retard : {{days_overdue}} jours
Solde restant de la créance : {{balance}} MGA
NIF : {{nif}}

Nous vous demandons de procéder au règlement sans délai. À défaut, les pénalités de retard seront appliquées conformément à la réglementation.

Cordialement,
Le Service du recouvrement',
 'Salama {{taxpayer_name}},

Na dia nisy fampahatsorana aza, ny tranon-taram-parihiko {{installment_number}} ao amin''ny échéancier {{plan_reference}} (trosa {{debt_reference}}) dia mbola tsy voaloa hatramin''ny {{due_date}}.

Vola : {{amount}} MGA
Andro tara : {{days_overdue}} andro
Tola sisa : {{balance}} MGA
NIF : {{nif}}

Manontolo anao ny hamonoina ny fandoavana haingana. Raha tsy izany, dia hisy adidy amin''ny fahatarana.

Voninahitra,
Ny sampana fitrandrahana trosa',
 'Dear {{taxpayer_name}},

Despite our initial reminder, installment n°{{installment_number}} of your payment plan {{plan_reference}} (debt {{debt_reference}}) remains unpaid since {{due_date}}.

Installment amount: {{amount}} MGA
Days overdue: {{days_overdue}} days
Outstanding balance: {{balance}} MGA
TIN: {{nif}}

We urge you to settle this payment immediately. Late penalties will be applied in accordance with regulations.

Sincerely,
The Collection Department',
 'MNK-TAX : Relance — Tranche {{installment_number}} de l''échéancier {{plan_reference}} de {{amount}} MGA impayée depuis {{days_overdue}} jours.',
 'MNK-TAX : Fampahatsorana — Tranon-taram-parihiko {{installment_number}} ao amin''ny {{plan_reference}} dia tsy voaloa eto {{days_overdue}} andro. Tola : {{amount}} MGA.',
 'MNK-TAX: Reminder — Installment {{installment_number}} of plan {{plan_reference}} for {{amount}} MGA is {{days_overdue}} days overdue.',
 TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Alerte urgente : tranche en retard de 7 jours
INSERT INTO message_templates (code, category, channels, subject_fr, subject_mg, subject_en,
    body_fr, body_mg, body_en,
    sms_body_fr, sms_body_mg, sms_body_en,
    enabled, created_at, updated_at)
VALUES
('INSTALLMENT_OVERDUE_J7', 'COLLECTION', 'IN_APP,EMAIL,SMS',
 'ALERTE — Échéancier : tranche en retard de 7 jours', 'TANDINDON-LOZA — Tranon-taram-parihiko tara 7 andro', 'URGENT — Installment 7 days overdue',
 'Bonjour {{taxpayer_name}},

⚠️ ALERTE : La tranche n°{{installment_number}} de votre échéancier {{plan_reference}} (créance {{debt_reference}}) est en retard de {{days_overdue}} jours.

Montant de la tranche : {{amount}} MGA
Solde restant de la créance : {{balance}} MGA
NIF : {{nif}}

Cette situation est préoccupante. Nous vous demandons impérativement de régulariser votre situation sous 48 heures.

Passé ce délai, nous serons dans l''obligation de :
• Annuler l''échéancier en cours
• Relancer la procédure de recouvrement forcé
• Appliquer les pénalités maximales autorisées

Cordialement,
Le Service du recouvrement',
 'Salama {{taxpayer_name}},

 ⚠️ TANDINDON-LOZA : Ny tranon-taram-parihiko {{installment_number}} ao amin''ny échéancier {{plan_reference}} (trosa {{debt_reference}}) dia tara {{days_overdue}} andro.

Vola : {{amount}} MGA
Tola sisa : {{balance}} MGA
NIF : {{nif}}

Manontolo anao ny hamonoina ny fandoavana ao anatin''ny 48ora.

Raha tsy izany, dia:
• Hanesorana ny échéancier
• Handray anjara ny fanenjehana trosa
• Hampiharina ny adidy ambony indrindra

Voninahitra,
Ny sampana fitrandrahana trosa',
 'Dear {{taxpayer_name}},

⚠️ ALERT: Installment n°{{installment_number}} of your payment plan {{plan_reference}} (debt {{debt_reference}}) is {{days_overdue}} days overdue.

Installment amount: {{amount}} MGA
Outstanding balance: {{balance}} MGA
TIN: {{nif}}

This situation is concerning. You must settle this payment within 48 hours.

After this deadline, we will be compelled to:
• Cancel the current payment plan
• Resume forced collection proceedings
• Apply the maximum penalties authorized

Sincerely,
The Collection Department',
 'MNK-TAX : URGENT — Tranche {{installment_number}} de l''échéancier {{plan_reference}} de {{amount}} MGA en retard de {{days_overdue}} jours. Régularisez sous 48h.',
 'MNK-TAX : TANDINDON-LOZA — Tranon-taram-parihiko {{installment_number}} ao amin''ny {{plan_reference}} dia tara {{days_overdue}} andro. Vonoina ao anatin''ny 48ora.',
 'MNK-TAX: URGENT — Installment {{installment_number}} of plan {{plan_reference}} for {{amount}} MGA is {{days_overdue}} days overdue. Settle within 48h.',
 TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ═══════════════════════════════════════════════════════════════
-- 2. RÈGLES AUTOMATIQUES
-- ═══════════════════════════════════════════════════════════════

-- Rappel initial : J+1 après échéance de la tranche
INSERT INTO communication_event_rules
    (event_type, template_code, channels, priority, day_offset, enabled, created_at, updated_at)
VALUES
    ('INSTALLMENT_OVERDUE_J1', 'INSTALLMENT_OVERDUE_J1', 'IN_APP,EMAIL,SMS', 'NORMAL', 1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Relance : J+3 après échéance de la tranche
INSERT INTO communication_event_rules
    (event_type, template_code, channels, priority, day_offset, enabled, created_at, updated_at)
VALUES
    ('INSTALLMENT_OVERDUE_J3', 'INSTALLMENT_OVERDUE_J3', 'IN_APP,EMAIL,SMS', 'HIGH', 3, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Alerte urgente : J+7 après échéance de la tranche
INSERT INTO communication_event_rules
    (event_type, template_code, channels, priority, day_offset, enabled, created_at, updated_at)
VALUES
    ('INSTALLMENT_OVERDUE_J7', 'INSTALLMENT_OVERDUE_J7', 'IN_APP,EMAIL,SMS', 'URGENT', 7, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
