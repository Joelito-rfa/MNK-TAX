# MNK-TAX — Rapport d'analyse technique

> Rapport d'analyse du projet **MNK-TAX** (stage L3 Informatique — parcours Développement d'applications).
> Méthode : lecture directe du code source, des migrations Flyway, de la configuration et des rapports de tests.
> Convention : toute information introuvable dans le dépôt est notée **NON TROUVÉ**. Aucun secret, mot de passe ou valeur de fichier `.env` n'est reproduit (noms de variables uniquement).

---

## 1. Présentation du projet et objectifs

**MNK-TAX** est un prototype académique de **plateforme de gestion fiscale** destinée à l'administration fiscale malgache (contexte Madagascar : monnaie MGA, fuseau `Indian/Antananarivo`, noms de centres fiscaux d'Antananarivo).

D'après `README.md` et `docs/ARCHITECTURE.md`, le système couvre le cycle de vie complet de la relation fiscale :

- gestion des **contribuables** (NIF, contacts, statut) ;
- production et contrôle des **déclarations** ;
- **liquidation / évaluation** des impôts par moteur de règles ;
- suivi des **créances** (dettes fiscales) et de leur **recouvrement** ;
- **paiements**, échéanciers, **quittances** (PDF + QR code) ;
- réclamations, remboursements, contrôles fiscaux ;
- **communications** (e-mail/SMS) déclenchées par événements, notifications ;
- **journal d'audit**, tableaux de bord et rapports ;
- assistant conversationnel **M-TAX AI**.

Avertissement légal repris du `README.md` : « MNK-TAX est un travail d'étude. Toute ressemblance avec un système réel est fortuite ; aucun document produit (quittance, mise en demeure, rapport) n'a de valeur officielle. »

**Étendue du dépôt** : application web 3 tiers (backend Spring Boot + frontend React + base PostgreSQL), déployable en Docker ou sur Render (avec base Neon).

---

## 2. Architecture générale

Schéma retenu (documentation `docs/ARCHITECTURE.md`) : **architecture 3 tiers**.

```
Navigateur (SPA React + Vite)
        │  HTTPS / REST JSON + JWT (Authorization: Bearer …)
        ▼
API Spring Boot (sécurité Stateless, validation, moteur de règles)
        │  JDBC                          ▲
        ├────────────► PostgreSQL 16 (migrations Flyway V1→V35)
        ├────────────► Redis (cache + rate-limit)
        └────────────► stockage fichiers locaux (quittances, documents, avatars)
```

### 2.1 Modules backend (`backend/src/main/java/com/mnktax/`)

| Module | Responsabilité |
|---|---|
| `auth` | utilisateurs, rôles, permissions, JWT, refresh tokens, sessions, profils |
| `taxpayer` | fiches contribuables, NIF, contacts, statuts |
| `tax` | référentiel (types d'impôts, régimes, centres, échéances), obligations, moteur (`tax/engine`) |
| `declaration` | dépôt, relecture, validation, correction, rectificative, historique |
| `assessment` | évaluations/liquidations, avis PDF |
| `debt` | créances fiscales, ajustements, litiges, pénalités/intérêts |
| `payment` | paiements, confirmation, imputation (allocation), rapprochement |
| `paymentplan` | échéanciers et échéances |
| `receipt` | quittances, QR code, PDF, vérification publique par jeton |
| `collection` | recouvrement : relances, mises en demeure, litiges, priorités |
| `communication` | campagnes, modèles, règles d'événements, livraisons e-mail/SMS |
| `message` | messagerie interne (threads, pièces jointes) |
| `notification` | notifications utilisateur |
| `control` | contrôles fiscaux et redressements |
| `complaint` | réclamations |
| `refund` | demandes de remboursement |
| `audit` | journal d'audit |
| `reporting` | tableaux de bord et rapports |
| `ai` | assistant M-TAX AI |
| `administration` | paramètres système |
| `document` | pièces jointes |
| `common` | configuration, exceptions, intercepteurs, utilitaires, seed de démonstration |

Chaque module suit la même structure : `controller/`, `service/`, `repository/`, `entity/`, `dto/` (+ `engine/` pour `tax`).

### 2.2 Frontend (`frontend/src/`)

- `pages/` : 36 fichiers de page (dont sous-dossiers `collection/`, `payments/`) ;
- `components/` : 19 composants partagés (`Layout`, `Sidebar`, `Header`, `ProtectedRoute`, `AiAssistant`, `Toast`, animations…) ;
- `lib/` : `api.ts` (client Axios), `auth.tsx`, `i18n.ts`, `theme.ts`, utilitaires ;
- `locales/` : `fr.ts`, `mg.ts` (malgache), `en.ts`.

### 2.3 Points d'architecture notables

- **API Stateless** : `SessionCreationPolicy.STATELESS`, tokens JWT (accès) + refresh tokens stockés en base avec rotation et révocation (`SecurityConfig.java`, `AuthService.java`).
- **Moteur de règles séparé** : `tax/engine/` (`RuleResolver`, `TaxCalculator`, `TaxContext`) — les règles sont **données** (table `tax_rules`), pas du code.
- **Événements de communication** : `CommunicationEventEngine` déclenché par les événements métier (ex. `DEBT_OVERDUE` dans `DebtService.markOverdue`).
- **Historisation systématique** : `declaration_history`, `debt_history`, `audit_logs`, `refresh_tokens`, `message_deliveries`…
- **Profils Spring** : `dev` (H2), `docker`, `prod`, `render`, `test` — un fichier `application-<profil>.yml` par environnement.

---

## 3. Technologies, outillage et dépendances

### 3.1 Backend — `backend/pom.xml`

| Élément | Valeur |
|---|---|
| Groupe / artefact / version | `com.mnktax` / `mnk-tax-backend` / `1.0.0` |
| Java | **17** (`<java.version>17</java.version>`) |
| Framework | **Spring Boot 3.3.5** (parent `spring-boot-starter-parent`) |
| Dépendances principales | `spring-boot-starter-web`, `-data-jpa`, `-security`, `-validation`, `-actuator`, `-cache`, `-data-redis`, `-mail`, `springdoc-openapi-starter-webmvc-ui` **2.6.0**, `postgresql`, `flyway-core`, `flyway-database-postgresql`, `h2`, `jjwt-api`/`jjwt-impl`/`jjwt-jackson` (JWT), `zxing` (`core` + `javase`) **3.5.3** (QR code), `openpdf` **1.3.40** (PDF), `twilio` (SMS), `lombok` |
| Build / qualité | `maven-compiler-plugin`, `maven-spring-boot-plugin`, **`jacoco-maven-plugin`** (couverture) |
| Tests | `spring-boot-starter-test`, `spring-security-test`, JUnit 5 |
| Wrapper Maven | `backend/mvnw`, `backend/mvnw.cmd` |

*(Détail complet des dépendances : NON TROUVÉ — voir directement `backend/pom.xml`.)*

### 3.2 Frontend — `frontend/package.json`

| Élément | Valeur |
|---|---|
| Runtime | **React 19.2.8**, **TypeScript ~6.0.2** |
| Bundler | **Vite ^8.2.0** |
| Styles | **Tailwind CSS v4.3.3** |
| Routage | `react-router-dom ^7.18.2` |
| Accès données | `axios ^1.19.0` + **TanStack Query ^5.101.4** |
| Forms / validation | `react-hook-form`, **zod ^4.4.3** |
| Graphes | `recharts ^3.10.1` |
| UI / effets | `lucide-react` (icônes), `motion`, `react-markdown` |
| Tests / lint | **vitest ^4.1.11** (+ `jsdom`, `@testing-library/react`), **oxlint** |
| Scripts | `dev`, `build` (`tsc -b && vite build`), `lint` (`oxlint`), `test` (`vitest run`), `preview` |

### 3.3 Infrastructure

- **PostgreSQL 16** (`postgres:16-alpine` dans `docker-compose.yml`) — cible de production ;
- **H2 en mode PostgreSQL** pour les profils `dev` et `test` (`jdbc:h2:mem:mnktax;MODE=PostgreSQL…`) ;
- **Redis 7** (`redis:7-alpine`) : type de cache `redis` + rate-limit ;
- **nginx** pour le frontend conteneurisé ;
- **Render + Neon** : `render.yaml`, `docs/DEPLOYMENT-RENDER.md`.

### 3.4 Volumétrie du code (comptage sur le dépôt)

| Langage | Lignes |
|---|---|
| Java | 29 469 |
| TSX | 34 115 |
| TS | 8 872 |
| CSS | 2 450 |
| SQL (migrations) | 1 585 |
| Markdown | ≈ 1 121 |
| YAML | 243 + 38 |
| JSON | 182 |
| PowerShell | 168 |
| Shell | 16 |
| Dockerfile | 67 |

---

## 4. Modèle de données

- **53 tables**, générées par **35 migrations Flyway** numérotées `V1__…` → `V35__…` dans `backend/src/main/resources/db/migration/`.
- `spring.jpa.hibernate.ddl-auto: validate` + `spring.flyway.enabled: true` → le schéma est **exclusivement** piloté par Flyway (aucune génération Hibernate).
- Documentation associée : `docs/DATABASE.md` (voir §11 pour les incohérences constatées avec le code).

### 4.1 Tables par domaine

| Domaine | Tables (noms exacts, 53 au total) |
|---|---|
| Sécurité / annuaire | `users`, `roles`, `permissions`, `role_permissions`, `user_roles`, `refresh_tokens`, `registration_requests` |
| Contribuables | `taxpayers`, `taxpayer_addresses`, `taxpayer_activities`, `tax_obligations` |
| Référentiel fiscal | `tax_types`, `tax_regimes`, `tax_centers`, `tax_rules`, `tax_rule_versions`, `deadlines`, `penalties`, `interests`, `system_parameters` |
| Déclarations | `declarations`, `declaration_lines`, `declaration_annexes`, `declaration_histories` |
| Liquidation | `assessments`, `assessment_lines`, `assessment_history` |
| Créances | `tax_debts`, `debt_items`, `debt_history`, `debt_disputes` |
| Paiements | `payments`, `payment_allocations`, `payment_plans`, `payment_plan_installments` |
| Quittances | `receipts` |
| Recouvrement | `collection_actions`, `collection_notices` |
| Communication | `campaigns`, `campaign_recipients`, `communication_event_rules`, `message_templates`, `messages`, `message_attachments`, `message_deliveries`, `notifications` |
| Suivi / contrôle | `tax_controls`, `control_documents`, `complaints`, `complaint_responses`, `refunds` |
| Transverse | `audit_logs`, `documents` |

*(Répartition ci-dessus regroupée par domaine ; l'extraction exhaustive (colonnes, clés primaires, clés étrangères, contraintes, migration d'origine) figure dans le listing des 53 tables produit à partir des migrations. À noter : il n'existe **aucune table dédiée** `user_sessions` ou `security_events` — `UserService.getActiveSessions` / `getSecurityHistory` (`UserService.java:306, 347`) s'appuient sur `refresh_tokens` et `audit_logs` ; les avatars sont des fichiers sur disque (`AVATAR_STORAGE_DIR`).)*

