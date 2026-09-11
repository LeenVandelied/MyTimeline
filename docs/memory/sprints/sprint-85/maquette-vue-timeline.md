# Maquette « Vue Timeline » — extrait factuel pour le Sprint 85

> Source : projet Claude Design `e8ce9db5-cc08-42a5-8585-76e13a43f2f8`,
> fichier `design_handoff_mytimeline/Vue Timeline.dc.html` (lu le 2026-09-11 par le lead
> via DesignSync — outil NON disponible aux sous-agents : ce fichier est la seule copie
> exploitable). Pour un point visuel précis, **la règle du `.dc.html` fait foi sur le
> README du handoff et sur les énoncés d'issues** (PIT/mémoire S83).
> Les valeurs sont recopiées des styles inline de la maquette ; les correspondances de
> tokens (`--color-*`, `--font-*`) sont celles du DS déjà porté dans
> `frontend/src/styles/ds/`.

## Disposition générale (écran autonome)

```
[aside 248px | main(flex:1): header / {{timeline}} / pied minimap ]
```
- `aside` : `width:248px; flex:0 0 auto; border-right:1px solid var(--color-rule);
  background:var(--color-surface); display:flex; flex-direction:column`.
- En mode `embedded` (monté dans le shell `App.dc.html`) : la marque (logo) et la bascule
  de thème de l'écran sont masquées (`brandDisplay`/`themeDisplay = none`). **La sidebar
  et le bouton « Nouvel événement » de l'en-tête restent** ; ce bouton appelle
  `props.onOpenCreate()` = l'overlay de formulaire DU SHELL (un seul formulaire).

## A. Sidebar — corps `padding:18px 16px; gap:22px; overflow-y:auto`

Chaque bloc a un titre de section : `font-family:var(--font-mono); font-size:10px;
letter-spacing:.14em; text-transform:uppercase; color:var(--color-ink-faint);
margin-bottom:9px` (= motif `.mt-eyebrow`/`mt-nav-label` de section).

1. **« Accordéons »** — contrôle segmenté 2 boutons dans
   `border:1px solid var(--color-rule-strong); border-radius:7px; overflow:hidden` :
   `[Tout déplier | Tout plier]` ; chaque bouton `flex:1; padding:8px 0; font:500 12px
   var(--font-ui); background:var(--color-surface); color:var(--color-ink-muted)` ; le
   2e a `border-left:1px solid var(--color-rule)`. Pas d'état actif.
   Logique : `collapseAll(v)` pose `collapsed[cat]=v` pour TOUTES les catégories.
2. **« Catégories »** (filtres) — liste `flex-direction:column; gap:1px` ; une ligne =
   un `<button>` par catégorie :
   - ligne : `display:flex; align-items:center; gap:9px; width:100%; padding:6px 8px;
     border:0; background:transparent; border-radius:6px; font:500 13px var(--font-ui);
     color:var(--color-ink); opacity: 1` — **`opacity:.4` quand la catégorie est masquée** ;
   - pastille : `width:11px; height:11px; border-radius:3px; border:1px solid <couleur>;
     background:<couleur>` — **`background:transparent` quand masquée** (contour seul) ;
   - libellé : `flex:1; text-align:left; white-space:nowrap; overflow:hidden;
     text-overflow:ellipsis` ;
   - compteur : `font-family:var(--font-mono); font-size:11px; color:var(--color-ink-faint)`
     = **nombre d'ÉVÉNEMENTS de la catégorie** (compté même si masquée).
   Logique : `toggleCat(k)` bascule `hiddenCats[k]`. **Masquer ≠ replier** : une catégorie
   masquée disparaît ENTIÈREMENT de la frise (ni en-tête ni lanes) ET de la minimap
   (`visibleLanes()` filtre `hidden`) ; le compteur « N événements · M produits » du pied
   ne compte que le visible.
3. **« Légende »** — `flex-direction:column; gap:8px; font-size:13px;
   color:var(--color-ink-muted)` ; entrées = TYPES DE MARQUES (pas les catégories) :
   - « Événement » : `span 22×12, border-radius:4px, background:var(--color-accent),
     box-shadow:var(--shadow-sm)` ;
   - « Occurrence à venir » : `22×12, radius 4px, border:1.5px dashed
     var(--color-ink-faint), background:color-mix(in srgb,var(--color-ink-faint) 8%,
     var(--color-surface))` ;
   - « Récurrence ↻ » : `width:22px; height:0; border-top:1.5px dotted
     var(--color-ink-muted)`.
   ⚠ Voir DEC-S85-002 : seules les marques réellement rendues par la frise de prod.
4. **Raccourcis (pied de la sidebar)** — `border-top:1px solid var(--color-rule);
   padding:14px 18px; font-family:var(--font-mono); font-size:10.5px; line-height:2;
   color:var(--color-ink-faint)` ; touches en `color:var(--color-ink-muted)` :
   `T aujourd'hui · [ ] naviguer` / `+ − zoom · F recadrer`. (Pas de titre de section.)

