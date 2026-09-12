# Arbitrage design — Sprint 58 (#383 et #352)

> Rendu par `ui-design`, lecture seule, sur `claude/sprint-58-start-26b185` @ `f13c4fa`.
> Toute décision ci-dessous se justifie par `frontend/src/styles/ds/readme.md`,
> `ds/tokens/*`, `ds/a11y-audit.md` ou une MESURE navigateur faite ici. Les valeurs
> calculées sur le papier sont marquées `[papier]`, les mesures navigateur `[mesuré]`.

## Comptages revérifiés

| Source | Annoncé | Constaté |
|---|--:|--:|
| `outline-none` / `outline-hidden` (occurrences) | ~14 (#383) / 37 (lead) | **37** |
| dont commentaires (`base.css` ×3, `language-selector.tsx` ×1) + test (`HeaderSection.test.tsx` ×1) | — | **5** |
| **sites de code réels** | ~35 | **32, dans 24 fichiers** |
| `rule-strong` dans `timeline.css` | 16 | **16** (6, 43, 58, 63, 71, 100, 204, 212, 241, 292, 329, 333, 342, 346, 348, 378) |
| `rule-strong` dans `landing.css` | 3 | **3**, dont **1 en commentaire** (l. 46) → **2 déclarations** (57, 113) |

Le lead comptait 25 fichiers de composants ; il y en a **24** (`language-selector.tsx`
n'a l'occurrence qu'en commentaire, il ne pose aucun `outline-*`).

---

## Décision 1 — `:focus-visible` (#383)

### Verdict border-radius

**SUPPRIMÉE.** `border-radius: var(--radius-xs)` sort de `base.css:131`.

Motifs, dans l'ordre :

1. **La charte ne la demande pas.** `readme.md` § *Hover / press / focus* écrit
   exactement : « focus is strong and marked — `2px` accent outline at `2px` offset
   (never the browser ring) ». Trois propriétés, pas quatre. Le rayon n'est pas un
   attribut du focus : `readme.md` § *Borders & cards* range `--radius-*` (3/5/7/10/14
   + pill) du côté de la **silhouette du composant**. Un reset de focus qui impose un
   rayon écrit dans le composant une propriété qui appartient au composant.
2. **Elle n'a aucune utilité technique.** Elle n'existait que pour arrondir un
   `outline` supposé rectangulaire. Ce n'est plus vrai : **`outline` suit le
   `border-radius` de l'élément sur les trois moteurs** — `[mesuré]` par lecture de
   pixels sur capture (élément 100×100 blanc, `outline:2px solid #f00`,
   `outline-offset:2px`, sonde au coin du rectangle englobant) :

   | Moteur | `radius:0` — coin (47,47) | `radius:10px` | `radius:50%` |
   |---|---|---|---|
   | Chromium 149.0.7827.55 | `rgb(255,0,0)` (rouge) | blanc | blanc |
   | Firefox 151.0 | rouge | blanc | blanc |
   | WebKit 26.5 | rouge | blanc | blanc |

   Le contour est bien **peint courbe** quand l'élément l'est, et rectangulaire quand
   il ne l'est pas. Aucune compensation n'est requise, y compris sur les
   `rounded-full` (déclencheur `h-9 w-9 rounded-full` de `language-selector.tsx:83`).
3. **Elle casse aujourd'hui la silhouette de tout élément focalisé.** `[mesuré]`,
   cascade reproduite à l'identique (`@layer theme, base, components, utilities` ;
   règle hors layer ; `.rounded-full` et `.outline-none` dans `@layer utilities`) :

   | Variante | `borderRadius` au focus | `outlineStyle` |
   |---|---|---|
   | **actuel** (hors layer, avec `border-radius`) | **`3px`** ← `rounded-full` écrasé | `solid` |
   | hors layer, **sans** `border-radius` | `3.35544e+07px` (= `rounded-full` respecté) | `solid` |
   | `@layer base`, sans `border-radius` | `3.35544e+07px` | **`none`** ← `outline-none` gagne |

### Conséquence de séquencement — la ligne 2 du tableau ci-dessus débloque le sprint

Supprimer `border-radius` **sans** layeriser corrige le défaut de rayon **et ne touche
à aucun des 32 sites** : le contour reste gagnant partout, donc **aucun indicateur de
focus ne disparaît**, donc **zéro risque WCAG 1.4.11**. La régression que redoutait le
S53 est intégralement portée par la *layerisation*, pas par le rayon. Les deux moitiés
de #383 sont donc **séparables**, et l'ordre imposé plus bas en découle.

### Indicateur de focus canonique après layerisation

**Une seule réponse : le contour du DS, porté par la règle de base, et RIEN au niveau
du site.**

```css
/* ds/tokens/base.css, dans @layer base */
:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }
```

Côté composant : **aucune utilitaire de focus**. Ni `outline-none`/`outline-hidden`,
ni `ring-*`. Le composant hérite l'indicateur. Une seule exception documentée
(`popover.tsx`, cf. tableau de tri).

Pourquoi celui-là et pas `--shadow-focus` :

- `--shadow-focus` vaut `0 0 0 3px var(--color-accent-soft)` (`tokens/spacing.css:36`).
  `accent-soft` contre la surface qui le porte : **1,23:1 en clair** (`#DBE9FC` sur
  `#FFFFFF`) et **1,19:1 en sombre** (`#16263A` sur `#131519`) `[papier]`. Sous les
  3:1 de WCAG 1.4.11 **d'un facteur 2,5**. Ce n'est pas un indicateur, c'est un halo :
  dans `core.css` il n'apparaît jamais seul, il accompagne un changement de
  `border-color` vers `--color-accent` (`.mt-input:focus`, `.mt-select__trigger`).
  Le seul endroit où il est seul — `.mt-check input:focus-visible + .mt-check__box`
  (`core.css:123`) — est justement un défaut : l'`<input>` réel y est
  `opacity:0; width:0; height:0`, donc le contour global s'y peint sur 0×0 pixel et
  ne compense rien. (Vaut aussi pour `.mt-radio__dot` et `.mt-switch__track`, eux
  **vivants** — hors périmètre des deux issues, à ouvrir en suivi.)
- `ring-*` de Tailwind est un `box-shadow`. Son `ring-offset-*` peint une **bande
  opaque** de `--tw-ring-offset-color`, dont la valeur initiale compilée est **`#fff`**
  (`[mesuré]` à la compilation : `@property --tw-ring-offset-color { … initial-value:
  #fff; }`). Deux sites du dépôt posent `ring-offset-2` sans couleur → bande blanche
  de 2px en mode sombre. `outline-offset`, lui, est **transparent** : il laisse voir le
  fond réel, quel qu'il soit. C'est un piège en moins sur 32 sites.
- `--color-focus` = `--color-accent` dans les deux modes (`colors.css:113` / `:160`).
  Le contour mesure donc **6,08:1 en clair et 6,48:1 en sombre sur `surface`**
  (`a11y-audit.md` §7, ligne « accent / surface », mesuré au FU1 du S57), **5,93 /
  6,94:1 sur `bg`**. Très au-dessus des 3:1.

### Règle de tri des 32 `outline-none` / `outline-hidden`

**Règle opérationnelle, applicable mécaniquement :**

> Un `outline-none` / `outline-hidden` n'est légitime que sur un élément **qui n'est
> pas un contrôle** (panneau, conteneur focalisé par la bibliothèque pour piéger le
> clavier). Partout ailleurs : **supprimer l'utilitaire, et supprimer aussi l'anneau
> `ring-*` de focus qui l'accompagne** — le contour du DS le remplace. Un anneau
> `ring-*` conservé À CÔTÉ du contour ferait deux indicateurs concentriques, motif
> absent du DS (déjà écrit dans `language-selector.tsx:59-60`).

| Cat. | Contenu | Ce que le dev fait | Fichiers (`:ligne`) | Nb |
|---|---|---|---|--:|
| **A** | `focus-visible:outline-none` + `ring-2 ring-ring` \| `ring-focus` (anneau accent conforme) | Supprimer `outline-none` **et** les `ring-*`/`ring-offset-*` de focus. Rendu inchangé pour le contour (il gagne déjà), l'anneau redondant disparaît. | `dashboard/page.tsx:153`, `CompactRail.tsx:58`, `MobileDrawer.tsx:73`, `AppShell.tsx:178,201,214,238`, `AvatarUpload.tsx:183`, `SettingsShell.tsx:90`, `mobile/BottomSheet.tsx:132`, `mobile/MobileSettings.tsx:52`, `mobile/SettingsIndex.tsx:43`, `StateScreen.tsx:44,50` | 14 |
| **B** | idem A, mais déclenché par `focus:` et non `focus-visible:` (anneau visible aussi à la souris) | Idem A. Le passage à `focus-visible` est offert par la règle du DS — c'est un gain, pas un travail en plus. | `EventEditForm.tsx:505` (garder `focus:border-transparent`), `ui/dialog.tsx:47`, `CategoriesView.tsx:124`, `ProductsListView.tsx:258` | 4 |
| **C** | `outline-hidden` + `ring-1` (shadcn) | Idem A. ⚠ **Sans ce passage, la layerisation ferait chuter ces 4 contrôles de 2px à 1px** — sous la charte (« 2px at 2px offset »). Aujourd'hui l'utilisateur voit 2px parce que le contour global gagne. | `ui/button.tsx:37`, `ui/checkbox.tsx:16`, `ui/input.tsx:11`, `ui/select.tsx:36` | 4 |
| **D** | `outline-hidden` **nu** sur item de menu ; focus signalé par un **fond** | Supprimer `outline-hidden`. Garder `focus:bg-accent-soft` comme signal **secondaire**. ⚠ Le fond seul mesure **1,23:1 clair / 1,19:1 sombre** `[papier]` : c'est **la** régression que la layerisation aurait provoquée, et elle porte sur **5 sites**, pas sur le seul sélecteur de langue. | `ui/dropdown-menu.tsx:135,153,189,272`, `ui/select.tsx:135` | 5 |
| **E** | `outline-hidden` nu sur un **panneau** (pas un contrôle) | **GARDER.** L'utilitaire est un no-op aujourd'hui ; après layerisation il retrouve enfin l'effet voulu (pas de contour autour du panneau entier quand Radix y porte le focus à l'ouverture). Seule exception du dépôt. | `ui/popover.tsx:24` | 1 |
| **HC** | hors catégorie — cf. section suivante | — | 4 sites | 4 |
| | | | **Total** | **32** |

