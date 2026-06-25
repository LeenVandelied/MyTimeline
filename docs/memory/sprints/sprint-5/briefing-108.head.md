[BRIEFING ISSUE #108]

## Issue
[DB] V1 baseline Flyway omet les contraintes CHECK/NOT NULL legacy de la table events

## Contexte

Détecté pendant la review intent de la PR #106 (Sprint 3, issue #42 Flyway baseline).
Source : `docs/memory/sprints/sprint-3/issue-42-done.md` + `backend/src/main/resources/db/migration/V1__baseline.sql`.

La baseline `V1__baseline.sql` a été générée depuis les **métadonnées Hibernate** (export `schema-generation`), pas depuis un `pg_dump` de la base dev réelle. Résultat : V1 ne capture PAS plusieurs contraintes d'intégrité présentes sur la base dev `eventmanager` (ajoutées hors Hibernate, legacy pré-Flyway).

## Drift constaté (table `events`)

| Colonne | Base dev réelle | V1 baseline |
|---|---|---|
| `events.type` | `varchar(20) NOT NULL` + CHECK `(type IN ('duration','single'))` | `varchar(255)` nullable, aucun check |
| `events.duration_unit` | CHECK `(IN ('days','weeks','months','years'))` | `varchar(255)`, aucun check |
| `events.recurrence_unit` | CHECK `(IN ('weeks','months','years'))` | `varchar(255)`, aucun check |

`spring.jpa.hibernate.ddl-auto=validate` ne détecte pas ce drift (Hibernate ne valide ni les CHECK ni le NOT NULL, et tolère les écarts de longueur varchar).

## Impact

- Sur la base **dev existante** : `baseline-on-migrate=true` → V1 n'est jamais exécuté, les contraintes legacy restent. OK.
- Sur un **déploiement frais** (CI, prod 1er run) : V1 s'exécute et crée `events` SANS ces contraintes + types plus larges → divergence de schéma entre environnements + bug d'intégrité latent (un `type` hors `duration/single` serait rejeté en dev mais accepté en prod fraîche).

## À faire

- Créer une migration `V4__reconcile_events_constraints.sql` **idempotente** qui aligne les environnements frais sur les contraintes legacy :
  - `events.type` → `varchar(20) NOT NULL` + CHECK `(type IN ('duration','single'))`
  - CHECK sur `duration_unit` et `recurrence_unit`
- Idempotence obligatoire (la base dev a DÉJÀ ces contraintes) : `DROP CONSTRAINT IF EXISTS` puis `ADD`, ou garde conditionnelle. Tester sur base vierge ET sur la base dev (Flyway v3 → v4 sans erreur "already exists").
- Rollback commenté dans la migration.
- Vérifier qu'aucune autre table (products, categories, users) ne présente le même drift legacy (auditer via `pg_dump --schema-only` vs V1).

## Triage estimé

M | Domaine : devops / DB (Flyway)

## Origine

Finding MAJEUR de la review intent PR #106 (reverse-engineering aveugle). NB : ne PAS éditer V1/V2/V3 (déjà appliquées → checksum mismatch) — passer par V4.


## Plan d'implementation (architect, /sprint plan)
```yaml
issue_108:
  fichiers_cles: ["backend/src/main/resources/db/migration/V4__reconcile_events_constraints.sql"]
  couches_touchees: ["infrastructure/db"]
  strategie_test: "integration Testcontainers — base vierge applique V1->V4 sans erreur ; base dev (contraintes deja la) applique V4 idempotent sans 'already exists'"
  risque_regression: "non-idempotence -> echec Flyway sur base dev qui a deja les contraintes ; events.type varchar(255)->varchar(20) echoue si donnees existantes >20 chars (verifier longueur reelle avant de restreindre) ; NE PAS editer V1/V2/V3 (checksum mismatch Flyway)"
  ordre_ecriture: "creer V4 idempotent : DROP CONSTRAINT IF EXISTS puis ADD CHECK (type IN ('duration','single')) + SET NOT NULL ; CHECK sur duration_unit / recurrence_unit coherents avec l'enum applicatif ; rollback commente en fin de fichier ; verifier que les valeurs reelles respectent deja les CHECK avant de les poser"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "DRIFT CONFIRME — V1__baseline.sql cree events.type en varchar(255) nullable, AUCUN CHECK sur type/duration_unit/recurrence_unit. Faux positif Phase 0.5 (le concept 'events' existe mais les contraintes manquent)."
```
IMPORTANT : avant de poser un CHECK ou varchar(20), inspecte la definition reelle de la table events dans V1__baseline.sql ET l'entite EventEntity (enum des valeurs type/unit) pour aligner les valeurs autorisees. Ne devine pas les valeurs d'enum.

## Triage
Taille: M
Modele: opus
Effort: xhigh
