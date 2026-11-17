# Fix CI — Sprint 8 (build Next.js, issue #53)

**Vague :** correction CI (échec `next build` prerender) | **Commit :** 95c8833

## Problème
CI `frontend / Build` rouge : `next build` échoue au prerendering de `/[locale]/reset-password` — `useSearchParams() should be wrapped in a suspense boundary` (CSR bailout). Backend CI vert. Les tests RTL passaient (mock synchrone de `useSearchParams`), masquant l'échec du build de production.

## Fix
`frontend/app/[locale]/reset-password/page.tsx` : `ResetPasswordForm` (lecture `useSearchParams` token) extrait et enveloppé dans `<Suspense fallback={<Spinner/>}>`. Wrapper `ResetPasswordPage` (default export inchangé) résout `params`/`t` et passe `locale` en prop. Spinner existant réutilisé, `data-testid` préservés, i18n/tokens intacts. Seul reset-password utilisait `useSearchParams` (grep confirmé) ; login/register/forgot build OK sans modif.

## Vérification (par le lead)
- `npm run build` = **SUCCESS** (22/22 pages statiques, reset-password prerendered SSG) — vérifié directement dans le worktree.
- Frontend **23/23** verts.
- **CI re-run 28495456598 : backend success + frontend success** (les 2 jobs verts).

## [MEMORY:*] signaux
- **[MEMORY:pitfall]** `next build` (App Router) casse en CSR bailout sur un composant client lisant `useSearchParams()`/`usePathname()` sans frontière `<Suspense>`, ALORS QUE les tests RTL passent (mock synchrone). Fix : extraire la lecture query-params dans un sous-composant + `<Suspense fallback={<Spinner/>}>`, garder le default export comme wrapper (préserve le point de montage des tests). Préférer à `force-dynamic` (garde le SSG).
- **[MEMORY:pitfall] (orchestration)** L'audit Phase 6 / test-runner lance les tests mais PAS `next build` de production → un build cassé peut passer tous les tests RTL et n'être détecté qu'en CI. Ajouter `npm run build` (frontend) à l'audit de couverture quand des pages App Router / query-params sont touchées.

## Recommandations suite
Aucune. RAS.

STATUS: COMPLETED
