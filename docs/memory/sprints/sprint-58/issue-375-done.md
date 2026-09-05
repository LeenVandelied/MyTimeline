# Issue #375 — contour `:focus-visible` sur Firefox et WebKit — rapport d'exécution

> Branche `claude/sprint-58-start-26b185`, base `3789f23` (fin de vague 2).
> Livrable = une **mesure**. Aucun correctif de code n'était justifié.

## Verdict

**La conformité WCAG 2.4.7 annoncée au Sprint 52 TIENT.** Elle est même mieux étayée
qu'annoncée : le contour est peint, `:focus-visible` vaut `true`, et le ratio mesuré
au pixel va de **5.93:1 à 6.94:1** selon la cible et le thème — le seuil de WCAG
1.4.11 étant 3:1. Les trois moteurs se comportent à l'identique.

Le risque énoncé par l'issue (« si le contour est invisible ou sous-contrasté sur un
des deux moteurs, la conformité doit être retirée ») **ne s'est pas matérialisé**.
Le commentaire de `language-selector.tsx` l. 53-60 n'a donc pas été corrigé : ses
chiffres (6.08 clair / 6.48 sombre sur la surface du popover) sont **exactement** ceux
que ma mesure indépendante retrouve.

## Tableau de mesures

Terrain : `/fr/login` (sélecteur monté en `HeaderSection`), `next dev` de CE worktree
sur `:3100`, viewport 1280×900, `deviceScaleFactor: 1`, overlay `nextjs-portal`
neutralisé. Locale `fr` → l'item actif est « Français ».

### Item de locale ACTIVE (fond = surface du popover)

| Moteur | Thème | `:focus-visible` | `outline` calculé | Ratio MESURÉ au pixel | Fond réel sous le trait |
|---|---|---|---|--:|---|
| Chromium 149.0.7827.55 | clair | ✅ true | `solid 2px rgb(14,95,196)` off=2px | **6.08:1** | `rgb(255,255,255)` |
| Chromium 149.0.7827.55 | sombre | ✅ true | `solid 2px rgb(77,155,255)` off=2px | **6.48:1** | `rgb(19,21,25)` |
| Firefox 151.0 | clair | ✅ true | `solid 2px rgb(14,95,196)` off=2px | **6.08:1** | `rgb(255,255,255)` |
| Firefox 151.0 | sombre | ✅ true | `solid 2px rgb(77,155,255)` off=2px | **6.48:1** | `rgb(19,21,25)` |
| WebKit 26.5 | clair | ✅ true | `solid 2px rgb(14,95,196)` off=2px | **6.08:1** | `rgb(255,255,255)` |
| WebKit 26.5 | sombre | ✅ true | `solid 2px rgb(77,155,255)` off=2px | **6.48:1** | `rgb(19,21,25)` |

### Déclencheur (fond = `bg` de la page)

| Moteur | Thème | `:focus-visible` | `outline` calculé | Ratio MESURÉ au pixel | Fond réel sous le trait |
|---|---|---|---|--:|---|
| Chromium 149 | clair | ✅ true | `solid 2px rgb(14,95,196)` off=2px | **5.93:1** | `rgb(252,252,253)` |
| Chromium 149 | sombre | ✅ true | `solid 2px rgb(77,155,255)` off=2px | **6.94:1** | `rgb(11,12,14)` |
| Firefox 151.0 | clair | ✅ true | `solid 2px rgb(14,95,196)` off=2px | **5.93:1** | `rgb(252,252,253)` |
| Firefox 151.0 | sombre | ✅ true | `solid 2px rgb(77,155,255)` off=2px | **6.94:1** | `rgb(11,12,14)` |
| WebKit 26.5 ⚠ | clair | ✅ true | `solid 2px rgb(14,95,196)` off=2px | **5.93:1** | `rgb(252,252,253)` |
| WebKit 26.5 ⚠ | sombre | ✅ true | `solid 2px rgb(77,155,255)` off=2px | **6.94:1** | `rgb(11,12,14)` |

⚠ Les deux lignes WebKit du déclencheur sont sous focus **programmatique** — voir
« WebKit et la touche Tab » plus bas. Les 4 autres lignes de déclencheur et **les 6
lignes d'item** sont obtenues au clavier réel.

### Contrôle négatif — modalité SOURIS

Sur les 6 combinaisons : `:focus-visible = false`, `outline-style: none`. Le contour
n'apparaît donc pas au clic. Aucun faux positif dans le harnais.

## Méthode — ce qui est mesuré au pixel vs lu dans `getComputedStyle`

