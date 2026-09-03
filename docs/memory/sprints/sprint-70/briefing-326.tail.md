## Dependances intra-sprint
- **Tu es la VAGUE 1.** L'issue #325 (vérification visuelle de la mini-frise en
  clair/sombre) est la vague 2 et sera lancée APRÈS toi, sur ton résultat. Elle
  vérifiera l'aperçu **à sa position finale** — donc celle que tu livres.
- Conséquence : ne laisse pas l'aperçu dans un état visuellement provisoire. Si tu
  sais qu'un écart visuel subsiste, écris-le explicitement dans ton `RETOUR` — il
  deviendra une entrée de la checklist de #325 au lieu d'une découverte tardive.
- Fichiers que #325 touchera très probablement : `timeline.css` (bloc `.mt-evt--preview`
  et voisins) et `EventPreviewTimeline.tsx`. Tu peux les modifier — tu passes en premier.

## Designer
Non applicable (pas de nouveau composant : repositionnement d'un composant existant).
La spéc EST le handoff §6, cité dans le HEAD. **Ne réinvente pas le rendu de l'aperçu**,
c'est le périmètre de #325.

## Contraintes

### Environnement — À LIRE AVANT TOUTE COMMANDE
- **Tu travailles dans un worktree git** :
  `/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/traitement-s-xs-parallele-d0ae59`
  **`cd` explicitement dedans au début de CHAQUE commande bash.** Piège mesuré sur ce
  projet : un subagent peut défaut-`cwd` sur le dépôt principal et produire un faux KO
  (fichier « introuvable », diff vide). Garde-fou : `git rev-parse HEAD` doit rendre
  `fd954b2a0e0f1ff7eb45adae619618776108dbe4` (ou un descendant, si tu as déjà commité).
- Branche : `claude/sprint-70-start-b946cb` (déjà checkout, == `origin/dev`).
  **Convention projet : PAS de branche `sprint/70`.** Ne la crée pas.
- `frontend/node_modules` est **ABSENT** dans ce worktree (`PIT-S69-002`). Si
  `./scripts/test-quiet.sh frontend` échoue sur un préflight d'environnement,
  **ce n'est PAS une suite rouge** — ne conclus pas à une régression. Installe
  (`cd frontend && npm ci`) ou dis-le dans ton retour.
- **`git diff` est avalé par le proxy RTK** sur ce poste (sortie ~vide, trompeuse).
  Utilise `rtk proxy git diff …`, ou `git show --stat`, ou dump-vers-fichier + lecture.
  Idem : `git log` peut rendre une sortie mal filtrée — `git rev-parse` est fiable.

### Code
- Commit : **1 commit logique**, message gitmoji en **français**.
  `git add` **CIBLÉ** sur tes fichiers — **jamais `git add -A`** (le working tree est
  partagé, un autre agent peut y écrire).
- Code en anglais, commentaires/docs en français (convention projet).
- Réutilise le pattern portal existant (`footerPortalNode`) plutôt que d'inventer un
  second mécanisme, **sauf** si tu démontres qu'il ne convient pas — auquel cas explique
  pourquoi dans le commit et le retour.
- Zéro couleur littérale, zéro `z-index` littéral : tokens DS uniquement.
- Ne touche PAS : `backend/**`, `db/migration/**`, `frontend/e2e/**` (sauf si tu ajoutes
  une spec — voir ci-dessous), `frontend/src/components/EventDrawer*`, `TimelineEditHost*`,
  `ConflictDialog*` (surfaces d'édition hors périmètre).

### Tests — OBLIGATOIRE
- Tests unitaires : `NewEventDrawer.test.tsx` et/ou `EventEditForm.test.tsx` doivent
  couvrir le nouveau positionnement (présence du nœud sticky en `mode="create"`,
  **absence** en mode édition — c'est la preuve de non-régression des 3 surfaces
  partagées).
- ⚠ **Un test jsdom ne prouve RIEN sur un comportement de scroll ou de sticky**
  (`jsdom` ne calcule aucune mise en page ; `getComputedStyle` y rend des valeurs
  déclarées, pas rendues). Si ta livraison repose sur un effet de `position:sticky`
  réellement observable, **il faut un E2E Playwright** qui mesure la position du nœud
  après scroll du corps du drawer. Précédents à copier : `frontend/e2e/support/contrast.ts`,
  `sprint-62-control-focus-contrast.spec.ts`, `landing-cta-contrast.spec.ts`.
- Recette E2E locale : `docs/memory/sprints/sprint-47/e2e-local-runbook.md`
  (4 pièges non devinables — CORS, base `eventmanager_e2e`, port `:3100`, workers).
  Elle tourne réellement en local. Si tu ne peux pas la lancer, dis-le, ne prétends pas.
- Tout nouveau `data-testid` ajouté dans un `.tsx` DOIT être cité dans une spec de
  `frontend/e2e/` (le check de couverture du sprint échouera sinon). ⚠ Ce check vérifie
  seulement que le testid est **cité** — pas que la spec passe. Ne t'en contente pas.

## Livrable attendu (format strict, MAX 500 tokens, style caveman — pas de prose)

RETOUR :
- commits: [SHA, ...]
- resume: <objectif + BR touchées + fichiers clés + pièges rencontrés + tests>
- **fichiers de contexte lus:** <liste EXACTE des fichiers de contexte que tu as
  réellement ouverts (chemins), avec pour CHACUN un ancrage vérifiable — l'identifiant
  du dernier pitfall lu, un numéro de ligne, une citation courte>. Cette ligne est
  **obligatoire** et sera auditée : le Sprint 69 a livré sans pouvoir prouver que les
  archives pointées avaient été lues. Si tu n'as pas lu un fichier pointé, écris-le.
- tests: <commandes lancées + résultat chiffré ; « non lancé » si non lancé, jamais de
  supposition>
- ecarts_visuels_connus: <ce que tu SAIS ne pas être conforme au handoff §6 après ton
  changement — sert de checklist à l'issue #325, vague 2>
- [MEMORY:*] signaux: <pitfall / pattern / decision, si applicables>
- recommandations suite: <RECOMMAND_FOLLOWUP / RECOMMAND_UI_DESIGN / … OU négation
  explicite « Pas de RECOMMAND_X car … »>
- STATUS: COMPLETED en dernière ligne (ou STATUS: PARTIAL + BLOQUE_SUR)
