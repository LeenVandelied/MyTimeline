# Audit tests — Sprint 81

> Généré en fin de Phase 6 par le lead, sur le HEAD du sprint (`ad2c878`).
> Toutes les suites ci-dessous ont été **jouées**, pas raisonnées.

## Couverture par issue

| Issue | Objet | Unit backend | Intégration | Vitest frontend | E2E parcours | Verdict |
|---|---|:---:|:---:|:---:|:---:|---|
| #500 | Instrumentation du flaky `AuthControllerLegacyPasswordLoginTest` | ⚠ N/A | ✅ 3 tests instrumentés | ⚠ N/A | ⚠ N/A | Couvert — l'instrumentation est **prouvée par un run volontairement rouge** |
| #499 | Rate-limit `POST /api/me/avatar` (10/min/IP) | ⚠ N/A | ✅ 4 tests (`RateLimitingAndHeadersIntegrationTest`) | ⚠ N/A | ⚠ désarmé | Couvert — **contrôle négatif joué** |
| #215 | Upload avatar multipart cassé (415) | ⚠ N/A | ⚠ N/A | ✅ `apiClient.multipart.test.ts` (nouveau) | ✅ `settings-profile.spec.ts` dégelé | Couvert — garde **vérifiée rouge** sans le fix |

Aucune BR-* nouvelle ni modifiée. #499 et #215 sont des corrections (sécurité et bug),
#500 est un instrument de mesure. Aucune migration Flyway.

## Tests créés / modifiés

- `backend/src/test/.../controllers/AuthControllerLegacyPasswordLoginTest.java` — helpers
  `diagnostic(MvcResult, username)` + `assertLoginSucceeded(...)` sur les 4 sites HTTP ; messages en
  `Supplier` (la sonde DB ne s'exécute que sur échec) ; dump statut + corps + en-têtes, **valeurs de
  `Set-Cookie`/`Authorization`/`Cookie` masquées** (commit `28c0091`, cf. Phase 7).
- `backend/src/test/.../security/RateLimitingAndHeadersIntegrationTest.java` — 4 tests : nominal sous
  quota, 11e → 429 JSON, réarmement via `clock.advance(61 s)`, bucket indépendant de `PATCH /api/me`.
  Zéro `Thread.sleep`.
- `frontend/src/services/apiClient.multipart.test.ts` — **nouveau** ; `apiClient` n'avait aucun test unitaire.
- `frontend/e2e/settings-profile.spec.ts` — `test.fixme` retiré, bloc FIXME de 10 lignes réécrit.

## Contrôles négatifs (ce qui distingue un test qui mord d'un faux vert)

Les trois vagues ont chacune prouvé que leur garde échoue quand le défaut revient :

1. **#500** — patch jeté (non commité) forçant 3 échecs ; les 3 messages sont exploitables
   (`statut=401 corps={"error":"unauthorized"} lignes=1`, `statut=401 lignes=0`,
   `statut=429 corps={"error":"too_many_requests"}`).
2. **#499** — slot renommé `avatar-DISABLED` → les 2 tests de dépassement rougissent
   (`expected: <429> but was: <401>`), fichier restauré. Indispensable ici : le filtre court-circuite
   avant l'authz, **tout est déjà non-429**, un test mal écrit serait vert par construction.
3. **#215** — fix retiré → le test unitaire multipart rougit.

## Résultats des runs (lead, HEAD `ad2c878`)

- **Backend** : `Tests run: 581, Failures: 0, Errors: 0, Skipped: 0` — BUILD SUCCESS.
- **Frontend (scope complet : build → vitest → typecheck → lint)** : ✅ tout vert.
  Vitest : **116 fichiers, 1330 tests passés**. `next lint` : 0 warning.
- **E2E local (suite complète, serveur webpack `:3000` + backend conteneurisé `:8086`)** :
  **300 passed · 8 skipped · 11 failed en 8 min 36**.

### Les 11 rouges E2E — imputation vérifiée, PAS supposée

Tous dans `sprint-77-theme-visual.spec.ts`, et **aucun n'est imputable à ce sprint** :

- **10 sont structurels sur macOS** : les références visuelles sont committées en
  `-chromium-linux.png` (générées en conteneur `playwright:v1.61.1-jammy` pour être comparables à la
  CI `ubuntu-latest`). Le dépôt ne porte aucune référence `-darwin`. Contrôle : le run a écrit
  **exactement 10** fichiers `*-chromium-darwin.png` — le compte correspond au chiffre déjà consigné
  par l'audit du **Sprint 80** (« 10 rouges structurels, ce n'est pas un flake et ce n'est pas une
  régression du sprint »). Ces 10 PNG **ne doivent pas être committés** (avertissement explicite dans
  la javadoc de la spec) — ils sont laissés **non suivis** (jamais `git add`). Leur suppression du
  disque est en attente d'arbitrage du dev : les laisser arme un faux vert pour la prochaine session
  macOS, les supprimer est sans risque (un rejeu les régénère).
