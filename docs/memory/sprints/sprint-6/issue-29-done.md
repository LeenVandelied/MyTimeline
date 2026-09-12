# Issue #29 — done

**Commit :** `6ca0b13` (:white_check_mark: #29 — infra test frontend)

## Résumé
- Outils (devDeps pinnés) : **Vitest 2.1.9** + @vitejs/plugin-react + jsdom 25 + **RTL 16** (react/jest-dom/user-event/dom) ; **Playwright 1.61** ; **Storybook 8.6.18** framework **Vite** (`@storybook/experimental-nextjs-vite`, addons essentials/links/interactions, vite 6) ; **Prettier 3.8** (+plugin-tailwindcss) ; **Husky 9.1.7** ; lint-staged 15.5 ; **commitlint 19.8** + commitlint-plugin-gitmoji + @gitmoji/parser-opts.
- Scripts package.json : `test`/`test:watch`/`test:e2e`/`typecheck`/`format`/`format:check`/`storybook`/`build-storybook` (lint/build préexistants). **Pas de script `prepare`** (CI `npm ci` ne déclenche pas husky).
- **Preuves run réelles** : `test` → 1 passed 0 stderr (MEMO-007) · `typecheck` exit 0 · `lint` clean · `test:e2e` exit 0 (config OK, `--pass-with-no-tests`) · `format:check` clean · `build-storybook` OK + `storybook dev` iframe HTTP 200 · `next build` OK · **commitlint reject prouvé** (`add test infra`→exit1 ; conforme→exit0).
- **Husky/worktree résolu** : `husky init` échoue en worktree+sous-dossier → setup manuel, `core.hooksPath=frontend/.husky/_` en scope **`--worktree`** (extensions.worktreeConfig=true) ; hooks `cd frontend` ; `$1` commit-msg rendu absolu. Prouvé end-to-end (pre-commit lint-staged + commit-msg).

## Vérifs lead
- commit présent ✓ · 8 scripts (test/test:e2e/typecheck/format/storybook…) ✓ · configs présentes (vitest.config.mts, vitest.setup.ts, playwright.config.ts, .prettierrc, commitlint.config.cjs, .storybook/) ✓ · pas de `prepare` ✓ · hooksPath worktree ✓

## [MEMORY:*] signaux
- [MEMORY:decision] Storybook 8.6 + @storybook/nextjs (webpack5) plante sur Next 15.2 (`Cache.shutdown` tap undefined) → basculer `@storybook/experimental-nextjs-vite` (builder Vite). Ne pas réintroduire @storybook/nextjs tant que SB<9.
- [MEMORY:pitfall] husky v9 + worktree + npm sous-dossier : setup manuel + `core.hooksPath` relatif en scope `--worktree` ; NE PAS lancer `husky init` depuis le sous-dossier (échoue + pollue hooksPath global).
- [MEMORY:pattern] commitlint style gitmoji projet `":code: #NN — texte"` : plugin commitlint-plugin-gitmoji (start-with-gitmoji) + @gitmoji/parser-opts + header-max-length, SANS preset commitlint-config-gitmoji (type-enum/subject-full-stop = faux positifs).
- [MEMORY:pattern] Vitest config en `.mts` + alias `@/*` en dur (resolve.alias) ; mock next/font/google + next/navigation + matchMedia dans vitest.setup.ts.

## Recommandations suite (→ triage Phase 4 /sprint end)
- RECOMMAND_FOLLOWUP : écrire vrais tests RTL (remplacer smoke.test.tsx) + premières specs Playwright + stories DS additionnelles quand le socle frontend S7 atterrit. [triage M | frontend]

## Notes pour #38 (CI, vague 3)
- CI doit appeler `npm run test` (vitest), `npm run typecheck`, `npm run lint`, `npm run build` — tous verts.
- `test:e2e` = `--pass-with-no-tests` (exit 0 sans spec) ; Playwright en CI nécessiterait `npx playwright install` — E2E hors scope CI obligatoire pour l'instant (aucune spec).
- Pas de `prepare`/husky en CI (npm ci safe). Storybook = Vite (`build-storybook`).

STATUS: COMPLETED