- **Au pixel** : toutes les colonnes « Ratio MESURÉ » et « Fond réel ».
  `page.screenshot({clip})` d'une bande de 8×7 px partant du bord DROIT de la boîte →
  base64 → `createImageBitmap` + `canvas.getImageData` dans la page (PAT de #352).
  Trait lu à sa position géométrique (offset 2px + largeur 2px → x=2..3), fond réel
  lu dans le gap d'offset (x=0..1). 7 lignes échantillonnées, extrême conservé.
- **`getComputedStyle`** : uniquement les colonnes `:focus-visible` et
  « `outline` calculé », qui sont des états/déclarations, pas des couleurs peintes.
- **Aucune remontée d'ancêtres DOM** — c'est la méthode qui avait produit le faux
  1.00:1 de #383.
- Attente de **700 ms** après chaque changement d'état (`outline-color` entre dans
  `transition-colors` en Tailwind v4 ; sous 400 ms on lit une couleur interpolée).
- Ouverture du menu **au clavier** (`Enter` sur le déclencheur), jamais au clic :
  `:focus-visible` en dépend, et `computer{left_click}` n'ouvre de toute façon pas un
  `DropdownMenu` Radix (PIT relevé par #353).

### Deux artefacts de mon propre harnais, corrigés avant de conclure

1. **Heuristique « pixel le plus écarté du fond » → fausse cible.** Ma v1 cherchait le
   pixel de plus forte déviation dans les 7 px suivant le bord. Sur l'item elle
   attrapait la **bordure du popover** (`rgb(22,24,29)`, 1px, juste au-delà du trait)
   et annonçait 16.3:1. Corrigé en fixant les offsets d'après un **dump brut** de la
   bande. Leçon : sur une cible entourée d'autres traits, « le plus contrasté » n'est
   pas « le bon ».
2. **Résultats byte-identiques entre moteurs → suspicion levée, pas ignorée.** Les
   trois moteurs renvoyaient exactement les mêmes triplets. J'ai vérifié par dump brut
   que l'antialiasing diffère bien (Chromium `201,218,241` vs Firefox `211,225,243` sur
   le pixel de transition) : l'identité ne porte que sur le pixel **plein** du trait,
   ce qui est attendu. Le harnais n'était pas en train de piloter trois fois le même
   binaire.

## Défaut « options de `Select` sans `:focus-visible` sous Firefox » (#383)

**NON REPRODUIT** — et donc ni confirmé ni infirmé pour le contexte où #383 l'a vu.

Composant réel `ui/select.tsx` rendu via **Storybook** (`:6007`, story `UI/Select`,
sans backend), ouverture 100 % clavier puis `ArrowDown` :

| Moteur | option surlignée | `data-highlighted` | `:focus-visible` | `outline` |
|---|---|---|---|---|
| Chromium 149 | « Assurance » | ✅ | ✅ **true** | `solid 2px rgb(14,95,196)` |
| Firefox 151.0 | « Assurance » | ✅ | ✅ **true** | `solid 2px rgb(14,95,196)` |
| WebKit 26.5 | « Assurance » | ✅ | ✅ **true** | `solid 2px rgb(14,95,196)` |

