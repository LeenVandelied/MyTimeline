# Issue #480 — Réserve basse sous le FAB mobile — DONE (agent B)

Commit : `263465ce` (`claude/sprint-start-100-18c4f2`).

## Résumé
- Objectif : le dernier élément des écrans enveloppés par le shell reste visible et cliquable au-dessus du FAB `shell-mobile-new-event-button` sous 768 px.
- `frontend/src/components/layout/AppShell.tsx` : `<main data-testid="shell-main">` porte `max-md:pb-[calc(var(--space-13)+var(--space-6)+var(--space-4)+env(safe-area-inset-bottom))]` = hauteur FAB 52 + offset 24 + respiration 16 + encoche = 92 px sous `md`, 0 au-dessus.
- Choix shell (pas écran par écran) : un seul point de vérité, couvre les 5 écrans (dashboard, timeline, products, products/[id], settings) et les `AppFooter`. Faisable parce que le document défile au niveau fenêtre : shell `min-h-screen`, `<main>` sans `overflow`, frise mobile `.mt-tlm__scroll` en `overflow-y:hidden` (timeline.css:706), `timeline-screen` = `min-h-screen` sans défilement interne. Rien de plein écran à défilement interne en portrait.
- Palier `max-md:` = miroir exact du `md:hidden` du FAB : pas de padding en 768-1023 (sidebar repliée, pas de FAB).
- `AppShell.test.tsx` : +1 test (une seule classe `pb-`, préfixée `max-md:`, 4 tokens présents, aucun `px`).
- `frontend/e2e/sprint-100-fab-clearance.spec.ts` (NON exécutée) : à 390×844 sur 5 écrans (produit seedé puis supprimé en afterEach) — (a) padding calculé > 52 ; (b) plus bas focusable réel dans la fenêtre en largeur : `bottom <= fab.top`, pas d'intersection, `elementFromPoint` au centre le désigne ; (c) sonde bouton pleine largeur ajoutée en fin de `shell-main` : au-dessus du FAB, cliquable au centre ET à l'aplomb du FAB ; (d) TÉMOIN : `padding-bottom:0` forcé → la sonde DOIT croiser le FAB et être masquée (anti-oracle vacant). Desktop 1280 : `paddingBottom === '0px'` et FAB caché sur 4 écrans.

## Tests
- `npx tsc --noEmit -p .` → exit 0, « No errors found ».
- `rtk proxy npx next lint --file AppShell.tsx --file AppShell.test.tsx --file e2e/sprint-100-fab-clearance.spec.ts` → exit 0, « No ESLint warnings or errors » (la version non-proxy affichait `Errors: 1`, faux — PIT-S96-001).
- `./node_modules/.bin/prettier --check` (3 fichiers) → exit 0.
- `npx vitest run src/components/layout/AppShell.test.tsx` → 41 passed / 0 failed.
- `SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3999 npx playwright test e2e/sprint-100-fab-clearance.spec.ts --list` → exit 0, 6 tests de la spec listés (+5 setup). Sans `PLAYWRIGHT_BASE_URL`, `--list` échoue sur `assertWebServerEnv` (playwright.config.ts:59) — la recette du briefing est incomplète.

## Écarts d'énoncé
- Seuil `md` (768), pas `lg` (1024) : FAB `md:hidden` depuis #298 (AppShell.tsx, commentaire #455). Réserve en `max-md:`.
- « Le dashboard a un `AppFooter` donc non concerné » : faux, `AppFooter` est aussi rendu par settings, products, products/[id] ; et un footer peut lui-même passer sous le FAB. Réserve appliquée aux 5 écrans ; dashboard inclus dans la spec.
- Spec étendue à `products/[productId]` (5e écran enveloppé).

