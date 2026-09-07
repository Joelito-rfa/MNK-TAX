# API REST — MNK-TAX

Base : `/api`. Authentification : header `Authorization: Bearer <token>` (sauf endpoints publics).
Documentation interactive : Swagger UI sur `/swagger-ui.html` (profil dev).

Réponses paginées : `/api/…?page=0&size=20` → `Page<T>` (`content`, `totalPages`, `number`, …).
Codes d'erreur métier : `400` (validation), `403` (permission), `401` (non authentifié), `409` (conflit), `404` (introuvable).

---

## Authentification

| Méthode | URL | Accès | Description |
| ------- | --- | ----- | ----------- |
| POST | `/api/auth/login` | public | `{username, password}` → `{accessToken, refreshToken, expiresIn, user}` |
| POST | `/api/auth/refresh` | public | `{refreshToken}` → nouvelle paire de tokens |
| POST | `/api/auth/logout` | auth | Révoque le refresh token |
| GET | `/api/auth/me` | auth | Utilisateur courant + rôles + permissions |

## Utilisateurs & rôles

| Méthode | URL | Permission | Description |
| ------- | --- | ---------- | ----------- |
| GET | `/api/users` | `USER_READ` | Recherche paginée (`q`, `status`, `enabled`) |
| GET | `/api/users/{id}` | `USER_READ` | Détail |
| POST | `/api/users` | `USER_WRITE` | Création (`username`, `password`, `roleCode`, …) |
| PUT | `/api/users/{id}` | `USER_WRITE` | Mise à jour |
| PATCH | `/api/users/{id}/enabled` | `USER_WRITE` | Activer/désactiver (`?enabled=true\|false`) |
| POST | `/api/users/change-password` | auth | Changer son mot de passe |
| GET | `/api/roles` | `ROLE_READ` | Liste des rôles |
| PUT | `/api/roles/{id}/permissions` | `ROLE_WRITE` | Réécrit les permissions d'un rôle non système |

## Contribuables

| Méthode | URL | Permission | Description |
| ------- | --- | ---------- | ----------- |
| GET | `/api/taxpayers` | `TAXPAYER_READ` | Recherche paginée (`q`, `status`, `type`, `taxCenterCode`) |
| GET | `/api/taxpayers/{id}` | `TAXPAYER_READ` | Détail complet (adresses, activités, centre, régime) |
| GET | `/api/taxpayers/nif/{nif}` | `TAXPAYER_READ` | Recherche par NIF |
| POST | `/api/taxpayers` | `TAXPAYER_WRITE` | Création (NIF validé : 10 chiffres, clé mod-97) |
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
| GET | `/api/obligations?taxpayerId=` | `TAXONOMY_READ` | Obligations d'un contribuable |
| POST | `/api/obligations` | `TAXONOMY_WRITE` | Créer une obligation |
| PUT | `/api/obligations/{id}` | `TAXONOMY_WRITE` | Modifier |
| DELETE | `/api/obligations/{id}` | `TAXONOMY_WRITE` | Supprimer |
| GET | `/api/deadlines` | `TAXONOMY_READ` | Toutes les échéances |
| GET | `/api/deadlines/upcoming` | `TAXONOMY_READ` | Échéances à venir (`?days=30`) |
| POST | `/api/deadlines` | `TAXONOMY_WRITE` | Créer une échéance |

## Règles de calcul

| Méthode | URL | Permission | Description |
| ------- | --- | ---------- | ----------- |
| GET | `/api/tax-rules` | `RULE_READ` | Liste (`?taxTypeCode=`) |
| GET | `/api/tax-rules/{id}` | `RULE_READ` | Détail |
| POST | `/api/tax-rules` | `RULE_WRITE` | Créer une règle |
| PUT | `/api/tax-rules/{id}` | `RULE_WRITE` | Modifier (crée une version) |
| PATCH | `/api/tax-rules/{id}/active` | `RULE_WRITE` | Activer/désactiver |
| GET | `/api/tax-rules/{id}/versions` | `RULE_READ` | Historique des versions |

## Déclarations

