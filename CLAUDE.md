# MyTimeline : instructions Claude Code

> Fichier court par design. Le contexte métier et technique vient des context packs du plugin ai-stack, chargés à la demande.

## État du projet

- Sprint en cours : voir `docs/memory/sprint-history.md` (si créé)
- Migrations : Flyway actif (source de vérité), `backend/src/main/resources/db/migration/` contient V1..V16 (dernier : `V16__user_theme_preference.sql`) ; `ddl-auto=validate` (dev + prod). Tout changement de schéma exige une migration V{N} + un mapping entité exact, sinon `SchemaManagementException` au boot. **Prochaine migration : V17.**

## Stack

- **Backend** : Java 21 + Spring Boot 3.4.13 + Hibernate/JPA + Spring Security + JWT (JJWT)
- **Frontend** : Next.js 16 (Turbopack en dev et en build) + TypeScript 5 + Tailwind CSS v4 + Radix UI
- **Forms** : react-hook-form + Zod
- **i18n** : next-intl + Crowdin (locale principale : `fr`)
- **DB** : PostgreSQL (eventmanager @ localhost:5432)
- **Tests** : JUnit (Spring Boot Test), Vitest (frontend), Playwright (E2E, `npm run test:e2e`)
- **CI** : GitHub Actions (`.github/workflows/ci.yml`). Checks obligatoires sur `dev` : `backend`, `frontend`, `e2e`, avec une branche à jour.
- **Auth** : JWT custom (JwtService, JwtFilter)

## Architecture

Hexagonale stricte (backend) :
- `domain/` — modèles métier + ports (interfaces) ; AUCUN import Spring/JPA
- `application/` — DTOs, mappers, services (implémentations des ports)
- `infrastructure/` — entities JPA, repositories, controllers, security

## Plugin ai-stack

Le projet est installé avec le plugin `ai-stack` (marketplace `sqli`). Ses context packs sont versionnés dans `ai-knowledge/packs/` : un pack de domaine (`timeline`), quatre transversaux (`authorization`, `batch`, `integrations`, `state-machine`) et trois techniques (`backend-socle`, `frontend-socle`, `migrations`).

- La session principale ne lit pas les packs directement (le verrou `pack-guard` le refuse). Le contexte se charge par `/ai-stack:load-context`, que les skills de cycle appellent eux-mêmes.
- La session principale n'écrit pas dans le dépôt (verrou `dev-guard`). Le code et les fichiers du dépôt passent par le sous-agent `ai-stack:dev-agent`.
- La config (`.ai-stack/workspace.json`) et la base de faits (`ai-knowledge/base/`) ne sont pas versionnées. Elles n'existent que dans le checkout principal. Lancer les sessions de développement depuis ce checkout, sur la branche `dev`, et pas dans un nouveau worktree, où les skills ne trouvent pas la config.
- Après la fusion d'une PR qui touche le code, rejouer `/ai-stack:refresh-knowledge` pour mettre les packs à jour.

Skills les plus utiles :

```bash
/ai-stack:new-feature   /ai-stack:fix-bug      /ai-stack:review-pr
/ai-stack:spec          /ai-stack:brainstorm   /ai-stack:ops
/ai-stack:sprint-plan   /ai-stack:sprint-start /ai-stack:sprint-close
/ai-stack:recette-plan  /ai-stack:recette      /ai-stack:run-local
/ai-stack:refresh-knowledge                    /ai-stack:persona-run
```

La recette se connecte avec les comptes de test déclarés dans `.ai-stack/workspace.json` (`run.accounts`). Leurs mots de passe se lisent dans les variables d'environnement `MYTIMELINE_RECETTE_PASSWORD` et `MYTIMELINE_RECETTE_ADMIN_PASSWORD`, à définir sur le poste.

## Conventions

- Commits : gitmoji puis type conventionnel, en français, par exemple `:sparkles: feat(timeline): …` (motif contrôlé dans `.ai-stack/workspace.json`, `conventions.commit`).
- Code en anglais, documentation en français.
- Les PR visent `dev`.

## Héritage ai-env

Le dossier `.ai-env/` vient de l'ancien plugin `ai-env`, qui n'est plus installé. Il reste utilisé par le job CI `ai-env-packs` (packs `pit-*` générés depuis `docs/memory/pitfalls.md`). Ses packs écrits à la main (`context-packs/br-*.md`) ne sont pas chargés par ai-stack. `docs/memory/` reste une référence à lire à la demande, pas au démarrage de session.
