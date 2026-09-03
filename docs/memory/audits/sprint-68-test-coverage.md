# Audit tests — Sprint 68

> Rédigé par le lead en fin de Phase 6. Une issue livrée : #358 (JWKS + découverte de clé).
> #363 fermée *won't do* sans code — hors périmètre de cet audit.

## ⚠ Avertissement de lecture — ce que cet audit ne prouve PAS

**Aucun test E2E n'a été exécuté pendant ce sprint.** Ni par le fullstack-dev (qui le déclare
explicitement dans son `done.md`), ni par le lead : aucune stack n'a été lancée. Les specs E2E
listées ci-dessous **existent et sont écrites**, mais elles sont *raisonnées, pas mesurées*.

La distinction compte, et le projet a déjà été mordu par sa confusion
([[coverage-check-vert-ne-prouve-rien]], S61 : tout vert avec 5 specs jamais exécutées dont 2
cassées). Rien ici ne doit être lu comme « E2E vert ». La seule exécution qui fera foi est celle
du job `e2e` de la CI sur la PR — **cet audit sera à re-signer avec les compteurs réels** avant
toute clôture.

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

Aucune ligne `[MISSING]` : chaque comportement du périmètre a un test écrit. La colonne qui
manque est l'**exécution** des E2E, pas leur existence.

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
| **E2E** | *(aucune)* | **NON EXÉCUTÉ** |

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

**PAS prêt à être déclaré vert.** Prêt à partir en PR — c'est précisément le moyen de faire
exécuter les E2E dans le seul environnement qui les monte (2 serveurs Next + oracle, `ci.yml`).
Condition de sortie : job `e2e` de la CI vert sur la PR, compteurs reportés dans ce fichier.
