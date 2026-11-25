# MyTimeline : instructions Claude Code

> Fichier court par design. Le contexte métier et technique vient des context packs du plugin ai-stack, chargés à la demande.

## État du projet

- Migrations : Flyway est la source de vérité. `backend/src/main/resources/db/migration/` contient V1 à V17 (dernière : `V17__user_tier.sql`), avec `ddl-auto=validate` en dev comme en prod. Tout changement de schéma exige une migration V{N} et un mapping d'entité exact, sinon `SchemaManagementException` au démarrage. Prochaine migration : V18.

## Stack

- Backend : Java 21, Spring Boot 3.4, Hibernate/JPA, Spring Security, JWT (JJWT).
- Frontend : Next.js 16 (Turbopack), TypeScript 5, Tailwind CSS v4, Radix UI.
- Formulaires : react-hook-form et Zod.
- i18n : next-intl et Crowdin (locale principale `fr`).
- Base : PostgreSQL (`eventmanager` sur localhost:5432).
- Tests : JUnit (Spring Boot Test), Vitest (frontend), Playwright (E2E, `npm run test:e2e`, voir `docs/runbook/e2e-local.md`).
- CI : GitHub Actions (`.github/workflows/ci.yml`). Checks obligatoires sur `dev` : `backend`, `frontend`, `e2e`, avec une branche à jour.
- Auth : JWT maison (`JwtService`, `JwtFilter`).

## Architecture

Hexagonale stricte côté backend :
- `domain/` porte les modèles métier et les ports (interfaces), sans import Spring ni JPA.
- `application/` porte les DTOs, les mappers et les services qui implémentent les ports.
- `infrastructure/` porte les entités JPA, les repositories, les controllers et la sécurité.

## Plugin ai-stack

Le projet utilise le plugin `ai-stack` (marketplace `sqli`). Ses context packs sont versionnés dans `ai-knowledge/packs/`. Leur liste et leurs déclencheurs sont dans `ai-knowledge/packs/_index.md`.

- La session principale ne lit pas les packs directement (verrou `pack-guard`). Le contexte se charge par `/ai-stack:load-context`, que les skills de cycle appellent eux-mêmes.
- Le code passe par le sous-agent `ai-stack:dev-agent` (verrou `dev-guard`).
- La config (`.ai-stack/workspace.json`) et la base de faits (`ai-knowledge/base/`) ne sont pas versionnées. Elles n'existent que dans le checkout principal : lancer les sessions de développement depuis ce checkout.
- Après la fusion d'une PR qui touche le code, lancer `/ai-stack:refresh-knowledge` pour mettre les packs à jour.

Skills les plus utiles :

```bash
/ai-stack:new-feature   /ai-stack:fix-bug      /ai-stack:review-pr
/ai-stack:spec          /ai-stack:brainstorm   /ai-stack:ops
/ai-stack:sprint-plan   /ai-stack:sprint-start /ai-stack:sprint-close
/ai-stack:recette-plan  /ai-stack:recette      /ai-stack:run-local
/ai-stack:refresh-knowledge                    /ai-stack:capitalize
```

La recette se connecte avec les comptes de test déclarés dans `.ai-stack/workspace.json` (`run.accounts`). Leurs mots de passe se lisent dans des variables d'environnement à définir sur le poste.

## Conventions

- Commits : gitmoji puis type conventionnel, en français, par exemple `:sparkles: feat(timeline): …` (motif contrôlé par `conventions.commit` dans `.ai-stack/workspace.json`).
- Code en anglais, documentation en français.
- Les PR visent `dev`.
