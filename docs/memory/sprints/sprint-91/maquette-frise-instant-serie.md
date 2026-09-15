# Maquettes « Vue Timeline » + « Mobile Timeline » — rendu des événements (Sprint 91)

> Source : projet Claude Design `e8ce9db5-cc08-42a5-8585-76e13a43f2f8`, fichiers
> `design_handoff_mytimeline/Vue Timeline.dc.html` (`renderLaneBars`, `layoutLane`,
> `genInstances`) et `Mobile Timeline.dc.html` (`renderTrack`, mêmes fonctions), lus le
> 2026-09-14 par le lead via DesignSync — **outil non disponible aux sous-agents : ce fichier
> est la seule copie exploitable**. Pour un point visuel précis, la règle du `.dc.html` fait
> foi sur le README du handoff et sur les énoncés d'issues. Complète
> `docs/memory/sprints/sprint-85/maquette-vue-timeline.md` (sidebar, en-têtes, résumé plié).

## Convention écrite (README du handoff, § « Traitement visuel des barres »)

- **Barre pleine** : fond = couleur de l'événement, texte au contraste auto. Rayon 6 px, ombre
  xs/sm. **Glyphe `↻` en préfixe si récurrent.**
- **Ponctuel** : *pin* compact (≈10 px) + libellé à droite en encre (≠ barre de durée).
- **Récurrence** : **pas de trame de stries**. Occurrence pleine + **filet pointillé** reliant
  des occurrences fantômes (contours/pastilles en pointillés).
- Helper à mutualiser : `instancesIn(event, windowDays)` = occurrences (incl. récurrentes /
  fantômes) dans une fenêtre, « utilisé par frise, dashboard, mini-frises ».

## Constantes de lane

| | Desktop | Mobile |
|---|---|---|
| hauteur de barre `BARH` | 26 px | 24 px |
| écart vertical entre rangées `VGAP` | 8 px | 7 px |
| marge haute `PADT` | 10 px | 12 px |
| police barre / libellé | `600 12px var(--font-ui)` | `600 12.5px var(--font-ui)` |

`top` d'une rangée = `PADT + row × (BARH + VGAP)`.

## Occurrences (`genInstances`) — identiques desktop et mobile

- Occurrence réelle = `start` de l'événement (`ghost:false`).
- Si récurrent : fantômes **en avant** (`+k` mois ou années) tant que `d ≤ domainEnd`, et
  **en arrière** (`−k`) tant que `d + span ≥ domainStart`, **k < 60** dans chaque sens.
- `span` = durée en jours pour `duration`, 0 pour `single`. Chaque fantôme garde le type et la
  durée de l'occurrence réelle.
- Note prod : la maquette n'a pas de date de fin de série. En prod, `recurrenceEndDate` (#676)
  borne les fantômes en avant — **à respecter** (déduction du lead, pas dans la maquette).

## Rendu par instance

### 1. Connecteur (si récurrent ET plus d'une instance) — dessiné AVANT les instances
- `position:absolute; left:minL; width:maxR − minL; top: top + BARH/2; height:0;
  border-top:1.5px dotted <couleur de l'événement>; opacity:.5; pointer-events:none`.
- `minL` = bord gauche de la première instance ; `maxR` = bord droit de la dernière
  (pour un ponctuel : sa position, pas de largeur).

### 2. Ponctuel — occurrence réelle = pin + libellé
- **Pin** : `left: x − 5; top: top; width:10px; height:BARH; border-radius:3px;
  background:<couleur>; box-shadow:var(--shadow-sm); cursor:pointer` → centré sur la date.
- **Libellé** : `left: x + 11; top: top + 5 (desktop) / top + 4 (mobile); height:16px;
  line-height:16px; font: 600 12px (mobile 12.5px) var(--font-ui);
  color:var(--color-ink); white-space:nowrap; cursor:pointer`.
  Texte = `(récurrent ? "↻ " : "") + titre`. **Encre de la page, pas l'encre calculée de la
  couleur** (le libellé est sur le fond de lane).
- Pin ET libellé portent **les mêmes handlers** (clic = sélection, survol = tooltip,
  appui long mobile = menu) : **le libellé fait partie de la cible cliquable**.

### 3. Ponctuel — occurrence fantôme = petit carré
- `left: x − 4; top: top + BARH/2 − 4; width:8px; height:8px; border-radius:3px;
  background:var(--color-surface); border:1.5px solid <couleur>; opacity:.65;
  pointer-events:none`. **Trait plein, pas pointillé**, pas de libellé.

### 4. Durée — occurrence réelle = barre pleine
- `left: x; width: max(12, durée×pxParJour)` (mobile `max(14, …)`) ; `height:BARH;
  display:flex; align-items:center; gap:6px; padding:0 10px; border-radius:6px;
  background:<couleur>; color:<encre contraste auto>; white-space:nowrap; overflow:hidden;
  box-shadow:var(--shadow-sm)`.
- Enfants : si récurrent, `<span>↻</span>` (`font:11px var(--font-mono); opacity:.85;
  flex:0 0 auto`) puis `<span>` titre (`overflow:hidden; text-overflow:ellipsis`).

### 5. Durée — occurrence fantôme = contour pointillé
- `left: x; width: max(8, w); height:BARH; border-radius:6px;
  border:1.5px dashed <couleur>; background: color-mix(in srgb, <couleur> 8%,
  var(--color-surface)); opacity:.7; pointer-events:none`. Pas de texte.
- Équivalent DS déjà porté : `.mt-evt--draft` (`frontend/src/styles/ds/components/timeline.css:88`)
  et `.mt-evt-connector` (`:96`). L'issue #595 exige **ces classes, sans CSS concurrent**.
  Écarts à noter par l'agent : le DS pose un `border` en `dashed` pour le connecteur
  (`border-top:2px dashed`) là où la maquette dit `1.5px dotted` + `opacity:.5`.

## Empilage dans une lane (`layoutLane`)

- Tri par début ; chaque événement prend la première rangée dont la fin précédente + `gap`
  est ≤ son début ; `gap = 8 px` desktop / `10 px` mobile, convertis en jours.
- **Fin réservée à un ponctuel = début + 100 px / pxParJour (desktop), 90 px (mobile)** — la
  place du libellé est RÉSERVÉE dans l'empilage, pour qu'un libellé ne chevauche pas
  l'événement suivant de la même rangée.
- Seule l'**occurrence réelle** entre dans l'empilage ; les fantômes et le connecteur suivent
  la rangée de leur événement.
- Hauteur de lane desktop : `max(46, PADT×2 + rows×BARH + (rows−1)×VGAP)`.

## Ce que la maquette NE traite PAS (à arbitrer, pas à inventer)

- Cible tactile ≥ 44 px du pin (critère de #594) : la maquette donne 10×26 + libellé cliquable,
  pas de zone élargie.
- Libellé de pin plus long que l'espace réservé (100/90 px) : la maquette ne tronque pas.
- Fantômes au-delà de la fenêtre visible / virtualisation : la maquette génère tout le domaine.
- Chevauchement de plusieurs séries dans une même rangée : non dessiné.
