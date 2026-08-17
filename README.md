# MyTimeline

Assistant d'organisation personnel. Vous déclarez des **produits** (véhicule, contrat
d'assurance, aliment, équipement médical…) et les **événements** qui leur sont rattachés
(échéance, renouvellement, contrôle). MyTimeline les restitue sur une **timeline** et un
**tableau de bord** des prochaines échéances.

Application web auto-hébergeable, conçue pour tourner **en local** : PostgreSQL, un backend
Spring Boot et un frontend Next.js, orchestrés par un seul `docker compose`.

## Écrans

| Route | Écran |
| --- | --- |
| `/fr` | Landing publique — présentation, fonctionnalités, témoignages |
| `/fr/register` · `/fr/login` | Création de compte · connexion |
| `/fr/forgot-password` · `/fr/reset-password` | Réinitialisation du mot de passe |
| `/fr/dashboard` | Tableau de bord — prochaines échéances, densité d'affichage réglable |
| `/fr/timeline` | Timeline — événements sur un axe temporel horizontal, zoom |
| `/fr/products` · `/fr/products/<id>` | Liste des produits · détail et événements d'un produit |
| `/fr/settings` | Réglages — profil, sécurité, préférences, compte, export RGPD |
| `/fr/privacy` · `/fr/terms` | Pages légales |

Le préfixe de locale est **obligatoire** (`localePrefix: 'always'`) : `/dashboard` sans locale
ne résout pas. `/` redirige en 307 vers `/fr`. Locales livrées : `fr` (pilote), `en`, `es`, `de`.

## Stack

| Couche | Techno (versions lues dans `backend/pom.xml` et `frontend/package.json`) |
| --- | --- |
| Backend | Java 21, Spring Boot 3.5.16, Spring Security, JWT **RS256** (JJWT), Flyway, Hibernate/JPA |
| Frontend | Next.js 15, React 18, TypeScript 5 strict, Tailwind CSS 4, Radix/shadcn, TanStack Query 5, next-intl |
| Base de données | PostgreSQL 16 (image `postgres:16`) |
| Tests | JUnit + Testcontainers (backend), Vitest + Testing Library (frontend), Playwright (E2E) |

Backend en architecture **hexagonale stricte** : `domain/` (modèles + ports, aucun import
Spring/JPA), `application/` (DTO, mappers, services), `infrastructure/` (entités JPA,
repositories, controllers, sécurité). Décisions d'architecture : [`docs/adr/`](docs/adr/).

## Démarrage

### Prérequis

- **Docker Engine + Compose v2**, et rien d'autre. Ni JDK ni Node ne sont nécessaires pour
  lancer l'application : tout est construit dans les images.
- Environ 3 Go d'espace disque et une connexion réseau pour le **premier** build (dépendances
  Maven et npm téléchargées à froid) — comptez plusieurs dizaines de minutes selon la machine.
  Les démarrages suivants prennent quelques secondes.
- Ports **3000**, **8080** et **5432** publiés sur l'hôte (voir « Pièges connus » pour 5432).

### La commande

```bash
docker compose up -d
```

