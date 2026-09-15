# Suites complètes — exécutées par le LEAD (pas de `test-runner` délégué)

> Réponse aux signaux `RECOMMAND_TEST_RUNNER` de #646 (« jouer `sprint-82-recurrence-capped-hint` une fois le `next dev`
> de #618 libéré ») et des corrections de revue (« faire rejouer `sprint-63-de-overflow-audit` par la CI Linux »).
> Sur ce dépôt l'exécution E2E n'est **jamais** déléguée à un sous-agent `test-runner` (quatre verdicts « E2E impossible »
> faux : S49 ×2, S51, S73 — PIT-S73-004). Le lead monte le harnais et lance la suite lui-même.

## Harnais monté par le lead (sans détruire la base semée par les agents)

- Backend e2e : image `s86e2e-backend-e2e` (bâtie ~35 h avant, **postérieure** au dernier commit backend du 2026-09-07 —
  aucun fichier backend dans le sprint), retaguée et lancée sur une pile **neuve** par run :
  `s86full` (`:8087`/`:5437`) pour le run 1, `s86run2` (`:8088`/`:5438`) pour le run 2 — plutôt qu'un `down -v` de la pile
  des agents (`s86e2e`, `:8086`) : aucune donnée supprimée pendant le sprint.
- Front : `next dev` **webpack** sur `:3100` (`:3000` appartient à un AUTRE projet, EdelWheels — jamais touché).
- Oracles vérifiés avant chaque run : `/api/auth/me` → **401**, `/fr/login` → **200**, profil e2e actif
  (`/api/test-support/password-reset-token` → 404).
- Serveur surveillé pendant chaque run (sonde `/fr/login` toutes les 20 s) : aucune interruption.

## Résultats mesurés

| Suite | Commande | Résultat |
|---|---|---|
| E2E complète — run 1 (code `566997d`) | `SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 rtk proxy npx playwright test --ignore-snapshots` | 383 tests, **366 passés / 9 échecs / 8 sautés**, 6,2 min |
| E2E complète — run 2 (code final `f21eef8`, base neuve) | idem | 384 tests, **375 passés / 1 échec / 8 sautés**, 6,4 min |
| Frontend complet (code final) | `./scripts/test-quiet.sh frontend` | **OK** — `next build` 52/52 pages, **129 fichiers / 1537 tests**, typecheck, lint |
| Formatage | `rtk proxy npx prettier --check` (16 fichiers frontend du diff) | conforme (étape absente de `test-quiet.sh`, exigée par la CI — PIT-S83-005) |
| CI PR #675 (SHA `d3a5669`) | moniteur CI de l'app | **7/7 verts** : ai-env-packs, backend, e2e (**Linux** — rejoue `sprint-63` et les captures `sprint-77`), flyway-smoke, frontend, secret-scan, security |

`sprint-82-recurrence-capped-hint` (signal de #646) : **vert dans les deux runs complets** et dans le job `e2e` de la CI.

## Les 9 échecs du run 1 — imputés au sprint, corrigés

- 8 × `sprint-63-de-overflow-audit.spec.ts` :
  - `event-form` fr/es/de à 320 px → rang d'actions du pied de la bottom sheet hors écran : **régression réelle** de #618
    (l'édition < 1024 px est devenue une sheet). Corrigé `4b7f83e`.
  - `create-form` 4 locales à 1280 px + `event-form` en à 1024 px → mesure prise pendant l'animation d'entrée de 200 ms
    ajoutée par #618 : **défaut du harnais** (`settle()` n'attendait que les polices). Corrigé `29f64fa`, armement prouvé.
- 1 × `sprint-77-theme-visual.spec.ts:565` (armement de comparaison) : référence `-chromium-darwin` absente par construction,
  le garde-fou refuse d'écrire — attendu hors Linux, jugé par la CI.

Pourquoi les agents ne les avaient pas vus : leurs briefings listaient 4 specs « ciblées » choisies à la main, alors que le
grep des testids du drawer en donnait 12 (dont `sprint-63`). Consigné en mémoire lead
(`specs-ciblees-toutes-celles-qui-citent`) et en PIT-S86-007.

## Piles démontées

`docker compose -p <pile> --profile e2e down -v` joué pour `s86e2e`, `s86full`, `s86run2` après la CI verte (accord explicite
du dev) ; plus aucun conteneur ni volume `s86*`, plus rien en écoute sur `:3100`.
