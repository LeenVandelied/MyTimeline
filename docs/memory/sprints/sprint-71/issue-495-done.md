# Issue #495 — Aperçu épinglé sur les surfaces d'édition (handoff §6)

## RETOUR

- commits: 1 seul, sujet `:lipstick: feat(events): épingle l'aperçu sur la surface d'édition (#495)`.
  SHA reporté dans le retour de tâche — volontairement PAS recopié ici : le tree est partagé
  par 4 subagents et un `--amend` local suffit à périmer un SHA écrit dans le fichier qu'il
  contient (constaté sur ce commit).
- resume: étendre l'aperçu live épinglé (PAT-S70-001, posé au S70 côté création #326)
  aux surfaces d'ÉDITION. BR touchées : aucune règle métier modifiée — changement 100 %
  présentationnel ; BR-EVE-009 relue (modèle COULEUR event, `br-events.md:92`) pour
  confirmer qu'elle ne régit PAS le débounce, cf. PIT-S70-001 non re-commis ici.
  Fichiers clés : `frontend/src/components/timeline/TimelineEditHost.tsx` (nœud hôte +
  `previewPortalNode`), `frontend/src/components/EventEditForm.tsx` (commentaires SEULEMENT),
  `TimelineEditHost.test.tsx` (+3 tests), `EventEditForm.test.tsx` (+1 test),
  `frontend/e2e/sprint-71-edit-preview-pinned.spec.ts` (NOUVEAU).
  Pitfalls rencontrés : PIT-S70-005 (négations sur UNE ligne — appliqué ci-dessous),
  runbook E2E « `npm run build` tue le `next dev` en cours » (je l'ai fait dans un tree
  partagé — le serveur a survécu, vérifié `200` sur `/fr/login`, mais c'était un risque
  gratuit), et un trap `EXIT` de restauration qui a échoué après un `cd` (chemin relatif) :
  le fichier est resté muté ~1 min, restauré et re-vérifié vert.

## L'INVENTAIRE À 3 SURFACES DE L'ISSUE EST FAUX — 1 seule surface existe

Vérifié par `grep -rn "<EventEditForm" frontend/src frontend/app` : 3 monteurs réels
(`NewEventDrawer`, `TimelineEditHost`, `EventContent`), et `EventDrawer`/`ConflictDialog`
n'en font PAS partie.

