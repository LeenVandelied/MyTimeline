# Issue #323 — JWT RS256 + vérification de signature en Edge (Sprint 50, vague 2)

- pack_lu: OUI — br-auth §BR-AUT-007 — Émission du token et cookie HttpOnly au login
- commits: [voir `git log` — 1 commit `:lock: feat(auth): signature RS256 …`]

## config finale (NOMS uniquement)

| Variable | Service | Secret ? | Remplace |
|---|---|---|---|
| `JWT_PRIVATE_KEY` | backend | OUI | `JWT_SECRET` |
| `AUTH_JWT_PUBLIC_KEY` | frontend | NON | — (nouveau) |
| `EXPORT_TOKEN_SECRET` | backend | OUI | `JWT_SECRET` (volet export) |

**`JWT_SECRET` / `jwt.secret` : SUPPRIMÉ.** Vérifié par grep sur `backend/src`,
`.github/workflows`, `docker-compose.yml`, `.env.example`, `frontend/` — plus aucune
occurrence exécutable, seulement des commentaires « n'existe plus, ne pas réintroduire ».
Clé publique backend DÉRIVÉE de la privée (pas de 2e variable → paire non dépareillable
côté serveur). Dev/test : `jwt.private-key` vide ⇒ paire RS256 ÉPHÉMÈRE au boot (dépôt
PUBLIC : zéro clé RSA committée). Prod : `ProfileSafetyGuard` (6e garde-fou) refuse le
boot si `JWT_PRIVATE_KEY` ou `EXPORT_TOKEN_SECRET` sont vides.

## edge verif

