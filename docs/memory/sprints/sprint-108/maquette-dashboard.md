# Extrait maquette — `Dashboard.dc.html` (projet Claude Design `e8ce9db5…`)

> Relevé par le lead au `/sprint start 108` (2026-09-22) via `DesignSync get_file`. Les subagents n'ont
> pas `DesignSync` : **ce fichier fait foi** pour #623 et #640. Extrait factuel, pas de réinterprétation.

## Hero « Aperçu de la frise » (#623)

En-tête de section (déjà livré en prod, rappel) :
- sur-titre mono 10 px `ink-faint` : **« 30 prochains jours »** ; titre display 17 px « Aperçu de la frise »
- à droite : `Fenêtre · {heroRange}` (mono 11 px `ink-muted`) puis bouton secondaire « Ouvrir la frise »
- carte : `border 1px rule`, `radius 10px`, `padding 12px 16px 14px`, fond `surface`

**Fenêtre de temps = FUTURE** : jour 0 = aujourd'hui (bord GAUCHE), jour 30 = aujourd'hui + 30 (bord droit).
`pct(d) = d / 30 * 100`. ⚠ La prod actuelle montre les 30 DERNIERS jours (aujourd'hui à droite) : écart à corriger.

**Règle (ruler)** — bloc `position:relative; height:18px` AU-DESSUS de la piste :
- une graduation tous les **5 jours** : k = 0, 5, 10, 15, 20, 25, 30 (7 libellés)
- libellé : k=0 → **« AUJ. »** ; sinon date courte `{jour} {MOIS 3 lettres}` (ex. « 27 SEPT. » selon l'Intl de la locale — la maquette code `fmtShort` = `getDate() + " " + MO3[mois]`, MO3 en MAJUSCULES)
- style : `font: 9px var(--font-mono)`, `color: var(--color-ink-muted)`, `white-space: nowrap`, `top: 4px`
- ancrage : k=0 `transform:none` (aligné à gauche), k=30 `translateX(-100%)` (aligné à droite), autres `translateX(-50%)` (centrés)
- pas de trait de graduation dessiné : uniquement les libellés

**Piste (track)** — `position:relative; margin-top:4px`, hauteur = contenu :
- ligne TODAY : `position:absolute; left:0; top:0; bottom:0; width:2px; background: var(--color-accent)` (donc au bord gauche)
- (la maquette dessine des barres d'ÉVÉNEMENTS empilées en lignes — **hors périmètre S108** : l'histogramme de densité de la prod est CONSERVÉ, arbitrage dev)

**Viewport déplaçable** :
- largeur = **9 jours** (`pct(9)`), position `left = pct(vpStart)`, `vpStart ∈ [0, 21]` (continu pendant le glisser, arrondi pour le libellé)
- `top:-4px; bottom:-4px` (déborde de 4 px la piste), `border: 1.5px solid var(--color-accent)`, `border-radius: 6px`,
  `background: color-mix(in srgb, var(--color-accent) 9%, transparent)`, `cursor: grab` (→ `grabbing` pendant le glisser), `z-index:5`, `touch-action:none`
- pointeur : `onPointerDown` → `setPointerCapture`, mémorise `clientX` + `vpStart` ; `onPointerMove` → `delta jours = (clientX - x0) / largeurPiste * 30`, clamp [0, 21] ; `onPointerUp` → fin
- **libellé `heroRange`** = `fmtShort(today + round(vpStart))` + « – » + `fmtShort(today + round(vpStart) + 9)` ; état initial vpStart = 0
- le viewport ne pilote QUE ce libellé : aucune frise sur le tableau de bord, donc **aucune synchronisation** à implémenter (arbitrage lead, constat : `app/[locale]/(app)/dashboard/page.tsx` ne rend pas de frise)

## « En bref » (#640)

Carte : `border 1px rule`, `radius 10px`, `padding 16px 18px`, `gap 13px`, `font-size 14px`, `line-height 1.5`, texte `ink-muted`.
Chiffres : `font-mono`, `font-weight 600`, `color ink` (sauf le 2e, en `accent`). **4 phrases, dans cet ordre** :

1. « Tu as **{statWeek}** événements cette semaine, dont **{statRecur}** récurrents. »
2. « **{statExp}** arrivent à échéance sous **14** jours. » — `statExp` en `color: var(--color-accent)` ; le « 14 » en mono `ink` (non gras)
3. « **{statOngoing}** couvertures sont en cours actuellement. »
4. « Catégorie la plus chargée ce mois : **{statBusy}**. » — nom en gras `ink`, PAS en mono ; « — » si aucune

Définitions (script de la maquette) :
- `ongoing(ev)` = `type === "duration"` ET `début ≤ aujourd'hui ≤ fin`
- `nextStart(ev)` = début ; si récurrent, avancé d'une période (an/mois) tant qu'il est < aujourd'hui
- **statWeek** = nb d'événements dont `d = ongoing ? aujourd'hui : nextStart` vérifie `d ≥ aujourd'hui` et `d - aujourd'hui ≤ 7 j` (même liste que « Cette semaine »)
- **statRecur** = parmi ceux-là, les récurrents
- **statExp** = nb d'événements avec `nextStart ≥ aujourd'hui` et `nextStart - aujourd'hui ≤ 14 j`
- **statOngoing** = nb d'événements `ongoing`
- **statBusy** = catégorie (de PRODUIT) qui a le plus d'occurrences ; la maquette compte sur la fenêtre du hero (30 j) alors que le libellé dit « ce mois » → **arbitrage lead : mois calendaire courant**, cohérent avec le libellé et DEC-S82-007. Ex æquo : la maquette garde la première rencontrée (`>` strict) — rendre déterministe (ordre documenté et testé).

Arbitrage dev (2026-09-22) : ces 4 phrases **remplacent** les 3 lignes actuelles (`activeProducts`, `eventsThisMonth`, `currentStreak`).