Pas d'état vide dessiné ; pas de comportement responsive dans ce fichier (le README dit
seulement « tablette sidebar repliable » → DEC-S85-004).

## B. En-tête de catégorie dans la frise (`buildRows`, `CATH = 40`)

- Rangée : `height:40px; border-bottom:1px solid var(--color-rule);
  background:var(--color-surface-2); cursor:pointer` ; clic = `toggleCollapse(cat)`.
- Cellule sticky gauche (largeur de gouttière `LH = 176px`) : `position:sticky; left:0;
  background:var(--color-surface-2); border-right:1px solid var(--color-rule);
  padding:0 12px; display:flex; align-items:center; gap:8px`, contenant dans l'ordre :
  1. chevron `▸` (plié) / `▾` (déplié) — `width:10px; font:10px var(--font-mono);
     color:var(--color-ink-muted)` ;
  2. **pastille** `width:10px; height:10px; border-radius:3px; background:<couleur de la
     catégorie>` ;
  3. libellé `flex:1; font:600 13px var(--font-display); color:var(--color-ink);
     ellipsis` ;
  4. **compteur** `font:10px var(--font-mono); color:var(--color-ink-faint)` =
     **`prods.length` = nombre de PRODUITS (lanes) de la catégorie** (DEC-S85-001).
- Une catégorie masquée (A.2) ou sans produit n'a pas d'en-tête.

## B-bis. Lane produit (sous un en-tête déplié) — ajouté à la revue de fin de sprint

- Rangée : `position:relative; display:flex; height:<layout.height>px (min 46);
  border-bottom:1px solid var(--color-rule)` (pas de fond propre : `--color-bg` du scroller).
- Cellule sticky gauche : `position:sticky; left:0; width:176px (LH); background:
  var(--color-surface); border-right:1px solid var(--color-rule); padding:0 14px 0 30px;
  display:flex; flex-direction:column; justify-content:center; gap:2px`.
- Nom du produit : `font:500 13px var(--font-display); color:var(--color-ink);
  line-height:1.15; ellipsis`.
- ⇒ **Hiérarchie de la maquette** : en-tête de catégorie = `surface-2` + `600` ; lane =
  `surface` + `500` + retrait de 30 px. Deux niveaux distincts par le FOND, la GRAISSE et le
  RETRAIT.

## C. Catégorie repliée → « résumé compact » (`renderCatSummary`)

- Rendu DANS la piste de la rangée d'en-tête (40 px de haut, même canevas que les lanes :
  `position:relative; width:canvasW`), donc aucune rangée supplémentaire.
- Pour chaque événement de la catégorie : un `div` `position:absolute; left:<début×pxParJour>;
  top:16px; height:8px; width:max(4, durée×pxParJour) (ponctuel : 6px);
  border-radius:2px; background:<couleur de l'événement>; opacity:.85`.
- Pas de titre, pas d'occurrence fantôme, pas d'interaction (le clic sur la rangée replie/
  déplie). Suit zoom et défilement par construction (mêmes coordonnées que les barres).
- Déplié : `null` dans la piste, puis les lanes produit en dessous.

## D. En-tête de l'écran (barre d'outils)

`header : display:flex; align-items:center; gap:14px; padding:13px 22px;
border-bottom:1px solid var(--color-rule); background:var(--color-surface)`, dans l'ordre :
1. bloc titre `flex:1` : eyebrow mono 10px `.12em` uppercase ink-muted
   (« N produits · M événements ») + `h1` « Timeline » (`font-display 27px 600`) ;
2. `TimelineZoomControls` (−/lecture « 1 px = X h »/+), ~150×38 ;
3. **« Aujourd'hui »** : `height:38px; padding:0 14px; border:1px solid
   var(--color-rule-strong); background:var(--color-surface); color:var(--color-ink);
   border-radius:7px; font:500 13px var(--font-ui)` — bouton secondaire, sans icône ;
   action `centerOn(today)` (= raccourci `T`) ;
4. bascule de thème 38×38 (**masquée en `embedded`** → hors périmètre, cf. #602) ;
5. **« Nouvel événement »** : `Button variant="accent"` (~170×38) → `onOpenCreate()`.

La minimap est dans un PIED sous la frise (`Minimap` + compteur mono) — hors périmètre S85.

## Données de démo

7 catégories (Véhicules `#3E8BD6`, Assurance `#6C7BE0`, Santé `#4FA459`, Alimentation
`#E3A82B`, Logement `#B056A8`, Voyage `#2FA7A2`, Finances `#DD5C97`), 8 produits,
18 événements. Chaque événement a SA couleur ; la couleur de catégorie ne sert qu'aux
pastilles (sidebar + en-tête).
