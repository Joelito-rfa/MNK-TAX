-- ============================================================
-- V21 : Permissions manquantes — granularité métier
-- ============================================================

-- Contribuables
INSERT INTO permissions (code, name) SELECT 'TAXPAYER_EXPORT', 'Exporter les contribuables' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'TAXPAYER_EXPORT');
INSERT INTO permissions (code, name) SELECT 'TAXPAYER_VIEW_HISTORY', 'Historique des contribuables' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'TAXPAYER_VIEW_HISTORY');
INSERT INTO permissions (code, name) SELECT 'TAXPAYER_SUSPEND', 'Suspendre un contribuable' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'TAXPAYER_SUSPEND');
INSERT INTO permissions (code, name) SELECT 'TAXPAYER_CLOSE', 'Fermer un compte contribuable' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'TAXPAYER_CLOSE');

-- Déclarations
INSERT INTO permissions (code, name) SELECT 'DECLARATION_CREATE', 'Créer une déclaration' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'DECLARATION_CREATE');
INSERT INTO permissions (code, name) SELECT 'DECLARATION_UPDATE', 'Modifier une déclaration' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'DECLARATION_UPDATE');
INSERT INTO permissions (code, name) SELECT 'DECLARATION_SUBMIT', 'Soumettre une déclaration' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'DECLARATION_SUBMIT');
INSERT INTO permissions (code, name) SELECT 'DECLARATION_REVIEW', 'Vérifier une déclaration' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'DECLARATION_REVIEW');
INSERT INTO permissions (code, name) SELECT 'DECLARATION_REJECT', 'Rejeter une déclaration' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'DECLARATION_REJECT');
INSERT INTO permissions (code, name) SELECT 'DECLARATION_CORRECT', 'Corriger une déclaration' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'DECLARATION_CORRECT');
INSERT INTO permissions (code, name) SELECT 'DECLARATION_CANCEL', 'Annuler une déclaration' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'DECLARATION_CANCEL');
INSERT INTO permissions (code, name) SELECT 'DECLARATION_EXPORT', 'Exporter les déclarations' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'DECLARATION_EXPORT');
INSERT INTO permissions (code, name) SELECT 'DECLARATION_ATTACH', 'Joindre des pièces aux déclarations' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'DECLARATION_ATTACH');

-- Créances
INSERT INTO permissions (code, name) SELECT 'DEBT_ASSIGN_RECOVERY', 'Assigner en recouvrement' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'DEBT_ASSIGN_RECOVERY');
INSERT INTO permissions (code, name) SELECT 'DEBT_VIEW_HISTORY', 'Historique des créances' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'DEBT_VIEW_HISTORY');

-- Paiements
INSERT INTO permissions (code, name) SELECT 'PAYMENT_VIEW_HISTORY', 'Historique des paiements' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'PAYMENT_VIEW_HISTORY');

-- Messages
INSERT INTO permissions (code, name) SELECT 'MESSAGE_MANAGE', 'Gérer les messages' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'MESSAGE_MANAGE');
INSERT INTO permissions (code, name) SELECT 'MESSAGE_DELETE', 'Supprimer des messages' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'MESSAGE_DELETE');

-- Calendrier / Obligations
INSERT INTO permissions (code, name) SELECT 'DEADLINE_READ', 'Consulter le calendrier fiscal' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'DEADLINE_READ');
INSERT INTO permissions (code, name) SELECT 'DEADLINE_WRITE', 'Gérer le calendrier fiscal' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'DEADLINE_WRITE');
INSERT INTO permissions (code, name) SELECT 'OBLIGATION_READ', 'Consulter les obligations' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'OBLIGATION_READ');
INSERT INTO permissions (code, name) SELECT 'OBLIGATION_WRITE', 'Gérer les obligations' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'OBLIGATION_WRITE');

-- Rapports
INSERT INTO permissions (code, name) SELECT 'REPORT_EXPORT', 'Exporter les rapports' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'REPORT_EXPORT');
INSERT INTO permissions (code, name) SELECT 'REPORT_FINANCIAL', 'Rapports financiers' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'REPORT_FINANCIAL');
INSERT INTO permissions (code, name) SELECT 'REPORT_TAX', 'Rapports fiscaux' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'REPORT_TAX');
INSERT INTO permissions (code, name) SELECT 'REPORT_RECOVERY', 'Rapports de recouvrement' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'REPORT_RECOVERY');

-- Administration
INSERT INTO permissions (code, name) SELECT 'SYSTEM_SETTINGS_READ', 'Consulter les paramètres système' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'SYSTEM_SETTINGS_READ');
INSERT INTO permissions (code, name) SELECT 'SYSTEM_SETTINGS_UPDATE', 'Modifier les paramètres système' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'SYSTEM_SETTINGS_UPDATE');
INSERT INTO permissions (code, name) SELECT 'USER_DISABLE', 'Désactiver un utilisateur' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'USER_DISABLE');
INSERT INTO permissions (code, name) SELECT 'USER_RESET_PASSWORD', 'Réinitialiser le mot de passe' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'USER_RESET_PASSWORD');
INSERT INTO permissions (code, name) SELECT 'ROLE_ASSIGN', 'Attribuer un rôle' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'ROLE_ASSIGN');
INSERT INTO permissions (code, name) SELECT 'PERMISSION_READ', 'Consulter les permissions' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'PERMISSION_READ');

-- Quittances
INSERT INTO permissions (code, name) SELECT 'RECEIPT_VIEW_HISTORY', 'Historique des quittances' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'RECEIPT_VIEW_HISTORY');

-- Règles fiscales
INSERT INTO permissions (code, name) SELECT 'TAX_RULE_HISTORY', 'Historique des règles fiscales' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'TAX_RULE_HISTORY');
