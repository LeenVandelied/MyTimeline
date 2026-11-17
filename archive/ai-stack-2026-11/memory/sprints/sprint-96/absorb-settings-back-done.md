# Sprint 96 — absorption tardive : `settings-back` à 44 px (suite #633)

GF-1 : répertoire `/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/amazing-rubin-93b16e`,
`git rev-parse --abbrev-ref HEAD` = `claude/sprint-96-start-b98611`.

## Objectif

Porter la seconde flèche retour de `/settings` (`settings-back`, `size="icon"` = 36 px) à une
cible tactile de 44x44 sous 1024 px, garder le bloc réservé de `loading.tsx` synchrone, et
poser une garde de géométrie E2E à tous les paliers où le bouton est peint.

## Fichiers modifiés

- `frontend/app/[locale]/(app)/settings/page.tsx` — `className="h-11 w-11 shrink-0 lg:hidden"`
  sur le `<Button size="icon">` (même gabarit que `MobileSettings.tsx:59`) + commentaire.
- `frontend/app/[locale]/(app)/settings/loading.tsx` — bloc réservé `h-9 w-9` → `h-11 w-11 shrink-0`,
  `data-testid="settings-back-placeholder"`, JSDoc (48 → 56 px de glissement évité).
- `frontend/app/[locale]/(app)/settings/loading.test.tsx` — 1 test : classes `h-11 w-11 lg:hidden`,
  pas de `h-9` (structure seule, jsdom).
- `frontend/e2e/settings-breakpoints.spec.ts` — helper `expectBackTouchTarget` (≥ 44x44 + boîte
  contenue dans `settings-header` : haut, bas, droite), appelé à 390, 768 (matrice), 767 et 1023
  (frontières) = tous les paliers testés où le retour est visible (PIT-S96-008).

Aucune modification de `ui/button.tsx` (hors périmètre, follow-up M arbitré).

## Mesures

Commande : `node scratchpad/measure.cjs` (Playwright chromium, `storageState` shared,
`getBoundingClientRect` de `settings-back`, `settings-header`, `h1`), contre `next build` +
`next start :3000`, backend conteneur `:8085`, oracle `/api/auth/me`=401 `/fr/login`=200.

| palier | AVANT (HEAD `d2660b22`) | APRÈS |
|---|---|---|
| 390 | back 36x36, header h=37.8, h1 à +48 px | back 44x44, header h=44, h1 à +56 px |
| 767 | 36x36, h=37.8 | 44x44, h=44 |
| 768 | 36x36, h=37.8 | 44x44, h=44 |
| 1023 | 36x36, h=37.8 | 44x44, h=44 |

`scrollWidth == clientWidth` aux 4 paliers, avant et après (aucun débordement horizontal).

tailwind-merge : mesuré, pas supposé. `className` rendu APRÈS = `… hover:bg-accent-soft h-11 w-11
shrink-0 lg:hidden` — `h-9 w-9` de `size="icon"` **retiré** de la chaîne par `cn()`.

Bloc réservé de `loading.tsx` : **géométrie non mesurée** (fallback Suspense transitoire). Synchro
des classes gardée par `loading.test.tsx` ; raisonnement : en-tête du fallback = max(44, 37.8) = 44
= en-tête de la page, h1 à +56 px des deux côtés → pas de saut. Non vérifié en navigateur.

## Contrôle négatif

Vrai code ancien, pas d'injection CSS : `page.tsx` remis à `HEAD` (`git show HEAD:…`), `next build`,
`next start`, nouvelle spec jouée :
`SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 rtk proxy npx playwright test e2e/settings-breakpoints.spec.ts --project=chromium`
→ **4 failed / 7 passed** : `settings-back : largeur 36px < 44px` à 390, 768, 1023 et 767 px ; les
2 paliers desktop (1024, 1280, retour masqué) et les 5 `setup` verts. Puis `page.tsx` restauré,
rebuild, restart, oracle réarmé → vert (ci-dessous).

## Tests

Liste grep : `/usr/bin/grep -rln "settings-back\|settings-header" frontend/e2e/` →
`settings-breakpoints.spec.ts`, `settings-mobile.spec.ts` (2 specs, toutes deux rejouées).

| campagne | résultat réel |
|---|---|
| code ANCIEN, `settings-breakpoints` (chromium) | 4 failed / 7 passed (contrôle négatif) |
| code NOUVEAU, 2 specs, `--project=chromium` | 13 passed / 0 failed |
| code NOUVEAU, 2 specs, tous projets | 13 passed / 0 failed (4.0 s) |

Détail run tous projets : `auth.setup` 5/0, `settings-breakpoints` 6/0, `settings-mobile` 2/0.
`git status --porcelain | /usr/bin/grep darwin` → vide (aucune capture macOS créée).

Portes :
- `./scripts/test-quiet.sh frontend-unit` → OK, 147 fichiers / 1877 tests passed.
- `npx next lint --file` (4 fichiers, via `rtk proxy`) → « ✔ No ESLint warnings or errors ».
- `./node_modules/.bin/tsc --noEmit -p .` → exit 0.
- `./node_modules/.bin/prettier --check .` (binaire direct) → « All matched files use Prettier code style! ».

Non joué : `./scripts/test-quiet.sh frontend` complet (le `next build` a été fait à la main,
2 fois, OK) ; suite E2E complète (seules les 2 specs citant la surface) ; Firefox/WebKit ;
CI Linux.

## État de la pile E2E

**DÉMONTÉE.** `next start` arrêté (`pkill`), `docker compose -p amazingrubin93b16e -f
docker-compose.yml --profile e2e down -v` : conteneurs `amazingrubin93b16e-*` aucun
(`docker ps -a`), volumes `postgres-e2e-data`/`avatars-e2e-data` et réseau supprimés, ports
3000/8085/5435 : 0 listener (`lsof`). Image `amazingrubin93b16e-backend-e2e:latest` CONSERVÉE.
Le `.next` sur disque = build du code NOUVEAU avec `NEXT_PUBLIC_API_URL=/api
E2E_API_PROXY_TARGET=http://localhost:8085`.

## Recommandations suite

Pas de `RECOMMAND_TEST_RUNNER`
Pas de `RECOMMAND_DB_EXPERT`

Follow-up déjà arbitré (non ouvert ici) : primitives shadcn `size="icon"` sous 44 px.

[MEMORY:pattern] Problem: garder un bouton shadcn `size="icon"` (36 px) à 44 px sans toucher la
primitive. Solution: `className="h-11 w-11 shrink-0"` — tailwind-merge retire `h-9 w-9` de la chaîne
rendue (mesuré) ; synchroniser le bloc réservé du `loading.tsx` voisin. Anti-pattern: agrandir le
bouton sans son placeholder de fallback (saut de mise en page au chargement).

STATUS: COMPLETED