### 4.2 Énumérations métier (machines à états)

| Enum | Fichier | Valeurs |
|---|---|---|
| `DeclarationStatus` | `declaration/entity/DeclarationStatus.java` | `DRAFT, SUBMITTED, UNDER_REVIEW, VALIDATED, REJECTED, CANCELLED, LIQUIDEE, PAYEE, A_CORRIGER` |
| `DebtStatus` | `debt/entity/DebtStatus.java` | `DRAFT, ISSUED, DUE, PARTIALLY_PAID, PAID, OVERDUE, IN_COLLECTION, DISPUTED, SUSPENDED, CLOSED` |
| `PaymentStatus` | `payment/entity/PaymentStatus.java` | `PENDING, CONFIRMED, ALLOCATED, PARTIALLY_ALLOCATED, REJECTED, CANCELLED` |
| `ReceiptStatus` | `receipt/entity/ReceiptStatus.java` | `GENERATED, ISSUED, VALID, CANCELLED, REFUNDED, REPLACED` |
| `AssessmentStatus` | `assessment/entity/AssessmentStatus.java` | `EMISED, NOTIFIEE, ANNULEE` |
| `PaymentPlanStatus` / `InstallmentStatus` | `paymentplan/entity/*` | `ACTIVE, COMPLETED` / `PENDING, PARTIALLY_PAID, PAID, OVERDUE` |
| `RefundStatus` | `refund/entity/RefundStatus.java` | `PENDING, UNDER_REVIEW, APPROVED, REJECTED` |
| `ComplaintStatus` | `complaint/entity/ComplaintStatus.java` | `OPEN, UNDER_REVIEW, ACCEPTED, REJECTED` |
| `ControlStatus` | `control/entity/ControlStatus.java` | `OPEN, IN_PROGRESS, ANOMALY_DETECTED, REDRESSEMENT` |
| `TaxpayerStatus` | `taxpayer/entity/TaxpayerStatus.java` | `ACTIVE, INACTIVE, SUSPENDED, CLOSED` |
| `MessageStatus` / `DeliveryStatus` / `CampaignStatus` | `communication/entity/*` | `DRAFT, SCHEDULED, QUEUED, SENDING, SENT, PARTIAL, FAILED` / `PENDING…BOUNCED` / `QUEUED, SENDING, COMPLETED, FAILED` |

Autres enums transverses : `CalculationMethod`, `Periodicity`, `DebtOrigin`, `DebtItem.Kind` (`PRINCIPAL, PENALTY, INTEREST, ADJUSTMENT, CREDIT`), `PaymentMethod`, `PaymentAllocation.Component`, `CommunicationChannel`, `CommunicationEventType`, `NotificationType`, `DisputeStatus`, `DisputeDecision`, `RefundReason`, `ControlType`, `ContextType`, etc. (liste complète : 42 fichiers `*entity/*.java`).

---

## 5. Fonctionnalités implémentées

Toutes les fonctions ci-dessous sont **présentes dans le code** (contrôleur/service cité).

### 5.1 Comptes, rôles et profils
- Inscription avec validation par un administrateur : `POST /api/auth/register` puis `admin/registrations/{id}/approve|reject|assign` (`AuthController`).
- Connexion / rafraîchissement / déconnexion, révocation de sessions, historique de sécurité, avatar, changement de mot de passe (`AuthService`).
- Gestion des utilisateurs et des rôles (`UserController`, `RoleController`), 90 permissions déclarées (`Permissions.java`).

### 5.2 Contribuables
- CRUD, statistiques, génération du **NIF suivant** (`GET /api/taxpayers/next-nif`), recherche par NIF, contacts (`TaxpayerController`).
- Page détaillée `TaxpayerDetail.tsx` (fiche + onglets déclarations/créances/paiements).

### 5.3 Déclarations
- Création, modification, soumission, relecture, validation, rejet, demande/clore de correction, **déclaration rectificative**, annulation, suppression, historique, calendrier et statistiques (`DeclarationController` — 16 routes).
- Pièces jointes (`addAnnexe`), restriction des contribuables clôturés (`requireOpen`).

### 5.4 Moteur de calcul et liquidations
- Résolution de la règle applicable (`RuleResolver`) puis calcul (`TaxCalculator`) : taux fixes, pourcentage de base/chiffre d'affaires, **barème progressif à tranches**, forfait par unité ; plancher/plafond, exonération, déduction.
- Évaluations : simulation, création d'office, ajustement, notification, annulation, **avis PDF** (`AssessmentController`).
- Passage automatique de la déclaration à `LIQUIDEE` après liquidation.

### 5.5 Créances et recouvrement
- Liste, retards, détection d'**en retard** (`POST /api/debts/mark-overdue`), ajustements, mise en recouvrement, annulation, suspension/réactivation, clôture, priorité, observations, historique, statistiques (`DebtController` — 15 routes).
- Recouvrement : relances, **mises en demeure** et **états des restes** (documents générés), litiges (`disputes`) avec décision, historique par créance, résumé des retards (`CollectionController` — 18 routes).
- **Échéanciers** (plans de paiement) : création, annulation, stats (`PaymentPlanController`).

### 5.6 Paiements et quittances
- Paiement, confirmation, **imputation manuelle/automatique**, annulation, rejet, rapprochement (`/reconcile`), statistiques (`PaymentController`).
- Quittances : génération, PDF (OpenPDF), **QR code** (ZXing), annulation, remplacement, remboursement, et **vérification publique** `GET /api/receipts/verify/{token}` (accessible sans authentification).

### 5.7 Contrôle, réclamations, remboursements
- Contrôle fiscal : ouverture, suivi, clôture, types/étapes (`TaxControlController`).
- Réclamations avec réponses et statistiques (`ComplaintController`).
- Remboursements : demande, revue, paiement, suppression (`RefundController`).

### 5.8 Communications et notifications
- Aperçu/envoi, expéditeurs, **modèles**, **campagnes**, **règles d'événements**, suivi des livraisons, relances/annulation d'envois, statistiques (`CommunicationController` — 20 routes).
- Messagerie interne : threads, pièces jointes, compteur de non-lus, archivage, fermeture/réouverture (`MessageController`).
- Notifications : liste, compteur, marquage lu (routes sans `@PreAuthorize`, filtrées par utilisateur connecté).
- Ordonnanceur : cron `COMM_SCHEDULER_CRON` (défaut `0 15 7 * * *`, fuseau `Indian/Antananarivo`), file d'attente configurable (`batch-size`, `max-attempts`, `retry-backoff`).

### 5.9 Tableaux de bord, rapports, audit
- `GET /api/dashboard/summary`, rapports : statistiques, déclarations, créances, recouvrement, paiements, contribuables, activité (`DashboardController`, `ReportController`).
- Journal d'audit : `GET /api/audit-logs`, `/stats` (`AuditController`).

### 5.10 Assistant M-TAX AI
- `POST /api/ai/chat` (`AiController`) → `AiService` : détection d'intention **par scoring**, extraction d'entités (NIF, montants, périodes), suivi de contexte (12 derniers messages), questions composées, détection de langue **français / anglais / malgache**, analyse proactive (tendances, anomalies) à partir du `DashboardService`.
- **Aucune IA externe** : traitement 100 % local par règles/regex (`AiService.java`, `AiMessages.java` — 64 Ko de lexiques).
- Le périmètre « statistiques globales » n'est ouvert qu'aux profils possédant `REPORT_READ` (passé depuis `AiController.chat`).

### 5.11 Transverse
- Paramètres système (`SystemParameterController`), échéances (`DeadlineController`), référentiel (`ReferenceController`), obligations (`TaxObligationController`), règles fiscales avec **versions** et historique (`TaxRuleController`).
- Documentation OpenAPI/Swagger exposée (`/swagger-ui/**`, `/v3/api-docs/**`).

---

## 6. Acteurs, rôles et cas d'utilisation

### 6.1 Rôles (seedés en base, `DemoDataSeeder.seedRoles()`)

Fichier : `backend/src/main/java/com/mnktax/common/config/DemoDataSeeder.java` (`@Component`, `ApplicationRunner`).

Le seed complet n'exécute `seedRoles()` **que si** `mnk-tax.seed-demo` est `true` (défaut) **et** que la table `users` est vide (`run()`, lignes 259-272 : `if (userRepository.count() > 0) return;`). Si un rôle existe déjà, ses permissions sont **remplacées** par celles du code (`existing.setPermissions(perms)`, ligne 454).

**6 rôles** définis aux lignes 400-445 :

| Rôle | Périmètre (extraits exacts du code) |
|---|---|
| `SUPER_ADMIN` | **toutes** les permissions (`allPermissionCodes()`) |
| `ADMIN` | **toutes** les permissions (`allPermissionCodes()`) |
| `TAX_AGENT` | contribuables (read/write/export/history), déclarations (création→validation), créances (lecture), évaluations, règles, rapports fiscaux, quittances (lecture), recouvrement (lecture), messagerie, contrôles, réclamations, remboursements |
| `COLLECTION_AGENT` | créances (write, assignation en recouvrement), paiements (write), quittances (génération/téléchargement/annulation), recouvrement (read/write), rapports de recouvrement, relances/messages |
| `ACCOUNTANT` | déclarations (lecture/création), paiements (write, confirm, allocate), quittances (export), rapports financiers, remboursements |
| `TAXPAYER` | **sa propre** lecture (`TAXPAYER_READ`), déclarations (création/soumission), créances/paiements/quittances en lecture, notifications, messages, réclamations, remboursements (lecture) |

6 comptes de démonstration sont créés par `seedUsers()` (`DemoDataSeeder.java:474-481`) : identifiants et mots de passe en clair dans la source — **non reproduits ici** (voir §11).

### 6.2 Correspondance rôle → écrans (frontend)

Le menu est filtré par permission (`filterNavSections`, `Sidebar.tsx:94-102`) et chaque route est protégée par `ProtectedRoute permission="…"` (`App.tsx`).

| Écran (route) | Permission requise |
|---|---|
| `/dashboard` | `REPORT_READ` |
| `/taxpayers`, `/taxpayers/:id` | `TAXPAYER_READ` |
| `/declarations` | `DECLARATION_READ` |
| `/assessments` | `ASSESSMENT_READ` |
| `/debts`, `/debts/:id` | `DEBT_READ` |
| `/collection` (+ `overdue`, `reminders`, `notices`, `plans`, `history`) | `COLLECTION_READ` |
| `/payments` (+ `pending`, `stats`) | `PAYMENT_READ` |
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
| `/profile`, `/notifications` | authentification seule |

### 6.3 Cas d'utilisation principaux (déduits des routes et des services)

