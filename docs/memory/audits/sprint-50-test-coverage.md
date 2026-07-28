# Audit tests — Sprint 50

> Généré en fin de Phase 6, complété après la Phase 8. Un marqueur de couverture manquante
> dans le tableau ci-dessous bloquerait la Phase 9 (PR).
> Chiffres mesurés par le `test-runner` (audit indépendant) puis re-mesurés après les correctifs
> de review et l'ajout de la couverture E2E.

## Couverture par règle métier

| BR | Description | Cross-system flow | Unit backend | Intégration | Vitest frontend | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| BR-AUT-007 (amendée #323) | Émission du jeton et cookie HttpOnly au login — **signature RS256** au lieu de HS256 | **OUI** (backend émet avec la clé privée, Edge vérifie avec la publique) | ✅ `JwtServiceRs256Test` | ✅ 5 suites d'intégration auth/session/export | ✅ `auth-token-verify.test.ts`, `middleware.test.ts` | ✅ `auth-guard.spec.ts` | ✅ `auth-signature.spec.ts` (12 cas) |
| Garde serveur #302 / origine du `Location` (#322) | La redirection de la garde ne doit pas hériter d'un `Host` fourni par l'appelant | NON (frontend seul) | ⚠ N/A | ⚠ N/A | ✅ `canonical-host.test.ts` (41 cas) + `middleware.test.ts` | ✅ `auth-guard.spec.ts` (17 cas) | ⚠ N/A |
| Jetons de téléchargement d'export (#58, ADR-003) | Isolation auth ↔ download, `verify()` ne lève jamais | NON (serveur seul) | ✅ `ExportTokenServiceTest` (isolation prouvée dans les 2 sens) | ✅ `ExportEndpointsIntegrationTest`, `ExportPurgeSchedulerIntegrationTest` | ⚠ N/A | ⚠ N/A | ⚠ N/A |
| #249 — audit d'exposition des secrets | Livrable documentaire | NON | ⚠ N/A | ⚠ N/A | ⚠ N/A | ⚠ N/A | ⚠ N/A |

Aucune case de couverture manquante. Le seul flux cross-system du sprint (BR-AUT-007 en RS256) est couvert en E2E
métier sur stack réellement appairée.

## Tests créés

- `backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java`
  — émission RS256, rejet d'un HS256 forgé avec la clé publique, rejet d'`alg: none` (ajouté au
  correctif de review : le rejet reposait sur le défaut jjwt et aurait régressé en silence).
- `frontend/src/lib/auth-token-verify.test.ts` — vérification WebCrypto, rejet de `alg ≠ RS256`
  avant tout appel cryptographique, dégradé sans clé, `console.warn` one-shot sur clé illisible.
- `frontend/src/lib/canonical-host.test.ts` — 41 cas de parsing/normalisation d'origine.
- `frontend/e2e/auth-signature.spec.ts` — 12 cas sur stack appairée (backend + Postgres + Next).
- Extensions de `frontend/middleware.test.ts`, `ExportTokenServiceTest`, `ProfileSafetyGuardTest`.

## Résultats des runs

| Suite | Résultat | Commande |
|---|---|---|
| Backend | **450 / 450**, 0 échec | `backend/./mvnw test` |
| Frontend (Vitest) | **788 / 788**, 88 fichiers | `./scripts/test-quiet.sh` |
| E2E signature (stack appairée) | **12 / 0**, `--workers=1` | `npx playwright test auth-signature.spec.ts` |
| E2E auth-guard + signature appairés | **31 passed / 1 skipped** | Playwright |
| E2E suite complète (mode dégradé, config CI) | **96 passed / 8 skipped / 0 failed**, 1 min 54 | Playwright |

Audit indépendant `test-runner` avant correctifs : backend 449/449, frontend 774/774, aucun écart
avec les chiffres annoncés par les agents, aucune anomalie de promesse non attendue malgré le
passage de `middleware.ts` en `async`.

## Preuve anti-faux-positif (leçon S49)

Le piège de ce sprint : **un test E2E de garde peut être vert en mode dégradé et ne rien prouver.**
Trois preuves ont été exigées et produites avant de considérer la couverture acquise :

1. la clé publique journalisée au boot du backend est **octet à octet** celle injectée au frontend,
   et le log « paire ÉPHÉMÈRE » est absent ;
2. sonde `curl -H "Cookie: jwt=bidon"` sur une route protégée ⇒ **307** (un 200 signerait le dégradé) ;
3. **fail-closed exécuté** : la même spec relancée contre un Next sans clé publique passe à
   **5 rouges sur 7** — le test échoue bien quand la vérification est absente.

## Ce qui n'est PAS couvert (assumé, listé)

- **La 2ᵉ passe E2E ajoutée à `ci.yml` n'a jamais tourné sur un runner GitHub** — le step de
  génération de paire a été exécuté verbatim en local. À observer au premier push ; `e2e` n'est pas
  un check requis sur `dev`.
- **Mode « clé publique présente mais illisible »** : couvert en unitaire, pas en E2E (exigerait une
  3ᵉ instance Next pour un chemin qui se comporte comme le dégradé déjà couvert).
- **Révocation `jti` en Edge** : non vérifiable côté middleware, `JwtFilter` reste seul juge.
  Inchangé par ce sprint.
- **Variable absente en production** : aucun garde-fou frontend n'impose `AUTH_JWT_PUBLIC_KEY` ni
  `APP_CANONICAL_HOST` (pas d'équivalent frontend au `ProfileSafetyGuard`). Follow-up ouvert.
- **Repli Base64 GNU** vérifié en alpine, pas sur l'image de déploiement finale.
- **Aucun boot réel observé pour le log de clé publique et les `console.warn`** des correctifs de
  review — couverts par tests, pas constatés sur stack démarrée.

## Conclusion

Prêt pour PR. Aucune case de couverture manquante, suites vertes, flux cross-system couvert en E2E avec preuve de
fail-closed. Les non-couvertures ci-dessus sont documentées et portées en follow-ups.
