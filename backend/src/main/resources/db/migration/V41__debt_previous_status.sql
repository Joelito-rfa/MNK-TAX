-- ============================================================
-- V41 : statut antérieur à la suspension des créances
-- ============================================================
-- * previous_status : statut exact de la créance au moment où elle a
--   été suspendue, restauré tel quel à la réactivation (au lieu d'un
--   recalcul brutal OVERDUE/ISSUED qui faisait perdre la phase
--   recouvrement / paiement partiel / contentieux).
--   NULL pour les créances suspendues avant cette migration : la
--   réactivation bascule alors sur le recalcul classique.
ALTER TABLE tax_debts ADD COLUMN previous_status VARCHAR(20);
