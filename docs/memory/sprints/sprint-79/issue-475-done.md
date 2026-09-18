# Issue #475 — budget `register` de la suite E2E

## PRÉMISSE DE L'ÉNONCÉ : RÉFUTÉE

L'issue affirme : « le budget est consommé à 100 %, sans marge » en CI, « masqué en local
(`RATE_LIMIT_ENABLED=false`) : il ne se manifeste qu'en CI ».

MESURE QUI TRANCHE — `.github/workflows/ci.yml:294`, step « Start backend (profils dev+e2e) » :

```yaml
RATE_LIMIT_ENABLED: false
```

`RateLimitingFilter.doFilterInternal` court-circuite AVANT toute lecture de la table de
limites quand ce flag est faux. Le job CI `e2e` — celui-là même que l'issue désigne — tourne
donc SANS aucun plafond. Idem pour le service `backend-e2e` (`docker-compose.yml:168`).

Conséquences :
- il n'y a pas « 5 pour 5 en CI » : il y a 0 plafond en vigueur, en CI comme en local ;
- le défaut n'est PAS masqué en local et révélé en CI : il est masqué PARTOUT ;
- le compte réel par job CI n'est d'ailleurs pas 5 mais **9** (passe 1 = 4 `setup` + 1
  golden-path ; passe 2 `auth.setup.ts auth-signature.spec.ts` = 4 `setup` de nouveau,
  ci.yml:566), jusqu'à 11 avec `retries: 2`. Si le filtre était armé à 5, la suite serait
  DÉJÀ rouge aujourd'hui — la preuve la plus directe qu'il ne l'est pas.

CE QUI EST VRAI dans l'issue : le budget nominal d'une passe vaut bien 5 pour un plafond
PAR DÉFAUT de 5. Le chiffre est juste ; c'est la conclusion « ça tient tout juste en CI »
qui est fausse, parce que le plafond cité n'était pas en vigueur.

DÉGÂT COLLATÉRAL MESURÉ : l'affirmation fausse était PORTANTE. `playwright.config.ts`
justifiait `workers: 1` en CI par « le budget register est DÉJÀ au plafond (5 par run vs
5/min/IP) ». Un faux obstacle bloquait une décision de parallélisme.

## Piste retenue : seuil dédié au profil `e2e`

Les deux autres pistes sont écartées (et pourquoi) :
- **exempter l'IP du runner** : le filtre est déjà TOTALEMENT désarmé en E2E, ce qui est pire
  qu'une exemption d'IP. Aller plus loin dans cette direction n'a plus de sens.
- **mutualiser SHARED et PROD** : réintroduit l'entrelacement que `accounts.ts` documente
  avoir voulu éviter, et casse #463 (vague 2) avant qu'elle commence.

## Chiffres

