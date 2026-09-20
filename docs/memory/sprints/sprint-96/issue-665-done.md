# Issue #665 — Rangée de pastilles : cibles tactiles et retour à la ligne

Branche : `claude/sprint-96-start-b98611` — worktree
`/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/amazing-rubin-93b16e`
(`git rev-parse --abbrev-ref HEAD` → `claude/sprint-96-start-b98611`, vérifié au démarrage).

## Objectif

Deux défauts de mise en page du sélecteur de couleur partagé
(`ui/palette-color-picker.tsx`, livré par #577), sur les trois surfaces qui le montent :

1. cibles tactiles sous les 44×44 px exigés par `ds/a11y-audit.md` en viewport mobile ;
2. rangée de pastilles déséquilibrée, avec une 12e pastille seule sur sa ligne.

## Fichiers modifiés

- `frontend/src/components/ui/palette-color-picker.tsx` — la correction.
- `frontend/src/styles/ds/a11y-audit.md` — §Mobile Form : la ligne « swatches couleur »
  passe de ⚠️ à ✅, avec le chiffre périmé corrigé et l'écart à PAT-S24-002 justifié.
- `frontend/e2e/sprint-96-palette-geometry.spec.ts` (**nouveau**) — le garde-fou.
- `frontend/e2e/sprint-95-toast-overlap.spec.ts` — réparation d'une prémisse tacite que
  cette correction met en défaut (détail en §Tests, régression 2).

Aucun `data-testid` ajouté ni renommé : le contrôle coverage-E2E n'a pas de nouvelle
surface à couvrir, et les 6 specs qui citent la palette gardent leurs sélecteurs.

## Ce qui a changé, concrètement

| | avant | après |
|---|---|---|
| Conteneur des 12 pastilles | `flex flex-wrap items-center gap-2` | `grid w-fit grid-cols-6 gap-1.5 sm:gap-2` |
| Pastille | `size-7` (28 px) | `size-11 sm:size-7` (44 px mobile, 28 px desktop) |
| Glyphe de coche | `size-4` | `size-5 sm:size-4` |
| « Personnalisé » | `h-7 … px-2.5` | `h-11 … px-3.5 sm:h-7 sm:px-2.5` |

Le point de rupture est `sm` (640 px), donc **le rendu desktop est inchangé au pixel près**
(vérifié, §Mesures). La navigation clavier, l'ordre DOM, les `data-testid`, le contrat de
non-réécriture (DEC-S84-001) et la peinture par `var(--evt-*)` ne bougent pas.

## Mesures

Toutes les valeurs ci-dessous sont des `boundingBox()` relevées au navigateur (Chromium,
`next build` + `next start -p 3000`, backend conteneur `backend-e2e` sur `:8085`), par une
sonde jetable `e2e/zz-probe-665.spec.ts` écrite pour l'occasion et **supprimée depuis**.
Commande :

```
cd frontend && SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 \
  NEXT_PUBLIC_API_URL=/api E2E_API_PROXY_TARGET=http://localhost:8085 \
  rtk proxy npx playwright test zz-probe-665 --workers=1 --reporter=line
```

`rtk proxy` est obligatoire : sous le hook RTK, le runner est forcé en `--reporter=json`
puis résumé, et la sortie de la sonde disparaît (PIT-S93-004, même famille).

### AVANT correction — le défaut, reproduit et non pas supposé

| Surface | viewport | largeur du `radiogroup` | découpage | pastille | « Personnalisé » |
|---|---|---|---|---|---|
| CategoryDrawer | 375 | 325 px | **9 + 3** | 28×28 | 153×28 |
| ProductDrawer | 375 | 400 px | **11 + 1** ← orpheline | 28×28 | 133×28 |
| CategoryDrawer | 1280 | 402 px | **11 + 1** ← orpheline | 28×28 | 153×28 |
| ProductDrawer | 1280 | 402 px | **11 + 1** ← orpheline | 28×28 | 133×28 |
| EventEditForm | 1280 | 377 px | **10 + 2** | 28×28 | 133×28 |

Trois surfaces, trois découpages, aucun voulu — c'est la signature d'un `flex-wrap` dont
le résultat dépend de la largeur disponible.

### APRÈS correction

| Surface | viewport | largeur du `radiogroup` | découpage | pastille | « Personnalisé » | débord. |
|---|---|---|---|---|---|---|
| CategoryDrawer | 375 | 294 px | 6 + 6 | **44×44** | 161×44 | 0,0 px |
| ProductDrawer | 375 | 294 px | 6 + 6 | **44×44** | 141×44 | 0,0 px |
| EventEditForm | 375 | 294 px | 6 + 6 | **44×44** | 141×44 | 0,0 px |
| CategoryDrawer | 1280 | 208 px | 6 + 6 | 28×28 | 153×28 | 0,0 px |
| ProductDrawer | 1280 | 208 px | 6 + 6 | 28×28 | 133×28 | 0,0 px |
| EventEditForm | 1280 | 208 px | 6 + 6 | 28×28 | 133×28 | 0,0 px |

Les cotes desktop (28×28, « Personnalisé » 153/133×28) sont **identiques** à celles d'avant :
la ligne `sm:` fait bien ce qu'elle annonce.

### Pourquoi `gap-1.5` et non `gap-2` en mobile — une mesure, pas un goût

Première version livrée avec `gap-2` partout : `EventEditForm` @375 rendait alors
`groupW = 301 px` et un **débordement de 0,5 px** de la dernière colonne. Cause :
`w-fit` vaut `min(max-content, disponible)` ; à 8 px d'écart l'intrinsèque vaut
6×44 + 5×8 = **304 px**, soit 3 px de plus que les 301 px disponibles dans cette surface.
Les colonnes se compriment à 43,5 px pendant que les boutons restent figés à 44 px.
À 6 px d'écart l'intrinsèque tombe à **294 px** : les colonnes valent exactement 44 px
sur les trois surfaces, débordement mesuré **0,0 px** (tableau ci-dessus). Desktop
conserve `gap-2`.

### Écart assumé à PAT-S24-002 (`::before` transparent 44×44)

Le motif maison pour agrandir une cible sans toucher au visuel est un pseudo-élément
hors flux (`language-selector`, `theme-toggle`, `.mt-zoom__btn`). Il est **inapplicable ici**,
pour deux raisons vérifiables :

- **Chevauchement.** Au pas de grille d'origine (28 + `gap-2` = 36 px), des pseudos de
  44 px se recouvriraient de 8 px : deux cibles adjacentes se disputeraient les mêmes
  pixels. Aucune tolérance ne rattrape ça.
- **Clipping.** PIT PAT-S24-002 : le pseudo déborde du groupe et un ancêtre défilant le
  rogne en silence (`overflow-y:auto` force `overflow-x` à `auto`). Les trois surfaces
  concernées **sont** des panneaux défilants — c'est d'ailleurs ce qui a produit la
  régression 2 ci-dessous.

La charte n'impose « conserver le visuel » qu'au `✕` de fermeture ; pour les swatches
elle ne demande que d'« élargir la cible » (`a11y-audit.md` §Mobile Form l.77-78, avant
mise à jour). Agrandir la boîte satisfait la règle **et** rend la cible mesurable par
`boundingBox()`, sans sonde de pseudo-élément — c'est ce que fait le garde-fou.

