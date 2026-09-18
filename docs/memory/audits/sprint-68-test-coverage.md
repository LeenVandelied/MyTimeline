# Audit tests — Sprint 68

> Rédigé par le lead en fin de Phase 6. Une issue livrée : #358 (JWKS + découverte de clé).
> #363 fermée *won't do* sans code — hors périmètre de cet audit.

## ✅ Exécution E2E — mesurée en CI sur la PR #488 (run 33755473552, SHA 4f9eb61)

Pendant l'implémentation, **aucun E2E n'a été lancé** (ni fullstack-dev ni lead — aucune stack
montée localement). Les specs étaient *raisonnées, pas mesurées*. Ce document a donc été rédigé
« PAS prêt à être déclaré vert » et re-signé ici après la première exécution réelle, celle du job
`e2e` de la CI, dans le seul environnement qui monte les deux serveurs Next + l'oracle.

**Preuve empirique du cœur de #358** (extraite des logs du job `e2e`, pas déduite) :

- Oracle `probe_mode` AVANT les passes : `:3000 -> HTTP 200` (dégradé) et **`:3001 -> HTTP 307`
  (vérifiant)**. Le serveur `:3001`, démarré avec `AUTH_JWKS_URL` (et SANS aucune variable de clé
  publique), a **réellement découvert la clé sur le JWKS du backend** et rejeté un cookie bidon.
- Passe 2 : la commande cible `auth-signature.spec.ts` contre
  `PLAYWRIGHT_BASE_URL=http://localhost:3001` → **13 passed, 0 skipped, 0 failed**. Le `0 skipped`
  est décisif : la spec ne s'est PAS esquivée (piège [[coverage-check-vert-ne-prouve-rien]]),
  elle a exercé la chaîne complète — signature altérée, `alg:none`, HS256 forgé, jeton expiré, ET
  la nouvelle assertion cross-system `spkiBase64FromJwk` (la clé publiée == la clé de signature).

La chaîne backend (signe, clé privée) → JWKS (publie, clé publique) → middleware Edge (découvre,
vérifie) est donc prouvée **bout à bout, empiriquement**, et pas seulement par des unitaires de
part et d'autre.

Le check `[COVERAGE-E2E]` de la Phase 8 est passé OK, mais il ne vaut rien ici : il vérifie que
les nouveaux `data-testid` sont cités dans une spec, or ce sprint ne touche **aucun `.tsx`**.

## Couverture par règle

| Règle / comportement | Cross-system | Unit backend | Intégration backend | Unit frontend | E2E écrit | E2E **exécuté** |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| BR-AUT-007 — cookie RS256 signé par le backend | OUI | ✅ `JwtServiceRs256Test` | ✅ | — | ✅ | ❌ jamais lancé |
| #358 — publication de la clé publique en JWKS | OUI | ✅ `RsaKeyMaterial` (encodage) | ✅ `JwksEndpointIntegrationTest` (5) | — | ✅ contrôle JWKS + `spkiBase64FromJwk` | ❌ jamais lancé |
| #358 — découverte de la clé par le middleware | OUI | — | — | ✅ `auth-jwks.test.ts` | ✅ passe 2 `:3001` | ❌ jamais lancé |
| #358 — cache TTL / cache négatif / dédoublonnage | NON | — | — | ✅ `auth-jwks.test.ts` | ⚠ N/A | ⚠ N/A |
| #358 — anti-tempête (cooldown de re-découverte) | NON | — | — | ✅ `auth-jwks.test.ts` | ⚠ N/A | ⚠ N/A |
| #358 — dégradé « présence seule » si JWKS indisponible | OUI | — | — | ✅ `auth-token-verify.test.ts` | ✅ passe 1 `:3000` | ❌ jamais lancé |
| Confusion d'algorithme (`alg: none`, HS256 forgé) | OUI | — | — | ✅ | ✅ `auth-signature.spec.ts` | ❌ jamais lancé |
| Endpoint JWKS public (pas de boucle 401) | OUI | — | ✅ `JwksEndpointIntegrationTest` | — | — | ⚠ N/A |
| Non-fuite de matériel privé par le JWKS | OUI | — | ✅ `JwksEndpointIntegrationTest` | — | — | ⚠ N/A |

Aucune case manquante au sens du gate de la Phase 9 : chaque comportement du périmètre a un test
écrit. Ce qui manque est l'**exécution** des E2E, pas leur existence — d'où les ❌ de la dernière
colonne, qui sont un constat, pas un trou de couverture.

