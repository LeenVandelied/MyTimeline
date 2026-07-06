# UX Patterns — interactions clavier & a11y (référentiel de validation)

> Référentiel des patterns d'interaction attendus pour la Vue Timeline et, par
> extension, les composants riches (drawers, listes navigables) de MyTimeline.
> Source de vérité = code livré #81 (commit `518aa86`) + briques #55/#192.
> Sert de checklist à `ui-design` pour trancher « conforme / réserves levées ».
>
> Statut : chaque pattern est marqué **[LIVRÉ]** (implémenté + testé),
> **[PARTIEL]** (implémenté, couverture ou robustesse à compléter) ou
> **[PRÉVU]** (spécifié, non implémenté).

---

## 1. Region landmark (repère de navigation) — [LIVRÉ]

La frise est un `<section role="region">` explicite avec :
- `aria-label` descriptif (`dashboard.timeline.region.label`, i18n — jamais de FR hardcodé) ;
- `aria-describedby` pointant une aide clavier `sr-only` (`#timeline-region-desc`) lue à l'entrée dans la région.

Effet voulu : VoiceOver / NVDA annoncent la frise comme repère navigable et
rappellent les raccourcis à l'entrée.

Réf. code : `TimelineView.tsx` `<section role="region" …>` + `<p id="timeline-region-desc" className="sr-only">`.
Réf. test : `TimelineView.test.tsx` « expose la frise comme région landmark ».

---

## 2. Roving tabindex — [LIVRÉ]

**PAT-S24-roving-resource-keyed** (pattern a11y canonique de la frise).

