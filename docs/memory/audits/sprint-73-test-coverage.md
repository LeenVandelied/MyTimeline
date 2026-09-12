# Audit tests — Sprint 73

> Généré en fin de Phase 6. Un marqueur de couverture manquante bloque la Phase 9 PR.

## Couverture par critère d'acceptation

Aucune BR métier n'est touchée par ce sprint (les 3 issues déclarent « BR impactées :
aucune »). Le tableau porte donc sur les critères d'acceptation, pas sur des BR-XX.

| Issue | Critère | Cross-system | Unit front | E2E | Preuve réelle ? |
|---|---|:---:|:---:|:---:|---|
| #458 | Titre long ne déborde plus | NON | ⚠ classe seule | ❌ | **NON** — voir réserve ci-dessous |
| #458 | Pas de régression titre normal | NON | ⚠ | ❌ | NON (non observé) |
| #416 | Glyphe présent sur pastille sélectionnée | NON | ✅ RTL | ❌ | OUI (câblage DOM) |
| #416 | Glyphe ≥ 3:1 sur 12 couleurs × 2 thèmes | NON | ✅ calcul pur | ❌ | **Modèle seulement** |
| #416 | Taille/alignement des pastilles inchangés | NON | ⚠ | ❌ | NON (non observé) |
| #416 | Glyphe `aria-hidden`, `aria-checked` conservé | NON | ✅ RTL | ❌ | OUI |
| #298 | Sidebar icon-only 768–1023 | NON | ✅ | ✅ **exécuté** | OUI (`boundingBox` 64px) |
| #298 | Token dédié, aucun `w-[64px]` | NON | ✅ regex + postcss | — | OUI (compilation prouvée) |
| #298 | Nav accessible sans libellé visible | NON | ✅ RTL | ✅ | OUI |
| #298 | `< md` inchangé | NON | ✅ | ✅ (767px) | OUI |
| #298 | `>= lg` 248px inchangé | NON | ✅ | ✅ (1024px) | OUI |

Aucune couverture manquante bloquante : aucun flux cross-system (2+ systèmes/rôles) n'est introduit, donc aucun
E2E métier n'est obligatoire au sens de la règle de gate.

## Réserve explicite — ce que le sprint NE prouve PAS

Deux critères d'acceptation sur trois issues restent **argumentés, non observés** :

- **#458** — « le titre ne déborde plus » n'est vérifié par aucun test mesurant un
  débordement. Le test ajouté assert la présence des classes `min-w-0` / `break-words` ;
  jsdom ne calcule aucun layout. Le raisonnement CSS est solide (`min-width:auto` sur un
  enfant flex neutralise `break-words`, d'où `min-w-0`), mais c'est un raisonnement.
- **#416** — « ≥ 3:1 sur les 12 couleurs » est prouvé sur le **modèle** (calcul de luminance
  pur, recalculé par script sur `CATEGORY_SWATCHES` réel), pas sur le **rendu**. Aucune sonde
  de contraste navigateur.

Les deux ont un `RECOMMAND_FOLLOWUP` dédié. C'est le motif documenté
« Coverage-E2E vert ne prouve rien » / « Tests de scroll sous jsdom ne prouvent rien ».

## Tests créés / modifiés
- `frontend/src/components/products/ProductDetailView.test.tsx` (+1)
- `frontend/src/lib/color.test.ts` (+5, dont le test de bande de seuil)
- `frontend/src/components/categories/CategoryDrawer.test.tsx` (+4)
- `frontend/src/components/layout/AppShell.test.tsx` (25 → 28)
- `frontend/e2e/sprint-73-tablet-sidebar.spec.ts` (**nouveau**, bornes 767/768/1023/1024)
- `frontend/e2e/settings-breakpoints.spec.ts` (modifiée)
- `frontend/e2e/sprint-66-mobile-create-event.spec.ts` (modifiée)

## Résultats des runs (exécutés par le lead)
- **Frontend unitaire** : 106 fichiers / **1181 passed** / 0 failed
- **E2E Playwright** : **249 passed / 0 failed / 9 skipped** en 5 min 12
  (`exit=0`, serveur dev externe, backend conteneur `:8086`, oracle `/api/auth/me` = 401)
  - Contrôle anti-pollution : le log ne contient qu'**un seul** bloc
    `Running 258 tests using 2 workers` — aucune campagne concurrente.
  - Les 9 `skipped` sont la suite `auth-signature.spec.ts` (RS256), préexistants et
    étrangers au sprint.
