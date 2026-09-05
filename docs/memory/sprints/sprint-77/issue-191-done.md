# Issue #191 — Revue visuelle des stories Storybook (thème clair + sombre)

Sprint 77, vague 3. Branche `sprint/77`.

## 1. Objectif

Rendre la revue visuelle des stories RÉELLEMENT possible (bascule de thème + polices absentes du
preview), corriger le débordement mesuré de `DateStamp`, trancher les deux constats non tranchés,
et produire l'audit d'alignement pixel du critère 3 — qui n'existait nulle part.

## 2. Bascule de thème livrée

**Mécanisme** — `frontend/.storybook/preview.ts` : `globalTypes.theme` (barre d'outils, clair /
sombre) + `initialGlobals` + un décorateur qui applique le shell sur `document.documentElement` :

- `classList.toggle('dark')`, `data-theme` en miroir, `style.colorScheme` ;
- classes de variables `next/font` (`archivo.variable`, `ibmPlexMono.variable`) importées depuis
  `app/fonts.ts`, plus le dérivé `--font-ui: var(--font-display)`.

Appliqué sur `<html>` et **pas** sur un `<div>` enveloppant, parce que c'est là que l'application
les pose (`app/[locale]/layout.tsx:49-56`) et que c'est la seule façon que le fond de page (`body`,
`background: var(--color-bg)`) bascule aussi. Un wrapper aurait donné une story sombre sur un fond
de page clair — une revue « sombre » mensongère.

Pilotable par URL : `/iframe.html?id=<story>&globals=theme:dark`. C'est ce dont **#294** (captures
de référence Playwright) a besoin pour graver ses deux thèmes sans injecter de classe à la main.

### Second manque structurel trouvé en chemin : les POLICES

Non signalé par le briefing, mesuré ici : `--font-display`, `--font-ui` et `--font-mono`
résolvaient **tous les trois à la chaîne vide** dans le preview. `ds/tokens/base.css:13` pose
`font-family: var(--font-ui)` sur `body` → repli `ui-sans-serif, system-ui`. Les **80** stories,
y compris `.mt-label` (censée être en IBM Plex Mono capitales), étaient rendues en police système.
Une revue visuelle d'un DS dont la charte est typographique ne veut rien dire dans la mauvaise
fonte — et toute mesure de largeur prise avant ce correctif est faussée (c'est pourquoi le tableau
DateStamp ci-dessous a été REMESURÉ des deux côtés, dans Archivo).

Cause : `app/fonts.ts` n'expose que `--font-display` et `--font-mono` ; `--font-ui` est dérivé par
un `style` inline sur `<html>` dans l'app. Le preview ne reproduisait ni l'un ni l'autre.

### Preuve sur les 80 stories

Instrument : iframe même origine, largeur fixée explicitement, thème pris par
`?globals=theme:<v>`, attente active jusqu'au rendu effectif de `#storybook-root`.

Contrôlé pour **chaque** story × chaque thème : `class.dark`, `data-theme`, `--font-ui` contient
`Archivo`, `--font-mono` contient `Plex`, `--color-bg` vaut exactement `#FCFCFD` (clair) /
`#0B0C0E` (sombre).

```
80 stories × 2 thèmes = 160 contrôles → 160 OK / 0 ÉCHEC
```

**Instrument armé** (PIT-S62-003) : le même contrôle lancé sans attendre le rendu a produit
**40 échecs sur 40**, en nommant les bons attributs manquants. Il détecte donc bien l'absence de
shell ; son vert n'est pas un vert par défaut.

⚠ L'énoncé de l'issue dit « 22 stories ». Il y en a **80**, sur **26 composants**
(`http://localhost:6006/index.json`). Le « 22 » ne correspond à rien (PIT-S71-001).

## 3. DateStamp — arbitrage et mesures

### Correction de périmètre : le commentaire de la story est FAUX

La story `timeline-ruler--thirty-days` dit « fenêtre pleine de 30 jours **comme le dashboard** », et
le briefing l'a relayé comme « le cas de PRODUCTION ». Vérifié par `grep` sur les appelants :

- le dashboard (`TimelineView.tsx:220`) a son **propre** `TimelineRuler`, à graduations
  positionnées en pixels absolus (`DAY_WIDTH_PX`, `buildRulerTicks`) — il n'importe ni `Ruler` ni
  `DateStamp` ;
