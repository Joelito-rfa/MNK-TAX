# Sécurité — MNK-TAX

## Authentification

- **JWT access token** (durée : `JWT_ACCESS_TTL`, défaut 3600 s) + **refresh token**
  (durée : `JWT_REFRESH_TTL`, défaut 604800 s), révoqués à la déconnexion.
- Mot de passe haché en **BCrypt** (facteur configurable).
- Endpoints sensibles derrière `@PreAuthorize("hasAuthority('PERMISSION_*')")`.
- Rate-limiting par IP (Redis en prod, `RATE_LIMIT_PER_MINUTE`) sur les routes sensibles
  (`/auth/login`, `/auth/refresh`, `/receipts/verify`…).

## RBAC

- Les **permissions** sont rattachées aux **rôles**, eux-mêmes portés par les **utilisateurs**.
- Le frontend réplique les gardes (`ProtectedRoute`), mais la **source de vérité reste l'API**
  : chaque endpoint vérifie sa permission.
- Les rôles **système** (`system = true`) ne sont pas modifiables par l'API.

## Endpoints publics (authentification explicite requise)

- `POST /api/auth/login`, `POST /api/auth/refresh`
- `GET /api/receipts/verify/{reference}` — vérification de quittance (données publiques limitées)

## Bonnes pratiques appliquées

- `spring.jpa.open-in-view=false` → lectures de mapping en `@Transactional(readOnly = true)`.
- Paramètres et secrets injectés par **variables d'environnement** (`JWT_SECRET`, mots de passe DB…),
  avec valeurs de repli **uniquement** pour le développement.
- Journalisation d'**audit** des opérations sensibles (connexions, créations, validations,
  ajustements, paramètres) avec acteur, IP et valeurs avant/après.
- Pas de CORS ouvert : liste blanche `CORS_ALLOWED_ORIGINS` (défaut localhost:5173/5177/3000).
- Limite de taille d'upload : 10 Mo.

## En production (à renforcer avant toute mise en service réelle)

1. Remplacer `JWT_SECRET` par une valeur aléatoire robuste (`openssl rand -base64 64`).
2. Définir `POSTGRES_PASSWORD` fort et l'isoler des valeurs du dépôt.
3. Servir uniquement en **HTTPS** (terminaison TLS côté nginx/proxy).
4. Désactiver la console H2 (`dev` uniquement) et le `SEED_DEMO` (`SEED_DEMO=false`).
5. Configurer la persistance des refresh tokens en stockage sécurisé et surveiller les
   tentatives de connexion échouées (verrouillage).
6. Réviser le rate-limit selon le trafic réel.

## Rappel

MNK-TAX est un **prototype académique** : les données sont fictives et les garanties de
sécurité décrites ici visent l'illustration de bonnes pratiques, pas une mise en production réelle.
