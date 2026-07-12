# MyTimeline — Instructions Claude Code

> Fichier court par design. Les règles opérationnelles sont dans `.claude/rules/`
> (chargées automatiquement par le plugin ai-env).

## État du projet

- Sprint en cours : voir `docs/memory/sprint-history.md` (si créé)
- Migrations : Flyway actif (source de vérité), `backend/src/main/resources/db/migration/` contient V1..V13 (dernier : `V13__export_jobs.sql`) ; `ddl-auto=validate` (dev + prod). Tout changement de schéma exige une migration V{N} + un mapping entité exact, sinon `SchemaManagementException` au boot. **Prochaine migration : V14.**

## Stack

- **Backend** : Java 21 + Spring Boot 3.4.13 + Hibernate/JPA + Spring Security + JWT (JJWT)
- **Frontend** : Next.js 15 (Turbopack) + TypeScript 5 + Tailwind CSS v4 + Radix UI
- **Forms** : react-hook-form + Zod
- **i18n** : next-intl + Crowdin (locale principale : `fr`)
- **DB** : PostgreSQL (eventmanager @ localhost:5432)
- **Tests** : JUnit (Spring Boot Test) + Playwright (E2E — à configurer)
- **CI** : Aucun
- **Auth** : JWT custom (JwtService, JwtFilter)

## Architecture

Hexagonale stricte (backend) :
- `domain/` — modèles métier + ports (interfaces) ; AUCUN import Spring/JPA
- `application/` — DTOs, mappers, services (implémentations des ports)
- `infrastructure/` — entities JPA, repositories, controllers, security

## Stratégie de contexte

JIT (Just-In-Time) : ne PAS lire `docs/memory/` au démarrage de session.
Voir `.claude/rules/context-pack-jit.md` pour le quoi-charger-quand.

## Règles (chargées automatiquement par le plugin ai-env)

| Rule | Scope | Quoi |
|---|---|---|
| `.claude/rules/git-workflow.md` | startup | gitmoji FR, gh issue/pr workflows |
| `.claude/rules/orchestration.md` | startup | fan-out natif, profondeur 1 |
| `.claude/rules/mcp-usage.md` | startup | exa > WebSearch, context7 > WebFetch |
| `.claude/rules/context-pack-jit.md` | startup | stratégie de chargement mémoire JIT |
| `.claude/rules/conventions.md` | startup | code EN / docs FR, Java records, TS strict, i18n |
| `.claude/rules/hexagonal.md` | startup | imports interdits par couche |
| `.claude/rules/backend-stack.md` | `backend/**` | hexagonal, Spring Boot, tests métier |
| `.claude/rules/frontend-stack.md` | `frontend/**` | TS strict, Zod, next-intl, Tailwind v4 |

## Skills disponibles (plugin ai-env)

```bash
/ai-env:story        /ai-env:new-feature   /ai-env:sprint
/ai-env:fix-bug      /ai-env:review-pr     /ai-env:brainstorm
/ai-env:memo         /ai-env:security-audit /ai-env:db-migration
/ai-env:create-e2e   /ai-env:review-e2e    /ai-env:pack-status
```
