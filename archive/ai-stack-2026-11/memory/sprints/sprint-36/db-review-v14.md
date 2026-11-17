# Review DB V14 (db-expert) — Sprint 36 #267

Verdict : **APPROUVE** (aucun CRITIQUE/MAJEUR).

- [OK] nommage idx_export_jobs_expires_at cohérent V13/V5 ; index != colonne → ddl-auto=validate non impacté ;
  rollback commenté correct/idempotent ; pas d'édition V1..V13 (checksum préservé) ; balayage horaire sain à
  l'échelle MVP (FK CASCADE, autovacuum suffit).
- [MINEUR / optionnel] index full b-tree sur colonne NULLABLE : expires_at est NULL pour PENDING/RUNNING/FAILED.
  Un index partiel `WHERE expires_at IS NOT NULL` serait plus fin (index plus petit, maintenance moindre).
  NON bloquant MVP (le planner utilise l'index full). → RECOMMAND_FOLLOWUP [triage XS | domaine transversal]
  (issue-267) : passer V-future ou éditer V14 en index partiel si volume de jobs non-expirables croît.
- [MINEUR / note] requête purge filtre expires_at seul (pas status) : OK via invariant (seuls COMPLETED ont
  expires_at). Ne PAS coupler l'index à l'enum status en MVP.
