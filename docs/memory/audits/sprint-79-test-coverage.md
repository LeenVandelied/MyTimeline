# Audit tests — Sprint 79

> Généré en fin de Phase 6, complété après le cycle 2 de review. Aucune lacune de couverture ouverte.
> Sprint « causes racines du harnais E2E » : trois issues d'outillage, **aucune BR fonctionnelle
> modifiée**. La couverture pertinente n'est donc pas « quelle BR est testée » mais **« quelle garde
> a été vue rougir »** — c'est ce que ce tableau documente.

## Couverture par issue

| Issue | Objet | BR touchée | Unit backend | Intégration backend | Unit frontend | E2E | Garde armée (vue rougir) |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| #428 | CORS dev surchargeable | aucune | ⚠ N/A | ✅ `CorsAllowedOriginsConfigIntegrationTest` (7 cas) | ⚠ N/A | ⚠ N/A (délibéré) | ✅ |
| #475 | plafond `register` profil e2e | aucune | ⚠ N/A | ✅ `RegisterRateLimitDefaultIntegrationTest` + `RegisterRateLimitE2eProfileIntegrationTest` | ✅ `e2e-register-budget.test.ts` | ⚠ N/A (délibéré) | ✅ |
| #463 | purge post-test des semis | aucune | ⚠ N/A | ⚠ N/A | ✅ `seed-cleanup-outcome.test.ts` | ✅ 3 runs complets + `seed-cleanup-guard.spec.ts` | ✅ |

Aucun flux cross-system nouveau : le sprint ne crée aucun parcours métier. Les `⚠ N/A` sont
justifiés, pas des trous — voir « Ce qui n'est délibérément pas testé » plus bas.

## Les gardes, et ce qu'elles ont fait quand on les a armées

C'est le livrable central du sprint. Une garde non exercée n'est pas une garde — deux reviewers
indépendants ont ouvert un MAJEUR sur ce motif, traité au cycle 2 (`1f6ac24`).

| Garde | Armée par | Message d'échec réel observé | Désarmée |
|---|---|---|---|
| Défaut `register` = 5 hors profil e2e | boot sans profil `e2e` | 6e inscription → **429** | 5 passent |
| Plafond `e2e` = 20 | `@ActiveProfiles("e2e")` | 21e inscription → **429** | 20 passent |
| Plafond lu depuis la config (P3) | mutation du plafond 20 → 8 | `expected: <20> but was: <8>` | 3 verts |
| Détection des helpers émetteurs (P1) | `findRegisterHelpers` → `[]` | `expected [] to include 'registerOnly'` | 10 verts |
| Budget sous le plafond (P1) | `MIN_MARGIN=99` | `Budget = 8 pour plafond 20 (marge 12)` | vert |
| `throw` de la purge (P2) | purge forcée en échec | `Error: #463 — la purge post-test a échoué (1) : purge produit not-a-uuid : 400 (attendu 204 ou 404)` | 13 passed |
| Branche `warn` (P2) | décision extraite, testée en isolation | `expected 'warn' to be 'fatal'` | 4 verts |
| Non-transposition du CORS en prod | grep littéral sur `application-prod.properties` | échouerait si transposition | vert |

L'assertion `20 - 5 == 15` livrée au cycle 1 serait restée **verte** sur la mutation du plafond.
C'est la démonstration, sur ce sprint même, que le motif visé est réel.

## Le chiffre corrigé — deux valeurs contradictoires ont existé dans le dépôt

#475 a été livrée en annonçant **budget 5, marge 15**. C'est **faux**. Le compteur ne lisait que
`e2e/*.spec.ts` et ratait trois inscriptions passant par l'helper `e2e/support/auth.ts#registerOnly`.

Recompté depuis les sources, et **revérifié indépendamment par un reviewer** :

```
4  ALL_ACCOUNTS (SHARED, PWD, DEL, PROD) — auth.setup.ts
1  golden-path.spec.ts (auto-inscription directe)
1  forgot-password.spec.ts        via registerOnly
2  reset-password-failures.spec.ts via registerOnly
────
8  inscriptions par passe nominale, pour un plafond e2e de 20 → marge 12
```