**WebCrypto natif** (`crypto.subtle.importKey('spki')` + `verify('RSASSA-PKCS1-v1_5')`).
**AUCUNE dépendance ajoutée** — ni `jose`, ni `jsonwebtoken`. `frontend/package.json`
inchangé. Cache d'import de clé au niveau module. `alg === 'RS256'` exigé avant toute
vérification (confusion d'algorithme : `none` et `HS256` rejetés). Middleware devenu
`async` (aucune API WebCrypto synchrone) — validé sur runtime Next réel, cf. plus bas.

## resume

**Backend** — `JwtService.java` (RS256, `@PostConstruct initKeyMaterial`, fail-fast muet
sur la valeur ET sur le message de l'exception sous-jacente), `RsaKeyMaterial.java` (NEW,
parse PKCS#8/PEM, dérive la publique, exige ≥ 2048 bits), `ExportTokenService.java`
(`app.export.token-secret` + son propre garde-fou de boot ; contrat « `verify()` ne lève
jamais » PRÉSERVÉ), `ProfileSafetyGuard.java` (+1 check). Signature publique de
`JwtService` INCHANGÉE → aucun des 15 consommateurs n'a bougé.
**Frontend** — `src/lib/auth-token-verify.ts` (NEW, pur), `middleware.ts` (async, garde
greffée dans le `if` existant ; `withCanonicalOrigin` et `canonical-host.ts` NON touchés).
**Config** — 4 `.properties` + `.properties.example`, `docker-compose.yml`, `.env.example`,
`ci.yml`. **Docs** — ADR-004 (nouvelle sous-section §Limites, celle de #322 intacte),
ADR-003 (encart), runbook rotation §2 réécrite, inventaire §3quater.3, runbook déploiement,
`cp-backend.md`, `acknowledged.md`.

**TESTÉ** — backend `mvn test` COMPLET : **449 tests, 0 failure, BUILD SUCCESS**.
Frontend `vitest run` COMPLET : **774 tests, 0 failure** (747 avant). `tsc --noEmit` : 0
erreur. `eslint` : 0 issue. `next build` : 0 erreur.
**Vérifié sur runtime Next RÉEL** (`next start` + curl — le piège BUG-S45-001 : les
unitaires restaient verts alors que la garde 500-ait) : sans cookie → 307 ; cookie bidon →
307 ; jeton signé mais EXPIRÉ → 307 ; jeton valide → 200 ; `alg:none` → 307 ; jeton
tronqué → 307 ; route publique inchangée (308 → `/fr`, identique à la baseline) ; mode
DÉGRADÉ sans clé → cookie bidon 200, sans cookie 307. **Aucun 500.**

**NON TESTÉ** — suite Playwright e2e non relancée (nécessite backend + DB ; `auth-guard.spec.ts`
n'exerce que le chemin dégradé, inchangé, son commentaire a été mis à jour). Warnings
`next build` (2) non comparés à une baseline pré-changement.

## criteres acceptation

1. `JwtService` migré HS256 → RS256 — **SATISFAIT** (émission + validation).
2. Rotation et distribution documentées — **SATISFAIT** (runbook §2.1-2.5, inventaire
   §3quater.3, runbook déploiement, ADR-004).
3. Middleware vérifie la signature via la clé publique — **SATISFAIT**, avec dégradé
   explicite si clé absente/illisible (fail-**open** assumé, documenté ADR-004).
4. Stratégie de transition — **SATISFAIT en documentation, non exécutable** : rien n'est
   déployé (0 secret GitHub, 0 environnement, 0 workflow de déploiement). Bascule SÈCHE
   assumée, aucune double émission HS256/RS256 (un vérificateur bi-algorithme rouvrirait
   la confusion d'algorithme fermée ici). Checklist de fenêtre + préavis dans le runbook.
5. Tests émission / validation backend / vérification middleware — **SATISFAIT** :
   `JwtServiceRs256Test` (9), `ExportTokenServiceTest` (9, dont isolation croisée dans les
   DEUX sens), `ProfileSafetyGuardTest` (41), `auth-token-verify.test.ts` (19),
   `middleware.test.ts` (62, dont 8 nouveaux sur la signature).

## export tokens

`ExportTokenService` reste **HS256** sur `EXPORT_TOKEN_SECRET` dédié (conforme à la
décision dev du briefing). Motif : vérifiés côté serveur uniquement, aucune clé à
distribuer. Garde-fou de boot ajouté (il n'était couvert que par celui de `jwt.secret`).
Contrat `verify()` ne lève jamais : préservé. Claim `typ` : préservé. L'isolation
auth/download est désormais DOUBLE (claim `typ` + matériel de signature disjoint), ancrée
par deux tests réciproques.

## risque residuel

- **Clé publique dépareillée** ⇒ boucle « je me connecte, je suis redirigé » (API OK).
  Remède : vider `AUTH_JWT_PUBLIC_KEY`. Correction de fond : endpoint JWKS (follow-up).
- **Révocation (`jti`) non vérifiable en Edge** : un token révoqué passe encore la garde,
  `JwtFilter` répond 401. La garde n'est toujours PAS une frontière d'autorisation.
- **Aucun garde-fou frontend** n'impose `AUTH_JWT_PUBLIC_KEY` en prod (même trou que
  `APP_CANONICAL_HOST`, #322) : absence ⇒ dégradé silencieux.
- **Vérification de signature non couverte en E2E** (CI en mode dégradé, faute de clé
  committable dans un dépôt public).
- **Paire éphémère en dev/CI** : sessions perdues à chaque redémarrage du backend.
- **`pitfalls.md` PIT-S13-003 / PIT-S15-003 et `patterns.md` (PAT `${JWT_SECRET}`) sont
  désormais périmés** — non touchés (consolidation mémoire = rôle du lead).
- `secret-exposure-audit.md` (#249) reste exact sur le CONSTAT historique, mais son
  §4.3 cite un `JWT_SECRET` dans `ci.yml` qui n'y est plus (noté dans l'inventaire §1.4).

## [MEMORY:*] signaux

- `[MEMORY:decision]` Contexte: migration RS256, où placer la clé publique. Décision: la
  DÉRIVER de la privée côté backend (1 seule variable serveur) + la publier au frontend
  via `AUTH_JWT_PUBLIC_KEY`. Why: une paire configurée en deux variables est
  indétectablement dépareillable ; dériver supprime la moitié du mode de panne.
- `[MEMORY:decision]` Contexte: transition des jetons en circulation. Décision: bascule
  SÈCHE, pas de double émission HS256/RS256. Why: (a) rien n'est déployé, le parc à
  ménager n'existe pas ; (b) un vérificateur qui accepte deux algorithmes rouvre la
  confusion d'algorithme qu'on vient de fermer.
- `[MEMORY:pattern]` Problème: vérifier un JWT RS256 dans le runtime Edge. Solution:
  WebCrypto natif (`importKey('spki')` + `verify('RSASSA-PKCS1-v1_5')`), zéro dépendance.
  Anti-pattern: ajouter `jose` — dépendance de PROD dans un runtime frontend partagé, qui
  se séquence et ne s'improvise pas.
- `[MEMORY:pitfall]` Contexte: `alg` d'un JWT est choisi par le PORTEUR du token. Une clé
  publique est publique : accepter `alg:HS256` laisse quiconque la connaît forger une
  identité. Solution: exiger `alg === 'RS256'` AVANT de toucher à la signature, des deux
  côtés. Prévention: figer l'algo à l'émission ET à la vérification, tester `none` +
  `HS256`-signé-avec-la-publique.
- `[MEMORY:pitfall]` Contexte: une `jwt.private-key` vide ne CASSE rien au boot (paire
  éphémère) — c'est ce qui la rend dangereuse en prod (déconnexion globale à chaque
  redéploiement, sans symptôme). Solution: `ProfileSafetyGuard` la refuse en prod effective.
  Prévention: tout défaut « dégradé silencieux » a besoin d'un garde-fou de boot explicite.
- `[MEMORY:pitfall]` Contexte: rendre `middleware.ts` async casse TOUS les call sites de
  `middleware.test.ts` en silence (`response.status` devient `undefined`, pas d'erreur de
  type si on n'awaite pas dans un `expect`). Prévention: après un passage en async, grepper
  les appels non préfixés d'`await` — `tsc` seul ne suffit pas.
- `[MEMORY:business-rule]` BR-AUT-007 amendée : le cookie `jwt` est signé RS256 (plus
  HS256) ; sa signature et son `exp` sont vérifiables par tout porteur de la clé publique.

## recommandations suite

- `RECOMMAND_FOLLOWUP` — endpoint **JWKS** backend + découverte de clé par le middleware :
  supprime le mode de panne « clé dépareillée » et rend la rotation atomique.
- `RECOMMAND_FOLLOWUP` — garde-fou frontend rendant `AUTH_JWT_PUBLIC_KEY` **et**
  `APP_CANONICAL_HOST` obligatoires en production (commun avec le reliquat de #322).
- `RECOMMAND_FOLLOWUP` — couvrir la vérification de signature en **E2E** (provisionner une
  paire à la volée dans le job CI, aucune clé n'étant committable).
- `RECOMMAND_FOLLOWUP` — consolidation mémoire : `PIT-S13-003`, `PIT-S15-003` et le pattern
  `${JWT_SECRET}` de `patterns.md` sont périmés (rôle du lead).
- `RECOMMAND_TEST_RUNNER` — pour une repasse E2E Playwright complète (backend + DB requis),
  non lancée ici.

STATUS: COMPLETED
