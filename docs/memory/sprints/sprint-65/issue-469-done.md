# Issue #469 — Sortir les identités E2E du scope module pour rendre `workers > 1` viable

**Sprint 65, vague 1** · size:M · `epic:infrastructure`

## Verdict honnête

Le **mécanisme d'identités est corrigé et prouvé**. Le **critère d'acceptation de l'issue ne l'est
pas** : il exige 2 runs complets consécutifs verts sur les 4 specs `settings-*`, et le run 2 a été
invalidé par une contention de machine, pas par le correctif. La mesure repasse au lead.

## Ce qui a été livré

| Fichier | Changement |
|---|---|
| `frontend/e2e/support/accounts.ts` | Identités résolues **paresseusement** (getters) à partir d'une graine unique `E2E_RUN_ID` ; `.auth/accounts.json` porte sa graine (fichier d'un autre run ignoré) ; garde-fou si la graine manque dans un worker ; trace `[e2e] identités — worker N (pid …)` une fois par process. |
| `frontend/e2e/global-setup.ts` | Pose `E2E_RUN_ID` dans le process principal **avant le fork des workers**, prend le verrou de run, purge `accounts.json`. |
| `frontend/e2e/global-teardown.ts` | **Nouveau** — libère le verrou de run. |
| `frontend/e2e/support/run-lock.ts` | **Nouveau** — un seul run Playwright à la fois par worktree. |
| `frontend/playwright.config.ts` | `workers: process.env.CI ? 1 : 2` (CI inchangée à 1) + `globalTeardown` + commentaire réécrit, qui dit explicitement que 2 n'est **pas encore validé**. |
| `docs/memory/pitfalls.md` | `PIT-S47-004` et `PIT-S64-003` réécrits. |
| `docs/memory/sprints/sprint-47/e2e-local-runbook.md` | Piège #4 réécrit (deux causes, discriminant). |

## Mécanisme retenu, et pourquoi il bat la lecture de fichier

Le diagnostic du briefing était incomplet. Le vrai point n'est pas « les specs importent
`accounts.ts` avant que `setup` ait écrit » : **le projet `setup` est lui-même `fullyParallel`**.
Ses 5 tests (`persist account identities` + 4 `provision <clé>`) se répartissent sur plusieurs
workers, donc **le process qui PERSISTE n'est pas celui qui ENREGISTRE**. La divergence naît donc
*avant* l'écriture du fichier — aucune lecture, si tardive ou si paresseuse soit-elle, ne peut la
rattraper.

D'où le choix : une **graine unique `E2E_RUN_ID`**, posée par le `globalSetup` dans le process
principal, qui s'exécute avant le fork des workers. Playwright forke ses workers avec
`{ ...process.env }` (`runner/index.js`, `child_process.fork`) : la variable est héritée à
l'identique par `setup`, par chaque worker de specs et par chaque retry. Les identités sont
dérivées d'une fonction **pure** de cette graine : il n'y a plus qu'une seule valeur possible par
run, quel que soit l'ordre des imports. La résolution reste paresseuse (getters) pour que même un
import précoce soit inoffensif.

**Preuve directe** (run instrumenté, specs `settings-*`, 23 passed / 1 skipped en 27,6 s) :

```
[e2e] E2E_RUN_ID=5864525561725 (pid 58645)
[e2e] identités — worker 0 (pid 58837) : E2E_RUN_ID=5864525561725
[e2e] identités — worker 1 (pid 58836) : E2E_RUN_ID=5864525561725
[e2e] identités — worker 3 (pid 60047) : E2E_RUN_ID=5864525561725
[e2e] identités — worker 2 (pid 60046) : E2E_RUN_ID=5864525561725
```

Quatre process, quatre `pid`, une seule graine.

## Runs complets (chiffres du lead)