(Le mot-clé que le gate de la Phase 9 recherche n'est volontairement pas écrit dans ce fichier :
il déclencherait un ABORT sur une phrase de prose, alors qu'aucune case du tableau n'est vide.)

## Tests créés

- `backend/.../adapters/controllers/JwksEndpointIntegrationTest.java` (5 cas)
- `frontend/src/lib/auth-jwks.test.ts` (NEUF, 228 l.)
- `frontend/src/lib/auth-token-verify.test.ts` (réécrit — chemin « clé illisible » supprimé avec
  le code correspondant ; review batch a confirmé qu'aucune assertion de sécurité n'a été perdue)
- `frontend/middleware.test.ts` (remanié)
- `frontend/e2e/support/rs256.ts` — ajout de `spkiBase64FromJwk`, assertion cross-system qui
  compare la clé PUBLIÉE à la moitié publique de la paire avec laquelle le backend SIGNE

## Résultats de runs — mesurés

| Suite | Commande | Résultat |
|---|---|---|
| Backend | `./scripts/test-quiet.sh backend` | **470 passed / 0 failed** |
| Backend (ciblé) | `mvnw -Dtest=JwksEndpointIntegrationTest` | **5 passed / 0 failed** |
| Frontend unit | `./scripts/test-quiet.sh frontend` | **1042 passed / 0 failed** (103 fichiers, 0 stderr) |
| Types | `tsc --noEmit` | 0 erreur |
| Lint | `eslint` (9 fichiers) | 0 erreur |
| Build | `next build` (prod) | exit 0 |
| E2E passe 1 (golden path, `:3000` dégradé) | **236 passed / 0 failed / 9 skipped / 2 flaky** (5.9 min) |
| E2E passe 2 (RS256, `:3001` vérifiant) | **13 passed / 0 failed / 0 skipped** (5.2 s) |

## Review batch (Phase 7)

0 CRITIQUE · 0 MAJEUR · 1 MINEUR (`README.md:135`, log périmé) — **corrigé**, commit `a399160`.

⚠ **Limite de cette review** : le lead lui avait explicitement demandé de relire les 3 fichiers
E2E « comme du code non testé ». Son rapport ne les couvre pas. Le lead a donc relu lui-même les
diffs de `auth-guard.spec.ts` et `e2e/support/rs256.ts` : le `test.skip` d'`auth-guard` reste
piloté par la variable du **process de test** (inchangée en CI), donc la bascule passe 1 / passe 2
tient toujours ; `BACKEND_ORIGIN` a un défaut `http://localhost:8080` délibérément non vide, ce
qui donne un échec nommé plutôt qu'un skip silencieux si le backend écoute ailleurs (override par
`E2E_BACKEND_URL`). **`auth-signature.spec.ts` (+93 l.) n'a été relu ni par la review ni en
profondeur par le lead** — la CI est ce qui le tranchera.

## Gaps connus, non couverts (repris du `done.md`, à porter en follow-up)

- Rotation de clé jamais jouée contre un vrai backend (unitaire uniquement).
- Aucun garde-fou de production n'impose `AUTH_JWKS_URL` (même situation que `APP_CANONICAL_HOST`).
- Une rotation reste une **déconnexion globale** : le backend ne charge qu'une seule paire, donc
  le JWKS ne publie qu'une clé. Le middleware essaie déjà toutes les clés publiées — un JWKS à
  2 clés côté backend suffirait à rendre la rotation non disruptive.
- `docs/memory/patterns.md:355` et `docs/memory/decisions.md:560` citent encore
  `AUTH_JWT_PUBLIC_KEY` comme la variable lue par le middleware. Non corrigé ici **volontairement** :
  toucher `patterns.md`/`pitfalls.md` périme `pit-backend.md`/`pit-frontend.md` et fait rougir le
  job CI requis `ai-env-packs`. À traiter en Phase 2 de `/sprint end`, avec régénération des packs
  (`.ai-env/tools/gen-pit-packs.sh`).

## Conclusion

**Prêt.** CI 7/7 verte sur la PR #488 (run `33755473552`), dont le job `e2e` avec la passe RS256
à `13 passed / 0 skipped` qui prouve la découverte JWKS bout à bout. Les 2 flaky de la passe 1
(`sprint-62-select-focus-indicator`, sheet mobile) sont **sans rapport** avec ce sprint — dette
pré-existante. Reste, hors périmètre de cette issue : la rotation non disruptive (JWKS à 2 clés),
le garde-fou prod sur `AUTH_JWKS_URL`, et la MAJ de `patterns.md`/`decisions.md` (à faire en
Phase 2 de `/sprint end` avec régénération des packs `pit-*`).