Les commentaires de `application-e2e.properties`, `playwright.config.ts`, `accounts.ts` et
`auth.setup.ts` qui répétaient « 5 / marge 15 » ont été corrigés. **La valeur de configuration (20)
n'a pas bougé** : c'est la documentation qui mentait, pas le code.

## Résultats des runs

**HEAD final, mesuré après le cycle 2**
- Backend : **577 / 577**, 0 échec.
- Frontend unitaire : **1327 / 1327** (115 fichiers), 0 échec, `tsc --noEmit` 0 erreur.
- `format:check` (prettier, bloquant en CI depuis le S78) : vert.
- Playwright ciblé (garde de purge + products + categories) : **13 passed**, exit 0.

**Runs E2E complets de #463** (318 tests, `workers: 2`, chromium, backend conteneur `:8086`)

| run | passed | failed | skipped | durée | état laissé sur `PROD` |
|---|---|---|---|---|---|
| baseline (correctif retiré) | 297 | 12 | 9 | 5 min 49 | **81 produits / 88 catégories** |
| nominal | 299 | 10 | 9 | 5 min 30 | **0 produit / 7 catégories** |
| fichiers en ordre inversé | 299 | 10 | 9 | 5 min 57 | **0 produit / 2 catégories** |

Jeu d'échecs **identique** entre les runs nominal et inversé.

**Les 10 échecs communs sont structurels et locaux.** Vérifié par le lead : le dépôt contient
exactement **10 références `chromium-linux` et zéro `darwin`** pour `sprint-77-theme-visual`.
L'échec est impossible en CI (Linux) et ne peut pas être « réparé » en local sans graver une
mutation de plateforme dans les références — `--update-snapshots` a été explicitement interdit aux
agents pour cette raison.

## Ce qui n'est délibérément PAS testé, et pourquoi

- **#428 et #475 sans run E2E.** Pour #428, la preuve exigée était un test d'intégration Spring.
  Pour #475, un run local n'aurait **rien** prouvé : le rate-limit y est désarmé.
- **Le filtre n'est pas re-armé en E2E.** `ci.yml:294` pose `RATE_LIMIT_ENABLED: false`, qui
  court-circuite le filtre entier (`RateLimitingFilter:329`). Le re-armer suppose de recompter
  d'abord le slot `login` (10/min/IP), non mesuré. La propriété livrée est une condition
  **nécessaire** au re-armement, pas le re-armement.
- **Ordre intra-fichier non permuté.** Playwright 1.61 n'a pas de `--shuffle` et ignore l'ordre des
  fichiers en CLI. Le run « inversé » a été obtenu en renommant 37 specs. La preuve repose donc sur
  la **mesure d'état** (81 → 0), pas sur la permutation.

## Réserves non levées

- **`products.spec.ts:33`** : rouge 1 fois sur 3, vert ensuite. **Non attribué** — l'agent a refusé
  de l'étiqueter « pré-existant » sans run sur la base, ce qui est la bonne posture.
- **Un `[setup] provision`** rouge une fois, vert au rejeu, **zéro `429`** dans le log backend.
- **Aucun run CI observé.** Les E2E ont tourné en local (macOS, `workers: 2`) ; la CI tourne sous
  Linux à `workers: 1`.
- **Firefox non exécuté**, `next build` non joué (arbre partagé).
- **Angle mort résiduel du compteur** : un locator construit depuis une variable, ou un helper écrit
  en `export const f = async () =>` plutôt qu'en `export function`, échappe encore à la détection.
  Documenté dans le code, figé par un test qui asserte 0 — limite assumée, pas masquée.
- **Effet de bord poste** : la base locale `eventmanager` ne migre plus (`V7` casse sur
  `events_recurrence_unit_check`) ; une base `eventmanager_s79` a été créée et **non supprimée**
  (opération destructive, hors mandat d'un agent).

## Conclusion

**Prêt pour PR.** 0 CRITIQUE, 0 MAJEUR ouvert. Deux MAJEURS de cycle 1 traités et le commit
correctif lui-même relu (MERGEABLE). Audit sécurité : **SÛR**. Review E2E : **preuve solide**.
Aucune lacune de couverture ouverte.
