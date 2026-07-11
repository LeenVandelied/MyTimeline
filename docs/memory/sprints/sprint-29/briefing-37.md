[BRIEFING ISSUE #37 — Sprint 29]

## ⚠ Contexte d'exécution (LIRE EN PREMIER)
- Tu travailles dans le dépôt principal : `cd /Users/herrh/VSProjects/MyTimeline`.
- Garde-fou HEAD : la branche courante DOIT être `claude/sprint-29-start-052110`.
  Vérifie `git rev-parse --abbrev-ref HEAD`. Si ce n'est pas cette branche → STOP, retourne STATUS: PARTIAL + BLOQUE_SUR="mauvaise branche".
- NE commit QUE sur cette branche. 1 seul commit logique gitmoji français à la fin.
- `docker compose` (v2) est dispo (Docker 29.2.1). `docker-compose` (v1) n'existe pas → utilise `docker compose`.
  ⚠ Le shell a un wrapper qui bloque `docker compose down -v` / `down --volumes` (protection DB). N'utilise JAMAIS `-v` sur down.

## Issue
[CHORE] Docker compose dev + Dockerfiles

Objectif : rendre le projet lançable en une commande via Docker. Créer les Dockerfiles backend + frontend, un docker-compose.yml (backend + frontend + postgres), les .dockerignore, et un .env.example documentant les variables. Aucune variable sensible en dur dans compose. `docker compose up` doit démarrer les 3 services ; backend health OK ; frontend sur :3000 ; postgres joignable par le backend ; `docker compose down` arrête proprement.

BR impactées : Aucune. Couche : infrastructure/devops uniquement (ne touche AUCUN code domaine/application, sauf l'ajout éventuel d'un endpoint health — voir plus bas).

## Plan d'implémentation (architect, /sprint plan)
```yaml
issue_37:
  fichiers_cles:
    - "docker-compose.yml"           # racine
    - "backend/Dockerfile"
    - "frontend/Dockerfile"
    - "backend/.dockerignore"
    - "frontend/.dockerignore"
    - ".env.example"                 # racine (documenter les vars)
  couches_touchees: ["infrastructure/devops"]
  strategie_test: "build local des 3 images + docker compose up smoke (backend health, frontend :3000, postgres ready). Pas de test unitaire."
  risque_regression: "faible — nouveaux fichiers isolés ; risque = divergence config env (ports, DB_URL) vs application-*.properties existant → ALIGNER sur les noms de variables réels (voir ci-dessous)."
  ordre_ecriture: ".dockerignore x2 → backend/Dockerfile (multi-stage mvnw) → frontend/Dockerfile (next build standalone) → docker-compose.yml → .env.example"
  zod_dto_sync: "NON"
```

## Faits vérifiés du dépôt (utilise-les, ne devine pas)

### Backend (Spring Boot 3.2.2, Java 21, build Maven via `./mvnw`)
Variables d'env réelles lues dans `backend/src/main/resources/application*.properties` :
- `SPRING_PROFILES_ACTIVE` (défaut `dev`) — en conteneur, viser `prod` ou `dev` selon usage. Le compose est **dev-first** (onboarding local) → `dev` est acceptable, mais NB : profil `prod` exige `CORS_ALLOWED_ORIGINS`, `JWT_SECRET`, `DB_PASSWORD` non vides.
- `DB_URL` (défaut `jdbc:postgresql://localhost:5432/eventmanager`) → dans compose ce sera `jdbc:postgresql://postgres:5432/eventmanager` (nom du service).
- `DB_USERNAME` (défaut `eventuser`), `DB_PASSWORD` (REQUIS, pas de défaut en base `application.properties`).
- `JWT_SECRET` (REQUIS en prod ; défaut dev insecure existe en profil dev).
- `STORAGE_AVATAR_PATH` (chemin fichiers avatars) → nécessite un **volume** monté pour persistance.
- Autres optionnels avec défauts : `COOKIE_SECURE`, `COOKIE_DOMAIN`, `RATE_LIMIT_ENABLED`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`.
- `spring.jpa.hibernate.ddl-auto=validate` sur TOUS les profils → le schéma doit exister au démarrage. Les migrations Flyway (`backend/src/main/resources/db/migration/`, head = V12) s'appliquent au boot. Donc le backend doit démarrer APRÈS que postgres soit `healthy` (utilise `depends_on: condition: service_healthy` + healthcheck postgres `pg_isready`).
- Port backend : 8080 (défaut Spring). L'API est servie sous `/api` (le contexte `/api` est le préfixe des controllers).
- **Health check** : il n'existe AUCUN endpoint health ni Spring Actuator dans le projet (vérifié : pas d'`actuator` dans `backend/pom.xml`, pas de HealthController). Deux options — choisis la plus simple et documente :
  (a) Ajouter la dépendance `spring-boot-starter-actuator` au `backend/pom.xml` et exposer `/actuator/health` (management endpoint) → healthcheck compose `curl -f http://localhost:8080/actuator/health`.
  (b) Ajouter un mini `HealthController` `GET /api/health` renvoyant 200. 
  Préfère (a) actuator (standard, borné). Garde le endpoint health PUBLIC (non authentifié) — vérifie la config Spring Security (`infrastructure/security` / `SecurityConfig`) pour whitelister `/actuator/health` ou `/api/health`, sinon le healthcheck recevra 401/403.

### Frontend (Next.js 15, npm)
- `frontend/next.config.mjs` : PAS de `output: 'standalone'` actuellement. Pour un Dockerfile optimal, ajoute `output: 'standalone'` à `nextConfig` (préserve le reste : `reactStrictMode`, `typescript`, `eslint`, rewrites conditionnels next-intl). Alternative sans standalone : image node qui fait `npm ci && npm run build && npm start` (plus lourde) — mais standalone est préférable.
- Scripts : `build` = `next build`, `start` = `next start`. Port 3000.
- `NEXT_PUBLIC_API_URL` est une var **PUBLIQUE bakée au build** (voir `frontend/src/services/apiClient.ts`). En compose dev, le navigateur (hôte) appelle le backend → mets `NEXT_PUBLIC_API_URL=http://localhost:8080/api` comme ARG de build. (Le service frontend ne parle PAS au backend en SSR ici, c'est le navigateur ; donc l'URL doit être joignable depuis l'hôte, pas depuis le réseau compose.)
- `frontend/.dockerignore` : exclure `node_modules`, `.next`, `.env*` (sauf si nécessaire), `*.log`, `.git`.

### Racine
- `.env` est déjà dans quelle situation ? Vérifie `.gitignore` racine : si `.env` n'y est pas, ajoute-le. `.env.example` (racine, COMMITÉ) doit documenter TOUTES les vars attendues par compose (DB_PASSWORD, JWT_SECRET, DB_USERNAME, POSTGRES_*, NEXT_PUBLIC_API_URL, etc.) avec des valeurs placeholder.
- `docker-compose.yml` : service `postgres` (image `postgres:16` ou proche, env `POSTGRES_DB=eventmanager`, `POSTGRES_USER`, `POSTGRES_PASSWORD` alignés sur `DB_USERNAME`/`DB_PASSWORD`, healthcheck `pg_isready`, volume nommé pour les données), `backend` (build `./backend`, `depends_on postgres healthy`, env DB_URL pointant `postgres`, volume pour avatars), `frontend` (build `./frontend` avec ARG `NEXT_PUBLIC_API_URL`, `depends_on backend`), réseau par défaut. Expose 3000, 8080, 5432.

## Contraintes
- Branche cible : `claude/sprint-29-start-052110` (déjà checkout). 1 commit logique gitmoji français (ex: `:whale: #37 conteneurisation dev — Dockerfiles + docker-compose + health`).
- Tests : pas de test unitaire pour de la config Docker. Fais un **smoke build** si possible : `docker compose build` (ou au moins `docker build` de chaque image) pour prouver que les Dockerfiles compilent. Si le build échoue pour une raison d'environnement (réseau, cache), documente-le clairement dans le retour — NE prétends PAS que ça marche si tu ne l'as pas vérifié.
- Si tu ajoutes actuator au pom : lance `./mvnw -q -pl . compile` (ou équivalent projet, cf. `./scripts/test-quiet.sh` si présent) pour vérifier que le backend compile toujours.
- Ne touche PAS aux fichiers hors scope Docker/health. Ne touche PAS aux migrations Flyway.

## Livrable attendu (format strict, MAX 500 tokens caveman)
RETOUR :
- commits: [SHA1]
- resume: fichiers créés + choix health (a/b) + choix standalone + vérifs réellement exécutées (build OK/KO/non-tenté avec raison)
- [MEMORY:*] signaux si pattern devops réutilisable
- recommandations suite: RECOMMAND_* ou pitfall (ex: si tu n'as PAS pu smoke-test, RECOMMAND_TEST_RUNNER manuel dev)
- STATUS: COMPLETED en dernière ligne (ou PARTIAL + BLOQUE_SUR)