Règle : dans une grille dont les items apparaissent/disparaissent (collapse de
catégorie, filtre), **UN SEUL** arrêt de tabulation. La pastille active porte
`tabIndex=0`, toutes les autres `tabIndex=-1`. Conséquence voulue : la frise ne
« piège » pas le Tab (des dizaines d'events = 1 stop) → les actions primaires de
la page restent atteignables au clavier.

Contrainte d'implémentation (le cœur du pattern) :
- l'état actif est **keyé par ID stable** (`{ resourceId, evt }`), **JAMAIS par un index brut de lane** ;
- l'index de coordonnée (lane) est **dérivé à la volée** via une `Map<resourceId, laneIndex>` ;
- les handlers de navigation restent en coordonnées `(lane, evt)` — non réécrits.

Anti-pattern (régression MAJEUR-2 corrigée) : stocker `{ lane, evt }` en index
bruts dans le state. Au collapse d'une catégorie AU-DESSUS, `navLanes` rétrécit →
l'index mémorisé glisse silencieusement vers une AUTRE ressource.

Fallback : `activeNav = null` → la 1re pastille non vide devient l'arrêt par défaut.

Réf. code : `TimelineView.tsx` `activeNav` / `laneIndexByResource` / `rovingNav` / `firstNav`.
Réf. test : « roving tabindex : UNE seule pastille focusable », « la pastille active
reste focusable après collapse », « MAJEUR-2 : le roving suit la RESSOURCE ».

---

## 3. Navigation flèches (déléguée par la pastille) — [LIVRÉ]

Déléguée par `EventPill.onKeyDown` → `TimelineView.onPillKeyDown(e, lane, evt)`.
Lanes collapsées EXCLUES (pastilles non rendues → non focusables). Les lanes
vides sont sautées (`nextNonEmptyLane`).

| Touche | Comportement |
|--------|--------------|
| `→` | pastille suivante DANS la lane ; aux extrémités, déborde sur la 1re pastille de la lane non vide suivante |
| `←` | pastille précédente DANS la lane ; aux extrémités, déborde sur la dernière pastille de la lane non vide précédente |
| `↓` | lane non vide suivante, **index de colonne conservé** et **clampé** (`Math.min(evt, len-1)`) |
| `↑` | lane non vide précédente, colonne conservée + clampée |
| `Home` | 1re pastille de la 1re lane non vide (global) |
| `End` | dernière pastille de la dernière lane non vide (global) |
| `Entrée` / `Espace` | ouvrent le drawer **NATIVEMENT** (`<button>`) — aucun handler custom → pas de double-ouverture |

Chaque touche gérée fait `e.preventDefault()`. Après déplacement, le focus est
posé ET **`scrollIntoView({ block:'nearest', inline:'nearest' })`** est appelé
explicitement (cf. §7).

Réf. code : `TimelineView.tsx` `onPillKeyDown` + `focusNav`.
Réf. test : « ↓ déplace le focus vers la lane suivante, ↑ revient », « End … Home … »,
« Entrée sur une pastille ouvre le drawer ».
Couverture à compléter (§9) : `←`/`→` inter-lanes non couverts par un test dédié.

---

## 4. Focus-trap du drawer — [LIVRÉ]

Le `EventDrawer` (`role="dialog"` + `aria-modal="true"` + `aria-label`) piège le focus :
- **focus initial** sur le 1er focusable (bouton fermer) à l'ouverture ;
- **Tab / Shift+Tab** bouclent dans le panneau (dernier→premier / premier→dernier), `preventDefault` aux bornes ;
- sélecteur focusables : `button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])` ;
- à la fermeture (unmount), **restauration du focus** sur l'élément déclencheur (`previousFocus`).

Fermeture **Échap** : gérée par le PARENT (`TimelineView`, handler global — cf. §5),
priorité au drawer. Le drawer ne gère QUE le trap + le focus initial/restauré.

Réf. code : `EventDrawer.tsx` `useEffect` (trap Tab, focus init, restore).
Réf. test : « ouvre le drawer … puis le ferme avec Échap », « ferme le drawer via le bouton fermer ».
Couverture à compléter (§9) : le cyclage Tab/Shift+Tab et la restauration de focus
ne sont pas couverts par un test unitaire dédié.

---

## 5. Raccourcis clavier globaux — [LIVRÉ] (sauf `?`)

Handler `keydown` sur `window`. Gardes :
- ignore si un champ a le focus (`INPUT` / `TEXTAREA` / `isContentEditable`) ;
- **Échap traité AVANT la garde de saisie** (ferme même depuis un champ) ;
- n'intercepte PAS les combinaisons OS/navigateur (`metaKey` / `ctrlKey` / `altKey`) →
  Cmd+F / Ctrl+F restent la recherche navigateur.

| Touche | Action | Statut |
|--------|--------|--------|
| `T` / `t` | aller à aujourd'hui (`GO_TO_TODAY` + recentrage scroll) | [LIVRÉ] |
| `[` | période précédente (`PREV_PERIOD`) | [LIVRÉ] |
| `]` | période suivante (`NEXT_PERIOD`) | [LIVRÉ] |
| `+` / `=` | zoom avant | [LIVRÉ] |
| `-` | zoom arrière | [LIVRÉ] |
| `F` / `f` | plein écran (toggle) | [LIVRÉ] |
| `Échap` | ferme le drawer (priorité), sinon sort du plein écran | [LIVRÉ] |
| `?` | ouvrir l'aide raccourcis | **[PRÉVU]** — voir ci-dessous |

**`?` (aide) — [PRÉVU / NON IMPLÉMENTÉ AU CLAVIER]** :
il n'existe PAS de `case '?'` dans le handler global. L'aide est un **tooltip**
(`.mt-tlv__help-pop`, `role="tooltip"`) affiché au **hover/focus** du bouton `?`
de la toolbar — pas de dialog déclenché par la touche `?`. Écart formel avec le
Sprint 17 (raccourci `?` listé). Suivi : cf. §9 (RECOMMAND_FOLLOWUP).

Réf. code : `TimelineView.tsx` `useEffect(onKey …)` + bloc `.mt-tlv__help`.
Réf. test : « le raccourci "+" zoome », « le raccourci "F" ne hijacke pas Cmd/Ctrl+F ».
Couverture à compléter (§9) : `T`, `[`, `]`, `-` non couverts par un test dédié.

---

## 6. Annonces `aria-live` (polite) — [LIVRÉ]

Région `sr-only` `role="status"` `aria-live="polite"` `aria-atomic="true"`.
Une seule string, la dernière écriture gagne. Annonce :
- le **niveau de zoom** à chaque changement (silencieux au montage : pas d'annonce
  parasite, garde `lastAnnouncedZoom` contre le double-invoke StrictMode) ;
- l'**event sélectionné** à l'ouverture du drawer.

Réf. code : `TimelineView.tsx` `liveMessage` + effets zoom/selected.
Réf. test : « aria-live annonce le changement de zoom », « … l'event sélectionné ».

---

## 7. Focus + scroll (piège jsdom) — [LIVRÉ]

**PIT-S24-scrollintoview-focus** : `.focus()` seul ne défile pas fiablement des
conteneurs scrollables imbriqués (lanes vertical + rail horizontal). Toujours
appeler `node.scrollIntoView({ block:'nearest', inline:'nearest' })` APRÈS
`.focus()`. jsdom n'implémente pas `scrollIntoView` → **stub requis dans
`vitest.setup.ts`** (déjà présent) sinon les tests clavier throw.

Réf. code : `TimelineView.tsx` `focusNav`.

---

## 8. Label a11y agrégé de la pastille — [LIVRÉ]

`EventPill` porte un `aria-label` riche construit par `buildEventAriaLabel`
(titre + statut + dates + produit + récurrence — BR-EVE-006/012). Le texte visuel
interne est décoratif (`aria-hidden`, le bouton porte déjà l'annonce). Garde-fou
contraste (BR-EVE-009) : si le libellé ne passe pas AA 4.5:1 DEDANS, un libellé
extérieur décoratif (`aria-hidden`) est rendu à côté.

Réf. code : `EventPill.tsx` + `lib.ts` `buildEventAriaLabel` / `eventLabelReadableInside`.
Réf. test : « le bloc event expose un aria-label riche », bloc « garde-fou contraste ».

---

## 9. Écarts connus vs code livré #81 & suivi

- **`?` non câblé au clavier** (§5) : aide en tooltip hover/focus uniquement.
  → RECOMMAND_FOLLOWUP : câbler `case '?'` (ouvrir le pop d'aide) OU acter
    officiellement l'aide « hover/focus only » et retirer `?` de la liste des
    raccourcis annoncés.
- **`EventPill.tsx:100`** — `<span aria-hidden="true">{event.title}</span>` reste
  `aria-hidden` **même quand c'est le seul texte visible** (cas contraste OK, pas
  de libellé extérieur). Aujourd'hui inoffensif : l'`aria-label` du bouton couvre
  le titre pour les lecteurs d'écran. Statut : **écart MINEUR toléré** (pas de
  perte d'info a11y). Correctif trivial possible (retirer `aria-hidden` quand
  `readableInside`) mais non requis → RECOMMAND_FOLLOWUP (facultatif).
- **Couverture de tests à compléter** (non bloquant) : `←`/`→` inter-lanes,
  cyclage Tab/Shift+Tab du drawer + restauration de focus, raccourcis `T`/`[`/`]`/`-`.

---

## 10. Checklist ui-design (validation Timeline)

- [ ] region landmark présent + aria-label/description i18n
- [ ] un seul `tabIndex=0` parmi les pastilles (roving)
- [ ] roving keyé par ID stable (pas d'index brut en state)
- [ ] flèches ←→↑↓ + Home/End + Entrée/Espace natif
- [ ] focus-trap drawer + restauration focus au close
- [ ] raccourcis T/[/]/+/-/F/Échap ; garde saisie + garde modificateurs
- [ ] aria-live polite (zoom + sélection), silencieux au montage
- [ ] `scrollIntoView` après focus
- [ ] écarts §9 tracés (issue de suivi ou décision actée)