Note d'écriture : là où un `outline-hidden` doit être **conservé** (cat. E) ou
**réintroduit**, écrire `outline-hidden` et **jamais** `outline-none`. `[mesuré]` à la
compilation : `outline-hidden` émet en plus
`@media (forced-colors: active){ outline:2px solid transparent; outline-offset:2px; }`,
`outline-none` n'émet rien. En mode contraste forcé (Windows), `outline-none` supprime
donc l'indicateur pour de bon.

### Sites hors catégorie (à traiter à la main)

1. **`categories/CategoryDrawer.tsx:321` — pastille de couleur.** Deux défauts
   cumulés, aucun couvert par la règle de tri :
   - `focus:ring-2 focus:ring-offset-1` **sans couleur d'anneau** → Tailwind v4 retombe
     sur `currentColor` (`[mesuré]` à la compilation :
     `--tw-ring-shadow: … var(--tw-ring-color, currentColor)`), et l'élément est un
     `<button>` sans `text-*`, sur `background-color: {hex}` arbitraire.
   - **l'état `selected` pose LE MÊME `ring-2 ring-offset-1`** : focus et sélection
     sont visuellement identiques ; une pastille sélectionnée **et** focalisée
     n'affiche aucun changement.
   - `ring-offset-1` sans `ring-offset-color` → liseré blanc en sombre.

   **Décision :** supprimer `focus:ring-2 focus:ring-offset-1 focus:outline-none`
   **et** le `ring-2 ring-offset-1` de la branche `selected`. La sélection reste
   portée par le `border-foreground` / `border-rule` **déjà présent** (encre vs filet
   décoratif : contraste franc, aucune classe nouvelle). Le focus revient au DS ; la
   pastille est `rounded-full`, le contour la suivra (`[mesuré]`, cf. tableau des
   moteurs).

