# Audit tests — Sprint 108

> Généré en fin de Phase 6. Tableau de bord : ruban des 30 prochains jours (#623), « En bref » (#640), arbitrages #699.

## Couverture par règle / décision

| Règle | Description | Flux multi-systèmes | Unit backend | Intégration | Vitest frontend | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| DEC-S108-004 / DEC-S82-007 | « En bref » : 4 phrases (semaine + récurrents, échéances ≤ 14 j, couvertures en cours, catégorie la plus chargée du mois) | NON | N/A | N/A | ✅ `kpis.test.ts` (14), `KpiMarginalia.intl.test.tsx` (17) | ✅ `sprint-108-en-bref` | ✅ compteurs exacts + égalité avec « Cette semaine » |
| BR-EVE-011 | Archivés exclus des KPI | NON | N/A | N/A | ✅ | ✅ (événement archivé dans le stub) | ✅ |
| BR-EVE-018 | Catégorie = catégorie du produit | NON | N/A | N/A | ✅ | ✅ | ✅ |
| DEC-S108-003 | Ruban : fenêtre future, règle 5 j, viewport 9 j (pointeur, clavier, multi-touch) | NON | N/A | N/A | ✅ `densityWindow.test.ts` (22), `DensityRibbon.window.test.tsx` (27) | ✅ `sprint-108-density-ribbon` | ✅ glisser réel, clamp, clavier, 375 px |
| DEC-S108-001/002 | Cible tactile, piste vide (aucun code) | NON | N/A | N/A | N/A | ✅ `sprint-101-touch-targets` (existante, verte) | N/A |

Aucun flux multi-systèmes : sprint 100 % frontend, sans endpoint ni migration.

## Tests créés
- `frontend/src/components/dashboard/kpis.test.ts`, `KpiMarginalia.intl.test.tsx` (#640)
- `frontend/src/components/dashboard/densityWindow.test.ts`, `DensityRibbon.window.test.tsx` (#623, plus le test multi-touch issu de la revue)
- `frontend/e2e/sprint-108-en-bref.spec.ts`, `frontend/e2e/sprint-108-density-ribbon.spec.ts`

## Résultats des runs
- Vitest : 165 fichiers, 2136/2136 (après le correctif de revue). tsc, lint et format verts. `next build` OK.
- Mutations : 5 sur `kpis.ts` (#640) et 6 sur le ruban (#623), toutes détectées. La garde `pointerId` a été vérifiée par mutation par le lead.
- E2E ciblées sur `next build` + `next start` `:3107`, relais `:8187` → backend `:8086` : 9 specs (nouvelles + toutes celles qui citent la surface), **95/95**. Nouvelles specs et `sprint-84-section-titles` en `--repeat-each=3` : **86/86**.
- E2E suite complète : **581 passés / 9 sautés / 11 rouges hors sprint**, les mêmes qu'aux S105-S107 : 10 captures `sprint-77-theme-visual` sans référence darwin, et `sprint-101-fab-landscape:271` (#769). Les 10 PNG darwin générés ont été supprimés.
- Sonde lead (jetable, supprimée) à 1280×800 en clair, sombre et `de`, puis à 375 px en fr et `de` : aucun débordement horizontal ; dernier titre de section à 633 px (≤ 800) ; carte du ruban de 173 px à 1280. Glisser au pointeur vérifié visuellement.

## Non vérifié
- Le correctif `pointerId` (69d8691b) n'a pas été rejoué en E2E local, car la pile avait été bâtie avant ce commit. Couvert par Vitest et par mutation. La CI rejoue l'E2E.
- Firefox, WebKit, vrai multi-touch sur appareil.
- Hauteur de l'en-tête du ruban à 375 px mesurée seulement sur les captures (fr, `de`), pas par une assertion.

## Conclusion
Prêt pour la PR. Aucun `[MISSING]`.
