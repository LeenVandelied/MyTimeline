# #608 — done
- commits: [aa12e4c0]
- resume : frise CONSERVÉE sous md. `ProductSparkline` + props `width`/`height` (défaut 220×40 = drawer inchangé, géométrie recalculée, pas de preserveAspectRatio). Liste : 2 rendus basculés en CSS (64×24 `block md:hidden`, 220×40 `hidden md:block`), un seul dans l'arbre a11y ; th activité visible partout. Pour tenir à 390 : cellules `px-2 sm:px-4`, td frise `px-0` sous sm, titre prochain évt `max-w-20` sous sm (= largeur date), td Produit `max-sm:w-full max-sm:max-w-0` (troncature effective). Handoff §5 : note densité mobile.
- mesures 390 (nom + titre longs) : conteneur 356/356, doc 390 ; colonnes 92/96/64/104 ; nom visible 58 px (~5-7 car.) — prix de 4 colonnes à 390. Avant : table 978 px (débordait déjà sans frise). Frise 220 forcée → 480 > 356 (sonde rouge, mutation source rebuild + auto-contrôle in-spec).
- tests : vitest products 142/142, suite 2060/2060 ; tsc 0 ; lint 0 ; prettier OK. E2E 15 specs listées + neuve : 102/103 puis `sprint-92-products-next-event:239` corrigé (attendait frise masquée à 390 → 1) → 10/10 ; neuve ×3 repeat 9/9. `git status | grep darwin` vide. :3107 rebuild laissé actif.
- [MEMORY:decision] Context : frise liste masquée <md contre handoff. Decision : compacte 64 px sous md, 2 SVG en bascule CSS (pas de hook média → pas de saut d'hydratation). Why : redimensionner le SVG 220 en CSS réduit r=3 à ~0,9 px.
- [MEMORY:pitfall] Context : `sr-only` (absolute) d'une cellule dans un `overflow-x-auto` non positionné échappe au clip → la PAGE défile (doc 1535 px à 1280 avec nom long). Prevention : `relative` sur le conteneur de défilement.
- [MEMORY:pitfall] Context : `POST /api/events` exige `durationValue`+`durationUnit` même pour `single` (sinon 400 validation_failed).
- RECOMMAND_FOLLOWUP: liste produits ≥ sm avec nom long → table déborde (col. Produit 633 px, pas de plafond) + sr-only du compteur fait défiler la page (ajouter `relative` au conteneur) [S | products]
STATUS: COMPLETED
