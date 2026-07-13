# Issue #145 — E2E Playwright flux mot de passe oublié

commits: [c4137c9]

resume:
- Objectif: 1er E2E cross-system auth = forgot → lien tokenisé → reset → login.
- Spec: `frontend/e2e/forgot-password.spec.ts` (register frais → forgot → capture token → reset → login nouveau mdp → dashboard). Sélecteurs = data-testid #53 uniquement, routes /fr/*.
- Helper: `frontend/e2e/support/db.ts` — capture token.
- Canal capture token = LECTURE DB DIRECTE (poll table `password_reset_tokens` V6, join users par email, `pg` node). SEUL canal déterministe: email NO-OP en test (BrevoEmailService sans BREVO_API_KEY), token jamais loggé, aucun endpoint test-only, pas de MailHog. INSERT @Async → poll jusqu'à apparition (10s budget).
- Nominal = 1 SEUL login réussi, 0 tentative échouée → ne déclenche PAS lockout #141.
- Deps: +pg +@types/pg (devDep frontend). CI: env DB (E2E_DB_*) ajouté au step e2e (même service Postgres que backend, defaults helper = valeurs CI).
- RUN E2E RÉEL: `npx playwright test forgot-password.spec.ts` → **6 passed (18.1s)** (5 setup + mon spec 3.8s PASSED). Stack: backend jar dev :8080 + DB propre `eventmanager_e2e` (Postgres local `eventmanager` était pollué pré-V7, non lié à mon code) + front webServer Playwright. eslint/tsc verts.

[MEMORY:pattern] Problem: capturer token reset en E2E sans canal exposé (email no-op, token non loggé). Solution: lecture DB directe poll `password_reset_tokens` (helper support/db.ts, dep `pg`, defaults = creds service Postgres CI). Anti-pattern: parser log backend (token jamais loggé) ou hack endpoint.
[MEMORY:pitfall] Context: DB locale `eventmanager` bloquée à V3, boot backend échoue à V7 (`events_recurrence_unit_check` sur données stale). Solution: `CREATE DATABASE eventmanager_e2e` (non destructif) + DB_URL dessus → Flyway rebuild propre. Prevention: E2E sur DB jetable fraîche, jamais la DB dev polluée.

recommandations suite:
- RECOMMAND_FOLLOWUP: canal token découplé du schéma DB (endpoint test-only `@Profile("e2e")` renvoyant dernier token, ou capture via mock EmailService en mémoire) → supprime le couplage `db.ts`↔V6 et la dép `pg`. Backend, hors scope #145 (issues #141/#143/#139 en parallèle).
- RECOMMAND_FOLLOWUP: cas d'échec (ancien mdp rejeté, token consommé rejoué) volontairement omis du nominal pour éviter lockout #141 — à ajouter en spec séparée après stabilisation #141.

STATUS: COMPLETED
