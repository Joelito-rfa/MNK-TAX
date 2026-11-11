# Sécurité — MNK-TAX

## Authentification

- **JWT access token** (durée : `JWT_ACCESS_TTL`, défaut 3600 s) + **refresh token**
  (durée : `JWT_REFRESH_TTL`, défaut 604800 s), révoqués à la déconnexion.
- Mot de passe haché en **BCrypt** (facteur configurable).
- Endpoints sensibles derrière `@PreAuthorize("hasAuthority('PERMISSION_*')")`.
- Rate-limiting par IP (en mémoire, `RATE_LIMIT_PER_MINUTE`) sur les routes sensibles
  (`/auth/login`, `/auth/refresh`, `/receipts/verify`…).
- **Mots de passe temporaires** : générés côté serveur et transmis par email
  (`AccountCredentialsNotifier`) dès qu'un SMTP réel est configuré ; la réponse ne contient
  alors aucun secret (`delivery: "EMAIL"`). Sans SMTP, la réinitialisation révoque les sessions
  et renvoie le mot de passe temporaire (`delivery: "MANUAL"`) pour une remise manuelle par
  un canal sécurisé — comportement de repli explicite, jamais un faux "email envoyé".
  L'approbation d'une inscription reste bloquante sans email (rollback).

## RBAC

- Les **permissions** sont rattachées aux **rôles**, eux-mêmes portés par les **utilisateurs**.
  Matrice complète : [`ACCESS_MATRIX.md`](ACCESS_MATRIX.md).
- Le frontend réplique les gardes (`ProtectedRoute`), mais la **source de vérité reste l'API**
  : chaque endpoint vérifie sa permission. Un refus frontend redirige vers `/forbidden`.
- Les rôles **système** (`system = true`) ne sont pas modifiables par l'API.
- **Anti-escalade** : gérer les permissions d'un rôle (`ROLE_WRITE`) ou attribuer un rôle
  (`USER_WRITE`) exige en plus `ROLE_ASSIGN`. Un `USER_WRITE` ne peut pas non plus attribuer
  un rôle dont les permissions excèdent les siennes, modifier les rôles d'un utilisateur
  système ni en désactiver un.
- **Isolation par ligne** : un compte `TAXPAYER` est restreint à son propre dossier
  (`DataScope`), y compris sur les détails, les historiques et les agrégats.

## Endpoints publics (authentification explicite requise)

- `POST /api/auth/login`, `POST /api/auth/refresh`
- `GET /api/receipts/verify/{reference}` — vérification de quittance (données publiques limitées)

## Bonnes pratiques appliquées

- `spring.jpa.open-in-view=false` → lectures de mapping en `@Transactional(readOnly = true)`.
- Paramètres et secrets injectés par **variables d'environnement** (`JWT_SECRET`, mots de passe DB…).
  `JWT_SECRET` n'a **aucune valeur de repli** : le démarrage échoue s'il est absent, vide, inférieur
  à 32 octets ou égal à l'ancienne valeur publiée. Seuls les profils `dev` et `test` fournissent
  une valeur locale explicite.
- Journalisation d'**audit** des opérations sensibles (connexions, créations, validations,
  ajustements, paramètres) avec acteur, IP et valeurs avant/après.
- Pas de CORS ouvert : liste blanche `CORS_ALLOWED_ORIGINS` (défaut localhost:5173/5177/3000).
- Limite de taille d'upload : 10 Mo.

## En production (à renforcer avant toute mise en service réelle)

1. Fournir un `JWT_SECRET` aléatoire robuste (`openssl rand -base64 64`) : sans lui, l'application
   refuse de démarrer.
2. Définir `POSTGRES_PASSWORD` fort et l'isoler des valeurs du dépôt.
3. Servir uniquement en **HTTPS** (terminaison TLS côté nginx/proxy).
4. Laisser `SEED_DEMO=false` (valeur par défaut) et désactiver la console H2 (`dev` uniquement).
5. Configurer un fournisseur email réel (`MAIL_HOST`, `MAIL_USERNAME`, `MAIL_PASSWORD`) : sans lui,
   la réinitialisation renvoie le mot de passe temporaire à l'administrateur (`delivery: "MANUAL"`)
   au lieu de l'envoyer, ce qui ne doit pas être le mode de production.
6. Configurer la persistance des refresh tokens en stockage sécurisé et surveiller les
   tentatives de connexion échouées (verrouillage).
7. Réviser le rate-limit selon le trafic réel.

## Rappel

MNK-TAX est un **prototype académique** : les données sont fictives et les garanties de
sécurité décrites ici visent l'illustration de bonnes pratiques, pas une mise en production réelle.
