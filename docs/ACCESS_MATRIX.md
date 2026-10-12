# Matrice des accès — MNK-TAX

Référentiel unique des **rôles**, **permissions**, **routes** et **comptes** de l'application.
La source de vérité reste le code : `backend/.../auth/security/Permissions.java` (catalogue),
`DemoDataSeeder.seedRoles()` (mapping rôle → permissions), et les `@PreAuthorize` des contrôleurs.

- Modèle : `permissions → roles → users` (`docs/SECURITY.md`).
- Codes persistés **nus** (`TAXPAYER_READ`) ; autorité Spring = `PERMISSION_` + code.
- Rôles système non modifiables (`RoleService.java`).

---

## 1. Rôles

| Code | Libellé | Portée |
| ---- | ------- | ------ |
| `SUPER_ADMIN` | Super administrateur | Toutes les permissions |
| `ADMIN` | Administrateur | Toutes les permissions |
| `TAX_AGENT` | Agent fiscal | Taxation, déclarations, contrôle |
| `COLLECTION_AGENT` | Agent de recouvrement | Créances, recouvrement, encaissements |
| `ACCOUNTANT` | Comptable | Déclarations, paiements, quittances |
| `TAXPAYER` | Contribuable | **Son seul dossier** (isolation par ligne) |

`SUPER_ADMIN` et `ADMIN` ont le même jeu de permissions (`allPermissionCodes()`).
La gestion des rôles et l'attribution des rôles exigent `ROLE_ASSIGN` en plus de `ROLE_WRITE` /
`USER_WRITE` (garde-fou anti-escalade, `RoleService#requireRoleAssign`, `UserService#requireAssignable`).

## 2. Permissions par domaine

| Domaine | Permissions |
| ------- | ----------- |
| Contribuables | `TAXPAYER_READ` `WRITE` `DELETE` `EXPORT` `VIEW_HISTORY` `SUSPEND` `CLOSE` |
| Déclarations | `DECLARATION_READ` `WRITE` `VALIDATE` `CREATE` `UPDATE` `SUBMIT` `REVIEW` `REJECT` `CORRECT` `CANCEL` `EXPORT` `ATTACH` |
| Créances | `DEBT_READ` `WRITE` `CREATE` `DELETE` `RECALCULATE` `SUSPEND` `CLOSE` `EXPORT` `DETECT_ARREARS` `ASSIGN_RECOVERY` `VIEW_HISTORY` |
| Paiements | `PAYMENT_READ` `WRITE` `CONFIRM` `ALLOCATE` `CANCEL` `REFUND` `EXPORT` `RECONCILE` `VIEW_HISTORY` |
| Quittances | `RECEIPT_READ` `GENERATE` `DOWNLOAD` `VERIFY` `CANCEL` `REPLACE` `REFUND` `EXPORT` `VIEW_HISTORY` |
| Recouvrement | `COLLECTION_READ` `COLLECTION_WRITE` |
| Messages | `MESSAGE_READ` `WRITE` `MANAGE` `DELETE` |
| Contrôles fiscaux | `CONTROL_READ` `CONTROL_WRITE` |
| Réclamations | `COMPLAINT_READ` `COMPLAINT_WRITE` |
| Remboursements | `REFUND_READ` `REFUND_WRITE` |
| Calendrier / obligations | `DEADLINE_READ` `DEADLINE_WRITE` `OBLIGATION_READ` `OBLIGATION_WRITE` |
| Règles fiscales | `RULE_READ` `RULE_WRITE` `TAX_RULE_HISTORY` |
| Référentiels | `TAXONOMY_READ` `TAXONOMY_WRITE` |
| Impositions | `ASSESSMENT_READ` `ASSESSMENT_WRITE` |
| Rapports | `REPORT_READ` `EXPORT` `FINANCIAL` `TAX` `RECOVERY` |
| Administration | `USER_READ` `WRITE` `DISABLE` `RESET_PASSWORD`, `ROLE_READ` `WRITE` `ASSIGN`, `PERMISSION_READ`, `PARAMETER_READ` `WRITE`, `SYSTEM_SETTINGS_READ` `UPDATE` |
| Audit / Notifications | `AUDIT_READ`, `NOTIFICATION_READ` |

## 3. Mapping rôle → permissions (seed)

| Domaine | TAX_AGENT | COLLECTION_AGENT | ACCOUNTANT | TAXPAYER |
| ------- | --------- | ---------------- | ---------- | -------- |
| Contribuables | READ, WRITE, EXPORT, VIEW_HISTORY | READ, VIEW_HISTORY | READ, VIEW_HISTORY | READ (limité à son dossier) |
| Déclarations | READ, CREATE, UPDATE, SUBMIT, REVIEW, VALIDATE, REJECT, EXPORT, ATTACH | — | READ, CREATE, UPDATE | READ, CREATE, UPDATE, SUBMIT |
| Créances | READ, VIEW_HISTORY | READ, WRITE, ASSIGN_RECOVERY, VIEW_HISTORY | READ, VIEW_HISTORY | READ, VIEW_HISTORY |
| Paiements | READ, VIEW_HISTORY | READ, WRITE, VIEW_HISTORY | READ, WRITE, CONFIRM, ALLOCATE, VIEW_HISTORY | READ, VIEW_HISTORY |
| Quittances | READ, VIEW_HISTORY | READ, GENERATE, DOWNLOAD, CANCEL | READ, DOWNLOAD, EXPORT, VIEW_HISTORY | READ, VIEW_HISTORY |
| Recouvrement | READ | READ, **WRITE** | — | — |
| Impositions | READ, WRITE | — | READ (boutons gérer masqués) | — |
| Règles / Référentiels | RULE_READ, TAXONOMY_READ, TAXONOMY_WRITE | TAXONOMY_READ (lecture seule) | TAXONOMY_READ (lecture seule) | — |
| Contrôles | READ, WRITE | READ | READ | — |
| Réclamations | READ, WRITE | READ | READ | READ, WRITE |
| Remboursements | READ, WRITE | READ | READ, WRITE | READ |
| Messages | READ, WRITE | READ, WRITE | READ, WRITE | READ, WRITE |
| Rapports | READ, TAX | READ, RECOVERY | READ, FINANCIAL | — |
| Notifications | READ | READ | — | READ |

