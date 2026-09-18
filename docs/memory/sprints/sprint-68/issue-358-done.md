# Issue #358 — JWKS backend + découverte middleware

- **commits**: `b25c61a` (backend JWKS), `1a26c52` (frontend découverte), `6ab311d` (docs/config)

## resume
- Backend: `GET /.well-known/jwks.json` public. `JwksController` + `JwksResponse`/`JwkResponse`
  (`application/dtos/`), `JwtService.getPublicJwks()`, `RsaKeyMaterial.{modulusBase64Url,
  publicExponentBase64Url,jwkThumbprint}`, whitelist `SecurityConfig`.
- Frontend: `src/lib/auth-jwks.ts` (NEUF) — cache TTL 10 min, cache négatif 30 s, dédoublonnage
  concurrent, timeout 2 s, re-découverte forcée plafonnée à 1/min. `middleware.ts` lit
  `AUTH_JWKS_URL` (littéral). 0 dépendance npm ajoutée.
- **SUPPRIMÉ**: `AUTH_JWT_PUBLIC_KEY` (middleware, `.env.example` x2, compose, runbooks, ADR-004),
  `warnUnreadableKeyOnce` + `unreadableKeyWarned` + `decodeSpki` + `importVerificationKey` +
  `keyCache` + `AUTH_PUBLIC_KEY_ENV_VAR` + `resetVerificationKeyCache` et leurs tests. Les 2 warns
  one-shot prod sont RECIBLÉS (URL absente / JWKS injoignable), pas supprimés.
- Contrat dégradé INCHANGÉ: clé indisponible tranchée AVANT parsing du jeton ⇒ « présence seule ».

## decision CI — OPTION 2 (dégradé reste atteignable), et pourquoi
- Le briefing est PÉRIMÉ sur la CI: `auth-signature.spec.ts` ne skippe PAS en CI. Depuis #462/S64
  le job `e2e` lance **deux** serveurs (`:3000` dégradé, `:3001` vérifiant) + un oracle `probe_mode`.
- Dégradé atteint par **`AUTH_JWKS_URL` non posée** sur `:3000`. Spécifications `auth-guard § DÉGRADÉ`
  et `auth-signature` restent valides telles quelles (commentaires réancrés, assertions inchangées).
- ⚠ **CI ROUGE en l'état**: `:3001` n'a plus rien qui l'active ⇒ oracle `attendu 307, reçu 200`.
  Échec NOMMÉ, pas faux vert. Correctif = **1 ligne** dans `ci.yml` (interdit à moi), cf. RECOMMAND.

## tests (chiffres réels)
- `./scripts/test-quiet.sh backend` → **470 passed / 0 failed** (BUILD SUCCESS)
- `mvnw -Dtest=JwksEndpointIntegrationTest` → **5 passed / 0 failed**
- `./scripts/test-quiet.sh frontend` → **1042 passed / 0 failed**, 103 fichiers, 0 stderr
- `npx tsc --noEmit` → 0 erreur · `eslint` (9 fichiers) → 0 · `next build` (prod) → exit 0
- Sonde empirique: `fetch` serveur→serveur (undici) **n'envoie pas d'en-tête `Origin`** → CORS non
  impliqué dans la découverte.

## non fait / non vérifié
- **E2E jamais exécuté** (aucune stack lancée ici). Le nouveau cas JWKS et les 2 passes sont
  raisonnés, pas mesurés. `E2E_BACKEND_URL` a un défaut NON vide (`http://localhost:8080`) pour
  qu'il s'exécute au lieu de skipper — non prouvé en run.
- Rotation réelle non jouée contre un vrai backend (couverte en unitaire seulement).
- Pas de garde-fou prod qui impose `AUTH_JWKS_URL` (identique à `APP_CANONICAL_HOST`).
- Rotation = **toujours une déconnexion globale**: le backend ne charge qu'une paire.
- `docs/memory/sprint-history.md` modifié par le lead: NON commité par moi.
- Pas de migration Flyway (aucun schéma touché) — V16 reste libre.

## [MEMORY]
- `[MEMORY:decision]` #358 — JWKS seule source, aucun repli sur variable. Dégradé fail-OPEN
  conservé (fail-closed déconnecterait tout le monde sur une panne backend).
- `[MEMORY:pattern]` Re-découverte de clé déclenchée UNIQUEMENT par « signature inexplicable sur
  jeton bien formé + non expiré », jamais par expiration/malformation, et plafonnée par un cooldown.
  Anti-pattern: refetch sur tout rejet ⇒ DoS amplifié vers son propre backend par cookies forgés.
- `[MEMORY:pitfall]` `BigInteger.toByteArray()` préfixe un octet de signe 0x00 sur tout modulus RSA
  (bit de poids fort toujours à 1) — publié tel quel, `crypto.subtle.importKey('jwk')` rejette.
- `[MEMORY:pitfall]` Section « RETOMBÉE CI » d'un briefing peut être périmée: `ci.yml` avait déjà
  2 serveurs Next + oracle depuis S64. Lire le job, pas l'énoncé.

## recommandations suite
- **RECOMMAND_FOLLOWUP (BLOQUANT CI, 1 ligne)** — `.github/workflows/ci.yml`, step
  « Start frontend production servers », lancement `:3001` : remplacer
  `AUTH_JWT_PUBLIC_KEY="$VERIFYING_PUBLIC_KEY" \` par
  `AUTH_JWKS_URL=http://localhost:8080/.well-known/jwks.json \`.
  Le bloc `env: VERIFYING_PUBLIC_KEY:` de ce step devient inutile (supprimable).
  Ne PAS toucher au step « Run E2E (vérification de signature RS256) » : son
  `AUTH_JWT_PUBLIC_KEY` reste requis sur le **process de test** (matériel de forge HS256 +
  `verifyRs256`). Les messages `::error::` de l'oracle citent encore l'ancienne variable (cosmétique).
- **RECOMMAND_FOLLOWUP** — JWKS à 2 clés côté backend (ancienne + nouvelle) pour qu'une rotation
  cesse d'être une déconnexion globale. Le middleware essaie déjà toutes les clés publiées.
- **RECOMMAND_FOLLOWUP** — #363 « paire dépareillée » est désormais sans objet par construction
  (confirme l'arbitrage B du lead).
- Pas de `RECOMMAND_TEST_RUNNER` : suites lancées ici (470 + 1042), < 3 min chacune.
- Pas de `RECOMMAND_DB_EXPERT` : aucun accès base, aucune migration.

STATUS: PARTIAL

## BLOQUE_SUR
`.github/workflows/ci.yml` — modification interdite au périmètre de cette issue. Le job `e2e`
rougira sur l'oracle `:3001` tant que la ligne ci-dessus n'est pas posée. Tout le reste est livré.
