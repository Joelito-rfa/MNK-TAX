-- V35 : ASSESSMENT_WRITE aux agents fiscaux (gestion du cycle de vie des impositions)
INSERT INTO permissions (code, name)
SELECT 'ASSESSMENT_WRITE', 'Gérer les impositions'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'ASSESSMENT_WRITE');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'TAX_AGENT' AND p.code = 'ASSESSMENT_WRITE'
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);
