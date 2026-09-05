# Audit tests — Sprint 45

> Généré en fin de Phase 6. Toute cellule de couverture manquante bloque la Phase 9 (création de PR).
> (Le marqueur littéral attendu par le script de gate n'apparaît nulle part ci-dessous : c'est voulu.)
> Date : 2026-07-27 · Branche : `sprint/45` · Base : `origin/dev`

## Couverture par BR

| BR | Description | Cross-system flow | Unit backend | Integration | Vitest frontend | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| BR-AUT-007 | Cookie `jwt` HttpOnly émis au login | OUI | ✅ | ⚠ N/A | ✅ | ✅ | ✅ |
| BR-AUT-011 | `JwtFilter` cookie OU Bearer, bypass `/api/auth/**` | OUI | ✅ | ✅ | ⚠ N/A | ✅ | ✅ |
| BR-AUT-012 | Reset : token usage unique, 15 min, 400 générique anti-énumération | OUI | ✅ | ✅ | ⚠ N/A | ✅ | ✅ |
| BR-AUT-005 | Échec d'auth → 401, pas de fuite interne | OUI | ✅ | ✅ | ⚠ N/A | ✅ | ✅ |

Aucune cellule manquante. Les 4 BR touchées sont cross-system et disposent chacune d'une spec E2E métier
(voir §Réserve d'exécution — les specs existent et sont versionnées, mais n'ont pas été exécutées).

## Tests créés ce sprint

**Backend**
- `E2eTestSupportProfileTest` (7) — bean absent en `prod`/`dev`/`test`/`dev,prod`/sans profil ; présent en `e2e` et `dev,e2e`
- `E2eTestSupportPackageGuardTest` (3) — ArchUnit : tout le package `@Profile("e2e")` ; aucune classe prod n'en dépend ; aucun mapping hors package sous `/api/test-support`
- `E2eResetTokenEndpointIntegrationTest` (5) — Testcontainers : 200 dernier token / 404 inconnu-consommé-expiré / 400 sans param, sans cookie JWT
- `ProfileSafetyGuardTest` — +7 cas : `prod,e2e` refusé, `dev,e2e`+marqueur refusé, property brute `spring.profiles.active=prod,e2e` refusée, **`dev,e2e` sans marqueur → BOOT OK (= config CI)**, `e2e` seul OK, staging OK, `prod` sans e2e OK

**Frontend (Vitest)**
- `frontend/middleware.test.ts` — garde composée, matcher, **Location exploitable par
  Next** (absolu + parsable sans base, cf. régression 500 du run CI 30269383403)
- `frontend/src/lib/auth-guard-paths.test.ts` — segments protégés, percent-encoding, fail-closed

