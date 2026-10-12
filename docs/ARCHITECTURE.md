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
| `collection` | Actions de recouvrement, mises en demeure, litiges, documents (relance, état des restes) |
| `paymentplan` | Échéanciers de paiement et suivi des échéances |
| `complaint` | Réclamations des contribuables et réponses |
| `control` | Contrôles fiscaux, documents demandés, redressements |
| `refund` | Demandes de remboursement (crédit TVA, trop-perçu) |
| `document` | Documents joints aux contribuables, stockage fichiers |
| `notification` | Notifications internes (échéances, paiements, recouvrement) |
| `message` | Messagerie interne (fils, priorités, pièces jointes) |
| `communication` | Centre de communication multicanal (IN_APP, EMAIL, SMS), modèles, campagnes, file d'envoi |
| `ai` | Assistant conversationnel (FR/MG/EN) |
| `audit` | Journalisation des opérations sensibles |
| `reporting` | Synthèses dashboard et rapports (recouvrement, paiements, déclarations, contribuables, activité) |
| `administration` | Paramètres système (clés/valeurs, catégorisées) |
| `common` | Infra transverse : exceptions, sécurité, CORS, rate-limit, scheduler |

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

### Flux annexes

- **Réclamation** : créée par/ pour un contribuable → examen → acceptée/rejetée → clôturée
  (suppression possible tant qu'elle est `OPEN`).
- **Contrôle fiscal** : ouverture → en cours → anomalies → redressement → clôture ; le
  redressement peut générer une **créance** rattachée.
- **Remboursement** : demande → examen (approuvé/rejeté) → paiement (mode + référence).
- **Échéancier** : plan sur une créance en recouvrement, avec échéances suivies.

### Planificateur

Trois `@Scheduled` partagent un pool commun (`spring.task.scheduling.pool.size`,
`SCHEDULER_POOL_SIZE`) et s'exécutent dans le fuseau
`mnk-tax.scheduler.zone` (`SCHEDULER_TIMEZONE`) :

| Tâche | Cron (`{cron}`) | Rôle |
| ----- | --------------- | ---- |
| `CommunicationSchedulerService.dailyCommunicationCheck` | `mnk-tax.scheduler.communication-cron` | Relances automatiques (déclarations + paiements) |
| `FiscalSchedulerService.dailyOverdueCheck` | `mnk-tax.scheduler.overdue-cron` | Marquage des retards |
| `NotificationService.dailyDeadlineCheck` | `mnk-tax.scheduler.deadline-cron` | Notifications internes d'échéance |

La file d'envoi (`DeliveryQueueService`) utilise un délai entre deux passages de
`COMM_QUEUE_POLL_DELAY_MS` (`mnk-tax.communication.queue.poll-delay-ms`).

- **Communication** : un message est composé (audience, canaux), mis en file, envoyé par le
  fournisseur (SMTP/Twilio) et suivi (livraisons, relances, échecs).

## Frontend

- `src/lib/api.ts` — client axios (intercepteur JWT, helpers `apiGet/apiPost/apiPatch/apiPut/apiDelete`).
- `src/lib/auth.tsx` — `AuthProvider` : login/logout, bootstrap `/auth/me`, helper `can(permission)`.
- `src/components/ProtectedRoute.tsx` — garde de route par permission (RBAC côté client).
- `src/components/Layout.tsx` — sidebar (bleu foncé), navigation mobile, cloche notifications.
- `src/pages/*` — une page par module (voir `App.tsx` pour le routage et les permissions).
- Un module à plusieurs vues vit dans son propre dossier `src/pages/<module>/` : `Layout.tsx` porte
  l'en-tête et la navigation entre sous-modules (onglets), chaque sous-module étant une route
  distincte avec sa permission (ex. `/payments`, `/payments/pending`, `/payments/new`).
- La page publique `/verify/receipt/:reference` vérifie une quittance sans authentification.## Centre de communication multicanal

Le centre de communication (`com.mnktax.communication`) assure la composition, la mise en file et la
livraison d'emails et de SMS, avec traçabilité (messages → livraisons).

### Flux automatique (planificateur)

1. `CommunicationSchedulerService.dailyCommunicationCheck()` (cron
   `mnk-tax.scheduler.communication-cron`, fuseau `mnk-tax.scheduler.zone`) :
   - pour chaque règle de rappel liée à une date et activée, lit les obligations/en-cours dont la
     date d'échéance correspond au décalage de la règle (`DECLARATION_DUE_SOON` : J-7/J-1/J-0,
     `PAYMENT_DUE_SOON` : J-7/J-3/J-1/J-0).
   - construit une référence contextuelle stable (`<id calendrier>:declaration|payment:J-N` ou
     `O<id obligation>:payment:J-N`) et vérifie que le rappel n'a pas déjà été envoyé via
     `MessageRepository.existsByTaxpayerIdAndContextTypeAndContextRef(...)`.
2. Pour chaque rappel non envoyé, `CommunicationEventEngine.onEvent(...)` compose un message avec
   contexte `DEADLINE`, en intersectant les canaux de la règle avec les
   `preferredChannels` du contribuable (fallback `IN_APP`).
3. La file d'envoi (`DeliveryQueueService`, `poll-delay-ms`) livre vers `IN_APP` (base)
   / `EMAIL` (SMTP) / `SMS` (Twilio) : les envois sont tracés dans `message_deliveries`.

### Fournisseurs

- **SMTP (EMAIL)** : `SmtpEmailProvider.isConfigured()` = `MAIL_HOST` (ou mode démo activé).
- **Twilio (SMS)** : `TwilioSmsProvider.isConfigured()` = numéro expéditeur initialisé (ou mode démo).
- **Demo (log uniquement)** : `mnk-tax.communication.demo-provider.enabled` (`COMM_DEMO_PROVIDER`).
  Quand activé et qu'aucun fournisseur réel n'est configuré, un envoi enregistre en log
  `[DEMO] ...` et marque la livraison `OK` sans appel externe.
  En production réelle, désactivez ce flag pour que les envois non configurés passent en `FAILED`.

### Règles d'événement

`CommunicationEventRule` : `eventType`, `templateCode`, `channels`, `dayOffset` (J-N, nullable
pour les événements à date immédiate), `priority`, `enabled`.
`dayOffset` peut être modifié via `/api/communication/event-rules/{id}` (verbe `POST`/`PUT`).

### Contrôle anti-duplication

- `messages.contextType` / `messages.contextRef` (ex. `DEADLINE`) assortis de
  `existsByTaxpayerIdAndContextTypeAndContextRef` évitent les relances en double.
- Pour les rappels d'échéance, la référence inclut explicitement la date ciblée (`J-N`), donc
  un contribuable sans canal effectif ne génère jamais de message.

### Préférences et langue

`Taxpayer` porte `language` (`FR | MG | EN`, défaut `FR`) et `preferredChannels`
(`IN_APP | EMAIL | SMS`, CSV, défaut `IN_APP`). Les rappels automatiques respectent ces deux
champs ; le SMS est seulement émis si `phoneNormalized` est renseigné.

### Statut des fournisseurs

`GET /api/communication/providers` renvoie l'état effectif (configuré / démo / non configuré).

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