| | |
|---|---|
| `register` par run (nominal, 1 passe) | **5** = 4 `ALL_ACCOUNTS` + 1 auto-inscription golden-path |
| Seuil par défaut (prod, dev, test) | **5**/min/IP — INCHANGÉ |
| Seuil profil `e2e` (#475) | **20**/min/IP |
| **Marge** | **20 − 5 = 15** inscriptions/minute |

Le plafond reste un plafond : la 21e requête d'une minute prend un 429 (asserté).

## Implémentation

- `backend/.../security/RateLimitingFilter.java` — slot `register` rendu configurable
  (`app.rate-limit.register-per-minute`). `@Value(":#{null}")` volontaire : le défaut vit dans
  la seule constante `DEFAULT_REGISTER_PER_MINUTE`, jamais dupliqué dans un littéral de
  placeholder. Refus au boot si < 1. Justification (POURQUOI ce slot et pas les autres, ce que
  ça remplace, ce que ça ne fait PAS) écrite dans la javadoc du champ.
- `backend/src/main/resources/application-e2e.properties` — NOUVEAU. Porte `=20` + le calcul.
- `backend/src/main/resources/application.properties` — pointeur commenté vers la propriété.
- `backend/.../RegisterRateLimitDefaultIntegrationTest.java` — NOUVEAU. Le défaut 5 n'était
  asserté NULLE PART (l'existant n'exerce que `login`).
- `backend/.../RegisterRateLimitE2eProfileIntegrationTest.java` — NOUVEAU. Profils `test,e2e`
  réels : prouve que `application-e2e.properties` est chargé et atteint le filtre.
- `frontend/src/__tests__/e2e-register-budget.test.ts` — NOUVEAU. Recompte le budget depuis les
  SOURCES (`ALL_ACCOUNTS` + occurrences de register dans les specs) vs le plafond backend.
- `frontend/e2e/support/accounts.ts`, `frontend/e2e/auth.setup.ts`,
  `frontend/playwright.config.ts` — commentaires faux corrigés (« 3 comptes » -> 4 ; « on reste
  sous le rate-limit » -> marge chiffrée ; argument `workers: 1` réfuté).

## Vérifications (ce qui a réellement tourné)

- `./scripts/test-quiet.sh backend` -> **577 tests, 0 échec** (573 + 4 nouveaux).
- `./scripts/test-quiet.sh frontend-unit` -> **1316 tests / 114 fichiers, 0 échec**.
- `npx tsc --noEmit` -> 0 erreur. `npx next lint` -> 0 erreur / 0 warning.
- **ARMEMENT PROUVÉ, les deux gardes** (une garde que rien ne fait rougir est un commentaire) :
  - propriété neutralisée dans `application-e2e.properties` -> le test backend rougit sur
    `register #6 must pass under the e2e ceiling of 20 ... expected: not equal but was: <429>` ;
  - plafond ramené à 5 -> le test frontend rougit avec le compte exact :
    `Budget register de la suite = 5 pour un plafond e2e de 5 (marge 0, minimum exigé 5)` /
    `projet setup (ALL_ACCOUNTS) : 4` / `specs : 1 {"golden-path.spec.ts":1}`, soit une
    reproduction littérale de l'état d'avant #475.

## CE QUI N'A PAS ÉTÉ FAIT / VÉRIFIÉ — à lire avant de conclure

1. **Le filtre n'est PAS re-armé en E2E.** `RATE_LIMIT_ENABLED=false` reste en place dans
   ci.yml et docker-compose.yml. Cette issue rend le re-armement POSSIBLE (le slot register a
   désormais une marge) ; elle ne le fait pas. Retirer ce flag suppose de recompter le budget
   du slot `login` (10/min/IP : 4 connexions du `setup` + celles des specs) — NON MESURÉ ici.
2. **Aucun run Playwright joué.** Délibéré : le rate-limit est désarmé dans la stack E2E, un
   run vert n'aurait rien prouvé sur le budget (piège explicite du briefing). Les changements
   frontend sont exclusivement des commentaires + un test Vitest.
3. **`next build` non joué** (arbre de travail partagé, PIT-S62-009). tsc + lint + vitest
   couvrent le seul fichier TS ajouté, qui est un test — non compilé par le build.
4. **`npm ci` exécuté dans `frontend/`** de ce worktree (node_modules absent). Ne touche pas
   `package-lock.json`.
5. Le compte des registers par spec repose sur une heuristique de grep (`register-submit` +
   `/api/auth/register`) : elle sur-compte une soumission en boucle et sous-compte une
   construction dynamique d'URL. Documenté dans le test. Le but est qu'aucun ajout ne passe
   inaperçu, pas un compteur runtime exact.

## Signaux mémoire

[MEMORY:pitfall] Context: #475 décrit un budget rate-limit « à 100 % sans marge en CI ». Le job
CI `e2e` pose en réalité `RATE_LIMIT_ENABLED=false` (ci.yml:294), qui court-circuite le filtre
ENTIER — aucun plafond n'y est en vigueur. L'énoncé avait été écrit à partir des COMMENTAIRES du
harnais E2E, pas d'une mesure. Solution: lire la config de la stack qui exécute réellement la
suite (workflow + docker-compose) AVANT de croire un budget annoncé par un commentaire de code.
Prevention: un budget qu'aucun test ne recompte n'est pas un budget ; il dérive et l'issue qui en
naît est fausse dès sa première ligne.

[MEMORY:pitfall] Context: le chiffre faux « 5 registers pour un plafond de 5 » avait essaimé dans
3 fichiers (`accounts.ts`, `auth.setup.ts`, `playwright.config.ts`) et servait D'ARGUMENT pour
maintenir `workers: 1` en CI. Solution: quand on réfute un chiffre, greper toutes ses copies et
vérifier ce que chacune JUSTIFIE. Prevention: une valeur recopiée dans un 3e fichier est déjà une
décision qui s'appuie dessus.

[MEMORY:decision] Context: donner de la marge au slot `register` sans désarmer le filtre.
Decision: rendre le seul slot `register` configurable (`app.rate-limit.register-per-minute`,
défaut 5 inchangé partout) et le porter à 20 dans un nouveau `application-e2e.properties`.
Why: c'est le seul endpoint throttlé qu'une suite automatisée doit légitimement marteler depuis
une IP unique ; les autres slots modélisent des abus qu'aucun test n'a besoin de reproduire en
masse. Exempter l'IP ou désarmer le filtre supprimerait le symptôme en supprimant ce que la
suite est censée traverser.

[MEMORY:pattern] Problem: un défaut numérique dupliqué entre une constante Java et un littéral de
placeholder `@Value("${x:5}")` diverge en silence. Solution: injecter un `Integer` avec
`@Value("${x:#{null}}")` et retomber sur la constante — un seul exemplaire du défaut, et un test
d'intégration l'assert. Anti-pattern: recopier le défaut dans le placeholder « pour la lisibilité »
et laisser un commentaire demander de les garder synchronisés.

## Recommandations suite

- `RECOMMAND_FOLLOWUP_ISSUE` — re-armer `RateLimitingFilter` dans la stack E2E (retirer
  `RATE_LIMIT_ENABLED=false` de ci.yml et docker-compose.yml) après avoir mesuré le budget du
  slot `login` (10/min/IP). Aujourd'hui la suite ne traverse aucun rate-limit : c'est un pan
  entier de la chaîne de sécurité que les E2E n'exercent jamais.
- Pas de `RECOMMAND_TEST_RUNNER` : les deux suites ont été jouées ici (577 backend, 1316
  frontend), aucune n'a rougi, aucun run Playwright n'était pertinent (cf. § non-fait n°2).
- Pas de `RECOMMAND_DB_EXPERT` : aucune migration, aucun changement de schéma ou de requête.
- Pas de `RECOMMAND_SECURITY_EXPERT` : le seuil de production est inchangé (5) et asserté pour
  la première fois. Le point sécurité réel est le follow-up ci-dessus, déjà signalé.

STATUS: COMPLETED
