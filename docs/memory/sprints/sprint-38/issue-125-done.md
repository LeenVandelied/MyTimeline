# Issue #125 — done

## Commits
- 8e9e0fd (cherry-pick de ccf9280 — voir incident ci-dessous)

## Incident worktree (PIT connu sprint-subagent-worktree-cwd)
Le subagent a travaillé dans le repo principal (`~/VSProjects/MyTimeline`, branche `sprint/34`) malgré le garde-fou CWD du briefing, et a commité `ccf9280` sur `sprint/34` (local, NON poussé — origin/sprint/34 = a9663cc intact). Vérifié : `AuthController.java` identique entre sa base (5c8809a, ancêtre d'origin/dev) et HEAD sprint/38 → cherry-pick sans conflit = `8e9e0fd`. Ses tests ont tourné sur base périmée → revalidation par test-runner Phase 6 sur HEAD réel. Reste à nettoyer : `sprint/34` local pointe encore sur ccf9280 (reset à demander au dev).

## Résumé
Uniformisation du contrat d'erreur JSON sur `AuthController` : tous les `.body("texte")` remplacés par `.body(Map.of("error"/"message", ...))`. Erreurs → `{"error":...}`, succès → `{"message":...}`. Endpoints touchés : `/me` (401 no-token, 404 user-not-found, 401 invalid/expired, 500), `/register` (409 exists, 201 success, 500), `/logout` (200 success, 500), `/refresh` (200 success). `/login` déjà JSON (#116), inchangé.

Format `{"error":...}` cohérent avec #116 + `SecurityConfig.writeJsonError` (#126). Messages humains conservés (pas de code snake_case `ErrorCode` — `AuthController` utilise déjà des messages dans `error`, ex. login `"Invalid username or password"`). `ErrorCode`/`GlobalExceptionHandler` non touchés (inutile).

BR touchées : BR-AUT-001 (register conflict), BR-AUT-008 (/me), BR-AUT-010 (logout). Anti-pattern A4 partiellement réduit (bodies erreur désormais tous JSON ; `catch(Exception)` générique demeure mais renvoie `{"error":...}`).

Frontend : audité `authService.ts`/`apiClient.ts`/`AuthContext.tsx`/`register/page.tsx` — aucun parsing de texte brut, gestion 100% status-based. Zéro changement frontend nécessaire.

Tests : `AuthControllerErrorContractTest` (nouveau, standaloneSetup+Mockito, 5 tests) vérifie `Content-Type: application/json` + `$.error`/`$.message` sur /me, /register, /logout. Suite backend verte (BUILD SUCCESS, 0 échec).

Pitfall : `standaloneSetup` ne monte pas `GlobalExceptionHandler` ni la chaîne Security — OK ici car on teste les corps produits directement par le contrôleur. Les 401/403 Security restent couverts par `AuthErrorContractIntegrationTest`.

## Signaux mémoire
Aucun (pattern déjà documenté S5/#116).

## Recommandations suite
Aucune. Note subtile : les 401 Security sur routes protégées renvoient `{"error":"unauthorized"}` (code) tandis qu'`AuthController` renvoie des messages lisibles dans `error` — deux vocabulaires cohabitent dans le champ `error`, par design historique ; non bloquant.

STATUS: COMPLETED
