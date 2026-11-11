# MNK-TAX

Prototype académique (non officiel) d'un système de gestion fiscale malgache : déclarations, moteur de règles, impositions, créances, paiements, quittances (QR + PDF), recouvrement, notifications, audit et reporting.

> ⚠️ Application de **démonstration** à but pédagogique. Les données, calculs et documents ne constituent pas une source officielle de l'administration fiscale.

---

## Aperçu

| Couche | Technologie |
| ------ | ----------- |
| Backend | Java 17, Spring Boot 3.3.5, Spring Security (JWT), Spring Data JPA, Flyway |
| Base de données | PostgreSQL 16 (prod/docker), H2 en mode PostgreSQL (dev/test) |
| Cache / rate-limit | Redis (prod), cache simple (dev) |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query, React Router, recharts |
| Documents | QR code (ZXing), PDF (OpenPDF), stockage fichiers |
| Tests | JUnit 5, Spring Boot Test, AssertJ (202 tests) |
| Livraison | Docker Compose, nginx |

## Structure du dépôt

```
backend/          API REST Spring Boot (+ mvnw)
frontend/         Application React + Vite
docs/             Documentation technique (architecture, API, sécurité…)
docker-compose.yml  Orchestration (postgres, redis, backend, frontend)
.env.example      Variables d'environnement
```

## Démarrage rapide

### Option 1 — Docker (recommandé)

```bash
cp .env.example .env   # renseigner JWT_SECRET et POSTGRES_PASSWORD
docker compose up --build
```

- Frontend : http://localhost:3000
- API : http://localhost:8080/api
- Swagger UI : http://localhost:8080/swagger-ui.html
- H2 console (profil dev) : http://localhost:8080/h2-console

### Option 2 — Développement local

Backend (profil `dev`, H2 en mémoire, `SEED_DEMO=true` explicite) :

```bash
cd backend
./mvnw spring-boot:run        # ou mvnw.cmd sous Windows
```

Le profil `dev` charge automatiquement les fichiers `.env` et `.env.local`
(UTF-8) situés à la racine du projet ou dans `backend/`. `.env.local` est
prioritaire sur `.env` ; les variables d'environnement du système restent
prioritaires sur les deux. C'est donc l'endroit recommandé pour les
identifiants SMTP réels (`MAIL_HOST`, `MAIL_USERNAME`, `MAIL_PASSWORD`…).

Frontend (proxy `/api` vers http://localhost:8080) :

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5177
```

## Comptes de démonstration (seed)

| Rôle | Identifiant | Mot de passe |
| ---- | ----------- | ------------ |
| Super administrateur (`SUPER_ADMIN`) | `superadmin` | `Admin@123` |
| Administrateur (`ADMIN`) | `admin` | `Admin@123` |
| Agent des impôts (`TAX_AGENT`) | `agent.tax` | `Agent@123` |
| Agent de recouvrement (`COLLECTION_AGENT`) | `agent.collection` | `Agent@123` |
| Comptable (`ACCOUNTANT`) | `accountant` | `Agent@123` |
| Contribuable (`TAXPAYER`) | `taxpayer.demo` | `Taxpayer@123` |

Seed désactivé par défaut ; activé explicitement en profil `dev` (`SEED_DEMO=true`). Les permissions et rôles système sont toujours créés au démarrage, même sans données fictives.

Matrice complète des accès : [`docs/ACCESS_MATRIX.md`](docs/ACCESS_MATRIX.md).

## Commandes utiles

```bash
# Backend — tests
cd backend && ./mvnw test

# Backend — package
cd backend && ./mvnw package -DskipTests

# Frontend — build de production
cd frontend && npm run build

# Frontend — lint
cd frontend && npm run lint
```

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — architecture applicative et flux métier
- [`docs/API.md`](docs/API.md) — références des endpoints REST
- [`docs/DATABASE.md`](docs/DATABASE.md) — schéma et migrations Flyway
- [`docs/SECURITY.md`](docs/SECURITY.md) — authentification, RBAC, bonnes pratiques
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — déploiement Docker et configuration

## Avertissement légal

MNK-TAX est un travail d'étude. Toute ressemblance avec un système réel est fortuite ; aucun document produit (quittance, mise en demeure, rapport) n'a de valeur officielle.
