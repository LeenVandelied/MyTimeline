# Issue #195 — Fix review-pr PR #303 (2 MINEUR)

RETOUR :
- commits: bf30779b4c869a779e693f087e9c0156d9f19568
- resume:
  - [FIX-1] timeline.css:123 `.mt-tlv__lane-head-text` — ajout `min-width:0; flex:1 1 auto;`. Flex item ne rétrécit pas sous largeur contenu (min-width:auto défaut) → ellipsis jamais déclenchée, titre long hard-clippé par parent max-width:160px. Grep : 2 usages seulement (CSS + 1 span TSX l.633), aucun autre cassé.
  - [FIX-2] TimelineView.tsx — `npx prettier --write` (script `format` = prettier). Ré-indentation pure corps callback `laneEvents.map` sous wrap `{!isResCollapsed && ...}`. Diff 24/24 lignes, zéro changement fonctionnel (vérifié).
  - [TESTS] `./scripts/test-quiet.sh frontend` depuis worktree → 456/456 VERT (62 fichiers). Pas de régression.
- [MEMORY:pitfall] Context: flex item avec overflow:hidden+text-overflow:ellipsis dans conteneur inline-flex/flex. Solution: ajouter `min-width:0` (défaut min-width:auto empêche rétrécissement sous largeur contenu). Prevention: tout enfant flex qui doit tronquer en ellipsis exige min-width:0 (piège récurrent flexbox).
- recommandations suite: aucune (E2E timeline-resource-head = follow-up post-merge déjà arbitré par lead).

STATUS: COMPLETED
