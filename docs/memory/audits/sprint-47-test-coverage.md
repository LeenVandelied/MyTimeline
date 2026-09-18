# Audit tests — Sprint 47

> Généré en fin de Phase 6. Sprint **100 % couverture** : aucun composant applicatif modifié,
> donc aucune règle métier altérée. L'axe d'audit pertinent n'est pas « quelles BR sont testées »
> mais « les testids visés sont-ils réellement couverts ».
>
> **Vérification faite par le lead lui-même** (`grep` sur `frontend/e2e/`), pas reprise des
> déclarations des subagents.

## 1. Périmètre du sprint — testids visés

### #314 — drawer de création + écran `/timeline` (11 testids annoncés)

| Testid | Occurrences dans `frontend/e2e/` | Couvert |
|---|---:|:---:|
| `shell-new-event-drawer` | 20 | ✅ |
| `shell-new-event-drawer-overlay` | 3 | ✅ |
| `shell-new-event-drawer-close` | 1 | ✅ |
| `shell-new-event-drawer-loading` | 3 | ✅ |
| `shell-new-event-drawer-empty` | 2 | ✅ |
| `shell-new-event-drawer-product-trigger` | 4 | ✅ |
| `shell-new-event-drawer-product-error` | 2 | ✅ |
| `event-form-preview-recurrence` | 2 | ✅ |
| `timeline-screen` | 6 | ✅ |
| `timeline-host` | 9 | ✅ |
| `timeline-data-loading` | 6 | ✅ |

