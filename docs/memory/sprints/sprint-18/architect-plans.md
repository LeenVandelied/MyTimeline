# Mini-plans architect — Sprint 18

> Généré par /sprint plan (architect). Lu par /sprint start Phase 4.1
> pour injection dans HEAD du briefing fullstack-dev (section "## Plan d'implementation").
>
> Dé-scope validé (2026-07-03) : #62 (Drawer Catégorie) retiré de S18 → backlog
> (cohésion 0.34 → 1.0, à traiter dans un futur sprint categories/products avec #68).
> S18 = #66 seul.

issue_0066:
  fichiers_cles:
    - "frontend/src/components/EventEditForm.tsx (refactoring complet — 296 lignes)"
    - "frontend/src/types/event.ts (schéma Zod unique — supprimer doublon eventEditSchema)"
  couches_touchees: ["frontend"]
  strategie_test: "unit (Vitest — submitState 4 états, validations inline) + E2E création événement"
  risque_regression: "BR-EVE-002 (fin>=début), BR-EVE-003 (titre requis), BR-EVE-006 (recurrenceUnit si récurrent), BR-EVE-009 (couleurs). Doublon Zod eventEditSchema à consolider sur types/event.ts (déjà migré #150). État 409 conflict (dépend pattern #77 non planifié — à vérifier). 3 viewports."
  ordre_ecriture: "frontend (schéma unifié → submitState → validations inline → preview → 3 viewports)"
  zod_dto_sync: "OUI (source de vérité types/event.ts, consolidé depuis #150)"
  possibly_done: false
  etat_reel_du_code: "(greenfield refactor — dépend #150 pour schéma unifié)"
