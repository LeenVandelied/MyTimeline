# Runbook — boucle E2E locale (Sprint 47)

> Établi le 2026-07-27 au démarrage du Sprint 47. **Invalide l'hypothèse du plan**
> (« stack down, non lançable en local, CI = seul gate »). La boucle locale tourne :
> **baseline 49/49 verte en 38 s**.
>
> À relire avant d'écrire la moindre spec : sans ces 4 réglages, la suite échoue
> avec des messages qui accusent la mauvaise cause.

## Piège #0 (Sprint 57, FU5) — le backend `:8080` lancé par `docker compose up` NE PORTE PAS le profil `e2e`

Symptôme : `forgot-password.spec.ts` et `reset-password-failures.spec.ts` échouent en local
(passent en CI) avec, dans les logs du fixture, `statut inattendu 401 sur
/api/test-support/password-reset-token`. Le message pointe déjà la cause : `E2eResetTokenController`
n'est enregistré QUE sous le profil Spring `e2e` (`@Profile("e2e")`) ; hors de ce profil le chemin
n'est servi par aucun controller et retombe sur `anyRequest().authenticated()` → 401.

Le piège : `docker compose up` (l'« orchestration dev en une commande », cf. en-tête de
`docker-compose.yml`) est le réflexe naturel pour lancer un backend local, et son service
`backend` par défaut pose `SPRING_PROFILES_ACTIVE=dev` **seul** — jamais `e2e`, jamais par
accident (voir `ProfileSafetyGuard` #283 : le profil `e2e` doit toujours être demandé
EXPLICITEMENT). Un backend démarré ainsi ne satisfera donc **jamais** ces 3 specs, quelle
que soit la qualité du code testé.

**Diagnostic rapide** — le profil `e2e` est-il actif sur le backend que vous ciblez :

```bash
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:8080/api/test-support/password-reset-token?email=x"
# 401 -> profil e2e ABSENT (dev seul, ex. docker compose up par défaut)
# 404 -> profil e2e actif, email inconnu/pas de token (comportement nominal)
```

**Deux recettes, choisir selon le contexte** (ne jamais redémarrer un backend partagé sans le
dire — un autre agent/process peut en dépendre) :

1. **Backend `java -jar` local** (§ "Démarrage" ci-dessous) — recette historique, valide,
   commande `SPRING_PROFILES_ACTIVE=dev,e2e ... java -jar ...` déjà correcte. Nécessite de
   posséder le port `:8080` (donc de ne PAS avoir de `docker compose up` déjà dessus).