- **Le 11e** (`armement de la comparaison › une mutation typographique du hero fait ROUGIR la
  comparaison`) a échoué **avant toute comparaison**, dans `prepare` : le poll d'opacité du hero
  (`.section-animation`) n'atteint pas `> 0.99` en 10 s sous la charge de la suite complète.
  Rejoué seul à chaud : **vert en 4,3 s**. Même famille que le flake de compilation à froid déjà
  documenté pour `products.spec.ts` au S80.
  ⚠ **Réserve à assumer** : ce rejeu vert est aussi permis par les références `-darwin` que le run
  précédent venait d'écrire. Il établit que `prepare` n'est pas cassé, pas que la comparaison
  d'armement serait verte sur un poste vierge.

**La baseline E2E locale n'est donc pas verte, et ne peut pas l'être sur macOS** — constat déjà porté
par les audits S79 et S80. La CI (Linux) fait foi.

## Coverage E2E (heuristique `review-protocol.md` A.4)

`[COVERAGE-E2E] OK` — aucun nouveau `data-testid` dans le diff du sprint.
Vérification **inverse** faite en plus (le check A.4 ne prouve qu'une citation, pas une exécution) :
la spec dégelée exerce réellement 7 testids avatar (`avatar-upload`, `avatar-input`, `avatar-cropper`,
`avatar-zoom`, `avatar-confirm`, `avatar-delete`, `avatar-error`) — ils passent de **cités** à
**exécutés**, ce qui est précisément l'objet de #215.

## Ce qui reste ouvert / non vérifié

1. **#500 n'est pas résolue** — le flaky n'a pas été reproduit (4 runs, 4 conteneurs neufs). Seul le
   mécanisme de capture est livré. **L'issue doit rester ouverte** à la clôture.
2. **#499 — aucun test ne prouve le 200 nominal authentifié sous quota.** Comme tous les slots de
   cette classe, les requêtes sous la limite repartent en 401 (pas de session fabriquée). Le critère
   « comportement nominal non affecté » est couvert par le fait que le bucket ne se déclenche qu'au
   11e appel, pas par une assertion sur un upload réussi.
3. **#499 — la valeur 10/min/IP n'est adossée à aucune télémétrie réelle**, seulement à l'alignement
   sur le palier « édition de profil » existant.
4. **#215 — le 401 du run CI 28753470777 n'a pas été reproduit.** Le 415 mesuré explique entièrement
   le symptôme observable (`<img>` count 0), mais l'écart entre le 401 historique et le 415 mesuré
   n'est pas expliqué. Follow-up : si un 401 avatar réapparaît en CI, rouvrir **avec capture du corps**.
5. **La CI n'a pas encore vu le HEAD exact du sprint** — la PR le corrige par construction ; à
   surveiller avant merge (les 4 checks requis : backend, frontend, e2e, ai-env-packs).

## Conclusion

**Prêt pour PR** (verdict de Phase 6, avant review — voir Phase 7 ci-dessous pour le verdict final).
Aucun `[MISSING]`. Les trois gardes livrées ont été vérifiées rouges sans leur correctif, ce qui est
le seul contrôle qui distingue une couverture réelle d'une couverture citée.

---

## Phase 7 — Review batch (3 relecteurs, HEAD `ad2c878`)

| Relecteur | Verdict initial | Constats |
|---|---|---|
| `reviewer` (code) | MERGEABLE | 9 `[OK]`, 1 `[MINEUR]` |
| `security-expert` | **OBJECTION** | 1 `[MAJEUR]`, 1 `[MINEUR]` transverse, 8 `[OK]` |
| `playwright-reviewer` | **CORRECTIONS REQUISES** | 1 `[MAJEUR]`, 2 `[MINEUR]`, 5 `[OK]` |

Les deux MAJEURS ont été **vérifiés dans le code par le lead** avant correction (pas pris pour argent
comptant), puis corrigés. Cycle 2 : les deux commits de correction sont eux-mêmes couverts par un
contrôle négatif, conformément à `[[sprint-review-cycle-2-avant-pr]]`.

### MAJEUR 1 (sécurité) — fuite de JWT dans les logs CI — commit `28c0091`

`headersOf()` dumpait TOUS les en-têtes de réponse dans le message d'échec JUnit. Or
`assertLoginSucceeded` échoue aussi sur « statut 200 mais cookie `jwt` absent/vide » : une réponse
portant un `Set-Cookie` avec un JWT RS256 valide pouvait donc être publiée. **Le dépôt est PUBLIC.**

Correctif : masquage de `Set-Cookie` / `Authorization` / `Cookie` en `<nom: N caractères masqués>`.
**Contrôle négatif joué** (run forcé rouge) : `Set-Cookie=[<jwt: 636 caractères masqués>]`.

> ⚠ **LIMITE DU CORRECTIF — découverte PAR le contrôle négatif, pas par la review.**
> Le même run rouge contenait **2 JWT en clair supplémentaires**, émis par le dump automatique de
> Spring Boot (`@AutoConfigureMockMvc` imprime l'échange complet sur échec) :
> `Set-Cookie:"jwt=eyJhbGciOiJSUzI1NiJ9..."`. Il est imprimé **à côté** du message masqué.
> Le correctif assainit donc le message que le sprint possède, pas la fuite complète.
> **Imputation vérifiée, pas supposée** : `@AutoConfigureMockMvc` était déjà sur cette classe au
> commit de base du sprint (`git show 13d6dfc:…`), **17 classes de test** la portent, et aucune
> propriété `spring.test.mockmvc.print` n'est posée nulle part. C'est **pré-existant et transverse**.
> → **Follow-up dédié** (arbitrage repo-wide : `MockMvcPrint.NONE` prive de diagnostic 17 classes).

### MAJEUR 2 (Playwright) — asymétrie du DELETE — commit `3363639`

La moitié « upload » arme `waitForResponse` sur le POST **et** le resync `/me` (15 s). La moitié
« suppression » n'avait qu'un `toHaveCount(0)` nu, au timeout par défaut (5 s), pour couvrir
`DELETE` + `refreshUser()` + `invalidateQueries`. Le fichier étant en `mode: 'serial'` sur le compte
**partagé** dont il MUTE l'avatar, une expiration laisse un avatar résiduel : c'est l'assertion
d'ouverture du **run suivant** qui rougit — un échec déporté. La CI tourne à `workers: 2` (#476).

Correctif : symétrie complète, `waitForResponse` sur le DELETE (assert **204** — l'endpoint est
idempotent, pas de 404 possible) et sur le resync, 15 s des deux côtés.
**Vérifié** : 3 passes vertes (8/8, 11-15 s) + contrôle négatif (attente mutée → 1 `unexpected`).

### MINEURS non traités (assumés)

- `apiClient.multipart.test.ts` — le `Content-Type` réel n'est pas asserté à la couche mock ; la
  vérification repose sur la seule spec E2E. Acceptable : le vrai navigateur la couvre.
- `RateLimitingFilter` — un anonyme peut consommer le bucket d'une IP partagée (NAT) et gêner des
  utilisateurs légitimes. **Transverse aux 11 slots, pas introduit par #499**, et déjà nommé par le
  commentaire du fichier (« shared-NAT users »). Trade-off documenté.

## Runs après corrections (HEAD `3363639`)

- **Backend** : `Tests run: 581, Failures: 0, Errors: 0` — BUILD SUCCESS (rejoué après le masquage).
- **E2E `settings-profile`** : 3 passes, **8/8 à chaque fois**.
- ⚠ **Non rejoué après les corrections** : la suite E2E COMPLÈTE et le scope `frontend` complet
  (build + vitest + typecheck + lint). Les deux corrections ne touchent qu'un fichier de test backend
  et un fichier de spec E2E — aucun code de production. La CI de la PR fait foi.

## Incident harnais (à consigner, il a coûté un run de 6 minutes)

Le `next build` du scope `frontend` a pollué le `.next` du serveur `next dev` encore en cours :
`/fr/login` et `/fr/register` répondaient 200 mais **`/fr/home` rendait 500**, et le projet `setup`
de Playwright mourait en `browserContext.close: Target page… has been closed` après 3 min par compte.
**Un simple redémarrage du serveur a suffi** (aucune suppression de `.next` nécessaire).
Leçon : ne pas lancer le scope `frontend` tant qu'un `next dev` sert l'E2E, et sonder une PAGE
(`/fr/home`) en plus de l'oracle réseau avant de déclarer le harnais sain.