Firefox place bien le focus DOM sur l'option (`activeElement = DIV[option]
tabindex=-1`) **et** lui accorde `:focus-visible`. Le contour est déclaré.

Lecture prudente : #383 a mesuré ses `Select` dans l'**application authentifiée**
(réglages, produits), où ils vivent dans des `Dialog`/`Drawer` Radix avec piège à
focus. Je n'ai pas pu atteindre ces contextes (backend non démarré ici). Mon résultat
prouve que le défaut **n'est pas intrinsèque** au couple Firefox × `ui/select.tsx`
isolé ; il ne disculpe pas les montages en surcouche modale.

**Le défaut ne touche PAS `DropdownMenu`** : les 6 combinaisons du sélecteur de langue
sont vertes, contour peint et mesuré. C'est la question que #375 devait trancher, et
elle est tranchée.

⚠ Limite du harnais Select : Storybook **n'applique pas** la classe `.dark`
(`documentElement.className` vide, `body` en `rgb(252,252,253)` dans les deux cas).
Ces lignes sont donc **thème clair uniquement**. `:focus-visible` étant un booléen
décidé par le moteur, indépendant de la palette, la conclusion tient ; mais aucun
ratio sombre de `Select` n'a été mesuré.

## WebKit et la touche `Tab` — observation à ne pas enterrer

Sous WebKit 26.5, `Tab` **n'atteint jamais** le déclencheur du sélecteur de langue.
Parcours journalisé sur 25 pressions, identique en clair et en sombre :

```
INPUT:text > INPUT:password > BODY > INPUT:text > INPUT:password > BODY > …
```

Seuls les contrôles de **formulaire** reçoivent un arrêt ; boutons et liens sont
sautés. C'est le comportement d'usine de WebKit/Safari quand « Full Keyboard Access »
est désactivé — un réglage d'agent utilisateur, **pas un défaut de l'application**, et
non corrigeable depuis la feuille de style. Chromium et Firefox atteignent le
déclencheur dès la 1re pression.

Conséquence assumée : les 2 lignes WebKit du **déclencheur** sont mesurées sous focus
programmatique. Les lignes d'**item**, elles, restent clavier (l'ouverture se fait par
`Enter`, et Radix déplace ensuite le focus lui-même).

Ceci recoupe et précise le point 4 de `issue-383-done.md` (« Tab ne s'arrête que sur
les contrôles de formulaire »), que #383 avait observé sans l'attribuer.

## Safari natif — NON TESTÉ

Playwright pilote **WebKit**, qui n'est pas Safari : moteur commun, mais chrome du
navigateur, réglages système et pile de rendu distincts. Cet environnement n'offre
aucun pilotage de Safari réel. Le critère d'acceptation « contour mesuré sur
WebKit/**Safari** » est donc **partiellement tenu** : WebKit oui, Safari non. Je le
dis plutôt que de cocher la case — c'est précisément le travers qui a rendu #375
nécessaire.

## Non vérifié — à ne pas croire couvert

- **Safari natif** (ci-dessus). Idem Safari iOS.
- **`Select` en thème sombre** et **`Select` dans ses montages réels** (`Dialog` /
  `Drawer` authentifiés) — le défaut #383 reste ouvert pour ces contextes.
- **Un seul site de montage** : `/fr/login`. Les 8 autres (`register`,
  `forgot-password`, `reset-password`, landing `HeaderSection`, `LandingMobileMenu`,
  `AppShell`, `MobileDrawer`, `settings`, `dashboard`) n'ont pas été mesurés. La règle
  étant globale (`@layer base`) et le popover identique, je m'attends à l'identique —
  **c'est une prédiction, pas une mesure**.
- **Un seul palier de largeur** (1280 px). Sous 1024 px c'est `LandingMobileMenu` qui
  porte le sélecteur (`hidden lg:flex` dans `HeaderSection`, mesuré par #353) : non
  exercé.
- **Les 3 autres locales** (`en`, `es`, `de`) : l'item actif y est un autre item de la
  liste. Géométrie et tokens identiques, mais non mesuré.
- **`forced-colors: active`** — toujours pas rendu dans ce mode (déjà signalé par
  #383 et #352).
- **Bord gauche / haut / bas du contour** : la mesure porte sur le **côté droit**
  (segment droit, sans arc, pour éviter la dilution par antialiasing). Le rognage par
  `overflow:hidden` signalé par #383 sur `.mt-zoom` n'est pas re-testé ici — hors
  périmètre, le sélecteur de langue n'est pas concerné.

## Modification de code

**Aucune.** Le seul fichier touché est de la documentation :

- `frontend/src/styles/ds/a11y-audit.md` — nouvelle **§8** consignant les valeurs
  multi-moteurs, la méthode, et les deux limites (Safari natif, `Tab` sous WebKit).

`frontend/src/components/ui/language-selector.tsx` : **non modifié**. Le commentaire
l. 53-60 était autorisé à la correction *si la conformité tombait* ; elle ne tombe
pas, et ses chiffres sont confirmés. Le seul reproche qu'on pourrait lui faire est de
citer « Chromium et Firefox » là où on peut désormais écrire « et WebKit » — une
addition, pas une correction, hors du mandat.

## Tests

- `./scripts/test-quiet.sh frontend` : **885/885** (94 fichiers), 0 échec.
- `npx tsc --noEmit` : 0 erreur dans les sources (2 erreurs résiduelles dans
  `.next/types/app/[locale]/settings/page.ts`, artefacts du serveur de dev Turbopack,
  **pré-existantes** — déjà relevées par #352 et #383).
- Instruments de mesure (`measure*.js`, `select-check.js`) écrits dans le
  **scratchpad hors dépôt**, jamais dans `frontend/e2e/`. Rien à supprimer du dépôt.

## Recommandations suite

**RECOMMAND_FOLLOWUP :**
1. Rejouer la sonde `Select` sous **Firefox** dans ses montages **réels** (ProductDrawer,
   EventEditForm, PreferencesSection — backend requis) pour clore le défaut ouvert par #383.
   Non reproduit ici sur le composant isolé en Storybook, ce qui **n'infirme pas** l'observation
   de #383 en contexte. [triage S]
2. Étendre la mesure de contour aux **8 autres sites de montage** du sélecteur de langue et au
   palier < 1024 px (`LandingMobileMenu`) : aujourd'hui une prédiction, pas une mesure. [triage XS]

**Limite du mandat, redite ici :** Safari **natif** n'est pas testé — Playwright pilote WebKit.
Le critère d'acceptation « mesuré sur Safari » est **partiellement tenu**, et doit être présenté
comme tel plutôt que coché.

**Autres signaux :** `RECOMMAND_TEST_RUNNER` : non (suite frontend lancée ici, verte).
`RECOMMAND_SECURITY` : non. `RECOMMAND_DB_EXPERT` : non.

STATUS: COMPLETED