1. **Contribuable** : se connecter → consulter ses déclarations/créances/paiements → déposer une déclaration → la soumettre → consulter ses quittances → ouvrir une réclamation → échanger avec l'administration via la messagerie.
2. **Agent fiscal** : gérer les contribuables → relier/valider les déclarations → déclencher une liquidation → consulter les rapports fiscaux.
3. **Agent de recouvrement** : repérer les créances en retard → appliquer pénalités/intérêts → générer relances/mises en demeure → suivre les litiges et échéanciers → enregistrer un paiement.
4. **Comptable** : confirmer/imputer les paiements → générer/télécharger les quittances → suivre les remboursements → rapports financiers.
5. **Administrateur** : approuver les inscriptions → gérer utilisateurs/rôles/permissions → paramétrer le référentiel (impôts, règles, échéances) → consulter l'audit → piloter les campagnes de communication.
6. **Public (anonyme)** : vérifier l'authenticité d'une quittance (`/verify/receipt/:reference`), consulter la page d'accueil, s'inscrire, se connecter.

---

## 7. API REST : routes et contrôle d'accès

- **27 contrôleurs**, **226 routes** (méthodes `GET/POST/PUT/PATCH/DELETE`).
- **206 routes** portent un `@PreAuthorize` avec **45 permissions différentes** ; **20 routes** n'ont pas de `@PreAuthorize` (elles restent couvertes par `anyRequest().authenticated()`, sauf liste `permitAll`).
- Documentation générée : `docs/API.md` (tables endpoints / permissions / paramètres) + Swagger UI actif par défaut (`EXPOSE_API_DOCS:true`).

### 7.1 Routes publiques (`SecurityConfig.java:62-66`)

```java
auth.requestMatchers("/api/auth/login", "/api/auth/refresh", "/api/auth/register").permitAll()
    .requestMatchers("/api/receipts/verify/**").permitAll()
    .requestMatchers("/actuator/health", "/actuator/info").permitAll();
// profil dev/test uniquement (false en production) :
auth.requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html", "/h2-console/**").permitAll();
auth.anyRequest().authenticated();
```

### 7.2 Répartition par contrôleur

| Contrôleur | Routes | Exemples de permissions |
|---|---|---|
| `AuthController` | 19 | `USER_READ/WRITE` ou aucune (authentification seule) |
| `CollectionController` | 18 | `COLLECTION_READ/WRITE` |
| `CommunicationController` | 20 | `MESSAGE_WRITE`, `MESSAGE_MANAGE`, `MESSAGE_READ` |
| `MessageController` | 16 | `MESSAGE_READ/WRITE` |
| `DeclarationController` | 16 | `DECLARATION_READ/WRITE/VALIDATE` |
| `DebtController` | 15 | `DEBT_READ/WRITE`, `COLLECTION_WRITE` |
| `TaxpayerController` | 10 | `TAXPAYER_READ/WRITE`, `MESSAGE_WRITE` |
| `AssessmentController` | 10 | `ASSESSMENT_READ/WRITE` |
| `PaymentController` | 9 | `PAYMENT_READ/WRITE/CONFIRM/ALLOCATE/CANCEL/RECONCILE` |
| `UserController` | 9 | `USER_READ/WRITE/RESET_PASSWORD` |
| `ReceiptController` | 8 | `RECEIPT_READ/DOWNLOAD/CANCEL/REPLACE/REFUND` |
| `ReportController` | 8 | `REPORT_READ` |
| `RefundController` | 8 | `REFUND_READ/WRITE` |
| `ComplaintController` | 7 | `COMPLAINT_READ/WRITE` |
| `TaxRuleController` | 7 | `RULE_READ/WRITE` |
| `ReferenceController` | 7 | `TAXONOMY_READ/WRITE` |
| `TaxControlController` | 6 | `CONTROL_READ/WRITE` |
| `DeadlineController` | 5 | `TAXONOMY_READ/WRITE` |
| `TaxObligationController` | 5 | `TAXPAYER_READ/WRITE/DELETE` |
| `PaymentPlanController` | 5 | `COLLECTION_READ/WRITE` |
| `RoleController` | 4 | `ROLE_READ/WRITE` |
| `DocumentController` | 4 | `TAXPAYER_READ/WRITE/DELETE` |
| `NotificationController` | 4 | aucune (connecté) |
| `AuditController` | 2 | `AUDIT_READ` |
| `SystemParameterController` | 2 | `PARAMETER_READ/WRITE` |
| `DashboardController` | 1 | `REPORT_READ` |
| `AiController` | 1 | aucune (connecté) |
| **Total** | **226** | |

> Le détail **route → permission** (226 lignes) figure en **Annexe A**.

---

## 8. Sécurité et authentification

Documentation : `docs/SECURITY.md`. Points vérifiés dans le code :

| Mécanisme | Implémentation | Fichier |
|---|---|---|
| Authentification | `AuthenticationManager` + `UsernamePasswordAuthenticationToken`, mots de passe hachés (BCrypt via `PasswordEncoder`) | `AuthService.java:54-70` |
| Jetons | access token JWT court (`JWT_ACCESS_TTL`, défaut 3600 s) + refresh token opaque stocké en base (`JWT_REFRESH_TTL`, défaut 604800 s) | `AuthService.login/refresh` |
| Rotation | à chaque `refresh`, l'ancien refresh token est marqué `revoked` et un nouveau est émis | `AuthService.refresh` |
| Sessions | `STATELESS`, révocation groupée (`/me/sessions/revoke-all`), historique de sécurité | `SecurityConfig.java:57` |
| Autorisations | RBAC : rôles → permissions en base, exposés en autorités Spring `PERMISSION_*` (`CustomUserDetails`), `@PreAuthorize("hasAuthority('PERMISSION_X')")` | `Permissions.java`, contrôleurs |
| CSRF / CORS | CSRF désactivé (API JWT) ; CORS restreint par `CORS_ALLOWED_ORIGINS` | `SecurityConfig.java:55-56` |
| Rate limiting | intercepteur sur **toutes les routes `/api/**`** : fenêtre glissante 60 s, **120 requêtes/min par adresse IP** (`X-Forwarded-For` prioritaire), réponse `429 RATE_LIMITED` ; compteur **en mémoire** (remis à zéro au redémarrage, non partagé entre instances) | `common/web/RateLimitInterceptor.java`, `common/config/WebConfig.java` |
| Journal d'audit | `AuditService.record(...)` sur `LOGIN`, `TOKEN_REFRESH`, `LOGOUT`, `PASSWORD_CHANGE`, actions métier | `AuditService.java` |
| Politique de mot de passe | longueur minimale 8, interdiction de réutiliser l'ancien (`WEAK_PASSWORD`, `SAME_PASSWORD`) | `AuthService.changePassword` |
| Uploads | taille max 10 Mo (`spring.servlet.multipart`) | `application.yml` |
| Fichiers sensibles en prod | Swagger/H2 désactivés via `expose-api-docs` dans `application-prod.yml` | `application.yml:71-74` |
| Secrets | tous injectés par variables d'environnement (`JWT_SECRET`, `DATABASE_PASSWORD`, `SMS_AUTH_TOKEN`, `MAIL_*`) | `application*.yml` |

**Faiblesses relevées** : voir §11 (secret JWT par défaut en clair dans le dépôt, comptes de démo, MFA déclaré mais inactif, `mfaEnabled(false)`).

---

## 9. Règles de gestion métier

### 9.1 Vie du cycle de déclaration (`DeclarationService.java`)

Transitions contrôlées par `requireState(...)` → erreur `INVALID_TRANSITION` sinon :

| Action (route) | État requis | Nouvel état | Ligne |
|---|---|---|---|
| création / modification initiale | `DRAFT` | — | 203, 243 |
| `PUT /{id}/submit` | `DRAFT` | `SUBMITTED` | 243-244 |
| `PUT /{id}/review` | `SUBMITTED` | `UNDER_REVIEW` | 263-264 |
| `PUT /{id}/validate` | `SUBMITTED` ou `UNDER_REVIEW` | `VALIDATED` puis `LIQUIDEE` (après liquidation) | 275-290 |
| `PUT /{id}/reject` | `SUBMITTED` ou `UNDER_REVIEW` | `REJECTED` | 308-309 |
| `PUT /{id}/correction` | `SUBMITTED` ou `UNDER_REVIEW` | `A_CORRIGER` | 329-331 |
| `PUT /{id}/correct` | `A_CORRIGER` | `DRAFT` | 345-348 |
| `POST /{id}/rectificative` | `VALIDATED`, `LIQUIDEE` ou `PAYEE` | nouvelle déclaration | 381 |
| `PUT /{id}/cancel` | `DRAFT` ou `SUBMITTED` | `CANCELLED` | 427-429 |
| `DELETE /{id}` | `DRAFT` | suppression | 442 |

Règle supplémentaire : un contribuable `CLOSED` ne peut plus déposer (`requireOpen`, ligne ~490). La déclaration passe automatiquement à `PAYEE` lorsque **toutes** ses créances sont soldées (`DebtService.markDeclarationPaidIfFullyPaid`).

### 9.2 Calcul de l'impôt (`tax/engine/TaxCalculator.java`)

- `assiette >= 0` exigée (`INVALID_BASE`) ; assiette nulle → impôt nul.
- Méthodes : `FLAT_RATE`, `PERCENTAGE_OF_BASE`, `PERCENTAGE_OF_TURNOVER` → `assiette × taux / 100` (arrondi `HALF_UP` à 2 décimales) ; `PROGRESSIVE` → tranches JSON ; `PER_UNIT` → `taux × unités`.
- Barème progressif : `brackets = [{"upTo":50000000,"rate":0},{"upTo":100000000,"rate":10},{"upTo":null,"rate":20}]` — `upTo` est un **seuil cumulé**, dernière tranche `null`, seuils croissants ; fallback sur taux simple si absent.
- `net = brut − exonération − déduction`, plancher à 0, arrondi 2 décimales.

### 9.3 Résolution de la règle applicable (`RuleResolver` + `TaxRuleRepository`)

Filtres : actif, en vigueur à la date (`effectiveFrom <= :date <= effectiveTo`), type d'impôt, et critères **optionnels** (type de contribuable, régime, code activité) qui valent `NULL = indifférent`. Tri par **spécificité décroissante** puis date :

```sql
ORDER BY
  CASE WHEN r.taxpayerType  IS NOT NULL THEN 1 ELSE 0 END DESC,
  CASE WHEN r.regime        IS NOT NULL THEN 1 ELSE 0 END DESC,
  CASE WHEN r.activityCode  IS NOT NULL THEN 1 ELSE 0 END DESC,
  r.effectiveFrom DESC
```
(`TaxRuleRepository.java:39-47`). Si aucun candidat → `BusinessException("RULE_NOT_FOUND", …)`.

### 9.4 Créances : total, statuts, pénalités (`DebtService.java`)