- le **seul** consommateur applicatif de `Ruler`/`DateStamp` est
  `src/components/events/EventPreviewTimeline.tsx:168`, avec `PREVIEW_COLUMNS = 6` graduations et
  `gutterPercent={0}`, dans un drawer de 452 px.

Le cas 30 jours est donc aujourd'hui un cas de STORY, pas de production. Le défaut reste réel — une
primitive partagée qui peint hors de sa piste est un défaut quel que soit l'appelant — mais il ne
fallait pas le corriger comme s'il cassait le dashboard. C'est ce qui a dicté l'arbitrage.

### Arbitrage retenu, et pourquoi

Le libellé contient un mot **insécable** (« dim. ») d'environ 30 px, et `Ruler` répartit ses jours
en `repeat(N, minmax(0, 1fr))` : la piste rétrécit sans plancher.

Écartés :
- **`truncate`** — ampute le NUMÉRO du jour, seul jeton porteur (« ven… » ne dit plus quel jour) ;
- **abréviation plus courte** — c'est ICU qui décide ; la coder en dur casse `fr/en/es/de` ;
- **plancher `min-w` + défilement** — `Ruler` n'a pas de scroller propre, et son unique
  consommateur vit dans un drawer de 452 px où un défilement horizontal serait une régression.

**Retenu : dégradation par requête de conteneur.** La cellule s'adapte à SA largeur, pas au
viewport — seule option juste pour deux consommateurs d'échelles opposées (6 graduations larges vs
N jours étroits). **Sous 52 px** : le jour de semaine passe en `sr-only` (il reste dans l'arbre
d'accessibilité **à toutes les largeurs** — aucune perte pour les technologies d'assistance,
contrairement à `display:none`), le numéro reste visible. Palier secondaire à 34 px : en dessous,
la typo passe à `--text-2xs` et le padding à `px-0.5`. `overflow-hidden` sert de filet : plus
aucune peinture hors piste.

**Seuil de 52 px — mesuré, sur les 4 locales.** Jour de semaine le plus large, Archivo 500 à 15 px :
fr `sam.` = **33,3 px** (la contrainte), en `Wed` = 30,4, es `dom` = 30,3, de `Mo.` = 25,8. Avec
`px-2` (16 px) il faut ≥ 49,3 px, d'où 52 px (~2,7 px de marge de rendu). Un seuil calibré sur une
seule locale serait faux ailleurs : 26 px d'écart de besoin entre `de` et `fr`. Le palier 34 px ne
gouverne que typo/padding — le numéro à 2 chiffres fait 17,2 px, soit 33,2 px avec `px-2`.

⚠ Vérifié avant de choisir (PIT-S73-001) : la cellule est un **enfant de grille**, pas de flex —
`break-words` n'était de toute façon pas la bonne famille de correctif.
⚠ Un élément ne peut pas se requêter lui-même : `@container` sur la cellule, variantes
`@min-[34px]:*` sur l'enveloppe interne.

### ⚠ Cycle 2 de revue — la 1ʳᵉ passe laissait une BANDE CASSÉE (34–52 px)

