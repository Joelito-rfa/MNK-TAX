# API REST — MNK-TAX

Base : `/api`. Authentification : header `Authorization: Bearer <token>` (sauf endpoints publics).
Documentation interactive : Swagger UI sur `/swagger-ui.html`.

Réponses paginées : `/api/…?page=0&size=20` → `Page<T>` (`content`, `totalPages`, `number`, …).
Codes d'erreur métier : `400` (validation), `403` (permission), `401` (non authentifié), `409` (conflit), `404` (introuvable).

> Rappel : les permissions Spring portent le préfixe `PERMISSION_` ; dans ce document elles sont
> écrites sans le préfixe (ex. `TAXPAYER_READ`).

---

## Authentification

| Méthode | URL | Accès | Description |
| ------- | --- | ----- | ----------- |
| POST | `/api/auth/login` | public | `{username, password}` → `{accessToken, refreshToken, expiresIn, user}` |
| POST | `/api/auth/refresh` | public | `{refreshToken}` → nouvelle paire de tokens |
| POST | `/api/auth/logout` | auth | Révoque le refresh token |
| GET | `/api/auth/me` | auth | Utilisateur courant + rôles + permissions |
| PUT | `/api/auth/me` | auth | Mettre à jour son profil |
| POST | `/api/auth/change-password` | auth | `{currentPassword, newPassword}` |

## Profil (utilisateur courant)

| Méthode | URL | Accès | Description |
| ------- | --- | ----- | ----------- |
| POST | `/api/auth/me/avatar` | auth | Upload avatar (multipart `file`, 2 Mo max, PNG/JPEG/WEBP/GIF) |
| GET | `/api/auth/me/avatar` | auth | Avatar courant (404 si absent) |
| DELETE | `/api/auth/me/avatar` | auth | Supprimer l'avatar |
| GET | `/api/auth/me/sessions` | auth | Sessions actives (`?token=`) |
| POST | `/api/auth/me/sessions/{id}/revoke` | auth | Révoquer une session |
| POST | `/api/auth/me/sessions/revoke-all` | auth | Révoquer toutes les autres sessions |
| GET | `/api/auth/me/security-history` | auth | Historique de sécurité (`page`, `size`) |

## Inscription

| Méthode | URL | Accès | Description |
| ------- | --- | ----- | ----------- |
| POST | `/api/auth/register` | public | Soumettre une demande d'inscription |
| GET | `/api/auth/admin/registrations` | auth admin | Rechercher (`status`, `type`, `q`) |
| GET | `/api/auth/admin/registrations/stats` | auth admin | Statistiques des demandes |
| GET | `/api/auth/admin/registrations/{id}` | auth admin | Détail d'une demande |
| POST | `/api/auth/admin/registrations/{id}/assign` | auth admin | Prendre en charge la demande |
| POST | `/api/auth/admin/registrations/{id}/approve` | auth admin | Approuver (`{roleCode?}`) et créer le compte |
| POST | `/api/auth/admin/registrations/{id}/reject` | auth admin | Rejeter (`{reason}`) |

## Utilisateurs & rôles

| Méthode | URL | Permission | Description |
| ------- | --- | ---------- | ----------- |
| GET | `/api/users` | `USER_READ` | Recherche paginée (`q`) |
| GET | `/api/users/{id}` | `USER_READ` | Détail |
| GET | `/api/users/{id}/avatar` | `USER_READ` | Avatar d'un utilisateur |
| POST | `/api/users` | `USER_WRITE` | Création (`username`, `password`, `email`, `roleCodes`, …) |
| PUT | `/api/users/{id}` | `USER_WRITE` | Mise à jour |
| PATCH | `/api/users/{id}/enabled` | `USER_WRITE` | Activer/désactiver (`?enabled=true\|false`) |
| DELETE | `/api/users/{id}` | `USER_WRITE` | Supprimer (interdit pour les comptes système) |
| POST | `/api/users/{id}/reset-password` | `USER_RESET_PASSWORD` | Génère un mot de passe temporaire (`mustChangePassword`) → `{temporaryPassword}` |
| POST | `/api/users/change-password` | auth | Changer son mot de passe |
| GET | `/api/roles` | `ROLE_READ` | Liste des rôles |
| POST | `/api/roles` | `ROLE_WRITE` | Créer un rôle |
| PUT | `/api/roles/{id}/permissions` | `ROLE_WRITE` | Réécrit les permissions d'un rôle non système |
| DELETE | `/api/roles/{id}` | `ROLE_WRITE` | Supprimer un rôle non système |

