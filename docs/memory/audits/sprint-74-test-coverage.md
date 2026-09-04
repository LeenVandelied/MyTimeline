# Audit tests — Sprint 74 « Landing & focus polish »

> Phase 6. Les 4 issues déclarent **« BR impactées : aucune »** — la matrice par BR du template
> est donc sans objet ici. Elle est remplacée par une matrice par **critère d'acceptation**,
> qui est ce que ce sprint doit réellement prouver.

## Résultats des runs (commandes réellement exécutées par le lead)

| Suite | Résultat |
|---|---|
| Unitaires frontend (`vitest run`) | **1187 passés / 1187**, 107 fichiers, 21 s, exit 0 |
| Build + lint CI (`npm run build`) | **exit 0** (filet `PIT-S22-001` / `PIT-S41-005`) |
| E2E Playwright (suite complète) | **257 passés, 1 échec, 9 ignorés** (5,7 min) |
| E2E — rejeu ciblé du fichier en échec | **25 passés / 25**, exit 0 |

Backend : **non exécuté** — aucun fichier backend dans le diff (13 fichiers, tous `frontend/`
et `docs/`).

### L'échec E2E — imputation

`[chromium] sprint-62-select-focus-indicator.spec.ts:551 › NewEventDrawer / product-trigger —
le popover est PEINT (mobile, .mt-sheet) — light` → `locator.evaluate: Test timeout of 30000ms
exceeded`.

Faisceau qui l'écarte du périmètre de ce sprint — **sans le prouver formellement** :

1. **3 des 4 variantes du même test passent** (chromium/dark, firefox/light, firefox/dark).
   Une régression CSS les ferait tomber ensemble.
2. Le diff ne touche **aucun** sélecteur de cet arbre (`.mt-sheet`, `.mt-drawer`,
   `.mt-select__*`). Les 2 règles ajoutées sont portées par `.mt-tablist-scroll` et
   `.mt-zoom__btn`.
3. Le symptôme est un **timeout de 30 s sur `locator.evaluate`**, pas une assertion de
   peinture. Famille `PIT-S72-004`, sous la charge de 267 tests.
4. La CI de `dev` est verte sur les derniers merges.
5. Rejeu ciblé du fichier : **25/25**.

⚠ **Ce que ce faisceau ne prouve pas.** Le rejeu ciblé est vert *en isolation*, ce qui retire la
charge — la mémoire projet retient explicitement qu'une isolation verte n'établit pas la
flakiness. Le contre-test décisif (rejouer ce spec **sur `origin/dev`** dans les mêmes
conditions de charge) **n'a pas été fait**. L'imputation « hors périmètre » reste un faisceau,
pas une démonstration. La CI de la PR tranchera.

## Couverture par critère d'acceptation

Légende : ✅ vérifié et prouvé · 🟡 partiel · ❌ non vérifié

| Issue | Critère d'acceptation | Unitaire | Runtime navigateur | Statut |
|---|---|---|---|---|
| #342 | `DropdownMenuItem` plus enveloppé par `Link` | ✅ 13/13 + **mutation** | ✅ E2E `landing-mobile-menu` | ✅ |
| #342 | HTML valide, une seule cible de tabulation | ✅ `a [role=menuitem]` = 0 | ✅ | ✅ |
| #342 | Sélecteur de langue fonctionnellement inchangé | ✅ 69 tests voisins | ✅ E2E | ✅ |
| #343a | `--ease-quart` au lieu de la littérale | ✅ | ✅ token confirmé | ✅ |
| #343a | **Animation inchangée visuellement** | — | — | ❌ **IMPOSSIBLE** (cf. §) |
| #343b | CSS plus importé dans le layout partagé | ✅ | ✅ **chunks servis inspectés** | ✅ |
| #343b | Aucune régression sur les autres routes | — | ✅ `/fr/login`, `/fr/register` : 0 sélecteur | ✅ |
| #384 | Une seule déclaration de lévitation | ✅ 28 tests + **mutation** | ✅ CSSOM : 1 règle, `translate: none` | ✅ |
| #384 | −10 px au survol (au lieu de −18) | — (jsdom sans layout) | ✅ **`matrix(1,0,0,1,0,-10)`** sous `:hover` réel | ✅ |
| #384 | Palier responsive `-5px` < 768 px préservé | ✅ | 🟡 règle présente, **non mesurée sous 768 px** | 🟡 |
| #417A | `.mt-zoom` — contour peint sur 4 côtés | — | ✅ **0 côté rogné**, clair + sombre | ✅ |
| #417A | Ne recouvre pas le contenu (risque de l'issue) | — | ❌ **RÉALISÉ — le trait croise l'icône** | ❌ |
| #417B | Tablist réglages — 4 côtés | — | ✅ **0 côté rogné** + **mutation** | ✅ |
| #417B | Vérifié clair ET sombre | — | ✅ **4,95:1** / **5,43:1** | ✅ |
| #417 | `outline-offset` négatif, pas de `ring-*` | ✅ `base-layer.test.ts` | ✅ CSSOM | ✅ |