2. **`landing/HeaderSection.tsx:190`** et 3. **`landing/LandingMobileMenu.tsx:65`** —
   `ring-offset-2` **sans** `ring-offset-color` → bande **blanche** de 2px en mode
   sombre (`initial-value: #fff`, `[mesuré]`). Ils appartiennent structurellement à la
   catégorie A, mais leur suppression **corrige un défaut sombre existant** au lieu
   d'être neutre : à isoler dans le message de commit. **Décision :** même traitement
   que A (tout supprimer), pas de `ring-offset-bg` de rattrapage — le contour du DS
   n'a pas besoin de couleur d'offset.

4. **`settings/ExportDataFlow.tsx:85`** — `<h3 tabIndex={-1} class="outline-none">`,
   cible de focus programmatique (`headingRef.current?.focus()` à chaque changement
   d'étape, l. 58-60). `[mesuré]` sur les 3 moteurs, `.focus()` sur un `tabindex="-1"` :

   | Moteur | après un CLIC souris | après ENTRÉE clavier |
   |---|---|---|
   | Chromium 149 | `:focus-visible` = **false** | **true** |
   | Firefox 151 | **false** | **true** |
   | WebKit 26.5 | **false** | focus **non retenu** (`activeElement` vide) — *à revérifier sur Safari réel, artefact headless possible* |

   Le `outline-none` est donc **inerte au parcours souris** et **battu au parcours
   clavier**. **Décision : le supprimer** comme les autres. Le contour n'apparaîtra
   qu'au parcours clavier — où il est utile : il montre où le focus a atterri après
   l'action. Aucune exception à créer.

### `language-selector.tsx` et `ExportDataFlow.tsx` — indicateur de remplacement

**Il n'y en a pas, et c'est le point de l'arbitrage.** Ces deux fichiers ne perdent
rien parce que **le contour n'est jamais retiré** : la règle du DS reste la source de
l'indicateur, elle change seulement de layer.

- **`language-selector.tsx` : aucune modification.** Le fichier ne pose aucun
  `outline-*` (son unique occurrence est le commentaire l. 55). Ce qui doit changer
  est en amont, dans **`ui/dropdown-menu.tsx` (cat. D)** : c'est de là que vient le
  `outline-hidden` qui le menaçait. Une fois cet `outline-hidden` retiré, le
  sélecteur de langue est protégé **par construction**, avant même la layerisation, et
  son pavé de commentaire l. 53-60 redevient exact. Il reste **une correction de
  chiffre à porter** dans ce commentaire : les « 4,71:1 en clair » et le
  « rgb(17,112,228) » datent d'**avant le FU1 du S57** (`--color-focus` : `blue-500`
  → `blue-600 #0E5FC4`). Valeurs à jour : **6,08:1 en clair**, 6,48:1 en sombre
  (`a11y-audit.md` §7, ligne « accent / surface »). Le contour est donc *meilleur*
  qu'annoncé.
