# Issue #601 — En-têtes de catégorie de la frise : pastille, compteur, résumé plié — done

Commit : `a604e99` (branche `claude/sprint-85-start-832373`, base `8970edd`).

## Résumé

- **En-tête de catégorie (maquette §B)**, dans `TimelineGroupHead` (`TimelineView.tsx`), partagé par
  les trois écrans (DEC-S85-005) : chevron → **pastille** 10 px `radius 3px` (couleur de catégorie via
  `categoryColors` déjà calculé par #592 ; `null` → aucun style inline, contour neutre `rule-strong`
  en CSS, même règle que `.mt-tlv-side__swatch` — DEC-S85-006) → **libellé** `600 13px font-display`
  `ink`, ellipsis → **compteur** mono 10 px = nombre de **PRODUITS** (DEC-S85-001).
  Nom accessible `aria-label` = « <catégorie>, N produits » (clé `dashboard.timeline.groupHead.label`,
  pluriel ICU fr/en/es/de) ; pastille et compteur `aria-hidden`. `data-category` ajouté sur la rangée.
- **Structure / signal #592 traité** : le `<button>` reste la RANGÉE entière (largeur du rail, cible de
  clic, `aria-expanded`, `data-testid="timeline-group-head"` = élément mesuré par
  `useTimelineViewport`) mais n'est **plus sticky**. L'identité vit dans une **cellule sticky**
  `.mt-tlv__group-cell` (`position:sticky; left:0; width:var(--lane-header-w)`, opaque, `--z-sticky`).
  Aucun élément interactif dans le bouton.
- **Résumé plié (maquette §C)** : `<span class="mt-tlv__group-summary" aria-hidden>` dans la piste de la
  rangée (aucune rangée ajoutée) ; un trait `.mt-tlv__group-bar` par événement de la catégorie (tous
  produits, y compris un produit replié individuellement) : `left = leftPx`, `width = widthPx`,
  `margin-left: var(--lane-header-w)` (même gouttière que les pastilles), 8 px centré, `radius 2px`,
  `opacity .85`, couleur = `event.color || var(--color-accent)` (même source qu'`EventPill`), archivé
  désaturé comme la pastille. Déplié : rien.
  Données : `collapsedCategoryEvents` (useMemo, catégories repliées ET visibles seulement) puis
  fenêtrage `windowEvents(…, horizontalBand)` dans la pré-passe, avec **cache d'identité**
  `summaryCacheRef` keyé par catégorie (même motif que `windowCacheRef`) → `React.memo` de l'en-tête
  tient au défilement.
- **Hauteur** : rangée `height:40px` en `border-box` (filet bas inclus, plus de filet haut) — identique
  pliée/dépliée ; `DEFAULT_METRICS.headHeight` 29 → **40** (`virtualization.ts`), verrouillé par un test
  de dérive CSS ↔ JS.
- **Focus** : l'anneau `--color-focus` est peint sur la cellule sticky (toujours entière à l'écran) ;
  la rangée garde un contour **transparent** (repeint par `forced-colors`, DEC-S58-001).
- **Mobile** (`TimelineMobilePortrait` / `Landscape`) : pastille 8 px + compteur de produits + texte
  sr-only « <catégorie>, N produits » ; même défaut sticky corrigé (rangée non sticky, cellule
  `.mt-tlm__group-cell` sticky). **Pas de résumé plié mobile** : il n'existe aucun repli de catégorie
  en mobile (en-tête = `<div>` non interactif) → RECOMMAND_FOLLOWUP ci-dessous.

## Fichiers modifiés

- `frontend/src/components/timeline/TimelineView.tsx`
- `frontend/src/components/timeline/TimelineView.test.tsx` (helper `headFor` : `data-category` au lieu de `textContent`, qui inclut désormais le compteur)
- `frontend/src/components/timeline/TimelineGroupHead.test.tsx` (nouveau)
- `frontend/src/components/timeline/TimelineMobilePortrait.tsx`
- `frontend/src/components/timeline/TimelineMobileLandscape.tsx`
- `frontend/src/components/timeline/virtualization.ts`
- `frontend/src/styles/ds/components/timeline.css`
- `frontend/public/locales/{fr,en,es,de}/dashboard.json` (`timeline.groupHead.label`)
- `frontend/e2e/sprint-85-timeline-group-head.spec.ts` (nouveau)

## Écarts à la maquette et mesures

