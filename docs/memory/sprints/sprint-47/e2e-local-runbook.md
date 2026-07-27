# Runbook — boucle E2E locale (Sprint 47)

> Établi le 2026-07-27 au démarrage du Sprint 47. **Invalide l'hypothèse du plan**
> (« stack down, non lançable en local, CI = seul gate »). La boucle locale tourne :
> **baseline 49/49 verte en 38 s**.
>
> À relire avant d'écrire la moindre spec : sans ces 4 réglages, la suite échoue
> avec des messages qui accusent la mauvaise cause.

## Les 4 pièges (chacun a coûté un diagnostic)

| # | Piège | Symptôme trompeur | Réglage |
|---|---|---|---|
| 1 | `:3000` est squatté par le `next-server` d'un **autre projet** (v16.2.11 ; MyTimeline est en Next 15) | `reuseExistingServer: true` fait tourner la suite contre la **mauvaise app**, sans aucun avertissement | Frontend sur `:3100` + `PLAYWRIGHT_BASE_URL` (qui désactive aussi le `webServer` Playwright) |
| 2 | Le profil `dev` fige `app.cors.allowed-origins=http://localhost:3000` (pas de placeholder d'env) | `403 Invalid CORS request` sur `POST /api/auth/register` → l'app **reste** sur `/fr/register` → `auth.setup.ts` accuse un « rate-limit register 5/min/IP » **qui n'a pas lieu** | Override en argument de lancement : `--app.cors.allowed-origins=http://localhost:3000,http://localhost:3100` |
| 3 | Base `eventmanager` figée à V6 avec des lignes `events` incompatibles | `V7__design_v3_schema.sql` échoue : `events_recurrence_unit_check`. (V9 « neutralize invalid recurrence unit » nettoie ces données — mais V7 s'exécute **avant** V9, donc la reprise à froid est impossible sur cette base) | Utiliser la base dédiée **`eventmanager_e2e`** (déjà provisionnée, migrée V15). **Ne pas toucher à `eventmanager`.** |
| 4 | En local, workers > 1 | 4 specs `settings-*` rouges : `toHaveValue` attend `sh1763487562199`, reçoit `sh1763287562082` — deux **pid** différents ont généré chacun leur identité (`accounts.ts` §IDENTITÉS PARTAGÉES). Rien à voir avec le code testé | **Toujours `--workers=1`** en local (c'est déjà ce que fait la CI) |

## Démarrage

### 1. Backend (`:8080`)

```bash
cd backend && SKIP_DELEGATION=1 ./mvnw --batch-mode --no-transfer-progress -DskipTests package
```

```bash
cd backend && SPRING_PROFILES_ACTIVE=dev,e2e DB_URL=jdbc:postgresql://localhost:5432/eventmanager_e2e DB_USERNAME=eventuser DB_PASSWORD=motdepasse_dev_local JWT_SECRET=Q0lPbmx5SW5zZWN1cmVKd3RTZWNyZXRGb3JFMkVUZXN0c09ubHkwMTIzNDU2Nzg5 RATE_LIMIT_ENABLED=false java -jar target/eventmanager-0.0.1-SNAPSHOT.jar --app.cors.allowed-origins=http://localhost:3000,http://localhost:3100
```

Prêt quand `GET http://localhost:8080/api/auth/me` renvoie **401** (et non `000`).

### 2. Frontend (`:3100`)

```bash
cd frontend && NEXT_PUBLIC_API_URL=/api E2E_API_PROXY_TARGET=http://localhost:8080 npm run dev -- -p 3100
```

Prêt quand `GET http://localhost:3100/api/auth/me` renvoie **401** — ce qui prouve que le
proxy `/api/*` atteint réellement le backend (et pas seulement que Next répond).

### 3. Lancer les specs

```bash
cd frontend && SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 npx playwright test <fichier.spec.ts> --workers=1 --reporter=line
```

`SKIP_DELEGATION=1` est requis : le hook `warn-test-delegation.sh` bloque `npx playwright test` sans lui.

## Pourquoi `/api` et pas `:8080` en direct

Le cookie `jwt` est `SameSite=Lax` : un POST cross-port (`:3100` → `:8080`) ne l'enverrait pas
→ 401 sur toute création produit/événement. Tout passe donc par le proxy Next (même origine),
exactement comme en CI.

## Baseline au démarrage du sprint

`49 passed / 0 failed / 38 s` — commit `8d97edd` (= `origin/dev`).
Toute spec rouge après ça est imputable au sprint, pas à l'existant.
