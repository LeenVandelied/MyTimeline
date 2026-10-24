# Revues spécialistes — Sprint 111 (#653 backend)

## db-expert — V16 (commits 03dc445e, f602cd25) — 0 CRITIQUE / 0 MAJEUR / 3 MINEURS
- [OK] Mapping `varchar(16)` nullable ↔ `@Column(length=16)` + `ThemePreferenceConverter` ; CHECK nommé ; ADD COLUMN nullable sans défaut = métadonnée seule ; rollback commenté.
- [OK] Concurrence : `@Version` sur `users`, 409 via `GlobalExceptionHandler` (pas 500) ; `copyMutableFields` exclut le thème.
- [OK] Export RGPD JSON/CSV/Markdown.
- [MINEUR] 3 ALTER = 3 verrous exclusifs → un seul `ALTER TABLE` + `lock_timeout` (sans effet au volume actuel).
- [MINEUR] `UserRepositoryJpaImpl.updateThemePreference` hérite de `@Transactional(readOnly=true)` : marche parce que le service ouvre une transaction RW → poser `@Transactional` sur la méthode.
- [MINEUR] Ancien V16 (#452, `072a40a6` ajouté puis retiré par `61ca5d0f`, 2026-09-02) : base e2e à V15 (lue), volume dev local `mytimeline_postgres-data` non vérifié. Remédiation : `DELETE FROM flyway_schema_history WHERE version='16'` si description `delete unbounded recurring events`, puis redémarrer — JAMAIS `flyway repair` (marquerait V16 appliquée sans créer la colonne).
- [MINEUR] Front : chaque PUT incrémente `users.version` → 409 possible si PUT de connexion concurrent d'un PATCH/avatar.

## security-expert — PUT /api/me/preferences — 0 CRITIQUE / 0 MAJEUR / 1 MINEUR
- [OK] Identité exclusivement via `CallerResolver` (SecurityContext), aucun id dans body/path ; 401 anonyme prouvé bout-en-bout.
- [OK] CSRF : PUT JSON = requête non simple → preflight CORS, liste blanche d'origines ; `no-cors` ne peut poser `application/json` → 400/415.
- [OK] Validation `@NotNull @Pattern(light|dark|system)` + CHECK DB ; DTO à un seul champ (pas de mass assignment).
- [OK] BR-AUT-008 respectée ; aucun log ajouté.
- [MINEUR] Route exclue du throttling (`RateLimitingFilter.java:78-83`) alors qu'elle écrit en base à chaque appel → proposé : `PUT /api/me/preferences` à 10/min/IP comme `PATCH /api/me`.
  - Arbitrage lead : NON appliqué dans ce sprint. Le limiteur est actif en E2E (#547) et compte par IP : toutes les specs authentifiées qui basculent le thème partagent le seau de 127.0.0.1 → risque de 429 silencieux (le front tolère l'échec du PUT) qui rendrait les assertions « compte = dark » intermittentes. Un plafond par utilisateur serait la bonne forme → follow-up à trier au /sprint end.
