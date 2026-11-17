# Issue #55 — Vue Timeline desktop — RETOUR

commits: [c46c936]

resume:
- Objectif LIVRÉ : frise horizontale continue scrollable (plus de fenêtre 30j figée), zoom Cmd+molette 5 niveaux (jour/semaine/mois/trimestre/année) sans refetch, règle sticky adaptative (graduations dynamiques par zoom), minimap waveform draggable (souris + clavier flèches/Home/End), accordéons catégorie (expand/collapse), drawer détail (clic bloc, trap-focus + Échap), raccourcis T/[/]/+/-/F/Échap + tooltip `?`, overlay week-end continu (jour/semaine), indicateur TODAY (ligne + badge sur règle).
- BR touchée : BR-EVE-001 respectée — `TimelineView` n'affiche que les events reçus en props (filtrés user côté data #48), non contournée. Zoom = pur re-rendu client (aucun hook réseau monté).
- Fichiers clés :
  - `frontend/src/components/timeline/zoom.ts` (cœur pur testable : reducer zoom useReducer, computeRange, positionEvents px, buildRulerTicks, buildMinimapBuckets, buildWeekendSegments)
  - `frontend/src/components/timeline/TimelineView.tsx` (orchestrateur, réutilise Resource/groupResourcesByCategory #47)
  - `Minimap.tsx`, `EventDrawer.tsx` (nouveaux), `index.ts` (barrel étendu)
  - `frontend/src/styles/ds/components/timeline.css` (+ classes `.mt-tlv*`, `.mt-drawer*`, `.mt-minimap__bar--filled`, focus-visible minimap/drawer — composées sur tokens existants, AUCUN nouveau token)
  - `frontend/src/styles/globals.css` (import `ds/components/core.css` + `timeline.css` — jusqu'ici non chargés « scope #45 » : nécessaire pour que les classes `.mt-*` s'appliquent en prod ; aucune régression, les rares consommateurs de `.mt-*` — ui/tabs|tooltip|table — ne sont utilisés nulle part dans l'app)
  - `frontend/app/[locale]/dashboard/page.tsx` (TimelineCalendar→TimelineView ; toolbar mois prev/next retirée — nav intégrée à la vue ; suppression code mort currentDate/dayjs/ChevronLeft)
  - i18n : bloc `dashboard.timeline.*` + `common.buttons.close` sur les 4 locales (fr/en/es/de)
- Décision .mt-* vs Tailwind : MIGRÉ vers `.mt-*` (décision Designer S17). TimelineView/Minimap/EventDrawer 100% `.mt-*`, zéro Tailwind arbitrary. `TimelineCalendar.tsx` (ancien, #47) laissé intact (hors scope, plus consommé par l'app mais stories #47 non régressées).
- Pitfalls rencontrés :
  1. `globals.css` n'importait PAS les composants DS → les classes `.mt-*` n'existaient pas en runtime (raison pour laquelle #47 utilisait du Tailwind arbitrary). Fix : ajout des `@import core.css/timeline.css`.
  2. Concaténation de classes en template-literal (`` `mt-x${cond?' mt-y':''}` ``) : l'espace de séparation a été perdu (classes collées `mt-xmt-y`, invalides). Remplacé par ternaires explicites / `[...].filter(Boolean).join(' ')`.
  3. Worktree SANS node_modules → `npx tsc/vitest` auto-installaient hors config projet (faux vert). Fix : `npm install --prefer-offline` dans le worktree avant de lancer tsc/vitest/next build réels.
- Tests : `zoom.test.ts` (20) + `TimelineView.test.tsx` (8) = 28 nouveaux. Suite FRONTEND COMPLÈTE : 113/113 passed (18 fichiers), 0 failed. Aucune régression #47/autres. `tsc --noEmit` OK, `next lint` OK, `next build` OK (22/22 pages), prettier OK.

deps ajoutées: AUCUNE. `@tanstack/react-virtual` NON ajouté — la frise rend des blocs absolus par lane (coût O(events), pas O(jours)) ; la virtualisation n'est justifiée qu'au-delà de ~500 events (cf. RECOMMAND ci-dessous). `zustand` NON ajouté — zoom via `useReducer` local. Réutilisé framer-motion(présent)/lucide-react/Intl natif.

[MEMORY:pitfall] Context: classes DS `.mt-*` non stylées en runtime. Solution: globals.css n'importait pas ds/components/*.css (« scope #45 ») ; ajout des @import core+timeline. Prevention: avant de migrer un composant vers `.mt-*`, vérifier que la feuille DS correspondante est bien chargée par globals.css (pas seulement styles.css du DS, non linké par l'app).
[MEMORY:pitfall] Context: concat de classes CSS en template string. Solution: l'espace séparateur peut sauter (`mt-xmt-y`) ; préférer ternaire renvoyant la classe complète ou `[...].filter(Boolean).join(' ')`. Prevention: éviter `` `base${c?' mod':''}` ``, source silencieuse de classes invalides.
[MEMORY:decision] Context: virtualisation horizontale (#55 piste react-virtual). Décision: NON introduite. Why: rendu par blocs absolus (pas 1 nœud/jour) → coût lié au nombre d'events, acceptable au volume MVP ; ajouter react-virtual serait de la complexité non justifiée avant mesure. Seuil de re-décision : >500 events actifs (BR-EVE-011 tier PRO).

recommandations suite:
- Pas de RECOMMAND_TEST_RUNNER car suite frontend = 113 tests, ~3.5s (< seuils 500/3min).
- RECOMMAND_FOLLOWUP (perf Wave 7) : virtualisation horizontale/verticale à activer si un user dépasse ~500 events actifs (blocs DOM + minimap buckets à débouncer). Anticipé, non bloquant MVP.
- RECOMMAND_FOLLOWUP (a11y) : `.claude/rules-jit/ux-patterns.md` ABSENT → patterns clavier (roving tabindex sur blocs, focus-trap drawer) implémentés selon jugement, non validés par ui-design. À faire re-passer par le designer quand la règle existera. Focus visible garanti via `:focus-visible` DS sur blocs event / minimap vp / drawer / group-head.
- Pitfall subtil : les events blocs sont des `<button>` réels (focusables/tabbables) — pas de nœuds virtualisés hors DOM, donc pas de casse tab pour l'instant ; si virtualisation ajoutée plus tard, prévoir roving tabindex (le risque #55 « virtualisation vs a11y » redeviendra actif).

STATUS: COMPLETED
