# Extrait maquette — États système (projet Claude Design `e8ce9db5…`)

> Relevé par le lead au `/sprint start 110` (2026-09-24) via `DesignSync get_file` sur
> `États système.dc.html` (racine du projet). Les subagents n'ont pas `DesignSync` : **ce fichier fait foi**
> pour #627 et #628. Extrait factuel ; les valeurs sont des styles inline de la maquette.

## Enveloppe commune (404, 500, 403)
- Carte `.es-card` : `background: var(--color-surface)`, `border: 1px solid var(--color-rule)`, `border-radius: 14px`,
  ombre `0 1px 3px rgba(0,0,0,.08)`.
- En-tête de carte : logo (Icon `logo`, 19 px) + « MyTimeline » (`--font-display`, 600, 15 px), `padding: 12px 18px`,
  `border-bottom: 1px solid var(--color-rule)`.
  → Élément de présentation de la planche ; ce n'est PAS une exigence des issues. Ne pas l'ajouter sans raison.

## 404 — « éphéméride » (largeur de planche 600 px)
Corps : `display:flex; gap:28px; padding:34px 30px 36px; align-items:center`.

**Feuillet (à gauche)** — `flex:0 0 auto; width:150px; text-align:center; border:1px solid var(--color-rule-strong);
border-radius:12px; padding:16px 10px; background:var(--color-bg)` :
1. jour de semaine — mono, 10 px, `letter-spacing:.14em`, uppercase, `--color-ink-muted` (ex. `MERCREDI`)
2. jour du mois — mono, **62 px**, 600, `line-height:1`, `--color-ink`, `margin:4px 0`, sur 2 chiffres (`padStart(2,'0')`)
3. mois + année — mono, 11 px, `letter-spacing:.12em`, uppercase, **`--color-accent`** (ex. `SEPTEMBRE 2026`)
4. « Semaine N » — mono, 9 px, `letter-spacing:.1em`, uppercase, `--color-ink-faint`, `margin-top:8px`,
   `border-top:1px solid var(--color-rule)`, `padding-top:7px`

Le prototype calcule la date avec `new Date()` côté client au rendu (noms FR en dur). Sa formule de semaine
n'est PAS ISO 8601 (`ceil((jours depuis 1er janv + getDay(1er janv) + 1)/7)`) — c'est un prototype.

**Texte (à droite)** — `flex:1; min-width:0` :
1. sur-titre « Erreur 404 » — mono, 11 px, `letter-spacing:.14em`, uppercase, `--color-ink-faint`, `margin-bottom:10px`
2. titre (h2 dans la planche) « **Cette page n'a pas de date dans l'almanach.** » — `--font-display`, 25 px, 600,
   `letter-spacing:-.02em`, `line-height:1.15`, `margin:0 0 10px`
3. paragraphe « La page que tu cherches a expiré, déménagé, ou n'a jamais existé. Reviens à aujourd'hui — c'est
   toujours une valeur sûre. » — 14 px, `line-height:1.5`, `--color-ink-muted`, `margin:0 0 20px`
4. bouton primaire « **Revenir à aujourd'hui** » → `Dashboard.dc.html`

Aucune icône (la boussole actuelle n'existe pas dans la maquette). Pas de gros « 404 » : le code n'apparaît que dans le sur-titre.

**Variante sombre** : strictement la même structure sous `.dark`, mêmes tokens (le rendu change par les tokens seuls).

⚠ Voix : la maquette tutoie (« tu cherches », « Reviens »). Vérifier la voix déjà utilisée dans `errors.json` fr et
dans le handoff (`docs/design/graphite-handoff.md`, conventions de voix) avant de choisir tu/vous — ne pas mélanger
dans un même écran.

## 500 — « incident serveur » (largeur de planche 460 px)
Corps `padding:36px 30px` :
1. sur-titre « Erreur 500 » — mono, 11 px, `letter-spacing:.14em`, uppercase, **`--color-danger`**, `margin-bottom:12px`
2. titre « Nos serveurs ont perdu le fil du temps. » — display 25 px 600
3. paragraphe « Un incident technique nous empêche d'afficher ta frise. On y travaille — réessaie dans un instant. »
4. rangée `display:flex; align-items:center; gap:12px` : bouton primaire « Réessayer » **puis**
   `<span>` « **réf. {{ ref }}** » — mono (`--font-mono`), **11 px**, **`--color-ink-faint`**, pas d'uppercase.

Le prototype fabrique `ref = "MT-" + année + "-" + aléatoire 4 chiffres` : **donnée factice**. En production la
référence est `error.digest` (Next), et elle n'est rendue que si elle existe.

Variante sombre du 500 : ajoute un petit cachet « Serveur / 500 » en relief au-dessus du sur-titre — **hors périmètre #628**.

## 403 — accès refusé
Même rangée « bouton + `réf. {{ ref }}` » que le 500 (mono 11 px ink-faint). Sur-titre « Error · 403 · Forbidden » en
`--color-danger`. Le cachet 403 et le reste du 403 sont **hors périmètre** de ce sprint.
