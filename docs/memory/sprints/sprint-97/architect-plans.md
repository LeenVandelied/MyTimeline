# Mini-plans architect — Sprint 97

> Généré par /sprint plan (architect, 2026-09-15, axe « bugs du parcours »). Lu par /sprint start Phase 4.1.
> Cohésion 0.00 assumée (DEC-S57-003) — thème commun : lisibilité de la frise. #709 est libellée enhancement
> mais c'est un défaut visible (deux occurrences d'une même lane se superposent, l'une n'est plus cliquable).

**Vagues :** V1 = #670 (décision de charte puis migration des consommateurs) ∥ #716 | V2 = #709 (E2E exclusif, géométrie ; #670 peut toucher timeline.css)
**Dépend de :** S94 (TimelineView.tsx, fichiers mobiles de #706), S95 (#701 touche CompactAgenda.tsx:128 qui consomme text-ink-faint)
**Migrations Flyway :** aucune

```yaml
issue_709:
  fichiers_cles:
    - "frontend/src/components/timeline/TimelineView.tsx:741 (laneHeight fixe), :906-914 (ensureVisible vertical, navLanes)"
    - "frontend/src/components/timeline/virtualization.ts"
    - "frontend/src/components/timeline/TimelineMobilePortrait.tsx / TimelineMobileLandscape.tsx"
    - "frontend/src/styles/ds/components/timeline.css:729 (.mt-tlm__lane height:44px)"
    - "docs/memory/sprints/sprint-91/maquette-frise-instant-serie.md"
  couches_touchees: ["frontend-timeline", "frontend-timeline-mobile", "ds-css"]
  strategie_test: "unit (layoutLane : première rangée libre, hauteur max(46,…)) + E2E (2 occurrences chevauchantes cliquables, desktop et mobile)"
  risque_regression: "hauteur de lane variable → virtualisation verticale, navigation clavier entre lanes, toutes les specs de géométrie de la frise"
  ordre_ecriture: "fonction pure layoutLane + tests → hauteur variable desktop → virtualisation → mobile → E2E"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "laneHeight unique issu de metrics ; aucun layoutLane."
  ecart_enonce_code: "aucun constaté"

issue_670:
  fichiers_cles:
    - "frontend/src/styles/ds/tokens/colors.css:66 (--gray-400 clair), :145 (#5E626B sombre)"
    - "frontend/src/styles/globals.css:50"
    - "57 occurrences `ink-faint` dans frontend/src (compté par le lead)"
    - "frontend/app/[locale]/(app)/timeline/page.tsx (eyebrow)"
  couches_touchees: ["ds-tokens", "frontend-multi"]
  strategie_test: "E2E mesure de contraste sur les consommateurs textuels + références visuelles régénérées en CI Linux"
  risque_regression: "relever le token change toutes les références visuelles (sprint-77-theme-visual) ; le réserver au non-textuel impose de trier les 57 occurrences"
  ordre_ecriture: "audit textuel / décoratif → décision Designer consignée → migration"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "Token inchangé ; contournement local S85 seulement."
  ecart_enonce_code: "à déterminer (ratios 2,82-2,99 non remesurés)"

issue_716:
  fichiers_cles:
    - "frontend/public/locales/*/products.json:22,59"
  possibly_done: false
  etat_reel_du_code: "Aucun appelant statique trouvé ; clés dynamiques non vérifiées."
  ecart_enonce_code: "aucun"
```