**11/11.** Écart COVERAGE-E2E assumé au Sprint 44 (PR #313, « MAJEUR assumé ») : **soldé**.

### #304 — accordéon collapse par produit

| Cible | Couvert | Preuve |
|---|:---:|---|
| `timeline-resource-head` | ✅ | 5 occurrences |
| Bascule `aria-expanded` true→false→true | ✅ | assertion sur l'**attribut** (pas la visibilité — le point dur du plan architect) |
| Pastilles masquées / réaffichées | ✅ | `toHaveCount(0)` / `(1)`, scopé lane + `data-event-title` |
| Indépendance produit voisin + catégorie parente | ✅ | 2 produits d'une même catégorie, `timeline-group-head` asserté |

### #205 — vues mobiles portrait / paysage

| Famille de testids | Couvert |
|---|:---:|
| `timeline-mobile-portrait` / `timeline-mobile-landscape` | ✅ |
| `timeline-sheet`, `timeline-sheet-close` | ✅ |
| `timeline-actionsheet`, `-cancel`, `-delete`, `-edit` | ✅ |
| `timeline-landscape-drawer`, `-close` | ✅ |
| `timeline-minimap-toggle` | ✅ |

23 testids mobiles couverts. `timeline-view` asserté **absent** en mobile (garde anti-régression sur
la bascule `useMediaQuery`).

## 2. Résultats de runs

| Suite | Résultat | Détail |
|---|---|---|
| **E2E Playwright (complète)** | **68 passed / 0 failed** — 73 s | baseline d'avant-sprint : 49 → **+19 tests** (8 #314, 2 #304, 9 #205) |
| Storybook | **78 stories montent / 0 échec** | montage runtime vérifié (`iframe.html?id=`), pas seulement `build-storybook` |
| **Backend (JUnit)** | **433 / 433 passed, 0 failed** | inchangé vs S46 — aucun fichier backend touché, conforme à l'attendu |
| **Frontend unit (RTL)** | **599 / 599 passed, 0 failed** | 69 fichiers ; couvre la non-régression de `fixtures.tsx` |
| **`npm run build`** | **OK** — 52 routes prerendered | lancé explicitement : le job CI `frontend` build, et un échec de prerender est invisible aux tests RTL (précédent Sprint 8) |

Boucle locale : backend `:8080` (profils `dev,e2e`, base `eventmanager_e2e` V15) + frontend `:3100`,
`--workers=1`. Recette : `docs/memory/sprints/sprint-47/e2e-local-runbook.md`.

## 3. Tests créés

- `frontend/e2e/timeline.spec.ts` — 10 tests, 2 propriétaires (#314 : 8 · #304 : 2)
- `frontend/e2e/timeline-mobile.spec.ts` — 9 tests (#205)
- `frontend/src/components/timeline/TimelineMobilePortrait.stories.tsx` — 4 stories
- `frontend/src/components/timeline/TimelineMobileLandscape.stories.tsx` — 4 stories
- `frontend/src/components/timeline/fixtures.tsx` — +103 lignes, **strictement additif**
  (0 suppression, vérifié par diff ; les 6 stories timeline préexistantes qui en dépendent montent toujours)

## 4. Écart résiduel — HORS périmètre, assumé et documenté

Le sprint solde les trois écarts qu'il visait. Il ne rend pas la frise intégralement couverte :
**18 testids de composants timeline restent sans spec E2E**, hors périmètre des trois issues.

`desktop-edit-trigger`, `mobile-delete-trigger`, `timeline-actionsheet-overlay`, `timeline-drawer`,
`timeline-drawer-close`, `timeline-drawer-overlay`, `timeline-event-outside-label`,
`timeline-fullscreen`, `timeline-help`, `timeline-landscape-drawer-overlay`, `timeline-live-region`,
`timeline-loading`, `timeline-minimap-viewport`, `timeline-sheet-grabber`, `timeline-sheet-overlay`,
`timeline-today`, `timeline-weekend`, `timeline-zoom-out`.

(`timeline-edit-host-stub` et `timeline-responsive-stub` sont exclus du décompte : ce sont des
doublures RTL déclarées dans des `*.test.tsx`, pas des éléments d'interface.)

Ces testids **préexistent au sprint** — aucun n'a été ajouté par les commits de S47, donc aucune
régression de couverture n'est introduite. Candidat follow-up pour un futur lot.

## 5. Écarts fonctionnels remontés par les agents (non bloquants)

- **Scroll horizontal perdu à la rotation** (#205) : `scrollLeft` mesuré 400 → 0. Le zoom et la
  sélection survivent (state React hissé) ; `scrollLeft` est un état DOM porté par la variante
  démontée, et `scrollToToday` n'est câblé qu'au montage du hook. Effet de bord : `viewportStart`
  reste à l'ancienne valeur → fenêtre minimap désynchronisée.
  Le critère d'acceptation de #205 dit « sélection **ou** scroll » → satisfait par la sélection.
  **Follow-up, pas blocage.**
- **Pinch-zoom non couvert bout-en-bout** (#205) : Playwright est mono-pointeur ; exigerait
  `Input.dispatchTouchEvent` via CDP. Le long-press est, lui, automatisé et stable.

## 6. Review batch

**0 CRITIQUE / 1 MAJEUR / 2 MINEUR** — tous traités avant ouverture de la PR
(détail : `docs/memory/sprints/sprint-47/review-corrections-done.md`).

Le MAJEUR portait sur une attente à l'horloge murale (`waitForTimeout(800)` pour franchir le seuil
de long-press) dans la spec mobile : c'est-à-dire le risque de flakiness lui-même, sur un sprint
dont l'objet est la fiabilité des tests. Points confirmés `[OK]` par la review : `fixtures.tsx`
additif sans impact sur les 6 stories préexistantes, **aucun composant applicatif modifié**,
cohérence des 2 propriétaires de `timeline.spec.ts`, assertions `aria-expanded`/`toHaveCount`
plutôt que `not.toBeVisible`, stub réseau sans temporisation pour les états `loading`, RegExp
explicite évitant le piège du glob `**`, provider next-intl réel dans les stories.

## 7. Conclusion

Périmètre du sprint **entièrement couvert et vérifié indépendamment** (grep du lead, pas reprise
des déclarations d'agents) : E2E 68/68, backend 433/433, frontend unit 599/599, `npm run build` OK.

L'écart résiduel du §4 (18 testids frise) est **hors périmètre, préexistant et explicitement
assumé** — il ne bloque pas la PR, mais interdit de qualifier la frise de « couverte ».

**Prêt pour PR.**
