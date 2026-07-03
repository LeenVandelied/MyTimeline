# Fix infra Storybook — Migration SB 8.6 → 10 (absorbé Sprint 16, débloque #46/#47)

commits: [06dfc4c]

## Résumé
- Storybook **8.6.18 → 10.4.6** (codemod `storybook@latest upgrade` a résolu `@latest` = SB10 ; SB10 supporte Next 15.5 via le même framework Vite → objectif "débloquer build-storybook sans downgrader Next" atteint).
- Framework renommé `@storybook/experimental-nextjs-vite` → `@storybook/nextjs-vite` (package.json + `.storybook/main.ts` type `StorybookConfig` + `framework.name`).
- Addons retirés (fusionnés core) : `addon-essentials`, `addon-interactions`. Ajouté : `addon-docs`. Gardé : `addon-links`. `docs.autodocs` retiré (SB10). `@storybook/test` retiré (type-only inutilisé).
- Imports corrigés : 17 stories `src/components/ui/*.stories.tsx` + `preview.ts` → `@storybook/react` → `@storybook/react-vite`.
- `viteFinal` alias `@`/`@/app`, `staticDirs`, `disableTelemetry`, imports CSS `globals.css`+`ds/components/core.css` : PRÉSERVÉS.
- eslint-plugin-storybook flat/recommended ajouté par codemod (lint vert).

## Vérifs (critères de succès — tous OK)
- `build-storybook` : **OK** (17 stories buildées, exit 0)
- `vitest` : **85/85 vert** (16 fichiers)
- `tsc --noEmit` : **vert**
- lint : **vert**
- Next : **15.5.20 conservé** (CVE #161 intact, pas de downgrade)

[MEMORY:decision] build-storybook cassé par Next 15.5 (`define-env-plugin.js` supprimé, importé par experimental-nextjs-vite@8.6 transitif). Décision : migrer Storybook 8.6→10 (codemod `@latest`) plutôt que repin Next. Why : framework `@storybook/nextjs-vite` (dé-préfixé SB9+) compatible Next 15.5, garde builder Vite (cohérent Vitest), préserve fix CVE #161.
[MEMORY:pitfall] Codemod `storybook upgrade` renomme le framework dans main.ts et réduit les addons, MAIS laisse des packages périmés (`@storybook/experimental-nextjs-vite@8.6.18`, `@storybook/test@8.6.18`) dans package.json (détectés par `storybook doctor` "Incompatible Packages"). Solution : retirer à la main + ajouter `@storybook/nextjs-vite`/`@storybook/react-vite`, puis `npm install`. Prevention : `git diff package.json` post-codemod, jamais commiter à l'aveugle ; grep global `@storybook/react`/`@storybook/test` pour les imports stories.

## Recommandations suite
- Néant bloquant. `next lint` déprécié (warning, migrera Next 16) — hors périmètre, pas d'action ce sprint.

STATUS: COMPLETED
