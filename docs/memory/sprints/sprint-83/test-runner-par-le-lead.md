# Sprint 83 — Traitement des signaux RECOMMAND_TEST_RUNNER (#518, #578, #642)

> Rédigé au `/sprint end 83`. Pendant de `verification-ui-design-et-tests.md` (§2, charte et
> navigateur). Séparé en fichier propre parce que `check-sprint-completeness.sh` détecte la trace
> d'un spécialiste **par le nom de fichier**, pas par le contenu — un contrôle faible, qu'un
> fichier vide bien nommé satisferait ; ce fichier-ci porte les résultats réels.

## Traité par le lead, pas par le subagent `test-runner`

Choix délibéré : **aucun subagent `test-runner` n'a été spawné.** La mémoire du projet
consigne 4 faux « E2E impossible » produits par ce subagent (S73) ; la suite a donc été jouée
par le lead lui-même, selon la recette worktree de `playwright.config.ts`.

| Run | Résultat |
|---|---|
| Unitaires + build + typecheck + lint (`test-quiet.sh frontend`), après correctifs de review | **1392 / 1392**, exit 0 |
| E2E complet local (macOS, `next dev` webpack, backend e2e `:8085`) | 314 passed / 11 failed — 10 artefacts `-darwin` + 1 backend périmé |
| E2E CI (PR #650, head `bca361b`) | **317 passed / 8 failed** — les 8 cartes auth de `sprint-77-theme-visual` |
| `sprint-77-theme-visual` en conteneur **noble**, après régénération, SANS `--update-snapshots` | **11 / 11**, 2 runs, armement compris |

Deux verdicts de la phase locale ont été **confirmés par la CI** : `sprint-82-recurrence-capped-hint`
passe (le rouge local venait bien d'une image backend antérieure de 4 jours à la fonctionnalité) ;
`timeline.spec.ts` passe (rouge transitoire du premier run local).

Un verdict local a été **corrigé par la CI** : l'artefact de #574 annonçait 10 références
invalidées ; la CI n'en a rougi que **8** — `landing-hero` passait déjà.

**Écart de vérification à retenir** : `test-quiet.sh frontend` n'exécute PAS
`npm run format:check`, qui est pourtant une étape du job CI `frontend`. Un fichier de test mal
formaté (`75f37c4`) est passé au travers de l'agent ET du lead, et a rougi la CI.
Corrigé par `b71c257`.

## Recommandations suite
- Pas de nouveau `RECOMMAND_TEST_RUNNER` : suites jouées, résultats ci-dessus.
- `RECOMMAND_FOLLOWUP` : ajouter `npm run format:check` à `./scripts/test-quiet.sh frontend`, pour
  que le verdict local couvre toutes les étapes du job CI `frontend` `[XS | tooling]`.

STATUS: COMPLETED