2. **Service Docker Compose dédié `backend-e2e`** (ajouté Sprint 57 FU5) — n'entre jamais en
   conflit avec un `docker compose up` déjà en cours (port et DB séparés), donc utilisable même
   quand `:8080` sert déjà un autre agent/session :

   ```bash
   docker compose --profile e2e up -d backend-e2e   # démarre aussi postgres-e2e (dépendance)
   ```

   Backend E2E disponible sur `:8085` (`eventmanager_e2e` dédiée sur `:5435`, CORS `:3000`+`:3100`
   déjà couverts). Pointer le frontend E2E dessus : `E2E_API_PROXY_TARGET=http://localhost:8085`
   (au lieu de `:8080`) à l'étape "Frontend" ci-dessous. Ports/nom de DB personnalisables via
   `E2E_BACKEND_PORT` / `E2E_POSTGRES_PORT` (`.env` ou export shell) si `8085`/`5435` sont déjà
   pris. Ce service est **opt-in** (`profiles: ["e2e"]` dans `docker-compose.yml`) : absent de
   tout `docker compose up` sans argument, ne change rien au comportement par défaut.
   `ProfileSafetyGuard` (#283) reste le filet : aucune variable posée par ce service ne simule un
   marqueur d'environnement de production, donc aucun risque d'exposer `test-support` en prod via
   cette voie.

## Les 4 pièges (chacun a coûté un diagnostic)

| # | Piège | Symptôme trompeur | Réglage |
|---|---|---|---|
| 1 | `:3000` est squatté par le `next-server` d'un **autre projet** (v16.2.11 ; MyTimeline est en Next 15) | `reuseExistingServer: true` fait tourner la suite contre la **mauvaise app**, sans aucun avertissement | Frontend sur `:3100` + `PLAYWRIGHT_BASE_URL` (qui désactive aussi le `webServer` Playwright) |
| 2 | Le profil `dev` fige `app.cors.allowed-origins=http://localhost:3000` (pas de placeholder d'env) | `403 Invalid CORS request` sur `POST /api/auth/register` → l'app **reste** sur `/fr/register` → `auth.setup.ts` accuse un « rate-limit register 5/min/IP » **qui n'a pas lieu** | Override en argument de lancement : `--app.cors.allowed-origins=http://localhost:3000,http://localhost:3100` |
| 3 | Base `eventmanager` figée à V6 avec des lignes `events` incompatibles | `V7__design_v3_schema.sql` échoue : `events_recurrence_unit_check`. (V9 « neutralize invalid recurrence unit » nettoie ces données — mais V7 s'exécute **avant** V9, donc la reprise à froid est impossible sur cette base) | Utiliser la base dédiée **`eventmanager_e2e`** (déjà provisionnée, migrée V15). **Ne pas toucher à `eventmanager`.** |
| 4 | En local, workers > 1 | 4 specs `settings-*` rouges : `toHaveValue` attend `sh<A>`, reçoit `sh<B>`. **DEUX causes possibles pour cette seule signature** — (a) identités figées au scope module (corrigé #469, S65), (b) **deux runs Playwright simultanés dans ce worktree**, qui partagent `e2e/.auth/` (identités ET cookies). Rien à voir avec le code testé dans les deux cas | Lire les lignes `[e2e] identités — worker N (pid …)` du log : graines identiques ⇒ cause (b), un seul run à la fois (un verrou refuse désormais le second). `workers: 2` en local est **VALIDÉ** (S65) : 2 runs complets consécutifs, 232 passed / 0 failed / 8 skipped, 3 min 59 et 3 min 11, un seul bloc `Running` par log. Ne PLUS ajouter `--workers=1` par réflexe. ⚠ La CI reste à 1 : le parallélisme n'y est **pas** démontré (une seule IP, budget `register` au plafond) |

## Démarrage

### 1. Backend (`:8080`)

```bash
cd backend && SKIP_DELEGATION=1 ./mvnw --batch-mode --no-transfer-progress -DskipTests package
```

```bash
cd backend && SPRING_PROFILES_ACTIVE=dev,e2e DB_URL=jdbc:postgresql://localhost:5432/eventmanager_e2e DB_USERNAME=eventuser DB_PASSWORD=motdepasse_dev_local RATE_LIMIT_ENABLED=false java -jar target/eventmanager-0.0.1-SNAPSHOT.jar --app.cors.allowed-origins=http://localhost:3000,http://localhost:3100
```

> ⚠ **Corrigé au Sprint 50** : `JWT_SECRET` (HS256) **n'existe plus** depuis #323 — la ligne
> d'origine le posait encore, sans effet (Spring ignore une variable inconnue, l'auth marchait
> quand même via la paire éphémère). L'auth signe désormais en **RS256** : sans variable, le
> backend génère une paire ÉPHÉMÈRE au boot et **journalise la clé publique**. Pour exercer la
> vérification de signature du middleware Edge, il faut une paire APPAIRÉE
> (`JWT_PRIVATE_KEY` côté backend + `AUTH_JWT_PUBLIC_KEY` côté frontend) : recette complète en
> tête de `frontend/e2e/auth-signature.spec.ts`.

Prêt quand `GET http://localhost:8080/api/auth/me` renvoie **401** (et non `000`).

### 2. Frontend (`:3100`)

```bash
cd frontend && NEXT_PUBLIC_API_URL=/api E2E_API_PROXY_TARGET=http://localhost:8080 npm run dev -- -p 3100
```

Prêt quand `GET http://localhost:3100/api/auth/me` renvoie **401** — ce qui prouve que le
proxy `/api/*` atteint réellement le backend (et pas seulement que Next répond).

### 3. Lancer les specs

```bash
cd frontend && SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 npx playwright test <fichier.spec.ts> --reporter=line
```

`SKIP_DELEGATION=1` est requis : le hook `warn-test-delegation.sh` bloque `npx playwright test` sans lui.

## Pourquoi `/api` et pas `:8080` en direct

Le cookie `jwt` est `SameSite=Lax` : un POST cross-port (`:3100` → `:8080`) ne l'enverrait pas
→ 401 sur toute création produit/événement. Tout passe donc par le proxy Next (même origine),
exactement comme en CI.

## Instabilités du serveur de dev (constatées en cours de sprint, pas au démarrage)

Ces deux modes de défaillance ont coûté des runs rouges qui **n'avaient rien à voir avec le code testé**.

### 1. `npm run build` et `build-storybook` TUENT le `next dev` en cours

Ils réécrivent `.next` sous les pieds du serveur, qui meurt sur :

```
ENOENT: no such file or directory, open '.../.next/static/development/_buildManifest.js.tmp.<hash>'
```

Sur un sprint où plusieurs agents partagent un working tree, c'est frappant : un agent lance un build,
et la suite E2E d'un autre agent tombe. **Séquencer** builds et runs E2E, ou relancer le `next dev`
après tout build.

### 2. Next 15.5.22 : 500 transitoire après recompilation à chaud

Le serveur de dev peut se mettre à renvoyer **500 sur `/fr/register`** après plusieurs recompilations
à chaud, avec dans son log :

```
InvariantError: Expected clientReferenceManifest to be defined
SyntaxError: Unexpected end of JSON input
```

C'est un bug de manifeste du serveur de dev, **pas le code applicatif**. Conséquence brutale :
`auth.setup.ts:47` échoue, **0 spec ne s'exécute**, et le message d'erreur ne dit rien de la vraie cause.

**Réflexe** : suite entièrement rouge dès le `setup` → `curl -s -o /dev/null -w "%{http_code}"
http://localhost:3100/fr/register`. Si c'est 500, **redémarrer le `next dev`** et relancer. Ne cherche
pas le bug dans la spec.

> ⚠ `auth.setup.ts` ne retente que sur un **429** (rate-limit register), pas sur un 500 de rendu.
> Un seul 500 transitoire tue donc tout le run. Follow-up ouvert (cf. `followups-lead.md`).

## Baseline au démarrage du sprint

`49 passed / 0 failed / 38 s` — commit `8d97edd` (= `origin/dev`).
Toute spec rouge après ça est imputable au sprint, pas à l'existant.

---

## Réglage n°5 — `NEXT_PUBLIC_API_URL` et `E2E_API_PROXY_TARGET` se posent au **`next build`** (ajout S58)

Les rewrites Next sont **sérialisés dans `routes-manifest.json` au build**. Les poser au `next start`
n'a **aucun effet**. Sans `NEXT_PUBLIC_API_URL=/api`, `apiClient` perd son préfixe et produit des
**404 invisibles** pour le watcher d'`auth.setup.ts` — qui accuse alors le rate-limit, le CORS ou un
409. Trois diagnostics faux, dans la même famille que le piège `Origin` du réglage n°1.

**Oracle de vérification, à faire avant de lancer la suite :**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3100/api/auth/me
# doit renvoyer 401 — un 404 signale que le préfixe /api est perdu, donc un build mal configuré
```

Configuration complète qui a donné **136 passed / 0 failed / 8 skipped** au Sprint 58 :

```
backend-e2e Docker :8086  sur la base eventmanager_e2e via postgres-e2e :5436
frontend :3100            (buildé AVEC NEXT_PUBLIC_API_URL=/api et E2E_API_PROXY_TARGET=8086)
CI=1                      (force workers=1 — cf. réglage n°5 historique, renuméroté n°6 ci-dessous)
PLAYWRIGHT_BASE_URL=http://localhost:3100
SKIP_DELEGATION=1         (devant un npx playwright test direct)
```

⚠ **Ce que ce réglage a coûté avant d'être compris** : un audit du Sprint 58 a rapporté
**5 échecs E2E**, dont 3 concentrés sur `timeline.spec.ts` — le fichier CSS le plus modifié du sprint,
et l'un des tests portait littéralement sur un label « qui dépend du contraste ». L'hypothèse d'une
régression était donc très plausible. Une ligne de base prise sur le commit de départ a montré que
**les 5 tests étaient verts sur la base ET sur `HEAD`**, en suite comme en isolation. Aucun correctif
n'était nécessaire, aucune spec n'a été touchée. Cf. `PIT-S58-003` et `PAT-S58-001`.

⚠ Le hook **RTK** tue `npx next dev|start` en ne laissant que « Errors: 1 » dans le log. Un log serveur
de 3 lignes est un artefact RTK, pas un plantage de l'app : passer par `rtk proxy`.

