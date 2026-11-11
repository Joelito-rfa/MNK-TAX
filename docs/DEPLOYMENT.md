# Déploiement — MNK-TAX

## Prérequis

- Docker Engine 24+ avec Docker Compose v2.
- Pour le développement local : JDK 17+, Node 20+ (testé avec 24).

## Démarrage complet (Docker Compose)

```bash
cp .env.example .env          # puis éditer JWT_SECRET et POSTGRES_PASSWORD
docker compose up --build
```

Services exposés :

| Service | URL |
| ------- | --- |
| Frontend | http://localhost:3000 |
| API | http://localhost:8080/api |
| Swagger UI | http://localhost:8080/swagger-ui.html |
| PostgreSQL | localhost:5432 (user/password depuis `.env`) |
| Redis | localhost:6379 |

Arrêt : `docker compose down` (volumes conservés) / `docker compose down -v` (volumes supprimés).

## Images

- **backend** : multi-stage (`maven:3.9-eclipse-temurin-17` → `eclipse-temurin:17-jre`).
  Exécution en utilisateur non-root ; volumes : `/app/data` (quittances + documents).
- **frontend** : multi-stage (`node:24-alpine` → `nginx:1.27-alpine`). nginx sert la SPA
  et proxy `/api` vers `backend:8080` (voir `frontend/nginx.conf`).

## Variables d'environnement (backend)

| Variable | Défaut | Description |
| -------- | ------ | ----------- |
| `SPRING_PROFILES_ACTIVE` | `dev` | Profil Spring (`dev`, `docker`, `test`) |
| `DATABASE_URL` | `jdbc:postgresql://postgres:5432/mnktax` | JDBC (profil docker) |
| `DATABASE_USERNAME` / `DATABASE_PASSWORD` | `mnktax` / `mnktax` | Accès PostgreSQL |
| `REDIS_HOST` / `REDIS_PORT` | `localhost` / `6379` | Cache + rate-limit |
| `JWT_SECRET` | **aucun** (obligatoire hors `dev`/`test`) | Secret Base64 d'au moins 32 octets ; le démarrage échoue s'il est absent |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | `3600` / `604800` | Durées (s) |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:5177,http://localhost:3000` | Origines autorisées |
| `RATE_LIMIT_ENABLED` / `RATE_LIMIT_PER_MINUTE` | `true` / `120` | Rate-limit |
| `RECEIPT_BASE_URL` | `http://localhost:5177` | Base des QR codes de quittances |
| `RECEIPT_STORAGE_DIR` / `DOCUMENT_STORAGE_DIR` | `./data/receipts` / `./data/documents` | Stockage fichiers |
| `SEED_DEMO` | `false` | Charger les données de démonstration (à activer explicitement) |
| `SERVER_PORT` | `8080` | Port HTTP |

## Email réel — MailerSend (domaine vérifié)

Le composeur manuel (Messages → Nouveau message → **destinataire externe**) et
les relances automatiques passent par le fournisseur email configuré. Avec
MailerSend, le **domaine d'essai** (`*.mlsender.net`) n'accepte que **2
destinataires uniques** : au-delà, l'API répond `422` (`MS42225 — sandbox
account unique recipients limit`) et la livraison passe en `FAILED` (visible
dans **Suivi des envois**). Ce n'est pas un bug du message : le compte sandbox
ne peut pas écrire à de nouvelles adresses.

Pour envoyer vers n'importe quelle adresse réelle :

1. MailerSend → **Email → Domains → Add domain** : ajoutez votre domaine.
2. Copiez les enregistrements DNS affichés chez votre registrar :
   - **SPF** (TXT à la racine) : `v=spf1 include:_spf.mailersend.net ~all` —
     fusionnez-la avec l'SPF existant (un seul enregistrement SPF par domaine) ;
   - **DKIM** : les deux CNAME `ms1._domainkey…` et `ms2._domainkey…` ;
   - **Return-Path** : le CNAME fourni par MailerSend.
   Les valeurs exactes (sensibles à la casse) sont affichées dans MailerSend,
   pas dans ce dépôt.
3. Revenez dans MailerSend et cliquez **Verify domain** (propagation : de
   quelques minutes à 24 h).
4. Renseignez l'expéditeur sur ce domaine puis redémarrez le backend :

```dotenv
MAIL_PROVIDER=mailersend
MAILERSEND_API_TOKEN=...
MAIL_FROM_ADDRESS=no-reply@votredomaine.mg
MAIL_FROM_NAME=MNK-TAX — Administration fiscale
```

Tant que `MAIL_FROM_ADDRESS` reste sur `*.mlsender.net`, un avertissement
s'affiche dans **Paramètres → Communications** et à l'étape de vérification du
composeur. L'alternative SMTP (`MAIL_HOST`, `MAIL_USERNAME`, `MAIL_PASSWORD`,
`MAIL_FROM_ADDRESS`) reste disponible avec un domaine vérifié chez le
fournisseur SMTP.

### Contrôle au démarrage

Dès que le fournisseur est configuré, le backend interroge l'API MailerSend
(`GET /v1/domains`) au démarrage et journalise l'état du domaine expéditeur :

- `est VÉRIFIÉ — envoi vers de vrais destinataires autorisé` ;
- `est présent mais NON VÉRIFIÉ` (enregistrements DNS à publier / vérification
  à lancer dans MailerSend) ;
- `n'est pas rattaché à ce compte` (domaine à ajouter) ;
- `est VÉRIFIÉ, mais il s'agit du domaine d'essai (sandbox)` (limite de
  2 destinataires uniques) ;
- `Contrôle du domaine d'envoi MailerSend impossible` (API injoignable ou jeton
  refusé — le démarrage n'est pas bloqué et le jeton n'est jamais journalisé).

Le contrôle utilise des délais courts (5 s de connexion, 10 s de lecture) et
n'effectue aucun envoi.

## Développement local

```bash
# Terminal 1 — backend (H2 en mémoire, aucune dépendance externe)
cd backend && ./mvnw spring-boot:run

# Terminal 2 — frontend (proxy vers http://localhost:8080)
cd frontend && npm install && npm run dev
```

Ouvrir http://localhost:5177. Compter `admin` / `Admin@123` pour se connecter.

## Tests

```bash
cd backend && ./mvnw test            # 202 tests (auth, validateur NIF, moteur, flux)
cd frontend && npm run build         # typecheck tsc + bundle production
cd frontend && npm run lint          # oxlint
```

## Sauvegarde et maintenance

- Les volumes nommés (`pgdata`, `backend-data`) contiennent respectivement les données et les
  fichiers générés ; une sauvegarde doit les inclure.
- Les migrations Flyway sont appliquées automatiquement au démarrage du backend ; ne pas
  éditer une migration déjà appliquée (créer `V7__…`).
- Redémarrage simple : `docker compose up -d` (reprend les conteneurs existants).
