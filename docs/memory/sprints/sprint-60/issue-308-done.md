# Issue #308 — Régulariser la dev-dep eslint-plugin-storybook

> ⚠ **Artefact rédigé par le LEAD, pas par le fullstack-dev.** L'agent a calé
> (watchdog, 600 s sans progression) après avoir écrit le préflight et l'avoir câblé dans
> `run_frontend`, mais avant la documentation, la preuve, l'artefact et le commit.
> Le lead a repris à partir de son diff non committé. Détail en fin de fichier.

- commits: [ee0b1ea]

- resume:
  **Diagnostic** — la prémisse de l'issue est fausse : `eslint-plugin-storybook` **est** déclaré
  (`frontend/package.json:72`) **et** installé. Chaîne réelle : `frontend/eslint.config.mjs:2`
  importe le plugin au chargement du module ; `console-error-guard.test.ts:26-30` instancie
  `new ESLint().calculateConfigForFile(...)`, ce qui charge la config **réelle** et déclenche cet
  import. `node_modules` absent/incomplet dans la copie testée ⇒ ce seul fichier tombe en
  « Cannot find package », lu à tort comme une régression de la garde `#160`/`#258`.
  Cause profonde = worktree sans `node_modules` (**#272, encore ouverte**) + cwd sur le mauvais
  dépôt (`PIT-S41-004`, `PIT-S53-006`).

  **Solution retenue** — préflight dans `scripts/test-quiet.sh`, exécuté avant Vitest dans
  `run_frontend`. Il extrait les specs d'import de `eslint.config.mjs`, teste leur résolvabilité
  via `createRequire` ancré sur `frontend/`, et sort en **3** avec un message nommant le
  répertoire réellement testé, la commande de correction (`npm ci`), le rappel « un worktree =
  son propre `node_modules` » et le renvoi à #272.
  Écarté : `skip` du test (la garde est une protection anti-fuite de credentials — un skip la
  neutraliserait sans bruit) ; auto-provisionnement de `node_modules` (périmètre de #272).

  **Fichiers** — `scripts/test-quiet.sh` (+112 l. : `frontend_env_hint`, `frontend_preflight`,
  câblage dans `run_frontend`) · `README.md` (piège 4 + précisions §Tests).

  **Doc** — `README.md` §« Pièges connus » entrée 4, à côté des pièges CORS/`workers` existants.

  **Preuve du cas dégradé (exécutée, pas supposée — `PIT-S58-004`)** : renommage réversible de
  `frontend/node_modules/eslint-plugin-storybook`, puis `./scripts/test-quiet.sh frontend` →
  **exit 3**, message complet affiché, Vitest jamais lancé. Répertoire restauré et résolution
  revérifiée (`require.resolve` OK).

  **Tests (exit codes réels, via `rtk proxy`, cwd = worktree `sprint/60`)**
  - `./scripts/test-quiet.sh frontend` → **exit 0**, 95 fichiers / 888 tests passed
    (identique au repère mesuré par #422 une heure plus tôt : 95/888).
  - `bash -n scripts/test-quiet.sh` → exit 0.
  - `./scripts/test-quiet.sh bogus` (scope inconnu) → **exit 2**, message inchangé.

- [MEMORY:pitfall] Un sous-agent qui reproduit un cas dégradé en déplaçant un répertoire de
  `node_modules` peut caler **entre** le déplacement et la restauration : le worktree reste cassé
  et l'échec suivant accuse le code. Le lead doit vérifier l'état de l'environnement, pas
  seulement `git status`, après tout arrêt anormal — `git status` était propre alors que
  `frontend/node_modules/eslint-plugin-storybook` avait disparu.
- [MEMORY:pitfall] `console-error-guard.test.ts` annonce en commentaire (`:20-21`) que son lint de
  fixtures reste « isolé des plugins next/storybook ». Vrai pour le volet 2 (config minimale),
  **faux pour le volet 1**, qui charge la config réelle exprès. Le commentaire a probablement
  contribué à faire chercher la cause du côté de la déclaration de dépendance.
- [MEMORY:decision] Le préflight ne bloque jamais sur son propre échec : si la sonde Node sort en
  erreur, il avertit et laisse Vitest tourner. Un garde-fou de diagnostic ne doit pas devenir une
  nouvelle cause d'échec.

- recommandations suite:
  - RECOMMAND_FOLLOWUP: le préflight ne couvre que les imports **mono-ligne** de
    `eslint.config.mjs` ; un import multi-ligne ou un `require()` dynamique passe sous le radar
    [triage XS | domaine tooling]
  - Pas de RECOMMAND_DB_EXPERT (aucune migration, aucun SQL touché).
  - Pas de RECOMMAND_SECURITY (aucun code d'auth, de PII ni d'API externe).
  - Pas de RECOMMAND_UI_DESIGN (aucun changement visuel).
  - Pas de RECOMMAND_TEST_RUNNER (suite frontend 888 tests, ~20 s — sous les seuils).

- ABSORBED: correction d'une affirmation périmée du README — il annonçait les jobs CI
  `backend`/`frontend`/`e2e`/`security` ; la liste réelle en compte sept depuis #362
  (`flyway-smoke`, `secret-scan`, `ai-env-packs` manquaient).

- NON VERIFIE:
  - Le préflight n'a **pas** été exercé en CI (rien n'est poussé au moment de l'écriture). En CI
    `npm ci` précède les tests, donc le chemin dégradé ne devrait jamais s'y déclencher — non
    prouvé.
  - Cas `node_modules` **totalement absent** et cas `node_modules` **vide** : les deux branches
    existent dans le code mais seul le cas « paquet manquant » a été déclenché réellement. Les
    reproduire exigeait de déplacer tout `node_modules`, écarté pour ne pas bloquer le sprint.
  - Comportement sous un `frontend/node_modules` en **symlink** vers le dépôt principal (le
    contournement décrit par #272) : non testé.

## Reprise après arrêt de l'agent

L'agent `fullstack-dev` a calé (watchdog : 600 s sans progression), dernier message
« Now wire the preflight into `run_frontend` » — édition en réalité déjà appliquée. Il avait
laissé `frontend/node_modules/eslint-plugin-storybook` renommé en
`.eslint-plugin-storybook.S60-308-bak` : **le worktree était dans l'état dégradé**, invisible à
`git status`. Le lead a restauré le répertoire, vérifié la résolution, relu le diff, complété la
documentation manquante, produit la preuve et committé. Aucune ligne du préflight n'a été
réécrite par le lead — seuls `README.md` et cet artefact ont été ajoutés.

STATUS: COMPLETED
