# Déploiement gratuit de MNK-TAX sur Internet (Render + Neon)

> **Note importante** : le projet MNK-TAX n'est **pas** un projet Laravel. Le backend
> réel est **Spring Boot 3.3.5 (Java 17)** et le frontend est **React 19 + Vite**.
> Les consignes « Laravel » (`APP_DEBUG`, `php artisan migrate`, `storage/`) ne s'y
> appliquent pas ; leurs équivalents Spring Boot sont documentés ici.

## 1. Pourquoi cette solution ?

| Besoin | Choix 2026 | Pourquoi |
| ------ | ---------- | -------- |
| Hébergement backend + frontend | **Render** — plan **Hobby gratuit** | 1 web service Docker gratuit (0,1 vCPU / 512 Mo RAM), HTTPS automatique sur `https://<service>.onrender.com`, **aucune carte bancaire requise**, 750 h/mois (≈ 1 service 24/7), 5 Go de bande passante. |
| Base de données PostgreSQL | **Neon** — plan **Free** | PostgreSQL géré gratuit et **sans expiration**, 0,5 Go, scale-to-zero après 5 min, **pas de carte bancaire**, idéal pour une démo académique. Des recherches de septembre 2026 confirment que le niveau gratuit est toujours disponible. |

- **Redis n'est pas utilisé.** Le projet l'utilise en dev via Docker, mais le backend
  fonctionne avec un cache mémoire `simple`. Le profil `prod` le désactive proprement.
- **Un seul service Render** sert à la fois le frontend (nginx) et l'API (Spring Boot).
  → pas de CORS entre domaines, un seul domaine HTTPS, aucun dépassement des 750 h/mois.

## 2. Limites du plan gratuit (à connaître)

- **Mise en veille** : après ~15 min d'inactivité, Render endort le service ; le premier
  chargement prend 30–90 s. C'est normal et sans coût.
- **Stockage éphémère** : les PDF de quittances, QR codes, documents uploadés et avatars
  sont écrits dans le conteneur (**`/app/data`**). Ils sont **perdus à chaque redéploiement**.
  Acceptable pour une démo ; pour conserver des fichiers, il faudrait un stockage objet (payant).
- **Mémoire** : 512 Mo → la JVM est bridée (`-Xmx384m`) et nginx tient facilement dedans.
- **Build** : les builds Docker passent par Render (Maven + Vite) ; comptez ~10–15 min au 1er déploiement.

## 3. Fichiers préparés dans le dépôt

```
backend/src/main/resources/application-prod.yml   ← profil production (Postgres/Neon, cache mémoire, CORS, actuator sécurisé)
deploy/render/Dockerfile                          ← image unique nginx + JRE 17 (2 étapes de build Maven + Vite)
deploy/render/nginx.template                      ← config nginx (SPA + proxy /api + /actuator/health) via $PORT
deploy/render/start.sh                            ← génère la conf nginx, lance nginx puis Java (non-root)
deploy/render/render.yaml                         ← Blueprint Render (déploiement automatisé)
deploy/render/smoke-test.ps1                      ← test de fumée post-déploiement (PowerShell)
.dockerignore                                     ← exclut node_modules/dist/target/data du contexte de build
```

## 4. Prérequis et préparation GitHub

Le code est déjà sur GitHub : `https://github.com/Joelito-rfa/MNK-TAX`.

1. Ouvrir une console dans le dossier du projet, puis **commiter et pousser** les fichiers
   de déploiement et les corrections de compilation du frontend :

```powershell
git add .
git commit -m "feat(deploy): déploiement Render + Neon (profil prod, Dockerfile, smoke-test)"
git push origin main
```
> ⚠️ Ne poussez **aucun** `.env`, ni `backend/data/` ni `JWT_SECRET` (`.gitignore` les bloque,
> `render.yaml` déclare les secrets en `sync: false`).

