# ADR-008 — Échelle `z` : un palier dédié aux overlays Radix portalisés, au-dessus des modales

- Statut : Accepté
- Date : 2026-08-31
- Contexte : Sprint 63, issue #446 (frontend — le popover du `Select` du drawer de création
  d'événement n'est pas peint). Fait suite au défaut découvert et **mesuré** par #414 (Sprint 62).

## Contexte

L'échelle `z` du design system (`frontend/src/styles/ds/tokens/spacing.css`) comptait six paliers :

| Token | Valeur | Porté par |
|---|---|---|
| `--z-sticky` | 10 | règles/en-têtes collants de la frise (`timeline.css`) |
| `--z-cursor` | 20 | curseur et ligne TODAY (`timeline.css`) |
| `--z-popover` | 50 | `.mt-select__menu`, `.mt-tooltip__bubble` (`core.css:97,286`), `.mt-tlv__help-pop` (`timeline.css:316`) |
| `--z-toast` | 60 | **aucun consommateur** (`react-hot-toast` pose son propre `z-index` en ligne) |
| `--z-modal` | 70 | `.mt-drawer` / `.mt-drawer__overlay` (271, 270), `.mt-sheet` (406), `.mt-actionsheet` (432), `.mt-dialog__overlay` (`core.css:293`) |
| `--z-netbanner` | 80 | `.mt-sysbanner--sticky` (`i18n.css:122`, #76) |

Les composants `shadcn/ui` portaient, eux, un `z-50` littéral (la valeur en dur du template
amont) : `ui/select.tsx`, `ui/popover.tsx`, `ui/dropdown-menu.tsx` (×2), et aussi
`ui/dialog.tsx`.

**Le défaut.** `NewEventDrawer` est monté EN LIGNE par `AppShell.tsx:259` — il n'est pas
portalisé. Son panneau porte `--z-modal` (70). Le `SelectContent` du sélecteur de produit est,
lui, portalisé dans `body` avec `z-50`. Une valeur `z` plus élevée l'emporte quel que soit
l'ordre du DOM : **le popover s'ouvrait derrière le panneau et n'était jamais peint**. Le
sélecteur était inutilisable, à la souris comme au clavier, en clair comme en sombre.

`.mt-sheet` (la variante mobile du MÊME composant, `NewEventDrawer.tsx:73,141`) porte le même
token : le défaut existait donc sur **deux chemins CSS distincts**, desktop et mobile.

**Ce que le DOM disait — et pourquoi il ne fallait pas l'écouter.** `document.elementsFromPoint()`
au centre de l'option la plaçait EN TÊTE de pile, sans un seul élément du drawer. Faux ami : une
couche Radix ouverte pose `body { pointer-events: none }`, ce qui retire tout le reste du
hit-testing. Hit-testing et peinture divergent (`PIT-S62-001`). Seule la lecture de pixel
(`frontend/e2e/support/pixel.ts`) a tranché : **100 % de panneau de drawer sur les 15 offsets**,
`#ffffff` en clair et `#131519` en sombre, unanimité 100 %.

**Pourquoi les cinq autres consommateurs de `ui/select` y échappaient.** `PreferencesSection`,
`ProductsListView` et `ExportDataFlow` ne sont dans aucune surface modale. `ProductDrawer` et
`DeleteConfirmDialog` reposent sur un `Dialog` Radix **portalisé** à `z-50`, soit le MÊME palier
que le Select : à `z` égal, c'est l'ordre du DOM qui départage, et le portail du Select est
ajouté plus tard dans `body`. Ils passaient **par chance, pas par invariant** — c'est exactement
ce point qui justifie de traiter le palier plutôt que le seul cas cassé.

## Décision

**Introduire un septième palier, `--z-popover-over-modal: 75`, et y placer les overlays Radix
portalisés dans `body`** : `ui/select.tsx`, `ui/popover.tsx`, `ui/dropdown-menu.tsx`
(`DropdownMenuContent` et `DropdownMenuSubContent`).

L'échelle exprime désormais **deux natures de popover**, et non une seule :

- `--z-popover` (50) — popovers rendus **dans le flux** de leur écran (`.mt-select__menu`,
  `.mt-tooltip__bubble`, `.mt-tlv__help-pop`). Ils appartiennent à un écran et **doivent** passer
  sous une modale. **Valeur inchangée, consommateurs inchangés.**
- `--z-popover-over-modal` (75) — overlays **portalisés dans `body`**. Ils n'ont pas d'écran
  d'appartenance : ils doivent se peindre au-dessus de la surface qui les a ouverts, y compris
  quand c'est un drawer, une sheet ou une modale.

L'intervalle `]70, 80[` est choisi pour préserver les deux bornes existantes :

- `> --z-modal` (70) → le popover surmonte drawers, sheets et modales ;
- `< --z-netbanner` (80) → la bannière réseau (#76) reste au-dessus de **tout**, popover ouvert
  compris. C'était l'objet explicite de son commentaire dans `i18n.css:120-121` ; l'ADR ne le
  défait pas.

Radix propage la valeur sans effort supplémentaire : `@radix-ui/react-popper` recopie le
`z-index` **calculé** du contenu sur son enveloppe `position: fixed`
(`node_modules/@radix-ui/react-popper/dist/index.mjs:134-148`). Le `z-index` n'a donc pas besoin
d'un `position` sur `PopoverContent`.

## Alternatives rejetées

1. **Remonter `--z-popover` de 50 à 75.**
   Rejeté : le token sert AUSSI trois popovers en flux (`core.css:97`, `core.css:286`,
   `timeline.css:316`) qui doivent rester sous les modales. Les remonter en bloc ferait passer un
   tooltip de frise par-dessus une modale ouverte — on aurait échangé un défaut contre un autre,
   moins visible.

2. **Portaliser `NewEventDrawer`.**
   Rejeté : cela change son contexte d'empilement et déplace le problème (focus-trap, animations
   d'entrée, restauration du focus au démontage) au lieu de le supprimer. Et cela ne traiterait
   que ce composant : `.mt-sheet` et `.mt-actionsheet` porteraient toujours le même token, prêts
   à reproduire le défaut au premier `Select` qu'on y poserait.

3. **Poser un `z-index` ponctuel sur le seul `SelectContent` de `NewEventDrawer`
   (`className="z-[80]"` côté appelant).**
   Rejeté : correctif local invisible aux cinq autres consommateurs, qui laisse le composant
   partagé cassé et fait dépendre la correction d'un appelant. C'est la forme même du défaut que
   `PIT-S53-003` décrit — un réglage porté par le consommateur au lieu du composant.

4. **Ne traiter que `ui/select.tsx` (le périmètre littéral de l'issue).**
   Rejeté après mesure : `PopoverPicker` (`ui/popoverPicker.tsx`, sélecteur de couleur) passe par
   `ui/popover.tsx` et est rendu par `EventEditForm`, **lui-même monté dans `NewEventDrawer`**
   (`NewEventDrawer.tsx:236`). Il était donc cassé par le MÊME mécanisme, dans le MÊME panneau.
   Corriger le seul `Select` aurait livré un formulaire dont le champ voisin reste invisible.
   `ui/dropdown-menu.tsx` est inclus par cohérence de palier : **aucun défaut n'y a été mesuré**
   (son unique consommateur, `ui/language-selector.tsx`, vit dans `MobileDrawer` et
   `LandingMobileMenu`, deux panneaux `z-50` où le portail gagnait déjà par l'ordre du DOM), mais
   c'est précisément la chance décrite plus haut, pas un invariant.

5. **`ui/dialog.tsx` remonté lui aussi.**
   Rejeté : `DialogContent` n'est pas un popover mais une surface modale à part entière. Sa place
   est le palier `--z-modal`, pas au-dessus. Son `z-50` actuel est un écart séparé, laissé en
   l'état par ce sprint et signalé en suivi — le corriger sans mesure risquerait d'inverser le
   rapport `Select` / `Dialog` dont dépendent `ProductDrawer` et `DeleteConfirmDialog`.

## Conséquences

**Attendues**

- Le popover du `Select` et celui du sélecteur de couleur sont peints dans `NewEventDrawer`, sur
  les deux surfaces (`.mt-drawer` desktop, `.mt-sheet` mobile) et dans les deux thèmes.
- Un `Select`, un `Popover` ou un `DropdownMenu` posé demain dans un drawer, une sheet ou une
  action-sheet fonctionnera **par construction**, sans dépendre de l'ordre du DOM.

**À surveiller**

- Un popover ouvert recouvre désormais toute surface `--z-modal`. C'est voulu (il est ancré à un
  déclencheur qui vit DANS cette surface), mais cela signifie qu'aucune couche autre que
  `--z-netbanner` ne peut plus le masquer. Toute future surface qui devrait le recouvrir doit se
  placer au-dessus de 75, pas entre 70 et 75.
- `--z-toast` (60) reste **sans consommateur** : les toasts viennent de `react-hot-toast`, dont
  le `Toaster` pose `zIndex: 9999` en ligne (`node_modules/react-hot-toast/dist/index.js:178`,
  vérifié). Les toasts restent donc au-dessus des popovers — le changement ne les touche pas. Si
  un jour un toast maison remplace la librairie, il naîtrait SOUS les popovers portalisés : à
  trancher à ce moment-là, pas avant.

**Garde-fou exécutable**

`frontend/e2e/sprint-62-select-focus-indicator.spec.ts` mesure la peinture du popover dans
`NewEventDrawer` par lecture de pixel, en clair et en sombre, sur `.mt-drawer` **et** sur
`.mt-sheet` (avec un oracle de classe qui refuse de rendre un vert si la bascule mobile n'a pas
eu lieu). Les deux `test.fail()` posés par #414 comme marqueur exécutable du défaut ont été
**retirés** — pas contournés : c'était la consigne explicite de leur commentaire d'origine.

⚠ Ce garde-fou verrouille la PEINTURE du `Select` dans ce drawer. Il **ne** verrouille **pas** :
la valeur du token elle-même, le `Popover` du sélecteur de couleur, le `DropdownMenu`, ni les
surfaces `.mt-actionsheet`. Ces quatre points sont vérifiés au navigateur dans ce sprint, pas par
un test rejouable.

## Mesures

**Dans la suite** (`sprint-62-select-focus-indicator.spec.ts`, Chromium + Firefox, lecture de
pixel, unanimité 100 % sur chaque bande) — le popover est peint et l'indicateur de focus repasse
au-dessus du seuil WCAG 1.4.11 :

| Surface | Thème | Fond popover lu à +1 px | Contour à +3 px | Ratio |
|---|---|---|---|---|
| `.mt-drawer` | clair | `#f3f4f6` | `#0e5fc4` | **5,53:1** |
| `.mt-sheet` | clair | `#f3f4f6` | `#0e5fc4` | **5,53:1** |
| `.mt-drawer` | sombre | `#1b1e24` | `#4d9bff` | **5,92:1** |
| `.mt-sheet` | sombre | `#1b1e24` | `#4d9bff` | **5,92:1** |

Avant correctif, #414 lisait `#ffffff` (clair) / `#131519` (sombre) — le panneau du drawer — sur
les 15 offsets.

**Hors suite, contrôle négatif** (sonde jetable, 16 mesures : 2 thèmes × 2 surfaces × 2 états ×
2 widgets ; couleur DOMINANTE de la zone du popover). Le palier est forcé à 50 en cours de page
pour vérifier que la garde est ARMÉE et non simplement verte (`PIT-S62-003`) :

| Widget | État | Clair | Sombre |
|---|---|---|---|
| `Select` | palier 75 | `#f3f4f6` 80,9 % (fond du popover) | `#1b1e24` 80,9 % |
| `Select` | palier forcé à 50 | `#ffffff` 56,7 % (**panneau du drawer**) | `#131519` 54,6 % |
| `PopoverPicker` | palier 75 | dégradé `react-colorful` (`#000000`/`#3a61d4`/`#0040ff`) | idem |
| `PopoverPicker` | palier forcé à 50 | `#ffffff` 46 à 66 % (**panneau du drawer**) | `#131519` 45 à 65 % |

Le défaut revient intégralement quand on remet 50, sur les deux widgets et les deux surfaces :
le token porte bien la correction.
