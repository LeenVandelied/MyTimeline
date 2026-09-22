# Issue #455 — Création d'événement injoignable sous 1024 px (Sprint 66)

## Résumé

Cause exacte confirmée sur le code : `setShowCreate(true)` n'avait qu'un appelant,
`AppShell.tsx:152`, à l'intérieur de l'`<aside className="… hidden … lg:flex">`
(`:139`). Sous le palier `lg` cet aside n'est pas peint, et aucun écran du groupe
`(app)` ne portait de substitut (seul le dashboard a une chrome mobile ;
`timeline`, `products`, `settings` n'en ont aucune) → la création d'événement était
inatteignable en mobile et tablette portrait.

Correctif conforme à la spec Designer, appliquée telle quelle :

- `frontend/src/components/layout/AppShell.tsx` — ajout d'un `<button type="button">`
  flottant rendu `lg:hidden`, HORS de l'`<aside>`, placé après `<main>` :
  `h-13 w-13` (52 px, token `--space-13` exposé en `--spacing-13` dans
  `globals.css:173` → au-dessus du minimum WCAG 2.5.5 de 44 px), `rounded-xl`
  (`--radius-xl`, pas de pill), `bg-primary` + `text-primary-foreground`,
  `shadow-lg`, `transition-colors`, `fixed right-4`,
  `bottom-[calc(var(--space-6)+env(safe-area-inset-bottom))]`, `z-10`
  (= `--z-sticky` 10 < `--z-modal` 70 : l'overlay de la sheet recouvre le FAB).
  A11y : `aria-label={t('newEvent')}` (clé i18n EXISTANTE `shell.newEvent`, aucune
  clé ajoutée), `aria-haspopup="dialog"`, `<Plus className="h-5 w-5" aria-hidden>`.
  `data-testid="shell-mobile-new-event-button"`.
- Câblage : `onClick={() => setShowCreate(true)}` — le MÊME état que le bouton
  desktop (`AppShell.tsx:87`). Aucun second état, aucun second `NewEventDrawer`, le
  montage conditionnel `{showCreate && <NewEventDrawer …/>}` est INCHANGÉ (purge
  d'état à la fermeture, revue PR #313). `NewEventDrawer` bascule seul en `.mt-sheet`
  sous 1024 px : ce fichier n'a pas été touché (réservé à #79, Vague 2).
- `shell-sidebar-new-event-button` INCHANGÉ (aucune ligne modifiée sur ce bouton).
- `frontend/src/components/layout/AppShell.test.tsx` — 6 tests RTL (cf. Tests).
- `frontend/e2e/sprint-66-mobile-create-event.spec.ts` — nouvelle spec, 3 tests.
- `frontend/e2e/sprint-62-select-focus-indicator.spec.ts` — **commentaire uniquement**
  (aucune ligne exécutable modifiée) : son en-tête affirmait « il n'existe AUCUN
  déclencheur mobile » et demandait explicitement de le mettre à jour le jour où
  un tel déclencheur apparaîtrait. Le commentaire dit désormais pourquoi ce helper
  GARDE volontairement le redimensionnement (il mesure le focus d'un `Select`, pas
  un chemin d'ouverture) et renvoie vers la nouvelle spec. Écart assumé vs la liste
  « fichiers attendus » du briefing : laisser un commentaire faux dans le dépôt
  aurait coûté plus qu'il n'aurait économisé, et la spec a été rejouée verte.

## Tests

Toutes les commandes ci-dessous ont été RÉELLEMENT exécutées depuis le worktree
`sprint-66-start-ebe593`, chiffres lus dans la sortie.

1. `cd frontend && SKIP_DELEGATION=1 rtk proxy npx vitest run src/components/layout`
   → **1 fichier / 25 tests, 25 passed**, 0 ligne stderr (19 avant, +6).
2. `cd frontend && SKIP_DELEGATION=1 rtk proxy npx vitest run` (suite complète)
   → **101 fichiers / 1010 tests, 1010 passed, 0 failed** en 37 s.
   Baseline lead sur `abd3a4a` = 101 fichiers / 1004 tests → +6, aucune régression.
3. `cd frontend && rtk proxy npx tsc --noEmit` → exit 0.
4. `cd frontend && rtk proxy npx eslint src/components/layout e2e/sprint-66-mobile-create-event.spec.ts`
   → exit 0.
5. Oracle harnais AVANT tout run E2E :
   `curl -s -o /dev/null -w '%{http_code}' http://localhost:3100/api/auth/me` → **401**
   (proxy `/api` en place). Serveur `:3100` vérifié comme appartenant à CE worktree
   (`lsof -a -p <pid> -d cwd` → `…/sprint-66-start-ebe593/frontend`). Backend e2e
   `mytimeline-e2e-backend-e2e-1`, `RATE_LIMIT_ENABLED=false` (lu par `docker inspect`).
6. `cd frontend && SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 rtk proxy npx playwright test e2e/sprint-66-mobile-create-event.spec.ts --reporter=line`
   → **8 passed (20,2 s)** = 5 tests du projet `setup` + les 3 tests de la spec.
   ⚠ Le PREMIER lancement de cette commande a échoué au provisioning (`2 failed`,
   `provision shared` / `provision pwd`, `getByTestId('dashboard')` non trouvé en
   5 s), `3 did not run`. Ce n'est PAS un rate-limit (désactivé sur ce backend, cf.
   point 5) : le relancer tel quel a rendu 8/8 vert. Cause non établie — flakiness
   de provisioning sous 2 workers, non investiguée (cf. « Ce qui n'est PAS prouvé »).
7. **CONTRÔLE NÉGATIF** (exigé) : `lg:hidden` → `hidden` sur le FAB, spec rejouée
   → **2 failed / 6 passed**. Les deux tests MOBILES rougissent
   (`shell-mobile-new-event-button` `Received: hidden`, la trace imprime la classe
   compilée avec `hidden`), le test desktop reste vert — attendu, un FAB masqué
   PARTOUT satisfait encore l'assertion desktop, ce qui est précisément pourquoi la
   spec exerce les deux bornes. État neutralisé RESTAURÉ et vérifié (`grep lg:hidden`)
   AVANT le commit ; le commit ne contient pas l'état neutralisé.
8. Non-régression E2E :
   `… npx playwright test e2e/sprint-62-select-focus-indicator.spec.ts e2e/timeline-mobile.spec.ts --reporter=line`
   → **40 passed / 0 failed (3,3 min)** (inclut le projet `firefox` restreint à la
   spec #414).

Ce que couvrent les 6 tests RTL (contrat, PAS visibilité) : présence + `type="button"`
+ nom accessible + `aria-haspopup="dialog"` ; classes du palier et de la spec Designer
(chaîne) ; ouverture du MÊME drawer avec `getAllByTestId(...).toHaveLength(1)` et un
seul `mount` du mock ; partage d'état mobile → fermeture (démontage vérifié) →
réouverture desktop ; bouton desktop inchangé et FAB hors de l'`<aside>` ; existence
de la clé `shell.newEvent` dans les 4 locales (le mock i18n `${ns}.${key}` ne peut pas
distinguer une clé fausse d'une vraie — PIT-S63-006, et `i18n-namespaces.test.ts` ne
vérifie que la racine du namespace).

## Ce qui n'est PAS prouvé

- **`next build` n'a PAS été lancé.** `frontend/.next` est unique et partagé dans ce
  worktree, où tourne le `next dev` du harnais E2E (PIT-S62-009) : un build aurait pu
  tuer l'environnement des autres agents. `tsc --noEmit` + `eslint` sont verts, mais
  PIT-S22-001 / PIT-S41-005 rappellent que le build attrape des erreurs qu'ils ratent.
  C'est la CI qui tranchera.
- **Aucune vérification en NAVIGATEUR RÉEL (rendu, contraste, empilement visuel).**
  L'E2E asserte `position: fixed`, `bottom ≠ auto` et `> 0 px`, et une boîte ≥ 44×44 —
  donc l'utilitaire arbitraire `bottom-[calc(var(--space-6)+env(safe-area-inset-bottom))]`
  compile bien. Rien n'est mesuré sur le CONTRASTE du FAB, ni sur son recouvrement
  effectif par l'overlay `.mt-sheet__overlay` pendant la saisie (la superposition est
  déduite des tokens `--z-sticky` 10 < `--z-modal` 70, pas mesurée au pixel).
- **`env(safe-area-inset-bottom)` vaut 0 en Chromium headless** : l'offset réel sur un
  iPhone encoché (barre de gestes) n'est pas exercé. Seul le terme `--space-6` (24 px)
  est mesuré.
- **Aucun test sur un vrai appareil tactile** : la cible de 52 px est mesurée en CSS,
  pas la préhension. Idem pour l'ergonomie du pouce à droite (le FAB est à droite en
  LTR ; aucune locale RTL n'existe au dépôt).
- **Le focus après fermeture n'est pas asserté.** Il est délégué à `useFocusTrap`
  (restauration de `previousFocus` au cleanup) — comportement préexistant, non
  re-testé depuis le FAB.
- **La flakiness de provisioning du point 6 n'est pas diagnostiquée** : elle a été
  observée une fois, contournée par un re-run, non reproduite ensuite. Elle peut
  réapparaître en CI.
- **Le paysage mobile ne va pas jusqu'à la soumission** : le 2ᵉ test s'arrête à
  l'ouverture de la sheet + présence du produit seedé. Seul le portrait exerce la
  création complète avec relecture serveur.
- **Aucune mesure de la borne exacte du palier** (1023 px vs 1024 px) : `lg:` est un
  `min-width` de Tailwind, non un `max-[Npx]` — PIT-S63-005 ne s'y applique pas, mais
  aucun test n'a été fait à 1023/1024 px précis.

## [MEMORY:*]

`[MEMORY:pitfall]` Contexte : une action centrale (créer un événement) n'avait qu'un
déclencheur, logé dans un conteneur `hidden lg:flex` — la fonctionnalité était morte
sous 1024 px sans qu'aucun test ne rougisse. Solution : ancrer le déclencheur mobile
dans `AppShell` (seul point commun aux 4 écrans du groupe `(app)`) sur le MÊME état.
Prévention : greper les appelants d'un `setX(true)` et vérifier si TOUS vivent sous un
conteneur `hidden …:flex` — un compte d'appelants > 0 ne prouve pas l'atteignabilité.

`[MEMORY:pattern]` Problème : prouver « visible sous N px » quand jsdom n'a ni CSS ni
layout. Solution : test RTL = câblage + contrat (`getAllByTestId(...).toHaveLength(1)`
attrape le second état dupliqué), E2E = palier exercé dans les DEUX sens (borne basse
ET borne haute) + contrôle négatif. Anti-pattern : asserter `className.contains('lg:hidden')`
en RTL et croire avoir prouvé une visibilité (famille PIT-S54-002).

`[MEMORY:decision]` Contexte : `Button size="icon"` (h-9 = 36 px) était le composant
existant le plus proche. Décision : `<button>` natif avec `h-13 w-13` (52 px). Pourquoi :
36 px est SOUS le minimum tactile WCAG 2.5.5 (44 px) ; passer par le variant aurait
exigé d'écraser sa taille, donc autant d'utilitaires, pour moins de lisibilité.

## Recommandations suite

- **Pas de RECOMMAND_TEST_RUNNER** : je n'ai lancé que 3 specs ciblées (3 + 40 tests),
  jamais la suite E2E complète (~240 tests). Les 3,3 min du point 8 sont pour deux
  specs, dont une qui tourne sur deux moteurs.
- **Pas de RECOMMAND_DB_EXPERT / RECOMMAND_SECURITY** : livraison 100 % frontend, aucun
  schéma, aucune requête, aucun endpoint, aucune donnée personnelle nouvelle.
- **RECOMMAND_FOLLOWUP (P3, cosmétique)** : le FAB se superpose au contenu en bas de
  page sur les écrans qui n'ont pas de padding bas réservé (`timeline`, `products`,
  `settings` sous 1024 px). Rien n'est masqué de façon bloquante (le FAB fait 52 px
  dans le coin), mais un `padding-bottom` de sécurité sur ces écrans serait plus propre.
  Non traité ici : cela toucherait 3 écrans hors périmètre de #455.
- **RECOMMAND_FOLLOWUP (P3)** : le FAB reste dans l'ordre de tabulation pendant que la
  sheet est ouverte. `useFocusTrap` empêche le focus d'en sortir, donc l'impact réel
  est nul aujourd'hui ; à revoir si le trap est un jour assoupli. Signalé plutôt que
  corrigé (la spec Designer refuse explicitement l'`aria-hidden` pendant l'ouverture).
- **RECOMMAND_UI_DESIGN — NON** : la spec Designer a été appliquée telle quelle, sans
  écart ni interprétation à arbitrer.
- Note pour #79 (Vague 2) : `NewEventDrawer.tsx`, `timeline/TimelineBottomSheet.tsx`,
  `settings/mobile/BottomSheet.tsx` et `src/hooks/` n'ont PAS été touchés.

STATUS: COMPLETED