## Tests

Stack : image backend `s95fix-backend-e2e:latest` re-taguée (aucun commit `backend/` depuis
sa création — dernier commit `backend/` `41aa3c76` du 17/09 22:08, image du 17/09 22:13),
`docker compose -p amazingrubin93b16e --profile e2e up -d --no-build backend-e2e`.
Oracle avant chaque run : `/api/auth/me` → **401** ET `/fr/login` → **200**.

### Unitaires / typecheck / lint / format

- `./scripts/test-quiet.sh frontend` → **OK** (build + Vitest + `tsc --noEmit` + `next lint`,
  « No ESLint warnings or errors »).
- `npx prettier --check` sur mes 4 fichiers → **All matched files use Prettier code style!**

### Nouvelle spec — `e2e/sprint-96-palette-geometry.spec.ts`

**6 passed / 0 failed** (3 surfaces × 2 thèmes, viewport 375×812).
Chaque test mesure les 12 pastilles + « Personnalisé » et vérifie : (a) `min(w,h) ≥ 44` ;
(b) aucun groupe de cardinal 1, **et** découpage exactement `[6, 6]` ; (c) l'ordre visuel
(haut→bas, gauche→droite) est l'ordre DOM d'`EVENT_PALETTE`.

Contrôle négatif : les assertions (a) et (b) sont réfutées par les chiffres du tableau
« AVANT » (28×28, découpages 9+3 / 11+1 / 10+2), relevés sur les mêmes surfaces, au même
viewport, par la même méthode. **Réserve honnête :** `EventEditForm` @375 n'a pas été
mesuré avant correction — la sonde utilisait le déclencheur desktop, caché en 375 px.
Les deux autres surfaces l'ont été.

