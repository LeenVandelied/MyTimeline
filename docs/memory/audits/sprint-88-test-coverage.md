# Audit tests — Sprint 88

> Phase 6, finalisé par le lead le 2026-09-14, avant l'ouverture de la PR. Un marqueur de manque bloquant (cf. gabarit du skill) empêcherait la PR ; aucun n'est posé ici.

## Couverture par règle / risque

Aucune BR métier n'est impactée : le sprint « harnais de confiance » touche la config de test, la documentation et le rate-limit d'infrastructure.

| Sujet | Cross-system flow | Unit backend | Integration | Vitest frontend | E2E parcours | E2E métier |
|-------|:---:|:---:|:---:|:---:|:---:|:---:|
| #568 dump MockMvc sans JWT (dépôt public) | NON | N/A | ✅ contrôle négatif local 2→0→2 `eyJ`, sur la sortie standard ET les `surefire-reports` (non versionné, par construction) | N/A | N/A | N/A |
| #545 base locale bloquée à V7 (doc) | NON | N/A | ✅ Flyway V1..V15 sur Postgres 16 vierge + reproduction de la cause sur un schéma V6 à CHECK hors Flyway ; job CI `flyway-smoke` | N/A | N/A | N/A |
| #547 plafonds e2e (login 30, reset-password 15, register 30 ; défauts prod 10/5/5) | OUI (navigateur → proxy Next → backend) | ✅ `RateLimitTunableCeilingTest` (0 / négatif / absent / > défaut) | ✅ `RateLimitDefaultCeilingsIntegrationTest`, `RateLimitE2eProfileIntegrationTest`, `RateLimitingDisabledIntegrationTest` | ✅ `e2e-rate-limit-budget.test.ts` (5 créneaux × 2 passes CI × retries, boucles × borne, borne illisible = échec) | ✅ suite complète locale, filtre ARMÉ | ✅ `rate-limit-armed.proof.ts` (projet Playwright dédié, `retries: 0`, 429 via le proxy Next, XFF forgé ignoré) |
| #547 garde prod (boot refusé si plafond > défaut ou illisible, hexa décodé comme Spring) | NON | ✅ `ProfileSafetyGuardTest` (+14 cas dont `0x3E8`, `#A`, illisible en prod ; hors prod inchangé) | N/A | N/A | N/A | N/A |
| #547 register du setup ré-émis seulement sur échec de requête (201 tardif = succès) | OUI | N/A | N/A | ✅ table de statuts + cas « 201 tardif » + contrat de boucle annotée | ✅ `setup` + `golden-path` sur pile jetable, filtre armé (register 4 × 201 puis 5 × 201, 0 × 409 / 429 / 5xx) | N/A |

## Tests créés / modifiés
- `backend/src/test/resources/application-test.properties` (#568, config)
- `backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitDefaultCeilingsIntegrationTest.java` (remplace `RegisterRateLimitDefaultIntegrationTest`)
- `backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitE2eProfileIntegrationTest.java` (remplace `RegisterRateLimitE2eProfileIntegrationTest`)
- `backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitTunableCeilingTest.java`
- `backend/src/test/java/com/matimeline/eventmanager/infrastructure/config/ProfileSafetyGuardTest.java` (cas ajoutés)
- `frontend/src/__tests__/e2e-rate-limit-budget.test.ts` (remplace `e2e-register-budget.test.ts`)
- `frontend/e2e/rate-limit-armed.proof.ts`

## Résultats runs
Chiffres déclarés par les agents et relus dans les done.md ; le lead ne les a PAS rejoués. La CI de la PR fait foi.
- Backend : 603 tests / 0 échec (dernier état, `30ecdc8`)
- Frontend : Vitest 1553 / 0 ; tsc, lint et format:check conformes ; `gen-pit-packs.sh --check` exit 0
- E2E locale complète (darwin, `--ignore-snapshots`, pile fraîche, filtre armé, avant les correctifs de revue) :
  - passe 1 : 374 passés / 1 échec attendu (`sprint-77-theme-visual:620`, référence darwin absente) / 1 flaky (`sprint-84-palette:128`, focus clavier, aucune requête throttlée) / 8 sautés
  - passe 2 : 5 / 0 / 8
  - preuve seule : 1 passé
  - 0 × 429 hors créneau sondé
- E2E locale ciblée, après les correctifs : `setup` 5 passés, `golden-path` 6 passés, specs d'auth 29 passés
- CI : 3 runs verts consécutifs exigés par le dev sur le SHA de tête de la PR — voir le body de la PR et `sprint-history.md`

## Revues
- reviewer cycle 1 : 0 CRITIQUE / 0 MAJEUR / 6 MINEUR, tous corrigés
- security-expert : 0 / 0 / 3 MINEUR ; n°1 et n°2 corrigés, n°3 antérieur au sprint → follow-up
- reviewer cycle 2 : 0 / 0 / 5 MINEUR ; n°1, n°3 et n°4 corrigés et relus par le lead ; n°2 et n°5 → follow-ups

## Limites connues
- La preuve d'armement dépend des autres projets Playwright : un échec amont la rend « non exécutée ». Le job est alors déjà rouge, mais il faut vérifier à chaque run CI qu'elle est `passed`.
- forgot-password (9/5) et change-password (6/5) restent à leurs défauts : dépassement possible seulement sur double retry d'un test déjà en échec (arbitrage dev, option D).
- Register peut atteindre 36/30 si le backend renvoie des 5xx pendant le setup (ré-émissions sur échec). Documenté comme symptôme d'instabilité, pas comme défaut de budget.
- Le projet `setup` tourne sans retry Playwright (arbitrage dev) : un aléa du setup rougit le job e2e.
- Le 201 tardif n'a pas été provoqué en E2E (aucune latence injectée) : il est couvert par test unitaire seulement.

## Conclusion
Prêt pour PR. Le merge reste conditionné aux 3 runs CI verts avec la preuve d'armement `passed`.
