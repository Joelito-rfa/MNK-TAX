# Architecture — MNK-TAX

## Vue d'ensemble

Application web full-stack en 3 tiers :

```
┌────────────────┐      /api (nginx)      ┌─────────────────┐
│  Frontend SPA  │ ─────────────────────▶ │  Backend Spring │
│  React + Vite  │ ◀───────────────────── │  Boot 3.3.5     │
│  (port 3000)   │        JSON + JWT      │  (port 8080)    │
└────────────────┘                        └───────┬─────────┘
                                                  │ JPA / Flyway
                                    ┌─────────────▼──────────┐
                                    │  PostgreSQL 16         │
                                    │  (H2 en mode PG en dev)│
                                    └────────────────────────┘
                                    ┌────────────────────────┐
                                    │  Redis (cache, rate)   │
                                    └────────────────────────┘
```

- Le frontend est servi par nginx qui reverse-proxie `/api` vers le backend.
- Le backend expose une API REST JSON, documentée par OpenAPI (Swagger UI).
- En dev, Vite proxifie `/api` vers `http://localhost:8080`.

## Backend — modules

Le backend est organisé en modules verticaux par domaine (`com.mnktax.*`) :

| Module | Rôle |
| ------ | ---- |
| `auth` | Authentification JWT, refresh tokens, utilisateurs, rôles, permissions, RBAC |
| `taxpayer` | Registre des contribuables (NIF, régime, centre, activités, adresses) |
| `tax` | Types d'impôts, régimes, centres, obligations, règles de calcul (versionnées), échéances |
| `declaration` | Déclarations (brouillon → soumise → validée/rejetée), lignes, transitions d'état |
| `assessment` | Impositions calculées par le moteur de règles (moteur : `TaxCalculator`) |
| `debt` | Créances issues des impositions, pénalités/intérêts, ajustements, annulations |
| `payment` | Encaissements, allocation sur les créances, rejets |
| `receipt` | Quittances (numéro, QR code), vérification publique, export PDF |
| `collection` | Actions de recouvrement et mises en demeure, historique par créance |
| `document` | Documents joints aux contribuables, stockage fichiers |
| `notification` | Notifications internes (échéances, paiements, recouvrement) |
| `audit` | Journalisation des opérations sensibles |
| `reporting` | Synthèses dashboard et rapports de recouvrement/paiements |
| `administration` | Paramètres système (clés/valeurs, catégorisées) |
| `common` | Infra transverse : exceptions, sécurité, CORS, rate-limit |

## Flux métier principal

1. Un contribuable a des **obligations** (impôt + périodicité) et des **échéances**.
2. Une **déclaration** est saisie (brouillon), soumise, puis validée (avec rejet possible).
3. La validation déclenche le **moteur de règles** : sélection de la règle applicable
   (type d'impôt + régime + type de contribuable + période d'effet) et calcul de l'**imposition**.
4. L'imposition génère une **créance** (principal + pénalités + intérêts − ajustements − crédits).
   `TOTAL = PRINCIPAL + PENALTIES + INTERESTS − ADJUSTMENTS − CREDITS`, `BALANCE = TOTAL − PAID`.
5. Un **paiement** est enregistré puis alloué à la créance ; la créance soldée devient `PAID`.
6. Chaque paiement alloué produit une **quittance** avec numéro + QR code (URL publique de
   vérification) et export PDF.
7. Une créance non soldée après l'échéance passe `OVERDUE` (`POST /debts/mark-overdue`),
   puis éventuellement `IN_COLLECTION` avec actions et mises en demeure.
8. Chaque étape sensible est **journalisée** (audit) et génère des **notifications**.

## Frontend

- `src/lib/api.ts` — client axios (intercepteur JWT, helpers `apiGet/apiPost/apiPatch/apiPut/apiDelete`).
- `src/lib/auth.tsx` — `AuthProvider` : login/logout, bootstrap `/auth/me`, helper `can(permission)`.
- `src/components/ProtectedRoute.tsx` — garde de route par permission (RBAC côté client).
- `src/components/Layout.tsx` — sidebar (bleu foncé), navigation mobile, cloche notifications.
- `src/pages/*` — une page par module (voir `App.tsx` pour le routage et les permissions).
- La page publique `/verify/receipt/:reference` vérifie une quittance sans authentification.

## Moteur de règles

- Les règles sont **versionnées** (`tax_rule_versions`) : chaque modification crée une version
  avec un instantané JSON et une raison.
- La sélection se base sur `tax_type + taxpayer_type + regime + activité + date d'effet + priorité`.
- Méthodes de calcul : `PERCENTAGE`, `FIXED_AMOUNT`, `PROGRESSIVE`, `EXEMPT`.

## Conventions techniques

- `spring.jpa.open-in-view=false` : toutes les lectures de mapping DTO sont `@Transactional(readOnly = true)`.
- Codes de permission : constantes `PERMISSION_*` (`Permissions.java`), appliquées via `@PreAuthorize`.
  Les codes persistés (DB/seed) restent nus (ex. `TAXPAYER_READ`) ; le contexte Spring Security
  porte `PERMISSION_` + code.
- `ddl-auto=validate` : le schéma est entièrement géré par Flyway.
- Fuseau horaire JPA : UTC. Les montants sont des `BigDecimal` (MGA, pas de décimales).
