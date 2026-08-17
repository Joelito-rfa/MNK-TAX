# Base de données — MNK-TAX

Le schéma est géré par **Flyway** (migrations `backend/src/main/resources/db/migration/`) et
validé par `spring.jpa.hibernate.ddl-auto=validate`.

| Migration | Contenu |
| --------- | ------- |
| `V1__initial_schema.sql` | Utilisateurs, rôles, permissions, mots de passe, contribuables (NIF, régimes, centres, adresses, activités) |
| `V2__create_tax_rules.sql` | Types d'impôts, régimes, centres, règles de calcul + versions, obligations, échéances |
| `V3__create_declaration_assessment.sql` | Déclarations + lignes, impositions + lignes de calcul |
| `V4__create_debt_collection.sql` | Créances + composantes, actions de recouvrement, mises en demeure |
| `V5__create_payment_receipt.sql` | Paiements, quittances (QR), vérifications |
| `V6__create_auxiliary.sql` | Notifications, journal d'audit, paramètres système, documents |

## Entités principales

```
users ──< user_roles >── roles ──< role_permissions >── permissions
users 1─n tokens (refresh)
tax_centers, tax_regimes, tax_types
taxpayers (NIF unique) ──1─n tax_obligations
taxpayers ──1─n addresses / activities
tax_obligations ──> tax_types (périodicité)
tax_rules (versionnées via tax_rule_versions)
deadlines (par tax_type + période)

taxpayers 1─n declarations 1─n declaration_lines
declarations 1─1 assessments 1─n assessment_lines
assessments 1─1 debts (créance)
debts 1─n debt_items (PRINCIPAL / PENALTY / INTEREST / ADJUSTMENT / CREDIT)

debts 1─n payments (allocations)
payments 1─1 receipts (quittance, QR)
debts 1─n collection_actions / collection_notices

users 1─n notifications
users 1─n audit_logs
taxpayers 1─n documents
```

## Règles de gestion implémentées

- **NIF** : 10 chiffres, 10e = clé (algorithme mod-97, validation stricte côté API).
- **Créance** : `total = principal + penalties + interests − adjustments − credits` ;
  `balance = total − paid` ; montants calculés, jamais saisis.
- **Déclaration** : cycle `DRAFT → SUBMITTED → (REVIEW) → VALIDATED` ou `REJECTED`/`CANCELLED`.
  La validation crée l'imposition et la créance.
- **Pénalités/intérêts** : appliqués lors du passage en retard (`mark-overdue`), plafonnés par règle métier.
- **Paiement** : ne peut dépasser le solde ; une créance `PAID`/`CANCELLED` est non payable.
- **Règles** : chaque modification crée une `tax_rule_version` (instantané JSON + raison + auteur).

## Rôles et permissions (seed)

Rôles : `SUPER_ADMIN`, `TAX_AGENT`, `COLLECTION_AGENT`, `ACCOUNTANT`, `TAXPAYER`.
Permissions : `{DOMAINE}_{READ|WRITE|APPROVE|ADMIN}` pour les domaines `TAXPAYER`,
`DECLARATION`, `ASSESSMENT`, `DEBT`, `PAYMENT`, `RECEIPT`, `COLLECTION`, `TAXONOMY`,
`RULE`, `USER`, `ROLE`, `AUDIT`, `PARAMETER`, `REPORT`, `DASHBOARD`, `DOCUMENT`.

> Les codes persistés sont **nus** (`TAXPAYER_READ`) ; Spring Security utilise la forme
> préfixée `PERMISSION_TAXPAYER_READ` (voir `Permissions.java`).

## Environnements

| Profil | SGBD | Cache | Notes |
| ------ | ---- | ----- | ----- |
| `dev` (défaut) | H2 `mem:mnktax` en mode PostgreSQL | simple | Seed de démonstration, rate-limit désactivé, console H2 `/h2-console` |
| `test` | H2 mode PostgreSQL | simple | Tests automatisés |
| `docker` | PostgreSQL 16 (`postgres:5432/mnktax`) | Redis | Composer fournit les deux services |