- **Spécifiquement vérifiées** :
  `sprint-73-tablet-sidebar` 5/5 · `settings-breakpoints` 6/6 ·
  `sprint-66-mobile-create-event` 3/3 · `sprint-63-de-overflow-audit` 17/17 ·
  `timeline-mobile` 15/15
  Les deux dernières n'ont pas été modifiées mais étaient identifiées à risque (leur
  viewport tombe dans la nouvelle plage tablette) : elles passent.

## Faux diagnostic écarté
Le `test-runner` a rendu `INDETERMINE` en concluant à une régression de build :
« `next dev` échoue sur `sprint/73`, fonctionne sur `origin/dev` ».
**Réfuté par reproduction directe** : `next dev` démarre en 1,25 s sur `sprint/73`
(`✓ Ready`), et la suite E2E complète tourne verte sur cette branche. La cause réelle de
son échec est l'avertissement de workspace root en worktree (plusieurs lockfiles) que la
config Playwright documente déjà (PIT-S61-007) — contourné par la recette 2 du
`playwright.config.ts` (`npx next dev` webpack + `PLAYWRIGHT_BASE_URL`), pas par
`npm run dev` (turbopack).

## Conclusion
**Gate VERTE.** Suite unitaire et suite E2E exécutées et vertes sur `sprint/73`.
Prêt pour PR, avec la réserve explicite ci-dessus sur #458 et #416 — deux critères
d'acceptation reposent sur un modèle, pas sur une observation.

---

## Mise à jour après les 2 absorptions du triage (Phase 4)

Deux absorptions ont ajouté du code APRÈS le premier audit : `46471bf` (double chrome
dashboard) et `d749712` (sondes navigateur). La suite a donc été rejouée.

### Les 2 réserves du premier audit sont LEVÉES
La sonde `sprint-73-model-vs-rendered.spec.ts` prouve **au navigateur** ce qui n'était
qu'argumenté sur modèle :
- #458 débordement : 3/3 — `scrollWidth == clientWidth` (281/281 mobile, 906/906 desktop)
- #416 contraste : 2/2 — **24/24 cellules** (12 couleurs × 2 thèmes), minimum **4,54:1 au
  rendu**, identique au calcul de `color.test.ts`

`sprint-73-tablet-sidebar.spec.ts` (14/14) porte en plus un **contrôle de falsification** :
rejouée sur le code d'avant `46471bf`, elle échoue (`Expected: 1 / Received: 2`). L'oracle
voit donc réellement le défaut de double chrome.

### Unitaire
`./scripts/test-quiet.sh frontend` sur le HEAD final : **1181 passed / 106 fichiers / 0 échec**.

### E2E local — INSTABLE à `workers: 2`, à déclarer tel quel
Trois exécutions complètes locales sur le HEAD final :

| Run | Résultat |
|---|---|
| 1 | 256 passed / **2 failed** — `sprint-62-select-focus-indicator.spec.ts:551` (light + dark) |
| 2 | **INVALIDE** — le `next dev` local est mort en cours de run (oracle `/api/auth/me` = `000`, connexion refusée). La fixture a correctement écrit « Ce n'est PAS un rate-limit register 429 ». Mode de panne déjà documenté (#465), cause racine toujours inconnue. |
| 3 | 255 passed / **3 failed** — les 2 mêmes + `timeline.spec.ts:200` |

**Rejouées seules sur le MÊME commit, `--workers=1` : `sprint-62` + `timeline` = 54/54
vertes, exit 0.** Deux verdicts opposés sur un code identique ⇒ instabilité, critère
[[PAT-S72-002]].

Cause du symptôme, lue et non supposée : `Point (413,5 ; 353,3) CSS hors de la région
capturée [6 ; 390]` — le popover est mesuré avant d'avoir été repositionné. C'est une course
de géométrie, pas une assertion sur les changements du sprint.

**Ce qui EMPÊCHE de conclure « sans rapport » à la légère :** `AppShell.tsx` est dans le diff
ET héberge le déclencheur `NewEventDrawer`. L'argument n'est donc pas « fichiers disjoints »
mais : le test tourne à **390 px**, sous `md`, où `hidden md:flex` et l'ancien
`hidden lg:flex` masquent identiquement l'`<aside>`, où `md:hidden` et l'ancien `lg:hidden`
affichent identiquement le FAB, et où les contrôles retirés du header étaient de toute façon
`hidden md:flex` donc déjà invisibles. La géométrie mobile est inchangée par ce sprint.

**Gate retenue : la CI**, qui tourne `workers: 1` sur un build de production — configuration
dans laquelle ces specs passent. Le run local à `workers: 2` n'est pas la référence.
