# Analyse du mémoire de 2ème année — PayFiscal

> **Note sur la source.** Le fichier `docs/memoire_2eme_annee.docx` **n'existe pas** dans le
> dépôt (dossier `docs/` : API.md, ARCHITECTURE.md, DATABASE.md, DEPLOYMENT.md,
> DEPLOYMENT-RENDER.md, SECURITY.md, FAKE_DATA_DOCUMENTATION.md, fake-data-seed.json,
> reference/). La lecture a donc porté sur la copie retrouvée sur le poste :
> `C:\Users\rafan\Downloads\027I24 RAFANOMEZANTSOA Armi Joelito memoire.docx`
> (15 391 337 octets ; créé le 22/07/2025, modifié le 28/08/2025 ; auteur Word « Lucef » ;
> propriétaire du document : **RAFANOMEZANTSOA Armi Joelito**, 027I24).
> Fichier original **non modifié** : une copie de travail a été convertie avec
> `pandoc … -t gfm --extract-media=media`.
> Métadonnées du fichier : **79 pages**, **10 646 mots**, **60 686 caractères**.

---

## 1. Structure complète (avec nombre de pages approximatif)

Les numéros de page proviennent de la **Table des matières** du document (lignes de
connexion « … … … page »). Les durées en pages sont des **reconstitutions à partir de ces
repères** (le fichier ne donne pas de folio exploitable au-delà de la table des matières).

### 1.1 Pages liminaires (chiffres romains)

| Bloc | Page (selon table des matières) | Contenu | Vol. approx. |
|---|---|---|---|
| Page de garde | non numérotée | logos, université, école, mention, parcours, « MÉMOIRE DE FIN DU CYCLE », « Rapport du stage en vue de passage en 3 ème année », nom, directeur, année 2024-2025 | 1 p. |
| Image pleine page (couverture graphique) | non numérotée | — | 1 p. |
| **AVANT-PROPOS** | I | 1 paragraphe | 1 p. |
| **REMERCIEMENTS** | II | liste à puces | 1 p. |
| **LISTES DES CARTES ET FIGURES** | IV | 17 entrées (voir §1.3) | 1 p. |
| **LISTES DES TABLEAUX** | V | 5 entrées | 1 p. |
| (page VI absente de la table) | — | **saut de pagination non justifié** | ? |
| **LISTES DES ABRÉVIATIONS** | VII | 25 abréviations | 1 p. |
| **GLOSSAIRE** | VIII | 9 entrées | 1 p. |
| **Table des matières** (intitulé réel) | non numérotée | 78 entrées, hyperliens Word | 2-3 p. |

### 1.2 Corps du mémoire (chiffres arabes)

| Bloc | Page | Sections | Vol. approx. |
|---|---|---|---|
| **INTRODUCTION GÉNÉRALE** | 1 | 4 paragraphes + annonce du plan en 3 parties | 1 p. |
| **PARTIE I : PRESENTATION GENERALE** | 2 | | ~33 p. |
| — Chapitre 1 : Présentation de l'EMIT | 2 → ~20 | 1.1 Historique, 1.2 Formation (1.2.1-1.2.3), 1.3 Sciences de la société, 1.4 Sciences et technologies, 1.5 Personnels, 1.6 Partenaires (1.6.1-1.6.3), 1.7 Organismes publiques, 1.8 Vie étudiante, 1.9 Membre de bureau, 1.10 Activités (1.10.1-1.10.6), 1.11 E.N.T., 1.12 Bibliothèque numérique, 1.13 Formation en ligne, 1.14 Salle 3D | **~19 p.** |
| — Chapitre 2 : Présentation de l'Entreprise d'actuel | 21 → 32 | 2.1 Présentation (2.1.1 Histoire DGI, 2.1.2 Historique DRI/HM + compétences SRE, 2.1.3 Organigramme DRI/HM, 2.1.4 Organisation du personnel 2.1.4.1 à 2.1.4.13, Technique Fiscal, Organisation au sein du Centre Fiscal a-d), puis 2.1.3 *bis* Objectifs principaux, 2.1.4 *bis* Rôles de la DGI | **~12 p.** |
| — « Chapitre 2 » bis : Présentation du Projet (**numérotation réelle 3.x**) | 33 → 34 | 3.1 Origine de projet, 3.2 Objectif du projet, 3.3 Planification des tâches (8 semaines) | **~2 p.** |
| **Partie II : ANALYSE ET CONCEPTION DU PROJET** (1ère occurrence) | 35 | | ~5 p. |
| — Chapitre 4 : Méthode et notations utilisées | 35 → 39 | 4.1 Introduction, 4.2 Présentation de MERISE (4.2.1 Historique, 4.2.2 Définition, 4.2.3 Cycle d'abstraction, 4.2.4 Modèles, 4.2.5 MCC), 4.3 Couche d'analyse (4.3.1 conceptuelle, 4.3.2 logique, 4.3.3 physique) | **~5 p.** |
| **Partie II : Analyse et Conception du Projet** (2ème occurrence) | 40 | | ~12 p. |
| — Chapitre 5 : Analyse du Projet | 40 → 41 | 5.1 Analyse des besoins, 5.2 Analyse de faisabilité | **~2 p.** |
| — Chapitre 6 : Conception du projet | 42 → 51 | 6.1 Dictionnaire de données, 6.2 Règles de gestion, 6.3 MCD, 6.4 MLD (6.4.1-6.4.3), 6.5 Graphe des flux, 6.6 MCT (6.6.1-6.6.6), 6.7 MCTA, 6.8 MOT (6.8.1-6.8.3) | **~10 p.** |
| **Partie III : RÉALISATION DU PROJET** | 52 | | ~6 p. |
| — Chapitre 7 : Spécification des outils de la réalisation | 52 | 7.1 SGBD (tableau MySQL) | **~1 p.** |
| — Chapitre 8 : Mise en œuvre et implémentation | 53 | 8.1 Installation de l'environnement, 8.2 Connexion à la base de données | **~1 p.** |
| — Chapitre 9 : Présentation de l'application développée | 54 → 57 | 9.1 Introduction, 9.2 Authentification, 9.3 Gestion des paiements (9.3.1 liste, 9.3.2 enregistrement contribuable, 9.3.3 enregistrement paiement, 9.3.4 statistiques) | **~4 p.** |
| **Conclusion** | 58 | 4 paragraphes | 1 p. |
| **Bibliographie** | 59 | 10 références | 1 p. |
| **ANNEXES** | 60 → 63 | « Exemple de code PHP » : 4 captures d'écran | ~4 p. |
| **RÉSUMÉ** | 64 | + mots-clés | 1 p. |
| **ABSTRACT** | 65 | + keywords | 1 p. |
| *(fin du document)* | → 79 | **~14 pages résiduelles** (titres vides, paragraphes vides après le RÉSUMÉ) | ~14 p. |

**Répartition indicative :** présentation institutionnelle (EMIT + entreprise + projet) ≈ 35 p.
sur 65 ≈ **54 %** ; analyse/conception ≈ 17 p. ≈ **26 %** ; réalisation ≈ 6 p. ≈ **9 %** ;
liminaires + annexes ≈ 11 p. ≈ **17 %** (les pourcentages se recoupent par arrondi).

### 1.3 Liste des figures et tableaux telle qu'elle figure dans le document

**LISTES DES CARTES ET FIGURES (17 entrées, incohérentes — cf. § 8.2) :**
Figure 1.1 Mention et parcours · 1.2 Parcours de licence AES · 1.3 Parcours de Master AES ·
1.4 Parcours de Licence PRM · 1.5 Parcours de Master RPM · 1.6 Parcours de Licence DA2I ·
1.7 Parcours de Master DA2I · 1.8 Parcours de Master SIGD · 1.9 Parcours de Master M2I ·
**1.8** Organigramme de personnels · **1.9** Organigramme de partenaires · 1.10 Organigramme
des écoles et universités · 1.11 Organigramme des entreprises · 1.12 Organismes des publiques ·
1.13 Organigramme du membre de bureau · 1.14 Figure de la direction · 1.15 Localisation de
l'entreprise · 6.1 MCD · 6.2 Relation (1,1)-(1,n) · 6.3 Relation (1,n)-(1,n) · 6.4 Relation
(1,n)-(1,n) avec attribut PP · 6.5 Graphe des flux · 6.6 MCT · **6.6** MCTA.

**LISTES DES TABLEAUX (5 entrées) :** Tableau 3.1 Planification du projet · 4.1 Phases de la
méthode MERISE · 5.1 Matériel utilisé à la réalisation · 6.1 Dictionnaire de données ·
7.1 Comparaison de MySQL et PostgreSQL.

**Légendes réellement présentes dans le corps :**
Chap. 1 : 1.1 à 1.13 (13 figures) — Chap. 2 : « Figure 2 Structure de la Direction des
Impôts », « Figure 3 Organigramme de la DRI/HM », « Figure 4 Organigramme du CF/HM » —
Chap. 4 : « Figure 4.1 Cycle d'abstraction » + Tableau 4.1 — Chap. 5 : Tableau 5.1 (deux
légendes différentes) — Chap. 6 : Figure 6.1 MCD *(sans image)*, Figure 6.2 *(cardinalités)*,
Figure 6.3, Figure 6.4 *(cardinalités)*, **Figure 6.2** *(graphe des flux, doublon)*,
**Figure 6.4** *(MCTA, doublon)* — Chap. 7 : Tableau 7.1 « MySQL » — Chap. 9 : 8 captures.

