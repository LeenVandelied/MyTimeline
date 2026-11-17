# Mini-plans architect — Sprint 32

> Généré par /sprint plan (architect, focus MVP, 2026-07-07). Lu par /sprint start Phase 4.1.
> Thème : Portabilité RGPD backend (obligation légale EU). Cohésion 1.00 (mono-issue).
> Migrations : possiblement V13 (table suivi jobs async — à déterminer par fullstack-dev).
> BLOQUE #59 (S33) : le DTO export doit être figé et documenté en fin de S32.
> ⚠ ADR REQUIS : aucune infra de jobs async aujourd'hui.

issue_58:
  fichiers_cles:
    - "backend/.../domain/export/ (nouveau agrégat/port ExportPort — PUR Java, aucun import framework)"
    - "backend/.../application/export/GenerateGdprExportUseCase"
    - "backend/.../infrastructure/adapters/controllers/ExportController (REST /api/me/export)"
    - "backend/.../infrastructure/adapters/export/{JsonExporter, MarkdownExporter, ZipCsvExporter}"
    - "backend/.../infrastructure/adapters/jobs/ (nouveau — runner async + store statut + URL signée)"
    - "backend/.../db/migration/V13__export_jobs.sql (SI table de suivi retenue — à déterminer)"
  couches_touchees: ["domain", "application", "infrastructure", "infrastructure/jobs", "db"]
  strategie_test: |
    - domain: test unitaire pur assemblage snapshot (profil+produits+événements+catégories), aucune fuite de champ tiers
    - application: use case orchestration (sync JSON/MD inline vs async ZIP/CSV)
    - infrastructure: test intégration endpoint (JSON+MD inline 200), job async (soumission→polling→URL signée valide 24h→expirée après)
    - respecter hexagonal : ports d'abord, adapters ensuite
  risque_regression: |
    - RGPD = complétude légale : OMETTRE une entité = non-conformité → checklist exhaustive des données perso avant merge
    - async sans infra existante = risque archi majeur → ADR REQUIS (choix: @Async/ThreadPool vs table+scheduler vs futur queue). Signaler [MEMORY:decision] au lead.
    - URL signée : fuite si secret faible → réutiliser mécanisme de signature existant, expiration stricte
    - le chemin sync (JSON/MD inline) DOIT rester livrable même si l'async glisse
  ordre_ecriture: "ADR job async → domain snapshot + ExportPort → use case → JsonExporter+MarkdownExporter (chemin sync d'abord) → ExportController sync → puis ZipCsv+job async+polling+URL signée → migration V13 si retenue"
  zod_dto_sync: "OUI — schéma de réponse export (statut job + format) à documenter côté contrat pour que #59 (frontend) s'aligne. Préparer le DTO ici, source de vérité pour S33."
  possibly_done: false
  etat_reel_du_code: "(aucune evidence) — endpoint absent confirmé (ISSUE_STATE #58 false)"

# ADR à produire : docs/adr/ADR-XXX-export-rgpd-async-job.md (choix infra job) + [MEMORY:decision] au lead.
