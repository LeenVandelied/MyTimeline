# Mini-plans architect — Sprint 41 (UX & a11y Timeline)

> Généré par /ai-env:sprint plan 5 (2026-07-13). Lu par /sprint start Phase 4.1.
> Cohésion 0.66 | epic dominant: events | migrations: aucune.
> Vagues : V1 = #226 ∥ #228 | V2 = #195 → #227 (convergent sur handler clavier TimelineView.tsx).

```yaml
issue_0195:
  fichiers_cles:
    - frontend/src/components/timeline/TimelineView.tsx   # ~24.5K — état collapse par produit
    - "composant timeline-group-head (accordéon catégorie existant)"  # pattern réf. à réutiliser
    - "timeline-resource-title (nom produit par lane)"
  couches_touchees: [frontend]
  strategie_test:
    - "collapse/expand produit indépendant (n'affecte ni autres produits ni catégorie parente)"
    - "conservation position scroll après toggle (parité collapse catégorie)"
    - "clavier: focus/activation cohérents avec accordéon catégorie"
  risque_regression: MOYEN — 2e niveau d'imbrication dans composant existant; réutiliser STRICTEMENT le pattern catégorie validé, ne pas diverger clavier/focus
  ordre_ecriture: [état collapse par produit, contrôle expand/collapse par lane, préservation scroll, tests clavier]
  zod_dto_sync: NON (complète BR #55, pas de règle métier nouvelle)
  possibly_done: false

issue_0226:
  fichiers_cles: ["frontend/src/components/timeline/timeline.css (~l.58 .mt-zoom__btn)"]
  couches_touchees: [frontend]
  strategie_test: "cible >=44x44px sur TimelineMobilePortrait/Landscape; desktop TimelineView INCHANGÉ"
  risque_regression: FAIBLE — override scoped .mt-tlm uniquement; réutiliser pattern hitbox ::before PAT-S24-002 (docs/memory/patterns.md)
  possibly_done: false

issue_0228:
  fichiers_cles: ["frontend/src/components/timeline/EventPill.tsx (~l.82-84,100)", "EventPill.test.tsx"]
  couches_touchees: [frontend]
  strategie_test: "aria-hidden conditionnel (retiré si readableInside); +3 tests clavier §9 (flèches inter-lanes, cyclage Tab drawer, raccourcis T/[/]/-)"
  risque_regression: FAIBLE côté aria; tests clavier peuvent chevaucher handler TimelineView → V2
  possibly_done: false

issue_0227:
  DECISION_DEV: "OPTION B retenue (2026-07-13) — aide reste hover/focus-only, RETIRER la mention du raccourci '?' du référentiel. PAS de code timeline."
  fichiers_cles:
    - ".claude/rules-jit/ux-patterns.md §5/§9"   # retirer référence au raccourci '?'
    - "mention '?' dans l'UI si présente (aria-keyshortcuts / légende)"
  couches_touchees: [doc, frontend-mineur]
  strategie_test: "'?' retiré du référentiel + UI ; tooltip aide hover/focus (.mt-tlv__help-pop role=tooltip) inchangé et toujours fonctionnel"
  risque_regression: TRÈS FAIBLE
  possibly_done: partiel  # tooltip aide hover/focus EXISTE déjà ; seul le raccourci '?' n'est pas câblé → option B = ne pas le câbler, l'acter
```
