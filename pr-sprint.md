## Sprint 24 — a11y Timeline (frise clavier + lecteur d'écran)

Rend la Vue Timeline — seul écran classé « réellement bloquant » par l'audit a11y — navigable au clavier et exposée aux lecteurs d'écran (conformité RGAA/WCAG). Sprint **100 % frontend**, cohésion **0.78**, aucune migration.

### Issues livrées (3)

| # | Titre | Size |
|---|-------|------|
| #81 | a11y : frise Timeline clavier + lecteur d'écran (**BLOQUANT**) | L |
| #197 | a11y Timeline : formaliser les patterns clavier (`ux-patterns.md`) + re-validation ui-design | S |
| #82 | a11y : cible tactile close EventDrawer ≥44px + audit final | S |

**Vagues** : V1 = #81 (pose le pattern) → V2 = #197 ∥ #82 (fichiers disjoints).

### Changements clés

- **#81 — Navigation clavier de la frise** : region landmark (`role="region"` + aria-label/describedby), **roving tabindex resource-keyé** (`activeNav {resourceId,evt}` + index dérivé via Map — résiste au collapse de catégorie), navigation flèches ←→ (dans/entre lanes) ↑↓ (colonne clampée) Home/End, Enter/Espace natifs, **aria-live polite** (annonces zoom/sélection, silencieux au montage), `aria-label` agrégé (`buildEventAriaLabel` : titre + dates + récurrence + statut en une phrase), garde-fou contraste (libellé hors barre si < 4.5:1), focus ring `outline: 2px var(--color-accent)`, `scrollIntoView` après `.focus()`.
- **#197 — Référentiel** : `.claude/rules-jit/ux-patterns.md` (10 sections) documentant les patterns RÉELS livrés par #81 (roving, focus-trap drawer, raccourcis T/[/]/+/-/F/Échap). Lève la réserve S17 (« APPROUVE_AVEC_RESERVES faute de référentiel »).
- **#82 — Cible tactile** : hitbox close EventDrawer 28→44px via `::before` (visuel de l'icône inchangé, charte Graphite respectée).

### BR impactées

- **BR-EVT-001** (ownership/lecture events) — contrat inchangé, couche a11y purement additive.
- Aucune règle métier P0/P1 cross-système → pas d'E2E métier requis.

### Audit tests (`docs/memory/audits/sprint-24-test-coverage.md`)

- **Frontend : 44 fichiers, 325/325 tests verts, 0 failed** (vérifié en run direct — `npx vitest run`). Nouveau `lib-a11y.test.ts` (8 tests `buildEventAriaLabel` + contraste), +195 lignes `TimelineView.test.tsx` (roving, flèches, aria-live, **non-régression remap collapse resource-keyé**).
- Backend : N/A (0 fichier backend).
- E2E Playwright : non exécuté (bug connu #207 : alias `e2e` lance vitest).

### Validation ui-design (`docs/memory/sprints/sprint-24/ui-design-validation.md`)

**Verdict GO PR** — conformité 100 % des 10 points de `ux-patterns.md §10` (satisfait le critère #197 de re-validation formelle). Réserves S17 levées.

### Review batch

- **0 CRITIQUE / 1 MAJEUR / 2 MINEUR.**
- MAJEUR (token focus ring `--color-accent` vs `--color-focus`) → **résolu** : écart documenté en commentaire (token exigé par le critère #81 + `ux-patterns.md §6` + validé ui-design ; rendu identique). Commit `19714f6`.
- 2 MINEUR → follow-ups non bloquants (voir ci-dessous).

### Couverture E2E (Phase 8)

⚠ 2 nouveaux testids sans spec Playwright (`timeline-event-outside-label`, `timeline-live-region`) → **`/create-e2e` post-merge** (non bloquant). `timeline-view`/`timeline-event` déjà couverts (golden-path).

### Follow-ups proposés (à trancher au `/sprint end`)

- **RECOMMAND_FOLLOWUP** : statuer sur le raccourci `?` (câbler `case '?'` vs acter le tooltip hover-only) [S | frontend].
- **RECOMMAND_FOLLOWUP** : `.mt-zoom__btn` (30px) < 44px sur surface touch mobile → override scopé `.mt-tlm` [S | frontend] (audit #82).
- MINEUR review : `data-evt-nav` dead attribute (EventPill) ; fallback `color=null` non testé (`lib.ts`) — XS.

### Nouveaux signaux mémoire

- **PAT-S24-roving-resource-keyed** : roving tabindex sur liste mutable → keyer l'état actif par ID stable, dériver l'index via Map id→index. Anti-pattern : index bruts en state (cause de la régression MAJEUR-2 corrigée).
- **PIT-S24-scrollintoview-focus** : `.focus()` seul ne défile pas les conteneurs scrollables imbriqués → `scrollIntoView` explicite requis.
- **PIT-S24-worktree-cwd** (rappel) : Read/Edit en chemin relatif dans un subagent peut résoudre sur le repo principal — garde-fou `git rev-parse --show-toplevel` avant exploration, pas seulement avant commit.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