**Images réellement insérées : 36** (3 logos + couverture + 14 fig. institutionnelles +
1 organigramme DGI + 1 organigramme CF + 1 tableau MERISE + 3 figures pédagogiques de
cardinalité + 1 graphe des flux + 1 MCTA + 7 captures d'application + 4 captures de code).

---

## 2. Format et mise en page

| Élément | Constat (source : `word/styles.xml`, `word/document.xml`) |
|---|---|
| **Ordre des pages liminaires** | Page de garde → image de couverture → AVANT-PROPOS → REMERCIEMENTS → LISTES DES CARTES ET FIGURES → LISTES DES TABLEAUX → LISTES DES ABRÉVIATIONS → GLOSSAIRE → Table des matières → INTRODUCTION GÉNÉRALE. **Pas de dedicace, pas de page « Sommaire » titrée autrement que « Table des matières ».** |
| **Numérotation** | Chiffres **romains** pour les liminaires (I, II, IV, V, VII, VIII), chiffres **arabes** à partir de l'Introduction (p. 1). Page VI **absente** de la table des matières. |
| **Police** | **Times New Roman** (3 317 occurrences en corps ; `TimesNewRomanPS-BoldMT` en gras ; police d'Asie SimSun). Aucune autre police. |
| **Corps de texte** | **12 pt** (2 330 occurrences) ; 14 pt (180), 16 pt (25), 18 pt (35) pour les titres ; 8 pt (138) dans les tableaux. |
| **Styles de titres** | `Titre1` (2), `Titre2` (31), `Titre3` (15), `Titre4` (15), `TM1`-`TM4` (titres de table des matières automatiques). **189 paragraphes sont en style `NormalWeb`** (= « Normal (Web) »), marque typique d'un texte **collé depuis une page web/HTML**. |
| **Hiérarchie de titres** | Titre en **gras seul** (pas de style cohérent) : `**Chapitre 1 : …**`, `#### 6.3. …`, parfois `#` / `##` / `###` (format Markdown/HTML résiduel dans le corps). Pas d'alignement/numérotation automatisés. |
| **Listes** | Puces `➢` pour les listes de figures, `●` pour le planning et les parcours, `-` pour le reste. Listes des remerciements **cassées en segments d'une phrase** (chaque tiret coupe la phrase : « …dans l'amélioration de / l'EMIT. »). |
| **Tableaux** | 3 tableaux réels (matériel, dictionnaire de données, SGBD) + 1 tableau image (phases MERISE). Bordures simples, texte en gras généralisé (Tableau 5.1). |
| **Citations/sources** | Aucune note de bas de page, aucun renvoi `[n]`. Bibliographie numérotée simple. |
| **Images** | Majoritairement pleine largeur (6,2 à 7,5 pouces), légende en dessous, « Figure X » en gras souligné. |

---

## 3. Le projet PayFiscal en détail

### 3.1 Problème et objectifs
*(Source : Introduction générale, § 3.1 « Origine de projet », § 3.2 « Objectif du projet »)*

- **Problème :** « les procédures traditionnelles de paiement des impôts reposaient encore
  largement sur des méthodes manuelles », avec « la lenteur du traitement, les risques
  d'erreurs humaines, la perte de documents, et la difficulté pour les contribuables de se
  déplacer à chaque échéance fiscale » (§ 3.1).
- **Objectif (§ 3.2) :** « moderniser et optimiser la gestion des paiements fiscaux en
  offrant une solution numérique fiable, sécurisée et adaptée aux besoins de l'administration
  fiscale ».
- **Intitulés du sujet (4 variantes — cf. § 8.1) :** page de garde = aucun titre de sujet ;
  avant-propos = « Mise en place d'une applicatiob de gestion des paiements en ligne au sein
  de fianarantsoa : Centre Fiscal » ; Introduction = « MISE EN PLACE D'UNE APPLICATION DE
  Gestion des paiements en ligne AU SEIN DE FIANARANTSOA : Centre Fiscal A » ;
  RÉSUMÉ/ABSTRACT = « Conception et réalisation d'une application de gestion et de paiement
  fiscal en ligne (PayFiscal) ».
- **Lieu du stage :** CENTRE FISCAL A (RÉSUMÉ), rattaché à la DRI Haute Matsiatra ; le
  cadre annoncé dans l'avant-propos est « le direction genéral des impots ».
- **Nom de l'application :** **PayFiscal** (première mention au § 3.1 ; absent de la page de
  garde et de l'introduction).
- **Date de début du projet :** **non précisé** (seul « Année Universitaire 2024-2025 » et
  « stage organisé pendant deux mois » sont donnés).

### 3.2 Acteurs et besoins fonctionnels
*(Source : § 5.1 « Analyse des besoins », § 9.1, § 9.2, § 6.5 « Graphe des flux »)*

Trois acteurs au § 5.1 :

| Acteur | Rôle (§ 5.1) |
|---|---|
| **Administrateur** | « Gère les clients, les paiements et les reçus. Il a un accès complet au système et peut modifier, ajouter ou supprimer des données. » |
| **Client** | « Personne qui bénéficie des services et pour laquelle un paiement et un reçu sont générés. Il doit pouvoir être ajouté, modifié et consulté rapidement. » |
| **Caissier** | « Chargé de saisir les paiements effectués par les clients et de générer automatiquement les reçus associés. » |

**Besoins fonctionnels listés (§ 5.1) :**
1. Enregistrement des clients (nom, prénom, adresse, contact, email).
2. Gestion des paiements (montant, mode de paiement, date, statut).
3. Génération des reçus (référence, date d'émission, montant payé).
4. Consultation et recherche par filtre (nom client, période, montant, statut du paiement).
5. Sécurité via authentification des utilisateurs.

**Besoins non fonctionnels :** **non précisé** (hormis « interface simple, fiable et
facilement déployable », Conclusion).

**Divergences d'acteurs à noter (détail § 8.1) :** § 9.1/9.2 nomment les rôles
« administrateur, agent, contribuable » ; le graphe des flux reprend
« Administrateur / Caissier / Client » ; la figure MCTA nomme « CLIENT / POSTIER » ;
l'écran d'accueil affiche « Bonjour, admin ».

### 3.3 Règles de gestion
*(Source : § 6.2 « Règles de gestion » — 5 règles, 10 lignes)*

- **R.G 1 :** Un paiement ne peut être enregistré sans client associé.
- **R.G 2 :** Chaque paiement doit générer automatiquement un reçu avec une référence unique.
- **R.G 3 :** Les montants doivent être numériques et supérieurs à zéro.
- **R.G 4 :** La modification des paiements est réservée aux administrateurs.
- **R.G 5 :** Les clients peuvent avoir plusieurs paiements et donc plusieurs reçus.

**Règles d'organisation (RO1-RO5, § 6.8.3)** — *incohérentes, elles portent sur la
**procuration** et non sur le paiement fiscal* : procuration complète (mandataire, mandant,
adresse, code postal, ville, pays, n° de procuration, date d'expiration) ; majuscule
initiale des champs texte ; recherche par n°/nom ; modification réservée aux utilisateurs
autorisés ; statuts Active / Expirée / En attente.

**Aucune règle de gestion fiscale** (NIF, nature d'impôt, échéance, période, arriéré,
liquidation, exemption) : **non précisé**.

### 3.4 Dictionnaire de données
*(Source : § 6.1, Tableau 6.1 — 13 entrées)*

| Rubrique | Définition | Type | Longueur | Format |
|---|---|---|---|---|
| id_client | Identifiant client | N | 11 | – |
| nom | Nom du client | AN | 255 | Majuscule initiale |
| prénom | Prénom du client | AN | 255 | Majuscule initiale |
| email | Email du client | AN | 255 | format@domaine.com |
| téléphone | Numéro téléphone | N | 20 | +261XXXXXXXXX |
| adresse | Adresse postale | AN | 255 | – |
| id_paiement | Identifiant paiement | N | 11 | – |
| montant | Montant payé | N | 20 | – |
| date_paiement | Date du paiement | D | – | yyyy-MM-dd |
| mode_paiement | Espèces/Carte/Virement | AN | 50 | – |
| statut | Statut du paiement | AN | – | enum('Payé','En attente') |
| id_reçu | Identifiant du reçu | N | 11 | – |
| date_reçu | Date d'émission du reçu | D | – | yyyy-MM-dd |

Codes : A = Alphabétique, AN = Alphanumérique, N = Numérique, D = Date, AA = Année,
MM = Mois, JJ = Jour.
**Champs présents dans le MLD mais absents du dictionnaire :** `nif`,
`reference_unique`. **Champ de la liste des codes mais jamais utilisé :** AA, MM, JJ.

### 3.5 Tables, champs et relations (MCD / MLD)
*(Source : § 6.3.3, § 6.4.3)*

- **MCD (§ 6.3.3) :** « Le MCD représente les relations entre les tables principales :
  **Client**, **Paiement**, **Reçu**. » → **la figure 6.1 n'est pas insérée** (le texte se
  termine par « Figure 6.1 : MCD du système » sans image).
- **Relations citées dans les listes de figures :** (1,1)-(1,n), (1,n)-(1,n),
  (1,n)-(1,n) avec attribut propre — **mais aucune n'est montrée pour le projet**, les
  figures 6.2/6.3/6.4 sont des **schémas pédagogiques génériques**.
- **MLD (§ 6.4.3) :**

```
client (id_client, nif, nom, prénom, email, téléphone, adresse)
paiement (id_paiement, montant, date_paiement, mode_paiement, statut, #id_client)
recu (id_recu, reference_unique, date_recu, #id_paiement)
```

- **Normalisation :** « Toutes les relations obtenues sont en **troisième forme normale (3FN)** » (§ 6.4.2).
- **Passage MCD → MLD (§ 6.4.2) :** propriété → attribut ; individu → relation (3FN) ;
  identifiant → clé primaire ; association sans propriété (1,1)-(1,n) → clé étrangère ;
  association (1,n)-(1,n) → relation à clé concaténée ; association avec propriétés propres →
  relation + attributs.
- **MPD :** **non précisé** (aucun script SQL, aucune capture de `payfiscal_db`, aucune
  contrainte/indice détaillé). Le seul indice est la création de `payfiscal_db` via
  phpMyAdmin (§ 8.2).

### 3.6 Modules, écrans et fonctionnalités
*(Source : § 3.3 Planning, § 9.1 à 9.3.4, captures d'écran)*

**Modules annoncés :**
- module **clients** (CRUD) — S3/S4 du planning ;
- module **commande** — S5 *(hors sujet, cf. § 8.1)* ;
- module **paiement** — S5 ;
- intégration + sécurité — S6 ;
- statistiques et rapports, tests — S7 ;
- optimisation, déploiement local, rédaction — S8.

**Écrans montrés (§ 9) :**
1. **Authentification** — page « Portail Paiement des Impôts » (logo DGI, lien impots.mg),
   identifiant + mot de passe, bouton « SE CONNECTER » ; message d'erreur en cas de saisie
   invalide ; « hashage de mot de passe (bcrypt) ».
2. **Liste des contribuables** — tableau complet + « barre de recherche par **numéro fiscal** ».
3. **Enregistrement d'un contribuable** — bouton « Ajouter » → formulaire (nom, adresse,
   téléphone, **NIF**, impôt concerné).
4. **Enregistrement d'un paiement** — depuis le profil du contribuable ; « le montant et la
   date sont automatiquement vérifiés » ; « un reçu est généré **en PDF** après validation ».
5. **Statistiques et rapports** — tableau de bord : montant total encaissé, nombre de
   contribuables enregistrés, « Évolution des paiements sur les 6 derniers mois »
   (capture : 3 clients, 27 342,00 Ar, 1 paiement).

**Partie Administrateur (§ 9.1) :** enregistrement/gestion des contribuables, génération et
affichage des reçus, statistiques et rapports financiers, « sécurisation via un système
d'authentification par rôles (administrateur, agent, contribuable) ».

**Arborescence du projet (visible dans les captures VS Code de l'Annexe) :**

```
PAYFISCAL/
├── clients/     ajouter.php, liste.php, modifier.php, supprimer.php
├── css/         js/, style.css
├── images/      img.webp, logofisca.jpg, payfisca.jpg
├── includes/    auth.php, config.php, footer.php, header.php
├── pages/       (contenu non précisé)
├── paiements/   enregistrer.php, liste.php, modifier.php, recu.php, supprimer.php
├── sql/         (contenu non précisé)
├── dashboard.php
├── generate_hash_te…   (nom tronqué dans la capture : non précisé)
├── index.php, logout.php, test_password.php
```

### 3.7 Technologies et outils
*(Source : § 3.1, § 5.2, § 7.1, § 8.1, RÉSUMÉ)*

| Catégorie | Éléments |
|---|---|
| Langage | **PHP 8.2** (« PHP natif »), HTML, CSS, JavaScript |
| SGBD | **MySQL**, base **`payfiscal_db`** créée via **phpMyAdmin** |
| Serveur / environnement | **XAMPP** (Apache + MySQL + PHP) — déploiement **en local uniquement** |
| Éditeur | **Visual Studio Code** |
| Versioning | **Git & GitHub** (« pour la gestion de version et la sauvegarde du projet ») |
| Accès données | **PDO** avec requêtes préparées (visible dans le code de l'Annexe) |
| Matériel (Tableau 5.1) | Vibobook GO E1504FA_E1504FA — AMD Ryzen 5 7520U 2.80 GHz — 16 Go RAM — 450 Go — écran 17,3'' — Windows 11 Famille |
| Choix du SGBD (§ 7.1) | Tableau « MySQL » : performance, simplicité, **sécurité : « Bonne »**, compatibilité, communauté |

**Comparaison annoncée** (liste des tableaux) : « Tableau 7.1 Comparaison de MySQL et
PostgreSQL » → **le tableau réel ne contient que la colonne MySQL** (cf. § 8.2).

### 3.8 Sécurité
*(Source : § 5.1, § 9.1, § 9.2, Conclusion, Annexe)*

Éléments affirmés :
- authentification obligatoire (`require_login()` visible dans le code) ;
- rôles « administrateur, agent, contribuable » (§ 9.1) ;
- **hashage des mots de passe en bcrypt** (§ 9.2) ;
- validation des identifiants en base (§ 9.2) ;
- message d'erreur explicite en cas de mauvaise saisie (§ 9.2) ;
- code observé : `PDO::prepare` + paramètres nommés (anti-injection SQL),
  `htmlspecialchars($string, ENT_QUOTES, 'UTF-8')` (anti-XSS), contrôle `preg_match('/^\d{10}$/', $search)` sur le NIF,
  `error_log(...)` au lieu d'afficher l'erreur SQL à l'utilisateur.

**Non précisé :** chapitre dédié à la sécurité, CSRF, gestion des sessions et déconnexion,
contrôle d'accès par rôle côté serveur, HTTPS, journalisation/audit, protection des données
personnelles (NIF), sauvegarde/restauration, politique de mots de passe, tests de pénétration.

### 3.9 Planning des 8 semaines
*(Source : § 3.3 « Planification des tâches durant le stage » — listé comme « Tableau 3.1 »
mais présenté en 8 puces, sans tableau)*

| Semaine | Contenu |
|---|---|
| **S1** | Prise de contact avec l'entreprise et l'équipe encadrante, compréhension du fonctionnement actuel de la gestion des paiements fiscaux, collection des besoins auprès des agents fiscaux et procédures manuelles. |
| **S2** | Analyse des besoins fonctionnelles et techniques, rédaction du cahier des charges, conceptions de la base des données (MCD / MLD). |
| **S3** | Conceptions de l'architecture de l'application (organisation des modules), réalisation des maquettes des interfaces utilisateurs, début de développement du module des clients (CRUD). |
| **S4** | Développement du module client. |
| **S5** | **Développement du module commande**, développement du module paiement. |
| **S6** | Intégration des modules entre eux, mise en place de la securité. |
| **S7** | Développement des statistiques et rapports, tests unitaires et fonctionnels. |
| **S8** | Optimisation et finalisation du projet, déploiement en local (XAMPP), Rédaction et finalisation du rapport de stage. |

Stage : **« organisé pendant deux mois »** (§ 3.3). Dates précises de début/fin : **non précisé**.

---

## 4. La méthode MERISE telle qu'elle est présentée

*(Source : Chapitre 4 — « Méthode et notations utilisées »)*

### 4.1 Justification et présentation
- § 4.1 : sans méthode, on rencontre « la redondance des données », « les synonymes »,
  « les polysémies », « la difficulté d'une maintenance efficace », « Moyens techniques
  limités », « Manque d'analyse d'analyse ».
- § 4.2.1 Historique : MERISE « a vu le jour entre 1978-1979 », suite à « une consultation
  nationale lancée en 1977 par le Ministère de l'Industrie » ; « Les deux principales
  sociétés ayant mis au point cette méthode sont le CTI (Centre Technologique de
  l'Équipement) implantée à Aix-en-Provence. » *(phrase incomplète — cf. § 8.4)*.
- § 4.2.2 Définition : « méthode de conception, de développement ainsi que de réalisation de
  projets informatiques », « basée sur la séparation des données et des traitements ».
- § 4.2.3 Cycle d'abstraction : SI manuel → Expression des besoins → Modèles conceptuels →
  Modèle organisationnel → Modèle logique → Modèle physique → SI automatisé
  (**Figure 4.1**, texte seul, **pas d'image**).

### 4.2 Modèles et notations employés

| Niveau | Modèle(s) cités | Présentation dans le mémoire |
|---|---|---|
| Expression des besoins | inventaire des éléments, délimitation du système, auprès des futurs utilisateurs | § 4.2.4 |
| Conceptuel | **MCC** (flux, acteurs, organisme, domaine d'activité), **MCD**, **MCT** | § 4.2.4, § 4.2.5, § 4.3.1 |
| Organisationnel | **MOT** (durée, lieu, responsables, ressources ; éclatement en procédures fonctionnelles PF) | § 4.3.2 (mal classé, cf. § 8.2), § 6.8 |
| Logique | **MLD**, (MOT) | § 4.3.2, § 6.4 |
| Physique | **MPD**, **MOpT** (« résume le MLD et le MPD à travers la fonction de mise à jour et de celle de la consultation ») | § 4.3.3 |

**Notations explicitement décrites :**
- **MCD** (§ 6.3.2.1-6.3.2.5) : entité (identifiant souligné, invariant), relation,
  propriété/attribut, cardinalité (bornes min/max ; (1,1), (0,1), (1,N), (0,N)),
  identifiant d'association par concaténation.
- **MLD** (§ 6.4.2) : règles de passage MCD → MLD, clé étrangère, **3FN**.
- **MCT** (§ 6.6.1-6.6.6) : événements (ellipse **trait plein** = interne, **trait pointillé**
  = externe), processus, opérations (« non interruptibles »), synchronisation (ET/OU/NON),
  règles d'émission (OK / NON OK / SI / SINON / TOUJOURS).
- **MCTA** (§ 6.7) : « Représentation analytique des traitements avec les données » —
  une seule figure.
- **MOT** (§ 6.8.1-6.8.3) : tableau organisationnel (Durée, Lieu, Responsables, Ressources
  nécessaires), objectifs Où/Comment/Par qui/Quand, règles d'organisation.
- **Graphe des flux / MCC** (§ 6.5.1) : « formalisme utilisé au niveau conceptuel est repris
  au niveau organisationnel », un acteur « est encore appelé INTERVENANT ».

**Tableau 4.1 « phases de la méthode MERISE »** (image) : matrice
*lignes* = Quoi / Qui, où, quand / Comment ; *colonnes* = Données / Traitement / niveau :
- Quoi → Données : « Quelles sont les informations utiles ? (MCD) » ; Traitement : « Pourquoi faire ? » → **Conceptuelle**
- Qui, où, quand → Données : « Quelles structures de données ? (MLD) » ; Traitement : « Pourquoi faire ? (MCT) » → **Logique**
- Comment → Données : « Comment stocker les données ? (MPD) » ; Traitement : « De quelle manière ? (MOpT) » → **Physique**

*(Le MCT est placé au niveau « Logique » dans ce tableau, alors que le § 4.3.2 de la même
partie classe le MOT à ce niveau : incohérence interne — cf. § 8.2.)*

**Ce qui n'est pas fait :** MCC réellement construit, MOT réellement construit (seules des
définitions + des RO), aucun tableau organisationnel rempli, aucun MOpT, aucun MPD.

---

## 5. Code et exemples techniques cités

*(Source : Annexe « Exemple de code PHP » — 4 captures d'écran VS Code, projet « payfiscal »,
PHP 8.2.12, UTF-8, CRLF, branche `main`. Transcription à partir des captures ; un écart de
détail par rapport au fichier source reste possible.)*

### 5.1 `paiements/liste.php` — recherche par NIF (Annexe, image 1)

```php
<?php
require_once '../includes/config.php';
require_once '../includes/auth.php';
require_login();

$page_title = "Liste des paiements";
include_once '../includes/header.php';

$paiements = [];
$search_query = trim($_GET['search'] ?? '');
$error_nif = false;

if ($search_query !== '') {
    if (preg_match('/^\d{10}$/', $search_query)) {
        $search_param = $search_query;
        try {
            $stmt = $pdo->prepare("
                SELECT p.*, c.nom, c.prenom, c.nif
                FROM paiements p
                JOIN clients c ON p.id_client = c.id_client
                WHERE c.nif = :search
                ORDER BY p.date_paiement DESC
            ");
            $stmt->execute([':search' => $search_param]);
            $paiements = $stmt->fetchAll(PDO::FETCH_OBJ);
        } catch (PDOException $e) {
            echo "<p class='error-message'>Erreur : " . htmlspecialchars($e->getMessage()) . "</p>";
        }
    } else {
        $error_nif = true;
    }
} else {
    try {
        $stmt = $pdo->query("
            SELECT p.*, c.nom, c.prenom, c.nif
            FROM paiements p
            JOIN clients c ON p.id_client = c.id_client
            ORDER BY p.date_paiement DESC
        ");
        $paiements = $stmt->fetchAll(PDO::FETCH_OBJ);
    } catch (PDOException $e) { /* ... */ }
}
```

### 5.2 `clients/liste.php` — recherche NIF 10 chiffres (Annexe, image 2)

```php
<?php
require_once '../includes/config.php';
require_once '../includes/auth.php';
require_login();

$page_title = "Liste des clients";
include_once '../includes/header.php';

$clients = [];
$search_query = trim($_GET['search'] ?? '');
$error_nif = false;

if ($search_query !== '') {
    // Valider le NIF (doit être exactement 10 chiffres)
    if (preg_match('/^\d{10}$/', $search_query)) {
        // Requête sécurisée
        $search_param = $search_query; // on recherche exactement ce NIF, pas LIKE
        try {
            $stmt = $pdo->prepare("SELECT * FROM clients WHERE nif = :search ORDER BY nom ASC");
            $stmt->execute([':search' => $search_param]);
            $clients = $stmt->fetchAll(PDO::FETCH_OBJ);
        } catch (PDOException $e) {
            echo "<p class='error-message'>Erreur : " . htmlspecialchars($e->getMessage()) . "</p>";
        }
    } else {
        $error_nif = true; // NIF invalide
    }
} else {
    // Pas de recherche : afficher tous les clients
    try {
        $stmt = $pdo->query("SELECT * FROM clients ORDER BY nom ASC");
        $clients = $stmt->fetchAll(PDO::FETCH_OBJ);
    } catch (PDOException $e) { /* ... */ }
}
```

### 5.3 `dashboard.php` — statistiques et graphe 6 mois (Annexe, images 3-4)

```php
<?php
require '../includes/config.php';
require '../includes/auth.php';

require_login();

function e($string) {
    return htmlspecialchars($string, ENT_QUOTES, 'UTF-8');
}

try {
    $stmt_clients = $pdo->query("SELECT COUNT(*) AS total_clients FROM clients");
    $total_clients = (int)$stmt_clients->fetch()->total_clients;

    $stmt_paiements = $pdo->query("SELECT SUM(montant) AS total_paiements, COUNT(*) AS total_paiements_count FROM paiements");
    $paiements_data = $stmt_paiements->fetch();
    $total_paiements = (float)$paiements_data->total_paiements;
    $total_paiements_count = (int)$paiements_data->total_paiements_count;

    $stmt_chart = $pdo->prepare("
        SELECT DATE_FORMAT(date_paiement, '%Y-%m') AS mois,
               COUNT(*) AS nb_paiements,
               SUM(montant) AS total_montant
        FROM paiements
        WHERE date_paiement >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        GROUP BY mois
        ORDER BY mois ASC
    ");
    $stmt_chart->execute();
    $paiements_par_mois = $stmt_chart->fetchAll(PDO::FETCH_ASSOC);

} catch (PDOException $e) {
    $total_clients = 'N/A';
    $total_paiements = 'N/A';
    $total_paiements_count = 'N/A';
    $paiements_par_mois = [];
    error_log("Erreur base de données : " . $e->getMessage());
}
```

### 5.4 Autres indices techniques cités dans le corps du texte
- Création de la base : « Création d'une base de données nommée `payfiscal_db` via
  **phpMyAdmin** » (§ 8.2) — **aucun script SQL n'est fourni**.
- Statut du paiement : `enum('Payé','En attente')` (§ 6.1, Tableau 6.1).
- Génération d'un **reçu en PDF** après validation (§ 9.3.3) — bibliothèque **non précisée**.
- « tests unitaires et fonctionnels » annoncés en S7 du planning — **aucun cas de test,
  aucune exécution, aucun résultat** dans le mémoire.
- **Aucun extrait de code n'apparaît dans le corps du mémoire** : le code n'existe que dans
  l'Annexe (captures d'écran).

---

## 6. Bibliographie et sources

*(Source : « Bibliographie », p. 59 — 10 références)*

1. Monsieur RAZAFINIMARO Tsimiala Toky Arisetra Eddy, 2023. *Support de cours MySQL.* Fianarantsoa.
2. Monsieur Bakari M., 2022. *Cours de Système d'information.* Fianarantsoa.
3. Mme Hobiniaina R. *Support de cours de Théorie et Application de Base de données.* Fianarantsoa.
4. *Utilisation de XAMPP* — https://www.bdumas.fr/TUTORIAL/xampp.htm
5. Mme RASOAMALALAVAO Claire, année 2022-2023. *Support de cours de technique d'expression et de communication.*
6. Mr Hery Antenaina, année 2022-2023. *Support de cours PHP/MySQL.* Fianarantsoa.
7. *Comparaison SGBD* — https://www.guidescomparatifs.com/type/infographies/comparatif-des-bases-de-donnees/
8. *Documentation PHP* — https://www.php.net/docs.php
9. *Tutoriels PHP/MySQL (OpenClassrooms)* — https://openclassrooms.com/fr/courses/6175841-initiez-vous-a-php-pour-le-web
10. *Tutoriels XAMPP et Apache* — https://www.apachefriends.org/fr/index.html

**Observations :** aucun ouvrage MERISE alors que la méthode occupe 5 pages ; aucun site
DGI/DGES ou texte légal (Code général des impôts, loi 017-2014/01 sur les données
personnelles) alors que l'institution est centrale ; 3 des 6 supports de cours n'ont pas de
date ; format des références hétérogène (« Monsieur/Mr/Mme » + année dans le corps) ;
**aucune citation en note** dans le texte.

---

## 7. Style rédactionnel

*(Source : l'ensemble du document)*

- **Personne :** **« nous »** de majesté / collectif pour tout le mémoire
  (« nous tenons à adresser », « nous avons choisi de centrer notre recherche »,
  « notre stage », « notre système »), sauf l'Annexe (code). Pronom « je » une seule fois
  (« qui m'a accepté de suivre le stage »).
- **Ton :** institutionnel/déclaratif, peu argumenté. Formules récurrentes :
  - « **Voici** la figure/l'image/tableau … » ;
  - « **Il est chargé de** … » (8 occurrences pour les fiches de poste) ;
  - « **L'objectif est de** … », « Ce projet a pour but de … » ;
  - « **Définition :** … » introduisant chaque sous-section (6.3.1, 6.4.1, 6.5.1, 6.6.1, 6.8.1) ;
  - « **L'étape suivante consiste à** … », « Ainsi, … », « En effet, … », « Par ailleurs, … » ;
  - « non précisé » n'existe pas : tout est affirmé sans précaution ni source.
- **Longueur des paragraphes :**
  - Partie I : paragraphes **très longs** (100 à 250 mots ; la « Mission de la DRI »
    est un seul paragraphe de ~160 mots en enchaînement d'infinitifs) ;
  - Partie II (chap. 4) : paragraphes moyens (40-80 mots) souvent suivis de listes à puces ;
  - Chapitres 5 à 9 : paragraphes **très courts** (1-3 lignes) quasi systématiquement
    suivis d'une liste ou d'une image — le texte ressemble à des **notes de présentation**.
- **Structure type d'une section :** Titre → « Définition » (souvent recopiée d'un support de
  cours) → liste à puces → figure/tableau. Peu d'analyse propre, peu de mise en relation avec
  le cas PayFiscal.
- **Référencement des figures :** « Voici la figure 6.1 nous montre la MCD » ; légendes en
  gras souligné sous l'image ; renvois dans le texte rares (« représentée par la figure
  suivante », « nous allons voir dans la figure 4 »).
- **Vocabulaire :** oscillation permanente **client / contribuable / usager**, **caissier /
  agent / postier**, **DGI / DRI / Centre Fiscal A**, **DAII / DA2I / D.A.I.I**.
- **Longueur totale :** 10 646 mots / 79 pages, dont ~54 % de présentation institutionnelle.
- **Anglicismes / anglicismes techniques :** « dispatching », « workflow » absent,
  « CRUD » utilisé sans développement dans le planning, « module » au sens « écran ».

---

---

# ÉTAPE 3 — AUDIT CRITIQUE

> Toutes les erreurs et incohérences relevées, avec la localisation d'origine.

## A. Incohérences de contenu

| # | Localisation | Constat |
|---|---|---|
| A1 | **Page de garde vs sujet** | La page de garde ne contient **aucun titre de sujet** : seulement « MÉMOIRE DE FIN DU CYCLE / Rapport du stage en vue de passage en 3 ème année ». Or le mémoire porte sur PayFiscal. De plus, « fin du cycle » est incohérent pour un rapport de **2ème année**. |
| A2 | **Avant-propos vs Introduction vs RÉSUMÉ** | **4 formulations différentes du sujet** : « Mise en place d'une applicatiob de gestion des paiements en ligne au sein de fianarantsoa : Centre Fiscal » / « … AU SEIN DE FIANARANTSOA : Centre Fiscal A » / « Conception et réalisation d'une application de gestion et de paiement fiscal en ligne (PayFiscal) » / aucune (page de garde). |
| A3 | **REMERCIEMENTS (p. II)** | Les remerciements **remercient l'entreprise HAPI-TECH** (« MADAME RAOELSON RALAIVAOARISOA Manassé Larissa Directrice général de l'entreprise HAPI-TECH qui m'a accepté de suivre le stage au sein de sa propriété », « Mr Maoris Raoelson, mon encadreur pendant ma période de stage »). Le stage est au **Centre Fiscal A**. Texte **copié d'un autre rapport** (ou stage non déclaré). |
| A4 | **§ 3.3 Planning, Semaine 5** | « Développement du **module commande** » : il n'y a ni commande ni produit dans PayFiscal. Élément **copié d'un projet de gestion commerciale**. Le module correspondant devrait être « module paiement / encaissement ». |
| A5 | **§ 6.8.3 Règles d'organisation RO1-RO5** | 5 règles entières portent sur **la procuration** (« nom du mandataire, nom du mandant, code postal, ville, pays, numéro de procuration, date d'expiration », statuts « Active / Expirée / En attente »). **Aucun rapport avec le paiement fiscal.** Copié d'un autre projet (probablement un projet de mandat/procuration). |
| A6 | **GLOSSAIRE (p. VIII)** | Cite **Java Swing** (« Framework graphique pour créer des interfaces utilisateur en Java (applications desktop) ») — Java et Swing **ne sont pas utilisés** dans PayFiscal (PHP/MySQL). Cite **Procuration** — concept hors sujet. Le glossaire ne définit ni NIF, ni DGI/DRI, ni CF, ni quittance, ni reçu, ni PDO, ni XAMPP. |
| A7 | **Figure « Graphe des flux du système » (§ 6.5, p. 47)** | L'image est un schéma **3 nodes CLIENT / PAIEMENT / REÇU** portant **à l'intérieur de l'image** le titre « **6.4.3. Modèle Logique de l'Application** » et le sous-titre « **frontend: React, backend: Laravel / base de données: MySQL** », avec les mentions « REÇU (généré par **Laravel Notifications**) » et « PAIEMENT (contrôleur **DeclarationController**) ». **Ni React, ni Laravel, ni DeclarationController dans PayFiscal.** Figure **importée d'un autre projet** (alt text : « ChatGPT Image 25 août 2025 »). |
| A8 | **Acteurs : 4 codages différents** | § 5.1 et § 6.5 : *Administrateur / Client / Caissier* ; § 9.1-9.2 : *administrateur / agent / contribuable* ; figure MCTA (§ 6.7) : *CLIENT / POSTIER* ; capture d'écran (§ 9.1) : *admin*. Aucune table des rôles/permissions. |
| A9 | **Terminologie client vs contribuable** | Le MCD/MLD et le code utilisent **`client`** (table `clients`, `id_client`, « liste des clients »), tandis que le chapitre 9 et l'interface parlent de **contribuable** (« Liste des contribuables », « Enregistrement d'un contribuable »). Aucune justification ni synonymie. |
| A10 | **§ 5.1 Besoins vs § 9 Fonctionnalités** | Les besoins décrivent un CRUD **clients** (nom, prénom, adresse, contact, email) et **aucun impôt** ; l'interface ajoute **NIF + impôt concerné** ; le dictionnaire de données **n'a pas de `nif`** alors que le MLD l'a. Le cahier des charges, le dictionnaire et l'application ne concordent pas. |
| A11 | **§ 6.2 Règles de gestion** | 5 règles seulement, toutes **génériques** (aucune ne parle d'impôt, de NIF, d'échéance, de nature d'impôt, d'arriéré, d'exonération). Pourtant le § 6.6 renvoie aux « règles fiscales » et le MCTA évoque « déclaration ». |
| A12 | **§ 6.8 MOT** | Le MOT est **défini mais jamais construit** : aucun tableau (Durée/Lieu/Responsables/Ressources) n'est rempli pour PayFiscal. Idem pour le MCC et le MOpT. |
| A13 | **§ 7.1 SGBD** | Le titre annoncé est « **Comparaison de MySQL et PostgreSQL** » (liste des tableaux), le tableau réel n'a **que la colonne MySQL** : il n'y a donc **pas de comparaison**, donc pas de justification du choix. |
| A14 | **Introduction (p. 1)** | « l'ouvrage s'articule autour de trois grandes sections » → annonce 3 parties, or la table des matières contient **« Partie II » deux fois** (p. 35 et p. 40). |
| A15 | **Avant-propos (p. I)** | « les étudiants doivent rédiger un rapport de stage en deuxième année, en troisième année et en **cinquième année** » — le cycle Licence EMIT est en 3 ans : la « cinquième année » est **non justifiée** (ou erreur). |
| A16 | **§ 1.2.3 Mention RPM** | « ● Communication Multimédia (CM) **Grade de Licence** / ● Communication Multimédia (CM) / ● Relations Publiques … (RPCO) **Grade de Master** » → doublon « CM » et grades **désalignés**. |
| A17 | **§ 1.4.1 / Figure 1.5** | « - Système d'Information, **Géomantique** et Décision **Internet/Intrane** » : titre du parcours **SIGD** fautivement collé avec « Internet/Intranet » (du parcours DA2I). |
| A18 | **Sigles DAII / DA2I / D.A.I.I** | Page de garde : « D.A.I.I » ; liste des abréviations : « DA2I : Développement d'Application Internet/Intranet » ; figures : « Parcours de licence **DAII** » ; § 1.2.2 : « DA2I ». Quatre graphies. |
| A19 | **§ 2.1.2 vs intitulé** | L'historique décrit la **DRI/HM** (Haute Matsiatra, Amoron'i Mania, Ihorombe) et le **SRE**, alors que le stage est au **Centre Fiscal A de Fianarantsoa** : la présentation propre du CF A est noyée dans 12 pages de description régionale ; aucun effectif, aucun chiffre d'activité du CF A. |
| A20 | **§ 9 vs Conclusion** | La Conclusion affirme que « les citoyens peuvent consulter leurs informations fiscales, **effectuer leurs paiements en ligne** » : l'application montrée est un **outil de saisie interne en local (XAMPP)** sans paiement en ligne ni intégration mobile money (l'intégration MVola/Orange Money/Airtel Money est seulement annoncée comme « perspective »). **Écart titre/réalisation.** |
| A21 | **§ 8.2** | Toute la section « Connexion à la base de données » tient en **une phrase** : « Création d'une base de données nommée payfiscal_db via phpMyAdmin ». |
| A22 | **GLOSSAIRE / Table des matières** | Le glossaire et les listes contiennent des entrées **jamais utilisées dans le texte** (Java Swing, Procuration, MD/Management Décisionnel, RPCO, M2I, CM) alors que le vocabulaire fiscal essentiel n'est pas défini. |

## B. Erreurs de structure et de numérotation

| # | Localisation | Constat |
|---|---|---|
| B1 | Chapitres | **« Chapitre 2 » apparaît deux fois** : « Chapitre 2 : Présentation de l'Entreprise d'actuel » (p. 21) et « Chapitre 2 : Présentation du Projet » (p. 33, sections numérotées **3.1, 3.2, 3.3**). **Aucun « Chapitre 3 »** n'existe. Le numéro du chapitre ne correspond pas au préfixe des sections. |
| B2 | Parties | **« Partie II : ANALYSE ET CONCEPTION DU PROJET » apparaît deux fois** (p. 35 avec le chapitre 4, et p. 40 avec les chapitres 5 et 6). Deux titres de partie identiques dans la table des matières. |
| B3 | § 2.1.x | Numérotation **en double et désordonnée** : « **2.1.3** Organigramme de la DRI/HM » (avant 2.1.4.x) puis « **2.1.3 : Objectifs principaux** » et « **2.1.4 : Les principaux rôles de la DGI** » placés **après** « 2.1.4.13 Centre Fiscale ». |
| B4 | Table des matières | Entrées **incomplètes** : seules 78 lignes sur ~120 titres ; les chapitres 1, 2, 3, 7, 8, 9 et les sections 1.1, 1.2, 1.4-1.7, 1.9, 1.11, 1.13, 1.14, 4.1, 5.1, 7.1, 8.1, 8.2, 9.1, 9.2 sont **absentes**. |
| B5 | Table des matières | Faute de frappe dans la ligne de connexion : « LISTES DES ABRÉVIATIONS .....................**;**............VII ». |
| B6 | Pagination | La page **VI manque** dans les folios romains (V → VII). |
| B7 | Listes de figures | **Figure 1.8 et Figure 1.9 en double** dans la liste (« 1.8 Parcours de Licence DA2I » puis « 1.8 Organigramme de personnels » ; idem 1.9). |
| B8 | Listes de figures vs corps | **La liste et les légendes du corps ne correspondent pas** : la liste annonce « 1.4 Licence PRM / 1.5 Master RPM / 1.6 Licence DA2I / 1.7 Master DA2I / 1.8 Master SIGD / 1.9 Master M2I » alors que le corps légende « 1.4 licence RPM / 1.5 licence DAII / 1.6 master SIGD / 1.7 master M2I » ; la liste a 17 entrées, le corps 13 figures + 3 figures « Figure 2/3/4 » **non listées**. |
| B9 | Chapitre 2 (figures) | Légendes **sans numéro de chapitre** : « Figure 2 : Structure de la Direction des Impôts », « Figure 3 : Organigramme de la DRI/HM », « Figure 4 : Organigramme du CF/HM » — à la place de Figure 2.1/2.2/2.3. |
| B10 | § 2.1.3 | Texte : « Nous allons voir dans la **figure 4** l'organigramme de la DRI/HM » → la légende qui suit est « **Figure 3** ». Renvoi faux. |
| B11 | Chapitre 6 (figures) | **Figure 6.2 en double** (« Relation avec des cardinalités (1,1) et (1,n) » p. 45 et « Graphe des flux du système » p. 47) ; **Figure 6.4 en double** (cardinalités avec attribut PP et « MCTA de l'application »). |
| B12 | Listes vs corps (ch. 6) | La liste annonce « Figure 6.5 Graphe des flux » et « Figure 6.6 MCT » + « Figure 6.6 MCTA » ; le corps a « Figure 6.2 » pour le graphe des flux, **aucune figure pour le MCT**, et « Figure 6.4 » pour le MCTA. |
| B13 | **§ 6.3.3 MCD** | « Voici la figure 6.1 nous montre la MCD de l'application. » + ligne « **Figure 6.1 : MCD du système** » → **aucune image n'est insérée** : le modèle conceptuel du projet est **absent** du mémoire. |
| B14 | § 4.2.3 | « représentée par la figure suivante » (Cycle d'abstraction) → suivent des **lignes de texte nues** (« Système d'Information Manuel / Expression des besoins / … ») : la **figure 4.1 n'existe pas**. |
| B15 | Listes des tableaux | « **Tableau 3.1 : Planification du projet** » annoncé → le planning est une **liste de 8 puces**, pas un tableau. Aucune ligne « Tableau 3.1 » dans le corps. |
| B16 | Tableau 5.1 | **Deux légendes pour un même tableau** : « Tableau 5.1 : Caractéristiques du matériel de développement » (avant) et « Tableau 5.1: Matériel utilisé à la réalisation » (après). |
| B17 | Tableau 7.1 | Légende du corps « **Tableau 7.1 : MySQL** » vs liste « Tableau 7.1 Comparaison de MySQL et PostgreSQL ». |
| B18 | Titres | **Niveaux de titres incohérents** : mêmes sections en gras simple, `#`, `##`, `###`, `####` ; « PARTIE I : PRESENTATION GENERALE » sans accents vs « Partie III : RÉALISATION DU PROJET » avec accents ; « Chapitre 1 : Présentation d'Ecole de Management et d'Innovation / Technologie (EMIT) » **coupé sur deux lignes**. |
| B19 | § 4.1 | Liste à puces **incomplète** : « la difficulté d'une maintenance efficace » est sans puce (« - » manquant) par rapport aux autres entrées. |
| B20 | Annexes / fin de document | Après le RÉSUMÉ, **une vingtaine de titres `##` vides** → **~14 pages blanches** (le fichier déclare 79 pages alors que le contenu utile s'arrête à la page 65). |
| B21 | Corps | **Numéros de page résiduels collés dans le texte** : « 1819 . » (fin § 1.12), « 3637 » (fin § 6.4.1) → artefacts de pagination recopiés. |
| B22 | § 4.2.5 MCC | Le paragraphe d'introduction du MCC est **recopié deux fois de suite** (« Cette modélisation est souvent oubliée … comme : » répété mot pour mot), avec au milieu un fragment perdu « Modèle physique / Système d'information automatisé ». |
| B23 | Listes des abréviations | Abréviations **mises en œuvre absentes** : DGI, DRI, CF, SRE, NIF, PDO, XAMPP, PDF, VS Code, RG3FN ; et **abréviations présentes mais inutilisées** : MD, RPCO, CM, M2I, CTE, CUFP, ENT, CIGSI. |

## C. Fautes d'orthographe et de grammaire (phrase → correction)

**Titres et parties liminaires**

1. « … au thème suivant : " Mise en place d'une **applicatiob** de gestion des paiements en ligne au sein de **fianarantsoa : Centre Fiscal** ", en utilisant **le direction genéral des impots** comme cadre de travail. » *(Avant-propos)*
   → « … **application** … au sein de **Fianarantsoa : Centre Fiscal A** », « en utilisant **la Direction Générale des Impôts** comme cadre de travail ».
2. « MADAME RAOELSON RALAIVAOARISOA Manassé Larissa **Directrice général** de l'entreprise HAPI-TECH qui m'a accepté de suivre le stage » *(Remerciements)*
   → « **Directrice générale** … **m'a acceptée à suivre** le stage ».
3. « … et **l'aide apporté** toute au long de cette période. » *(Remerciements)*
   → « … et **l'aide apportée** ».
4. « Figure 1.12 : **Organismes des publiques** » *(Liste)* / « **Organisme des publiques** » *(corps)*
   → « **Organigramme des organismes publics** ».
5. « LISTES DES ABRÉVIATIONS .....................**;**............VII » → supprimer le « ; ».
6. « **MOT : Modèle Organisationnel de Traitements** » *(liste)* vs « Modèle Organisationnel de **Traitement** » *(§ 6.8)* → s'aligner (« Traitement »).

**Présentation de l'EMIT (Chapitre 1)**

7. « … l'interaction des **Enseignants-Chercheurset** des étudiants **pourtoutes** recherches scientifiques et académiques **afind'atteindre** des résultats positifs »
   → « … **Enseignants-Chercheurs et** … **pour toutes** recherches … **afin d'atteindre** … ».
8. « **L'amélioration de leurs habilités** » *(§ 1.8)* → « **habiletés** » (ou « compétences »).
9. « Le club de danse … **dans des différents tournois** internes (inter-niveaux) **qu'externes** (inter-établissement). » → « **dans différents** tournois internes (inter-niveaux) **ainsi qu'externes** ».
10. « la construction **prompt** et durable de nombreuses écoles » *(§ 1.14)* → « **prompte** ».
11. « La première ECOLE 3D **implanté** à Madagascar a été construite » → « **implantée** ».
12. « servira de guide pour les constructions **future** » → « **futures** ».
13. « **Ceci étant**, les étudiants et les enseignants ont accès en illimité à des **trentaines de milliers** d'ouvrages » → « des **trentaines de milliers** » est fautif ici : « **des dizaines de milliers** » (ou « plusieurs dizaines »).
14. « **L'école est en train d'élargir** ses relations vis-à-vis des établissements à l'international afin d'accueillir des étudiants étrangers et de permettre à **ces jeunes** de se perfectionner » *(§ 1.5)* → « … à **nos étudiants** … » (ou reformuler : « …afin que nos étudiants puissent se perfectionner »).

**Présentation de l'entreprise (Chapitre 2)**

15. « Organisation du personnel au sein du **Centre Fical** » *(§ 2.1.4, titre, présent deux fois dont dans la table des matières)* → « **Centre Fiscal** ».
16. « Les personnels de la DRI/HM sont constitués **des plusieurs** agents » → « **de plusieurs** agents ».
17. « elle est **l'interlocuteur privilégié** du service central » → « **l'interlocutrice privilégiée** ».
18. « **La division des affaires générales sont chargées** d'élaborer » → « **est chargée** ».
19. « superviser et coordonner les actions des vérificateurs **places sous l'ordre** du DRI » → « **placés sous l'autorité** du DRI ».
20. « elle centralise les données statistiques **venant au SRE** et du CF » → « **venant du SRE** et des CF ».
21. « Il assure la réception et l'envoi des matériels … , **essayer bon de sortie** de ses matériels **au** détenteur effectif » → « **, établit un bon de sortie** de ces matériels **au profit du** détenteur effectif ».
22. « Le chauffeur est chargé d'assurer **tous déplacements** professionnels de la direction, entretien et la tenue du carnet d'entretien des véhicules … et **les courses urgents** au centre. » → « **tous les déplacements** … et **les courses urgentes** ».
23. « Le chef de Division recette effectue la gestion, le contrôle des recettes **est** le suivi des demandes de paiements échelonnés » → « **et** le suivi ».
24. « Il est entre autres **charger** de réceptionner les contribuables » → « **chargé** ».
25. « Il **est chargé de déceler** les erreurs … , **vérifié** par un examen approfondi de la comptabilité … **dans les déclarations souscrites2.1.3 : Objectifs principaux** » *(§ 2.1.4 d, texte + titre collés)* → « … **vérification** par un examen approfondi … dans les déclarations souscrites. » + titre « **2.1.3 Objectifs principaux** » sur sa propre ligne.
26. « Assurer une mobilisation optimale et sécurisée des recettes fiscales dans la **région de fianarantsoa , à travers la coordirnation , le contrôle et l'appui au service fiscaux** »
   → « … dans la **région de Fianarantsoa, à travers la coordination, le contrôle et l'appui aux services fiscaux** ».
27. « **Les services des Contributions Directes :** des impôts directs **à savoir** : Impôts sur les Revenus Salariaux et **Assimilé** (IRSA), **Impôt General** sur les Revenus Non Salariaux (IGRNS) » *(§ 2.1.1 et § 2.1.4, texte recopié 2 fois)*
   → « … et **assimilés** », « **Impôt général** ».
28. « **Les Services des Contributions Indirects :** du recouvrement des impôts indirects **à savoir** : les droits et taxes divers. Ces services focalisent leurs efforts dans les recouvrements des D.A sur les alcools et tabacs et leurs dérives. » → phrase sans verbe : « … sont chargés du recouvrement des impôts indirects, **à savoir** les droits et taxes divers ; leurs efforts portent sur les recouvrements des D.A sur les alcools et tabacs **et leurs dérivés** ».
29. « **La DGI est un objet d'étude car elle qui représente** l'autorité fiscale du pays » → « … **car elle représente** … ».
30. « En 1998, **la fusion suite de document** sur la réduction des pauvretés et améliorations de l'Etat comme Douane Frontière et Impôt Intérieur » → phrase incomplète/non grammaticale → « En 1998, **la fusion est intervenue dans le cadre** d'un document sur la réduction de la pauvreté et l'amélioration de l'État (douanes, frontière et impôts intérieurs) ».
31. « la compétence territoriale s'étend sur les trois Régions, **tel que** » → « **tels que** » (ou « à savoir »).
32. « et **le relevant** de sa compétence territoriale » → « et **relevant** ».
33. « L'application de l'impôt nécessite d'en **expliciter** le mécanisme » → « d'**en expliciter** » est lourd → « nécessite de **détailler** son mécanisme ».
34. « Le planton est chargé d'assurer l'envoi … , d'effectuer le **dispatching** du courrier » → « **d'acheminer/trier** le courrier ».

**Partie II (chapitres 4 à 6)**

35. « L'absence de conception globale d'un projet d'informatisation **nous fait apparus** comme : » *(§ 4.1)* → « **nous apparaît** comme suit : ».
36. « MERISE est une de ces méthodes, la plus répandue actuellement **et nous propose** plusieurs modèles. » → « … **qui nous propose** … ».
37. « **Les deux principales sociétés** ayant mis au point cette méthode **sont le CTI** (Centre Technologique de l'Équipement) **implantée** à Aix-en-Provence. » *(§ 4.2.1)* → phrase **incomplète et mal accordée** : « Les deux principales sociétés … **sont le CTI (…), implanté à Aix-en-Provence, et** [la seconde société est absente]. »
38. « L'objectif des méthodes d'études des systèmes d'information est de décrire **ses systèmes** à l'aide de modèles » *(§ 4.1)* → « **ces systèmes** ».
39. « Cette modélisation … est l'**une des modèles très important** pour comprendre l'idée générale du projet » *(§ 4.2.5)* → « **l'un des modèles très importants** ».
40. « voici quelques notions **qui doivent nous connaître** comme : » *(§ 4.2.5)* → « **qu'il nous faut connaître**, telles que : ».
41. « la couche logique reflète le choix, les moyens et les ressources humaines **a matérielles** » *(§ 4.3.2)* → « **et matérielles** ».
42. « Le MOpT … résume le MLD et le MPD à travers la fonction de mis à jour et de celle de la consultation. » *(§ 4.3.3)* → « … **les fonctions de mise à jour et de consultation** ».
43. « Le Modèle Conceptuel de Données est un document qui sert à décrire **de façons formelles et standardisées** » *(§ 6.3.1)* → « **de manière** formelle et standardisée ».
44. « Le nom de propriété est inscrit **à l'inscription** de l'entité. » *(§ 6.3.2.3)* → « est inscrit **à l'intérieur** de l'entité ».
45. « La propriété isolée se trouve dans des relations. » → « Une propriété **isolée** (non rattachée à une entité) se trouve dans **une** relation. »
46. « **Voici la figure 6.1 nous montre** la MCD de l'application. » *(§ 6.3.3)* → « **La figure 6.1 nous montre** … » (ou « Voici la figure 6.1 **qui** nous montre »).
47. « L'identifiant est une propriété d'un objet telle qu'il **n'existe pas deux occurrences** » *(§ 6.3.2.5)* → « … **qu'il n'existe pas deux** occurrences … » → mieux : « … telle **qu'aucune autre propriété** ne peut … » ; et « nous fait apparus » déjà cité.
48. « Le formalisme utilisé au niveau conceptuel est **reprisau** niveau organisationnel. » *(§ 6.5.1)* → « **repris au** niveau ».
49. « Un acteur est encore appelé INTERVENANT. » *(§ 6.5.1)* → « Un acteur est **également appelé** intervenant ».
50. « Le Modèle Conceptuel de Traitement (MCT) permet de décrire la dynamique du système d'information **fiscal**. » *(§ 6.6.1)* : présenté comme une définition **générale** MERISE mais **spécifiée « fiscal »** → hors structure (cf. B).
51. « Ces opérations sont **non interruptibles** : un paiement en cours ne peut être interrompu jusqu'à sa finalisation. » *(§ 6.6.4)* → « **non interruptibles** » n'est pas un terme MERISE → « **atomiques** » (ou supprimer).
52. « Le modèle organisationnel des traitements s'attache à décrire les propriétés des traitements **qui ne sont pas couvertes par le modèle conceptuel des données** » *(§ 6.8.1)* → « **… par le modèle conceptuel des traitements** ».
53. « Les règles d'émission traduisent les règles de gestion (R.G) et définissent les messages générés » *(§ 6.6.6)* → « **définissent** » est mal accordé au pluriel sujet-composé : « … et **définissent** » est acceptable, mais « traduisent … et définissent » doit être coordonné correctement → « traduisent … et **définissent** » (ok) ; à **remplacer** : « **TOUJOURS** : Toujours notifier l'administrateur » (pléonasme).

**Partie III (chapitres 7 à 9) et conclusion**

54. « **PHP 8.2** : langage de développement choisi pour l'implémentation côté serveur**..** » *(§ 8.1)* → supprimer le point doublé.
55. « Analyse des besoins **fonctionnelles** et techniques, rédaction du cahier des charges, **conceptions** de la base des données » *(§ 3.3, S2)* → « besoins **fonctionnels** … **conception** de la base ».
56. « Intégration des modules entre eux, mise en place de la **securité** » *(§ 3.3, S6)* → « **sécurité** ».
57. « début de développement du **module des clients (CRUD)** » *(S3)* + « **module commande** » *(S5)* → cf. A4.
58. « **Matériel utilisé :**\ Tableau 5.1 … » *(§ 5.2)* : la phrase « Outils logiciels : XAMPP, VS Code » se termine par « **Matériel utilisé :** » **sans ponctuation ni lien** → relier les deux paragraphes.
59. « L'étape suivante consiste à relier l'application PayFiscal à la base de données MySQL. - Création d'une base de données nommée payfiscal_db via phpMyAdmin. » *(§ 8.2)* → **aucun verbe de résultat**, section incomplète.
60. « L'application PayFiscal **se compose de plusieurs modules dédiés** à la gestion des paiements fiscaux. La partie **Administrateur** occupe une place centrale car elle permet : » *(§ 9.1)* → énumération sans lien logique (« car elle permet » renvoie à « la partie Administrateur » → « **qui** permet »).
61. « Chaque utilisateur (contribuable, agent, administrateur) doit s'authentifier avec son identifiant et mot de passe**.Voici l'image** : » *(§ 9.2)* → « … mot de passe**. Voici** l'image : » (espace manquant).
62. « En cas d'erreur de saisie, un message clair **s'affiche** : » + capture → « **un message d'erreur s'affiche** ».
63. « Une barre de recherche facilite la recherche par **numéro fiscal** . » *(§ 9.3.1)* → espace avant le point final.
64. « **Les citoyens** peuvent consulter leurs informations fiscales, effectuer leurs paiements en ligne et recevoir une confirmation instantanée » *(Conclusion)* → cf. A20 (écart avec la réalisation).
65. « Ce projet a donc permis de mettre en place un système automatisé et centralisé » → « **a permis de concevoir et de développer** » (le système n'est pas « mis en place » en production, cf. § 8 : déploiement local).
66. « **Monsieur/Bakari M.** 2022. Cours de Système d'information. » *(Bibliographie)* → « **BAKARI M.**, 2022. *Cours de systèmes d'information*, Fianarantsoa. » (respecter un format unique).
67. « **Mr** Hery Antenaina, année 2022-2023. » → « **M.** Hery Antenaina, 2022-2023. »
68. « Mme Hobiniaina R. Support de cours … » → **année absente**.
69. « Tutoriels XAMPP et Apache [https://www.apachefriends.org/fr/index.html]. » → pas de date de consultation ; idem pour les 3 autres références web.

**Fautes présentes dans les figures elles-mêmes**

70. Figure MCTA (§ 6.7) : « ENREGISTR**É**MENT DU PAIEMENT » → « ENREGISTREMENT » ;
    « MISE À JOUR **ÉFÉCTUÉE** » → « EFFECTUÉE » ; « **RÉSOILUE** » (×2) → « RÉSOLUE » ;
    « **POSTIER** » → « CAISSIER » (ou « POSTIER » n'existe pas ici) ;
    « AUTORISATION D**É** MODIFICATION » → « D' ».
71. Figure 4 « Organigramme du CF/HM » (§ 2.1.4.13) : « **Receiveur** » → « **Receveur** » ;
    « **Verificateur** » → « **Vérificateur** » ; « Chef de Division » répété sans distinction
    des trois divisions.
72. Figure « Graphe des flux » : mentions **React / Laravel / DeclarationController /
    Laravel Notifications** (cf. A7) — hors sujet.

## D. Parties trop longues / trop courtes

| Partie | Volume constaté | Verdict |
|---|---|---|
| **Chapitre 1 — Présentation de l'EMIT** (p. 2-20) | **~19 pages** : 14 sections, dont 6 clubs étudiants, la salle 3D, l'ENT, la bibliothèque, l'histoire de l'école | **Trop long** — ~29 % du mémoire utile consacré à l'école. Pour un mémoire de stage technique, 3 à 5 pages suffisent (historique, parcours, chiffres clés). |
| **Chapitre 2 — Présentation entreprise/DRI** (p. 21-32) | **~12 pages**, dont 13 fiches de poste génériques (planton, chauffeur, secrétaire…) et 2 pages dupliquées (« principaux rôles de la DGI » recopie intégralement § 2.1.1) | **Trop long et mal ciblé** — le Centre Fiscal A (lieu du stage) n'est jamais présenté isolément (effectif, guichets, CA traité). |
| **Chapitre 3/§ 3.x — Présentation du projet** | **~2 pages** (origine, objectif, planning) | **Trop court** — pas de périmètre fonctionnel, pas de contraintes, pas de parties prenantes, pas d'objectifs mesurables. |
| **Chapitre 4 — MERISE** (p. 35-39) | ~5 pages de **définitions reprises d'un support de cours** | Densité faible : 4 figures de démonstration pédagogique (cardinalités) au lieu de modèles du projet. |
| **Chapitre 5 — Analyse** (p. 40-41) | **2 pages** (5 lignes de besoins + 1 tableau matériel) | **Trop court** — pas d'analyse de l'existant, pas de diagnostic (FOR/FORFAIT), pas de faisabilité économique/organisationnelle, pas de contraintes. |
| **Chapitre 6 — Conception** (p. 42-51) | 10 pages, mais **MCD absent, MOT absent, MCC absent** | **Trop court sur l'essentiel** : les modèles du projet manquent alors que les définitions occupent la place. |
| **Chapitre 7 — Outils** | **1 page**, 1 tableau à 5 lignes | **Trop court** — pas de version, pas de justification comparée, pas de présentation de PHP/HTML/CSS/JS alors qu'ils sont utilisés. |
| **Chapitre 8 — Mise en œuvre** | **1 page**, 5 puces + 1 phrase | **Trop court** — pas d'installation détaillée, pas de script SQL, pas d'arborescence, pas de configuration. |
| **Chapitre 9 — Application** | **4 pages** (6 captures) | Correct en volume mais **aucune explication fonctionnelle** : 1-2 lignes par écran, aucune légende numérotée, aucun parcours utilisateur. |
| **Tests / résultats / limites** | **quasi absents** : « tests unitaires et fonctionnels » (1 puce, S7), aucune section « Tests », aucun « Bilan / Résultats », aucun « Limites », aucun « Perspectives » chapitré | **Critique** — c'est le point faible majeur pour une soutenance. |
| **Conclusion** | 1 page, 4 paragraphes, sans structure (pas de bilan chiffré, pas de difficultés résolues/non résolues, pas de perspectives numérotées) | **À renforcer**. |

## E. Manques techniques

| # | Manque | Détail |
|---|---|---|
| E1 | **Sécurité** | Aucun chapitre ni paragraphe structuré : pas de CSRF, pas de gestion de session/déconnexion documentée, pas de contrôle d'accès par rôle côté serveur, pas de HTTPS, pas de journal d'audit, pas de politique de mots de passe, pas de protection des données personnelles (NIF = donnée personnelle, **loi 017-2014/01** à Madagascar), pas de sauvegarde de la base. Seules 3 affirmations (bcrypt, auth, requêtes préparées) + le code de l'Annexe. |
| E2 | **Tests** | Aucune section de tests : pas de cas de test, pas de tableau de résultats (attendu/obtenu), pas de couverture, pas de test d'acceptation avec les agents du Centre Fiscal, pas de capture d'un test réussi/échoué. Les « tests unitaires et fonctionnels » du planning ne sont pas matérialisés. |
| E3 | **Déploiement** | « déploiement en local (XAMPP) » uniquement (S8). Pas de plan de mise en production, pas d'installation sur le poste du Centre Fiscal, pas de configuration serveur, pas de sauvegarde, pas de plan de formation des utilisateurs, pas de maintenance. |
| E4 | **Coûts** | **Aucune** donnée : pas de coût matériel, pas de coût logiciel, pas de temps-homme, pas de retour sur investissement, pas de comparaison avec une solution achetée. |
| E5 | **Base de données** | Pas de script `CREATE TABLE`, pas de capture de phpMyAdmin, pas de MPD, pas de contraintes (PK/FK/CHECK) détaillées, pas d'index, pas de jeu d'essai de données documenté. Le dictionnaire (13 champs) ne couvre pas `nif` ni `reference_unique`. |
| E6 | **Architecture / modèles complémentaires** | Pas de diagramme de cas d'utilisation UML (ni MERISE équivalent), pas de diagramme de classes, pas de maquettes (wireframes) annoncées au S3 mais absentes, pas de description des parcours/écrans de navigation. |
| E7 | **Existant et diagnostic** | Aucune description du système manuel actuel (registres, modèles de quittances, délais, volume de dossiers), aucun tableau avant/après, aucun indicateur d'amélioration mesuré. |
| E8 | **Gouvernance du projet** | Pas de budget, pas de planning visuel (Gantt), pas de liste des risques, pas d'organigramme de l'équipe projet, pas d'identification de l'encadreur **dans le mémoire** (le seul encadreur cité est celui d'HAPI-TECH, cf. A3), pas de dates de stage. |
| E9 | **Conformité institutionnelle** | Aucune référence au **Code général des impôts**, aux textes réglementaires, aux formulaires officiels ( bordereau, quittance, titre de perception), au système SI de la DGI existant, ni à l'interopérabilité possible avec le SI central. |
| E10 | **Éthique / données** | Aucune mention de données de test, d'anonymisation, de consentement des agents interrogés, de convention de stage ni d'autorisation de publication. |
| E11 | **Accessibilité / ergonomie** | Aucune évaluation (pas de test utilisateur, pas de grille d'ergonomie), alors que l'ergonomie est citée comme difficulté dans la Conclusion. |
| E12 | **Évolution** | Les perspectives (paiement mobile MVola/Orange/Airtel, ergonomie) sont évoquées en **une phrase de conclusion**, sans feuille de route. |

---

**Synthèse de l'audit :** le mémoire a un **socle méthodologique correct** (structure en
3 parties, MERISE décrite, MLD normalisé en 3FN, code réellement écrit, sécurité de base
visible dans le code, planning en 8 semaines) mais il souffre de **quatre défauts
bloquants** : (1) une **proportion déséquilibrée** de présentation institutionnelle (~54 %)
contre 9 % de réalisation ; (2) des **éléments copiés d'autres projets** (module commande,
règles de procuration, glossaire Java Swing, figure React/Laravel, remerciements HAPI-TECH) ;
(3) une **maîtrise éditoriale fragile** (deux « Chapitre 2 », deux « Partie II », figure MCD
absente, listes de figures non conformes, ~70 fautes) ; (4) l'**absence totale des sections
attendues en fin de mémoire** (tests, résultats, déploiement, coûts, limites).
