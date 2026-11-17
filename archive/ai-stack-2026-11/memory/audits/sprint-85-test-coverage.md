# Audit tests — Sprint 85

> Généré en fin de Phase 6 par le lead. Tous les chiffres ci-dessous ont été **mesurés par le lead
> depuis le worktree** (branche `claude/sprint-85-start-832373`), pas repris des rapports d'agents.
> Un marqueur de couverture manquante dans le tableau ci-dessous bloquerait la Phase 9 (PR).

## Couverture par issue / critère

Aucune BR backend touchée : `git diff origin/dev..HEAD -- backend` est **vide** (sprint 100 % frontend).
Décisions couvertes : DEC-S85-001 (compteur = produits), DEC-S85-002 (légende limitée aux marques
rendues), DEC-S85-003 (jamais deux déclencheurs de création peints), DEC-S85-004 (sidebar repliée
sous 1024 px), DEC-S85-005 (opt-in `/timeline`), DEC-S85-006 (couleur de catégorie + repli neutre).

| Sujet | Cross-system flow | Unit frontend | E2E parcours | Vérif navigateur (lead) |
|---|:---:|:---:|:---:|:---:|
| #592 filtres par catégorie (`hiddenCats` ≠ `collapsed`) | NON | ✅ `TimelineView.test.tsx`, `TimelineSidebar.test.tsx` | ✅ `sprint-85-timeline-sidebar.spec.ts` | ✅ catégorie masquée : barrée + groupe retiré de la frise |
| #592 légende visible sans interaction (DEC-S85-002) | NON | ✅ `TimelineSidebar.test.tsx` | ✅ `sprint-85-timeline-sidebar.spec.ts` | ✅ bloc « Légende — Événement » rendu au chargement |
| #592 tout plier / tout déplier | NON | ✅ `TimelineView.test.tsx` | ✅ `sprint-85-timeline-sidebar.spec.ts` | ✅ |
| #592 sidebar sous 1024 px (DEC-S85-004) | NON | ✅ `TimelineSidebar.test.tsx` (panneau, Échap, focus rendu) | ✅ `sprint-85-timeline-sidebar.spec.ts` (900 px) | ✅ bouton « Filtres » + panneau superposé à 900 px |
| #592 navigation clavier sous filtre (coordonnées `navLanes`) | NON | ✅ `TimelineView.test.tsx` (masquage d'une catégorie au-dessus) | ✅ `sprint-85-timeline-sidebar.spec.ts` | ✅ anneau de focus réel au Tab : 2 px, `:focus-visible` actif |
| #601 pastille + compteur d'en-tête (DEC-S85-001/006) | NON | ✅ `TimelineGroupHead.test.tsx` (pluriel ICU 4 locales, couleur nulle → contour) | ✅ `sprint-85-timeline-group-head.spec.ts` | ✅ pastille et compteur peints, contour neutre pour « Logement » (sans couleur) |
| #601 résumé de catégorie repliée, suivant zoom et défilement | NON | ✅ `TimelineGroupHead.test.tsx` (fenêtrage) | ✅ `sprint-85-timeline-group-head.spec.ts` (alignement x sur les pastilles, zoom) | ✅ barrette rendue dans la piste de l'en-tête replié |
| #601 en-tête sticky horizontalement (défaut antérieur corrigé) | NON | N/A (jsdom ne calcule pas `position:sticky`) | ✅ `sprint-85-timeline-group-head.spec.ts` (`scrollLeft > 0`) | ✅ |
| #601 hauteur d'en-tête identique plié/déplié (virtualisation) | NON | ✅ `TimelineGroupHead.test.tsx` + garde de dérive `DEFAULT_METRICS.headHeight = 40` | ✅ `sprint-85-timeline-group-head.spec.ts` | ✅ |
| Correctif de revue : hiérarchie en-tête de catégorie vs lane | NON | N/A (styles issus d'une feuille CSS externe — jsdom ne les calcule pas) | ✅ `sprint-85-timeline-group-head.spec.ts` (`getComputedStyle` : fond, graisse, retrait ; contrôle négatif joué) | ✅ clair et sombre |
| #602 boutons Aujourd'hui et Nouvel événement | NON | ✅ `TimelineToolbarActions.test.tsx`, `TimelineView.test.tsx`, `AppShell.test.tsx` | ✅ `sprint-85-timeline-toolbar.spec.ts` | ✅ |
| #602 un seul déclencheur de création peint (DEC-S85-003) | NON | ✅ `AppShell.test.tsx` (un seul `NewEventDrawer` monté) | ✅ `sprint-85-timeline-toolbar.spec.ts` (700/767 px : FAB seul) | ✅ à 900 px : bouton de barre + nav, pas de FAB |
| DEC-S85-005 : dashboard et fiche produit inchangés | NON | ✅ `TimelineView.test.tsx` (`layout` par défaut) | ✅ `sprint-85-timeline-toolbar.spec.ts` + suite frise existante | ✅ dashboard sondé : 0 sidebar, 0 bouton Aujourd'hui, 0 bouton Nouvel événement |

Aucune ligne « cross-system flow = OUI » : aucun E2E métier n'est requis (sprint d'interface,
aucun flux multi-systèmes ni multi-rôles ; zéro ligne de backend modifiée).

## Tests créés

- `frontend/e2e/sprint-85-timeline-sidebar.spec.ts` (#592)
- `frontend/e2e/sprint-85-timeline-group-head.spec.ts` (#601 + garde de hiérarchie du correctif)
- `frontend/e2e/sprint-85-timeline-toolbar.spec.ts` (#602)
- `frontend/src/components/timeline/TimelineSidebar.test.tsx`, `TimelineGroupHead.test.tsx`,
  `TimelineToolbarActions.test.tsx` ; extensions de `TimelineView.test.tsx` et `AppShell.test.tsx`

## Résultats mesurés par le lead

- **Frontend (`./scripts/test-quiet.sh frontend`)** : OK — `next build` 52/52 pages,
  **127 fichiers / 1511 tests passés / 0 échec**, typecheck OK, lint OK.
- **Formatage** : `rtk proxy npm run format:check` → « All matched files use Prettier code style »
  (le script ci-dessus ne lance pas cette étape, que la CI exige).
- **E2E complète, base e2e recréée à vide** (`docker compose --profile e2e down -v && up`) :
  **370 passés / 8 sautés / 1 échec en 6,9 min**. L'unique échec est
  `sprint-77-theme-visual.spec.ts:565` « armement de la comparaison » : sur macOS, la référence
  attendue est suffixée `-chromium-darwin` et n'existe pas (les références du dépôt sont
  `-chromium-linux`), donc le contrôle d'armement échoue mécaniquement sous `--ignore-snapshots`.
  Comportement connu et attendu hors Linux ; c'est la CI qui juge le visuel.
- **Backend** : non modifié, non rejoué localement (la CI le joue).

## Couverture E2E des nouveaux testids (heuristique Phase 8)

19 testids ajoutés ; 18 cités par une spec E2E. Le seul non cité, `screen-trigger`, est un
montage interne de `AppShell.test.tsx` (fichier de test), pas un testid de produit.

## Conclusion

Couverture complète : chaque critère d'acceptation des trois issues a au moins un test unitaire ou
une spec E2E, et les points que jsdom ne peut pas prouver (sticky, styles calculés, mise en page)
sont couverts en E2E ou par vérification navigateur du lead. Prêt pour la PR.
