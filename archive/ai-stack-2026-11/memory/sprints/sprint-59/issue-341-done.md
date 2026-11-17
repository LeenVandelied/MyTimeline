# Issue #341 — SVG inline débordant d'environ 30 px sur mobile — Sprint 59, vague 1

commits: `a62b3f7` — `:white_check_mark: test(e2e): verrouiller l'absence de débordement horizontal de la landing (#341)`
fichiers: `frontend/e2e/landing-mobile-overflow.spec.ts` (nouveau, 162 lignes)
sentinel briefing: `SENTINEL-SPRINT59-341-VMPT4` ✅ (contexte bien reçu)

## Résultat central — #341 est un FAUX POSITIF DE MESURE

**Aucun correctif de rendu n'était nécessaire.** Le coupable a été localisé par balayage du **DOM
rendu** (et non par `grep` du source — la piste de l'issue était morte, comme annoncé dans le
briefing).

Les 4 `<g>` à `x = 384` sont le **bouton flottant des TanStack Query Devtools**
(`.tsqd-parent-container` — le logo TanStack se compose de 4 `<g>` + 3 `<ellipse>` + 1 `<circle>`),
monté par `frontend/src/contexts/QueryProvider.tsx:40` sous
`process.env.NODE_ENV === 'development'` **seulement** → **absent du bundle de production**.

Le « débordement » : ce bouton est décalé hors du bord droit **par design**, et son `right` suit la
largeur du viewport — **329 @ 320 px, 384 @ 375 px, 399 @ 390 px**. La correspondance avec le
chiffre de l'issue (384 @ 375) est exacte. **Il ne produit aucun scroll.**

Piste écartée au passage : **aucun `<g>` dans lucide-react 0.476** — 0 icône sur ~1500 en contient.
L'hypothèse « icône lucide mal contrainte » est morte.

## Mesures — avant/après identiques (rien n'a été changé)

20 combinaisons `fr`/`en`/`es`/`de` × `320`/`360`/`375`/`390`/`414` px :

- `scrollWidth == clientWidth` **partout** ; `bodyScrollWidth == clientWidth` ;
  sonde de défilement réel `maxScrollX = 0` **partout**.
- Offenders **incluant** les devtools : 8 par combinaison (4 `g`, 3 `ellipse`, 1 `circle`), tous
  sous `.tsqd-parent-container`, `right = clientWidth + 9`.
- Offenders **hors** devtools / `nextjs-portal` : **0** sur les 20 combinaisons.
- Rejoué à l'identique dans `mcr.microsoft.com/playwright:v1.61.1-jammy` (image alignée sur
  `@playwright/test ^1.61.1`) : mêmes 20 lignes, 0 offender. **PIT-S52-001 respecté** — aucune
  conclusion tirée de macOS seul.

## Livré à la place du correctif

Un **verrou de non-régression** : `frontend/e2e/landing-mobile-overflow.spec.ts` (11 tests,
4,7 s macOS / 5,7 s jammy), qui exclut explicitement `.tsqd-parent-container` et `nextjs-portal`
du balayage et **documente le piège** pour que la prochaine mesure ne le repayer pas.

Vérifications : `tsc --noEmit` 0 erreur, eslint 0, prettier OK.

## non_couvert

- **Build de production jamais mesuré.** L'absence du bouton en prod est établie par **lecture du
  gating `NODE_ENV`** dans `QueryProvider.tsx`, pas par une mesure sur `next build`. Motif :
  `next build` écrit dans `frontend/.next`, partagé avec les serveurs dev des autres agents de la
  vague.
- jammy ≠ `ubuntu-latest` de la CI (jeu de polices potentiellement différent). Plus proche que
  macOS, pas identique.
- **Suite unitaire frontend non lancée** (`./scripts/test-quiet.sh frontend`) : zéro fichier source
  modifié, seulement un ajout de spec E2E. Non vérifié pour autant.
- Spec limitée à `fr` + `de` (`en`/`es` mesurés hors CI seulement) et à **Chromium** — WebKit et
  Firefox non testés, aucun projet Playwright ne les couvre.
- **Aucun thème sombre mesuré** ; aucune mesure à `zoom` ou `text-size-adjust` non par défaut.
- **Passage réel de la CI e2e non vérifié** : le projet `chromium` dépend du projet `setup`
  (register backend), backend absent en local → lancement en `--no-deps`.
- Aucun commentaire GitHub posté, issue non fermée par l'agent.

## [MEMORY:*]

- **[MEMORY:pitfall]** Un audit de débordement horizontal par
  `getBoundingClientRect().right > clientWidth` sur un `npm run dev` remonte le bouton flottant des
  **TanStack Query Devtools** (`.tsqd-parent-container`) et l'overlay `nextjs-portal` comme
  « éléments débordants », avec un `right` qui **suit la largeur du viewport** — indiscernable d'un
  vrai défaut, alors que `scrollWidth == clientWidth`. **A produit l'issue #341 : trois sprints de
  suspicion sur un SVG de landing qui n'existe pas.** Solution : exclure `.tsqd-parent-container` et
  `nextjs-portal` du balayage, et confirmer par une sonde `window.scrollTo(5000,0)` + relecture de
  `window.scrollX` (Chromium clampe ; jsdom non). Prévention portée par
  `frontend/e2e/landing-mobile-overflow.spec.ts`.
- **[MEMORY:bug]** #341 décrivait « 4 `<g>` d'un SVG inline à x=384 » ; aucun SVG inline n'existe
  dans la landing et lucide-react n'émet aucun `<g>`. **Règle : une observation DOM issue d'un
  serveur de développement n'est pas une observation de l'application tant que l'outillage de dev
  n'a pas été exclu.**

## Recommandations suite

- `RECOMMAND_FOLLOWUP` : **fermer #341 comme non-reproductible** (mesure négative 20/20, macOS +
  jammy) en citant `a62b3f7`. [triage XS]
- Aucun `RECOMMAND_UI_DESIGN` (rien de visible n'a changé), aucun `RECOMMAND_DB_EXPERT`, aucun
  `RECOMMAND_SECURITY`.
- `HeaderSection.tsx` / `LandingMobileMenu.tsx` **non touchés** — l'investigation ne les a jamais
  désignés. `HeroSection.tsx` **non touché** non plus : **aucune collision à prévoir pour #348**.

STATUS: COMPLETED
