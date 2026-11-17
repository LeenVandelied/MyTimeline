# Archive de la stack IA (novembre 2026)

Ce dossier conserve l'outillage Claude Code utilisé jusqu'au sprint 112, basé sur le plugin `ai-env`. Il a été retiré du projet actif pour laisser la place à un nouveau plugin. Rien ici n'est lu par le build, les tests ou la CI.

## Contenu

| Chemin archivé | Ancien emplacement | Rôle |
|---|---|---|
| `CLAUDE.md` | `CLAUDE.md` | Instructions projet chargées par Claude Code |
| `ai-env/` | `.ai-env/` | Layer B du plugin ai-env (config, context packs, rules JIT, générateurs) |
| `claude/output-styles/` | `.claude/output-styles/` | Output style « product-owner » |
| `claude/rules-jit/` | `.claude/rules-jit/` | Version projet de `ux-patterns.md` (l'ancien symlink `.ai-env/rules-jit/ux-patterns.md` pointait dessus et n'a pas été conservé) |
| `memory/` | `docs/memory/` | Mémoire de projet (historique des sprints, décisions, pitfalls, bugs résolus, audits, runbooks devops) |
| `pr-sprint.md` | `pr-sprint.md` | Dernier corps de PR de sprint généré |

## Ce qui a changé ailleurs

- Le job CI `ai-env-packs` a été supprimé de `.github/workflows/ci.yml` (il vérifiait la fraîcheur des packs `pit-*.md`).
- La ligne `frontend/.ai-env/` a été retirée du `.gitignore`. `.claude/` reste ignoré (worktrees, caches locaux).
- Toutes les références `docs/memory/...` et `.ai-env/...` du code, des specs e2e, des ADR et de la doc pointent désormais vers `archive/ai-stack-2026-11/...`.
- Exceptions volontaires : l'empreinte gitleaks de `.gitleaksignore` (liée à un commit historique, le chemin doit rester tel quel) et la migration `V12__users_role_not_null_check.sql` (non modifiable, le checksum Flyway casserait).

## Récupérer un élément

Les fichiers ont été déplacés avec `git mv`, l'historique reste accessible :

```bash
git log --follow -- archive/ai-stack-2026-11/memory/decisions.md
```
