# Issue #892 — React 18 → 19

## Résumé
Fait par le lead. Commit `c27c6dfe`. `react`/`react-dom` 19.3.1 ; `@types/react(-dom)` étaient déjà en `^19`, épinglés
`^19.3.0`. Inventaire des ruptures : `defaultProps`, `propTypes`, `useFormState`, `react-dom/test-utils`, `findDOMNode`,
`react-test-renderer`, accès `element.ref` : 0 occurrence. `forwardRef` (21 fichiers) reste supporté en 19 : non migré
(hors périmètre, aucun avertissement). Radix, react-hook-form, next-intl, next-themes, react-hot-toast, Testing Library,
Storybook 10 : aucun conflit de pairs (`npm ls` propre, `npm ci` OK).

Tests adaptés (3 fichiers, 12 échecs) :
- `global-error.test.tsx` / `global-not-found.test.tsx` : `<html>`/`<body>` sont des singletons React 19, fusionnés avec
  le document au lieu d'être imbriqués dans le `container` RTL → `lang` lu sur `document.documentElement` (remis à zéro
  avant chaque test, sinon assertion vacante), balises prouvées par `renderToStaticMarkup`.
- `useExportFlow.test.ts` : la réponse du 2e poll se propage après la fenêtre de 4 s → marge de 50 ms + décompte EXACT
  de 2 appels (aucun 3e poll ne sert).

## Tests
Vitest 2359/2359 sans stderr ; eslint, tsc ; `next build` (avertissement « React 18 deprecated » disparu, 48 SSG) ;
`storybook build` OK. E2E : audit.

## Recommandations suite
- Pas de RECOMMAND_SECURITY / UI_DESIGN : pas de changement visuel ni d'auth.

[MEMORY:pitfall] React 19 : un composant qui rend `<html>`/`<body>` (global-error, global-not-found) ne s'imbrique plus
dans le `container` RTL — React fusionne avec `document.documentElement`/`document.body`. `container.querySelector('html')`
rend `null` ; lire `document.documentElement` et le remettre à zéro avant chaque test.

STATUS: COMPLETED
