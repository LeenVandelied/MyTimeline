# Mini-plans — Sprint 100

> Rédigés par le LEAD au démarrage (2026-09-21) : aucun `/sprint plan` n'a produit de mini-plan pour ce
> sprint (milestone #101 et labels posés au triage de clôture des S96-S99). Énoncés contre-vérifiés dans le
> code avant spawn. Cohésion 1.00 (un seul thème : contrôles atteignables sur mobile / `epic:design`, frontend seul).

**Périmètre arbitré par le dev (2026-09-21) :** 3 issues étiquetées `sprint-100` (#732, #740, #480).
#754 (cibles < 44 px hors réglages, P1, M) est dans le milestone Sprint 100 SANS l'étiquette — **exclue**
par le dev ; à détacher du milestone avant sa fermeture.

**Vagues :** V1 = agent A (#732 + #740, même cause, Playwright exclusif) ∥ agent B (#480, Vitest seul ;
sa spec E2E est jouée par le lead en fin de vague).
**Migrations Flyway :** aucune.

**Contre-vérification des énoncés (lead) :**
- #732 / #740 : **même cause, un seul correctif**. `ui/dialog.tsx:47` `DialogPrimitive.Close` en
  `absolute top-4 right-4`, enfant direct de `DialogPrimitive.Content`. Les deux bottom sheets mettent
  `overflow-y-auto` sur le `DialogContent` lui-même : `ProductDrawer.tsx:259` (l'énoncé dit 255 — glissé)
  et `CategoryDrawer.tsx:241`. `ConflictDialog.tsx:169` : overflow sur un `div` interne → non concerné.
  8 consommateurs de `DialogContent` : AccountSection, ProductDrawer, RestoreProductDialog, ConflictDialog,
  DeleteConfirmDialog, ArchiveConfirmDialog, CategoryDrawer (+ `CategoryDrawer.test.tsx`).
  `NewEventDrawer` n'utilise PAS `DialogContent` (hors périmètre).
  Oracle à ne pas casser : `e2e/sprint-95-toast-overlap.spec.ts:124,299-315` asserte la croix à
  `sheet.y + 16` (`top-4`) **à `scrollTop` 0** (PIT-S96-004) — un correctif `sticky` ou header non
  défilant doit préserver ce `+16` à l'ouverture.
- #480 : **prémisses partiellement périmées**. (1) Le FAB est `md:hidden` depuis #298 (AppShell.tsx:381,
  `fixed right-4 bottom-[calc(var(--space-6)+env(safe-area-inset-bottom))] h-13 w-13`) : il n'existe
  qu'en **< 768 px**, pas « sous 1024 px / sous `lg` ». (2) « le dashboard a un `AppFooter` donc n'est pas
  concerné » : `AppFooter` (`src/components/ui/footer-app.tsx`) est désormais rendu AUSSI par
  `settings/page.tsx`, `products/page.tsx`, `products/[productId]/page.tsx` — et un pied de page ne
  protège rien, il peut lui-même passer sous le FAB. À MESURER sur les 5 écrans enveloppés par le shell,
  pas à déduire. `<main data-testid="shell-main">` est à AppShell.tsx:362.

```yaml
issue_732_740:
  fichiers_cles:
    - "frontend/src/components/ui/dialog.tsx"
    - "frontend/src/components/products/ProductDrawer.tsx"
    - "frontend/src/components/categories/CategoryDrawer.tsx"
    - "frontend/e2e/sprint-100-dialog-close-reachable.spec.ts (nouveau)"
  couches_touchees: ["frontend"]
  strategie_test: "unit (Vitest des consommateurs) + E2E boundingBox après défilement maximal"
  risque_regression: "sprint-95-toast-overlap (croix à sheet.y+16 à scrollTop 0), 8 consommateurs de DialogContent, specs géométriques sprint-96-palette-geometry"
  ordre_ecriture: "spec E2E rouge d'abord (défaut reproduit après scroll) → correctif → spec verte + A/B des specs qui citent la surface"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence) — défaut confirmé par lecture : dialog.tsx:47 absolute dans le conteneur défilant"
issue_480:
  fichiers_cles:
    - "frontend/src/components/layout/AppShell.tsx"
    - "frontend/e2e/sprint-100-fab-clearance.spec.ts (nouveau)"
  couches_touchees: ["frontend"]
  strategie_test: "unit (AppShell test) + E2E à 390 px écrit par l'agent, JOUÉ par le lead"
  risque_regression: "specs qui citent shell-main / FAB (sprint-66-mobile-*, sprint-73-tablet-sidebar, sprint-85-timeline-toolbar, sprint-86-form-drawer-modal, sprint-92-business-toasts, sprint-96-palette-geometry, sprint-62-select-focus-indicator) ; frise mobile plein écran (hauteur du main)"
  ordre_ecriture: "mesure → padding par token sous md sur shell-main (ou écran par écran si la frise l'interdit) → tests"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence) — aucun padding bas de réserve sur shell-main"
```
