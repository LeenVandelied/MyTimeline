# Issue #222 — Bump dev-deps frontend (vitest/vite chain)

## commits
- <SHA rempli au commit>

## resume
- **vitest** `^2.1.9` → `^3.2.7` (major, seul changement package.json). Lève la CVE
  CRITICAL vitest (`<=3.2.5`) + la HIGH vite (`<=6.4.2` via esbuild) : vitest 3
  déduplique sur le vite top-level `^6.4.3` (déjà patché) au lieu du vite 5.x imbriqué.
- **Leaves ReDoS HIGH** patchées via `npm update` in-range (lock uniquement, pas de
  bump de dep directe) : `flatted` 3.3.3→3.4.2, `minimatch` 3.1.2→3.1.5 & 9.0.5→9.0.9,
  `picomatch` 2.3.1→2.3.2.
- **Config vitest inchangée** : `vitest.config.mts` (defineConfig `vitest/config`,
  plugin react, resolve.alias, test.globals/environment/setupFiles/css) compatible v3
  tel quel. `vitest.setup.ts` inchangé. Aucune réparation de config nécessaire.
- **`npm audit --audit-level=high` (dev inclus) = exit 0** : 0 HIGH, 0 CRITICAL.
  Résiduel = 2 low + 8 moderate (next-intl open-redirect/proto-pollution, next→postcss
  XSS sans fix, esbuild dev-server, js-yaml, brace-expansion, ajv) — NON bloquant à
  `--audit-level=high`.
- **Non-régression** : vitest `383 pass / 0 fail` (identique au baseline). `npm run build`
  (next build) vert.
- **CI `--omit=dev` RETIRÉ** de `.github/workflows/ci.yml` job `security` : la commande
  passe désormais `npm audit --audit-level=high` sur tout l'arbre (prod + dev), exit 0
  vérifié localement. Commentaire du job mis à jour (référence #222).

## périmètre touché
- `frontend/package.json` (1 ligne : vitest)
- `frontend/package-lock.json` (résolutions vitest 3 + leaves patchées)
- `.github/workflows/ci.yml` (retrait `--omit=dev` + commentaire)
- Non touché : `backend/**` (#223), `frontend/src/**` + config ESLint (#160).

## [MEMORY:*] signaux
- [MEMORY:decision] Context: CVE dev HIGH/CRITICAL frontend masquées par `--omit=dev`
  (#167). Decision: bump vitest 2→3.2.7 (déduplique vite patché) + `npm update`
  in-range des leaves ReDoS (minimatch/picomatch/flatted), puis retrait `--omit=dev`.
  Why: vitest 3 = major mais config basique compatible sans réparation ; audit fix
  non-force trop large (bump storybook 10.5 / eslint / next-intl prod + 242 pkgs) →
  préféré ciblage chirurgical (package.json = 1 ligne, reste en lock).
- [MEMORY:pitfall] Context: `npm audit fix` (même non-force) sur ce repo tire
  storybook 10.4→10.5 (@swc/@parcel/watcher, ~242 pkgs) + next-intl prod 4.0→4.13 +
  eslint 9.23→9.39. Solution: pour un bump sécurité ciblé, éditer la seule dep visée
  dans package.json + `npm update <leaves>` in-range ; ne PAS lancer `npm audit fix`.
  Prevention: audit fix = dernier recours, jamais pour un scope "dev-deps ciblées".

## recommandations suite
- RECOMMAND_FOLLOWUP (MODERATE résiduel, hors scope #222) : `next-intl` (open-redirect
  GHSA-8f24 + proto-pollution GHSA-4c35) et `next`→`postcss` XSS (GHSA-qx2v, "No fix
  available") sont des deps **PROD** moderate. Nécessitent bump next/next-intl (major
  potentiel) → issue dédiée. Non traité ici (scope = dev-deps + gate high/critical).
- Pas de RECOMMAND_TEST_RUNNER (suite 383 tests rapide, gérée inline).
- Pas de RECOMMAND_DB_EXPERT / backend.

STATUS: COMPLETED