## Contribuables

| Méthode | URL | Permission | Description |
| ------- | --- | ---------- | ----------- |
| GET | `/api/taxpayers` | `TAXPAYER_READ` | Recherche paginée (`q`, `status`, `type`, `taxCenterCode`) |
| GET | `/api/taxpayers/stats` | `TAXPAYER_READ` | Statistiques |
| GET | `/api/taxpayers/next-nif` | `TAXPAYER_READ` | Prochain NIF disponible |
| GET | `/api/taxpayers/contacts` | `TAXPAYER_READ` | Contacts (`q`) |
| GET | `/api/taxpayers/{id}` | `TAXPAYER_READ` | Détail complet (adresses, activités, centre, régime) |
| GET | `/api/taxpayers/{id}/contact` | `TAXPAYER_READ` | Fiche contact |
| GET | `/api/taxpayers/nif/{nif}` | `TAXPAYER_READ` | Recherche par NIF |
| POST | `/api/taxpayers` | `TAXPAYER_WRITE` | Création (NIF : 10 chiffres, clé mod-97) |
| PUT | `/api/taxpayers/{id}` | `TAXPAYER_WRITE` | Mise à jour |
| PATCH | `/api/taxpayers/{id}/status` | `TAXPAYER_WRITE` | Changer le statut |

## Référentiels (impôts, régimes, centres)

| Méthode | URL | Permission | Description |
| ------- | --- | ---------- | ----------- |
| GET | `/api/tax-types` | `TAXONOMY_READ` | Liste des types d'impôts |
| POST | `/api/tax-types` | `TAXONOMY_WRITE` | Créer un type d'impôt |
| PATCH | `/api/tax-types/{id}/active` | `TAXONOMY_WRITE` | Activer/désactiver |
| GET | `/api/tax-regimes` | `TAXONOMY_READ` | Liste des régimes |
| POST | `/api/tax-regimes` | `TAXONOMY_WRITE` | Créer un régime |
| GET | `/api/tax-centers` | `TAXONOMY_READ` | Liste des centres |
| POST | `/api/tax-centers` | `TAXONOMY_WRITE` | Créer un centre |

## Obligations & échéances

| Méthode | URL | Permission | Description |
| ------- | --- | ---------- | ----------- |
| GET | `/api/obligations?taxpayerId=` | `TAXPAYER_READ` | Obligations d'un contribuable |
| POST | `/api/obligations` | `TAXPAYER_WRITE` | Créer une obligation |
| PUT | `/api/obligations/{id}` | `TAXPAYER_WRITE` | Modifier |
| DELETE | `/api/obligations/{id}` | `TAXPAYER_DELETE` | Supprimer |
| POST | `/api/obligations/generate` | `TAXPAYER_WRITE` | Générer les obligations récurrentes |
| GET | `/api/deadlines` | `TAXONOMY_READ` | Toutes les échéances |
| POST | `/api/deadlines` | `TAXONOMY_WRITE` | Créer une échéance |
| PUT | `/api/deadlines/{id}` | `TAXONOMY_WRITE` | Modifier une échéance |
| DELETE | `/api/deadlines/{id}` | `TAXONOMY_WRITE` | Supprimer une échéance |
| GET | `/api/deadlines/upcoming` | `TAXONOMY_READ` | Échéances à venir (`from`, `days`, `limit`) |

## Règles de calcul

