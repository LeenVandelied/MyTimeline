# Mini-plans — Sprint 102

> Rédigés par le LEAD au démarrage (2026-09-22) : aucun `/sprint plan` pour ce sprint (ni étiquette,
> ni milestone, ni entrée d'historique n'existaient). Énoncés contre-vérifiés dans le code avant spawn.

**Périmètre arbitré par le dev (2026-09-22) :** les 4 suites du S101 — #761, #762, #763, #764.
Milestone GitHub « Sprint 102 » (#103) créé et étiquette `sprint-102` posée par le lead au démarrage.
Deux thèmes, mêmes packs que le S101 : auth frontend (#761, #762) et cibles tactiles (#763, #764).
Cohésion ≈ 0.40 (2 packs disjoints, chacun cohérent en interne).

**Vagues :**
- V1 = agent A (#761 puis #762, **Vitest seul**, 2 commits) ∥ agent B (#763 puis #764, **Playwright
  exclusif**, 2 commits minimum). Fichiers disjoints.
- ui-design : a posteriori sur #764 SEULEMENT si une correction est appliquée (outillage DEC-S101-003 déjà arbitré).
**Migrations Flyway :** aucune.
**Harnais E2E (lead) :** `COMPOSE_PROJECT_NAME=s102e2e`, backend `:8087`, Postgres `:5437` (image
`s101e2e-backend-e2e` re-taguée : 0 commit `backend/` ni `docker-compose.yml` depuis sa création).

**Contre-vérification des énoncés (lead) :**
- #761 : `apiClient.ts:218-247` branche 403 = toast `API_ERROR_KEYS.forbidden` inconditionnel.
  Inline 403 SPÉCIFIQUE confirmé dans `ProductDrawer.tsx:233` et `CategoryDrawer.tsx:215-216` seulement.
  **Écart d'énoncé :** `TimelineEditHost` ne gère PAS le 403 inline — `useEventEditConflict.ts:148-160`
  passe en `submitState='error'` (message générique), idem `DeleteConfirmDialog.tsx:170-179`
  (`errors.generic`). Là, le toast est le SEUL porteur de la cause : le faire taire serait une régression.
  Hors périmètre, à remonter en suite. Les hooks `useCreate/UpdateProduct` et `useCreate/UpdateCategory`
  n'ont que les drawers pour consommateurs `.tsx`. Opt-out PAR REQUÊTE recommandé, pas par URL (une
  liste d'URL ferait taire les autres appelants présents et futurs des mêmes routes).
- #762 : `PasswordStrength.tsx:43` `/[a-z]/` et `:45` `/[^A-Za-z0-9]/` confirmés. `Ωabcdefg١` : longueur 9
  (+1), Ω majuscule + minuscules (+1), `١` = `\p{Nd}` (+1), Ω compté symbole (+1) → 4 = `strong`.
  Attendu Unicode : 3 = `medium`. `PASSWORD_POLICY` (`lib/schemas/auth.ts:50-55`) borne ses classes au BMP
  par `(?=[\0-￿])` (PIT-S101-002).
- #763 : confirmé — `sprint-99-touch-targets.spec.ts:68-77` sans `[role="switch"]`, `[role="checkbox"]`,
  `label.mt-switch` ; la version complète est `sprint-101-touch-targets.spec.ts:66-80`. Aucun `Switch`
  dans `components/settings/` aujourd'hui (seul consommateur : `EventEditForm.tsx`).
- #764 : il n'existe AUCUN testid `timeline-actionsheet-*` hors `timeline-actionsheet-overlay`
  (`TimelineActionSheet.tsx:78`) ; les items sont `.mt-actionsheet__item` (`timeline.css:895`,
  `min-height:48px`). La « fenêtre de lecture » n'est pas nommée : candidats `TimelineBottomSheet.tsx`,
  `EventDrawer.tsx`. CTA d'état vide : testids `dashboard-{product-carousel,product-list,week-agenda,
  compact-agenda}-empty-cta` confirmés.

```yaml
issue_761:
  fichiers_cles:
    - "frontend/src/services/apiClient.ts"
    - "frontend/src/services/apiClient.test.ts"
    - "frontend/src/services/productService.ts"
    - "frontend/src/services/categoryService.ts"
    - "frontend/src/hooks/useCreateProduct.ts, useUpdateProduct.ts, useCreateCategory.ts, useUpdateCategory.ts"
    - "frontend/src/components/products/ProductDrawer.tsx"
    - "frontend/src/components/categories/CategoryDrawer.tsx"
  couches_touchees: ["frontend"]
  strategie_test: "unit (Vitest) : intercepteur avec/sans opt-out + drawers (403 → message inline, aucun toast)"
  risque_regression: "écran qui perd le seul signalement du 403 si l'opt-out fuit hors des drawers"
  ordre_ecriture: "apiClient (opt-out par requête) → services/hooks (transport de l'option) → drawers → tests"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence)"
issue_762:
  fichiers_cles:
    - "frontend/src/components/settings/PasswordStrength.tsx"
    - "frontend/src/components/settings/PasswordStrength.test.tsx"
  couches_touchees: ["frontend"]
  strategie_test: "unit (Vitest) : Ωabcdefg١ → medium ; cas NFD (lettre + diacritique combinant) ; invariant #508"
  risque_regression: "BR-AUT-003 : levelFromPassword doit rester weak ⇔ refusé par le serveur"
  ordre_ecriture: "scorePassword → tests"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence)"
issue_763:
  fichiers_cles:
    - "frontend/e2e/sprint-99-touch-targets.spec.ts"
  couches_touchees: ["frontend"]
  strategie_test: "E2E : spec verte + preuve que le sélecteur voit un interrupteur (sonde synthétique)"
  risque_regression: "aucun code de production"
  ordre_ecriture: "sélecteur → sonde → run"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence)"
issue_764:
  fichiers_cles:
    - "frontend/e2e/sprint-102-touch-targets.spec.ts (nouveau)"
    - "frontend/src/components/timeline/TimelineActionSheet.tsx"
    - "frontend/src/components/timeline/TimelineBottomSheet.tsx | EventDrawer.tsx (à identifier)"
    - "frontend/src/components/dashboard/{ProductCarousel,ProductList,WeekAgenda,CompactAgenda}.tsx"
    - "frontend/src/lib/touchTarget.ts (lecture seule sauf nécessité)"
  couches_touchees: ["frontend"]
  strategie_test: "E2E 375 px : mesurer AVANT de corriger ; corriger seulement < 44 px"
  risque_regression: "specs qui citent les surfaces touchées (grep exhaustif avant commit)"
  ordre_ecriture: "spec de mesure → rapport → corrections éventuelles → rejouer les specs citantes"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence)"
```