- `total = principal + pénalités + intérêts − ajustements − crédits` (jamais < 0) ; `balance = total − payé` (jamais < 0) — `recalculate()`.
- Statut automatique : `balance = 0` → `PAID` (+ `closedAt`, déclaration `PAYEE` si plus aucune créance) ; sinon paiement partiel → `PARTIALLY_PAID` ; échéance passée → `OVERDUE` ; statuts figés `CANCELLED/SUSPENDED/CLOSED` non modifiés.
- Dette `PAID` : tout nouveau mouvement est refusé (`DEBT_ALREADY_PAID`) sauf **annulation de paiement** (`recalculate(debt, true)`) qui la réactive (`PARTIALLY_PAID`/`OVERDUE`/`ISSUED`).
- Interdiction d'ajuster une dette payée ou clôturée ; impossible d'annuler une dette ayant reçu un paiement (`DEBT_HAS_PAYMENTS`) ; suspension interdite sur `PAID/CANCELLED/CLOSED` ; `resume()` ne s'applique que depuis `SUSPENDED` et restaure `OVERDUE` ou `ISSUED` selon la date.
- **Pénalité et intérêts de retard** (`applyLateCharges`) : appliqués **une seule fois** (un seul item `PENALTY`/`INTEREST` autorisé) ;
  - pénalité = `solde × taux_pénalité / 100` (code paramètre `PARAM_PENALTY_CODE`, défaut **5 %**) ;
  - intérêt = `solde × taux_intérêt × max(1, mois) / 100` (code `PARAM_INTEREST_CODE`, défaut **1 %/mois**, `ChronoUnit.MONTHS` entre échéance et aujourd'hui) ;
  - taux récupérés en base (`penalties`, `interests`), valeurs par défaut en dur en secours.
- Passage en retard : `POST /api/debts/mark-overdue` → `findToMarkOverdueFiltered` + `applyLateCharges` + statut `OVERDUE` + événement `DEBT_OVERDUE` (communication automatique).

### 9.5 Imputation des paiements (`PaymentAllocationService.java`)

Ordre automatique d'imputation : **principal → pénalité → intérêt** (lignes 73-75), chaque composant plafonné à son montant (`principalAmount`, `penaltyAmount`, `interestAmount` — lignes 83-85) ; imputation manuelle possible avec commentaire ; total alloué recalculé depuis `payment_allocations`, `paidAmount` de chaque dette recalculé ; statut `ALLOCATED` / `PARTIALLY_ALLOCATED`.

### 9.6 Quittances et vérification publique

- QR code PNG généré par ZXing, marge 1, nommé `qr_<hash>.png` (`QrCodeService.generate`) ; URL de vérification construite sur `RECEIPT_BASE_URL` + `GET /api/receipts/verify/{token}` (**sans authentification**) → page `/verify/receipt/:reference`.
- PDF quittance : `openpdf` (`ReceiptPdfService`) ; avis d'imposition : `GET /api/assessments/{id}/avis.pdf`.

### 9.7 Validation d'identifiant fiscal

- `NifValidator` (`common/util/NifValidator.java`), appliqué par l'annotation `@ValidNif` via `common/validation/NifValidatorImpl` : contrôle **uniquement** du format `^[0-9]{10}$` (10 chiffres), aucun contrôle de clé.
- ⚠️ `docs/DATABASE.md` annonce une validation NIF « mod 97 » : **incohérence document/code** (cf. §11).

### 9.8 Autres règles

- Politique de mot de passe : ≥ 8 caractères, différent de l'ancien.
- Rate-limit : 120 requêtes/minute/**IP** sur `/api/**`, désactivable (`RATE_LIMIT_ENABLED`), mémoire locale (non partagé).
- Communication : `mail.enabled` et `sms.enabled` à `false` tant que `MAIL_HOST`/`SMS_PROVIDER` non configurés → **aucun faux statut « envoyé »** (commentaire explicite dans `application.yml`).
- Scheduler : revue/relance planifiée quotidienne à 07h15 (fuseau Madagascar) par défaut.

---

## 10. Interfaces utilisateur (frontend)

### 10.1 Pages publiques
`Home.tsx` (landing + animations `FiscalAnimation3D`, `FallingMoney`, `WelcomeHero`), `Login.tsx`, `Register.tsx`, `ReceiptVerify.tsx`, `NotFound.tsx`.

### 10.2 Pages applicatives (protégées)

| Groupe (menu `Sidebar.tsx`) | Pages |
|---|---|
| Pilotage | `Dashboard.tsx` |
| Contribuables | `Taxpayers.tsx`, `TaxpayerDetail.tsx` |
| Déclarations | `Declarations.tsx` |
| Liquidations | `Assessments.tsx` |
| Créances | `Debts.tsx`, `DebtDetail.tsx` |
| Recouvrement | `collection/Overview`, `collection/Overdue`, `collection/Reminders`, `collection/Notices`, `CollectionPlans`, `CollectionHistory` |
| Paiements | `payments/PaymentsList`, `payments/PaymentsPending`, `payments/PaymentsStats`, `Receipts.tsx` |
| Contrôle & litiges | `Controls.tsx`, `Complaints.tsx`, `Refunds.tsx` |
| Échanges | `Messages.tsx`, `Notifications.tsx` |
| Référentiel | `Deadlines.tsx`, `TaxRules.tsx` |
| Analyse | `Reports.tsx` |
| Administration | `Users.tsx`, `RegistrationRequests.tsx`, `Roles.tsx`, `AuditLogs.tsx`, `Parameters.tsx` |
| Personnel | `Profile.tsx` |

### 10.3 Qualités transverses de l'UI
- **Internationalisation 3 langues** : `fr`, `mg` (malgache), `en` — **1 599 clés par fichier**, test de parité `frontend/src/locales/__tests__/i18n-parity.test.ts`.
- Thème clair/sombre (`ThemeProvider`), toasts (`ToastProvider`), recherche globale (`GlobalSearch`), portail d'actions en ligne (`RowActionPortal`), assistant IA 3D (`AiAssistant.tsx`).
- Garde d'accès déclarative : `<ProtectedRoute permission="…">` imbriqués (`App.tsx`).
- Graphes (`recharts`) sur le dashboard, les paiements et les rapports.
- Listes filtrées/paginées via TanStack Query + `api.ts` (instance Axios centralisée, intercepteurs d'authentification/refresh).

---

## 11. Tests, qualité logicielle et défauts constatés

### 11.1 Tests backend

- **17 classes de test** présentes dans `backend/src/test/java` :
  `AiServiceTest`, `AiTextMatcherTest`, `AuthFlowIntegrationTest`, `ProfileModuleIntegrationTest`, `CollectionModuleIntegrationTest`, `NifValidatorTest`, `PhoneUtilTest`, `CommunicationLifecycleIntegrationTest`, `ComplaintRefundModuleIntegrationTest`, `TaxControlModuleIntegrationTest`, `FiscalFlowIntegrationTest`, `PaymentPlanIntegrationTest`, `ReceiptServiceTest`, `RuleResolverTest`, `TaxCalculatorTest`, `TaxRuleRepositoryResolveTest`, `TaxpayerModuleIntegrationTest`.
- **Rapports SureFire présents** (`backend/target/surefire-reports`, 5 classes uniquement) :

| Classe | Tests | Échecs |
|---|---|---|
| `AiServiceTest` | 18 | 0 |
| `AiTextMatcherTest` | 13 | 0 |
| `TaxCalculatorTest` | 14 | 0 |
| `RuleResolverTest` | 6 | 0 |
| `FiscalFlowIntegrationTest` | 4 | 0 |
| **Total** | **55** | **0** |

- ⚠️ Les 12 autres classes de test **n'ont aucun rapport** : les `*.dumpstream` indiquent des échecs de découverte JUnit :
  - `2026-09-28T10-26-05_384-jvmRun1.dumpstream` : `TestEngine with ID 'junit-jupiter' failed to discover tests`
  - `2026-10-03T23-11-27_178.dumpstream` : `Boot Manifest-JAR contains absolute paths in classpath '…\target\test-classes'` / `'other' has different root`
  → la suite complète n'est **pas** exécutée telle quelle sur cette machine Windows.
- Les fichiers `*.txt` SureFire sont encodés en UTF-16 et quasi vides → lire les `TEST-*.xml`.
- Couverture **JaCoCo partielle** : **11,8 %** d'instructions (rapport incomplet — d'autres classes non exécutées).
- Le `README.md` annonce « **35 tests** » : **incohérent** avec les 55 tests réellement rapportés (§ ci-dessus).

### 11.2 Tests frontend

4 fichiers : `lib/__tests__/profile-utils.test.ts`, `locales/__tests__/i18n-parity.test.ts`, `__tests__/ChangePasswordModal.test.tsx`, `__tests__/Profile.test.tsx` — exécution via `npm run test` (Vitest). **NON TROUVÉ** : rapport de couverture frontend.

### 11.3 Dettes techniques / bugs / incohérences relevés

| # | Constat | Preuve |
|---|---|---|
| 1 | **Secret JWT par défaut en clair** dans le dépôt (`mnk-tax.jwt.secret: ${JWT_SECRET:…}`) : tout déploiement qui omet `JWT_SECRET` utilise une valeur publiquement connue. *Nuance : `render.yaml` fixe `JWT_SECRET: generateValue: true`, mais le fallback de `application.yml` reste actif partout ailleurs (Docker, local, autre hébergeur)* | `backend/src/main/resources/application.yml`, `render.yaml:13-14` |
| 2 | **Comptes de démonstration avec mots de passe en clair** dans la source, et `seed-demo: ${SEED_DEMO:true}` **actif par défaut** | `DemoDataSeeder.java:474-481`, `application.yml` (`seed-demo`) |
| 3 | `render.yaml` force `SEED_DEMO=true` | `render.yaml` |
| 4 | **MFA déclaré mais inactif** : champ `mfaEnabled` toujours `false`, aucun endpoint TOTP/OTP | `DemoDataSeeder.createUser`, `Permissions`/`UserController` (aucune route MFA) |
| 5 | **Documentation ≠ code** : `docs/DATABASE.md:54` ne liste que 5 rôles (`SUPER_ADMIN`, `TAX_AGENT`, `COLLECTION_AGENT`, `ACCOUNTANT`, `TAXPAYER`) — le rôle `ADMIN` existe pourtant dans le seed (**6 rôles**) | `docs/DATABASE.md` vs `DemoDataSeeder.seedRoles` (lignes 400-445) |
| 6 | **Documentation ≠ code** : `docs/DATABASE.md:43` annonce « NIF : 10 chiffres, 10e = clé (algorithme mod-97, validation stricte côté API) », alors que `NifValidator` (`common/util/NifValidator.java:10`) ne vérifie que `^[0-9]{10}$` (aucun contrôle de clé) | `docs/DATABASE.md:43` vs `common/util/NifValidator.java` |
| 7 | **README ≠ réalité** : « 35 tests » annoncés, 55 tests dans les rapports, 17 classes de test au total | `README.md` vs `target/surefire-reports` |
| 8 | Suite de tests **non exécutable** en l'état sur Windows (découverte JUnit, `'other' has different root`) | `*.dumpstream` |
| 9 | Couverture **11,8 %** | rapport JaCoCo partiel |
| 10 | Aucune balise `TODO` / `FIXME` / `XXX` / `HACK` / `@deprecated` dans `backend/src` ni `frontend/src` | recherche systématique → **aucun résultat pertinent** |
| 11 | Javadoc/strings **corrompues en UTF-8** affichées « è/é » fautifs (`DǸclaration`, `payǸe`…) dans les sources et messages d'erreur | `DeclarationService`, `DebtService` |
| 12 | Libellés d'enum atypiques en anglais/français mélangés : `AssessmentStatus.EMISED` (« ÉMISE » ?), `REDRESSEMENT` en majuscules accentuées, `LIQUIDEE` sans accent | `assessment/entity/AssessmentStatus.java`, `control/entity/ControlStatus.java`, `declaration/entity/DeclarationStatus.java` |
| 13 | Fichiers de test SureFire en UTF-16 quasi vides → lisibilité réduite | `*.txt` |
| 14 | **Jeton stocké dans `localStorage`** (`mnk_tax_refresh_token`) : exposé en cas de XSS ; aucun cookie `HttpOnly` | `frontend/src/lib/api.ts:4-19` |
| 15 | **Rate-limit en mémoire** (`ConcurrentHashMap`) : perdu au redémarrage, non partagé si plusieurs instances | `RateLimitInterceptor.java:20` |

### 11.4 Commandes de vérification disponibles

```bash
cd backend  && ./mvnw test          # tests backend
cd backend  && ./mvnw package -DskipTests
cd frontend && npm run lint          # oxlint
cd frontend && npm run test          # vitest run
cd frontend && npm run build         # tsc -b && vite build
```

---

## 12. Déploiement et exploitation

### 12.1 Docker Compose (`docker-compose.yml`)

| Service | Image | Rôle |
|---|---|---|
| `postgres` | `postgres:16-alpine` | base principale (variables `POSTGRES_*`) |
| `redis` | `redis:7-alpine` | cache + rate-limit |
| `backend` | build `backend/` | API sur `BACKEND_PORT` |
| `frontend` | build `frontend/` + **nginx** | SPA sur `FRONTEND_PORT` |

### 12.2 Render (`render.yaml` + `docs/DEPLOYMENT-RENDER.md`)

- Service **API** : conteneur Docker, port **10000**, image/build backend ;
- Service **frontend** : site statique ;
- Base **Neon PostgreSQL** (branche gérée par le plugin Neon, `.neon/` présent) ;
- `SEED_DEMO=true` dans le template de déploiement ;
- Documentées : limites du plan gratuit, CORS (`CORS_ALLOWED_ORIGINS`), URL de quittance (`RECEIPT_BASE_URL`).

### 12.3 Profils Spring

| Profil | Fichier | Base |
|---|---|---|
| `dev` (défaut) | `application-dev.yml` | H2 en mémoire `MODE=PostgreSQL` |
| `docker` | `application-docker.yml` | `${DATABASE_URL:jdbc:postgresql://postgres:5432/mnktax}` |
| `prod` | `application-prod.yml` | `${DATABASE_URL}` **obligatoire**, Swagger/H2 coupés |
| `render` | `application-render.yml` | base Neon + URL publique Render |
| `test` | `application-test.yml` | H2 `jdbc:h2:mem:mnktax_test` |

### 12.4 Variables d'environnement (noms uniquement)

**Base** : `SERVER_PORT`, `SPRING_PROFILES_ACTIVE`, `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `POSTGRES_PORT/DB/USER/PASSWORD`, `NEON_BRANCH`, `JPA_SHOW_SQL`.
**Sécurité** : `JWT_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`, `CORS_ALLOWED_ORIGINS`, `RATE_LIMIT_ENABLED`, `RATE_LIMIT_PER_MINUTE`, `EXPOSE_API_DOCS`.
**Cache/infra** : `REDIS_HOST`, `REDIS_PORT`.
**Fichiers** : `RECEIPT_STORAGE_DIR`, `RECEIPT_BASE_URL`, `DOCUMENT_STORAGE_DIR`, `AVATAR_STORAGE_DIR`.
**Communication** : `MAIL_ENABLED`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_SMTP_AUTH`, `MAIL_SMTP_STARTTLS`, `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME`, `MAIL_BASE_URL`, `SMS_ENABLED`, `SMS_PROVIDER`, `SMS_ACCOUNT_SID`, `SMS_AUTH_TOKEN`, `SMS_FROM_NUMBER`, `COMM_SCHEDULER_CRON`, `SCHEDULER_TIMEZONE`, `COMM_QUEUE_BATCH_SIZE`, `COMM_QUEUE_MAX_ATTEMPTS`, `COMM_QUEUE_RETRY_BACKOFF_MINUTES`, `COMM_TEST_EMAIL`, `COMM_TEST_SMS`, `LOG_LEVEL`.
**Divers** : `SEED_DEMO`, `BACKEND_PORT`, `FRONTEND_PORT`, `JAVA_OPTS`.
**Frontend** : `VITE_API_BASE_URL`.

> Les **valeurs** de `.env` / `.env.local` ne sont volontairement pas reproduites (règle de sécurité du rapport).

---

## 13. Métriques et historique de développement

- **Git** : 33 commits, **auteur unique « Joelito »** (`rafanomezantsoaarmijoelito@gmail.com`), période **2026-08-17 → 2026-09-22**, branche `main`.
- **Volume** : 29 469 lignes Java, 42 987 lignes TS/TSX, 53 tables, 35 migrations, 226 routes REST, 36 pages React, 3 langues × 1 599 clés i18n.
- **Derniers lots de travail** (extraits `git log`) : cycle de vie des évaluations + assistants de recouvrement ; assistant IA 3D ; campagnes de communication ; déploiement Render/Neon ; refonte frontend (profil, recouvrement, échéanciers, litiges).
- **Documentation** : `README.md`, `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/DATABASE.md`, `docs/SECURITY.md`, `docs/DEPLOYMENT.md`, `docs/DEPLOYMENT-RENDER.md`, `docs/FAKE_DATA_DOCUMENTATION.md` + `fake-data-seed.json`.
- **Taille des sources les plus lourdes** : `DemoDataSeeder.java` (119 Ko), `AiService.java` (91 Ko), `AiMessages.java` (64 Ko), `CommunicationService.java` (47 Ko), `DebtService.java` (34 Ko).

---

## 14. Points forts, limites et pistes d'évolution

### Points forts
1. **Moteur de règles paramétrable** (règles versionnées en base, tranches progressives, critères de spécificité) plutôt que du code en dur.
2. **Traçabilité de bout en bout** : historique des déclarations, historique des dettes, journal d'audit, livraisons de messages, refresh tokens.
3. **RBAC fin** : 90 permissions, filtrage à la fois de l'API (`@PreAuthorize`) et de l'interface (menu + routes).
4. **Cohérence métier** : transitions d'états verrouillées, imputation ordonnée, pénalités idempotentes, arrondis `BigDecimal` partout.
5. **Multi-canal** communication pilotée par événements, désactivée proprement tant que non configurée.
6. **Déploiement industrialisé** : Docker Compose, Render + Neon, profils Spring dédiés.
7. **Trilinguisme** (fr/mg/en) avec test de parité des clés.

### Limites
1. **Sécurité par défaut** : secret JWT et comptes de démo en clair dans le dépôt, `SEED_DEMO=true` par défaut.
2. **Couverture de tests faible** (11,8 %) et suite partiellement inexploitable sur Windows.
3. **Documentation désynchronisée** (nombre de rôles, validation NIF, nombre de tests).
4. **MFA absent** malgré le champ `mfaEnabled`.
5. **Pas d'intégration externe réelle** (e-mail/SMS en mode « non configuré », aucun fournisseur de paiement branché : `PaymentMethod` en local uniquement — *détail d'intégration bancaire : NON TROUVÉ*).
6. **Pas de tests de charge / pas de CI visible** : **NON TROUVÉ** (aucun dossier `.github/workflows`, aucun pipeline CI dans le dépôt).
7. Sources Unicode partiellement corrompues (affichage des accents).

### Pistes d'évolution
- Corriger les défauts de sécurité par défaut (secret généré, `SEED_DEMO=false` en prod) et ajouter une vérification au démarrage.
- Rendre la suite de tests exécutable (encodage UTF-8, config SureFire/Windows) et porter la couverture sur les services métier.
- Implémenter réellement le MFA, l'export comptable et le rapprochement bancaire.
- Aligner `docs/DATABASE.md`, `docs/API.md` et `README.md` sur le code (script de vérification).
- Exiger `DATABASE_URL` sans valeur par défaut partout, figer les dépendances, ajouter CI (build + tests + lint).

---

## 15. Extraits de code commentés

### 15.1 Configuration de la source de données (noms de variables, sans valeurs secrètes)

```yaml
# backend/src/main/resources/application.yml
spring:
  jpa:
    open-in-view: false
    hibernate:
      ddl-auto: validate          # le schéma vient de Flyway, pas d'Hibernate
  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true
  data.redis:                     # cache + rate-limit
    host: ${REDIS_HOST:localhost}
    port: ${REDIS_PORT:6379}

# application-dev.yml  -> jdbc:h2:mem:mnktax;MODE=PostgreSQL;…
# application-prod.yml -> url: ${DATABASE_URL}  (aucune valeur par défaut)
#                         username: ${DATABASE_USERNAME}
#                         password: ${DATABASE_PASSWORD}
```

### 15.2 Connexion (JWT + refresh token)

```java
// backend/.../auth/service/AuthService.java:54
@Transactional
public LoginResponse login(LoginRequest request, HttpServletRequest httpRequest) {
    var authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.username(), request.password()));
    CustomUserDetails principal = (CustomUserDetails) authentication.getPrincipal();
    User user = userRepository.findByUsername(principal.getUsername())
            .orElseThrow(() -> new ResourceNotFoundException("Utilisateur", principal.getUsername()));
    userRepository.updateLastLogin(user.getId(), Instant.now(), clientIp(httpRequest), ...);
    String accessToken  = jwtService.generateAccessToken(principal, Map.of("userId", user.getId()));
    String refreshToken = issueRefreshToken(user, principal, clientIp(httpRequest), ...);
    auditService.record("LOGIN", "USER", String.valueOf(user.getId()), null, user.getUsername(), httpRequest);
    return new LoginResponse(accessToken, refreshToken, "Bearer", jwtAccessTtl(principal), UserDto.from(user));
}
```

### 15.3 Chaîne de sécurité (extrait)

```java
// backend/.../auth/security/SecurityConfig.java:53
http.csrf(AbstractHttpConfigurer::disable)
    .cors(cors -> cors.configurationSource(corsConfigurationSource))
    .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
    ...
auth.requestMatchers("/api/auth/login", "/api/auth/refresh", "/api/auth/register").permitAll()
    .requestMatchers("/api/receipts/verify/**").permitAll()
    .requestMatchers("/actuator/health", "/actuator/info").permitAll();
auth.anyRequest().authenticated();
http.addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
```

### 15.4 Résolution de la règle fiscale la plus spécifique

```java
// backend/.../tax/engine/RuleResolver.java:26
public TaxRule resolve(TaxContext context) {
    List<TaxRule> candidates = taxRuleRepository.resolve(
            context.taxType().getId(), taxpayerType, context.regimeId(),
            context.activityCode(), context.effectDate());
    if (candidates.isEmpty()) {
        throw new BusinessException("RULE_NOT_FOUND",
                "Aucune règle fiscale applicable pour l'impôt " + context.taxType().getCode() + " …");
    }
    return candidates.get(0);   // le tri SQL garantit la règle la plus spécifique
}
```

### 15.5 Calcul de l'impôt (arrondis et méthodes)

```java
// backend/.../tax/engine/TaxCalculator.java:31
BigDecimal gross = grossFor(context, base, rate, rule);   // taux / progressif / par unité
gross = applyFloorAndCeiling(gross, rule);
BigDecimal net = gross.subtract(exemption).subtract(deduction);
if (net.signum() < 0) net = BigDecimal.ZERO;
return new CalculationResult(rule, ruleVersion, base, rate,
        gross.setScale(2, RoundingMode.HALF_UP), deduction, exemption,
        net.setScale(2, RoundingMode.HALF_UP));
```

### 15.6 Machine à états des déclarations

```java
// backend/.../declaration/service/DeclarationService.java:275
requireState(declaration, EnumSet.of(DeclarationStatus.SUBMITTED, DeclarationStatus.UNDER_REVIEW));
declaration.setStatus(DeclarationStatus.VALIDATED);
...
private void requireState(Declaration declaration, DeclarationStatus expected) {
    if (declaration.getStatus() != expected)
        throw new BusinessException("INVALID_TRANSITION",
                "Transition de statut invalide : " + declaration.getStatus() + " -> " + expected);
}
```

### 15.7 Recalcul d'une créance (règle d'or : jamais de négatif)

```java
// backend/.../debt/service/DebtService.java:335
BigDecimal total = debt.getPrincipalAmount().add(debt.getPenaltyAmount()).add(debt.getInterestAmount())
        .subtract(debt.getAdjustmentsAmount()).subtract(debt.getCreditsAmount());
if (total.signum() < 0) total = BigDecimal.ZERO;
debt.setTotalAmount(total);
BigDecimal balance = total.subtract(debt.getPaidAmount());
if (balance.signum() < 0) balance = BigDecimal.ZERO;
debt.setBalance(balance);
```

### 15.8 Pénalité et intérêt de retard (idempotents)

```java
// backend/.../debt/service/DebtService.java:288 (applyLateCharges)
if (!hasPenaltyItem) {                       // une seule pénalité par créance
    BigDecimal rate  = penaltyRepository.findByCode(penaltyCode).map(Penalty::getRate)
                            .orElse(BigDecimal.valueOf(5));               // défaut 5 %
    BigDecimal penalty = debt.getBalance().multiply(rate)
                            .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    debt.setPenaltyAmount(debt.getPenaltyAmount().add(penalty));
}
// intérêt : solde × taux (%) × max(1, nb de mois écoulés)
```

### 15.9 Imputation automatique : principal → pénalité → intérêt

```java
// backend/.../payment/service/PaymentAllocationService.java:73
autoAllocate(payment, debt, PaymentAllocation.Component.PRINCIPAL, remaining, ...);
autoAllocate(payment, debt, PaymentAllocation.Component.PENALTY,   remaining, ...);
autoAllocate(payment, debt, PaymentAllocation.Component.INTEREST,  remaining, ...);
```

### 15.10 QR code de quittance (ZXing)

```java
// backend/.../receipt/service/QrCodeService.java:17
public Path generate(String content, int size, Path targetDir) throws Exception {
    Files.createDirectories(targetDir);
    BitMatrix matrix = new QRCodeWriter().encode(content, BarcodeFormat.QR_CODE, size, size,
            Map.of(EncodeHintType.MARGIN, 1));
    Path file = targetDir.resolve("qr_" + Math.abs(content.hashCode()) + ".png");
    MatrixToImageWriter.writeToPath(matrix, "PNG", file);
    return file;
}
```

### 15.11 Protection des écrans côté React

```tsx
// frontend/src/App.tsx
<Route element={<ProtectedRoute />}>
  <Route element={<Layout />}>
    <Route path="debts" element={<ProtectedRoute permission="DEBT_READ" />}>
      <Route index element={<Debts />} />
      <Route path=":id" element={<DebtDetail />} />
    </Route>
```

### 15.12 Filtrage du menu par permission

```ts
// frontend/src/components/Sidebar.tsx:94
export function filterNavSections(permissions: string[]): NavSection[] {
  const can = (p: string) => permissions.includes(p)
  return sections.filter((i) => can(i.permission))
    .map((i) => i.children ? { ...i, children: i.children.filter((c) => can(c.permission)) } : i)
}
```

---

## Annexe A — Table complète des routes (226) et de leurs permissions

> Source : extraction automatique des blocs d'annotations des 27 contrôleurs (`*Controller.java`).
> `[aucune]` = pas de `@PreAuthorize` sur la méthode (authentification requise via `anyRequest().authenticated()`, sauf si la route figure dans la liste `permitAll` du §7.1).

| # | Contrôleur | Méthode | Route | Permission |
|---:|---|---|---|---|
| 1 | administration.controller.SystemParameterController | GET | `/api/parameters/` | `PARAMETER_READ` |
| 2 | administration.controller.SystemParameterController | PUT | `/api/parameters/` | `PARAMETER_WRITE` |
| 3 | ai.controller.AiController | POST | `/api/ai/chat` | _aucune (authentification seule)_ |
| 4 | assessment.controller.AssessmentController | GET | `/api/assessments/` | `ASSESSMENT_READ` |
| 5 | assessment.controller.AssessmentController | GET | `/api/assessments/{id}` | `ASSESSMENT_READ` |
| 6 | assessment.controller.AssessmentController | GET | `/api/assessments/{id}/history` | `ASSESSMENT_READ` |
| 7 | assessment.controller.AssessmentController | GET | `/api/assessments/stats` | `ASSESSMENT_READ` |
| 8 | assessment.controller.AssessmentController | POST | `/api/assessments/simulate` | `ASSESSMENT_READ` |
| 9 | assessment.controller.AssessmentController | POST | `/api/assessments/office` | `ASSESSMENT_WRITE` |
| 10 | assessment.controller.AssessmentController | POST | `/api/assessments/{id}/adjust` | `ASSESSMENT_WRITE` |
| 11 | assessment.controller.AssessmentController | POST | `/api/assessments/{id}/notify` | `ASSESSMENT_WRITE` |
| 12 | assessment.controller.AssessmentController | POST | `/api/assessments/{id}/cancel` | `ASSESSMENT_WRITE` |
| 13 | assessment.controller.AssessmentController | GET | `/api/assessments/{id}/avis.pdf` | `ASSESSMENT_READ` |
| 14 | audit.controller.AuditController | GET | `/api/audit-logs/` | `AUDIT_READ` |
| 15 | audit.controller.AuditController | GET | `/api/audit-logs/stats` | `AUDIT_READ` |
| 16 | auth.controller.AuthController | POST | `/api/auth/login` | _aucune (authentification seule)_ |
| 17 | auth.controller.AuthController | POST | `/api/auth/register` | _aucune (authentification seule)_ |
| 18 | auth.controller.AuthController | GET | `/api/auth/admin/registrations` | `USER_READ` |
| 19 | auth.controller.AuthController | GET | `/api/auth/admin/registrations/stats` | `USER_READ` |
| 20 | auth.controller.AuthController | GET | `/api/auth/admin/registrations/{id}` | `USER_READ` |
| 21 | auth.controller.AuthController | POST | `/api/auth/admin/registrations/{id}/assign` | `USER_WRITE` |
| 22 | auth.controller.AuthController | POST | `/api/auth/admin/registrations/{id}/approve` | `USER_WRITE` |
| 23 | auth.controller.AuthController | POST | `/api/auth/admin/registrations/{id}/reject` | `USER_WRITE` |
| 24 | auth.controller.AuthController | POST | `/api/auth/refresh` | _aucune (authentification seule)_ |
| 25 | auth.controller.AuthController | POST | `/api/auth/logout` | _aucune (authentification seule)_ |
| 26 | auth.controller.AuthController | GET | `/api/auth/me` | _aucune (authentification seule)_ |
| 27 | auth.controller.AuthController | PUT | `/api/auth/me` | _aucune (authentification seule)_ |
| 28 | auth.controller.AuthController | GET | `/api/auth/me/avatar` | _aucune (authentification seule)_ |
| 29 | auth.controller.AuthController | DELETE | `/api/auth/me/avatar` | _aucune (authentification seule)_ |
| 30 | auth.controller.AuthController | POST | `/api/auth/change-password` | _aucune (authentification seule)_ |
| 31 | auth.controller.AuthController | GET | `/api/auth/me/sessions` | _aucune (authentification seule)_ |
| 32 | auth.controller.AuthController | POST | `/api/auth/me/sessions/{id}/revoke` | _aucune (authentification seule)_ |
| 33 | auth.controller.AuthController | POST | `/api/auth/me/sessions/revoke-all` | _aucune (authentification seule)_ |
| 34 | auth.controller.AuthController | GET | `/api/auth/me/security-history` | _aucune (authentification seule)_ |
| 35 | auth.controller.RoleController | GET | `/api/roles/` | `ROLE_READ` |
| 36 | auth.controller.RoleController | POST | `/api/roles/` | `ROLE_WRITE` |
| 37 | auth.controller.RoleController | PUT | `/api/roles/{id}/permissions` | `ROLE_WRITE` |
| 38 | auth.controller.RoleController | DELETE | `/api/roles/{id}` | `ROLE_WRITE` |
| 39 | auth.controller.UserController | GET | `/api/users/` | `USER_READ` |
| 40 | auth.controller.UserController | GET | `/api/users/{id}` | `USER_READ` |
| 41 | auth.controller.UserController | GET | `/api/users/{id}/avatar` | `USER_READ` |
| 42 | auth.controller.UserController | POST | `/api/users/` | `USER_WRITE` |
| 43 | auth.controller.UserController | PUT | `/api/users/{id}` | `USER_WRITE` |
| 44 | auth.controller.UserController | PATCH | `/api/users/{id}/enabled` | `USER_WRITE` |
| 45 | auth.controller.UserController | DELETE | `/api/users/{id}` | `USER_WRITE` |
| 46 | auth.controller.UserController | POST | `/api/users/{id}/reset-password` | `USER_RESET_PASSWORD` |
| 47 | auth.controller.UserController | POST | `/api/users/change-password` | _aucune (authentification seule)_ |
| 48 | collection.controller.CollectionController | GET | `/api/collection/debts` | `COLLECTION_READ` |
| 49 | collection.controller.CollectionController | GET | `/api/collection/periods` | `COLLECTION_READ` |
| 50 | collection.controller.CollectionController | GET | `/api/collection/overdue-summary` | `COLLECTION_READ` |
| 51 | collection.controller.CollectionController | GET | `/api/collection/detail/{id}` | `COLLECTION_READ` |
| 52 | collection.controller.CollectionController | GET | `/api/collection/stats` | `COLLECTION_READ` |
| 53 | collection.controller.CollectionController | GET | `/api/collection/actions` | `COLLECTION_READ` |
| 54 | collection.controller.CollectionController | POST | `/api/collection/actions` | `COLLECTION_WRITE` |
| 55 | collection.controller.CollectionController | GET | `/api/collection/notices` | `COLLECTION_READ` |
| 56 | collection.controller.CollectionController | POST | `/api/collection/notices` | `COLLECTION_WRITE` |
| 57 | collection.controller.CollectionController | GET | `/api/collection/history/{debtId}` | `COLLECTION_READ` |
| 58 | collection.controller.CollectionController | GET | `/api/collection/events` | `COLLECTION_READ` |
| 59 | collection.controller.CollectionController | GET | `/api/collection/documents/mise-en-demeure/{debtId}` | `COLLECTION_READ` |
| 60 | collection.controller.CollectionController | GET | `/api/collection/documents/relance/{debtId}` | `COLLECTION_READ` |
| 61 | collection.controller.CollectionController | GET | `/api/collection/documents/etat-restes` | `COLLECTION_READ` |
| 62 | collection.controller.CollectionController | POST | `/api/collection/disputes` | `COLLECTION_WRITE` |
| 63 | collection.controller.CollectionController | GET | `/api/collection/disputes/{id}` | `COLLECTION_READ` |
| 64 | collection.controller.CollectionController | PATCH | `/api/collection/disputes/{id}/decision` | `COLLECTION_WRITE` |
| 65 | collection.controller.CollectionController | POST | `/api/collection/payment` | `COLLECTION_WRITE` |
| 66 | communication.controller.CommunicationController | POST | `/api/communication/preview` | `MESSAGE_WRITE` |
| 67 | communication.controller.CommunicationController | POST | `/api/communication/send` | `MESSAGE_WRITE` |
| 68 | communication.controller.CommunicationController | GET | `/api/communication/senders` | `MESSAGE_WRITE` |
| 69 | communication.controller.CommunicationController | GET | `/api/communication/sent` | `MESSAGE_MANAGE` |
| 70 | communication.controller.CommunicationController | GET | `/api/communication/messages/{id}/deliveries` | `MESSAGE_MANAGE` |
| 71 | communication.controller.CommunicationController | POST | `/api/communication/messages/{id}/retry` | `MESSAGE_MANAGE` |
| 72 | communication.controller.CommunicationController | POST | `/api/communication/messages/{id}/cancel` | `MESSAGE_MANAGE` |
| 73 | communication.controller.CommunicationController | GET | `/api/communication/stats` | `MESSAGE_MANAGE` |
| 74 | communication.controller.CommunicationController | GET | `/api/communication/providers` | `MESSAGE_MANAGE` |
| 75 | communication.controller.CommunicationController | POST | `/api/communication/test` | `MESSAGE_MANAGE` |
| 76 | communication.controller.CommunicationController | GET | `/api/communication/templates` | `MESSAGE_MANAGE` |
| 77 | communication.controller.CommunicationController | POST | `/api/communication/templates` | `MESSAGE_MANAGE` |
| 78 | communication.controller.CommunicationController | POST | `/api/communication/templates/render` | `MESSAGE_WRITE` |
| 79 | communication.controller.CommunicationController | GET | `/api/communication/campaigns/preview` | `MESSAGE_MANAGE` |
| 80 | communication.controller.CommunicationController | POST | `/api/communication/campaigns` | `MESSAGE_MANAGE` |
| 81 | communication.controller.CommunicationController | GET | `/api/communication/campaigns` | `MESSAGE_MANAGE` |
| 82 | communication.controller.CommunicationController | GET | `/api/communication/event-rules` | `MESSAGE_MANAGE` |
| 83 | communication.controller.CommunicationController | POST | `/api/communication/event-rules/{id}` | `MESSAGE_MANAGE` |
| 84 | communication.controller.CommunicationController | GET | `/api/communication/my-messages` | `MESSAGE_READ` |
| 85 | communication.controller.CommunicationController | POST | `/api/communication/my-messages/{id}/read` | `MESSAGE_READ` |
| 86 | complaint.controller.ComplaintController | GET | `/api/complaints/` | `COMPLAINT_READ` |
| 87 | complaint.controller.ComplaintController | GET | `/api/complaints/{id}` | `COMPLAINT_READ` |
| 88 | complaint.controller.ComplaintController | GET | `/api/complaints/stats` | `COMPLAINT_READ` |
| 89 | complaint.controller.ComplaintController | POST | `/api/complaints/` | `COMPLAINT_WRITE` |
| 90 | complaint.controller.ComplaintController | PATCH | `/api/complaints/{id}` | `COMPLAINT_WRITE` |
| 91 | complaint.controller.ComplaintController | DELETE | `/api/complaints/{id}` | `COMPLAINT_WRITE` |
| 92 | complaint.controller.ComplaintController | POST | `/api/complaints/{id}/responses` | `COMPLAINT_WRITE` |
| 93 | control.controller.TaxControlController | GET | `/api/tax-controls/` | `CONTROL_READ` |
| 94 | control.controller.TaxControlController | GET | `/api/tax-controls/{id}` | `CONTROL_READ` |
| 95 | control.controller.TaxControlController | POST | `/api/tax-controls/` | `CONTROL_WRITE` |
| 96 | control.controller.TaxControlController | PATCH | `/api/tax-controls/{id}` | `CONTROL_WRITE` |
| 97 | control.controller.TaxControlController | DELETE | `/api/tax-controls/{id}` | `CONTROL_WRITE` |
| 98 | control.controller.TaxControlController | PATCH | `/api/tax-controls/{id}/close` | `CONTROL_WRITE` |
| 99 | debt.controller.DebtController | GET | `/api/debts/` | `DEBT_READ` |
| 100 | debt.controller.DebtController | GET | `/api/debts/overdue` | `DEBT_READ` |
| 101 | debt.controller.DebtController | GET | `/api/debts/{id}` | `DEBT_READ` |
| 102 | debt.controller.DebtController | GET | `/api/debts/{id}/history` | `DEBT_READ` |
| 103 | debt.controller.DebtController | GET | `/api/debts/stats` | `DEBT_READ` |
| 104 | debt.controller.DebtController | POST | `/api/debts/mark-overdue` | `DEBT_WRITE` |
| 105 | debt.controller.DebtController | PATCH | `/api/debts/{id}/adjustment` | `DEBT_WRITE` |
| 106 | debt.controller.DebtController | PATCH | `/api/debts/{id}/in-collection` | `COLLECTION_WRITE` |
| 107 | debt.controller.DebtController | PATCH | `/api/debts/{id}/cancel` | `DEBT_WRITE` |
| 108 | debt.controller.DebtController | PATCH | `/api/debts/{id}/suspend` | `DEBT_WRITE` |
| 109 | debt.controller.DebtController | PATCH | `/api/debts/{id}/resume` | `DEBT_WRITE` |
| 110 | debt.controller.DebtController | PATCH | `/api/debts/{id}/close` | `DEBT_WRITE` |
| 111 | debt.controller.DebtController | PATCH | `/api/debts/{id}/priority` | `DEBT_WRITE` |
| 112 | debt.controller.DebtController | PATCH | `/api/debts/{id}/observations` | `DEBT_WRITE` |
| 113 | debt.controller.DebtController | POST | `/api/debts/` | `DEBT_WRITE` |
| 114 | declaration.controller.DeclarationController | GET | `/api/declarations/` | `DECLARATION_READ` |
| 115 | declaration.controller.DeclarationController | GET | `/api/declarations/statistics` | `DECLARATION_READ` |
| 116 | declaration.controller.DeclarationController | GET | `/api/declarations/calendar` | `DECLARATION_READ` |
| 117 | declaration.controller.DeclarationController | GET | `/api/declarations/{id:\\d+}` | `DECLARATION_READ` |
| 118 | declaration.controller.DeclarationController | POST | `/api/declarations/` | `DECLARATION_WRITE` |
| 119 | declaration.controller.DeclarationController | PUT | `/api/declarations/{id}` | `DECLARATION_WRITE` |
| 120 | declaration.controller.DeclarationController | PUT | `/api/declarations/{id}/submit` | `DECLARATION_WRITE` |
| 121 | declaration.controller.DeclarationController | PUT | `/api/declarations/{id}/review` | `DECLARATION_VALIDATE` |
| 122 | declaration.controller.DeclarationController | PUT | `/api/declarations/{id}/validate` | `DECLARATION_VALIDATE` |
| 123 | declaration.controller.DeclarationController | PUT | `/api/declarations/{id}/reject` | `DECLARATION_VALIDATE` |
| 124 | declaration.controller.DeclarationController | PUT | `/api/declarations/{id}/correction` | `DECLARATION_WRITE` |
| 125 | declaration.controller.DeclarationController | PUT | `/api/declarations/{id}/correct` | `DECLARATION_WRITE` |
| 126 | declaration.controller.DeclarationController | POST | `/api/declarations/{id}/rectificative` | `DECLARATION_WRITE` |
| 127 | declaration.controller.DeclarationController | PUT | `/api/declarations/{id}/cancel` | `DECLARATION_WRITE` |
| 128 | declaration.controller.DeclarationController | DELETE | `/api/declarations/{id}` | `DECLARATION_WRITE` |
| 129 | declaration.controller.DeclarationController | GET | `/api/declarations/{id}/history` | `DECLARATION_READ` |
| 130 | document.controller.DocumentController | GET | `/api/documents/` | `TAXPAYER_READ` |
| 131 | document.controller.DocumentController | POST | `/api/documents/` | `TAXPAYER_WRITE` |
| 132 | document.controller.DocumentController | GET | `/api/documents/{id}/content` | `TAXPAYER_READ` |
| 133 | document.controller.DocumentController | DELETE | `/api/documents/{id}` | `TAXPAYER_DELETE` |
| 134 | message.controller.MessageController | GET | `/api/messages/` | `MESSAGE_READ` |
| 135 | message.controller.MessageController | GET | `/api/messages/sent` | `MESSAGE_READ` |
| 136 | message.controller.MessageController | GET | `/api/messages/archived` | `MESSAGE_READ` |
| 137 | message.controller.MessageController | GET | `/api/messages/stats` | `MESSAGE_READ` |
| 138 | message.controller.MessageController | GET | `/api/messages/{id}` | `MESSAGE_READ` |
| 139 | message.controller.MessageController | GET | `/api/messages/{id}/thread` | `MESSAGE_READ` |
| 140 | message.controller.MessageController | POST | `/api/messages/` | `MESSAGE_WRITE` |
| 141 | message.controller.MessageController | POST | `/api/messages/{id}/read` | `MESSAGE_READ` |
| 142 | message.controller.MessageController | POST | `/api/messages/{id}/thread-read` | `MESSAGE_READ` |
| 143 | message.controller.MessageController | POST | `/api/messages/read-all` | `MESSAGE_READ` |
| 144 | message.controller.MessageController | POST | `/api/messages/{id}/archive` | `MESSAGE_WRITE` |
| 145 | message.controller.MessageController | POST | `/api/messages/{id}/unarchive` | `MESSAGE_WRITE` |
| 146 | message.controller.MessageController | POST | `/api/messages/{id}/close` | `MESSAGE_WRITE` |
| 147 | message.controller.MessageController | POST | `/api/messages/{id}/reopen` | `MESSAGE_WRITE` |
| 148 | message.controller.MessageController | GET | `/api/messages/attachments/{attachmentId}` | `MESSAGE_READ` |
| 149 | message.controller.MessageController | GET | `/api/messages/unread-count` | `MESSAGE_READ` |
| 150 | notification.controller.NotificationController | GET | `/api/notifications/` | _aucune (authentification seule)_ |
| 151 | notification.controller.NotificationController | GET | `/api/notifications/unread-count` | _aucune (authentification seule)_ |
| 152 | notification.controller.NotificationController | POST | `/api/notifications/read-all` | _aucune (authentification seule)_ |
| 153 | notification.controller.NotificationController | POST | `/api/notifications/{id}/read` | _aucune (authentification seule)_ |
| 154 | payment.controller.PaymentController | GET | `/api/payments/` | `PAYMENT_READ` |
| 155 | payment.controller.PaymentController | GET | `/api/payments/{id}` | `PAYMENT_READ` |
| 156 | payment.controller.PaymentController | POST | `/api/payments/` | `PAYMENT_WRITE` |
| 157 | payment.controller.PaymentController | PUT | `/api/payments/{id}/confirm` | `PAYMENT_CONFIRM` |
| 158 | payment.controller.PaymentController | PUT | `/api/payments/{id}/allocate` | `PAYMENT_ALLOCATE` |
| 159 | payment.controller.PaymentController | PUT | `/api/payments/{id}/cancel` | `PAYMENT_CANCEL` |
| 160 | payment.controller.PaymentController | PUT | `/api/payments/{id}/reject` | `PAYMENT_CANCEL` |
| 161 | payment.controller.PaymentController | GET | `/api/payments/stats` | `PAYMENT_READ` |
| 162 | payment.controller.PaymentController | GET | `/api/payments/{id}/reconcile` | `PAYMENT_RECONCILE` |
| 163 | paymentplan.controller.PaymentPlanController | GET | `/api/collection/plans/` | `COLLECTION_READ` |
| 164 | paymentplan.controller.PaymentPlanController | GET | `/api/collection/plans/stats` | `COLLECTION_READ` |
| 165 | paymentplan.controller.PaymentPlanController | GET | `/api/collection/plans/{id}` | `COLLECTION_READ` |
| 166 | paymentplan.controller.PaymentPlanController | POST | `/api/collection/plans/` | `COLLECTION_WRITE` |
| 167 | paymentplan.controller.PaymentPlanController | PATCH | `/api/collection/plans/{id}/cancel` | `COLLECTION_WRITE` |
| 168 | receipt.controller.ReceiptController | GET | `/api/receipts/` | `RECEIPT_READ` |
| 169 | receipt.controller.ReceiptController | GET | `/api/receipts/stats` | `RECEIPT_READ` |
| 170 | receipt.controller.ReceiptController | GET | `/api/receipts/{id}` | `RECEIPT_READ` |
| 171 | receipt.controller.ReceiptController | GET | `/api/receipts/{id}/pdf` | `RECEIPT_DOWNLOAD` |
| 172 | receipt.controller.ReceiptController | PUT | `/api/receipts/{id}/cancel` | `RECEIPT_CANCEL` |
| 173 | receipt.controller.ReceiptController | POST | `/api/receipts/{id}/replace` | `RECEIPT_REPLACE` |
| 174 | receipt.controller.ReceiptController | PUT | `/api/receipts/{id}/refund` | `RECEIPT_REFUND` |
| 175 | receipt.controller.ReceiptController | GET | `/api/receipts/verify/{token}` | _aucune (authentification seule)_ |
| 176 | refund.controller.RefundController | GET | `/api/refunds/` | `REFUND_READ` |
| 177 | refund.controller.RefundController | GET | `/api/refunds/{id}` | `REFUND_READ` |
| 178 | refund.controller.RefundController | GET | `/api/refunds/stats` | `REFUND_READ` |
| 179 | refund.controller.RefundController | POST | `/api/refunds/` | `REFUND_WRITE` |
| 180 | refund.controller.RefundController | PATCH | `/api/refunds/{id}` | `REFUND_WRITE` |
| 181 | refund.controller.RefundController | DELETE | `/api/refunds/{id}` | `REFUND_WRITE` |
| 182 | refund.controller.RefundController | PATCH | `/api/refunds/{id}/review` | `REFUND_WRITE` |
| 183 | refund.controller.RefundController | PATCH | `/api/refunds/{id}/pay` | `REFUND_WRITE` |
| 184 | reporting.controller.DashboardController | GET | `/api/dashboard/summary` | `REPORT_READ` |
| 185 | reporting.controller.ReportController | GET | `/api/reports/stats` | `REPORT_READ` |
| 186 | reporting.controller.ReportController | GET | `/api/reports/stats/declarations` | `REPORT_READ` |
| 187 | reporting.controller.ReportController | GET | `/api/reports/stats/debts` | `REPORT_READ` |
| 188 | reporting.controller.ReportController | GET | `/api/reports/collection` | `REPORT_READ` |
| 189 | reporting.controller.ReportController | GET | `/api/reports/payments` | `REPORT_READ` |
| 190 | reporting.controller.ReportController | GET | `/api/reports/declarations` | `REPORT_READ` |
| 191 | reporting.controller.ReportController | GET | `/api/reports/taxpayers` | `REPORT_READ` |
| 192 | reporting.controller.ReportController | GET | `/api/reports/activity` | `REPORT_READ` |
| 193 | tax.controller.DeadlineController | GET | `/api/deadlines/` | `TAXONOMY_READ` |
| 194 | tax.controller.DeadlineController | POST | `/api/deadlines/` | `TAXONOMY_WRITE` |
| 195 | tax.controller.DeadlineController | PUT | `/api/deadlines/{id}` | `TAXONOMY_WRITE` |
| 196 | tax.controller.DeadlineController | DELETE | `/api/deadlines/{id}` | `TAXONOMY_WRITE` |
| 197 | tax.controller.DeadlineController | GET | `/api/deadlines/upcoming` | `TAXONOMY_READ` |
| 198 | tax.controller.ReferenceController | GET | `/api/tax-types` | `TAXONOMY_READ` |
| 199 | tax.controller.ReferenceController | POST | `/api/tax-types` | `TAXONOMY_WRITE` |
| 200 | tax.controller.ReferenceController | PATCH | `/api/tax-types/{id}/active` | `TAXONOMY_WRITE` |
| 201 | tax.controller.ReferenceController | GET | `/api/tax-regimes` | `TAXONOMY_READ` |
| 202 | tax.controller.ReferenceController | POST | `/api/tax-regimes` | `TAXONOMY_WRITE` |
| 203 | tax.controller.ReferenceController | GET | `/api/tax-centers` | `TAXONOMY_READ` |
| 204 | tax.controller.ReferenceController | POST | `/api/tax-centers` | `TAXONOMY_WRITE` |
| 205 | tax.controller.TaxObligationController | GET | `/api/obligations/` | `TAXPAYER_READ` |
| 206 | tax.controller.TaxObligationController | POST | `/api/obligations/` | `TAXPAYER_WRITE` |
| 207 | tax.controller.TaxObligationController | PUT | `/api/obligations/{id}` | `TAXPAYER_WRITE` |
| 208 | tax.controller.TaxObligationController | DELETE | `/api/obligations/{id}` | `TAXPAYER_DELETE` |
| 209 | tax.controller.TaxObligationController | POST | `/api/obligations/generate` | `TAXPAYER_WRITE` |
| 210 | tax.controller.TaxRuleController | GET | `/api/tax-rules/` | `RULE_READ` |
| 211 | tax.controller.TaxRuleController | GET | `/api/tax-rules/{id}` | `RULE_READ` |
| 212 | tax.controller.TaxRuleController | POST | `/api/tax-rules/` | `RULE_WRITE` |
| 213 | tax.controller.TaxRuleController | PUT | `/api/tax-rules/{id}` | `RULE_WRITE` |
| 214 | tax.controller.TaxRuleController | PATCH | `/api/tax-rules/{id}/active` | `RULE_WRITE` |
| 215 | tax.controller.TaxRuleController | GET | `/api/tax-rules/versions/recent` | `RULE_READ` |
| 216 | tax.controller.TaxRuleController | GET | `/api/tax-rules/{id}/versions` | `RULE_READ` |
| 217 | taxpayer.controller.TaxpayerController | GET | `/api/taxpayers/` | `TAXPAYER_READ` |
| 218 | taxpayer.controller.TaxpayerController | GET | `/api/taxpayers/stats` | `TAXPAYER_READ` |
| 219 | taxpayer.controller.TaxpayerController | GET | `/api/taxpayers/next-nif` | `TAXPAYER_WRITE` |
| 220 | taxpayer.controller.TaxpayerController | GET | `/api/taxpayers/contacts` | `MESSAGE_WRITE` |
| 221 | taxpayer.controller.TaxpayerController | GET | `/api/taxpayers/{id:\\d+}/contact` | `MESSAGE_WRITE` |
| 222 | taxpayer.controller.TaxpayerController | GET | `/api/taxpayers/{id:\\d+}` | `TAXPAYER_READ` |
| 223 | taxpayer.controller.TaxpayerController | GET | `/api/taxpayers/nif/{nif}` | `TAXPAYER_READ` |
| 224 | taxpayer.controller.TaxpayerController | POST | `/api/taxpayers/` | `TAXPAYER_WRITE` |
| 225 | taxpayer.controller.TaxpayerController | PUT | `/api/taxpayers/{id}` | `TAXPAYER_WRITE` |
| 226 | taxpayer.controller.TaxpayerController | PATCH | `/api/taxpayers/{id}/status` | `TAXPAYER_WRITE` |

---

## Annexe B — Informations manquantes

Les éléments suivants ont été cherchés et **NON TROUVÉS** dans le dépôt :

- Exigences fonctionnelles formalisées (cahier des charges, user stories) : **NON TROUVÉ**.
- Diagrammes UML / de séquence / d'activité (hors schéma 3 tiers ASCII de `docs/ARCHITECTURE.md`) : **NON TROUVÉ**.
- Intégration à un système de paiement ou à un gateway bancaire : **NON TROUVÉ**.
- Pipeline CI/CD (`.github/workflows`, GitLab CI, Jenkins…) : **NON TROUVÉ**.
- Tests de charge / performance / sécurité automatisés (SAST, DAST) : **NON TROUVÉ**.
- Rapport de couverture frontend : **NON TROUVÉ**.
- Journal des modifications / CHANGELOG : **NON TROUVÉ**.
- Licence du projet : **NON TROUVÉ** (seul un « Avertissement légal » figure dans le `README.md`).
- Politique de rétention / sauvegarde (backup) de la base : **NON TROUVÉ**.
- Journal de bord de stage / compte rendu d'activité : **NON TROUVÉ**.
- Choix argumentés de l'arborescence des 35 migrations (histoire de conception) : **NON TROUVÉ**.
- Les **valeurs** des secrets (`.env`, `.env.local`) : volontairement **non relevées** conformément à la consigne de sécurité.