- **`ExportDataFlow.tsx:85` :** suppression du `outline-none`, cf. hors-catégorie n°4.

Comment le dev vérifie que le remplaçant tient les 3:1 : il n'a **pas** à le
recalculer — le couple `--color-focus` / surface est déjà mesuré et versionné dans
`a11y-audit.md` §7. Ce qu'il doit vérifier, c'est que le contour **est peint** et
**sur quel fond** il tombe (`outline-offset:2px` le pose sur le parent, pas sur
l'élément) : protocole ci-dessous.

### Ordre d'écriture imposé

Cet ordre garantit qu'**à aucune étape** un indicateur n'est supprimé. Chaque étape
est vérifiable seule.

1. **Retirer `border-radius` de `base.css:131`** — la règle **reste hors layer**.
   Corrige le rayon partout. Rien d'autre ne bouge. `[mesuré]` ci-dessus.
2. **Retirer les utilitaires de focus des 27 sites A+B+C+D** et les 4 sites HC.
   Le contour global les battait déjà : le contour rendu est **identique** avant/après.
   Seuls les `ring-*` redondants disparaissent (changement de pixels attendu et voulu).
3. **Puis seulement, layeriser** `:focus-visible` dans `@layer base` (l. 127-132).
   Plus aucun `outline-*` applicatif ne subsiste pour la battre, sauf
   `ui/popover.tsx:24` — qui doit maintenant gagner. Rendu attendu : inchangé partout
   sauf le panneau de popover, qui perd son contour (effet voulu, jamais obtenu
   jusqu'ici).
4. Mettre à jour le pavé de commentaire `base.css:97-119` : `:focus-visible` sort de
   l'inventaire « reste hors layer », les chiffres du sélecteur de langue sont
   rafraîchis, le motif est écrit in-situ (méthode S53).

### Comment le développeur vérifiera (protocole navigateur, clair + sombre)

Aucun test unitaire ne peut valider ceci : `jsdom` ne résout ni `@layer` ni la
peinture. `base-layer.test.ts` et `control-border-tier.test.ts` **ne prouvent rien
ici** et ne doivent pas être invoqués comme preuve.

1. `npm run dev`. Ouvrir **Chrome, Firefox et Safari** (les 3 moteurs — la mesure
   ci-dessus a été faite sur Chromium 149 / Firefox 151 / WebKit 26.5 headless, pas
   sur Safari natif).
2. Sur chaque écran couvrant les catégories (dashboard, réglages, landing + burger,
   liste produits, catégories, drawer de catégorie, formulaire d'événement, tout menu
   déroulant, sélecteur de langue), **naviguer au clavier** et à chaque arrêt :
   ```js
   (() => { const e = document.activeElement, s = getComputedStyle(e); return {
     tag: e.tagName, cls: e.className, fv: e.matches(':focus-visible'),
     outline: [s.outlineStyle, s.outlineWidth, s.outlineColor, s.outlineOffset].join(' '),
     radius: s.borderRadius, boxShadow: s.boxShadow }; })()
   ```
   Attendu : `outline` = `solid 2px rgb(14,95,196) 2px` en clair,
   `solid 2px rgb(77,155,255) 2px` en sombre ; `radius` = **le rayon propre de
   l'élément** (jamais `3px` par défaut) ; `boxShadow` sans anneau de focus résiduel.
3. **Modalité pointeur** : cliquer à la souris sur les mêmes éléments → `fv` doit
   valoir `false` et `outlineStyle` `none`. C'est le contrôle anti-régression de
   l'étape 2 (un `focus:` mal converti se voit ici).
4. **Fond réel du contour** : `outline-offset:2px` pose le trait sur le **parent**.
   Relever ce parent (`getComputedStyle(e.parentElement).backgroundColor`) et le
   confronter à `a11y-audit.md` §7 : `surface` → 6,08 / 6,48:1 ; `bg` → 5,93 / 6,94:1.
   Si le parent est `surface-2` ou un aplat d'événement, **mesurer** (capture +
   lecture de pixel) au lieu de supposer.
5. **Sombre** : basculer `.dark` sur `<html>` et refaire 2→4 intégralement. Le défaut
   `ring-offset` blanc des sites HC 2/3 n'existe QUE là.
6. **Rognage** : vérifier que le contour n'est pas coupé dans les conteneurs
   `overflow:hidden` (`.mt-tlv`, `.mt-zoom`, `.mt-tlm`, feuilles). Si c'est le cas,
   la réponse du DS est un **`outline-offset` négatif** (motif déjà employé :
   `timeline.css:115` et `:131`, `outline-offset:-2px`) — **pas** un retour au `ring`,
   qui est un `box-shadow` et se fait rogner exactement pareil.
7. **E2E** : `e2e/landing-mobile-menu.spec.ts` (« sélecteur de langue ») mesure déjà
   les trois états dans les deux thèmes ; y ajouter une assertion
   `outlineStyle !== 'none'` sur l'item de menu focalisé au clavier. C'est une
   assertion **navigateur**, pas jsdom — elle est recevable.

---

## Décision 2 — bordures (#352)

### Critère de tri retenu (1 phrase)

Reprise littérale de `readme.md` § *Border tiers* et de l'en-tête de `core.css:5-13` —
**aucune nomenclature nouvelle** :

> Un filet est **FONCTIONNEL** (`--color-rule-emphasis`, ≥3:1) si son retrait
> empêcherait l'utilisateur de voir qu'un **contrôle** existe ou où il commence ; il
> est **DÉCORATIF** (`--color-rule` / `--color-rule-strong`) si son retrait ne coûte
> **aucune information** — séparateur, cadre de panneau flottant, cadre de carte,
> ligne de tableau, marque statique non focusable.

Test d'application, tiré des cas déjà arbitrés : *l'élément a-t-il un remplissage qui
le distingue de son fond ?* Si oui (`.mt-btn--primary`, `.mt-card`), le filet est
décoratif. Si non (`.mt-iconbtn`, `.mt-input`, `.mt-switch__track` — dont `core.css:141`
note que « le `surface-2` est ~1,03:1 contre la page »), le filet est fonctionnel.

### `timeline.css` — classement des 16 occurrences

**7 fonctionnelles / 9 décoratives.** Les 7 sont, sans exception, des **boutons à icône
seule ou un groupe de contrôles sans remplissage distinctif** — c'est-à-dire les cas
que `core.css:45` (`.mt-iconbtn`) a déjà tranchés au S49. Aucun filet de la frise
elle-même (graduations, séparateurs de lane, règles) n'est migré : les migrer
alourdirait le rendu sans gain d'information, ce que l'issue demande explicitement
d'éviter.

| L. | Sélecteur | Ce qu'elle délimite | Verdict | Action |
|--:|---|---|---|---|
| 6 | `.mt-tl-ruler__maj` | Séparateur de graduation majeure **dans** la règle temporelle | Décorative | Garder + commentaire in-situ |
| 43 | `.mt-evt--draft` | **Fallback** du contour pointillé d'une occurrence fantôme, quand `--mt-evt` n'est pas fourni (`EventPreviewTimeline.tsx:77` ne le pose que `if (color)`). Le fond est un `color-mix` à 8% ≈ invisible : le pointillé porte seul l'objet graphique | **Fonctionnelle** | `var(--mt-evt, var(--color-rule-emphasis))`. **Aucun impact visuel dans le cas nominal** (couleur fournie) |
| 58 | `.mt-minimap__bar` | **Remplissage** (pas un filet) de la barre de densité **vide** — `Minimap.tsx:115` : `h > 0 ? --filled : bar`, donc `rule-strong` = seau à **zéro** événement, ligne de base | Décorative | Garder. L'information est portée par `--filled` (`accent`) |
| 63 | `.mt-zoom` | Cadre du **groupe de zoom**. Ses boutons ont `border:0` et `background:surface` sur une toolbar `surface-2` (delta ~1,05:1) : le cadre est la seule limite du contrôle | **Fonctionnelle** | → `rule-emphasis` |
| 71 | `.mt-stamp` | Cadre du `DateStamp` — bloc d'affichage, sans rôle ni focus | Décorative | Garder (même appel que `.mt-badge`, `core.css:155`) |
| 100 | `.mt-tlv__ruler` | Filet règle / lanes (desktop) | Décorative | Garder |
| 204 | `.mt-drawer` | Cadre de panneau flottant + `shadow-lg` | Décorative | Garder (même appel que `.mt-dialog`, `core.css:254`) |
| 212 | `.mt-drawer__close` | **Bouton fermer à icône seule**, `background:none` | **Fonctionnelle** | → `rule-emphasis` |
| 241 | `.mt-tlv__help-btn` | **Bouton d'aide `?`** 26px, `background:surface` sur toolbar `surface-2` | **Fonctionnelle** | → `rule-emphasis` |
| 292 | `.mt-tlm__ruler` | Miroir mobile de la l. 100 | Décorative | Garder |
| 329 | `.mt-sheet` | Cadre de bottom sheet + `shadow-lg` | Décorative | Garder |
| 333 | `.mt-sheet__grabber` | Poignée d'une zone **réellement** draggable (`.mt-sheet__grabber-zone`, `touch-action:none; cursor:grab`, branchée dans `TimelineBottomSheet.tsx:120`) : seul signal visuel de ce contrôle | **Fonctionnelle** | → `rule-emphasis` |
| 342 | `.mt-sheet__close` | **Bouton fermer 44×44 à icône seule**, `background:none` | **Fonctionnelle** | → `rule-emphasis` |
| 346 | `.mt-actionsheet` | Cadre d'action sheet + `shadow-lg` | Décorative | Garder |
| 348 | `.mt-actionsheet__grabber` | Marque ornementale : `TimelineActionSheet.tsx:89` est un `<span aria-hidden>` **sans zone de drag** — rien n'est draggable ici | Décorative | Garder + commentaire disant **pourquoi** il diverge de la l. 333 |
| 378 | `.mt-tlm__minimap-toggle` | **Bascule 44×44 à icône seule** (`aria-pressed`), `background:surface` sur toolbar `surface-2` | **Fonctionnelle** | → `rule-emphasis` |

Ratios du tier cible, déjà versionnés (`a11y-audit.md` §6, mesurés au #293) :
`rule-emphasis` = **3,97:1 vs `bg` · 4,07:1 vs `surface`** en clair, **4,81 / 4,49:1**
en sombre. ⚠ Ces quatre fonds sont ceux du DS. Les 7 migrations tombent toutes sur
`surface` ou `surface-2` / `transparent` au-dessus de `surface-2` : à **confirmer au
rendu** pour les l. 63, 241 et 378, qui vivent sur une toolbar `surface-2` — un fond
qui n'est pas dans les quatre mesurés.

Méthode d'écriture : **un commentaire in-situ par occurrence**, comme au S49
(`core.css:28`, `:45`, `:61`, `:98`, `:141`, `:203`, `:254`, `:263`), avec le même
vocabulaire (« → fonctionnelle » / « → décoratif »). L'arbitrage écrit vaut autant que
la migration : les 9 décoratives **doivent** recevoir leur commentaire, sinon un
prochain audit les re-signalera.

### `landing.css` — classement des 3 occurrences

**0 fonctionnelle / 2 décoratives — et l'arbitrage est DÉJÀ écrit et déjà correct.**

| L. | Sélecteur | Ce qu'elle délimite | Verdict | Action |
|--:|---|---|---|---|
| 46 | — (commentaire) | Porte déjà l'arbitrage : « Bordure DÉCORATIVE (cadre de carte…) · Ce n'est PAS `rule-emphasis` : la bordure n'est ici l'affordance d'aucun contrôle », avec renvoi au tableau des tiers du readme | n/a | **Rien** |
| 57 | `.feature-card:hover` | Cadre de carte, montée d'un cran au survol. `FeaturesSection.tsx:41` : `<Card>` **sans** `onClick`, `role` ni `tabIndex` | Décorative | **Rien** |
| 113 | `.testimonial-card:hover` | Idem. `TestimonialCard.tsx:42` : `<Card>` non interactive. Commentaire l. 104 déjà présent (« même tier de bordure décorative que `.feature-card` ») | Décorative | **Rien** |

Ce lot est **déjà conforme** — il a été traité par #335, avec la méthode du S49, avant
l'ouverture de #352. Le verdict rejoint celui de `.mt-card--hover` (`core.css:203`) :
« a clickable card is identified by its content and cursor, not by its outline ».
**Le développeur ne touche pas à `landing.css`.** À signaler tel quel dans #352 pour
que le périmètre annoncé ne fasse pas croire à du travail non fait.

### Checkbox — option retenue et sort de `control-border-tier.test.ts`

**Option (a).** `ui/checkbox.tsx:16` passe de `border-primary` à `border-rule-emphasis`.
`.mt-check__box` **est conservée**.

Ce que le test vérifie **réellement** (lu, l. 39-79) : il parcourt l'AST PostCSS de
**`core.css` seul** et assertit que 7 sélecteurs `.mt-*` déclarent leur bordure sur
`--color-rule-emphasis` et jamais sur `rule-strong` / `rule`. Il **ne calcule aucun
ratio**, il **ne lit aucun `.tsx`**, et son en-tête le dit lui-même (« CE QUE CE TEST
NE PROUVE PAS »). C'est un garde-fou **anti-régression de token**, pas une preuve
d'accessibilité.

Pourquoi (a) et pas (b) :

1. **(b) supprimerait le garde-fou au lieu de le déplacer.** Retirer `.mt-check__box`
   de `FUNCTIONAL_CONTROL_SELECTORS` ne laisse **rien** couvrir la checkbox de
   l'application : le test ne lit que du CSS, et la bordure de `ui/checkbox.tsx` est
   une utilitaire Tailwind dans du TSX. Le troisième cas du test (`--color-input`) ne
   la couvre pas non plus — `checkbox.tsx` n'utilise pas `border-input`. (b) échange
   donc une règle **morte mais gardée** contre un contrôle **vivant et non gardé**.
2. **La famille `.mt-check` / `.mt-radio` / `.mt-switch` n'est pas morte.**
   `.mt-radio__dot` est consommée par `ui/radio.tsx:17` et `.mt-switch__track` par
   `ui/switch.tsx:17`. Supprimer la seule moitié « checkbox » désymétriserait un bloc
   de 3 contrôles jumeaux dont 2 sont en production — un coût de cohérence supérieur à
   celui qu'on prétend éliminer.
3. **`ui/checkbox.tsx` est de toute façon ouvert au Sprint 58** (catégorie C de la
   Décision 1). Le passage de tier est **un mot dans le même `className`**, dans le
   même commit. Coût marginal nul, et les deux décisions restent cohérentes sur ce
   fichier : `className` final = `… rounded-xs border border-rule-emphasis shadow-sm
   disabled:… data-[state=checked]:bg-primary …`, **sans** `focus-visible:outline-hidden`
   ni `focus-visible:ring-1`.

Contrôle de non-régression du contraste : `border-primary` = `--gray-900 #16181D`
(17,32:1, mesuré par le lead) → `rule-emphasis` = `--gray-450 #7A7E87`, **4,07:1 sur
`surface` en clair, 4,49:1 en sombre** (`a11y-audit.md` §6). Baisse assumée : elle
**reste au-dessus des 3:1**, elle est **prescrite par le readme** pour ce cas précis,
et elle rétablit la hiérarchie « bordure plus discrète que le texte » que
`border-primary` (encre pure) violait. L'état coché n'est pas concerné : il est peint
`data-[state=checked]:bg-primary`, aplat plein.

**Sort du test : aucune modification de code.** Il reste vert (il ne lit que
`core.css`, inchangé sur ce point). Deux écritures à faire, en revanche :

- dans `core.css:115-116`, remplacer le commentaire actuel par la **vérité d'usage** :
  `.mt-check__box` est le **spécimen DS** du contrôle (parité avec `.mt-radio__dot` et
  `.mt-switch__track`, tous deux en production) ; la checkbox de l'application est
  `ui/checkbox.tsx`, alignée sur le même tier ;
- dans `control-border-tier.test.ts`, **commentaire uniquement** (l. 35-38) : préciser
  que `.mt-check__box` garde le tier du **spécimen DS**, et que le contrôle applicatif
  correspondant est `ui/checkbox.tsx` sur `border-rule-emphasis`.

Garde-fou optionnel, à la main du lead : une assertion textuelle sur le `className` de
`ui/checkbox.tsx` (même famille que le S49 : lecture de fichier, pas de rendu). Elle
gardera le **nom du token**, elle ne prouvera **aucun ratio ni aucune cascade**.

---

## Ce que je n'ai PAS vérifié

- **Safari natif.** Les trois mesures multi-moteurs viennent de Playwright headless
  (Chromium 149.0.7827.55, Firefox 151.0, WebKit 26.5). WebKit ≠ Safari : le résultat
  anormal du tableau `ExportDataFlow` (focus programmatique non retenu, `activeElement`
  vide) **n'est pas confirmé** et peut être un artefact headless.
- **Aucun ratio mesuré au rendu par mes soins.** Les valeurs `accent`/`surface`
  (6,08 / 6,48:1), `accent`/`bg` (5,93 / 6,94:1) et `rule-emphasis` (3,97 / 4,07 /
  4,81 / 4,49:1) sont **reprises** de `a11y-audit.md` §6-7, où elles sont datées et
  mesurées. Les valeurs `accent-soft` sur `surface` (**1,23:1** clair / **1,19:1**
  sombre) et donc celles de `--shadow-focus` sont **calculées par moi sur le papier**
  à partir des hex de `colors.css` — non mesurées au rendu.
- **Le fond réel de chacun des 32 sites.** Le contour est posé à 2px d'offset, donc
  sur le **parent**. Je n'ai pas inventorié ces parents : les sites de `AppShell`,
  `CompactRail` et des toolbars vivent probablement sur `surface-2`, un fond qui ne
  figure dans **aucun** des quatre couples mesurés du DS. C'est l'angle mort principal
  de la Décision 1.
- **Le rendu des 7 migrations de `timeline.css`.** Classées par lecture des sélecteurs
  et de leurs consommateurs TSX ; **aucune capture** n'a été faite. Les l. 63, 241 et
  378 tombent sur `surface-2`, hors des fonds mesurés.
- **Le rognage du contour** dans `.mt-tlv` / `.mt-tlm` / `.mt-zoom` (`overflow:hidden`)
  n'a pas été testé sur l'application réelle — d'où l'étape 6 du protocole.
- **`forced-colors: active`** (contraste forcé Windows) : je n'ai lu que le CSS émis,
  je n'ai rien rendu dans ce mode.
- **Les tests du dépôt n'ont pas été exécutés** (`control-border-tier.test.ts`,
  `base-layer.test.ts`, `HeaderSection.test.tsx`, e2e). Prédiction, non vérifiée :
  tous restent verts ; seul le commentaire de `HeaderSection.test.tsx:99` devient
  périmé (il cite `focus-visible:outline-hidden` du `Button`, supprimé en cat. C) —
  l'assertion elle-même porte sur `classList` et n'est pas affectée.
- **Défaut hors périmètre, non traité :** `.mt-radio input:focus-visible +
  .mt-radio__dot` et `.mt-switch input:focus-visible + .mt-switch__track`
  (`core.css:134`, `:149`) n'ont pour indicateur de focus qu'un `--shadow-focus` à
  **1,23:1 / 1,19:1** `[papier]`, l'`<input>` réel étant en `opacity:0; width:0;
  height:0` — le contour global n'y peint rien. `ui/radio.tsx` et `ui/switch.tsx` sont
  en production. À ouvrir en suivi, ce n'est ni #383 ni #352.