| Méthode | URL | Permission | Description |
| ------- | --- | ---------- | ----------- |
| GET | `/api/tax-rules` | `RULE_READ` | Liste (`?taxTypeCode=`) |
| GET | `/api/tax-rules/{id}` | `RULE_READ` | Détail |
| POST | `/api/tax-rules` | `RULE_WRITE` | Créer une règle (version 1) |
| PUT | `/api/tax-rules/{id}` | `RULE_WRITE` | Modifier (archive l'ancienne version, `?reason=`) |
| PATCH | `/api/tax-rules/{id}/active` | `RULE_WRITE` | Activer/désactiver (`?active=&reason=`) |
| GET | `/api/tax-rules/versions/recent` | `RULE_READ` | Dernières modifications, toutes règles confondues (`limit`) |
| GET | `/api/tax-rules/{id}/versions` | `RULE_READ` | Historique des versions |

Méthodes de calcul : `FLAT_RATE`, `PERCENTAGE_OF_BASE`, `PROGRESSIVE`, `PER_UNIT`, `PERCENTAGE_OF_TURNOVER`.

## Déclarations

| Méthode | URL | Permission | Description |
| ------- | --- | ---------- | ----------- |
| GET | `/api/declarations` | `DECLARATION_READ` | Recherche paginée (`q`, `status`, `taxTypeCode`, `taxpayerId`) |
| GET | `/api/declarations/statistics` | `DECLARATION_READ` | Statistiques |
| GET | `/api/declarations/calendar` | `DECLARATION_READ` | Entrées de calendrier |
| GET | `/api/declarations/{id}` | `DECLARATION_READ` | Détail avec lignes et annexes |
| POST | `/api/declarations` | `DECLARATION_WRITE` | Créer (statut `DRAFT`) |
| PUT | `/api/declarations/{id}` | `DECLARATION_WRITE` | Modifier un brouillon |
| PUT | `/api/declarations/{id}/submit` | `DECLARATION_WRITE` | Soumettre |
| PUT | `/api/declarations/{id}/review` | `DECLARATION_APPROVE` | Passer en revue |
| PUT | `/api/declarations/{id}/validate` | `DECLARATION_APPROVE` | Valider → déclenche l'imposition |
| PUT | `/api/declarations/{id}/reject` | `DECLARATION_APPROVE` | Rejeter (`{comment}`) |
| PUT | `/api/declarations/{id}/correction` | `DECLARATION_WRITE` | Demander une correction |
| PUT | `/api/declarations/{id}/correct` | `DECLARATION_WRITE` | Corriger |
| POST | `/api/declarations/{id}/rectificative` | `DECLARATION_WRITE` | Créer une déclaration rectificative |
| PUT | `/api/declarations/{id}/cancel` | `DECLARATION_WRITE` | Annuler |
| DELETE | `/api/declarations/{id}` | `DECLARATION_WRITE` | Supprimer un brouillon |
| GET | `/api/declarations/{id}/history` | `DECLARATION_READ` | Historique des transitions |

## Impositions

| Méthode | URL | Permission | Description |
| ------- | --- | ---------- | ----------- |
| GET | `/api/assessments` | `ASSESSMENT_READ` | Recherche paginée (`q`, `taxpayerId`) |
| GET | `/api/assessments/{id}` | `ASSESSMENT_READ` | Détail avec lignes de calcul |

## Créances

| Méthode | URL | Permission | Description |
| ------- | --- | ---------- | ----------- |
| GET | `/api/debts` | `DEBT_READ` | Recherche paginée (`status`, `q`, `overdue`) |
| GET | `/api/debts/overdue` | `DEBT_READ` | Créances en retard |
| GET | `/api/debts/stats` | `DEBT_READ` | Statistiques |
| GET | `/api/debts/{id}` | `DEBT_READ` | Détail avec composantes |
| GET | `/api/debts/{id}/history` | `DEBT_READ` | Historique |
| POST | `/api/debts` | `DEBT_CREATE` | Créer une créance |
| POST | `/api/debts/mark-overdue` | `DEBT_DETECT_ARREARS` | Détecter les impayés (`asOf`, `taxTypeCode`, `period`, …) |
| PATCH | `/api/debts/{id}/adjustment` | `DEBT_ADMIN` | `{label, amount}` (positif ou négatif) |
| PATCH | `/api/debts/{id}/in-collection` | `DEBT_ADMIN` | Passer en recouvrement |
| PATCH | `/api/debts/{id}/cancel` | `DEBT_ADMIN` | Annuler |
| PATCH | `/api/debts/{id}/suspend` | `DEBT_ADMIN` | Suspendre |
| PATCH | `/api/debts/{id}/resume` | `DEBT_ADMIN` | Reprendre |
| PATCH | `/api/debts/{id}/close` | `DEBT_ADMIN` | Clôturer |
| PATCH | `/api/debts/{id}/priority` | `DEBT_ADMIN` | Changer la priorité de recouvrement |
| PATCH | `/api/debts/{id}/observations` | `DEBT_ADMIN` | Modifier les observations |

## Paiements

| Méthode | URL | Permission | Description |
| ------- | --- | ---------- | ----------- |
| GET | `/api/payments` | `PAYMENT_READ` | Recherche paginée (`q`, `status`, `taxpayerId`) |
| GET | `/api/payments/stats` | `PAYMENT_READ` | Statistiques |
| GET | `/api/payments/{id}` | `PAYMENT_READ` | Détail |
| POST | `/api/payments` | `PAYMENT_WRITE` | `{debtId, amount, paymentDate, method, allocations?}` |
| PUT | `/api/payments/{id}/confirm` | `PAYMENT_CONFIRM` | Confirmer |
| PUT | `/api/payments/{id}/allocate` | `PAYMENT_ALLOCATE` | Allouer sur les créances |
| PUT | `/api/payments/{id}/cancel` | `PAYMENT_CANCEL` | Annuler |
| PUT | `/api/payments/{id}/reject` | `PAYMENT_WRITE` | Rejeter (`{reason}`) |
| GET | `/api/payments/{id}/reconcile` | `PAYMENT_RECONCILE` | Ventilation / rapprochement |

Contraintes : paiement > solde refusé (`PAYMENT_EXCEEDS_BALANCE`) ; créance soldée ou annulée non payable (`DEBT_NOT_PAYABLE`).

## Quittances

| Méthode | URL | Accès | Description |
| ------- | --- | ----- | ----------- |
| GET | `/api/receipts` | `RECEIPT_READ` | Liste paginée |
| GET | `/api/receipts/stats` | `RECEIPT_READ` | Statistiques |
| GET | `/api/receipts/{id}` | `RECEIPT_READ` | Détail (avec QR) |
| GET | `/api/receipts/{id}/pdf` | `RECEIPT_READ` | PDF de la quittance |
| PUT | `/api/receipts/{id}/cancel` | `RECEIPT_CANCEL` | Annuler |
| PUT | `/api/receipts/{id}/refund` | `RECEIPT_REFUND` | Rembourser |
| POST | `/api/receipts/{id}/replace` | `RECEIPT_REPLACE` | Remplacer |
| GET | `/api/receipts/verify/{token}` | **public** | Vérification (NIF + montant) |

## Recouvrement

| Méthode | URL | Permission | Description |
| ------- | --- | ---------- | ----------- |
| GET | `/api/collection/debts` | `COLLECTION_READ` | Créances à recouvrer (filtres multiples) |
| GET | `/api/collection/periods` | `COLLECTION_READ` | Périodes disponibles |
| GET | `/api/collection/overdue-summary` | `COLLECTION_READ` | Synthèse des retards |
| GET | `/api/collection/detail/{id}` | `COLLECTION_READ` | Détail recouvrement d'une créance |
| GET | `/api/collection/stats` | `COLLECTION_READ` | Statistiques |
| GET | `/api/collection/actions` | `COLLECTION_READ` | Actions (`?debtId=`, `?type=`) |
| POST | `/api/collection/actions` | `COLLECTION_WRITE` | `{debtId, type, description, actionDate, outcome?}` |
| GET | `/api/collection/notices` | `COLLECTION_READ` | Mises en demeure |
| POST | `/api/collection/notices` | `COLLECTION_WRITE` | Créer une mise en demeure |
| GET | `/api/collection/history/{debtId}` | `COLLECTION_READ` | Actions + mises en demeure |
| GET | `/api/collection/events` | `COLLECTION_READ` | Événements d'historique |
| POST | `/api/collection/payment` | `COLLECTION_WRITE` | Enregistrer un paiement de recouvrement |
| GET | `/api/collection/documents/mise-en-demeure/{debtId}` | `COLLECTION_READ` | Document mise en demeure |
| GET | `/api/collection/documents/relance/{debtId}` | `COLLECTION_READ` | Document relance |
| GET | `/api/collection/documents/etat-restes` | `COLLECTION_READ` | État des restes |

Types d'actions : `PHONE_CONTACT`, `VISIT`, `REMINDER`, `NOTICE`, `SEIZURE`, `SMS`, `ATD`, …

## Échéanciers (plans de paiement)

| Méthode | URL | Permission | Description |
| ------- | --- | ---------- | ----------- |
| GET | `/api/collection/plans` | `COLLECTION_READ` | Liste des échéanciers |
| GET | `/api/collection/plans/stats` | `COLLECTION_READ` | Statistiques |
| GET | `/api/collection/plans/{id}` | `COLLECTION_READ` | Détail avec échéances |
| POST | `/api/collection/plans` | `COLLECTION_WRITE` | Créer (`{debtId, label, installments[]}`) |
| PATCH | `/api/collection/plans/{id}/cancel` | `COLLECTION_WRITE` | Annuler |

## Litiges (contestations de créance)

| Méthode | URL | Permission | Description |
| ------- | --- | ---------- | ----------- |
| POST | `/api/collection/disputes` | `COLLECTION_WRITE` | Créer un litige |
| GET | `/api/collection/disputes/{id}` | `COLLECTION_READ` | Détail |
| PATCH | `/api/collection/disputes/{id}/decision` | `COLLECTION_WRITE` | Statuer (`SUSTAINED`, `REJECTED`, `WITHDRAWN`) |

## Réclamations

| Méthode | URL | Permission | Description |
| ------- | --- | ---------- | ----------- |
| GET | `/api/complaints` | `COMPLAINT_READ` | Recherche (`status`, `taxpayerId`, `contextType`, `q`) |
| GET | `/api/complaints/stats` | `COMPLAINT_READ` | Statistiques |
| GET | `/api/complaints/{id}` | `COMPLAINT_READ` | Détail avec réponses |
| POST | `/api/complaints` | `COMPLAINT_WRITE` | Créer une réclamation |
| PATCH | `/api/complaints/{id}` | `COMPLAINT_WRITE` | Mettre à jour (`status`, `resolution`, `assignedTo`) |
| DELETE | `/api/complaints/{id}` | `COMPLAINT_WRITE` | Supprimer (statut `OPEN` uniquement) |
| POST | `/api/complaints/{id}/responses` | `COMPLAINT_WRITE` | Ajouter une réponse |

Statuts : `OPEN`, `UNDER_REVIEW`, `ACCEPTED`, `REJECTED`, `CLOSED`.

## Contrôles fiscaux

| Méthode | URL | Permission | Description |
| ------- | --- | ---------- | ----------- |
| GET | `/api/tax-controls` | `CONTROL_READ` | Recherche (`status`, `taxpayerId`, `agentId`, `q`) |
| GET | `/api/tax-controls/{id}` | `CONTROL_READ` | Détail avec documents demandés |
| POST | `/api/tax-controls` | `CONTROL_WRITE` | Créer un contrôle (`{taxpayerId, controlType, periodStart, periodEnd, reason, agentId?, documents?}`) |
| PATCH | `/api/tax-controls/{id}` | `CONTROL_WRITE` | Mettre à jour (`status`, `observations`, `anomalies`, `redressement`, `penaltyAmount`) |
| DELETE | `/api/tax-controls/{id}` | `CONTROL_WRITE` | Supprimer (statut `OPEN` uniquement) |
| PATCH | `/api/tax-controls/{id}/close` | `CONTROL_WRITE` | Clôturer avec redressement (`?redressement=&debtId=`) |

Statuts : `OPEN`, `IN_PROGRESS`, `ANOMALY_DETECTED`, `REDRESSEMENT`, `CLOSED`.
Types : `DOCUMENTARY`, `ON_SITE`, `MIXED`.

## Remboursements

| Méthode | URL | Permission | Description |
| ------- | --- | ---------- | ----------- |
| GET | `/api/refunds` | `REFUND_READ` | Recherche (`status`, `reason`, `taxpayerId`, `fromDate`, `toDate`, `minAmount`, `maxAmount`, `q`) |
| GET | `/api/refunds/stats` | `REFUND_READ` | Statistiques |
| GET | `/api/refunds/{id}` | `REFUND_READ` | Détail |
| POST | `/api/refunds` | `REFUND_WRITE` | Créer une demande |
| PATCH | `/api/refunds/{id}` | `REFUND_WRITE` | Modifier (statut `PENDING`/`UNDER_REVIEW`) |
| DELETE | `/api/refunds/{id}` | `REFUND_WRITE` | Supprimer (statut `PENDING` uniquement) |
| PATCH | `/api/refunds/{id}/review` | `REFUND_WRITE` | Approuver/rejeter (`{approve, approvedAmount?, rejectionReason?}`) |
| PATCH | `/api/refunds/{id}/pay` | `REFUND_WRITE` | Enregistrer le paiement (`{paymentMethod, paymentReference?}`) |

Motifs : `VAT_CREDIT`, `OVERPAYMENT`, `OTHER`. Statuts : `PENDING`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `PAID`.

## Documents

| Méthode | URL | Permission | Description |
| ------- | --- | ---------- | ----------- |
| GET | `/api/documents` | `DOCUMENT_READ` | Liste (`?taxpayerId=`) |
| POST | `/api/documents` | `DOCUMENT_WRITE` | Upload multipart (`file`, `taxpayerId`, `title`, `documentType`) |
| GET | `/api/documents/{id}/content` | `DOCUMENT_READ` | Téléchargement |
| DELETE | `/api/documents/{id}` | `DOCUMENT_WRITE` | Suppression |

## Notifications

| Méthode | URL | Accès | Description |
| ------- | --- | ----- | ----------- |
| GET | `/api/notifications` | auth | Mes notifications (paginées) |
| GET | `/api/notifications/unread-count` | auth | `{count}` |
| POST | `/api/notifications/{id}/read` | auth | Marquer une notification comme lue |
| POST | `/api/notifications/read-all` | auth | Tout marquer comme lu |

## Messages internes

| Méthode | URL | Permission | Description |
| ------- | --- | ---------- | ----------- |
| GET | `/api/messages` | `MESSAGE_READ` | Boîte de réception (`q`, `priority`, `processingStatus`) |
| GET | `/api/messages/sent` | `MESSAGE_READ` | Messages envoyés |
| GET | `/api/messages/archived` | `MESSAGE_READ` | Messages archivés |
| GET | `/api/messages/stats` | `MESSAGE_READ` | Statistiques |
| GET | `/api/messages/unread-count` | `MESSAGE_READ` | Nombre de non-lus |
| GET | `/api/messages/{id}` | `MESSAGE_READ` | Détail |
| GET | `/api/messages/{id}/thread` | `MESSAGE_READ` | Fil de discussion |
| POST | `/api/messages` | `MESSAGE_WRITE` | Envoyer un message |
| POST | `/api/messages/{id}/read` | `MESSAGE_READ` | Marquer comme lu |
| POST | `/api/messages/{id}/thread-read` | `MESSAGE_READ` | Marquer le fil comme lu |
| POST | `/api/messages/read-all` | `MESSAGE_READ` | Tout marquer comme lu |
| POST | `/api/messages/{id}/archive` | `MESSAGE_WRITE` | Archiver |
| POST | `/api/messages/{id}/unarchive` | `MESSAGE_WRITE` | Désarchiver |
| POST | `/api/messages/{id}/close` | `MESSAGE_WRITE` | Clôturer |
| POST | `/api/messages/{id}/reopen` | `MESSAGE_WRITE` | Réouvrir |
| POST | `/api/messages/{id}/attachments` | `MESSAGE_WRITE` | Ajouter une pièce jointe (multipart) |
| GET | `/api/messages/attachments/{attachmentId}` | `MESSAGE_READ` | Télécharger une pièce jointe |

## Centre de communication (multicanal)

| Méthode | URL | Permission | Description |
| ------- | --- | ---------- | ----------- |
| POST | `/api/communication/preview` | `MESSAGE_WRITE` | Aperçu d'une campagne (destinataires, conformité) |
| POST | `/api/communication/send` | `MESSAGE_WRITE` | Envoyer (IN_APP/EMAIL/SMS) |
| POST | `/api/communication/templates/render` | `MESSAGE_WRITE` | Rendre un modèle avec variables |
| GET | `/api/communication/my-messages` | `MESSAGE_READ` | Mes messages reçus |
| POST | `/api/communication/my-messages/{id}/read` | `MESSAGE_READ` | Marquer comme lu |
| GET | `/api/communication/sent` | `MESSAGE_MANAGE` | Messages envoyés + livraisons |
| GET | `/api/communication/messages/{id}/deliveries` | `MESSAGE_MANAGE` | Détail des livraisons |
| POST | `/api/communication/messages/{id}/retry` | `MESSAGE_MANAGE` | Relancer l'envoi |
| POST | `/api/communication/messages/{id}/cancel` | `MESSAGE_MANAGE` | Annuler |
| GET | `/api/communication/stats` | `MESSAGE_MANAGE` | Statistiques d'envoi |
| GET | `/api/communication/providers` | `MESSAGE_MANAGE` | État des fournisseurs (SMTP, SMS) |
| POST | `/api/communication/test` | `MESSAGE_MANAGE` | Envoi test (destination explicite) |
| GET | `/api/communication/templates` | `MESSAGE_MANAGE` | Modèles |
| POST | `/api/communication/templates` | `MESSAGE_MANAGE` | Créer/mettre à jour un modèle |
| GET | `/api/communication/campaigns` | `MESSAGE_MANAGE` | Campagnes |
| GET | `/api/communication/campaigns/preview` | `MESSAGE_MANAGE` | Aperçu d'audience |
| POST | `/api/communication/campaigns` | `MESSAGE_MANAGE` | Lancer une campagne |
| GET | `/api/communication/event-rules` | `MESSAGE_MANAGE` | Règles d'événement |
| POST | `/api/communication/event-rules/{id}` | `MESSAGE_MANAGE` | Modifier une règle d'événement |

## Assistant IA

| Méthode | URL | Accès | Description |
| ------- | --- | ----- | ----------- |
| POST | `/api/ai/chat` | auth | Question/réponse assistée (FR/MG/EN) |

## Audit & administration

| Méthode | URL | Permission | Description |
| ------- | --- | ---------- | ----------- |
| GET | `/api/audit-logs` | `AUDIT_READ` | Recherche (`username`, `action`, `entityType`, `entityId`, `from`, `to`) |
| GET | `/api/audit-logs/stats` | `AUDIT_READ` | Répartition par action |
| GET | `/api/parameters` | `PARAMETER_READ` | Liste des paramètres |
| PUT | `/api/parameters` | `PARAMETER_WRITE` | Créer/mettre à jour `{key, value, description?, category?}` |

## Dashboard & rapports

| Méthode | URL | Permission | Description |
| ------- | --- | ---------- | ----------- |
| GET | `/api/dashboard/summary` | `REPORT_READ` | Indicateurs + séries (par mois, par statut, par impôt) |
| GET | `/api/reports/stats` | `REPORT_READ` | Statistiques globales |
| GET | `/api/reports/stats/declarations` | `REPORT_READ` | Statistiques des déclarations |
| GET | `/api/reports/stats/debts` | `REPORT_READ` | Statistiques des créances |
| GET | `/api/reports/collection` | `REPORT_READ` | Rapport de recouvrement (`status`, `taxTypeCode`, `taxpayerId`) |
| GET | `/api/reports/payments` | `REPORT_READ` | Rapport des paiements (`taxpayerId`, `from`, `to`) |
| GET | `/api/reports/declarations` | `REPORT_READ` | Rapport des déclarations (`status`, `taxTypeCode`, `taxpayerId`) |
| GET | `/api/reports/taxpayers` | `REPORT_READ` | Rapport des contribuables (`status`) |
| GET | `/api/reports/activity` | `REPORT_READ` | Rapport d'activité — journal d'audit (`username`, `action`, `from`, `to`) |

## Endpoints publics

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/register`
- `GET /api/receipts/verify/{token}`

## Invariants de calcul

- `TOTAL = PRINCIPAL + PENALTIES + INTERESTS − ADJUSTMENTS − CREDITS`
- `BALANCE = TOTAL − PAID` (jamais saisie, toujours calculée)
- Montants en `BigDecimal` (MGA). NIF : 10 chiffres avec clé mod-97 (moteur `NifValidator`).
- Les règles fiscales sont **versionnées** : aucune modification n'écrase une version existante.
