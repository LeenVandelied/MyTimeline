# Mini-plans architect — Sprint 96

> Généré par /sprint plan (architect, 2026-09-15, axe « bugs du parcours »). Lu par /sprint start Phase 4.1.
> Cohésion 0.00 assumée (DEC-S57-003) — thème commun : un contrôle trop petit ou recouvert.

**Vagues :** V1 = #702 (E2E exclusif, recette A/B worktree) ∥ #633 | V2 = #665 (modifie la spec que #702 stabilise) | V3 = #656 (navigateur + E2E)
**Dépend de :** S93 (ProductDrawer / CategoryDrawer voisins, à revérifier), S95 (#714 position des overlays)
**Migrations Flyway :** aucune

```yaml
issue_702:
  fichiers_cles:
    - "frontend/e2e/sprint-84-palette.spec.ts:128"
    - "frontend/src/components/ui/palette-color-picker.tsx:108-109"
    - "frontend/src/components/events/NewEventDrawer.tsx"
  couches_touchees: ["e2e", "frontend-ui"]
  strategie_test: "E2E répété (≥5 runs A/B dev vs branche)"
  risque_regression: "corriger côté test peut masquer un vrai vol de focus produit"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence) — flake préexistant ~2/5 sur dev (A/B S90)"
  ecart_enonce_code: "à déterminer par fullstack-dev (cause inconnue)"

issue_665:
  fichiers_cles:
    - "frontend/src/components/ui/palette-color-picker.tsx:113-118 (flex-wrap gap-2), :144 (size-7 = 28px), :182 (h-7 Personnalisé)"
    - "consommateurs : categories/CategoryDrawer.tsx, EventEditForm.tsx, products/ProductDrawer.tsx, ui/popoverPicker.tsx"
    - "frontend/src/styles/ds/a11y-audit.md"
  couches_touchees: ["frontend-ui", "ds"]
  strategie_test: "E2E (boîtes ≥44×44 à 375 px ; aucune ligne orpheline aux largeurs des surfaces, clair et sombre)"
  risque_regression: "références visuelles citant la palette (sprint-70-preview-visual, sprint-73-model-vs-rendered) : PNG à régénérer en CI Linux seulement ; categories.spec, timeline.spec, sprint-84-palette"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "28 px confirmés."
  ecart_enonce_code: "4e consommateur ui/popoverPicker.tsx non listé (rendu réel non vérifié)"

issue_633:
  fichiers_cles:
    - "frontend/src/components/settings/mobile/MobileSettings.tsx:52 (h-9 w-9)"
  couches_touchees: ["frontend-settings"]
  strategie_test: "E2E boundingBox 375 px"
  risque_regression: "le critère « balayage de toutes les cibles » est à borner (sinon S)"
  possibly_done: false
  etat_reel_du_code: "Confirmé."
  ecart_enonce_code: "aucun"

issue_656:
  fichiers_cles:
    - "frontend/app/[locale]/login/page.tsx:71"
    - "frontend/app/[locale]/register/page.tsx:73"
    - "frontend/app/[locale]/forgot-password/page.tsx:63"
    - "frontend/app/[locale]/reset-password/page.tsx:183 (4 conteneurs absolute top-4 right-4 dupliqués)"
    - "frontend/src/components/shared/OfflineBanner.tsx:49 (mt-sysbanner--sticky)"
    - "frontend/app/[locale]/layout.tsx:78"
  couches_touchees: ["frontend-app-auth"]
  strategie_test: "E2E (bannière server-error forcée, boîtes disjointes)"
  risque_regression: "sprint-77-theme-visual masque la bannière : régression invisible aux références visuelles"
  possibly_done: false
  etat_reel_du_code: "4 copies du conteneur confirmées."
  ecart_enonce_code: "aucun (l'énoncé ne cite pas les 4 pages)"
```