| Run | Résultat | Durée | `settings-*` |
|---|---|---|---|
| 1 | 231 passed / 1 failed / 8 skipped | 7 min 04 | **VERTES** (l'échec est `timeline-mobile.spec.ts:366`, hors périmètre) |
| 2 | 227 passed / 5 failed / 8 skipped | 7 min 38 | ROUGES — **run invalidé, voir ci-dessous** |

Durée de référence à 1 worker (S64) : 9,0 min. L'ordre de grandeur du gain est réel, mais aucune
durée ci-dessus n'est un étalon : la machine était partagée avec d'autres charges.

## Pourquoi le run 2 ne prouve pas que le correctif a échoué

Le run 2 affiche `Expected: "sh7100651484725"` / `Received: "sh7238353220892"` — mot pour mot la
signature de `PIT-S47-004`. Trois faits l'excluent pourtant comme cause :

1. **Aucun des deux garde-fous n'a levé.** Une graine non propagée déclenche l'erreur « `E2E_RUN_ID`
   ABSENTE dans le worker N » ; une divergence intra-run déclenche « identités DIVERGENTES ».
   `grep` sur le log : **0 occurrence des deux**. Le worker avait donc bien une graine — simplement
   pas la même que le `globalSetup` du run observé.
2. **Les deux valeurs sont des graines de `globalSetup` complètes**, pas un repli local dérivé d'un
   `pid`. `7238353220892` est exactement la graine tracée en tête du log. `7100651484725` n'apparaît
   dans **aucune** ligne `E2E_RUN_ID=` des deux logs : elle vient d'un **autre process principal**.
3. **Deux runs Playwright tournaient en même temps dans ce worktree** (le mien en arrière-plan et
   celui du lead). Les logs `M1.log`/`M2.log` en portent la trace : `M1.log` contient **deux
   résumés finaux complets** (`1 failed … (7.0m)` et `10 failed … (8.2m)`), impossible pour une
   invocation unique — les deux process écrivaient dans les mêmes fichiers.

Cause réelle : `e2e/.auth/` est partagé, **identités ET `storageState`**. Le second run réécrit les
cookies du premier, dont les specs se retrouvent authentifiées sur les comptes de l'autre run. Le
mécanisme d'identités n'y peut rien — c'est une ressource d'exécution partagée, pas une course
d'import.

**Correctif apporté** : `e2e/support/run-lock.ts` refuse le second run dès le `globalSetup`, avec la
cause nommée, au lieu de laisser les deux se corrompre. Verrou libéré par le `globalTeardown` ;
un verrou dont le process est mort est reconnu comme résidu et écrasé (un run tué ne bloque pas les
suivants).

**Ma part de responsabilité** : j'ai lancé mes runs en arrière-plan après consigne contraire, ce qui
a créé la concurrence qui a invalidé la mesure. C'est la cause directe des deux campagnes perdues.

## Registers de la suite vs seuil 5/min/IP

Inchangé par ce correctif — aucune identité ajoutée ni retirée :

- `auth.setup.ts` × `ALL_ACCOUNTS` (SHARED, PWD, DEL, PROD) = **4 registers**, joués UNE fois par
  run (le projet `setup` ne se rejoue pas sur retry de test) ;
- `golden-path.spec.ts` : **1 self-register** ;
- aucun autre appelant (`grep` sur `register-submit` dans `e2e/` : ces 2 fichiers seulement).

**Total = 5 registers par run**, pour un `RateLimitingFilter` à **5 req/min/IP** : on est **au
plafond, sans marge**. Ce n'est pas une régression de #469, mais toute identité ajoutée à
`ALL_ACCOUNTS` passera au-dessus du seuil. `auth.setup.ts` amortit le risque par un backoff 429
explicite. En local le conteneur `backend-e2e` pose `RATE_LIMIT_ENABLED=false` : **le plafond ne se
manifeste qu'en CI**.

## Ce qui a été corrigé dans `PIT-S47-004` / `PIT-S64-003`

- **`PIT-S47-004`** disait « toujours `--workers=1` en local » et attribuait l'échec à un
  `accounts.json` « pas partagé à temps ». Réécrit : la signature `Expected/Received` recouvre
  **deux défauts distincts** — (1) identités au scope module, corrigé ici, avec le vrai mécanisme
  (`setup` lui-même `fullyParallel`) ; (2) **deux runs concurrents partageant `e2e/.auth/`**,
  découvert au S65. L'entrée donne le **discriminant** : lire les lignes
  `[e2e] identités — worker N (pid …)` ; graines identiques ⇒ cause (2).
- **`PIT-S64-003`** disait « ne pas rouvrir le parallélisme local ». Réécrit autour de la leçon
  durable : *un correctif qui agit sur l'ordre d'EXÉCUTION ne corrige jamais une dépendance à
  l'ordre d'IMPORT*. Aucune des deux entrées ne déclare le parallélisme « acquis » — il ne l'est pas.

## Ce qui n'a PAS été vérifié

- Les 2 runs consécutifs exigés par l'issue, machine au repos : **non faits**.
- Le comportement du verrou face à un `pid` réutilisé par un process étranger (garde d'âge à 60 min,
  non éprouvée).
- La CI : `workers` y vaut toujours 1, le chemin `CI=true` n'a pas été exercé.
- La cause racine de la mort de `next dev` sous forte charge (#465) reste inconnue — hors périmètre.

## [MEMORY:*] signaux

- **[MEMORY:pitfall]** Deux runs Playwright simultanés dans un même worktree partagent
  `e2e/.auth/` (identités **et** `storageState`) et produisent la signature exacte de
  `PIT-S47-004` pour une cause qui n'a rien à voir. Discriminant : les graines tracées par worker.
  Verrou de run ajouté (`e2e/support/run-lock.ts`).
- **[MEMORY:pattern]** Quand une signature d'échec est connue, vérifier que les **garde-fous
  associés ont levé** avant de conclure à un retour du défaut connu. Ici leur silence prouvait
  l'inverse de la lecture spontanée.
- **[MEMORY:decision]** La graine d'identité E2E passe par l'environnement (`E2E_RUN_ID`, posé
  avant le fork des workers), pas par un fichier : un fichier ne peut pas rattraper une divergence
  née avant son écriture, le projet `setup` étant lui-même `fullyParallel`.
- **[MEMORY:pitfall]** Ne pas lancer de run de mesure en arrière-plan quand un autre agent peut
  mesurer la même ressource : deux campagnes ont été perdues ainsi.

## Recommandations suite

- **RECOMMAND_TEST_RUNNER** — rejouer les 2 runs complets consécutifs, seuls sur la machine, pour
  statuer sur `workers: 2`. C'est la seule chose qui manque.
- Pas de `RECOMMAND_DB_EXPERT` ni de `RECOMMAND_SECURITY` : aucun schéma, aucune surface d'auth
  applicative touchée — le changement est confiné au harnais de test.
- **RECOMMAND_FOLLOWUP** — le budget register est **au plafond** (5/5 par run) : à border avant
  d'ajouter un compte E2E.

## Mesure finale — rejouée par le LEAD, machine au repos (2026-09-02)

Les 2 runs complets **consécutifs** exigés par l'issue, lancés par le lead seul sur la machine,
répertoire de logs unique (`scratchpad/lead-measure-1788365530/`), verrou de run actif :

| Run | Workers | Résultat | Durée | Blocs `Running` dans le log |
|---|---|---|---|---|
| 1 | 2 | **232 passed / 0 failed / 8 skipped** | 3 min 59 | 1 |
| 2 | 2 | **232 passed / 0 failed / 8 skipped** | 3 min 11 | 1 |

`exit=0` sur les deux. Le comptage des blocs `Running N tests using M workers` (=1 par log) atteste
qu'**aucune campagne concurrente** n'a pollué la mesure — c'est précisément le contrôle qui manquait
aux tentatives précédentes.

Les 4 specs `settings-*` sont vertes sur les DEUX runs. Aucune occurrence de la signature
`PIT-S47-004` (`toHaveValue` sur deux graines divergentes).

**Comparaison :** 9 min 0 à `workers: 1` (Sprint 64) → **3–4 min à `workers: 2`**, sans échec.
Le Sprint 64 mesurait 4 min 8 à 2 workers, mais avec 5 échecs : la vitesse était déjà là, la
fiabilité non. C'est elle qui est acquise ici.

**Erreur de mesure du lead, consignée pour la mémoire :** une première campagne du lead avait
rendu 1 puis 5 échecs et conclu à tort que le correctif ne tenait pas. Elle était concurrente d'une
campagne encore vivante du subagent, les deux écrivant dans les **mêmes fichiers de log** d'un
scratchpad partagé et partageant `e2e/.auth/`. Preuve : `M1.log` contenait DEUX résumés finaux
complets (`231 passed (7.0m)` et `222 passed / 10 failed (8.2m)`). Diagnostics erronés du lead :
`find -maxdepth 4` trop court pour atteindre le scratchpad (« pas de logs » ≠ « runs morts ») et
un `ps` tombé dans un intervalle entre deux runs. Le subagent avait raison de réfuter.

## Recommandations suite

- Pas de `RECOMMAND_TEST_RUNNER` : les 2 runs consécutifs ont été joués et lus par le lead (chiffres
  ci-dessus).
- Pas de `RECOMMAND_DB_EXPERT` ni de `RECOMMAND_SECURITY` : aucun schéma, aucune surface d'auth
  applicative touchée — le changement est confiné au harnais de test.
- **RECOMMAND_FOLLOWUP** — le budget register est **au plafond** (5 par run vs seuil 5/min/IP,
  sans marge) : à border avant d'ajouter le moindre compte E2E. Masqué en local
  (`RATE_LIMIT_ENABLED=false`), ne mord qu'en CI.
- **RECOMMAND_FOLLOWUP** — `workers: 2` n'est acquis QU'EN LOCAL. La CI reste à
  `workers: 1` (`process.env.CI ? 1 : 2`) : la viabilité du parallélisme sur le runner CI (une
  seule IP, budget register au plafond) n'est pas démontrée et ne doit pas être supposée.

STATUS: COMPLETED