**E2E (Playwright — versionnées, non exécutées)**
- `frontend/e2e/auth-guard.spec.ts` (#302) — redirection **serveur** prouvée via `page.request.get({maxRedirects:0})` + assert 307/Location ; +4 cas d'ancrage du matcher (`/%66r/...`)
- `frontend/e2e/reset-password-failures.spec.ts` (#284) — ancien mdp rejeté (401), token rejoué (400 générique), 1 compte dédié par test
- `frontend/e2e/forgot-password.spec.ts` — migrée vers le nouveau canal de capture

## Résultats des runs (exit codes réels, via `rtk proxy`)

| Suite | Exit | Résultat |
|---|:---:|---|
| Backend `test-quiet.sh backend` | 0 | **433 tests**, 0 failure, 0 error |
| Frontend `test-quiet.sh frontend` | 0 | **564 tests**, 67 fichiers, `success: true` |
| `tsc --noEmit` | 0 | — |
| `next lint` | 0 | « No ESLint warnings or errors » |
| `prettier --check` | 0 | fichiers touchés |
| **E2E Playwright** | — | ❌ **NON EXÉCUTÉE** |

Vérification **indépendante** par `test-runner` sur backend 433/433 et frontend 556/556 (avant les
2 derniers correctifs qui portent le frontend à 558) : **aucune divergence RTK** constatée sur ces runs.

⚠ **Fiabilité de l'outillage** : le hook RTK a été pris en défaut deux fois ce sprint — vitest affiché
« PASS (23) FAIL (0) » alors que `success:false` avec une suite en échec de **collecte**, et prettier
« All files formatted » avec exit 1. Tous les chiffres ci-dessus proviennent de codes de sortie réels
lus via `rtk proxy`, jamais d'un résumé RTK.

## Exécution E2E — ce que la CI a réellement révélé

La réserve inscrite ici avant la PR (« aucune spec E2E jamais exécutée, gate = CI ») **s'est vérifiée
et a payé** : le premier run CI a trouvé une régression que **toutes** les vérifications locales avaient
manquée.

### Run CI #1 — `a56ffa1` (run 30269383403) — ROUGE

`e2e` : **39 passed, 10 failed, 1 skipped**.
Les 10 échecs sont **tous** dans `auth-guard.spec.ts`, tous **500 au lieu de 307**, y compris le cas
trivial `/fr/dashboard`. Log serveur : `⨯ [Error [TypeError]: Invalid URL]` à chaque requête gardée.

**Cause** : le correctif « `Location` relatif » (issu de l'audit sécurité) cassait le runtime. Next
normalise les redirections de middleware via `new NextURL(redirect)` → `new URL('/fr/login')` **sans
base** → `TypeError`. La garde renvoyait donc 500 sur **100 % des routes protégées**.

**Ce que ça dit de la couverture** : `next build` vert, `tsc` vert, `eslint` vert, 33 tests unitaires de
middleware verts — et la fonctionnalité totalement inopérante. Les tests assertaient sur l'objet
`NextResponse` retourné, jamais sur le traitement que Next lui applique ensuite.
`reset-password-failures.spec.ts` et `forgot-password.spec.ts` **passaient** → #283 et #284 sains,
régression confinée à #302.

### Correctif `2f5da3d`

`request.nextUrl.clone()` + `NextResponse.redirect(url, 307)` (absolu), `search` vidé.
Diagnostic confirmé par **3 preuves indépendantes** : lecture du code de l'adapter Next, `new URL()` en
Node, et surtout **reproduction runtime réelle** (`next build` + `next start` → `/fr/dashboard` = 500,
`ERR_INVALID_URL { input: '/fr/login' }`).

Vérification runtime **post-correctif** (`next start`) : `/fr/{dashboard,timeline,products,settings}`,
sous-route, `/%66r/dashboard`, `/%66r/products/photo.png` → **tous 307** vers `/fr/login` ; avec cookie
`jwt` → 200 ; `/fr/login` → 200 ; zéro occurrence « Invalid URL » dans les logs.

**Test anti-régression** (`middleware.test.ts`, 33 → 39 tests) : 5 cas
`expect(() => new URL(location)).not.toThrow()` **sans base**, plus 1 cas via le `NextURL` **réel** de
l'adapter. Efficacité **prouvée par revert temporaire** du middleware → 8 FAIL, exit 1.
L'ancien test faisait `new URL(location, ORIGIN)` — **la base masquait exactement le bug**.

### Statut

Run CI #2 sur `2f5da3d` — en cours au moment de l'écriture. **Le verdict E2E appartient à ce run**, pas
à la vérification locale ci-dessus, aussi convaincante soit-elle.

Job `security` : **rouge, non imputable à ce sprint** — `npm audit` remonte 19 advisories `high` sur
`next`/`postcss`/`sharp` (transitifs). Cette PR n'ajoute aucune dépendance, elle en **retire** (`pg`).
`dev` était vert le 2026-07-16, soit 11 jours plus tôt, et les advisories sont récentes (CVE-2026-*) :
faisceau d'indices en faveur d'une dérive temporelle, **non prouvé** — à confirmer en relançant la CI
sur `dev`. Remédiation hors périmètre Sprint 45.

## Conclusion

Suites unitaires et d'intégration vertes et vérifiées indépendamment. Aucune cellule de couverture
manquante. **Le premier run CI a invalidé la confiance locale** : la garde #302 était cassée à
l'exécution. Correctif appliqué et vérifié en runtime réel ; **le gate reste le run CI #2**.