2. **Créer un compte Neon** (https://neon.com) → « Sign up » (Google/GitHub). Aucune carte requise.

3. **Créer un compte Render** (https://render.com) → « Sign up » → connecter le compte GitHub.
   Aucune carte requise sur le plan Hobby.

---

## 5. Étape manuelle 1 — Créer la base PostgreSQL chez Neon

1. Dans Neon : **Create project** → nom `mnk-tax`, région proche (ex. Singapore pour Madagascar),
   version PostgreSQL 16 (par défaut).
2. Sur la page **Connection details**, choisir **Prisma / JDBC**. Récupérer :
   - l'**URL JDBC** (format `jdbc:postgresql://ep-xxxx.region.aws.neon.tech/mnktax?...`)
   - le **username** et le **password** (role `neondb_owner` ou celui créé).
3. **Ajouter `sslmode=require`** à l'URL pour éviter l'erreur SSL de Neon :
   ```
   jdbc:postgresql://ep-xxxx.region.aws.neon.tech/mnktax?sslmode=require
   ```
   (ou utiliser la chaîne « pooled » avec PgBouncer : `...-pooler...neon.tech`).
4. Notez dans un gestionnaire de mots de passe : `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`.

---

## 6. Étape manuelle 2 — Déployer sur Render

### Option A — Blueprint (recommandé, automatique)

1. Sur Render : **New + → Blueprint**.
2. Sélectionner le dépôt `Joelito-rfa/MNK-TAX`.
3. Render lit `deploy/render/render.yaml`, crée un service **mnk-tax** (Docker, plan free).
4. Cliquer **Apply**. Le premier build lance Maven + Vite (10–15 min).

### Option B — Création manuelle du service

1. **New + → Web Service** → connecter le dépôt.
2. Paramètres :
   - **Name** : `mnk-tax`
   - **Runtime** : `Docker`
   - **Dockerfile path** : `deploy/render/Dockerfile`
   - **Docker build context** : `.`
   - **Plan** : `Free`
   - **Health Check Path** : `/actuator/health`
   - **Instance Type** : `Free` (0.1 CPU / 512 MB)
3. **Create Web Service**.

---

## 7. Étape manuelle 3 — Variables d'environnement (secrets)

Dans Render → service **mnk-tax** → **Environment**, ajouter et enregistrer :

| Variable | Valeur | Secret ? |
| -------- | ------ | -------- |
| `SPRING_PROFILES_ACTIVE` | `prod` | non |
| `DATABASE_URL` | l'URL JDBC Neon (avec `sslmode=require`) | **oui** |
| `DATABASE_USERNAME` | username Neon | **oui** |
| `DATABASE_PASSWORD` | mot de passe Neon | **oui** |
| `JWT_SECRET` | secret aléatoire (voir ci-dessous) | **oui** |
| `CORS_ALLOWED_ORIGINS` | `https://mnk-tax.onrender.com` *(ou votre URL finale)* | non |
| `RECEIPT_BASE_URL` | `https://mnk-tax.onrender.com` *(URL publique affichée dans les QR codes)* | non |
| `SEED_DEMO` | `false` (aucun seed fictif en prod par défaut) | non |
| `RATE_LIMIT_ENABLED` | `true` | non |
| `RATE_LIMIT_PER_MINUTE` | `120` | non |
| `DB_POOL_SIZE` | `5` | non |

Générer un `JWT_SECRET` fort (PowerShell) :

```powershell
$b = New-Object byte[] 48
(New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($b)
[Convert]::ToBase64String($b)
```

> Render masque automatiquement les valeurs marquées secrètes ; elles ne sont jamais
> lisibles dans les logs ni stockées dans GitHub.

---

## 8. HTTPS, migérantions, seed et CORS

- **HTTPS** : automatique sur `https://mnk-tax.onrender.com` (certificat Let's Encrypt géré
  par Render). Pour un domaine personnel : onglet **Settings → Custom Domain** (2 domaines inclus).
- **Migrations** : exécutées **automatiquement par Flyway au démarrage** de l'application.
  Rien à faire : `V1__…` à `V28__…` dans `backend/src/main/resources/db/migration`.
- **Seed** : désactivé en prod par défaut (`SEED_DEMO` vaut `false` via `application-prod.yml`).
  Pour charger les comptes de démonstration à la **première** exécution, mettre `SEED_DEMO=true` :
  - `admin` / `Admin@123` (super admin) — **changez ce mot de passe après le 1er accès.**
  - `agent.tax`, `agent.collection`, `accountant`, `taxpayer.demo` (voir README).
  - Détail des données fictives : `docs/FAKE_DATA_DOCUMENTATION.md` + `docs/fake-data-seed.json`.
- **CORS** : profil `prod`, même domaine → traitée par le proxy nginx, et la liste blanche
  `CORS_ALLOWED_ORIGINS` limite les origines externes.
- **Équivalent de `APP_DEBUG=false`** (Spring Boot) : activé par le profil `prod` —
  `server.error.include-*: never`, `spring.jpa.show-sql: false`, exposition Actuator limitée
  à `health,info` avec `show-details: never`, logs au niveau INFO.

---

## 9. Vérification complète après déploiement

### a) Test API automatisé

```powershell
# Depuis une machine avec PowerShell : le site DOIT être réveillé (premier chargement ~60 s)
cd deploy\render
.\smoke-test.ps1 -BaseUrl "https://mnk-tax.onrender.com"
# ^^ vérifie : santé, SPA, login, dashboard, contribuables, déclarations,
#    créances, paiements, quittances, notifications, rapports, audit,
#    recherche, PDF (download réel), page publique de QR, 401 sans token.
```

### b) Test manuel fonctionnel (chemin complet)

1. Vérifier le seed : `Seed de démonstration appliqué` dans les logs (Onglet **Logs**) — uniquement si `SEED_DEMO=true` a été activé ; sinon `Seed de démonstration désactivé`.
2. Se connecter : https://mnk-tax.onrender.com avec `admin` / `Admin@123`.
3. Tester dans cet ordre :
   - **Tableau de bord** (indicateurs) ;
   - **Contribuables** : liste + **recherche** (NIF/nom) + ouvrir un dossier + **upload de document** ;
   - **Déclarations** : créez un brouillon → soumettre → **valider** (moteur de règles → imposition) ;
   - **Créances** : vérifier la génération d'une créance, marquer en retard si échéance dépassée ;
   - **Recouvrement** : action de recouvrement, **mise en demeure PDF** téléchargeable ;
   - **Paiements** : enregistrer un paiement, l'allouer à la créance ;
   - **Quittances** : la quittance générée doit avoir un **QR code** ; scanner/suivre l'URL
     `https://mnk-tax.onrender.com/verify/receipt/<TOKEN>` (page publique) ; **télécharger le PDF** ;
   - **Notifications** : la cloche doit afficher les événements ;
   - **Rapports** : synthèses de recouvrement/paiements ;
   - **Historique/audit** : journaux d'audit.
4. **Erreurs** : ouvrir une route inconnue → page 404 React ; API sans token → **401 JSON** ;
   accès sans permission → **403**.

---

## 10. Checklist sécurité avant de communiquer l'URL

- [ ] `SPRING_PROFILES_ACTIVE=prod` actif (sinon H2/console active) ;
- [ ] `JWT_SECRET` robuste défini, aucun fallback utilisé ;
- [ ] `SEED_DEMO` : compte `admin`/`Admin@123` **changé** après la 1re connexion ;
- [ ] `DATABASE_*` pointent sur **Neon** (et non localhost) ;
- [ ] `RECEIPT_BASE_URL` = URL HTTPS publique (QR codes valides) ;
- [ ] Aucun `.env` / mot de passe dans les logs ni dans GitHub ;
- [ ] `backend/data` et `frontend.zip` non poussés (`.gitignore`) ;
- [ ] L'API sans token renvoie 401, Swagger pas indispensable (désactivable via la config d'exposition) ;
- [ ] Premier chargement à froid accepté (mise en veille free tier).

## 11. Redéploiement après modification

```
Push sur GitHub (branche main) → Render redéploie automatiquement le Dockerfile.
```

Pour un redéploiement manuel : Dashboard → service → **Manual Deploy → Clear build cache & Deploy**.
Attention : le redéploiement **purge `/app/data`** (fichiers générés).