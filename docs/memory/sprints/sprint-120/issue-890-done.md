# Issue #890 — `next build` sur Turbopack

## Résumé
Fait par le lead. Commit `8c22f64c`. Script `build` = `next build` (sans `--webpack`) ; la CI (2 jobs) et le
Dockerfile passent par `npm run build` → aucun workflow modifié. Table des routes identique (48 pages ● SSG,
`products/[productId]` ƒ, `ƒ Proxy`), sortie `standalone` identique (`server.js` à la racine, layout Dockerfile OK),
pas d'avertissement de workspace root en worktree.

Specs à chunks : Turbopack produit des chunks PLATS nommés par hash (`/_next/static/chunks/<hash>.js`), plus de
`app/…/page-*.js`. Les portes de `sprint-90-first-contact` (timeline, products, settings, fiche produit) et
`sprint-106-product-detail` (dashboard) ne s'armaient plus → nouvelle porte `e2e/support/page-chunk-gate.ts` : chunk
reconnu à un `data-testid` propre à la page, absent du `loading` et des layouts (vérifié sur `entryJSFiles` du
manifeste client de chaque segment). Indépendante du bundler.

Références visuelles Playwright (`sprint-77-theme-visual`) : non régénérées sur macOS ; comparaison faite par la CI Linux.
Recette locale `playwright.config.ts` (`next dev --webpack`) laissée telle quelle (hors critère ; turbopack dev en
worktree, PIT-S61-007, non revérifié).

## Recommandations suite
- Pas de RECOMMAND_SECURITY / DB_EXPERT.

[MEMORY:pitfall] Turbopack (`next build`) : chunks plats nommés par hash — toute porte E2E qui reconnaît un chunk de
page par son CHEMIN webpack (`chunks/app/…/page-*.js`) ne s'arme plus. Reconnaître le chunk par son contenu
(`e2e/support/page-chunk-gate.ts`).

STATUS: COMPLETED