`SUPER_ADMIN` et `ADMIN` : toutes les permissions.

## 4. Routes publiques

| Endpoint | Usage |
| -------- | ----- |
| `GET /`, `/login`, `/register` | Landing, connexion, inscription |
| `POST /api/auth/login`, `/refresh`, `/register` | Authentification |
| `GET /api/receipts/verify/**` | Vérification publique d'une quittance |
| `/actuator/health`, `/actuator/info` | Santé |
| `/v3/api-docs/**`, `/swagger-ui/**`, `/h2-console/**` | **Dev uniquement** (`mnk-tax.security.expose-api-docs=false` en prod) |

## 5. Routes de l'application (permission requise)

| Route | Permission |
| ----- | ---------- |
| `/dashboard` | `REPORT_READ` |
| `/taxpayers`, `/taxpayers/:id` | `TAXPAYER_READ` |
| `/declarations` | `DECLARATION_READ` |
| `/assessments` | `ASSESSMENT_READ` |
| `/debts`, `/debts/:id` | `DEBT_READ` |
| `/collection`, `/overdue`, `/reminders`, `/notices`, `/plans`, `/history` | `COLLECTION_READ` |
| `/payments`, `/pending`, `/stats` | `PAYMENT_READ` |
| `/receipts` | `RECEIPT_READ` |
| `/controls` | `CONTROL_READ` |
| `/complaints` | `COMPLAINT_READ` |
| `/refunds` | `REFUND_READ` |
| `/messages` | `MESSAGE_READ` |
| `/deadlines` | `TAXONOMY_READ` |
| `/tax-rules` | `RULE_READ` |
| `/reports` | `REPORT_READ` |
| `/users`, `/registrations` | `USER_READ` |
| `/roles` | `ROLE_READ` |
| `/audit` | `AUDIT_READ` |
| `/parameters` | `PARAMETER_READ` |
| `/notifications` | `NOTIFICATION_READ` |
| `/profile`, `/forbidden` | authentifié |

Un refus d'accès redirige vers `/forbidden` (page 403 explicite). Après connexion,
la redirection cible la première page autorisée (`lib/navigation.ts`).

Tableau endpoint ↔ permission : [`API.md`](API.md).

## 6. Isolation par ligne (contribuables)

Les permissions protègent les endpoints, pas les lignes. Le composant `DataScope`
(`taxpayer/service/DataScope.java`) restreint un compte `TAXPAYER` à son dossier, rattaché
via `taxpayers.user_id` :

- listes (`/api/taxpayers`, `/api/debts`, `/api/declarations`, `/api/payments`, `/api/receipts`) :
  le filtre `taxpayerId` est forcé sur le dossier de l'utilisateur ;
- détails et sous-ressources (`GET /{id}`, `/history`, `/contact`, `/pdf`, `/reconcile`) :
  vérification de propriété après chargement (anti-IDOR) ;
- agrégats (`/stats`, `/statistics`, `/calendar`) : interdits aux contribuables ;
- le rattachement est établi à la création d'un contribuable (email identique) et à
  l'approbation d'une demande d'inscription.

## 7. Comptes de démonstration

Seed activé par `SEED_DEMO` (défaut `true` en dev, `false` en prod/test).

| Login | Mot de passe | Rôle |
| ----- | ------------ | ---- |
| `superadmin` | `Admin@123` | SUPER_ADMIN |
| `admin` | `Admin@123` | ADMIN |
| `agent.tax` | `Agent@123` | TAX_AGENT |
| `agent.collection` | `Agent@123` | COLLECTION_AGENT |
| `accountant` | `Agent@123` | ACCOUNTANT |
| `taxpayer.demo` | `Taxpayer@123` | TAXPAYER |

## 8. Points de vigilance

1. `SUPER_ADMIN` ≡ `ADMIN` : aucune différence effective dans le modèle de données.
2. `DemoDataSeeder.seedRoles()` réécrase `role_permissions` des rôles système à chaque
   démarrage si `SEED_DEMO=true`.
3. Les permissions non référencées par un endpoint ne sont pas appliquées ; la liste
   ci-dessus est le catalogue, `docs/API.md` la matrice endpoint ↔ permission.
4. Les rôles personnalisés (`system=false`) sont créés via `POST /api/roles`, qui exige
   désormais `ROLE_WRITE` **et** `ROLE_ASSIGN`.