| Élément | Maquette | Retenu | Mesure |
|---|---|---|---|
| Compteur | `ink-faint` | `ink-muted` (règle #592) | E2E `readAtRest` : **5,55:1** clair / **5,34:1** sombre sur `surface-2` (`ink-faint` y serait ~2,8:1) |
| Libellé | `600 13px display` `ink` | idem | **16,14:1** clair / **14,25:1** sombre |
| Gouttière de la cellule | `LH = 176px` | `--lane-header-w` = **168 px** | alignée sur les en-têtes de lane et l'origine des pastilles (#392) |
| Largeur d'un trait | `max(4, durée×px/j)`, ponctuel 6 px | `widthPx` de la pastille = `max(6, durée×px/j)` | alignement exact sur la durée ; la pastille, elle, est PEINTE à ≥ 20 px (padding 2×10 en border-box) — le trait dit la durée, pas le padding |
| Position verticale du trait | `top:16px` (rangée 40) | `top:50%; margin-top:-4px` | centré à ±1 px mesuré en E2E |
| Filet haut de la rangée | aucun | supprimé (l'ancien en avait un) | — |
| Chevron | glyphe `▸/▾` mono 10 px | icône lucide `ChevronRight` 13 px existante (rotation) | — |
| Pastille sans couleur | — (DEC-S85-006) | contour `rule-strong` | calcul sRGB : **1,36:1** clair / **1,30:1** sombre sur `surface-2` — marque décorative, le nom porte l'info ; à regarder en revue ui-design (même constat que la sidebar #592) |
| Anneau de focus | — | sur la cellule, `--color-focus` | calcul : 5,53:1 clair / 5,92:1 sombre sur `surface-2` ; E2E clavier réel (Tab) : `:focus-visible` + `outline 2px solid`, cellule entière dans le viewport, `scrollLeft` inchangé (900 → 900) |

- Hiérarchie visuelle : en-tête de catégorie et en-tête de lane partagent fond `surface-2` et typo
  `600 13px display` (maquette) ; seuls pastille + compteur + chevron les distinguent (capture 1280
  clair/sombre relue). À soumettre à la revue ui-design.
- Critère 4 (« sans saut ») : interprété comme (a) hauteur de rangée identique pliée/dépliée, (b)
  l'en-tête replié ne bouge pas et la catégorie suivante vient se coller dessous, (c) les lanes montées
  restent là où le modèle les place. Replier une catégorie **au-dessus** du viewport (clavier, sans
  défilement) décale la lane visible d'exactement N×46 px (mesuré : `scrollY` 1698 → 1698, M30 y
  372,8 → 4,8 = 8 lanes) : Chromium n'applique pas d'ancrage de défilement ici (l'ancre choisie est le
  conteneur `.mt-tlv__scroll`, scroller imbriqué). Aucune compensation ajoutée : ce cas n'est
  atteignable qu'avec `focus({preventScroll})` — un Tab ou un clic ramène l'en-tête à l'écran.

## Tests

- **Vitest** `rtk proxy npm test` : **126 fichiers, 1496/1496** (1479 avant + 17).
  `TimelineGroupHead.test.tsx` (vrais messages 4 locales + `onError`, PIT-S63-006) : structure
  cellule/pastille/compteur/chevron ; pastille couleur + repli neutre sans style inline ; compteur = 2
  produits pour 3 événements ; nom accessible fr/en/es/de (pluriel + singulier) ; bouton natif sans
  descendant interactif ; replié → 3 traits (tous produits), déplié → 0 ; traits = `left`/`width`/couleur
  des pastilles ; zoom → re-projection proportionnelle ; structure identique pliée/dépliée ; catégorie
  masquée → ni en-tête ni résumé ; dérive CSS `height:40px` ↔ `DEFAULT_METRICS.headHeight` + bouton
  non sticky / cellule sticky ; `buildVerticalModel` plié = −N lanes ; mobile portrait + paysage.
  Contrôle négatif (annulé) : compteur `setSize + 1` + résumé forcé vide → 4 tests rouges.
- `rtk proxy npm run typecheck` exit 0 · `rtk proxy npm run lint` 0 erreur/avertissement ·
  `rtk proxy npm run format:check` conforme.
- **E2E** (harnais :3100, `rtk proxy npx playwright test … --reporter=json`, comptes lus dans le JSON) :
  - `e2e/sprint-85-timeline-group-head.spec.ts` : **8/8** (+ 5 setup) — listing produits STUBBÉ, aucune
    écriture : pastille + compteur restant à l'écran à `scrollLeft` 0 / milieu / max ; repli → traits
    alignés en x (±0,5 px) et largeur = durée, hauteur 40 px inchangée, `scrollLeft` inchangé ; le
    résumé suit défilement (+150 px) et zoom ; focus clavier ; contraste clair/sombre ; mobile portrait
    au défilement ; virtualisation ACTIVE (88 lanes) : repli au-dessus du viewport et repli de la
    catégorie visible.
  - Ensemble `group-head` + `timeline.spec.ts` + `sprint-85-timeline-sidebar.spec.ts` : **51 expected,
    0 unexpected, 0 flaky** (5 + 8 + 31 + 7).
  - `e2e/sprint-63-de-overflow-audit.spec.ts` complet : **22 expected** (5 + 17), 0 échec.
  - `e2e/timeline-mobile.spec.ts` : **20 expected** (5 + 15), 0 échec.
  - **Contrôles négatifs** (annulés, non committés) : (1) cellule desktop `position:relative` → rouge
    « cellule collée au bord » (écart 2484 px) ; (2) rangée repliée à 52 px → 2 tests rouges (hauteur) ;
    (3) cellule mobile non sticky → rouge (écart 5192 px) ; (4) `collapsed` retiré de `geometryKey` →
    **reste VERT** : la bande verticale est en repère rail, un repli au-dessus ne l'invalide pas —
    l'échantillonnage « aucune zone vide » est un invariant de principe, pas une garde de `geometryKey`
    (consigné dans la spec).
- Non exécuté (consigne) : `npm run build`, `test-quiet.sh frontend`, suite E2E complète.
- Références visuelles : aucune spec `toHaveScreenshot` ne couvre la frise (seules landing/auth) → aucun
  `.png` impacté.

## Signaux mémoire

- [MEMORY:pattern] Problem: en-tête d'accordéon d'une frise à défilement horizontal, qui doit rester lisible à tout `scrollLeft`, être la cible de clic sur toute la rangée et avoir une hauteur mesurée par la virtualisation. Solution: la RANGÉE est le `<button>` (largeur du rail, hauteur FIXE en border-box, élément mesuré) et une CELLULE interne `position:sticky; left:0; width:<gouttière>` porte l'identité ; le contenu de piste (résumé) est `position:absolute` dans la rangée avec la même `margin-left` que les pastilles. Anti-pattern: `position:sticky` sur une boîte aussi large que son conteneur (elle ne glisse jamais).
- [MEMORY:pattern] Problem: indicateur de focus d'un bouton plus large que le viewport (bord gauche hors écran, recouvert par une cellule sticky opaque). Solution: contour `2px solid transparent` sur le bouton (pour `forced-colors`) et contour `--color-focus` sur la cellule sticky via `.btn:focus-visible .cell` ; vérifié au Tab réel. Anti-pattern: `outline:none` sur le bouton (DEC-S58-001) ou contour sur la rangée entière.
- [MEMORY:pitfall] Context: comparer en E2E la largeur RENDUE d'une pastille de la frise à celle d'un autre marqueur temporel. Solution: `.mt-tlv__evt` a 20 px de padding horizontal en border-box : une pastille d'un jour au zoom Mois (`widthPx` 12) est peinte sur 20 px. Comparer à `style.width` (= `widthPx`), pas à la `boundingBox().width`. Prevention: toute assertion de géométrie sur les pastilles doit dire si elle vise la durée (`widthPx`) ou le rendu (≥ 20 px).
- [MEMORY:pitfall] Context: garde E2E « aucune zone vide après repli » supposée protéger `geometryKey`. Solution: contrôle négatif — retirer `collapsed` de `geometryKey` la laisse VERTE : la bande verticale de `useTimelineViewport` est en repère RAIL, un repli au-dessus ne déplace ni le rail ni `scrollY`, la bande reste juste. Prevention: jouer le contrôle négatif AVANT d'affirmer ce qu'une garde protège ; la virtualisation est robuste aux reflows internes du rail, pas à un changement de hauteur d'en-tête (celui-là rougit bien).
- [MEMORY:decision] Context: critère 4 de #601 (« sans saut ») et repli d'une catégorie au-dessus du viewport. Decision: pas de compensation de `scrollY` ; on garantit hauteur de rangée identique pliée/dépliée, en-tête replié immobile, catégorie suivante collée, lanes aux positions du modèle. Why: Chromium n'ancre pas (le conteneur `.mt-tlv__scroll` est choisi comme ancre) et le cas n'est atteignable que par `focus({preventScroll})` ; mesuré : décalage = exactement N×46 px.

## Recommandations suite

- RECOMMAND_FOLLOWUP: repli de catégorie en MOBILE (portrait/paysage) + résumé plié mobile — l'en-tête mobile est un `<div>` non interactif, aucun état `collapsed` n'existe dans `useTimelineMobileState` ; la maquette §C ne vise que la frise desktop. [triage S | frontend/events]
- RECOMMAND_UI_DESIGN: revue des écarts assumés — gouttière 168 px au lieu de 176, compteur `ink-muted`, trait = durée (min 6 px) et non `max(4)`/6 px, contour neutre de la pastille sans couleur à 1,36/1,30:1 sur `surface-2`, hiérarchie en-tête de catégorie vs en-tête de lane (même fond, même typo) — prévue par le lead en fin de sprint.
- Pas de RECOMMAND_DB_EXPERT car aucun changement backend ni schéma (100 % frontend).
- Pas de RECOMMAND_SECURITY car aucune surface d'authentification, de donnée personnelle ou d'API externe touchée.
- Pas de RECOMMAND_TEST_RUNNER car les suites jouées restent sous le seuil (E2E ciblées ≈ 1 min 40, vitest ≈ 30 s) ; la suite E2E complète et `next build` restent au lead.

STATUS: COMPLETED
