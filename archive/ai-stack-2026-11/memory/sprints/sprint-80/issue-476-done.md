# Issue #476 — [CHORE] Démontrer (ou écarter) la viabilité de workers > 1 en CI

**Sprint 80, vague 2** · commit `e491a82` · vérifié par le lead.

## Décision : `workers: 2` ADOPTÉ en CI

`frontend/playwright.config.ts` passe de `workers: process.env.CI ? 1 : 2` à `workers: 2`
(vérifié ligne 223). Gain mesuré : **−2 min 30 sur le job `e2e` (−30 %)**, −40 % sur la suite.

## Mesures (toutes revérifiées par le lead via l'API GitHub)

| run | workers | conclusion | job `e2e` | passe 1 (319) | passe 2 (13) | rouges |
|---|---|---|---|---|---|---|
| `34059902914` contrôle | 1 | success | **8 min 19** | 310 ✓ / 9 skip — 5,5 mn | 13 ✓ | 0 |
| `34059829246` tent. 1 | 2 | success | **5 min 47** | 310 ✓ / 9 skip — 3,3 mn | 13 ✓ | 0 |
| `34059829246` tent. 2 | 2 | success | **5 min 52** | 310 ✓ / 9 skip — 3,4 mn | 13 ✓ | 0 |

Baseline historique `workers: 1` sur `dev` : 8 min 16 / 9 min 26 / 9 min 44
(`34045333129` / `34044726538` / `34032975776`).

**Contrôles anti-faux-vert appliqués** : 0 `ECONNREFUSED` / `NS_ERROR_CONNECTION_REFUSED` (la borne
de charge de #465 tient sur un runner) · compte de tests **identique** aux 3 runs, donc pas de
« did not run » (PIT-S77-020) · **0 flaky**, donc aucun vert acheté par `retries: 2`.

**Le confondant a été isolé.** Le briefing signalait que la vague 1 (#472) allège la sonde de pixels
et pouvait donc expliquer une partie du gain. L'agent a ouvert une **3e PR de contrôle à diff vide**
sur le code du sprint : elle rend **8 min 19**, dans la plage de la baseline ⇒ #472 n'a aucun effet
mesurable sur la durée, et le delta est bien attribuable au parallélisme seul.

## Critères d'acceptation

- [x] Budget `register` traité en premier — #475 livrée et fermée au S79. **Son motif était de plus
      FAUX** (`RATE_LIMIT_ENABLED=false` court-circuite le filtre entier en CI) : le risque de 429
      annoncé par l'issue n'existait pas.
- [x] 2 runs CI consécutifs verts avec `workers: 2` (tentatives 1 et 2 du run `34059829246`)
- [x] Durées consignées et comparées à la baseline
- [x] Décision documentée dans `playwright.config.ts` (le fichier se documente lui-même)

## Fichiers touchés

- `frontend/playwright.config.ts` — `workers: 2` + dossier #476 (tableau, protocole, 3 contrôles,
  limites).
- `.github/workflows/ci.yml` — 2 commentaires qui annonçaient encore `workers: 1`, corrigés.
  **Vérifié par le lead : commentaires seuls, 0 ligne YAML active modifiée.**

## Hygiène des PR jetables (vérifiée par le lead)

- PR **#554** (flip `workers:2`) — CLOSED, branche supprimée
- PR **#555** (contrôle `workers:1`, diff vide) — CLOSED, branche supprimée
- `git ls-remote origin | grep -c throwaway` → **0**

## Signaux mémoire

- `[MEMORY:decision]` CI à `workers: 2` depuis #476. Si `ECONNREFUSED` réapparaît, c'est la cause
  racine de #465 qu'il faut ouvrir — **pas** la valeur qu'il faut rebaisser.
- `[MEMORY:pattern]` Comparer un flip à une baseline prise sur **un autre code** mesure deux
  changements à la fois. Parade jouée ici : une 2e PR jetable à **diff vide** contre la branche
  mesurée, qui isole le confondant pour ~10 min de runner. Les deux tournent en parallèle
  (`concurrency.group` est par `ref`).
- `[MEMORY:pitfall]` `ci.yml` porte `concurrency: cancel-in-progress: true` groupé par ref : pousser
  un commit vide pour « obtenir un 2e run » **annule le 1er**. Le 2e run s'obtient par
  `gh run rerun <id>`, jamais par un push.
- `[MEMORY:pitfall]` Un job `e2e` vert ne vaut que lu à **trois** niveaux : `Running N tests using M
  workers` (le M atteste que le flip a pris), le compte passés/skipped (PIT-S77-020), et **l'absence
  de `flaky`** — `retries: 2` peut transformer une instabilité de charge en succès silencieux.

## Recommandations suite

- Pas de `RECOMMAND_TEST_RUNNER` : mesure en CI, rien à jouer en local.
- Pas de `RECOMMAND_DB_EXPERT` : aucun schéma touché.
- Pas de `RECOMMAND_SECURITY` : aucune surface d'auth touchée.
- ⚠ **Limite assumée et déclarée par l'agent** : le commit `e491a82` lui-même n'est passé en CI dans
  aucune PR. Sa config est fonctionnellement identique à celle de #554 (`2` dans les deux
  environnements) et charge bien 319 tests en 40 fichiers (`--list` joué) — mais **la PR de sprint
  est ce qui le vérifiera réellement**. À surveiller en Phase 9.
- **Pour #408 (vague 3)** : la CI est désormais à **2 workers**, `retries: 2` inchangé.

## RECOMMAND_FOLLOWUP

1. `timeout-minutes: 45` du job `e2e` est calibré sur une référence de 13 min 14 **antérieure à
   #462** ; la durée réelle est maintenant de 5-6 min. Resserrer (~20 min) pour que le plafond
   redevienne un garde-fou utile. [triage XS] [infrastructure]

STATUS: COMPLETED
