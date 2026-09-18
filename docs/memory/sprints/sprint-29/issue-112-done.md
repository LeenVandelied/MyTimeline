# Issue #112 — Purger les anciens secrets de l'historique git (runbook)

**Commit :** 22b6284
**Scope livré :** RUNBOOK DOCUMENTÉ UNIQUEMENT (arbitrage dev 2026-07-11). Aucune exécution destructive.

## Livrable
`docs/ops/purge-git-secrets-runbook.md` (230 lignes) — encart STOP + §1 évaluation + §2 pré-conditions (freeze, comm, PR gelées, inventaire worktrees) + §3 backup `git clone --mirror` + §4 cibles (`application.properties`, noms `DB_PASSWORD`/`JWT_SECRET`/`BREVO_API_KEY`, `--replace-text` avec placeholders) + §5 commandes `git filter-repo` + §6 force-push & impact + §7 rotation secrets + §8 vérif post-purge.

## Garanties sécurité
- AUCUN `filter-repo` / `force-push` / `rm` / `clean` exécuté (Write+commit seulement).
- AUCUNE valeur de secret exposée (noms de variables uniquement ; `git log --oneline`, jamais `-p`).

## Recommandations suite
- RECOMMAND_SECURITY : rotation `DB_PASSWORD` + `JWT_SECRET` (+ vérifier `BREVO_API_KEY`) à planifier INDÉPENDAMMENT (requise même sans purge ; rotation JWT_SECRET = déconnexion globale).
- Purge historique = fenêtre de gel planifiée + "oui" explicite dev avant exécution (destructif/irréversible) → session ops dédiée.
- `docs/memory/devops/external-services-inventory.md` référencé (RTK.md §3quater) mais ABSENT du dépôt → à créer (procédure rotation par service). RECOMMAND_FOLLOWUP.

## STATUS
COMPLETED