## Non vérifié
- Aucune exécution navigateur : la spec n'a pas tourné, le rendu réel de la classe arbitraire Tailwind (émission CSS) n'est vérifié que par la chaîne (jsdom).
- Oracle (b) « élément réel » : peut être non armé quand le dernier focusable est loin du bas (ex. état vide centré de la frise) ; le témoin (d) porte la preuve via la sonde. Oracle (b) peut aussi rougir à tort si le plus bas focusable retenu est partiellement couvert par autre chose que le FAB (header sticky, toast) — à diagnostiquer au premier run.
- Mobile paysage (740×390) : `dashboard-landscape` a un conteneur `overflow-y-auto` ; non mesuré si un défilement interne y existe réellement (auquel cas la réserve de `main` n'y servirait pas).
- `settings` mobile (`MobileSettings` drill-down) : dernier élément réel non inspecté à la main.
- Régression des specs géométriques voisines non rejouée (voir recommandations).
- `env(safe-area-inset-bottom)` vaut 0 dans Chromium : la part encoche n'est testée par aucun oracle.

## Signaux mémoire
- [MEMORY:pitfall] Contexte : `npx playwright test <spec> --list` sans serveur lève `assertWebServerEnv` (playwright.config.ts:59) même avec `SKIP_DELEGATION=1`. Solution : poser `PLAYWRIGHT_BASE_URL=http://localhost:<port-quelconque>` pour `--list` (aucun serveur démarré). Prévention : corriger la recette de listage dans le gabarit de briefing.
- [MEMORY:pattern] Problème : prouver qu'un élément `fixed` ne recouvre pas « le dernier élément » sans dépendre du volume de données. Solution : sonde pleine largeur ajoutée en fin de conteneur + témoin qui neutralise la réserve et exige le recouvrement ; mesurer `elementFromPoint` au milieu de la bande verticale commune (le centre de la sonde peut tomber sous le bas du FAB). Anti-pattern : ne tester que le dernier focusable réel (vacant sur écrans vides/centrés).

## Recommandations suite
- Pas de RECOMMAND_DB_EXPERT : aucun schéma ni requête touché.
- Pas de RECOMMAND_SECURITY : changement purement CSS/tests, aucune surface d'auth ou de données.
- Pas de RECOMMAND_UI_DESIGN : réserve dérivée des tokens existants du FAB, aucun nouveau visuel.
- Pas de RECOMMAND_TEST_RUNNER : traité par le lead (spec #480 + 9 specs mobiles 69/69 sous next dev, armement 5 rouges sans la réserve, suite complète 495 verts sous next build — audits/sprint-100-test-coverage.md)
  Specs demandées par l'agent (toutes rejouées) : settings-mobile, sprint-66-mobile-create-event, sprint-66-mobile-keyboard, sprint-95-toast-overlap, sprint-96-palette-geometry, sprint-85-timeline-toolbar, sprint-62-select-focus-indicator, sprint-92-business-toasts, sprint-73-tablet-sidebar.
- RECOMMAND_FOLLOWUP: vérifier le défilement interne de `dashboard-landscape` (740×390) sous le FAB [triage XS]

fichiers de contexte lus: frontend/src/components/layout/AppShell.tsx (l.232 shell min-h-screen, l.362 main, l.381-390 FAB) ; frontend/src/components/layout/AppShell.test.tsx (l.450-570) ; frontend/src/styles/ds/tokens/spacing.css (l.15 --space-6, l.19 --space-13) ; frontend/src/styles/globals.css (l.173) ; frontend/src/styles/ds/components/timeline.css (l.674, l.706) ; app/[locale]/(app)/timeline/page.tsx (l.50-114) ; app/[locale]/(app)/dashboard/page.tsx (l.120-262) ; app/[locale]/(app)/settings/page.tsx (l.40-60) ; e2e/sprint-66-mobile-create-event.spec.ts (l.1-125) ; e2e/sprint-86-form-drawer-modal.spec.ts (l.20-100) ; e2e/support/products.ts (l.140-160) ; frontend/playwright.config.ts (l.1-50) ; .ai-env/context-packs/pit-frontend.md (grep FAB/safe-area/shell-main/100dvh/md:hidden : 0 entrée pertinente ; PIT-S54-003, PIT-S94-004, PIT-S96-001, PIT-S99-002/003 via extrait du briefing) ; docs/memory/sprints/sprint-100/briefing-480.md NON LU (prompt identique)

STATUS: COMPLETED
