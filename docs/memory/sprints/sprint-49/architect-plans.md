# Mini-plans architect — Sprint 49

> Généré par /sprint plan 5 (architect, 2026-07-16). Lu par /sprint start Phase 4.1.
> **Sprint mono-issue assumé** (#69 seul) — L avec mesure baseline + mesure après + ADR de choix de lib.
> #219 volontairement laissée au backlog (son body admet que les listes réelles restent courtes → valeur démo nulle,
> ne servait qu'à atteindre 10 points = remplissage).

```yaml
issue_69:
  fichiers_cles:
    - "frontend/src/components/timeline/TimelineView.tsx"           # vérifié (27.1K) — VRAIE cible desktop
    - "frontend/src/components/timeline/zoom.ts"                    # vérifié (10.9K) — calcul des positions, type PositionedEvent
    - "frontend/src/components/timeline/lib.ts"                     # vérifié (10.1K) — buildEventsByResource, getDaysRange
    - "frontend/src/components/timeline/TimelineMobilePortrait.tsx" # vérifié (10.8K)
    - "frontend/src/components/timeline/TimelineMobileLandscape.tsx"# vérifié (11.7K)
    - "frontend/src/components/timeline/Lane.tsx"                   # vérifié
    - "frontend/src/components/timeline/lib-a11y.test.ts"           # vérifié (3.4K) — filet a11y à ne pas casser
    - "frontend/package.json"                                       # vérifié : AUCUNE dép de virtualisation (grep 'virtual' = 0 hit)
    - "frontend/src/components/calendar/TimelineCalendar.tsx"       # vérifié : 114 lignes, MORT — NE PAS Y TOUCHER
  couches_touchees: ["frontend"]
  strategie_test: "unit+E2E"
  risque_regression: |
    ⚠ LE RISQUE LE PLUS COUTEUX DU PLAN — le corps d'origine de #69 désignait `TimelineCalendar` comme cible :
    c'est FAUX. Vérifié indépendamment par le lead (grep : aucune page ne le monte, que des auto-références
    et des commentaires). `TimelineEditHost.tsx:18` le documente : « PLUS AUCUNE page ne rend » (régression S17).
    Virtualiser TimelineCalendar = 8 points livrés sur du code mort, zéro gain démo.
    → Périmètre CORRIGE sur l'issue GitHub le 2026-07-16 (commentaire du lead).
    Vrai chemin de rendu : TimelineEditHost → TimelineResponsive → TimelineView / TimelineMobile*.
    Second risque : la virtualisation démonte des nœuds focusables → lib-a11y.test.ts
    + la navigation clavier de TimelineView sont le filet.
  ordre_ecriture: "mesure baseline (performance.mark) → choix lib (ADR) → TimelineView → vues mobiles → mesure après → E2E"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(travail réel — aucune dép de virtualisation, positions calculées en une passe dans zoom.ts. La piste technique de l'issue était périmée : corrigée.)"
```

## Vagues
- Mono-issue : #69 seul.

## Dépendances
- **Dépend de S47** (couverture E2E frise) — « #69 après stabilisation /timeline » (plan S44).
  Sans le filet E2E, la virtualisation se valide à l'aveugle.

## Suite possible (hors périmètre)
`TimelineCalendar.tsx` (114 lignes, mort depuis S42) est candidat à la **suppression** — issue dédiée à ouvrir, ne pas absorber ici.
