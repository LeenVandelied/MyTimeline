# Issue #758 — FAB et fin du tableau de bord en paysage mobile — DONE (agent C)

Commit : `fd9da74e` (`claude/sprint-101-start-9b245c`), `:white_check_mark: test(ui)` — spec seule, AUCUN code de production.

## Résumé
- Verdict : **pas de recouvrement**. Prémisse de l'issue (grille `overflow-y-auto` = scrollport interne borné) RÉFUTÉE par la mesure.
- Cause : la racine `dashboard` est `min-h-screen` (plancher, pas plafond) et `dashboard-landscape` est un `flex-1` dans une colonne non bornée → sa hauteur suit le contenu, la grille a `scrollHeight === clientHeight`, c'est le DOCUMENT qui défile. La réserve `max-md:pb-[…]` de `shell-main` (92 px) s'applique donc ; en plus, `AppFooter` s'intercale entre les colonnes et le FAB.
- Spec `frontend/e2e/sprint-101-fab-landscape.spec.ts` : verrou de structure (grille sans débordement interne, document qui défile, 0 débordement X), éléments réels, sondes de fin de colonne positionnées au pire cas atteignable, témoin armé ; 844×390 = FAB non peint.

## Mesures
Viewport 740×390 (FAB top 314 / bottom 366 / left 672 / right 724) :
- Grille : scrollHeight 417 / clientHeight 417, scrollWidth 676 / clientWidth 676, scrollLeft 0. Document : scrollHeight 655 > 390, scrollWidth 740 = clientWidth. `shell-main` padding-bottom 92px.
- Fenêtre en bas (scrollY 265) : colonnes bottom 193.2 ; `AppFooter` 209.2→297.8 ; plus bas focusable de `shell-main` (lien du pied) bottom 281.8 → marge 32 px sous le FAB top. Fin colonne gauche (dernière rangée d'agenda) bottom −16 (déjà sortie par le haut).
- Sonde fin colonne droite, remontée au ras du FAB : 269.2→313.2 (≤ 314), `elementFromPoint` au centre ET à l'aplomb du FAB = sonde. Sonde colonne gauche : bornée par scrollY=0, max bottom 292.9.
- TÉMOIN (padding shell-main 0 + footer masqué) : sonde droite 330.2→374.2 ∩ FAB 314→366 = intersection 36 px, masquée par le FAB → oracle non vacant.
Viewport 667×375 (FAB 299→351, 599→651) :
- Grille 441/441, 603/603 ; document 678 > 375 ; pied bas focusable bottom 267.3 (marge 32 px).
- Sonde droite au ras : 254.7→298.7 (≤ 299), cliquable centre + aplomb. TÉMOIN : 314.7→358.7 ∩ FAB = intersection 36 px.
Armement du verrou de structure : `height:100vh` injecté sur `dashboard` → grille 417 > 244 (740) et 441 > 229 (667) → 2 rouges attendus sur l'assertion « la grille ne doit pas défiler en interne ».
844×390 : ≥ 768 ⇒ FAB `md:hidden` non peint (asserté `toBeHidden`), profil `dashboard-landscape` quand même rendu.

## Fichiers
- `frontend/e2e/sprint-101-fab-landscape.spec.ts` (nouveau, 425 l.). Aucun fichier de production touché. Spec d'exploration `e2e/zz-lead-758-explore.spec.ts` et d'armement `e2e/zz-lead-758-arm.spec.ts` créées puis supprimées (jamais committées).

## Tests
- Oracles harnais : `/api/auth/me` 401, `/fr/login` 200.
- `sprint-101-fab-landscape.spec.ts` : 8 passed ×3 runs consécutifs (sleep 15 entre runs) — dont 3 tests chromium + 5 setup.
- Armement (copie jetable avec `height:100vh`) : 2 failed attendus / 6 passed.
- `sprint-100-fab-clearance.spec.ts` : 11 passed.
- `vitest run` complet : 154 fichiers / 1975 tests passed. `tsc --noEmit` exit 0. `next lint --file` spec : 0 warning. `prettier --check` : OK.
- Non rejoué : les autres specs de la liste du briefing — aucun code de production modifié (conforme briefing). Dernière retouche (2 lignes de commentaire d'en-tête) faite après le dernier run Playwright ; prettier/structure revérifiés, pas de rerun E2E.

## Écarts d'énoncé
- Prémisse lead « `dashboard-landscape` borné au viewport → scrollport interne » : fausse ; `min-h-screen` ≠ `h-screen`, le conteneur `overflow-hidden` + grille `overflow-y-auto` n'ont aucun effet de défilement tant que rien ne borne la hauteur.
- « Dernier élément / dernier focusable de CHAQUE colonne » : la colonne agenda n'a aucun focusable quand il y a des événements (rangées `<li>` non interactives) → oracle remplacé par « plus bas élément peint » + focusable optionnel.
- En bas de page, la fin des colonnes est au-dessus de la fenêtre (le pied + réserve dessous) : `elementFromPoint` n'est vérifiable qu'une fois la sonde replacée ; ajouté un pas « remonter la fenêtre jusqu'au ras du FAB » (borné par scrollY=0).
- Commentaire de `page.tsx` (#85) : « largeur > 667px » ; la media query réelle ne teste pas la largeur (`(orientation: landscape) and (max-height: 500px)`) — 667×375 est bien paysage. Non corrigé (hors périmètre).

## Signaux mémoire
- [MEMORY:pitfall] Contexte : un `overflow-y-auto` dans le code ne prouve pas un scrollport interne ; il faut une hauteur bornée par un ancêtre (`h-screen`, pas `min-h-screen`). Solution : mesurer `scrollHeight` vs `clientHeight` du conteneur avant de raisonner. Prévention : toute prémisse « défilement interne » cite une mesure, pas une classe.
- [MEMORY:pattern] Problème : une spec de dégagement qui conclut « pas de défaut » doit verrouiller la CAUSE de l'absence. Solution : asserter la structure (grille non défilante) ET armer ce verrou en injectant le changement hypothétique (`height:100vh`) → rouge. Anti-pattern : verdict négatif sans oracle qui rougirait si la structure changeait.
- [MEMORY:pitfall] Contexte : sonde en fin de colonne mesurée page défilée en bas → hors fenêtre, `elementFromPoint` faux négatif. Solution : remonter la fenêtre de `fab.top − probe.bottom` (borné à 0) puis mesurer.

## Recommandations suite
- Pas de RECOMMAND_DB_EXPERT : aucun schéma ni requête touché.
- Pas de RECOMMAND_SECURITY : spec E2E seule, aucune surface auth/données.
- Pas de RECOMMAND_TEST_RUNNER : spec rejouée 3× verte + armement + S100 verte, aucun code de production changé.
- Pas de RECOMMAND_UI_DESIGN : aucun visuel modifié.
- RECOMMAND_FOLLOWUP (optionnel, XS) : corriger le commentaire #85 de `dashboard/page.tsx` (« largeur > 667px » absent de la media query).

## Texte proposé pour le commentaire de fermeture de l'issue
Mesure faite (Sprint 101, spec `frontend/e2e/sprint-101-fab-landscape.spec.ts`) : **aucun recouvrement**. En paysage mobile (740×390 et 667×375), la zone `overflow-y-auto` du tableau de bord ne défile pas en interne (hauteur de contenu = hauteur visible : 417/417 et 441/441 px) parce que rien ne borne sa hauteur (la page est `min-h-screen`) : c'est la page entière qui défile, donc la réserve de 92 px posée par #480 sous le contenu s'applique bien. Page défilée en bas, le dernier lien (pied de page) finit 32 px au-dessus du bouton flottant ; une sonde placée en fin de chaque colonne reste au-dessus du bouton et cliquable, y compris à son aplomb. Contrôle négatif : sans la réserve ni le pied, la sonde passe sous le bouton (36 px de recouvrement) — la mesure sait donc voir le défaut. La spec verrouille aussi la cause : si la page devenait bornée à la hauteur de l'écran (défilement interne), elle rougirait (vérifié). À 844×390 (≥ 768 px) le bouton flottant n'est pas affiché. Aucun code de production modifié. Fermeture.

fichiers de contexte lus: docs/memory/sprints/sprint-101/briefing-C-758.md ; gh issue 758 ; frontend/e2e/sprint-100-fab-clearance.spec.ts ; docs/memory/patterns.md (PAT-S100-001) ; docs/memory/sprints/sprint-100/issue-480-done.md ; frontend/app/[locale]/(app)/dashboard/page.tsx (l.1-280) ; frontend/src/components/layout/AppShell.tsx (l.225-240, 355-400) ; frontend/e2e/support/products.ts (l.35-170) ; frontend/e2e/support/fixtures.ts ; frontend/e2e/support/dev-tooling.ts (l.1-40) ; frontend/src/components/dashboard/CompactAgenda.tsx (l.40-70) ; grep data-testid CompactAgenda/ProductCarousel/DensityRibbon

STATUS: COMPLETED
