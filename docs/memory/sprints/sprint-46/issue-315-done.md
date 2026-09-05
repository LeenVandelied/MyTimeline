# Issue #315 — Aperçu live du drawer de création : mini-frise conforme au handoff §6

**Sprint :** 46 | **Vague :** 1 | **Taille :** M | **Domaine :** events / design
**Commits :** `7c108c0`

## Résumé

Aperçu live du drawer de création passé du bloc coloré (`DEC-S44-002`) à la **mini-frise handoff §6**.

- Nouveau `frontend/src/components/events/EventPreviewTimeline.tsx` — règle + marqueur TODAY + barre pleine
  + connecteur pointillé + occurrence fantôme + légende.
- Géométrie pure extraite dans `frontend/src/components/events/previewTimeline.ts`.
- Réutilisation `Ruler` / `Cursor` (#47) via prop **additive `gutterPercent`** (défaut 15 = comportement
  inchangé, 0 = pleine largeur) + classes DS `.mt-evt` / `.mt-evt--draft` / `.mt-recur` / `.mt-tlv__today-badge`.
- `frontend/src/components/EventEditForm.tsx` : bloc aperçu remplacé ; `startDate` / `endDate` ajoutées au
  débounce 150 ms → **BR-EVE-009 préservée**.
- BR miroir côté client : BR-EVE-003 (fin dérivée de la durée, clamp fin de mois façon `java.time`),
  BR-EVE-005, BR-EVE-006 (pas de fantôme sans fréquence).
- i18n `products.details.previewTimeline.{label,nextOccurrence}` sur les 4 locales.

**`EventBar` volontairement NON réutilisé** : il porte `data-testid="timeline-event"` en dur → l'embarquer
dans le drawer aurait cassé `e2e/sprint-42-events.spec.ts:273` (`toHaveCount(0)`) dès l'ouverture d'un formulaire.

## Tests

589 vitest verts (23 nouveaux, run 10 s) | `tsc --noEmit` OK | lint OK | `next build` OK.

## data-testid posés (requis par #314 en S47)

`event-form-preview` (conservé), `event-form-preview-recurrence` (conservé), `event-form-preview-timeline`,
`event-form-preview-ruler`, `event-form-preview-today`, `event-form-preview-bar`, `event-form-preview-ghost`,
`event-form-preview-connector`, `event-form-preview-legend`

## Signaux mémoire

- `[MEMORY:pitfall]` — Réutiliser un composant frise dans un aperçu : `EventBar` porte
  `data-testid="timeline-event"` en dur ; l'embarquer ailleurs pollue les compteurs E2E (`toHaveCount(0)`).
  Prévention : un composant partagé destiné à plusieurs surfaces doit avoir un testid **paramétrable**,
  sinon composer les classes DS.
- `[MEMORY:pattern]` — Adapter une primitive frise à une surface sans lanes : prop additive `gutterPercent`
  (défaut = valeur historique 15) sur `Ruler` + `Cursor`, même valeur des deux côtés.
  Anti-pattern : dupliquer une 2ᵉ règle / curseur.

## Recommandations suite — NON FAIT / NON VÉRIFIÉ

1. **Aperçu sticky en haut du drawer** (handoff §6) non implémenté : l'aperçu reste à sa position actuelle
   dans le formulaire. Le hisser impliquerait `NewEventDrawer` et changerait les surfaces d'édition partagées
   → `RECOMMAND_FOLLOWUP` design [S | events/design].
2. **Aucun rendu visuel vérifié** — clair/sombre reposent sur les tokens DS, sans inspection navigateur.
3. Pas de story Storybook pour `EventPreviewTimeline`.
4. E2E non exécutés (gate CI uniquement).

STATUS: COMPLETED