C'est tout. `.env` est **facultatif** : `docker-compose.yml` embarque une valeur de
développement par défaut pour chaque variable, et la base est créée puis migrée (Flyway) au
premier démarrage. Pour changer un réglage (mot de passe de la base, clé de signature JWT,
URL de l'API) :

```bash
cp .env.example .env   # puis éditer ; .env est ignoré par git
```

[`.env.example`](.env.example) documente chaque variable, y compris celles qui n'ont **aucun**
défaut en production.

### Vérifier que la pile est prête

```bash
curl -s http://localhost:8080/actuator/health   # {"status":"UP"}
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/fr   # 200
```

Le backend attend que PostgreSQL soit `healthy` avant de démarrer (Flyway et
`ddl-auto=validate` exigent un schéma joignable) : comptez une bonne minute avant qu'il
réponde. `docker compose ps` reflète fidèlement l'état des trois services : les trois passent
`healthy` une fois la pile prête.

### Créer un premier compte

1. Ouvrir **<http://localhost:3000>** (redirigé vers `/fr`).
2. « Inscription » → <http://localhost:3000/fr/register> : nom (3 à 20 caractères), nom
   d'utilisateur (3 à 20), email, mot de passe (6 caractères minimum).
3. L'inscription redirige vers la connexion. Une fois connecté, vous arrivez sur le tableau de
   bord, où vous pourrez créer un premier produit puis ses événements.

Aucun compte n'est pré-créé et il n'existe **aucun jeu de données de démonstration** : la base
est vide au premier démarrage.

> ⚠ « Mot de passe oublié » ne vous enverra rien : aucun SMTP n'est configuré (le backend
> n'embarque pas d'expéditeur d'email et le token de réinitialisation ne sort pas du système).
> En local, un mot de passe perdu se rattrape en recréant un compte.

### Arrêter

```bash
docker compose down       # arrêt, données CONSERVÉES (volumes)
docker compose down -v    # arrêt + suppression de la base et des avatars
```

## Pièges connus

### 1. Le port 5432 quand un PostgreSQL tourne déjà sur la machine

`docker-compose.yml` publie `5432:5432` en dur. Le symptôme dépend de ce qu'écoute votre
PostgreSQL local :

- s'il écoute sur `0.0.0.0:5432`, le conteneur **refuse de démarrer** (`address already in use`) ;
- s'il n'écoute que sur `127.0.0.1` (cas typique d'un PostgreSQL Homebrew), **tout démarre sans
  la moindre erreur**, mais un `psql -h localhost -p 5432` depuis l'hôte atteint le PostgreSQL
  **de la machine**, pas celui du conteneur. Piège silencieux : vous inspectez la mauvaise base.

L'application n'est pas concernée : le backend joint la base par le réseau interne de Compose
(`postgres:5432`). La publication du port ne sert qu'à vous, depuis l'hôte. Pour la retirer sans
modifier le fichier versionné, créer un `docker-compose.override.yml` à la racine — il est
chargé automatiquement, et **il n'est pas dans `.gitignore` : ne le committez pas**.

```yaml
services:
  postgres:
    ports: !reset [] # ou ["5433:5432"] pour publier ailleurs
```

### 2. Sans `JWT_PRIVATE_KEY`, les sessions ne survivent pas à un redémarrage

`JWT_PRIVATE_KEY` est **vide par défaut** : ce dépôt est public, aucune clé n'y est écrite en
dur. Dans ce cas le backend génère une paire RSA **éphémère** à chaque démarrage et le
journalise explicitement :

```
WARN  JwtService : jwt.private-key (JWT_PRIVATE_KEY) non configurée : paire RS256 ÉPHÉMÈRE
      générée au démarrage. Tous les jetons émis seront invalidés au prochain redémarrage.
INFO  JwtService : Clé PUBLIQUE de vérification RS256 — valeur à poser dans AUTH_JWT_PUBLIC_KEY…
```

Conséquence : après un `docker compose restart`, tous les cookies de session émis avant sont
signés par une clé qui n'existe plus, donc **tout le monde est déconnecté**. C'est **voulu**,
ce n'est pas un bug — mais c'est déroutant la première fois.

Pour figer les sessions, générer une clé et la poser dans `.env` (recette complète, avec le
`tr -d '\n'` qui n'est pas cosmétique, en tête de `.env.example`) :

```bash
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out jwt.pem
openssl pkcs8 -topk8 -nocrypt -in jwt.pem -outform DER | base64 | tr -d '\n'
```

En profil `prod`, l'absence de cette variable fait **échouer le démarrage** : elle ne dégrade
jamais silencieusement.

### 3. E2E : le 403 CORS déguisé en « rate-limit », et `workers > 1`

- Le profil `dev` fige `app.cors.allowed-origins=http://localhost:3000`
  (`backend/src/main/resources/application-dev.properties`, aucun placeholder d'environnement).
  Un frontend servi sur un **autre** port — le runbook E2E utilise `:3100` pour ne pas se faire
  voler la place par le `next dev` d'un autre projet — reçoit un `403 Invalid CORS request` sur
  `POST /api/auth/register` : la page reste sur `/fr/register` et le setup Playwright accuse un
  « rate-limit register 5/min/IP » **qui n'a jamais eu lieu**. Correctif : démarrer le backend
  avec `--app.cors.allowed-origins=http://localhost:3000,http://localhost:3100`.
- **`--workers=1` est obligatoire en local.** Au-delà, quatre specs `settings-*` deviennent
  rouges : deux workers génèrent chacun leur identité de test et l'assertion `toHaveValue`
  compare deux identifiants différents. Rien à voir avec le code testé. (La CI est déjà en
  `workers: 1`.)

### 4. `node_modules` est propre à chaque copie de travail, et son absence ment sur la cause

Chaque worktree (`.claude/worktrees/…`) a **son propre** `frontend/node_modules` ; il n'est pas
partagé avec le dépôt principal. Deux conséquences, l'une gênante, l'autre trompeuse :

- Lancer `./scripts/test-quiet.sh frontend` depuis le dépôt principal **ne teste pas** le code du
  worktree, et inversement. Le script résout ses chemins depuis sa propre position, jamais depuis
  le répertoire courant — c'est donc le script appelé qui décide du code testé.
- Si les dépendances n'ont jamais été installées dans la copie testée, le symptôme brut était
  `Cannot find package 'eslint-plugin-storybook'` dans
  `frontend/src/__tests__/console-error-guard.test.ts`. Ce test charge la configuration ESLint
  **réelle** (`new ESLint().calculateConfigForFile`), donc exécute les imports de
  `frontend/eslint.config.mjs`. L'erreur se lit comme une régression de la garde anti-fuite de
  credentials `#160`/`#258` alors que seul l'environnement est en cause — le cas s'est produit
  deux fois, dont un rapport d'agent entièrement faux mais plausible.

`test-quiet.sh frontend` échoue désormais **avant** Vitest, en sortie 3, avec le répertoire testé,
la commande de correction et le rappel ci-dessus. Correctif : `( cd frontend && npm ci )` dans la
copie concernée.

L'**approvisionnement automatique** de `node_modules` dans les worktrees n'est pas traité : c'est
l'objet de l'issue #272. Le préflight se contente de nommer le problème au lieu de le déguiser.

Ce que le préflight **n'attrape pas** : il ne lit que les `import` **mono-ligne** de
`frontend/eslint.config.mjs`. Un import réparti sur plusieurs lignes, ou un `import()` dynamique,
passerait sous son radar — et le symptôme trompeur reviendrait tel quel. À garder en tête si un
futur plugin ESLint est ajouté autrement qu'en une ligne.

## Tests

Depuis la racine, [`scripts/test-quiet.sh`](scripts/test-quiet.sh) condense la sortie et ne
remonte que l'agrégat « Tests run » et le verdict ; en cas d'échec, le log complet est conservé
et son chemin affiché.

```bash
./scripts/test-quiet.sh backend    # JUnit + Testcontainers (Docker requis)
./scripts/test-quiet.sh frontend   # Vitest
./scripts/test-quiet.sh all        # backend puis frontend (E2E NON inclus)
./scripts/test-quiet.sh e2e        # Playwright (stack complète + navigateurs requis)
```

Équivalents directs, si vous préférez la sortie brute :

```bash
cd backend  && SKIP_DELEGATION=1 ./mvnw test
cd frontend && npm test            # Vitest
cd frontend && npm run typecheck   # tsc --noEmit
```

Avant de lancer la suite E2E, **lire** :

- [`docs/memory/sprints/sprint-47/e2e-local-runbook.md`](docs/memory/sprints/sprint-47/e2e-local-runbook.md)
  — les 4 réglages non devinables (frontend sur `:3100`, override CORS, base dédiée
  `eventmanager_e2e`, `--workers=1`) et les deux modes de défaillance du serveur de dev ;
- [`frontend/e2e/README.md`](frontend/e2e/README.md) — harnais de contrôle de contraste et de
  troncature des CTA.

`test-quiet.sh frontend` ne lance **que** Vitest — ni `build`, ni `typecheck`, ni `lint`, qui
s'appellent séparément (cf. équivalents directs ci-dessus). Il sort en **3**, avant Vitest, si les
dépendances de la copie testée sont absentes ou incomplètes (cf. piège 4).

La CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) rejoue les jobs `backend`,
`frontend`, `e2e`, `flyway-smoke`, `security`, `secret-scan` et `ai-env-packs` à chaque push.

## Mise en production

Non couverte ici, pour ne pas la dupliquer : voir
[`docs/runbook/deploiement-profils.md`](docs/runbook/deploiement-profils.md) — liste complète
des variables obligatoires du profil `prod`, garde-fous qui font échouer le démarrage, et ce qui
dégrade silencieusement la sécurité si une variable manque. Détails CORS / cookie / SameSite :
[`docs/runbook/cors-cookie-samesite.md`](docs/runbook/cors-cookie-samesite.md).

## Licence

**Aucune licence n'est déclarée** dans ce dépôt à ce jour : pas de fichier `LICENSE`, le bloc
`<licenses>` de `backend/pom.xml` est vide et `frontend/package.json` ne porte pas de champ
`license`. En l'absence de licence explicite, le code reste sous le droit d'auteur exclusif de
son auteur, même si le dépôt est public. À trancher avant toute réutilisation.
