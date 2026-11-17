# Issue #491 — [TEST] E2E : couvrir le hint de plafond de récurrence

RETOUR :

- **commits**: 1 commit unique pour cette issue, 2 fichiers (`frontend/e2e/sprint-82-recurrence-capped-hint.spec.ts` + ce done). Message : `:white_check_mark: test(e2e): couvrir le hint de plafond de récurrence (#491)`. SHA à relire via `git log` (un `--amend` le fait bouger — cf. mémoire « commits parallèles worktree partagé » : les SHA rapportés par les subagents ne sont pas fiables, reconstituer par `git show --stat`).
- **résumé**: comble le trou signalé en MAJEUR par le check coverage-E2E du S69. Le testid
  `event-form-recurrence-capped-hint` n'avait AUCUNE occurrence dans `frontend/e2e/` ; ses 5
  assertions unitaires (`frontend/src/components/EventEditForm.test.tsx:553..597`) **mockent**
  `useRecurrencePreview` et resteraient vertes si le câblage réseau était rompu de bout en bout.
  Fichier livré : `frontend/e2e/sprint-82-recurrence-capped-hint.spec.ts` (nouveau, seul fichier
  touché). Scénario, en **4 états** sur la surface d'ÉDITION (le hint n'existe pas à la création,
  `!isCreate` — BR-EVE-012) : (1) récurrence OFF → ni champ de borne ni hint ; (2) récurrence ON
  mais unité non choisie → champ visible, hint absent ET **zéro appel réseau** (query
  `enabled:false`) ; (3) unité MONTH sans date de fin → le hint APPARAÎT ; (4) borne courte posée
  (`startDate + 60 j`) → le hint DISPARAÎT. Amorce reprise de
  `frontend/e2e/sprint-71-edit-preview-pinned.spec.ts` (seed produit → frise détail → `EventDrawer`
  → « Éditer »).

- **preuve run**:

  ```
  cd frontend && SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 \
    npx playwright test e2e/sprint-82-recurrence-capped-hint.spec.ts --reporter=line

  run 1 → 6 passed (7,6 s)
  run 2 → 6 passed (10,1 s)   [après suppression du contrôle négatif]
  run 3 → 6 passed (14,0 s)   [après `prettier --write`]
  ```

  (6 = 5 tests du projet `setup` + le test de la spec. 0 failed, 0 flaky sur les 3 runs.)
  Pile dédiée montée pour ce run : `docker compose -p mtl-s82 --profile e2e` avec
  `E2E_BACKEND_PORT=8087` / `E2E_POSTGRES_PORT=5437`, front en `npx next dev -p 3000` (webpack,
  PAS `npm run dev --turbopack` — PIT-S61-007). Oracle double AVANT tout diagnostic :
  `/api/auth/me` = **401**, `/fr/login` = **200**.
  Qualité : `tsc --noEmit` exit 0 (0 erreur), `eslint` exit 0, `prettier --check` OK.

- **pouvoir discriminant** — **mesuré**, pas affirmé. Contrôle négatif jetable
  (`e2e/tmp-491-negative-control.spec.ts`, joué puis **supprimé**, non committé) rejouant les deux
  assertions porteuses avec `capped` épinglé via `page.route` :

  ```
  2 failed / 5 passed (17,0 s)
    · capped forcé FALSE → « le hint apparaît »  ÉCHOUE : toBeVisible() — element(s) not found
    · capped forcé TRUE  → « le hint disparaît » ÉCHOUE : toHaveCount(0) — unexpected value "1"
  ```

  Ce qui fait rougir la spec livrée : hint retiré du composant, query jamais armée, hint rendu en
  dur, `capped` ignoré, clé de query figée qui ne repart pas quand `recurrenceEndDate` change,
  proxy `/api` absent (404) ou CORS (401/403). Deux garde-fous anti-faux-vert en plus :
  **témoin** — `event-form-recurrence-end-date` doit RESTER visible à l'étape (4), sinon un
  démontage du bloc récurrence rendrait « le hint a disparu » vrai *vacuellement* ; **preuve
  réseau** — les réponses de `POST /api/events/recurrence-preview` sont collectées depuis le
  navigateur et leur `capped` est assert (200/true puis 200/false), ce qu'un `curl` ne sait pas
  établir (il n'envoie pas d'`Origin` — PIT-S57-003).