## Mesures runtime (serveur `next dev` webpack en worktree, oracle proxy `401` vérifié)

**#384 — lévitation.** Survol réel : `transform: matrix(1, 0, 0, 1, 0, -10)`, `translate: none`,
`box-shadow` appliquée, `.feature-icon` à `scale(1.1)`. CSSOM : **une seule** déclaration de
translation. Le −18 px est supprimé.

🟡 **Non prouvé** : la *fluidité* de la transition. Le panneau navigateur a rendu des lectures
instables (valeurs périmées, `transitionstart` non capté). `transition-property: all` et
`transition-duration: 0.3s` sont bien calculés sur l'élément, mais l'interpolation elle-même
n'a pas été observée de façon fiable.

**#343b — portée du CSS.** Chunks réellement servis :

- `/fr` → `[locale]/page.css` : **5 sélecteurs `.hero-timeline*` + 2 keyframes**
- `/fr/login`, `/fr/register` → `[locale]/layout.css` : **0 sélecteur, 0 keyframe** (une seule
  occurrence textuelle, dans un **commentaire** de `landing.css`)

**#417B — tablist des réglages** (`/fr/settings`, focus armé au clavier réel) :

| | offset | côtés rognés | trait | fond réel | contraste |
|---|---|---|---|---|---|
| clair | `-2px` | **0 / 4** | `#0E5FC4` | `#DBE9FC` | **4,95:1** |
| sombre | `-2px` | **0 / 4** | `#4D9BFF` | `#16263A` | **5,43:1** |
| *mutation* `+2px` | `2px` | **3 / 4** (haut, gauche, bas) | | | |

La mutation reproduit le défaut d'origine et prouve que le correctif est bien ce qui le
supprime. `overflow-x: auto` calcule bien `overflow-y: auto` (constaté).

**#417A — contrôles de zoom** (`/fr/timeline`, focus armé au clavier réel) :

| | offset | côtés rognés | trait | fond réel | contraste |
|---|---|---|---|---|---|
| clair | `-2px` | **0 / 4** | `#0E5FC4` | `#FFFFFF` | **6,08:1** |
| sombre | `-2px` | **0 / 4** | `#4D9BFF` | `#131519` | **6,48:1** |

Tous les contrastes dépassent le seuil WCAG 1.4.11 (3:1) et confirment les estimations du
fullstack-dev à 0,02 près.

## Décision ouverte — #417 zone A : le trait croise l'icône

Le risque que l'issue énonçait elle-même (« vérifier qu'il ne recouvre pas le libellé sur les
cibles les plus étroites ») **se réalise**. Géométrie mesurée, desktop, les deux thèmes :

- `.mt-zoom__btn` : **30 × 16,5 px**
- trait : bord externe à 2 px à l'intérieur, épaisseur 2 px → **espace libre vertical = 8,5 px**
- icône `<svg>` : **14 × 14 px**, calée sur le bord **gauche** du bouton
- → l'icône déborde du trait en **haut, bas et gauche**

Aucune valeur inset ne résout le cas : à `-1px` l'espace libre vaut 10,5 px, à `0` il vaut
12,5 px — toujours < 14 px. **Le problème est la hauteur du bouton (16,5 px) face à une icône de
14 px**, pas la valeur choisie. Le critère « 4 côtés peints » est atteint ; celui de
non-recouvrement ne l'est pas.

Options (appel de charte, non tranché par le lead) :

1. **Livrer tel quel** — 4 côtés peints, trait croisant l'icône sur 3 côtés.
2. **`overflow: visible` sur `.mt-zoom` desktop** + rayon porté par les boutons — c'est
   exactement ce que fait déjà l'exception mobile `.mt-tlm .mt-zoom{overflow:visible}`
   (`timeline.css:390`). Le contour DS standard (+2 px) peindrait alors dehors, sans toucher
   l'icône.
3. **Retirer la zone A** de ce sprint et la rouvrir en issue de charte (hauteur du contrôle).

## Conclusion

Prêt pour la PR **sous réserve** de l'arbitrage ci-dessus. Aucune ligne de couverture manquante (le tableau ci-dessus est exhaustif). Un critère est
structurellement invérifiable (#343a, l'issue s'auto-contredit), deux sont partiels (fluidité
#384, palier < 768 px), un est en échec assumé et documenté (#417A non-recouvrement).
