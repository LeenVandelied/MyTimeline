# Specialists — Sprint 8

## db-expert (migration V6) — Verdict : mergeable
- **[MAJEUR]** `password_reset_tokens` sans TTL/purge → croissance non bornée (1 ligne/forgot, jamais supprimée hors CASCADE suppression user). Action : job cleanup `DELETE WHERE used_at IS NOT NULL OR expires_at < now() - interval`. **Hors-scope V6 → follow-up** (= RECOMMAND_FOLLOWUP #2 de #49).
- **[MINEUR]** V6 docstring (l.23) liste `createdAt` mais ni table ni entité ne portent `created_at` (copié du pattern audit V3). Corriger la prose, aucun impact runtime.
- **[MINEUR]** PK `id` en `GenerationType.AUTO` (pas UUID v7). Hérité de V1 baseline, pas une régression #49. À traiter globalement si migration v7 un jour.
- **[OK]** entité ↔ V6 alignées (`ddl-auto=validate` safe), naming conforme V1..V5, FK CASCADE, index `token`(unique)+`user_id`, rollback commenté présent.

## security-expert (flux reset) — 1 CRITIQUE bloquant
- **[CRITIQUE]** `PasswordResetServiceImpl` (l.74-95) — timing leak BR-AUT-005 : email connu → UUID gen + INSERT + Brevo HTTP sync ; email inconnu → return immédiat. Délai réseau mesurable révèle l'existence du compte. **FIX REQUIS** : envoi email async (les 2 branches retournent vite) OU temps constant.
- **[MAJEUR]** `apiClient.ts` (l.54-62) — `isInlineAuthRequest` via `url.includes(endpoint)` non ancré → futur endpoint partageant la sous-chaîne exclu du handler 401 global (401 réel avalé). **FIX trivial** : match exact / `endsWith`. → ABSORBER.
- **[MINEUR]** `BrevoEmailService` (l.97) — `safeName` injecté brut dans `htmlContent` sans escape → XSS mail si `name` contient du HTML. **FIX trivial** : `HtmlUtils.htmlEscape`. → ABSORBER.
- **[MAJEUR→FOLLOWUP]** `BrevoEmailService` (l.63-68) — no-op silencieux si `BREVO_API_KEY` absente : prod sans alerting = emails jamais envoyés. Reco fail-fast prod / health indicator. (= RECOMMAND_SECURITY #49)
- **[MAJEUR→FOLLOWUP]** `RateLimitingFilter` (l.53-54) — reset-password limité par IP, pas par token (pas de lockout token). UUID v4 (122 bits) rend le brute-force impraticable, mais defense-in-depth absente.
- **[MINEUR→FOLLOWUP]** `PasswordResetServiceImpl` (l.103-128) — TOCTOU entre `findByToken` et `consume()` (pas de `SELECT FOR UPDATE`/`@Version`). Faible impact (2 requêtes simultanées même token).
- **[MINEUR→doc déploiement]** `RateLimitingFilter` remoteAddr derrière reverse proxy non-trustForwarded → IP partagée.
- **[OK]** anti-énum code retour (200 uniforme), 400 générique unique, expiration serveur via `isUsable(Clock)`, consume après update OK, token unique DB, clé/token jamais loggés.
- **[MEMORY:pitfall]** anti-énumération : vérifier le **timing**, pas que le code retour (branche compte-existe vs inconnu = side-channel).
- **[MEMORY:pitfall]** exclusion liste blanche par `url.includes()` = fragile (faux négatif si endpoint futur partage la sous-chaîne).

## test-runner (suite complète) — VERT
- Backend : **82/82** OK (vs 68 sur dev → +14 : 9 `PasswordResetServiceImplTest` + 5 `PasswordResetEndpointsIntegrationTest`).
- Frontend : **23/23** OK, 0 erreur TS. 11 RTL ajoutés (login/register/forgot/reset).
- `@tanstack/react-query ^5.101.2` présent dans `package.json` sur sprint/8 → suites `useCurrentUser`/`useProductsWithEvents` VERTES (le RECOMMAND_FOLLOWUP #3 de #53 « merger #48 » est CADUC).
- Verdict : OK. Working tree code propre (aucune pollution).

## reviewer (diff complet) — checklist tout OK
- **[OK]** hexagonal (port injecté), secrets (BREVO_API_KEY jamais en dur/loggé), anti-énum BR-AUT-005 (200/400 générique), @Valid présent, V6↔entité cohérents, tokens DS (zéro hardcode 4 écrans), états loading/erreur/succès, Zod BR-AUT-003 (A12 résolu), i18n fr/en/es/de, apiClient whitelist + AuthContext rethrow (cohérent #132), a11y Spinner.
- **[MINEUR]** `apiClient.ts` `url.includes()` substring large → `endsWith`/égalité (= MAJEUR security, convergent → FIX absorb).
- **[MINEUR]** reset sans rate-limit applicatif par token au-delà de l'IP (acceptable UUID 122 bits → follow-up).
- **[MEMORY:pattern]** port domaine pur (`PasswordResetService`/`EmailService`) bien exécuté → référence pour futurs flux secrets (SMS/2FA).
- **[MEMORY:pitfall]** `br-auth.md` A10 PÉRIMÉ : email a déjà `uq_users_email` (V2 #32), contrairement à la note « NON IMPLÉMENTÉ » → lookup email NON ambigu (lève le doute db-expert/security). Rafraîchir le pack au cycle mémoire (Phase 2 /sprint end).

---

## Périmètre fix (1 dispatch fullstack-dev)
1. **[CRITIQUE]** timing leak forgot-password → traitement async (200 immédiat, lookup+token+email en background, branches indistinguables).
2. apiClient `url.includes` → match ancré (`endsWith`/pathname exact).
3. `safeName` → `HtmlUtils.htmlEscape` dans `BrevoEmailService`.
4. V6 docstring `createdAt` → retirer la mention.

## Follow-ups (triage Phase 4 /sprint end)
- Brevo fail-fast prod / health indicator [S | auth] (RECOMMAND_SECURITY)
- rate-limit/lockout par token reset-password [S | auth]
- TOCTOU `@Version` sur consume token [XS | auth]
- TTL/purge job tokens expirés/consommés [S | auth] (RECOMMAND_FOLLOWUP #49)
- i18n template email EN/DE/ES [S | auth] (RECOMMAND_FOLLOWUP #49)
- BrevoEmailService test unitaire dédié (mock RestClient) [XS | auth] (RECOMMAND_FOLLOWUP #49)
- E2E Playwright flux reset complet [M | auth] — V3, traité par le lead ce sprint (Phase 8)
- valider rendu visuel clair/sombre 4 écrans en navigateur [S | auth] (RECOMMAND_FOLLOWUP #53)
- rafraîchir br-auth.md A10 (email unique) [XS | mémoire]