### Specs rejouées (liste grep complète du briefing)

Run groupé final, `--workers=1` :
`sprint-96-palette-geometry`, `categories.spec`, `sprint-70-preview-visual`,
`sprint-73-model-vs-rendered`, `sprint-95-toast-overlap` → **31 passed / 0 failed** (41 s).
`timeline.spec` (run précédent, même code) → **passed**, aucun échec.

`git status --porcelain | /usr/bin/grep darwin` après chaque run → **aucun PNG `-darwin`**.
GF-5 ne s'applique pas ici : `/usr/bin/grep -c toHaveScreenshot` rend **0** sur
`sprint-70-preview-visual` et `sprint-73-model-vs-rendered`. Ces deux specs sont
« visuelles » au sens où elles LISENT des pixels (`support/pixel.ts`), pas au sens de la
comparaison de captures de référence. Aucun vert vide possible de ce côté.

### Régression 1 — `sprint-84-palette.spec.ts:128` (flèche droite) : flake préexistant, NON aggravé

Rouge lors du premier run groupé. Signature : `aria-checked="true"` est bien passé sur
pervenche — **la sélection avance**, seul `toBeFocused()` rend « inactive ». C'est la
signature du flake connu de #702, pas une rupture de sélecteur, de compte de pastilles ni
de testid.

A/B mesuré, 10 invocations séquentielles de chaque côté (`--repeat-each` est inutilisable
sur ce dépôt, PIT-S95-002) :

| | échecs / runs |
|---|---|
| base (composant restauré depuis `HEAD`, rebuild complet) | **5 / 10** |
| branche (correction #665) | **4 / 10** |

Aucune preuve d'aggravation ; le flake est sévère sur ce poste des deux côtés. Je ne m'en
empare pas — c'est #702, vague 2.

**Ce que ma grille change pour la navigation clavier — entrée principale de #702 :**

- **Ordre DOM : inchangé.** Les 12 `<button role="radio">` sont émis dans l'ordre
  d'`EVENT_PALETTE`. La grille ne réordonne pas (vérifié par l'oracle (c) de ma spec).
- **Roving tabindex : inchangé.** `tabStop` = index coché sinon 0 ; un seul arrêt de
  tabulation. Aucun nouveau `tabIndex`.
- **Handler `handleKeyDown` : inchangé.** Navigation LINÉAIRE : →/↓ = +1 avec bouclage,
  ←/↑ = −1 avec bouclage, `Home`/`End` aux extrêmes.
- **Ce qui change donc : uniquement la correspondance entre l'ordre linéaire et la
  géométrie.** Avant, l'ordre linéaire suivait grosso modo une ligne unique (11+1, 10+2).
  Maintenant il est franchement à deux dimensions : `ArrowRight` depuis la 6e pastille
  (sarcelle) descend d'une ligne et revient à gauche, et `ArrowDown` avance d'**une** case
  et non de six. C'est conforme au motif `radiogroup` de l'APG (un groupe n'a qu'un ordre),
  mais si #702 veut une sémantique de grille (↓ = +6), c'est ici et nulle part ailleurs.
- **Le cas exact de la spec :** cobalt (index 7) → pervenche (index 8). Avant, les deux
  étaient sur la ligne 1 ; maintenant ils sont ligne 2, colonnes 2 et 3. Tous deux
  toujours adjacents horizontalement, donc le geste testé n'a pas changé de nature.

