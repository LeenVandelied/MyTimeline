# #323 — Couverture E2E de la signature RS256 (gate d'audit Sprint 50)

## Le trou comblé

La chaîne CROSS-SYSTEM de #323 — backend Spring signe avec la clé privée, middleware Next (Edge)
vérifie avec la clé publique — n'était prouvée que par deux moitiés unitaires **indépendantes** :
`JwtServiceRs256Test` d'un côté, `auth-token-verify.test.ts` / `middleware.test.ts` de l'autre,
chacune sur des jetons et une paire de clés qu'elle fabriquait elle-même. Rien n'attestait qu'elles
s'emboîtent : une divergence de format de clé (SPKI vs PKCS#1), d'encodage (Base64 standard vs
base64url) ou d'algorithme serait passée entre les deux suites sans rougir.

`auth-guard.spec.ts` n'exerçait que le **mode dégradé** (clé publique absente).

## Livré

| Fichier | Rôle |
|---|---|
| `frontend/e2e/auth-signature.spec.ts` | 7 cas E2E sur stack appairée (backend + Postgres + Next) |
| `frontend/e2e/support/rs256.ts` | forge/vérification de jetons (signature altérée, `alg:none`, `HS256`, expiré signé) |
| `frontend/e2e/auth-guard.spec.ts` | le cas `DÉGRADÉ` devient **conditionnel** (voir ci-dessous) |
| `.github/workflows/ci.yml` | paire RS256 **jetable générée au runtime** + 2e passe E2E en mode vérifiant |
| `docs/memory/sprints/sprint-47/e2e-local-runbook.md` | correction : `JWT_SECRET` n'existe plus depuis #323 |

**Aucune clé n'est committée.** Le dépôt est public : la paire est générée à l'exécution
(`crypto.generateKeyPairSync`), vit le temps du run, et meurt avec le runner.

## Preuve que la stack n'était PAS en mode dégradé

Trois niveaux, parce qu'un test vert en dégradé ne prouve rien :

1. **Appairage au boot** — la clé publique journalisée par `JwtService.initKeyMaterial` a été
   comparée octet à octet à celle injectée dans `AUTH_JWT_PUBLIC_KEY` : identiques. Zéro occurrence
   de « paire ÉPHÉMÈRE » dans le log backend (le backend utilise donc bien NOTRE clé privée).
2. **Sonde runtime** — `curl -H "Cookie: jwt=ceci-n-est-pas-un-jwt" /fr/dashboard` → **307**
   (en dégradé : 200). Ancré dans la spec comme premier cas (« garde anti-dégradé »).
3. **Preuve fail-closed** — spec relancée contre un serveur Next **sans** clé publique mais avec la
   variable posée côté process de test : **5 cas ROUGES sur 7**. La spec ne peut donc pas passer
   silencieusement en dégradé.

## Cas de l'audit

| # | Cas | État |
|---|---|---|
| 1 | Nominal — login réel ⇒ cookie RS256 ⇒ route protégée 200 | **COUVERT + VERT** |
| 2 | Signature falsifiée ⇒ 307 `/fr/login` (ni 200, ni 500), zéro octet du shell | **COUVERT + VERT** |
| 3 | `alg: none` ⇒ 307 | **COUVERT + VERT** |
| 3bis | `alg: HS256` signé avec la clé publique (confusion d'algo, ajouté) | **COUVERT + VERT** |
| 4 | Jeton expiré, **signature authentique** ⇒ 307 | **COUVERT + VERT** |
| 5 | Mode dégradé préservé | **COUVERT + VERT** (conditionné, cf. ci-dessous) |

Le cas 1 ne se contente pas d'un 200 : il affirme `alg === 'RS256'` sur le jeton réel **et** vérifie
sa signature avec `AUTH_JWT_PUBLIC_KEY` côté test. C'est l'assertion d'appairage, invisible des
suites unitaires.

Le cas 4 exige `E2E_JWT_PRIVATE_KEY` : sans signature authentique, le rejet viendrait de la
signature et l'expiration ne serait pas éprouvée. Sans la clé, ce cas **skippe** au lieu de se
déguiser en test d'expiration.

## Décision structurante — les deux modes sont mutuellement exclusifs

`AUTH_JWT_PUBLIC_KEY` est lue **au runtime** par le middleware : une instance Next est soit
dégradée, soit vérifiante. Jamais les deux. Conséquence : le cas `DÉGRADÉ` d'`auth-guard.spec.ts`
**échouait** (200 attendu, 307 reçu) dès qu'on lançait la suite contre une stack appairée — alors
que le code se comportait correctement. Il est donc désormais conditionné à
`SIGNATURE_VERIFICATION_CONFIGURED` :

- clé absente (1re passe CI) → le cas s'exécute, contrat #302 intact ;
- clé présente (2e passe CI) → `auth-signature.spec.ts` affirme la 307 sur ce **même** cookie bidon.

Les deux modes restent donc couverts, dans deux passes distinctes du **même** job CI.

## Mesures

| Suite | Résultat | Commande |
|---|---|---|
| E2E signature (stack appairée) | **12 passed / 0 failed** (dont 4 du projet `setup`) | `PLAYWRIGHT_BASE_URL=http://localhost:3100 AUTH_JWT_PUBLIC_KEY=… E2E_JWT_PRIVATE_KEY=… npx playwright test auth-signature.spec.ts --workers=1` |
| E2E `auth-guard` + `auth-signature` (appairée) | **31 passed / 1 skipped / 0 failed** | idem, 2 fichiers |
| E2E suite complète (stack dégradée = config CI) | **96 passed / 8 skipped / 0 failed** (1,9 min) | `PLAYWRIGHT_BASE_URL=http://localhost:3100 npx playwright test --workers=1` |
| Preuve fail-closed (serveur dégradé + env de test posée) | **5 failed / 7 passed** — attendu | idem run signature |
| Backend | **450 / 450** | `./scripts/test-quiet.sh backend` |
| Frontend unitaire | **788 / 788** (88 fichiers) | `./scripts/test-quiet.sh frontend` |
| Typecheck / ESLint / Prettier | clean | `npx tsc --noEmit`, `next lint`, `prettier --check` |

Stack locale : backend `:8080` (profils `dev,e2e`, base `eventmanager_e2e`, `JWT_PRIVATE_KEY` posée,
`RATE_LIMIT_ENABLED=false`), frontend `:3100`, Postgres `:5432`. Recette complète en tête de
`frontend/e2e/auth-signature.spec.ts`.

## Ce qui n'est PAS prouvé (et ne l'était pas avant non plus)

- **La 2e passe CI n'a jamais tourné sur un runner GitHub.** Elle est écrite et son step de
  génération de clés a été exécuté verbatim en local (les deux variables sont bien produites), mais
  le job complet ne sera observé qu'au premier push. Le job `e2e` n'est pas un check requis : un
  échec ne bloquerait pas le merge, il faudra le regarder.
- **La révocation de session (`jti`) reste hors du middleware** — vérifiable en base seulement.
  `JwtFilter` reste le seul juge d'autorisation. Inchangé par ce lot.
- **Le mode « clé présente mais illisible »** (dégradé + `console.warn`) n'est pas couvert en E2E :
  il l'est en unitaire (`auth-token-verify.test.ts`). L'exercer en E2E demanderait une 3e instance
  Next pour un chemin qui, par construction, se comporte comme le dégradé déjà couvert.
- **Aucune mesure de performance** de la vérification RSA sous charge réelle.

STATUS: COMPLETED
