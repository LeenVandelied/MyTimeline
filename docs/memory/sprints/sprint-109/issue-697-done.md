# Issue #697 — Nettoyage post-S90 (orphelins) — done

## Résumé

Objectif : retirer composant, clés i18n, branches de chargement et documentation devenus orphelins depuis S90 (#624).

Fichiers :
- `frontend/src/components/products/AddProductButton.tsx` — SUPPRIMÉ (0 import, 0 story, 0 test dédié ; seule clé consommée `products.drawer.createTitle`, toujours lue par `ProductDrawer.tsx:272` → conservée).
- `frontend/src/components/layout/AppShell.tsx` — JSDoc : exemple `AddProductButton` remplacé par le CTA vivant `products-new-button` (`ProductsListView.tsx:221`, même trio `bg-accent hover:bg-accent-hover text-accent-ink`).
- `frontend/public/locales/{fr,en,es,de}/dashboard.json` — bloc `recentEvents` retiré (0 consommateur, y compris via sous-namespace : les 13 `useTranslations('dashboard.*')` n'en lisent aucun). JSON revalidé. Rien ajouté (fichier partagé avec #664).
- `frontend/app/[locale]/(app)/products/page.tsx` — branche `products-page-loading` supprimée ; `loading` retiré du destructuring (`useAuthGuard` garde la redirection).
- `frontend/app/[locale]/(app)/products/[productId]/page.tsx` — branche `product-detail-page-loading` supprimée ; `loading` conservé (lu par la garde `useEffect`).
- `frontend/e2e/sprint-100-fab-clearance.spec.ts` — `loading` des écrans products/fiche re-ciblé sur les testids de chargement des DONNÉES réellement montés sous `ready` : `products-loading` (`ProductsListView`) et `product-detail-loading` (`ProductDetailView`), comme `timeline` → `timeline-data-loading`. Attente de nouveau armée au lieu de `''` (qui aurait retiré l'attente).
- `frontend/e2e/sprint-42-events.spec.ts` — en-tête : écrans montant la frise = `/timeline` + fiche produit (dashboard retiré depuis #624).
- `docs/memory/decisions.md` — DEC-S85-005 : note datée « Correctif S109 (#697) » (trois écrans → deux), historique non réécrit.

Verdict sur la prémisse « inatteignable » : CONFIRMÉE pour les deux branches.
- `AppShell.tsx` (`if (loading || !user)` → `app-shell-loading`) ne rend `children` qu'avec `loading === false` ET `user`.
- Les deux pages lisent le MÊME `loading` (`AuthContext`) — pas un fetch propre à la page.
- `AuthContext` ne repasse `loading` à `true` que dans `login`/`register` ; leurs seuls appelants sont `app/[locale]/login/page.tsx` et `register/page.tsx`, hors du groupe `(app)`. `refreshUser` (= `fetchUser`) ne touche pas `loading` à `true`. Même si c'était le cas, `AppShell` (consommateur ancêtre) démonte `children` dans le même rendu.
- Clés `products.list.loading` / `products.detail.loading` CONSERVÉES : encore consommées par `products/loading.tsx:51`, `[productId]/loading.tsx:32`, `ProductsListView` et `ProductDetailView` (`t('loading')` sous `products.list` / `products.detail`).

Écarts d'énoncé :
- HEAD de départ réel `f54ab665` (merge S108), pas `0bfd91ad` (son parent) — sans effet.
- `sprint-84-section-titles.spec.ts:347` ne cite `add-product-button` qu'en commentaire historique ; l'assertion porte sur le `h1` du salut → spec valide, non touchée.
- Même motif mort NON couvert par l'issue : `dashboard/page.tsx:108-112` (`dashboard-loading`, même `useAuthGuard` sous `AppShell`) ; et `sprint-100-fab-clearance.spec.ts` attend `dashboard-loading` → attente vacante. Hors périmètre → RECOMMAND_FOLLOWUP.

## Tests

- `npx tsc --noEmit -p .` → 0 erreur.
- `npx next lint --file <5 fichiers>` → « No ESLint warnings or errors » (le résumé RTK affichait « Errors: 1 », faux ; relu sous `rtk proxy`).
- `npx prettier --check` (9 fichiers, depuis `frontend/`, sous `rtk proxy`) → conforme.
- `npx vitest run app/[locale]/(app)/products app/[locale]/(app)/dashboard src/components/layout` → 5 fichiers, 61/61.
- `npx vitest run` complet → 166 fichiers, 2145/2145 (inclut l'état en cours de #632 dans le working tree partagé).
- `npx playwright test e2e/sprint-100-fab-clearance.spec.ts e2e/sprint-42-events.spec.ts --list` → 14 tests listés (parse OK). Non joués.
- Aucun test unitaire n'assertait `products-page-loading` / `product-detail-page-loading`.

## Specs E2E à jouer par le lead

grep `frontend/e2e` (liste complète) :
- `products-page-loading` / `product-detail-page-loading` : `sprint-100-fab-clearance.spec.ts` (modifiée ; ne subsistent qu'en commentaire).
- `AddProductButton` : aucune. `add-product` : `sprint-84-section-titles.spec.ts` (commentaire seul).
- `recentEvents` : aucune.
- `products-loading` (nouvelle attente) : `sprint-100-fab-clearance.spec.ts`, `sprint-90-first-contact.spec.ts`.
- `product-detail-loading` (nouvelle attente) : `sprint-100-fab-clearance.spec.ts`, `sprint-90-first-contact.spec.ts`, `sprint-106-product-detail.spec.ts`.
- En-tête modifié : `sprint-42-events.spec.ts`.
À jouer en priorité : `sprint-100-fab-clearance.spec.ts`, `sprint-42-events.spec.ts`, `sprint-84-section-titles.spec.ts`.

## Signaux mémoire

- [MEMORY:pattern] Problem: un testid de branche morte supprimé laisse une attente `toHaveCount(0)` vacante dans une spec de mise en page. Solution: re-cibler l'attente sur le testid de chargement des DONNÉES monté sous le `ready` (`products-loading`, `product-detail-loading`, `timeline-data-loading`) plutôt que `''`. Anti-pattern: mettre `loading: ''`, qui supprime l'attente au lieu de la ré-armer.
- [MEMORY:pitfall] Context: sous RTK, `next lint` résume « Errors: 1 » alors que la sortie brute dit « No ESLint warnings or errors ». Solution: relire sous `rtk proxy`. Prevention: tout verdict lint/prettier se lit sous `rtk proxy`.

## Recommandations suite

- RECOMMAND_FOLLOWUP: branche `dashboard-loading` de `dashboard/page.tsx:108` même motif inatteignable (#391/#697) + attente vacante `dashboard-loading` dans `sprint-100-fab-clearance.spec.ts:72` [triage XS]
- RECOMMAND_FOLLOWUP: clés `dashboard.{stats,actions,welcome,lastConnection,email,role,products}` sans consommateur apparent au grep (à prouver, incl. `useTranslations()` racine) — à séquencer APRÈS #664 qui touche `dashboard.json` [triage XS]
- Pas de RECOMMAND_DB_EXPERT : aucun changement backend ni schéma.
- Pas de RECOMMAND_SECURITY : garde d'auth inchangée (`useAuthGuard`/`AppShell`), seule une branche d'UI morte retirée.
- Pas de RECOMMAND_UI_DESIGN : aucun rendu atteignable modifié.
- Pas de RECOMMAND_TEST_RUNNER : Vitest complet joué (2145/2145) ; E2E réservés au lead.

fichiers de contexte lus: briefing (prompt), frontend/src/components/products/AddProductButton.tsx, frontend/src/components/layout/AppShell.tsx, frontend/src/contexts/AuthContext.tsx, frontend/src/hooks/useAuthGuard.ts, frontend/app/[locale]/(app)/layout.tsx, frontend/app/[locale]/(app)/products/page.tsx, frontend/app/[locale]/(app)/products/[productId]/page.tsx, frontend/app/[locale]/(app)/products/loading.tsx, frontend/app/[locale]/(app)/products/[productId]/loading.tsx, frontend/app/[locale]/(app)/timeline/page.tsx, frontend/e2e/sprint-100-fab-clearance.spec.ts, frontend/e2e/sprint-42-events.spec.ts, frontend/e2e/sprint-84-section-titles.spec.ts, docs/memory/decisions.md (DEC-S56-003, DEC-S85-003..006), frontend/public/locales/*/dashboard.json
STATUS: COMPLETED
