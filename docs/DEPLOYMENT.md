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
| `JWT_SECRET` | valeur dev | **À changer** |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | `3600` / `604800` | Durées (s) |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:5177,http://localhost:3000` | Origines autorisées |
| `RATE_LIMIT_ENABLED` / `RATE_LIMIT_PER_MINUTE` | `true` / `120` | Rate-limit |
| `RECEIPT_BASE_URL` | `http://localhost:5177` | Base des QR codes de quittances |
| `RECEIPT_STORAGE_DIR` / `DOCUMENT_STORAGE_DIR` | `./data/receipts` / `./data/documents` | Stockage fichiers |
| `SEED_DEMO` | `true` | Charger les données de démonstration |
| `SERVER_PORT` | `8080` | Port HTTP |

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
cd backend && ./mvnw test            # 35 tests (auth, validateur NIF, moteur, flux)
cd frontend && npm run build         # typecheck tsc + bundle production
cd frontend && npm run lint          # oxlint
```

## Sauvegarde et maintenance

- Les volumes nommés (`pgdata`, `backend-data`) contiennent respectivement les données et les
  fichiers générés ; une sauvegarde doit les inclure.
- Les migrations Flyway sont appliquées automatiquement au démarrage du backend ; ne pas
  éditer une migration déjà appliquée (créer `V7__…`).
- Redémarrage simple : `docker compose up -d` (reprend les conteneurs existants).
