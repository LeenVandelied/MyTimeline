# `.ai-env/` — Layer B (configuration ai-env possédée par le projet)

Le plugin `ai-env` (Layer A, `~/.claude/plugins/cache/edel-projects/ai-env/<version>/`)
est en cache lecture-seule : **on ne le modifie jamais**. Tout ce qui est propre à
MyTimeline vit ici.

## Contenu

| Chemin | Rôle |
|---|---|
| `config.yaml` | Configuration runtime lue par les scripts Layer A (`lib/ai-env-config.sh`) |
| `context-packs/br-*.md` | Business rules par domaine (écrits à la main) |
| `context-packs/cp-*.md` | Packs de stack |
| `context-packs/coverage-*.md` | Couverture de tests par domaine (volatile) |
| `context-packs/pit-*.md` | **Générés** — voir `tools/gen-pit-packs.sh` |
| `rules-jit/` | Règles JIT injectées après le `CACHE_CONTROL_BREAKPOINT` |
| `tools/` | Générateurs Layer B |

## `rules-jit/` — pourquoi ici et pas dans `.claude/`

`config.yaml` déclare `rules_jit_dir: ".ai-env/rules-jit"`. Le dossier a longtemps
manqué : `inject-pack.sh` émettait `[WARN] règle JIT introuvable` **sur stderr** et
n'injectait aucune règle — échec parfaitement silencieux côté briefing.

`.ai-env/` est tracké par git ; `.claude/` est ignoré en bloc (`.gitignore:100`).
Le Layer B durable doit donc vivre sous `.ai-env/`.

- `backend.md`, `frontend.md` — **copies** de `rules-jit/` du plugin, avec en-tête de
  provenance. Copies et non symlinks : le cache plugin est hors dépôt et versionné.
  **À re-differ contre la source à chaque bump du plugin** (dérive sinon silencieuse).
- `ux-patterns.md` — **symlink relatif** vers `../../.claude/rules-jit/ux-patterns.md`,
  qui est la version projet (force-add dans git malgré l'ignore de `.claude/`).
  Symlink et non copie : source unique, l'agent `ui-design` référence l'ancien chemin.

## `tools/gen-pit-packs.sh`

`inject-pack.sh` réclame `pit-<stack>.md` à chaque briefing. Ces packs n'existaient
pas : les pitfalls consolidés en fin de sprint n'atteignaient **jamais** les
sous-agents.

```bash
bash .ai-env/tools/gen-pit-packs.sh          # régénère les deux packs
bash .ai-env/tools/gen-pit-packs.sh --check  # exit 1 si périmés
```

À relancer **en fin de sprint**, après consolidation de `docs/memory/pitfalls.md`,
et après avoir complété `tools/pit-classification.tsv` (une entrée non classée part
dans les deux packs et est signalée sur stderr — jamais de perte silencieuse).

Les packs ne reprennent pas `pitfalls.md` en entier : 183 entrées / 133 Ko, dont les
post-S49 font ~10 lignes. Verbatim intégral = 70 Ko (backend) et 96 Ko (frontend)
dans *chaque* briefing. D'où le découpage §1 texte intégral (sprints ≥ S53 +
récurrents) / §2 index de titres.

## Garde-fous `.claude/hooks/`

Ces deux scripts sont dans `.claude/`, donc **non versionnés** : à recréer sur un
nouveau poste ou un clone frais (ou à `git add -f`, comme `ux-patterns.md`).

- `check-sprint-completeness.sh` — shim. `/ai-env:sprint` (`end.md` Phase 1 étape 4)
  appelle ce chemin **en dur** alors que l'implémentation vit dans le plugin. Sans le
  shim, l'appel échoue et `/sprint end` continue sans vérifier la complétude.
- `pre-spawn-fullstack.sh` — shim de normalisation. Le hook Layer A teste
  `subagent_type != "fullstack-dev"` en **égalité stricte**, or les agents du plugin
  sont exposés namespacés (`ai-env:fullstack-dev`) : le garde-fou sortait en 0 sans
  rien vérifier. Le shim retire le préfixe `<plugin>:` puis délègue. Enregistré dans
  `.claude/settings.json` (`PreToolUse` / matcher `Agent`).