### Régression 2 — `sprint-95-toast-overlap.spec.ts:417` : cassée par ma correction, réparée

Rouge au premier run groupé : « la croix doit être à `top-4` du haut de la sheet
(sheet=53px, croix=56px) », écart 13 px pour un `EPSILON` de 2.

**A/B fait avant toute conclusion** (étiquette « pré-existant » interdite sans preuve) :
composant restauré depuis `HEAD`, rebuild complet, run → **9 passed / 0 failed**.
La régression est donc bien la mienne.

Mécanisme : la croix de `DialogContent` (`ui/dialog.tsx` l.47) est `absolute top-4 right-4`
**à l'intérieur** du `[role="dialog"]`, qui est aussi le conteneur défilant. Un descendant
`position:absolute` d'un conteneur défilant **défile avec le contenu** : son ordonnée vaut
`sheet.y + 16 − scrollTop`. L'invariant testé est donc un invariant de mise en page, valable
à défilement nul seulement. Jusqu'au S95 il tenait par accident : `openFilledCreateSheet`
remplit `product-first-event-date`, Playwright amène le champ dans le viewport avant de le
remplir, et ce champ était le dernier au-dessus de la ligne de flottaison. La palette
mobile passée à 44 px allonge le contenu de la sheet de **672 → 702 px** (chiffre imprimé
par la spec elle-même) ; le champ passe sous la ligne, le remplissage défile de 13 px.

Réparation : remise à zéro du `scrollTop` de la sheet avant de mesurer la croix, avec le
raisonnement écrit en commentaire dans la spec. **Ce n'est pas un affaiblissement** —
après réparation la spec rend, pour le régime 390×667, `croix y=70` et
`recouvrement=14,4 px`, soit **exactement** les valeurs relevées sur le code de base.
Le régime reste clampé à 92vh et le recouvrement reste strictement partiel.
`sprint-95-toast-overlap` → **9 passed / 0 failed**.

## Écarts à l'énoncé

1. **Les numéros de ligne cités sont exacts** (vérifié) : `:113-118` = le `flex flex-wrap`
   du conteneur et du `radiogroup`, `:144` = `size-7` (28 px), `:182` = `h-7` du bouton
   « Personnalisé ».
2. **Le 4e consommateur signalé par l'architect n'existe pas.**
   `/usr/bin/grep -rn "PaletteColorPicker\|palette-color-picker" frontend/src --include="*.tsx"`
   ne rend `ui/popoverPicker.tsx` qu'à la **ligne 29, dans un commentaire**.
   `PopoverPicker` est l'**enfant** de `PaletteColorPicker` (importé à la ligne 10), pas son
   appelant. La liste de l'énoncé — `CategoryDrawer`, `EventEditForm`, `ProductDrawer` — est
   **complète et exacte**. (Note zsh : `--include=*.tsx` sans guillemets fait échouer la
   commande entière sur `no matches found`.)
