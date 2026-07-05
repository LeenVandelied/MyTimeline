## Sprint 17 — Vue Timeline desktop

Réécriture de la vue Timeline events sur les sous-composants extraits en #47, avec couche data TanStack (#48). Sprint frontend-only, cohésion 0.72 (epic:events).

### Objectif
Remplacer la fenêtre 30 jours figée par une frise horizontale continue, navigable, avec zoom multi-niveaux, minimap, drawer détail et raccourcis clavier — la fonctionnalité centrale du produit.

### Issue traitée
- Closes #55 — [FEATURE] Frontend : Vue Timeline desktop (L / P1)

### Changements clés
- **Frise continue** scrollable (fin de la fenêtre 30 j codée en dur) — blocs positionnés en absolu, coût O(events).
- **Zoom Cmd+molette** 5 niveaux (jour → semaine → mois → trimestre → année), **sans refetch réseau** (pur re-rendu client).
- **Règle temporelle sticky** adaptative au niveau de zoom (graduations dynamiques).
- **Minimap waveform** draggable (souris + clavier) avec fenêtre de sélection.
- **Accordéons** catégorie/produit (expand/collapse).
- **Drawer** détail événement (trap-focus + Échap + restauration focus).
- **Raccourcis clavier** : `T` `[` `]` `+` `-` `F` `Échap` `?` (tooltip d'aide), ignorés quand on tape dans un champ.
- **Overlay week-ends** + indicateur **TODAY** (ligne + badge).
- Migration **100 % vers les classes DS `.mt-*`** (`timeline.css`), zéro Tailwind arbitrary résiduel (décision Designer S17). Ancien `TimelineCalendar.tsx` (#47) laissé intact.
- i18n complet (fr/en/de/es).

### Nouveaux fichiers
`timeline/zoom.ts` (cœur pur), `timeline/TimelineView.tsx`, `timeline/Minimap.tsx`, `timeline/EventDrawer.tsx` + tests `zoom.test.ts`, `TimelineView.test.tsx`.

### BR impactées
- **BR-EVE-001** (event↔user) : la frise n'affiche que les events de l'utilisateur. Enforcement backend inchangé (`getProducts(userId)`) ; la vue consomme des props pré-filtrées, le zoom ne déclenche aucun appel réseau (prouvé par test spy `fetch`).

### Audit tests
`docs/memory/audits/sprint-17-test-coverage.md` — **115/115 frontend verts**, 0 TS error, `next build` 22/22, aucune régression #47. BR-EVE-001 couverte (unit + hook + golden-path E2E).

### Review (batch)
0 CRITIQUE / 1 MAJEUR / 4 MINEUR — **tous résolus** (commit `388511c`) :
- MAJEUR : drag du handle minimap cassé (`stopPropagation`) → corrigé.
- MINEURs : transition drawer (CSS morte retirée), test zoom zéro-réseau ajouté, aria-label bloc event, dédup formatters Intl.

### Follow-up (non bloquant)
- **E2E interactions Timeline** : 18/19 nouveaux `data-testid` sans spec dédiée. Plan : `/create-e2e` après merge (parcours zoom/minimap/drawer).
- **Perf Wave 7** : virtualisation horizontale si > 500 events actifs (blocs DOM + debounce minimap) — `@tanstack/react-virtual` volontairement non ajouté ici.

### Dépendances
- Nécessite #47 (composants extraits) et #48 (TanStack) — tous deux mergés dans `dev`.
- **Aucune dépendance npm ajoutée** (useReducer local pour le zoom, pas de Zustand).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
