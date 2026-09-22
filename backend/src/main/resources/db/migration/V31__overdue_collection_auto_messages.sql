-- V31 : Messages automatiques escaladés pour créances en retard
-- Ajoute des relances automatiques à J+30 et J+60 sur les 3 canaux (EMAIL, SMS, IN_APP)

-- 1. Templates pour les relances escaladées (tous canaux, 3 langues)

-- Relance à 30 jours de retard
INSERT INTO message_templates (code, category, channels, subject_fr, subject_mg, subject_en,
    body_fr, body_mg, body_en,
    sms_body_fr, sms_body_mg, sms_body_en,
    enabled, created_at, updated_at)
VALUES
('COLLECTION_RELANCE_30', 'COLLECTION', 'IN_APP,EMAIL,SMS',
 'Relance — Créance en retard de 30 jours', 'Fampahatsorana — Trosa tara 30 andro', 'Reminder — 30-day overdue debt',
 'Bonjour {{taxpayer_name}},

Votre créance fiscale {{debt_reference}} est en retard de plus de 30 jours.
Malgré nos relances précédentes, le paiement n''a toujours pas été reçu.

Montant restant dû : {{amount}} MGA
Échéance initiale : {{due_date}}
NIF : {{nif}}

Nous vous demandons de procéder au règlement dans les meilleurs délais.
À défaut, une mise en demeure sera émise conformément à la réglementation.

Cordialement,
Le Service du recouvrement',
 'Salama {{taxpayer_name}},

Ny trosa hetra {{debt_reference}} dia tamy ny 30 andro nentim-paharazana.
Tsy mbola nahazo ny fandoavana anefa ny fampahatsorana lasa.

Tola sisa : {{amount}} MGA
Fe-potoana : {{due_date}}
NIF : {{nif}}

Manontolo anao ny hamonoina ny fandoavana haingana.
Raha tsy izany, dia hanehoana fanamarihana ofisialy araka ny lalàna.

Voninahitra,
Ny sampana fitrandrahana trosa',
 'Dear {{taxpayer_name}},

Your tax debt {{debt_reference}} is now over 30 days overdue.
Despite our previous reminders, payment has not yet been received.

Outstanding amount: {{amount}} MGA
Original due date: {{due_date}}
TIN: {{nif}}

We urge you to settle this matter promptly.
Otherwise, a formal notice will be issued in accordance with regulations.

Sincerely,
The Collection Department',
 'MNK-TAX : Votre creance {{debt_reference}} de {{amount}} MGA est en retard de 30 jours. Reglez rapidement.',
 'MNK-TAX : Ny trosa {{debt_reference}} dia tara 30 andro. Tola : {{amount}} MGA. Vonoina haingana.',
 'MNK-TAX: Your debt {{debt_reference}} of {{amount}} MGA is 30 days overdue. Please pay urgently.',
 TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Relance à 60 jours de retard
INSERT INTO message_templates (code, category, channels, subject_fr, subject_mg, subject_en,
    body_fr, body_mg, body_en,
    sms_body_fr, sms_body_mg, sms_body_en,
    enabled, created_at, updated_at)
VALUES
('COLLECTION_RELANCE_60', 'COLLECTION', 'IN_APP,EMAIL,SMS',
 'Dernière relance — Créance en retard de 60 jours', 'Fampahatsorana farany — Trosa tara 60 andro', 'Final reminder — 60-day overdue debt',
 'Bonjour {{taxpayer_name}},

Votre créance fiscale {{debt_reference}} est maintenant en retard de plus de 60 jours.
Malgré nos relances répétées, aucun paiement n''a été enregistré.

Montant restant dû : {{amount}} MGA
Échéance initiale : {{due_date}}
NIF : {{nif}}

Il s''agit d''une DERNIÈRE RELANCE avant l''engagement de la procédure de mise en demeure.
Nous vous invitons impérativement à régulariser votre situation sous 8 jours.

À défaut, votre dossier sera transmis au service contentieux.

Cordialement,
Le Service du recouvrement',
 'Salama {{taxpayer_name}},

Ny trosa hetra {{debt_reference}} dia tara indroa feo (60 andro).
Tsy mbola nisy fandoavana natao na amin''ny fampahatsorana maro.

Tola sisa : {{amount}} MGA
Fe-potoana : {{due_date}}
NIF : {{nif}}

AMPahatsorana FARANY ity alohan''ny fanamarihana ofisialy.
Andro 8 ao aminy ny famelanao ny toe-bolanao.

Raha tsy izany, dia halefa amin''ny sampana fanenjehana ny rakitrao.

Voninahitra,
Ny sampana fitrandrahana trosa',
 'Dear {{taxpayer_name}},

Your tax debt {{debt_reference}} is now over 60 days overdue.
Despite our repeated reminders, no payment has been recorded.

Outstanding amount: {{amount}} MGA
Original due date: {{due_date}}
TIN: {{nif}}

This is your FINAL REMINDER before formal notice proceedings begin.
You must settle this matter within 8 days.

Otherwise, your file will be transferred to the enforcement department.

Sincerely,
The Collection Department',
 'MNK-TAX : URGENT — Creance {{debt_reference}} de {{amount}} MGA en retard de 60j. Dernier delai : 8 jours.',
 'MNK-TAX : TSY MANKASEHO — Trosa {{debt_reference}} tara 60 andro. Tola : {{amount}} MGA. 8 andro sisa.',
 'MNK-TAX: URGENT — Debt {{debt_reference}} of {{amount}} MGA is 60 days overdue. Final deadline: 8 days.',
 TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 2. Règles automatiques pour les relances escaladées

-- Relance initiale : J+7 (déjà existante, mise à jour avec SMS)
UPDATE communication_event_rules
SET channels = 'IN_APP,EMAIL,SMS', updated_at = CURRENT_TIMESTAMP
WHERE event_type = 'DEBT_OVERDUE_RELANCE' AND template_code = 'DEBT_OVERDUE';

-- Mise en demeure : J+15 (mise à jour avec SMS)
UPDATE communication_event_rules
SET channels = 'IN_APP,EMAIL,SMS', updated_at = CURRENT_TIMESTAMP
WHERE event_type = 'FORMAL_NOTICE' AND template_code = 'FORMAL_NOTICE';

-- Relance à 30 jours : J+30
INSERT INTO communication_event_rules
    (event_type, template_code, channels, priority, day_offset, enabled, created_at, updated_at)
VALUES
    ('DEBT_OVERDUE_RELANCE_30', 'COLLECTION_RELANCE_30', 'IN_APP,EMAIL,SMS', 'URGENT', 30, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Relance à 60 jours : J+60
INSERT INTO communication_event_rules
    (event_type, template_code, channels, priority, day_offset, enabled, created_at, updated_at)
VALUES
    ('DEBT_OVERDUE_RELANCE_60', 'COLLECTION_RELANCE_60', 'IN_APP,EMAIL,SMS', 'URGENT', 60, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