| Méthode | URL | Permission | Description |
| ------- | --- | ---------- | ----------- |
| GET | `/api/declarations` | `DECLARATION_READ` | Recherche paginée (`q`, `status`, `taxTypeCode`, `taxpayerId`) |
| GET | `/api/declarations/{id}` | `DECLARATION_READ` | Détail avec lignes |
| POST | `/api/declarations` | `DECLARATION_WRITE` | Créer (statut `DRAFT`) |
| PUT | `/api/declarations/{id}/submit` | `DECLARATION_WRITE` | Soumettre |
| PUT | `/api/declarations/{id}/review` | `DECLARATION_APPROVE` | Passer en revue |
| PUT | `/api/declarations/{id}/validate` | `DECLARATION_APPROVE` | Valider → déclenche l'imposition |
| PUT | `/api/declarations/{id}/reject` | `DECLARATION_APPROVE` | Rejeter (`{comment}`) |
| PUT | `/api/declarations/{id}/cancel` | `DECLARATION_WRITE` | Annuler |

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
| GET | `/api/debts/{id}` | `DEBT_READ` | Détail avec composantes |
| POST | `/api/debts/mark-overdue` | `DEBT_ADMIN` | Détecter les impayés (`?asOf=2025-01-01&taxTypeCode=TVA&period=2025&taxpayerId=123&origin=ASSESSMENT&priority=HIGH&center=CENTRE1&q=search`) |
| PATCH | `/api/debts/{id}/adjustment` | `DEBT_ADMIN` | `{label, amount}` (positif ou négatif) |
| PATCH | `/api/debts/{id}/in-collection` | `DEBT_ADMIN` | Passer en recouvrement |
| PATCH | `/api/debts/{id}/cancel` | `DEBT_ADMIN` | Annuler la créance |

## Paiements

| Méthode | URL | Permission | Description |
| ------- | --- | ---------- | ----------- |
| GET | `/api/payments` | `PAYMENT_READ` | Recherche paginée (`q`, `status`, `taxpayerId`) |
| GET | `/api/payments/{id}` | `PAYMENT_READ` | Détail |
| POST | `/api/payments` | `PAYMENT_WRITE` | `{debtId, amount, paymentDate, method, allocations?}` |

Contraintes : paiement > solde refusé (`PAYMENT_EXCEEDS_BALANCE`) ; dette soldée ou annulée non payable (`DEBT_NOT_PAYABLE`).

## Quittances

| Méthode | URL | Accès | Description |
| ------- | --- | ----- | ----------- |
| GET | `/api/receipts` | `RECEIPT_READ` | Liste paginée |
| GET | `/api/receipts/{id}` | `RECEIPT_READ` | Détail (avec QR) |
| GET | `/api/receipts/{id}/pdf` | `RECEIPT_READ` | PDF de la quittance |
| GET | `/api/receipts/verify/{reference}` | **public** | Vérification (NIF + montant) |

## Recouvrement

| Méthode | URL | Permission | Description |
| ------- | --- | ---------- | ----------- |
| GET | `/api/collection/actions` | `COLLECTION_READ` | Liste paginée (`?debtId=`, `?type=`) |
| POST | `/api/collection/actions` | `COLLECTION_WRITE` | `{debtId, type, description, actionDate, outcome?}` |
| POST | `/api/collection/notices` | `COLLECTION_WRITE` | Créer une mise en demeure |
| GET | `/api/collection/history/{debtId}` | `COLLECTION_READ` | Actions + mises en demeure d'une créance |

Types d'actions : `PHONE_CONTACT`, `VISIT`, `REMINDER`, `NOTICE`, `SEIZURE`.

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
| POST | `/api/notifications/read-all` | auth | Tout marquer comme lu |

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
| GET | `/api/dashboard/summary` | `DASHBOARD_READ` | Indicateurs + séries (par mois, par statut, par impôt) |
| GET | `/api/reports/collection` | `REPORT_READ` | Créances (`status`, `taxTypeCode`, `taxpayerId`) |
| GET | `/api/reports/payments` | `REPORT_READ` | Paiements (`taxpayerId`, `from`, `to`) |

## Endpoints publics

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/receipts/verify/{reference}`

## Invariants de calcul

- `TOTAL = PRINCIPAL + PENALTIES + INTERESTS − ADJUSTMENTS − CREDITS`
- `BALANCE = TOTAL − PAID` (jamais saisie, toujours calculée)
- Montants en `BigDecimal` (MGA). NIF : 10 chiffres avec clé mod-97 (moteur `NifValidator`).
