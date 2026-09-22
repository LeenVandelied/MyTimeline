# Issue #682 — CTA du hero sur une ligne entre 1024 et 1279 px (Sprint 104, vague 3)

## Objectif
Les deux CTA du hero suivent la taille `lg` du DS Graphite (maquette : `Button variant="accent" size="lg"`, ~46 px) au lieu de l'ancien gabarit `px-8 py-6 text-lg`, qui repliait « Commencer gratuitement » entre 1024 et 1279 px en `fr`.

## Fichiers modifiés
- `frontend/src/components/landing/HeroSection.tsx` : classes des 2 CTA, flèche `h-4 w-4` sans `ml-2`, paragraphe #682 dans le docblock.
- `frontend/e2e/sprint-104-hero-cta-single-line.spec.ts` (nouveau) : 16 cas (4 largeurs × 4 locales) + 1 auto-contrôle.

## Décisions et écarts
- **Métrique retenue = DS, pas shadcn.** `ui/button.tsx` `size lg` = `h-10` fixe (40 px), qui couperait un libellé replié. Métrique DS : `core.css:25` `.mt-btn--lg{padding:12px 22px;font-size:14px}` et `i18n.css:82` `.mt-btn--wrap.mt-btn--lg{min-height:46px}`. Transcrite en utilitaires : `min-h-[46px] px-[22px] py-3 text-[14px] leading-snug`.
- **Pourquoi pas les classes DS `mt-btn--*`** : elles supposent la base `.mt-btn`. `ds/components/core.css` est importé HORS layer (`globals.css:26`), donc `.mt-btn--accent` écraserait les utilitaires de couleur et de survol posés par le hero et verrouillés par `landing.hover-pairing.test.ts` / `landing-cta-contrast`. Aucun `.tsx` du dépôt n'emploie `mt-btn` (vérifié par grep) : on n'introduit pas un 2e système de bouton dans le hero.
- **Tokens** : `py-3` = `--space-3` (12 px). 22 px et 14 px n'ont pas de token (le DS les écrit en dur dans `.mt-btn--lg`), d'où les valeurs arbitraires. Interligne `leading-snug` (1.28, token) plutôt que le 1.18 de `.mt-btn--wrap` : l'écart n'apparaît qu'en cas de repli, la hauteur minimale de 46 px domine sur une ligne (14 × 1.28 + 24 = 41,9 < 46).
- **Rayon** : `rounded-lg` (10 px) retiré, le variant pose `rounded-md` = `--radius-md` (7 px), celui de `.mt-btn`. Écart visuel volontaire (conformité maquette).
- **Flèche** : `h-5 w-5` était déjà INERTE : `[&_svg]:size-4` du variant (sélecteur descendant, spécificité supérieure) l'emportait — déduit de la spécificité, NON mesuré sur l'ancien rendu. Passée à `h-4 w-4` (≈ 1.05em de `.mt-btn svg` à 14 px) pour que la classe dise la vérité. `ml-2` retiré : le `gap-2` du variant espace déjà de 8 px (`.mt-btn` : `gap:8px`) ; les deux cumulés donnaient 16 px.
- **CTA secondaire** aligné aussi (cohérence de rangée, et il se repliait AUSSI : 2 lignes en `fr` et `de` à 1024-1280 avant).
- **Filet conservé** : `whitespace-normal` + `min-w-min` + `h-auto` (garde-fou `HeroSection.flex-min-size.test.tsx` vert). Cible tactile : 46 px ≥ 44 à toute largeur (le `min-h` n'est pas conditionné à `lg`).
- **Colonne hero non élargie** : bornes #610 intactes ; plus aucune locale ne se replie, rien à proposer.
- **Constat sur l'énoncé** : l'issue annonçait « 3 lignes » à 1024 `fr` ; la mesure par rectangles de texte en compte **2** de 42 px (132 = 48 de padding + 2 × 42). La hauteur 396 × 132 est, elle, exacte.
- **`landing-typography-hierarchy`** ne cible aucun CTA (grep `cta|button` : seulement un renvoi en commentaire vers `landing-cta-contrast`) : le verrou #348 porte sur `h1` et le sous-titre.

## Tests
Depuis `frontend/`, harnais du lead (`:3000` webpack, backend `:8088`), oracles avant runs : `/api/auth/me` 401, `/fr/login` 200.

### Mesures AVANT / APRÈS (Chromium darwin, `largeur × hauteur` px, lignes de libellé)
| Largeur | Locale | Primaire avant | Primaire après | Secondaire avant | Secondaire après |
|---|---|---|---|---|---|
| 1024 | fr | 396 × 132 (2 l.) | 229 × 46 (1) | 396 × 134 (2 l.) | 238,7 × 46 (1) |
| 1024 | en | 245 × 90 (1) | 145,3 × 46 (1) | 329,1 × 92 (1) | 182,4 × 46 (1) |
| 1024 | es | 295,4 × 90 (1) | 171,4 × 46 (1) | 370,1 × 92 (1) | 203,7 × 46 (1) |
| 1024 | de | 309,1 × 90 (1) | 178,5 × 46 (1) | 396 × 134 (2 l.) | 257,7 × 46 (1) |
| 1152 | fr | 396 × 132 (2 l.) | 229 × 46 (1) | 396 × 134 (2 l.) | 238,7 × 46 (1) |
| 1152 | en / es / de | identiques à 1024 | identiques à 1024 | identiques à 1024 | identiques à 1024 |
| 1279 | fr | 396 × 132 (2 l.) | 229 × 46 (1) | 396 × 134 (2 l.) | 238,7 × 46 (1) |
| 1279 | en / es / de | identiques à 1024 | identiques à 1024 | identiques à 1024 | identiques à 1024 |
| 1280 | fr | 406,4 × 90 (1) | 229 × 46 (1) | 420 × 134 (2 l.) | 238,7 × 46 (1) |
| 1280 | de | 309,1 × 90 (1) | 178,5 × 46 (1) | 420 × 134 (2 l.) | 257,7 × 46 (1) |
| 1280 | en / es | identiques à 1024 | identiques à 1024 | identiques à 1024 | identiques à 1024 |

Aucun débordement de colonne ni défilement horizontal, avant comme après. Mesures macOS (PIT-S52-001) : les largeurs exactes peuvent différer sous jammy ; la marge (257,7 px max pour ≥ 396 px de colonne) absorbe l'écart.

### Commandes
- `SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 rtk proxy npx playwright test e2e/sprint-104-hero-cta-single-line.spec.ts --ignore-snapshots --reporter=line --project=chromium` → avant : 16 échecs / 6 verts (les 16 cas échouent, hauteur 90-134 > 50 ; les 6 verts = 5 tests du projet `setup` + la 1re version de l'auto-contrôle) ; après : **22 passés / 0 échec**.
- Rejeu groupé des 13 specs du briefing + la mienne (chromium + firefox) → **198 passés / 0 échec (4,6 min)**. `sprint-63-de-overflow-audit` vert cette fois.
- `rtk proxy npx vitest run src/components/landing/HeroSection.test.tsx src/components/landing/HeroSection.flex-min-size.test.tsx src/components/landing/CtaSection.test.tsx src/components/landing/landing.hover-pairing.test.ts` → 4 fichiers, **20 passés**.
- `rtk proxy npx tsc --noEmit` → exit 0. `rtk proxy npx next lint --file …HeroSection.tsx --file …spec.ts` → 0 avertissement. `rtk proxy npx prettier --check` → exit 0.
- `git status | grep darwin` → vide. Aucune référence `toHaveScreenshot` régénérée ; `sprint-77-theme-visual` NON rejouée : les références `landing-hero-*-chromium-linux.png` changent par construction (lead, image Linux).

### Contrôle négatif
1. **Source** : classes rétablies à `rounded-lg px-8 py-6 text-lg` dans `HeroSection.tsx`, spec filtrée `-g "1024 px"` → **4 échecs / 10** (les 4 locales à 1024 : hauteur 90-132 > 50 ; `fr` aussi sur le nombre de lignes). Source restaurée, re-vérifiée par grep.
2. **Auto-contrôle intégré** (test « l'ancien gabarit réinjecté ») : reproduit exactement l'état d'avant, 396 × 132, 2 lignes. Première version rouge pour une MAUVAISE raison : `transition-all` fait transiter `padding` et `font-size`, la mesure immédiate relisait 12/22 px et 14 px (diagnostiqué par `getComputedStyle` sur une spec jetable `zz-lead-682-debug`, supprimée). Corrigé par `transition: none` posé avant la mutation.

## Signaux mémoire
- `[MEMORY:pitfall] Context: auto-contrôle E2E qui mute padding/font-size d'un élément portant transition-all (CTA du hero). Solution: poser transition:none !important AVANT la mutation, sinon getComputedStyle et getBoundingClientRect relisent les valeurs de départ de la transition (la feuille injectée semblait « sans effet »). Prevention: extension de PIT-S58-002 au-delà des couleurs — toute mutation de géométrie sur un élément transition-all doit couper la transition ou attendre sa fin.`
- `[MEMORY:pitfall] Context: <Button> shadcn avec className "h-5 w-5" sur une icône enfant. Solution: la variante [&_svg]:size-4 du cva (sélecteur descendant, spécificité 0,1,1) bat h-5/w-5 (0,1,0) ; l'icône restait à 16 px malgré la classe (déduit, non mesuré). Prevention: pour dimensionner une icône dans un Button, surcharger la variante [&_svg]:size-* sur le bouton, pas la classe de l'icône.`

## Recommandations suite
- `RECOMMAND_FOLLOWUP: régénérer les références landing-hero-*-chromium-linux.png (sprint-77-theme-visual) sur l'image Linux — CTA passés de ~90 à 46 px, rayon 10 → 7 px.`
- `RECOMMAND_FOLLOWUP: CtaSection (bandeau final) et HeaderSection portent-ils le même gabarit hors DS ? non audité ici (hors périmètre).`
- Pas de RECOMMAND_DB_EXPERT : changement purement CSS frontend, aucune donnée.
- Pas de RECOMMAND_SECURITY : aucune surface auth, donnée ou API touchée.
- Pas de RECOMMAND_TEST_RUNNER : specs ciblées + rejeu des 13 specs du briefing exécutés par l'agent (198/198).
- Pas de RECOMMAND_UI_DESIGN : métrique reprise telle quelle de `.mt-btn--lg` / `.mt-btn--wrap.mt-btn--lg` du DS, arbitrage déjà fait par le lead.

## Fichiers de contexte lus
- `docs/memory/sprints/sprint-104/briefing-682.md` — extrait pit-frontend S104 (PIT-S58-002, S77-019, S100-001, S103-001..004) et index §2 (S48-005, S49-001, S49-002).
- `docs/memory/sprints/sprint-104/issue-614-done.md` — NON LU (hors surface CTA ; seule sa présence dans la liste du répertoire vérifiée).
- `docs/memory/sprints/sprint-104/architect-plans.md` — l.47-51 `issue_682` / `issue_425`.
- `docs/memory/sprints/sprint-87/issue-610-done.md` — « Décisions et écarts » (bornes 300/420, observation 396 × 132).
- `.ai-env/context-packs/pit-frontend.md` — l.1818-1832 (index S48-005, S49-001, S49-002, S52-001).
- `frontend/src/components/ui/button.tsx` — cva `size lg = h-10 rounded-md px-8`, base `[&_svg]:size-4`.
- `frontend/src/styles/ds/components/core.css` — l.16-40 `.mt-btn`, `.mt-btn--lg`.
- `frontend/src/styles/ds/components/i18n.css` — l.73-83 `.mt-btn--wrap`.
- `frontend/src/styles/ds/tokens/typography.css`, `spacing.css` — échelle 13…57, `--space-3`=12, `--radius-md`=7.
- `frontend/src/styles/globals.css` — l.16-31 imports DS hors layer, l.123-175 `@theme`.
- `frontend/src/styles/animations.css` — l.59-86 `.cta-button`.
- `frontend/src/components/landing/HeroSection.flex-min-size.test.tsx` — intégral.
- `frontend/e2e/support/contrast.ts` — l.503-511 `LANDING_CTA`.
- `frontend/e2e/sprint-104-landing-container.spec.ts` — modèle de spec (auto-contrôle par feuille injectée).
- `gh issue view 682` — corps de l'issue.

STATUS: COMPLETED
