# Revue `ui-design` — Sprint 86 (formulaire d'événement)

> Spawnée par le lead le 2026-09-12 sur le diff `d786219...HEAD` (commits `e9a8b6c`, `a517344`, `566997d`).
> Source de vérité : `maquette-formulaire-evenement.md` + DEC-S86-001.
> **⚠ Les numéros de ligne rendus par l'agent sont inexploitables** (ex. `EventFormDrawer.tsx:441` pour un fichier de
> 212 lignes — vraisemblablement des offsets de diff) : ils sont omis ci-dessous. Seuls les constats sont repris.

**Décompte : 11 CONFORME / 4 ÉCART acceptable / 0 ÉCART à corriger / 3 INDÉTERMINÉ**

## CONFORME
- Largeur uniquement via `--drawer-width-form` ; aucun px de largeur en dur (garde de test `not.toMatch(/w-\[\d+px\]/)`).
- Nouvelles règles CSS 100 % tokens, zéro hex ; tokens consommés définis en clair ET sombre (`colors.css`).
- Structure en-tête / aperçu épinglé / corps défilant / pied : une seule implémentation, identique création/édition (§A).
- Seuil `< 1024 px` identique dans les deux modes : c'est l'unification exigée, pas un écart.
- Pastille de catégorie : couleur `null` → aucun style inline, contour neutre `--color-rule-strong` (DEC-S85-006).
- Valeur de catégorie en `--color-ink`, libellé en `--color-ink-muted` (DEC-S85-007 respectée).
- Pas de chevron sur le champ lecture seule : évite une affordance trompeuse.
- Filet Catégorie/Produit = règle `.mt-drawer__field` existante, réutilisée.
- a11y : `role="group"` + `aria-labelledby`, zéro élément focalisable (test dédié, PIT-S62-008).
- Propriétés logiques sur toutes les nouvelles règles (DEC-S82-011).
- i18n : `eventCategory.{label,noProduct,unknown}` dans les 4 locales, zéro chaîne en dur.

## ÉCART acceptable (aucune correction)
1. Titre d'édition « Modifier l'événement » (maquette « Éditer ») — clé i18n préexistante.
2. Ligne « CRÉÉ LE · id » omise : `PositionedEvent` ne porte aucune date de création → follow-up (déjà signalé dans `issue-618-done.md`).
3. Animation `--dur-base` 200 ms au lieu de 240 ms — easing identique `cubic-bezier(.32,.72,0,1)`, dans la plage charte
   (120-280 ms) ; aucun token à 240 ms n'existe (`--dur-slow` = 280 ms).
4. Valeur Catégorie 36 px au lieu de 44 px — alignée sur le `Select` Produit réel voisin (36 px).

## INDÉTERMINÉ (navigateur requis)
- Géométrie peinte (452 px effectifs), animation perçue, contraste mesuré de `.mt-drawer__readonly-text` en thème sombre.
- Pied d'édition (Supprimer à gauche, `--color-danger`) : porté par `EventEditForm.tsx`, hors diff.
- Convention exacte des testids `*-category` / `*-category-swatch` vs `.claude/rules-jit/e2e-selectors.md` (non relu).

## Résolution par le lead (2026-09-12)
- **Contraste — tranché par calcul sur les tokens** (`tokens/colors.css`, WCAG 2.x, pas une mesure peinte) :
  valeur `--color-ink`/`--color-surface` = **17,76:1 clair / 15,60:1 sombre** ; état vide `--color-ink-muted`/`--color-surface`
  = **6,11:1 clair / 5,85:1 sombre** → AA texte normal (≥ 4,5) dans les deux thèmes. Reste non mesuré : le rendu réel (surcouche,
  opacité héritée éventuelle).
- **Convention de testids — sans objet** : `.claude/rules-jit/e2e-selectors.md` n'existe pas dans le dépôt. Les testids neufs
  prolongent les préfixes existants (`timeline-edit-dialog-*`, `shell-new-event-drawer-*`) et sont tous cités par une spec
  (contrôle coverage-E2E du lead : 0 manquant).
- Reste INDÉTERMINÉ : géométrie peinte (452 px effectifs) et animation perçue — la vérification navigateur du lead est
  impossible sans session authentifiée ; la suite E2E (dont `sprint-70-create-preview-pinned`, `sprint-71-edit-preview-pinned`,
  qui mesurent des boîtes réelles) sert de preuve indirecte.

## Recommandations de l'agent
- Si plusieurs maquettes demandent 240 ms pour les drawers, envisager un token `--dur-drawer` plutôt que répéter l'écart.
- Mesurer en navigateur le contraste de la valeur lecture seule en sombre (non bloquant).
