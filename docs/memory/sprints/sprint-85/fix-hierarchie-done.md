## Résumé

Correctif de revue (suite #601) : `.mt-tlv__lane-label` (en-tête de lane produit)
partageait `surface-2` + `--weight-semibold` (600) avec `.mt-tlv__group-cell`
(en-tête de catégorie) → les deux niveaux étaient visuellement identiques.
Conforme à la maquette §B-bis (`docs/memory/sprints/sprint-85/maquette-vue-timeline.md`) :

- `.mt-tlv__lane-label` : `background:var(--color-surface)` (au lieu de `surface-2`),
  `font-weight:var(--weight-medium)` (500, au lieu de 600).
- `.mt-tlv__lane-head` : `padding-left` porté de 8px à 33px pour aligner le
  chevron d'accordéon de lane (#195) sous la pastille de l'en-tête de catégorie.
- `.mt-tlv__ruler::before` (gouttière de la règle) : NON touché, conforme au
  périmètre. Écart visuel : la gouttière reste `surface-2` alors que la maquette
  la pose en `surface` — pas d'écart flagrant constaté à l'écran (contraste
  faible entre `surface`/`surface-2` dans les deux thèmes, cf. mesures), non
  traité, hors scope de ce correctif.
- `.mt-tlm__lane-label`/`.mt-tlm__group-*` (mobile portrait/landscape) : classes
  SÉPARÉES (`mt-tlm` ≠ `mt-tlv`), non touchées — hors du périmètre du briefing
  (qui cite explicitement `frontend/src/styles/ds/components/timeline.css:246-252`,
  bloc `mt-tlv`). Non vérifié si le même défaut de hiérarchie existe côté mobile.
- Grep confirmé : aucun autre sélecteur/composant ne consomme `.mt-tlv__lane-label`
  en attendant un fond `surface-2`.

## Mesures (navigateur réel, harnais :3100, getComputedStyle)

- Alignement chevron-de-lane / pastille-de-catégorie : `padding-left:33px`
  mesuré et validé par assertion E2E (`Math.abs(chevBox.x - swatchBox.x) <= 1`,
  passe à 33px, formule papier 12+13+8=33 confirmée par la mesure).
- Fond clair : lane `rgb(255,255,255)` (`--color-surface`) vs catégorie
  `rgb(243,244,246)` (`--color-surface-2`) → contraste WCAG ≈ 1.10:1,
  delta de luminance relative ≈ 0.096.
- Fond sombre : lane `rgb(19,21,25)` vs catégorie `rgb(27,30,36)` → contraste
  WCAG ≈ 1.09:1, delta de luminance relative ≈ 0.0054 (valeurs absolues proches
  de 0 côté sombre, ratio équivalent au clair — distinction visuelle subsiste
  dans les deux thèmes, pas d'inversion ni de collapse).
- `font-weight` : lane 500 / catégorie 600 dans les deux thèmes (assertion E2E).

Fiche produit non vérifiée visuellement en direct (pas de session navigateur
authentifiée montée pour cet écran) : inférence par le code — `ProductDetailView.tsx`
rend `TimelineView` (même composant, mêmes classes CSS `mt-tlv__*`), donc le
correctif CSS s'applique identiquement sans logique spécifique à la page.
Dashboard : couvert par la relecture de `timeline.spec.ts` (accordéon #304,
en-tête sticky #392), même composant partagé.

## Tests

- `sprint-85-timeline-group-head.spec.ts` : 14/14 passés (dont le nouveau test
  « correctif hiérarchie : cellule de lane ≠ en-tête de catégorie »). Contrôle
  négatif fait manuellement en local (retour à `surface-2` sur `.mt-tlv__lane-label`
  → assertion `fond lane ≠ fond catégorie` rouge comme attendu), puis annulé
  avant commit.
- `sprint-63-de-overflow-audit.spec.ts` : 21/22 puis 22/22 au rejeu isolé — le
  seul rouge (`timeline · en · 12 largeurs`) était une purge post-test HS
  (catégorie poubelle → 500 côté backend e2e), pas une assertion de layout ;
  confirmé passant seul en isolation.
- `timeline.spec.ts` : 36/36 passés (accordéon lane #304, sticky lane header
  #392, zoom, drawers).
- Vitest : pas de test unitaire ajouté — jsdom ne calcule pas les styles d'une
  feuille CSS externe (aurait été un test vacant, cf. PIT-S51 dans la mémoire
  projet).
- Gates : `npm test` 1511/1511 (127 fichiers) · `npm run typecheck` propre ·
  `npm run lint` propre · `npm run format:check` propre (1 fichier reformaté
  par prettier après ajout du test, revalidé).

## Signaux mémoire

[MEMORY:pattern] Problem: aligner un élément flex sur un autre dans une cellule
sticky voisine (chevron de lane vs pastille de catégorie) sans casser au
prochain changement de gap/padding. Solution: mesurer `boundingBox().x` des deux
éléments au navigateur réel et figer l'écart en assertion E2E
(`Math.abs(a.x - b.x) <= 1`), pas seulement calculer sur le papier — le calcul
papier (12+13+8=33) s'est avéré exact ici mais l'assertion E2E est ce qui le
garantit dans la durée. Anti-pattern: fixer une valeur de padding sans test qui
la vérifie au pixel réel.

## Recommandations suite

Pas de RECOMMAND_DB_EXPERT car aucun changement de schéma/donnée, correctif CSS pur.
Pas de RECOMMAND_SECURITY car aucune surface d'auth/donnée personnelle/API externe touchée.
Pas de RECOMMAND_UI_DESIGN car le point est tranché par la maquette §B-bis, déjà lue et appliquée à la lettre.
Pas de RECOMMAND_TEST_RUNNER car les 3 specs demandées ont été rejouées ici avec comptage réel (14+22+36 tests).

STATUS: COMPLETED
