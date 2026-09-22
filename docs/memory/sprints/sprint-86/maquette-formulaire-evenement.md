# Extrait de maquette — `Formulaire Événement.dc.html` (Sprint 86)

> Lu par le lead le 2026-09-12 via DesignSync (projet maquettes `e8ce9db5…`, fichier racine
> `Formulaire Événement.dc.html`, non tronqué). Les sous-agents n'ont PAS DesignSync : **ce
> fichier est leur source de vérité visuelle.** En cas de conflit avec le README du handoff,
> la règle CSS citée ici fait foi (cf. S83).

## A. Surface (#618) — UNE seule, création ET édition (bascule `mode: create|edit`)

- **Scrim** : `position:absolute; inset:0; background: color-mix(in srgb, var(--color-ink) 30%, transparent)` ;
  clic scrim = fermer. Animation d'entrée `ef-fade .2s`.
- **Drawer** : `position:absolute; top:0; right:0; bottom:0; width:452px; background:var(--color-surface);
  border-left:1px solid var(--color-rule); box-shadow:var(--shadow-lg); display:flex; flex-direction:column`.
  Entrée `ef-slide .24s cubic-bezier(.32,.72,0,1) both` (`from{transform:translateX(28px);opacity:0}`).
  Prod : token `--drawer-width-form: 452px` + `.mt-drawer--form` (déjà consommés par la CRÉATION).
- **Même structure dans les deux modes**, de haut en bas :
  1. **En-tête** `padding:20px 22px 16px; border-bottom:1px solid var(--color-rule)` :
     titre `font-display 21px/600` — « Nouvel événement » | « Éditer l'événement » ;
     sous-titre création `13px ink-muted` ; en édition, ligne mono 10.5px « CRÉÉ LE <date> · <id> ».
     À droite, puce `Échap` (mono 10px, bordure `rule`, radius 5px).
  2. **Aperçu sticky** `flex:0 0 auto; padding:14px 22px 16px; border-bottom; z-index:2;
     box-shadow:0 6px 14px -12px color-mix(in srgb,var(--color-ink) 40%,transparent)` —
     libellé « APERÇU » + légende à droite, puis la mini-frise.
  3. **Corps défilant** `.ef-body{flex:1; overflow-y:auto; padding:18px 22px 22px; gap:17px}`.
  4. **Pied** `padding:14px 22px; border-top:1px solid var(--color-rule)` :
     - création : `justify-content:flex-end` → `Annuler` (ghost) · `Créer l'événement` (accent) ;
     - édition : `Supprimer` (bordure/texte `--color-danger`, à GAUCHE) · espaceur · `Annuler` · `Enregistrer`.
- Fermeture : croix/Annuler, scrim, Échap — **identique dans les deux modes** (handoff §Drawers).
- Aucune largeur en dur hors token ; aucune seconde implémentation (Dialog stylé) pour l'édition.

## B. Champs (ordre du corps)

`Titre` · **`Catégorie`** · `Produit` · `Type` (segmenté Ponctuel/Durée) · `Début`(`Date` si ponctuel) + `Fin` ·
ligne `Durée` · `Récurrence` (Aucune / ↻ Hebdo / ↻ Mens. / ↻ Ann.) · bloc `Fin de série` · `Couleur`.

Libellé de champ : `display:block; font-family:var(--font-mono); font-size:10px; letter-spacing:.1em;
text-transform:uppercase; color:var(--color-ink-muted); margin-bottom:7px`.

## C. Catégorie (#617) — ce que dessine la maquette, et ce qu'on en retient

Maquette : `Select` du DS, `placeholder="Choisir une catégorie…"`, options = catégories avec pastille
couleur, **`onCategory` modifie la catégorie librement** ; `onProduct: (v) => setState({ productId: v,
category: products[v].cat })` → **choisir un produit aligne la catégorie**. Les options produit portent
la couleur de LEUR catégorie. La liste produits n'est PAS filtrée par la catégorie.

**⚠ DEC-S86-001 (arbitrage dev, 2026-09-12) : catégorie DÉRIVÉE, non surchargeable.** Donc on retient
la position (2e champ), le libellé, le rendu de déclencheur de `Select` avec pastille couleur, et
l'alignement sur le produit — **mais pas la saisie libre** : le champ n'est pas éditable et ne
persiste rien. Aucun changement de DTO/Zod/backend.

## D. Hint de plafond (#646) — la maquette ne fait PAS foi sur le texte

Maquette : `seriesCappedHint` = « Cette série dépasse la limite d'aperçu (4000 occurrences)… », affiché
en mode « Jusqu'à… ». La prod tronque à **5 ans sans date de fin** (#452, S65 ;
`RecurrenceExpansion.java`) — le texte de la maquette est aussi faux que celui de la prod. Suivre
l'énoncé de #646. Rendu du bloc (référence) : `border:1px solid color-mix(in srgb,var(--color-warning)
30%,var(--color-rule)); border-radius:8px; background:color-mix(in srgb,var(--color-warning) 7%,
var(--color-surface)); padding:9px 11px`, glyphe `!` mono 700 `--color-warning`, texte 12px/1.5.