3. **« la 12e pastille passe seule sur une deuxième ligne dans le tiroir catégorie
   (largeur ~452 px) » — vrai, et incomplet.** Reproduit : `CategoryDrawer` @1280 rend bien
   11 + 1. Mais `ProductDrawer` rend **11 + 1 aussi**, à 1280 **et** à 375 px, et
   `EventEditForm` rend **10 + 2**. Le défaut touchait les trois surfaces, pas une seule.
   La largeur réelle mesurée est celle du `radiogroup` : **402 px** (le « ~452 px » de
   l'énoncé désigne la largeur du tiroir, pas celle du groupe).
4. **Le chiffre du DS était périmé.** `a11y-audit.md` §Mobile Form décrivait les swatches
   comme « 34 px de haut » ; mesure réelle avant correction : **28×28**. Corrigé dans le
   document.
5. **Aucune divergence DS / énoncé de fond** sur l'objectif (44×44). Divergence de
   *moyen* seulement : le DS suggère « padding ou pseudo-élément » ; j'ai agrandi la
   boîte, pour les deux raisons mesurées plus haut, et je l'ai consigné dans le DS.

## Constat hors périmètre, non corrigé

`frontend/e2e/settings-mobile.spec.ts` **viole `prettier`** : `npm run format:check` rend
`[warn] e2e/settings-mobile.spec.ts`. Le fichier n'est pas à moi — il vient du commit
`237a89f6` (« cible tactile 44px du bouton retour mobile (#633) »), l'autre agent de la
vague 1. Je n'y touche pas (fichiers disjoints, consigne du briefing), mais **la CI
`frontend` sera rouge sur `format:check` tant qu'il n'est pas reformaté**. À signaler à
l'agent #633 ou à reformater en clôture.

Piège associé, re-confirmé : `npx prettier --check` **sous le hook RTK rend « All files
formatted correctly » alors que la vérification échoue**. Seul `rtk proxy npx prettier
--check` dit la vérité. C'est ce qui a failli me faire livrer ma propre spec non formatée.

## Recommandations suite

- `RECOMMAND_FOLLOWUP: la croix « ✕ » de DialogContent (frontend/src/components/ui/dialog.tsx:47) est en position absolute À L'INTÉRIEUR du conteneur défilant [role="dialog"] : elle défile donc avec le contenu et, sur un viewport court (390×667) avec un formulaire rempli, elle remonte vers le haut de la sheet puis sous la bande du toast. Mesuré au S96 : scrollTop de 13 px suffit à la déplacer de top-4 à top-3px. Décider si elle doit être sticky / hors flux de défilement, ou si l'overlay tapable suffit (arbitrage #714). [triage S] [frontend-ui + ds]`
- `RECOMMAND_FOLLOWUP: navigation clavier du radiogroup de palette, maintenant que la disposition est une vraie grille 6×2 : décider si ↑/↓ doivent se déplacer d'une LIGNE (±6) plutôt que d'une case (±1). Le motif radiogroup de l'APG autorise le linéaire actuel ; une sémantique de grille serait plus prévisible avec deux rangées visibles. À traiter avec #702, qui touche déjà frontend/src/components/ui/palette-color-picker.tsx. [triage XS] [frontend-ui]`
- `RECOMMAND_FOLLOWUP: reformater frontend/e2e/settings-mobile.spec.ts avec prettier (violation introduite par le commit 237a89f6 de #633) — sinon le job CI frontend échoue sur npm run format:check. [triage XS] [frontend]`
- **Pas de `RECOMMAND_TEST_RUNNER`** : le volume rejoué est de 31 tests en 41 s pour le run
  final, 65 tests en 1 min 12 s pour le run groupé le plus large — très en deçà des
  ~3 min / 500 tests du seuil.
- **Pas de `RECOMMAND_SECURITY`** : aucune surface d'authentification, de donnée
  personnelle ni d'appel externe touchée — uniquement des classes de mise en page.
- **Pas de `RECOMMAND_DB_EXPERT`** : aucun changement de schéma, d'entité, de requête ni
  de DTO. `zod_dto_sync` = NON, confirmé (le contrat reste un hex `#RRGGBB`).
- **Pas de `RECOMMAND_UI_DESIGN`** : correction de conformité sur un composant existant,
  pas un nouvel écran. La source normative (`ds/a11y-audit.md`) a été lue, citée et mise à
  jour. Un arbitrage Designer serait toutefois légitime sur **un** point si la vague
  suivante veut le rouvrir : en viewport mobile la pastille est désormais un disque de
  44 px, donc plus grande visuellement, là où la charte préfère en général conserver le
  visuel et n'étendre que la zone tactile. Le raisonnement qui écarte cette option est
  écrit ci-dessus et dans le DS ; il repose sur deux faits mesurés, pas sur une préférence.

## Signaux mémoire

`[MEMORY:pitfall]` **Contexte** : un `flex-wrap` de N éléments produit un découpage qui
dépend de la largeur disponible, donc DIFFÉRENT par surface d'accueil. Au S96, le même
composant de palette rendait 9+3, 11+1 et 10+2 selon l'écran, et l'issue n'en avait vu
qu'un seul. **Solution** : `grid-cols-N` + `w-fit` — le découpage devient une propriété du
composant, plus une conséquence de son contexte. **Prévention** : dès qu'un « retour à la
ligne inesthétique » est signalé sur UN écran, mesurer les AUTRES points de montage avant
de corriger ; il y en avait deux de plus ici.

`[MEMORY:pitfall]` **Contexte** : `w-fit` sur une grille vaut `min(max-content, disponible)`.
Si la largeur intrinsèque dépasse de peu le conteneur, les colonnes se compriment pendant
que des enfants à taille FIGÉE (`size-11`) débordent de leur cellule — 0,5 px au S96,
invisible à l'œil et invisible à un test de classes. **Solution** : dimensionner l'écart de
grille pour que l'intrinsèque tienne dans la plus ÉTROITE des surfaces (294 ≤ 301 ici).
**Prévention** : mesurer le débordement
(`max(x+w) − (min(x) + groupWidth)`) sur toutes les surfaces, pas seulement la plus large.

`[MEMORY:pitfall]` **Contexte** : un élément `position:absolute` enfant d'un conteneur
`overflow:auto` DÉFILE avec le contenu. Une spec qui asserte sa position par rapport au
conteneur (`close.y === sheet.y + 16`) teste donc un invariant qui n'est vrai qu'à
`scrollTop === 0` — prémisse tacite, qui tient tant que le contenu est court. Au S96,
+30 px de contenu l'a fait tomber, et le message d'échec accusait la correction d'un
défaut de POSITION qu'elle ne causait pas. **Solution** : remettre `scrollTop` à 0 avant de
mesurer, et écrire la prémisse. **Prévention** : toute assertion de la forme
« enfant.y == parent.y + constante » dans un conteneur défilant doit soit neutraliser le
défilement, soit le mesurer.

`[MEMORY:pitfall]` **Contexte** : `npx prettier --check` sous le hook RTK rend
« Prettier: All files formatted correctly » alors que la vérification ÉCHOUE. Le garde-fou
GF-4 disait « ne pas croire sa sortie sous RTK — utiliser `npx` en direct » : c'est
insuffisant, `npx` EST intercepté. **Solution** : `rtk proxy npx prettier --check`.
**Prévention** : même règle que `/usr/bin/grep` — pour toute MESURE ou toute VÉRIFICATION,
court-circuiter RTK explicitement. (S'ajoute au cas déjà connu de `playwright --list`,
PIT-S93-004, et de `grep`, PIT-S93-008.)

`[MEMORY:pattern]` **Problème** : prouver qu'une correction de mise en page corrige quelque
chose, quand jsdom ne met rien en page et qu'un test de `className` resterait vert quoi
qu'il arrive. **Solution** : une sonde Playwright JETABLE écrite AVANT la correction, qui
imprime les boîtes en JSON sur une ligne marquée (`###PROBE###`) et se lance via
`rtk proxy` ; ses chiffres deviennent le contrôle négatif de la spec définitive, puis elle
est supprimée. Au S96 : 5 lignes de tableau « avant » que personne n'aurait pu contester.
**Anti-motif** : écrire d'abord la spec définitive, la voir verte, et n'avoir aucune preuve
qu'elle aurait été rouge avant.

`[MEMORY:decision]` **Contexte** : porter les pastilles de palette à 44×44 px en mobile.
**Décision** : AGRANDIR la boîte (`size-11 sm:size-7`) au lieu d'appliquer PAT-S24-002
(`::before` transparent 44×44 hors flux), pourtant le motif maison. **Pourquoi** : (1) au pas
de grille d'origine (36 px) des pseudos de 44 px se chevaucheraient de 8 px ; (2) les trois
surfaces sont des panneaux défilants, et `overflow-y:auto` force `overflow-x` à `auto`, donc
le débordement du pseudo serait rogné en silence — le défaut exact de PIT PAT-S24-002 ;
(3) la charte n'exige « conserver le visuel » que pour le `✕` de fermeture, et ne demande
pour les swatches que d'« élargir la cible ». Conséquence assumée : le disque est
visuellement plus grand en mobile. Desktop strictement inchangé.

STATUS: COMPLETED