**Le tableau à 4 largeurs publié en cycle 1 était faux sur 2 lignes** (« 1280 px 0/30 » et
« 1600 px 0/30 » pour l'après). Signalé par le coordinateur, reproduit et confirmé ici : avec le
seuil à 34 px, le jour de semaine **réapparaissait sans avoir la place** entre 34 et ~50 px de
cellule et se faisait rogner par l'`overflow-hidden` — glyphe coupé en plein milieu, soit le défaut
qu'on prétendait corriger. Mesuré à 1280 px (cellule 34 px) : `sam. 4` manquait de **15 px**,
`ven. 3`/`dim. 5` de 11 px, `jeu. 2`/`lun. 6` de 7 px.

**Pourquoi ma sonde ne l'a pas vu** — et ce n'est pas la raison avancée par le coordinateur (qui
supposait que je mesurais la cellule `@container`) : je mesurais bien l'enveloppe interne, mais via
`Range.getClientRects()`, qui renvoie des **boîtes de ligne bornées à la boîte de contenu**. Un mot
insécable plus large que sa boîte n'y apparaît donc **jamais** : la sonde rendait structurellement
0 pour ce défaut précis. La sonde correcte est `scrollWidth - clientWidth` sur l'enveloppe qui
rogne. Les 4 largeurs testées (800/1024/1280/1600) n'auraient de toute façon pas suffi à voir la
bande — mais même en la traversant, l'ancienne sonde l'aurait manquée.

### Tableau après correction — 7 paliers × 2 thèmes

Sonde : `scrollWidth - clientWidth` sur l'enveloppe interne (celle qui porte `overflow-hidden`),
`sr-only` exclus par `position:absolute`. « masqué proprement » = jour de semaine retiré du flux
visuel, numéro intact, aucun rognage.

| Viewport | Cellule | Masqué proprement | ROGNÉ | Pire manque | Affiché |
|---|---|---|---|---|---|
| 1152 px | 31 px | 30/30 | **0/30** | 0 | numéro seul |
| 1200 px | 32 px | 30/30 | **0/30** | 0 | numéro seul |
| 1280 px | 34 px | 30/30 | **0/30** (avant correctif : 30/30 rognées, −15 px) | 0 | numéro seul |
| 1360 px | 37 px | 30/30 | **0/30** (avant : 30/30, −12 px) | 0 | numéro seul |
| 1440 px | 39 px | 30/30 | **0/30** (avant : 30/30, −10 px) | 0 | numéro seul |
| 1600 px | 43 px | 30/30 | **0/30** (avant : 21/30, −6 px) | 0 | numéro seul |
| 1800 px | 49 px | 30/30 | **0/30** | 0 | numéro seul |

Chiffres **identiques en clair et en sombre** aux 7 paliers (14 mesures).

**Balayage continu** — pour prouver qu'aucune bande cassée ne subsiste ailleurs, viewport balayé de
700 à 2600 px par pas de 40 px (**48 paliers**, cellules de **19 px à 71 px**) :

- **0 cellule rognée sur toute la plage** ;
- **une seule bascule**, nette, entre cellule **52 px et 53 px** : `numéro seul` → `jour + numéro`.

**Les 4 locales du produit**, à la largeur la plus tendue où le jour est affiché (cellule 54 px), en
injectant le jeton le plus large de chaque locale dans le libellé : `fr sam.` 0 px de débordement,
`en Wed` 0, `es dom` 0, `de Mo.` 0 — dans les **2 thèmes**.

**Sondes armées** (PIT-S62-003) : le jeton `Mittwoch` injecté au même endroit est correctement
rapporté à **+24 px**, et le contrôle `sam.` à **0** — la sonde détecte donc bien ce qu'elle
prétend détecter, contrairement à celle du cycle 1.

**Non-régression du cas large et du consommateur réel :**

| Cas | Résultat |
|---|---|
| `timeline-ruler--default` 14 jours @1280 (cellule 75 px) | 0/14 rognée, `jour + numéro` |
| stories `timeline-datestamp--*` (cellule 159 px), 2 thèmes | 0/1 rognée, `jour + numéro` |
| Débordement hors cellule (défaut d'origine), 800/1024 px | toujours 0/30 — le correctif initial tient |

L'« avant » du cycle 1 avait été mesuré sur une story temporaire reproduisant le markup d'origine
**dans la même fonte (Archivo)**, puis supprimée avant commit : sans cela le correctif de police
aurait déplacé les largeurs sous les pieds de la mesure. Les chiffres de débordement **hors** cellule
du briefing (30/30 à 800 px, 21/30 à 1024 px) restent confirmés en tendance.

## 4. Constat 4 — tranché

- **`ui-tooltip--default` : PAS un défaut.** `cw=34 / sw≈106` est le rapport normal entre
  l'enveloppe `.mt-tooltip` (`position:relative; display:inline-flex`, 34 px = l'IconButton) et la
  bulle `.mt-tooltip__pop`, **positionnée en absolu** avec `width:max-content` (178,2 px) : le
  `scrollWidth` d'un parent relatif compte ses descendants absolus. Ouverte pour de vrai
  (`.mt-tooltip__pop--open`) : centrée sur le déclencheur (écart **0 px**), 8 px au-dessus,
  contraste **17,76:1** en clair / **15,6:1** en sombre. La 2ᵉ lecture du lead (« aucun
  déclencheur, `.mt-tooltip` absent ») portait sur une story **pas encore rendue** — même course
  que celle qui a fait échouer 40/40 mon propre contrôle à t=0.
- **`timeline-cursor--end` : légitime, avec une réserve.** `positionPercent=100` →
  `left: calc(15% + 100 × 0,85%)` = 100 % : la barre de **2 px** commence exactement au bord droit,
  d'où `scrollWidth 1250` vs `clientWidth 1248`. Le parent est en `overflow:hidden`, donc rien ne
  déborde visuellement. Réserve : à exactement 100 %, le marqueur est **entièrement rogné, donc
  invisible** — cas limite, non corrigé ici (toucher la géométrie de `Cursor` casserait le contrat
  d'alignement avec `Ruler`). Suivi ci-dessous.

## 5. Audit d'alignement pixel (critère 3 — inexistant jusqu'ici)

Valeurs **calculées dans le navigateur** vs déclarations de `src/styles/ds/components/core.css`.
Mesuré dans les 2 thèmes : **aucune différence de géométrie entre clair et sombre** (0 écart
thème-dépendant). Croisé classe-source ET prop-passthrough (PIT-S53-003) : les 5 composants sont
des composants **shadcn/Tailwind**, ils ne portent pas les classes `.mt-*` du DS — sauf `Textarea`,
qui rend bien `.mt-textarea`.

| Composant | Propriété | Spec `core.css` | Calculé | Écart | Origine |
|---|---|---|---|---|---|
| Input | font-size | 14 px | **17 px** | +3 | `text-sm` → `--text-sm` (échelle Graphite) |
| Input | border-width | 1 px | 1 px | — | conforme |
| Input | border-radius | 7 px | 7 px | — | conforme |
| Input | padding-block | 9 px | **4 px** | −5 | `py-1` |
| Input | padding-inline | 11 px | **12 px** | +1 | `px-3` |
| Input | background | `--color-surface` | **transparent** | ≠ | `bg-transparent` |
| Select | font-size | 14 px | **17 px** | +3 | `text-sm` |
| Select | border-width | 1 px | 1 px | — | conforme |
| Select | border-radius | 7 px | 7 px | — | conforme |
| Select | padding-block | 9 px | **8 px** | −1 | `py-2` |
| Select | padding-inline | 11 px | **12 px** | +1 | `px-3` |
| Select | height | 36 px | 36 px | — | conforme (`h-9`) |
| Select | background | `--color-surface` | **transparent** | ≠ | `bg-transparent` |
| Checkbox | width | 18 px | **16 px** | −2 | `w-4` |
| Checkbox | height | 18 px | **16 px** | −2 | `h-4` |
| Checkbox | border-width | 1,5 px | **1 px** | −0,5 | `border` |
| Checkbox | border-radius | 5 px | **3 px** | −2 | `rounded-xs` → `--radius-xs` |
| Card | border-width | 1 px | 1 px | — | conforme |
| Card | border-radius | 10 px | **14 px** | +4 | `rounded-xl` → `--radius-xl` |
| Card | header padding-block | 16 px | **24 px** | +8 | `p-6` |
| Card | header padding-inline | 20 px | **24 px** | +4 | `p-6` |
| Card | header border-bottom | 1 px | **0** | ≠ | filet absent |
| Card | body padding | 20 px | **24 px** | +4 | `p-6` |
| Card | footer padding-block | 16 px | **0** | ≠ | `p-6 pt-0` |
| Card | footer border-top | 1 px | **0** | ≠ | filet absent |
| Dialog | border-width | 1 px | 1 px | — | conforme |
| Dialog | border-radius | 14 px | **10 px** | −4 | `sm:rounded-lg` → `--radius-lg` |
| Dialog | max-width | 520 px | **512 px** | −8 | `max-w-lg` (32 rem) |
| Dialog | padding | 20 px | **24 px** | +4 | `p-6` |
| Dialog | title font-size | 21 px | **27 px** | +6 | `text-lg` → `--text-lg` |
| Dialog | desc font-size | 13 px | **17 px** | +4 | `text-sm` |
| Dialog | overlay bg | `rgba(11,12,14,.5)` | `oklab(0 0 0 / 0.8)` | ≠ | `bg-black/80` |

**Bilan : 25 écarts sur 32 contrôles ; 7 conformes.**

⚠ **Lecture à ne pas sur-interpréter.** Le dépôt assume DÉJÀ que `.mt-*` et `ui/*` sont deux
implémentations parallèles, au moins pour la case à cocher : `core.css` dit noir sur blanc que
`.mt-check__box` est un **spécimen DS** et que « la case que l'application rend est
`ui/checkbox.tsx` — même tier, mécanisme différent » (bloc #415). Ces 25 lignes sont donc des
**divergences mesurées entre le spécimen DS et le composant livré**, pas 25 bogues. Savoir
lesquelles sont des défauts et lesquelles sont un parallélisme assumé est un arbitrage de charte
qui demande le designer : je ne l'ai pas tranché en douce. Corriger `Input.font-size` 17→14
toucherait tous les formulaires du produit, et **#294 grave ses captures de référence juste après
moi** — le faire ici serait le pire moment. → suivi chiffré ci-dessous.

## 6. Angles morts

### Couverts (les deux demandés)

- **Contraste des icônes** — 4 stories `ui-iconbutton--*`, 12 nœuds SVG, 2 thèmes. Contraste sur le
  fond **peint réel** (remontée d'ancêtres + compositing alpha, PIT-S58-001) : **minimum 5,85:1**
  (clair 5,96–6,11 ; sombre 5,85–6,26). Tous ≥ 3:1 (WCAG 1.4.11). Sonde synthétique armée
  (`#FBFBFC` sur fond clair) correctement attrapée à **1,01**.
- **Contraste des placeholders** — `Input` : **5,96:1** clair / **6,26:1** sombre → conforme.
  `Textarea` : **2,82:1** clair / **2,99:1** sombre → **NON CONFORME** (< 4,5:1, et même < 3:1).
  Cause identifiée : `ui/textarea.tsx` rend la classe DS `.mt-textarea`, dont
  `::placeholder` utilise `--color-ink-faint` ; `ui/input.tsx` (shadcn) utilise
  `placeholder:text-muted-foreground` (`--color-ink-muted`) et échappe au problème par accident.
  **C'est la spec DS elle-même qui échoue** (`.mt-input::placeholder` porte le même `ink-faint`) :
  tout champ qui suivrait le DS à la lettre serait non conforme. Non corrigé — décision de charte
  sur un token à 9+ consommateurs. → suivi ci-dessous.

### NON couverts après moi — à savoir

- **États hover / focus / actif : toujours pas mesurés.** Aucun anneau de focus mesuré. Raison
  technique constatée : dans un iframe hors écran et non peint, **les transitions CSS n'avancent
  pas** — `opacity` restait à `0` 600 ms après l'ouverture de la bulle, alors que la règle
  s'appliquait ; il a fallu neutraliser `transition` pour lire la valeur cible. Toute mesure d'état
  transitoire dans ce montage est donc à considérer comme non fiable.
- **Bordures / surfaces invisibles en sombre (surface vs surface)** : non audité.
- **Alignement pixel des 21 autres composants** (Button, Badge, Tag, Table, Tabs, Avatar, Toast,
  Switch, Radio, et les 8 `Timeline/*`) : non audité — le critère 3 ne nommait que 5 composants.
- **Cohérence visuelle des 5 sous-composants Timeline** (critère 4) : vérifiée seulement sous
  l'angle débordement/géométrie (`Ruler`, `DateStamp`, `Cursor`, + `Lane`/`EventBar` via les
  contrôles de shell). Aucune revue de cohérence stylistique fine.
- **Aucune capture de référence** : rien ici ne détectera une régression visuelle future. C'est
  exactement l'objet de **#294**, qui passe après.
- Le contraste des 80 stories n'a **pas** été refait (fait par le lead, chiffres au briefing).

## 7. Tests — chiffres réels et codes de sortie

Tableau ci-dessous = **re-run du cycle 2** (après le recalage du seuil à 52 px). Les 5 gates
avaient déjà été joués au cycle 1 avec les mêmes chiffres et les mêmes codes de sortie.

| Gate | Commande | Résultat | Code de sortie |
|---|---|---|---|
| Vitest | `./scripts/test-quiet.sh frontend` | **112 fichiers, 1296 tests, 1296 passés** | **0** |
| Types | `npx tsc --noEmit` | aucune erreur | **0** |
| Lint | `npm run lint` | « No ESLint warnings or errors » | **0** |
| Build | `npm run build` | « Compiled successfully in 3.8s » | **0** |
| Storybook | `npm run build-storybook` | « build completed successfully » | **0** |

`build-storybook` joué **parce que j'ai touché la config Storybook** (le nouvel import `next/font`
dans `preview.ts` devait survivre à un build de production). Ses 2 avertissements Vite
(`"use client"` dans `tabs.tsx` / `checkbox.tsx`) sont **pré-existants** : ils portent sur des
fichiers que je n'ai pas modifiés.

**Non joué** : Playwright / E2E (interdit par le briefing, runtime réservé aux vagues 4-5) ; tests
backend (hors périmètre) ; aucune capture de régression visuelle.

Aucun test unitaire ajouté : `DateStamp` n'en avait aucun, et le comportement livré est une
**requête de conteneur** — jsdom ne fait pas de mise en page, un test y serait un faux vert du
même genre que PIT-S51 (scroll sous jsdom). La preuve est la mesure navigateur ci-dessus. Un vrai
garde-fou demanderait un E2E → suivi ci-dessous.

⚠ `frontend/storybook-static/` (artefact de build, **gitignoré**) est resté sur le disque : sa
suppression exige `rm -rf`, qui demande une confirmation explicite. À supprimer si gênant.

## 8. Signaux `[MEMORY:*]`

- `[MEMORY:pitfall]` Contexte : le preview Storybook ne reproduisait NI le thème NI les polices de
  l'app (`--font-ui/display/mono` = chaîne vide, `<html class="">`). Solution : décorateur +
  `globalTypes` appliqués à `document.documentElement`, polices importées depuis `app/fonts.ts` avec
  le dérivé `--font-ui: var(--font-display)`. Prévention : un preview qui ne pose pas le shell de
  `app/[locale]/layout.tsx` rend une AUTRE application — toute mesure typographique ou de thème
  prise avant ce constat est nulle.
- `[MEMORY:pitfall]` Contexte : mesure de débordement par `Range.getClientRects()`. DEUX défauts
  opposés, les deux rencontrés sur la même issue. (1) l'API **ignore le rognage `overflow:hidden`**
  et rapporte le texte masqué — elle comptait mon `sr-only` comme +6,9 px de débordement ;
  (2) inversement, elle renvoie des **boîtes de ligne bornées à la boîte de contenu**, donc un mot
  INSÉCABLE plus large que sa boîte n'y apparaît jamais : elle rendait structurellement 0 sur un
  rognage réel de 15 px, et a produit 2 lignes fausses dans mon rapport de cycle 1. Prévention :
  pour « ça déborde de sa boîte ? », la sonde est `scrollWidth - clientWidth` sur l'élément qui
  rogne — jamais une largeur de `Range`. Réserver `Range` à la mesure d'un texte NON contraint.
- `[MEMORY:pitfall]` Contexte : un seuil de requête de conteneur qui RÉVÈLE du contenu
  (`@min-[N]:not-sr-only`). Solution : si N est choisi à vue et non dérivé de la largeur mesurée du
  contenu + padding, on crée une **bande cassée** — le contenu réapparaît sans la place de
  s'afficher et se fait rogner, ce qui est pire que de le masquer (seuil à 34 px alors que `fr`
  exige 49,3 px → 15 px rognés entre 34 et 50 px). Prévention : dériver le seuil de la mesure du
  jeton le plus large **sur toutes les locales du produit** (ici 26 px d'écart entre `de` et `fr`),
  et valider par un BALAYAGE CONTINU de largeurs, pas par 4 valeurs rondes — la bande tombait
  entre deux paliers testés.
- `[MEMORY:pitfall]` Contexte : parcours des `document.styleSheets` pour retrouver une règle.
  Solution : un `CSSStyleRule` moderne expose un `cssRules` VIDE mais défini ; un `if (r.cssRules)`
  avant le test de `selectorText` saute donc toutes les règles feuilles (0 résultat sur une règle
  pourtant présente). Prévention : tester `selectorText` d'ABORD, puis récurser sur
  `r.cssRules && r.cssRules.length`.
- `[MEMORY:pitfall]` Contexte : lecture d'un état ouvert (tooltip) dans un iframe hors écran.
  Solution : les **transitions CSS n'avancent pas** dans un iframe non peint — `opacity` restait à
  0 après 600 ms alors que la règle `opacity:1` s'appliquait bien. Prévention : neutraliser
  `transition` avant de lire une valeur cible, et ne jamais conclure « la règle ne s'applique pas »
  depuis une valeur transitionnée. Complète PIT-S58-002 (qui traite du cas inverse : lire trop tôt).
- `[MEMORY:pitfall]` Contexte : `timeline-ruler--thirty-days` se décrit « comme le dashboard », et
  le briefing l'a relayé comme cas de production. Solution : `grep` des appelants — le dashboard a
  son propre `TimelineRuler` en pixels absolus, le seul consommateur de `Ruler`/`DateStamp` est la
  mini-frise à 6 graduations. Prévention : un **commentaire de story** est un énoncé périmable au
  même titre qu'un énoncé d'issue (PIT-S71-001, PIT-S74) — le vérifier avant de dimensionner un
  correctif sur lui.
- `[MEMORY:decision]` Contexte : `DateStamp` déborde parce que le jour de semaine est un mot
  insécable dans une piste `1fr` sans plancher. Décision : dégradation par **requête de conteneur**
  (`@container` sur la cellule, `@min-[34px]:*` sur l'enveloppe) — sous le seuil, jour de semaine en
  `sr-only` et numéro conservé ; `overflow-hidden` en filet. Pourquoi : c'est le seul arbitrage qui
  reste juste pour les deux consommateurs d'échelles opposées (6 graduations vs N jours), sans
  amputer le jeton porteur ni perdre l'information pour les technologies d'assistance.
- `[MEMORY:bug]` Contexte : contraste des placeholders, angle mort jamais mesuré. Cause : la spec DS
  `::placeholder` utilise `--color-ink-faint` → **2,82:1** en clair et **2,99:1** en sombre sur
  `.mt-textarea`. Solution : non corrigée ici (décision de charte, token à 9+ consommateurs, et
  #294 grave ses références juste après). Règle : `ink-faint` ne tient pas 4,5:1 — tout champ qui
  suit le DS à la lettre est non conforme ; `ui/input.tsx` n'y échappe que par accident, en
  utilisant `ink-muted` (5,96:1).

## 9. Recommandations suite

- RECOMMAND_FOLLOWUP `[triage M | domaine frontend]` — Trancher les **25 écarts** spécimen DS vs
  composant livré du §5 (Input/Select/Checkbox/Card/Dialog) : pour chacun, décider « aligner le
  composant sur `core.css` » ou « acter le parallélisme et corriger la spec ». Touche tous les
  formulaires → à faire APRÈS #294, avec ses captures comme filet.
- RECOMMAND_FOLLOWUP `[triage S | domaine frontend]` — Contraste des placeholders : `ink-faint` à
  **2,82:1** clair / **2,99:1** sombre sur `.mt-textarea` (et `.mt-input` par la spec). Choisir un
  token conforme ou documenter l'exemption, et aligner `ui/input.tsx` et `ui/textarea.tsx` sur le
  même token — ils divergent aujourd'hui.
- RECOMMAND_FOLLOWUP `[triage S | domaine frontend]` — Mesurer les états **hover / focus / actif**
  des 26 composants (aucun anneau de focus n'a jamais été mesuré en Storybook) ; exige un montage
  qui PEINT réellement, les transitions n'avançant pas dans un iframe hors écran.
- RECOMMAND_FOLLOWUP `[triage XS | domaine frontend]` — `Cursor` à `positionPercent=100` : le
  marqueur de 2 px est entièrement rogné, donc invisible. Décider d'un décalage d'un demi-pixel de
  barre ou acter le cas limite.
- RECOMMAND_FOLLOWUP `[triage S | domaine frontend]` — E2E de non-régression du débordement
  `DateStamp` aux 4 largeurs × 2 thèmes : jsdom ne fait pas de mise en page et ne peut pas garder
  ce correctif (même famille de faux vert que les tests de scroll sous jsdom).
- Aucun besoin de RECOMMAND_TEST_RUNNER — les 5 gates ont été joués ici, codes de sortie au §7.
- Aucun besoin de RECOMMAND_DB_EXPERT — aucune touche base de données dans cette issue.
- Aucun besoin de RECOMMAND_SECURITY_EXPERT — aucune touche auth, données personnelles ou API externe.
- Aucun besoin de RECOMMAND_PLAYWRIGHT_REVIEWER — aucun test E2E écrit ni modifié ici.

STATUS: COMPLETED
