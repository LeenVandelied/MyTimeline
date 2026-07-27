# Follow-ups détectés par le LEAD — Sprint 47

> À traiter en Phase 4 (triage interactif) de `/sprint end 47`, au même titre que les
> `RECOMMAND_FOLLOWUP` des done.md.

## 1. `frontend/.eslintcache` est tracké alors qu'il est gitignoré

**Constat** — le fichier est suivi par git ET listé dans `frontend/.gitignore`. Un `.gitignore`
n'a aucun effet sur un fichier déjà tracké : la règle est donc inopérante et trompeuse.

**Impact mesuré pendant ce sprint** — deux agents (#314 puis #205) l'ont supprimé en lançant ESLint,
faisant apparaître une suppression parasite dans `git status`. #314 l'avait restauré, #205 l'a
re-supprimé. Restauré à la main par le lead. Le contenu est un cache machine-dépendant : il churnera
dans le diff de chaque développeur, à chaque lint.

**Correction** — `git rm --cached frontend/.eslintcache` (la règle `.gitignore` prend alors effet).
Opération sur l'index uniquement, le fichier local est conservé.

**Triage** : XS | Domaine : tooling/frontend

## 2. `check-sprint-completeness.sh` — chemin d'appel du skill erroné

**Constat** — les bilans S45 et S46 consignent que le hook est « absent de ce repo » et le check a
été fait à la main deux sprints de suite. **Le script existe** : il vit dans le plugin
(`~/.claude/plugins/cache/edel-projects/ai-env/<ver>/hooks/scripts/check-sprint-completeness.sh`).
C'est le **chemin d'appel du skill** qui est faux (`.claude/hooks/…`, répertoire inexistant ici).

**Correction** — invoquer le script par son chemin plugin en Phase 1 de `/sprint end`.

**Triage** : XS | Domaine : tooling

## 3. `pre-spawn-fullstack.sh` ne s'applique jamais sur ce projet

**Constat** — le hook filtre `subagent_type == "fullstack-dev"` **exact**, alors que les agents du
plugin sont namespacés `ai-env:fullstack-dev`. Le hook sort donc en 0 sans rien vérifier. Le
garde-fou « pack inline » (anti-PIT context-pack-injection) n'est **pas** appliqué automatiquement.

**Correction** — élargir le test du hook aux types namespacés
(`*fullstack-dev` plutôt que l'égalité stricte).

**Triage** : XS | Domaine : tooling

## 4. Heuristique COVERAGE-E2E du skill cassée (déjà signalée au S46, toujours non corrigée)

**Constat** — word-splitting sur la liste de testids et confusion ajout/déplacement. Contournée
pendant ce sprint par `docs/memory/sprints/sprint-47/coverage-e2e-check.sh`, qui pourrait remonter
dans le plugin.

**Triage** : S | Domaine : tooling