- **`TimelineEditHost`** — ✅ **LIVRÉ**. Seule vraie surface d'édition (monte
  `EventEditForm:198`). Sa zone défilante EST `DialogContent` (`overflow-y-auto`) : aucun
  frère disponible, la lettre de PAT-S70-001 est donc inapplicable. Nœud hôte placé DANS le
  bloc d'en-tête **déjà** `sticky top-0 z-10` → aucun nouveau `sticky`, aucun nouveau palier
  de z-index (`--z-modal` #446 intouché). Épinglage gaté `>= 640px` (le seul breakpoint de
  cette surface) ; sous 640px = bottom sheet `max-h-[92vh]`, aperçu EN FLUX comme la sheet
  de création (#326). Restructurer en `header/body/footer` aurait signifié refaire la boîte
  du dialog qui porte aussi les 2 chemins de suppression (#309) et la machine 409 :
  écarté comme restructuration lourde.
- **`EventDrawer`** — ❌ **NON LIVRÉ, sans objet**. `EventDrawer.tsx` (109 l.) est un
  panneau de **DÉTAIL en lecture seule** : 5 lignes clé/valeur + un bouton `event-drawer-edit`
  qui appelle `onEdit` et délègue le montage du formulaire à `TimelineEditHost`. Il ne monte
  jamais `EventEditForm`, n'affiche **aucun aperçu** — il n'y a rien à épingler.
- **`ConflictDialog`** — ❌ **NON LIVRÉ, structurellement impossible**. Il est rendu **PAR**
  `EventEditForm` (`EventEditForm.tsx`, `<ConflictDialog testId="event-form-conflict">`), pas
  l'inverse : il ne peut pas héberger l'aperçu du formulaire qui le rend. Son contenu est un
  diff champ par champ, **aucun aperçu**. Ce qui restait à verrouiller — qu'un 409 ne duplique
  ni ne déplace l'aperçu épinglé — l'est par le test ajouté à `EventEditForm.test.tsx`.

## Tests — chiffres réels

- Ciblés : `TimelineEditHost.test.tsx` 12 passed (dont 3 nouveaux) ·
  `EventEditForm.test.tsx` 53 passed (dont 1 nouveau) — 65/65, 0 failed.
- Suite frontend complète : `npx vitest run` → **103 fichiers, 1083 passed / 0 failed** (32 s).
  ⚠ Ce chiffre n'est PAS purement le mien : le working tree partagé contenait aussi les
  modifications en cours de #497 (`EventPreviewTimeline.tsx`, `timeline.css`, `color.ts`).
- `tsc --noEmit` 0 erreur · `eslint` 0 · `prettier --check` OK · `npm run build` OK.
- E2E `sprint-71-edit-preview-pinned.spec.ts` contre `next dev :3100` (ce worktree, cwd vérifié
  par `lsof`) + backend-e2e `:8085` → **6 passed (6,8 s)** (5 setup + 1 spec).
- **Mutation testing aux DEUX niveaux** (ce qui distingue un test porteur d'un test décoratif) :
  - `previewPortalNode={null}` → 2 tests unitaires ROUGES **et** l'E2E ROUGE
    (`timeline-edit-dialog-preview` résolu mais `hidden` — `empty:hidden` fait son office) ;
  - suppression du garde de viewport (`previewPortalNode={previewNode}`) → le test de
    non-régression `< 640px` ROUGE (PAT-S44-001 réellement gardé).
  - Implémentation restaurée et re-vérifiée verte après chaque mutation (65/65, tsc 0).

## Ce qui n'a PAS été vérifié

- **Le rendu visuel** de l'aperçu épinglé sur la surface d'édition (contraste clair/sombre,
  hiérarchie typographique du libellé au contact de `DialogTitle`, hauteur consommée par le
  bandeau aux petites hauteurs). Aucun navigateur ouvert pour MESURER cela — l'E2E mesure de
  la géométrie de défilement, pas des couleurs. Conformément à PIT-S70-006, je n'énonce donc
  aucun « écart visuel » : je n'en ai constaté aucun, et je n'en ai cherché aucun.
- **Le comportement sous 640px** n'est prouvé qu'en jsdom (arbre DOM + classe). Aucun E2E
  mobile sur cette surface.
- **Les 4 locales** : l'E2E ne tourne qu'en `fr`.
- **`EventContent`** (3ᵉ monteur réel de `EventEditForm`) n'a pas été touché : chemin
  calendrier historique, atteignable seulement via `EventBar`/`Lane` qu'aucune page routée ne
  rend. Non modifié, donc non régressé — mais je n'ai pas exercé ce chemin.
- Le backend `:8085` utilisé pour l'E2E provient du projet Docker d'un AUTRE worktree
  (`sprint-plan-5-9ef090`) : contrat d'API stable et suffisant pour un changement front, mais
  ce n'est pas un backend construit depuis CE checkout.

## Fichier hors périmètre édité — SIGNALÉ comme demandé

`EventEditForm.tsx` a été édité, alors que le briefing demandait de l'éviter (conflit annoncé
avec #496 sur les commentaires ~174 et ~289). **Uniquement des COMMENTAIRES, aucune ligne de
code** : trois blocs devenaient FAUX après ce changement (ils affirmaient que
`TimelineEditHost` est « strictement inchangé » et que la bascule de classe du libellé ne vaut
que pour la création). Laisser sciemment un commentaire faux m'a paru pire que le risque de
conflit. Les lignes visées par #496 (`useDebounced` / dates débouncées, attribution BR-EVE-009)
ne sont **pas** touchées — mais leur NUMÉRO a bougé (~+11 lignes).

## fichiers de contexte lus

- `.ai-env/context-packs/br-events.md` — **LU (partiel)** : index des 15 `BR-EVE-*` + `BR-EVE-009`
  intégralement (l.92, « Modèle couleur event (migration design v3 #44) »). Confirme PIT-S70-001 :
  BR-EVE-009 ne parle PAS de débounce. Les autres BR n'ont pas été ouvertes (aucune règle métier
  dans le périmètre).
- `.ai-env/context-packs/pit-frontend.md` — **LU (ciblé, pas intégralement)** : greps `portal`,
  `sticky`, `z-index`/`--z-`, `overflow`, `jsdom`, `PIT-S70-*`. Lu en entier : PIT-S69-002
  (node_modules de worktree — non applicable, `frontend/node_modules` PRÉSENT ici),
  PIT-S70-001 à PIT-S70-006. Retenus et appliqués : PIT-S70-005 (négation sur une seule ligne),
  PIT-S70-006 (ne pas propager d'écart visuel déduit du code), PIT-S70-002 (une étiquette
  « pré-existant » se réfute — voir ci-dessous).
- `docs/memory/patterns.md` — **LU** : `PAT-S70-001` (l.654-655, prop `<x>PortalNode` portée par
  `useState` et non `useRef`, nœud hôte frère de la zone `overflow:auto`, anti-pattern
  `position:sticky` + z-index sur un descendant du conteneur défilant, corollaire de review S70
  sur la classe conditionnelle) et `PAT-S44-001` (l.261-262, « Défaut = `'edit'` (mode
  historique) → migration non-cassante »).
- `docs/design/graphite-handoff.md` §6 — **LU** : « Aperçu live sticky en haut : mini-frise
  (ruler, TODAY) ». ⚠ §6 décrit le layout comme un « drawer latéral (452px) » ; la surface
  d'édition livrée ici est un Dialog 480px, pas ce drawer — le §6 ne la décrit pas littéralement.
- `docs/memory/sprints/sprint-70/issue-326-done.md` — **LU** : le `RECOMMAND_FOLLOWUP` qui a
  engendré cette issue (« Techniquement trivial (la prop est générique), non trivial en risque »)
  et le protocole de mutation testing aux deux niveaux, que j'ai repris.
- `docs/memory/sprints/sprint-47/e2e-local-runbook.md` — **LU** (j'ai écrit un E2E) : recette
  `SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3100`, piège #0 (profil `e2e` sur
  `:8085`), piège #4 (un seul run à la fois — j'ai attendu le verrou de deux autres agents),
  et « `npm run build` TUE le `next dev` en cours » (lu APRÈS avoir lancé le build : le serveur
  a survécu, mais l'ordre était mauvais).

## [MEMORY:*] signaux

- `[MEMORY:pitfall]` — **Un inventaire de surfaces recopié d'issue en issue peut être faux.**
  L'issue #495, le done.md du S70 et 2 blocs de commentaires d'`EventEditForm.tsx` nomment tous
  « les 3 surfaces d'édition : `EventDrawer`, `TimelineEditHost`, `ConflictDialog` ». Deux de ces
  trois ne montent pas `EventEditForm` du tout. Un `grep -rn "<EventEditForm"` (2 s) réfute
  l'énoncé et divise le périmètre par 3. Même famille que PIT-S70-001 et
  [[upstream-blocker-verdict-expires]] : l'énoncé n'est pas la source, et un énoncé recopié
  n'acquiert pas de vérité par répétition.
- `[MEMORY:pattern]` — **Étendre PAT-S70-001 à une surface sans frère de la zone défilante :
  héberger le nœud dans un bloc DÉJÀ `sticky`.** Quand le conteneur défilant est le panneau
  lui-même (`DialogContent overflow-y-auto`), il n'existe aucun frère où poser le nœud hôte.
  Plutôt que (a) restructurer le panneau en `header/body/footer` ou (b) poser un SECOND
  `position:sticky` + z-index, réutiliser le bloc d'en-tête déjà sticky : l'effet est identique,
  et le nombre de paliers de z-index reste inchangé. Corollaire obligatoire : le nœud hôte doit
  porter `empty:hidden` (ou `:empty{display:none}`), sinon sa marge décale l'en-tête pendant le
  rendu initial — c'est précisément ce que la mutation E2E a rendu visible (`hidden`).
- `[MEMORY:pitfall]` — **Un `trap EXIT` de restauration doit utiliser des chemins ABSOLUS.**
  Script de mutation testing : `trap restore EXIT` puis `cd frontend && npx playwright test`.
  Le trap s'exécute dans le cwd FINAL → `FileNotFoundError` sur un chemin relatif, et le fichier
  source est resté muté dans un working tree partagé par 3 autres agents. Le script a rendu
  `exit 0` et affiché `[restored]` : **le message de restauration mentait**. Prévention : chemins
  absolus dans le trap, et vérifier la restauration par un `grep -c` du motif attendu, jamais par
  la sortie du script.

## Recommandations suite

- `RECOMMAND_FOLLOWUP` — corriger l'inventaire « 3 surfaces d'édition » là où il subsiste
  (`docs/memory/sprints/sprint-70/issue-326-done.md`, et le body de l'issue #495 sur GitHub) :
  `EventDrawer` et `ConflictDialog` ne montent pas `EventEditForm`.
- `RECOMMAND_UI_DESIGN` — faire MESURER en navigateur l'aperçu épinglé de la surface d'ÉDITION
  (contraste clair/sombre, libellé `.mt-drawer__label` au contact de `DialogTitle` 20px gras,
  hauteur consommée sous 700 px). #325 n'a validé QUE la surface de création ; je n'ai pas
  regardé cette page, je ne peux donc rien en affirmer (PIT-S70-006).
- `RECOMMAND_FOLLOWUP` — `TimelineEditHost` n'a pas de `DialogDescription` : Radix journalise
  `Missing 'Description' or 'aria-describedby={undefined}' for {DialogContent}`. **Pré-existant,
  vérifié et non déduit** : la même ligne sort du fichier de test de la BASE (`git show HEAD:` des
  deux fichiers, relancé → 1 occurrence). Mes 3 tests ouvrent le dialog, donc la multiplient ;
  ils ne la créent pas. Corriger relève de l'a11y, hors mandat de cette issue.
- Pas de `RECOMMAND_DB_EXPERT` car aucune migration, aucune requête et aucun accès base : changement 100 % frontend présentationnel.
- Pas de `RECOMMAND_SECURITY` car aucune donnée, aucun endpoint, aucun appel réseau nouveau, aucun champ d'authentification touché.
- Pas de `RECOMMAND_TEST_RUNNER` car la suite frontend complète tourne en 32 s (1083 tests) et l'E2E ciblé en 6,8 s, tous deux exécutés inline ici.

STATUS: COMPLETED
