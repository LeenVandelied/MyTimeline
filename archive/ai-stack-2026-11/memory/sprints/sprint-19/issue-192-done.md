# Issue #192 — Timeline desktop : extraction EventPill

**Statut :** COMPLETED
**Vague :** V1 (parallèle #63)
**Commit :** 5fd7fcd05db4c033a2197b0c98562c28f3363d0d

## Résumé
Extraction du rendu compact d'event de la frise desktop en composant dédié `EventPill.tsx`.
**Décision : composant DÉDIÉ, PAS réutilisation d'EventContent.** La vraie pastille compacte était le `<button className="mt-tlv__evt">` INLINE de `TimelineView` (L401-424), pas `EventBar.tsx`. EventBar (#47, fenêtre fixe 30j + EventContent lourd) n'est PAS consommé par TimelineView. EventContent = rendu riche calendrier ; EventPill = pastille légère (point statut + titre tronqué) ouvrant EventDrawer.

## Fichiers clés
- `frontend/src/components/timeline/EventPill.tsx` (nouveau)
- `frontend/src/components/timeline/TimelineView.tsx` (branche `<EventPill>`, retrait import `statusToVar`)
- `frontend/src/components/timeline/fixtures.tsx` (`makePositionedEvent` px-based)
- `frontend/src/components/timeline/index.ts` (barrel)
- `EventPill.stories.tsx`, `EventPill.test.tsx`

## BR touchées
- BR-EVE-009 : encre calculée par `contrastInk` (lib/color.ts) poussée dans `--mt-evt-ink` → fin du fallback `#fff` hardcodé (illisible sur fonds clairs).

## data-testid préservés
OUI — `timeline-event` + `data-event-title` (vérifiés par TimelineView.test.tsx L81-84 + EventPill.test.tsx).

## Tests
6 Vitest EventPill + 12 TimelineView = 18 verts. `tsc --noEmit` OK, eslint OK.

## [MEMORY:*] signaux
- **[MEMORY:decision]** Extraire EventPill depuis le bouton inline `mt-tlv__evt` de TimelineView, PAS depuis EventBar. EventBar (#47) et EventContent ne sont jamais montés par TimelineView (frise #55 reste px-based) → EventBar = brique orpheline fenêtre-30j.
- **[MEMORY:pattern]** Pastille event : texte blanc hardcodé (`--mt-evt-ink,#fff`) illisible sur fonds clairs. Solution : `contrastInk(event.color)` poussé dans `--mt-evt-ink`. Anti-pattern : hardcoder `text-white`/`#fff` sur fond couleur variable (BR-EVE-009).

## Recommandations suite
- **RECOMMAND_FOLLOWUP** : `EventBar.tsx` + `Lane.tsx` désormais briques #47 ORPHELINES (aucun consommateur runtime, seulement leurs stories). À statuer : retirer/déprécier ou documenter usage futur mobile. [triage S | domaine events]
- **⚠ Merge overlap** : `TimelineView.tsx` modifié par #192 (réservé #192 mais #63 isole le switch desktop/mobile en parallèle). Modif volontairement minimale (bloc button → `<EventPill>` + retrait import). À arbitrer vs #63.

STATUS: COMPLETED
