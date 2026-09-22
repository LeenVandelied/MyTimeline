# Issue #496 — BR-EVE-009 attribuée à deux règles : trancher et recibler

## RETOUR

- **commits**: 1 seul commit, sujet `:memo: docs(events): BR-EVE-017 pour le débounce de
  l'aperçu live, fin de la collision BR-EVE-009 (#496)`. Le SHA n'est pas cité ici : il ne peut
  pas se référencer lui-même dans le commit qui le contient. Résolution : `git log --oneline
  --grep '#496'`.
- **BR créée**: **BR-EVE-017 — Aperçu live de l'éditeur d'event : valeurs débouncées à 150 ms**
  - Identifiant vérifié LIBRE : pack contient 001→016 sans trou (BR-EVE-010 = `allDay`, existe bien
    — le trou apparent venait d'un grep tronqué par RTK). Prochain libre = **017**, pas 012.
  - Énoncé : les valeurs alimentant l'aperçu live (mini-frise, pastille, légende) MUST transiter par
    un débounce 150 ms porté par `EventEditForm` ; `EventPreviewTimeline` ne débounce RIEN lui-même
    et ses props MUST NOT être rebranchées sur les `watch()` bruts de RHF.
  - Section marque explicitement que 150 ms est un **choix de perf UI, pas une exigence produit** —
    documentée parce que transverse à plusieurs composants.
  - `BR-EVE-009` (modèle couleur) **non touchée, non renumérotée**.
- **fichiers touchés**:
  - `.ai-env/context-packs/br-events.md` — +BR-EVE-017 (après la note de numérotation de BR-EVE-016)
  - `frontend/src/components/EventEditForm.tsx` — 2 commentaires reciblés
  - `frontend/src/components/events/EventPreviewTimeline.tsx` — 1 commentaire reciblé
  - `frontend/src/components/events/NewEventDrawer.test.tsx` — 1 commentaire reciblé
  - `docs/memory/sprints/sprint-71/issue-496-done.md` — ce fichier
  - ⚠ `docs/memory/business-rules.md` **NON créé** (confirme le correctif du lead : le fichier
    n'existe pas dans ce repo, le pack est la seule source).
- **tests**: `npx vitest run NewEventDrawer.test.tsx EventEditForm.test.tsx event.test.ts` →
  **106 PASS / 0 FAIL**. Aucun changement de comportement attendu ni observé (commentaires seuls).
  `bash .ai-env/tools/gen-pit-packs.sh --check` → **exit 0** (packs à jour ; pit-*.md non touchés).

## Fichiers de contexte lus

- `.ai-env/context-packs/br-events.md` — **LU** (index complet des BR + sections 86→146). Ancrage :
  `BR-EVE-009` = « Modèle couleur event (migration design v3 #44) », **l.92** ; `BR-EVE-016` l.135 ;
  note de numérotation l.141 (« l'issue #201 parlait de BR-EVE-002 […] formalisée ici en BR-EVE-016 »)
  — c'est le précédent que j'ai imité pour tracer le reciblage. Sections 1/2/4/5 : **non lues**.
- `docs/memory/pitfalls.md` — **LU (partiel)** : `PIT-S70-001` **l.1155**, « Un briefing peut attribuer
  un identifiant `BR-*` à la mauvaise règle : grepper le pack AVANT de s'y appuyer ». Lus aussi en
  passant : PIT-S70-002 (label « pré-existant » → réfuter par la base), PIT-S70-005 (négation sur UNE
  ligne — appliqué dans « Recommandations suite »). Le reste du fichier : **NON LU**.
- `docs/memory/sprints/sprint-70/issue-326-done.md` — **LU (partiel)**, l.46-51 :
  « Le briefing affirmait BR-EVE-009 = perf de l'aperçu live, débounce 150 ms. FAUX, vérifié par le
  lead » + l.90 `RECOMMAND_FOLLOWUP` qui a engendré cette issue.
- `docs/memory/sprints/sprint-71/issue-495-done.md` — **LU (partiel)**, l.85-89 : #495 annonce
  « chevauchement avec #496 sur les commentaires ~174 et ~289 », « uniquement des COMMENTAIRES,
  aucune ligne de code », et laisse explicitement les lignes `useDebounced` à cette issue.
- `cp-frontend.md` — **LU** (inliné dans le briefing).
- `pit-frontend.md`, `coverage-events.md`, règles JIT du briefing long — **NON LUS** : changement
  limité à des commentaires et à une section de pack, aucun pattern frontend en jeu.

## Inventaire des renvois `BR-EVE-009` (source + e2e + backend)

**RECIBLÉS vers BR-EVE-017 (4)** — tous parlaient de débounce/perf, aucun de couleur :
- `frontend/src/components/EventEditForm.tsx:185` — `useDebounced` (perf preview live, 150 ms)
- `frontend/src/components/EventEditForm.tsx:300` — dates débouncées, « à chaque frappe »
- `frontend/src/components/events/EventPreviewTimeline.tsx:36` — « ⚠ PERF : ne débounce RIEN lui-même »
- `frontend/src/components/events/NewEventDrawer.test.tsx:493` — « Debounce 150 ms »

⚠ **Les 2 derniers ne figuraient PAS dans le briefing** (qui n'en listait que 2). Je les ai reciblés :
même défaut exact, et les laisser aurait reconduit la propagation décrite par PIT-S70-001.
`EventPreviewTimeline.tsx` est dans la liste « ne pas toucher » du briefing (livré par #497) — mais la
ligne 36 est **pré-existante** (venue de #325/#326, pas de #497), l'édition est un seul identifiant
dans un commentaire, et aucun agent parallèle n'était actif. **Écart assumé et signalé, pas absorbé.**

**LAISSÉS INTACTS — corrects, portent bien sur la COULEUR (24)** :
- `frontend/src/types/event.ts` : 5, 8, 158, 218, 222, 229, 275, 363
- `frontend/src/types/event.test.ts` : 242, 243, 251, 260
- `frontend/src/components/EventEditForm.tsx` : 45, 674, 797
- `frontend/src/components/EventEditForm.test.tsx` : 259, 641
- `frontend/src/components/EventContent.tsx` : 22, 49, 114, 202
- `frontend/src/components/timeline/EventPill.tsx` : 22, 104 — `EventPill.test.tsx` : 13, 67 —
  `EventPill.stories.tsx` : 9 — `timeline/lib.ts` : 63, 108, 256
- `frontend/src/components/dashboard/{WeekAgenda,CompactAgenda,DensityRibbon}.tsx` : 10, 15, 12
- `frontend/src/components/events/EventPreviewTimeline.test.tsx:53`, `frontend/src/lib/color.ts:8`,
  `frontend/src/services/eventService.ts:70`, `frontend/e2e/sprint-66-mobile-keyboard.spec.ts:268`
- `backend/.../application/dtos/EventCreationRequest.java:41`

Vérification finale : `grep -rn "BR-EVE-009" frontend/src frontend/e2e backend/src | grep -i "debounc|perf|150 ms"` → **exit 1, zéro reste**.

## Ce qui n'a PAS été vérifié

- Suite frontend **complète** non lancée (3 fichiers ciblés seulement) — changement 100 % commentaires.
- Backend, E2E Playwright, `next build`, `tsc`, eslint : **non lancés**. Aucune ligne exécutable modifiée.
- Les occurrences `BR-EVE-009` dans `docs/` et `.next/cache` : non auditées (documentation historique
  et artefacts de build, hors périmètre).

## Signaux mémoire

- `[MEMORY:business-rule]` — **BR-EVE-017** créée. Description : aperçu live de l'éditeur d'event
  alimenté par des valeurs débouncées à 150 ms depuis `EventEditForm`. Contraintes : le composant
  d'aperçu reste présentationnel (ne débounce pas), ses props ne se rebranchent pas sur `form.watch()`.
- `[MEMORY:decision]` — Contexte : une contrainte de perf UI (150 ms) vivait uniquement en commentaire,
  sous un identifiant `BR-*` faux. Décision : la **promouvoir en BR dédiée** plutôt que retirer le
  renvoi. Pourquoi : elle est transverse à ≥2 composants et aucun test ne protège le contrat — un
  contributeur qui rebranche l'aperçu sur `watch()` ne casse rien de rouge. Une BR est le seul endroit
  où cette contrainte survit à la relecture.
- `[MEMORY:pitfall]` — **Un identifiant `BR-*` faux se corrige sur TOUTES ses occurrences, pas sur
  celles que le briefing a listées.** Le briefing #496 nommait 2 renvois fautifs ; le repo en portait
  **4**. Un inventaire d'issue est un point de départ, jamais le périmètre. Prévention : grepper
  l'identifiant sur tout le code source AVANT de recibler, et classer chaque occurrence
  RECIBLÉ / INTACT — la trace du tri est la preuve qu'on n'a ni ratissé trop large ni trop court.
  Même famille que PIT-S70-001 et que le `[MEMORY:pitfall]` de #495 (inventaire de surfaces recopié).
- `[MEMORY:bug]` — **`frontend/src/components/events/NewEventDrawer.test.tsx` viole `prettier --check`
  sur `HEAD`, AVANT toute modification de ma part.** Cause : dérive de formatage introduite au S70
  (#326), non attrapée car la CI lance `npm run lint` (eslint) et **jamais** `npm run format:check`.
  Solution : hors périmètre, non corrigée (reformater aurait noyé un diff de 4 caractères).
  Règle : ne pas déduire « la CI est verte donc le formatage l'est » — ce sont deux gates différents.
  Réfutation du label « pré-existant » faite comme l'exige PIT-S70-002 :
  `git show HEAD:<fichier> > /tmp/x && prettier --check /tmp/x` → **exit 1** sur la version HEAD.

## Écarts hors périmètre rencontrés

- Le briefing demandait de signaler les « 3 blocs de commentaires devenus faux » laissés par #495 dans
  `EventEditForm.tsx`. **Je n'en ai croisé aucun** en dehors des 2 renvois BR que je devais recibler —
  mais je n'ai pas relu le fichier intégralement (1000+ lignes), seulement les zones `BR-EVE-*`.
  **Non vérifié, pas « absent ».**
- Piège RTK confirmé une fois de plus : `grep -oE` sur `br-events.md` a rendu une liste
  **amputée de BR-EVE-010**, ce qui aurait pu me faire réutiliser un identifiant OCCUPÉ.
  `rtk proxy grep` a rétabli la liste exacte. Ne jamais choisir un identifiant sur un grep non-proxy.

## Recommandations suite

- `RECOMMAND_FOLLOWUP` — ajouter un **test qui protège BR-EVE-017** : aujourd'hui rebrancher l'aperçu
  sur `form.watch()` brut ne rend aucun test rouge, la règle ne tient que par le commentaire.
- `RECOMMAND_FOLLOWUP` — trancher sur `prettier` : soit ajouter `npm run format:check` à la CI
  frontend, soit retirer les scripts `format*` du `package.json`. En l'état le repo porte une dérive
  de formatage invisible (au moins `NewEventDrawer.test.tsx`).
- Pas de `RECOMMAND_SECURITY` car le changement ne touche ni auth, ni données personnelles, ni API externe.
- Pas de `RECOMMAND_DB_EXPERT` car aucun schéma, migration ou requête n'est concerné.
- Pas de `RECOMMAND_TEST_RUNNER` car les 3 fichiers de test pertinents ont été exécutés ici (106 PASS) et aucune ligne exécutable n'a changé.
- Pas de `RECOMMAND_UI_DESIGN` car aucune surface visuelle n'est modifiée (commentaires et documentation seulement).
- Pas de `RECOMMAND_ARCHITECT` car aucune décision de structure n'est en jeu.

STATUS: COMPLETED