- **[MEMORY:*] signaux**:

  - `[MEMORY:pitfall]` Contexte : le libellé fr du hint dit « La série dépasse **4 000**
    occurrences », et l'énoncé de #491 le reprend. Le déclencheur RÉEL de `capped=true` n'est pas
    ce seuil depuis #452 (S65) : `RecurrenceExpansionServiceImpl` force `capped = true` pour
    **toute** série sans `recurrenceEndDate`, tronquée à l'horizon de 5 ans. Solution : sonder
    l'endpoint avant de construire la donnée de test — mesuré sur le backend e2e S82,
    `MONTH sans borne → {count:61, capped:true}`, `MONTH borné +2 mois → {count:3, capped:false}`,
    `WEEK sans borne → {count:261, capped:true}`. Prévention : ne jamais déduire un seuil d'un
    libellé i18n ; le seuil vit dans le service d'expansion, le libellé n'en est qu'une glose (ici
    fausse — cf. RECOMMAND_FOLLOWUP).
  - `[MEMORY:pattern]` Problème : prouver qu'une spec E2E « exécutée verte » a un pouvoir
    discriminant, sans muter le code source (working tree PARTAGÉ avec un autre agent du fan-out).
    Solution : spec de **contrôle négatif jetable** dans `e2e/`, qui épingle la réponse backend via
    `page.route(...).fulfill()` dans les deux sens (valeur forçant l'affichage, valeur forçant la
    disparition), jouée pour obtenir un ROUGE explicite, puis supprimée avant le commit. Coût 17 s,
    zéro fichier partagé touché. Anti-pattern : commenter le code de production ou éditer le
    composant « juste le temps du contrôle » sur un worktree partagé.
  - `[MEMORY:pitfall]` Contexte : `rtk` (hook global) **réécrit** une commande
    `npx playwright test ... --reporter=line` en `--reporter=json` puis tronque la sortie
    (`[RTK:PASSTHROUGH] Output truncated`) — la sortie de run devient inexploitable comme preuve.
    Solution : préfixer par `rtk proxy` et rediriger vers un fichier
    (`rtk proxy npx playwright test … > /tmp/run.log 2>&1`). Prévention : c'est le même piège que
    « `git diff` rend ~vide sous RTK », étendu à Playwright — à ajouter aux briefings qui exigent
    de coller une sortie de run.

- **recommandations suite**:

  `RECOMMAND_FOLLOWUP` — **défaut PRODUIT constaté, hors périmètre de cette issue de test** : le
  libellé `products.add.event.form.recurrenceCappedHint` (4 locales) annonce « La série dépasse
  4 000 occurrences », alors que le cas qui le déclenche en pratique est une série **sans date de
  fin**, tronquée à l'horizon de 5 ans — soit **61** occurrences en mensuel, **261** en
  hebdomadaire. Le message affiché à l'utilisateur est donc factuellement faux dans le cas nominal,
  et la conduite qu'il suggère (« définissez une date de fin ») est bonne pour la mauvaise raison.
  Correctif suggéré : reformuler le hint autour de la troncature (« la série sera limitée à 5 ans
  sans date de fin ») plutôt qu'autour d'un compte, ou exposer `count` dans le libellé. Impact :
  4 fichiers `public/locales/*/products.json` + les 5 assertions unitaires de
  `EventEditForm.test.tsx` + l'assertion de texte de la spec livrée. Taille estimée : XS. Aucun
  autre `RECOMMAND_*` : pas de besoin `test-runner` (spec jouée ici), pas de besoin `db-expert`
  (aucun changement de schéma), pas de besoin `security-expert` (aucune surface d'auth touchée).

- **STATUS**: COMPLETED

STATUS: COMPLETED
