# Audit tests — Sprint 82

> Généré en fin de Phase 6. Un marqueur de couverture manquante bloquerait la Phase 9 (PR).
> Sprint 100 % tests : **aucune ligne de code de production modifiée**
> (`git diff origin/dev..HEAD -- frontend/src/components/timeline/` rend vide ;
> le seul fichier sous `src/` ajouté est un `.test.tsx`).

## Couverture par règle / comportement

| Réf | Description | Cross-system flow | Unit backend | Integration | vitest frontend | E2E parcours | E2E métier |
|-----|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| BR-EVE-017 | Aperçu live débouncé à 150 ms, jamais rebranché sur `watch()` brut | NON | ⚠ N/A (frontend pur) | ⚠ N/A | ✅ `EventEditForm.debounce.test.tsx` (3 tests, fake timers) | ⚠ N/A | ⚠ N/A |
| BR-EVE-012 | Hint de plafond de récurrence (`capped`) | OUI (front ↔ `POST /api/events/recurrence-preview`) | ✅ pré-existant (#452) | ✅ pré-existant | ✅ 5 tests pré-existants (hook mocké) | ✅ `sprint-82-recurrence-capped-hint.spec.ts` (4 états) | ✅ idem — parcours réel, réseau non mocké |
| — (contrainte UI #449/#451) | Ancrage temporel au changement d'échelle, sens **AVANT** | NON | ⚠ N/A | ⚠ N/A | ⚠ N/A (jsdom ne clampe pas `scrollLeft`) | ✅ `timeline.spec.ts` bloc `#477` (2 tests, 2 couples de niveaux) | ⚠ N/A |

Aucune case de couverture manquante : toutes les lignes sont couvertes ou explicitement N/A avec motif.

## Pouvoir discriminant — mesuré, pas déclaré

Le sprint ne livrant que des tests, c'est le seul critère qui compte. Les trois gardes ont été
vues ROUGES sur la violation qu'elles prétendent détecter :

| Test | Contrôle négatif appliqué | Sortie rouge obtenue |
|---|---|---|
| `EventEditForm.debounce.test.tsx` | `previewTitle`/`previewColor`/`previewStartDate` rebranchés sur `watch()` brut | 3 failed — `Expected "Mon événement" / Received "Refonte"`, `'#FF0000'` vs `'#3B82F6'`, `'2026-04-20'` vs `'2026-05-01'` |
| `sprint-82-recurrence-capped-hint.spec.ts` | `page.route().fulfill()` épinglant `capped` dans les deux sens (spec jetable, non commitée) | 2 failed / 5 passed — hint absent quand attendu visible, et présent quand attendu absent |
| `timeline.spec.ts` bloc `#477` | `if (Date.now() > 0) return` en tête du `useLayoutEffect` sur `[dayWidth]` (`TimelineView.tsx:895`), source restaurée ensuite | 2 failed / 5 passed — `toHaveCount(1)` reçoit `0` : la pastille du jour 120 sort de la bande de virtualisation |

Restauration du source vérifiée après le contrôle négatif de #477 :
`rtk proxy git diff HEAD -- frontend/src/` rend VIDE.

## Résultats des runs (locaux, ce poste)

- **Backend (JUnit)** : 581 tests, **581 passed**, 0 failed. Non-régression pure (aucun fichier
  backend touché par ce sprint).
- **Frontend (vitest)** : 1333 tests, **1333 passed**, 0 failed. Dont les 3 nouveaux tests de
  debounce et les 26 de `NewEventDrawer.test.tsx`.
- **E2E Playwright (chromium, suite complète)** : **304 passed / 10 failed / 8 skipped**, 5,6 min.
  Pile dédiée `mtl-s82` (backend `:8087`, postgres `:5437`), front `npx next dev` (webpack).
  Oracle double vérifié avant le run : `/api/auth/me` → **401**, `/fr/login` → **200**.

### Les 10 échecs E2E — cause mesurée, non imputable au sprint

Tous dans `sprint-77-theme-visual.spec.ts`. Message exact :
`Error: A snapshot doesn't exist at ...-chromium-darwin.png, writing actual.`

`git ls-files` sur le dossier de références ne rend que des `*-chromium-linux.png` (10 fichiers) :
le S77 a régénéré les références **sur l'image du runner** (commit `e513450`, noble 24.04). Sur un
poste macOS, Playwright cherche des références `darwin` qui n'ont jamais existé dans le dépôt.

- Le sprint 82 ne touche ni cette spec ni ces références (`git diff origin/dev..HEAD` sur ces
  chemins : vide).
- Ce n'est pas de la flakiness : la cause est un fichier absent, déterministe.
- **Aucune régénération n'a été faite.** `--update-snapshots` grave la mutation d'armement dans la
  référence, et une référence macOS n'aurait aucune valeur pour la CI Linux.
- Les 9 captures `*-darwin.png` écrites par Playwright pendant ce run ont été **supprimées** du
  working tree avant la PR.

## Ce qui N'A PAS été vérifié — à assumer

- **Aucun run CI GitHub Actions à ce stade.** Tous les chiffres ci-dessus sont locaux, macOS,
  chromium. La CI est la seule mesure qui vaut pour les 10 échecs visuels.
- **Firefox / WebKit non joués** (le projet `firefox` est restreint par `testMatch` à une autre spec).
- **Couverture de BR-EVE-017 par échantillon** : la garde porte sur le titre, la couleur et
  `startDate`. Rebrancher `previewEndDate` seul sur `watch()` brut ne ferait rougir aucun test.
  La coalescence (N frappes → 1 rendu) n'est pas testée non plus.
- **Bornes de bande de virtualisation** du bloc `#477` (`[672, 2872]`…) : dérivées de la mesure
  #451, non relues à l'exécution. La spec asserte leur conséquence (pastille montée / démontée),
  pas les bornes elles-mêmes.
- **Couples de zoom encore non couverts** : Trimestre↔Année (2,2 px/j, arrondi le moins précis) et
  l'entrée `Cmd`+molette (`TimelineView.tsx:1012`, handler `wheel` séparé — seule des 4 entrées
  sans spec d'ancrage).

## Conclusion

Prêt pour PR. Suites unitaires vertes, suite E2E verte hors 10 échecs dont la cause est mesurée et
étrangère au sprint. Les trois gardes livrées ont été vues rouges sur la violation qu'elles
protègent — c'est le critère d'acceptation commun aux trois issues, et il est satisfait.
