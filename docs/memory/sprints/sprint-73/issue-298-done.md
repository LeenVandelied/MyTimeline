# Issue #298 — [FEATURE] Tablette : sidebar shell repliable (icon-only)

**Sprint :** 73 | **Taille :** S | **Modèle :** opus | **Epic :** epic:design

## Commits
- `bb6d219`

## Résumé
7 fichiers :
- `frontend/src/styles/ds/tokens/spacing.css` — `+--sidebar-width-collapsed: 64px`
- `frontend/src/styles/globals.css` — `+--spacing-sidebar-collapsed`
- `frontend/src/components/layout/AppShell.tsx`, `AppShell.test.tsx`
- `frontend/e2e/sprint-73-tablet-sidebar.spec.ts` (**nouveau**)
- `frontend/e2e/settings-breakpoints.spec.ts`, `frontend/e2e/sprint-66-mobile-create-event.spec.ts`

3 états : `< md` masquée / `md..lg` icon-only `w-sidebar-collapsed` / `>= lg` `lg:w-sidebar`
248px inchangée.

**Preuve que le token compile** (et non une simple assertion de chaîne) : postcss +
`@tailwindcss/postcss` sur `globals.css` → `.w-sidebar-collapsed { width:
var(--sidebar-width-collapsed) }` GÉNÉRÉ, `lg:w-sidebar` GÉNÉRÉ.

## Invariant #455
`hidden md:flex` (aside) ⟺ `md:hidden` (flottant).
`< md` flottant seul ; `md..lg` bouton sidebar icon-only seul ; `>= lg` bouton sidebar
libellé seul. `data-testid` et handler inchangés.
Commentaire `AppShell.tsx` L82-89 réécrit ; test durci (`not.toContain('lg:hidden')`).

## Media queries vérifiées (constat direct du subagent, pas recopie du briefing)
- `CompactRail` monte sur `useMediaQuery('(orientation: landscape) and (max-height: 500px)')`
  — `dashboard/page.tsx:63`, critère de **hauteur**
- `MobileDrawer` sur `isMobile = '(max-width: 767px)'` — `dashboard/page.tsx:60`
→ **aucun des deux ne couvrait 768-1023.** Le commentaire DEC-S40-001 était FAUX. Corrigé L59-68.

## Couverture des bornes
`frontend/e2e/sprint-73-tablet-sidebar.spec.ts` — matrice 767 / 768 / 1023 / 1024 via
`test.use` (viewport AVANT `goto`, PIT-S63-001), oracle sur `boundingBox().width` (64 vs 248,
pas seulement `toBeVisible`), + réversibilité descendante ET montante via `expect.poll`.
Aucun `locator.count()`.

## Tests
- `./scripts/test-quiet.sh frontend` : **1181 passed / 106 fichiers / 0 échec**
  (`AppShell.test.tsx` 25 → 28 tests)
- `tsc --noEmit` 0 erreur, eslint 0, prettier OK

## Non vérifié (déclaré par le subagent)
- **Aucun E2E exécuté** (backend Spring + Postgres + `next dev` requis). Les 3 specs e2e
  touchées + la neuve ne sont validées que par tsc/eslint.
- Rendu navigateur réel : contraste `bg-accent-soft` de l'icône active seule à 64px, dark
  mode, tenue du pied replié (2 contrôles empilés).
- `sprint-63-de-overflow-audit.spec.ts` mesure timeline+settings à 768 et 1023 : le contenu
  y perd 64px. Peut faire apparaître un débordement. Non testé.
- `timeline-mobile.spec.ts` (844x390/520) : `clientWidth` passe de ~794 à ~730. Le garde
  `scrollWidth > 844` tient au zoom Jour, mais non vérifié en exécution.

## Écart au briefing (déclaré)
NON lus : `.claude/rules-jit/frontend.md`, `.claude/rules-jit/ux-patterns.md`,
`frontend/src/styles/ds/readme.md`.

> **Correction du lead (post-review) :** `.claude/rules-jit/frontend.md` n'existe PAS dans
> ce dépôt — seul `ux-patterns.md` est présent sous `.claude/rules-jit/`. Le briefing
> pointait un chemin fantôme (repris tel quel de la liste générique du skill, sans
> vérification). Cette partie de l'« écart » est imputable au briefing, pas au subagent.

## Signaux mémoire
`[MEMORY:pitfall]` — Changer le palier d'un conteneur de shell (`lg:` → `md:`) n'est JAMAIS
local. **Solution :** grepper les E2E pour les viewports tombant dans la NOUVELLE plage avant
d'annoncer le diff — 844px était `< lg` (mobile) et devient tablette, ce qui a invalidé
2 assertions de `sprint-66` et 3 de `settings-breakpoints`. **Prévention :** un briefing qui
liste `AppShell.tsx` + tokens comme périmètre sous-estime systématiquement le blast radius
d'un changement de breakpoint.

`[MEMORY:decision]` — `settings-breakpoints.spec.ts` posait « sous `lg` la sidebar est
masquée, `settings-back` est la SEULE sortie ». Assertion remplacée par « au moins une
sortie », champ `back` dédié dans la matrice. **Pourquoi :** les paliers de `settings-back`
(`lg`) et de la sidebar (`md`) ont divergé — les déduire l'un de l'autre masquerait la
divergence.

## Recommandations suite
- `RECOMMAND_FOLLOWUP` (**confirmé, pas hypothétique**) — double chrome dashboard 768-1023.
  `frontend/app/[locale]/(app)/dashboard/page.tsx:112` : `<header ... lg:hidden>` est donc
  PEINT en 768-1023, en même temps que la sidebar icon-only. Pire, ses contrôles desktop sont
  `hidden md:flex` (L121) : LanguageSelector + lien Réglages + Logout y apparaissent **en
  double** avec le pied de la sidebar. Fichier hors périmètre autorisé → non corrigé.
  Correctif probable : `lg:hidden` → `md:hidden` sur ce `<header>`. Décision Designer.
  Triage estimé : S | Domaine : design.
- `RECOMMAND_FOLLOWUP` — redondance de sortie sur `/settings` en 768-1023 : `settings-back`
  (`lg:hidden`) coexiste désormais avec la sidebar. Non cassé, mais non tranché.
  `settings-back` doit-il passer `md:hidden` ? Triage estimé : XS | Domaine : design.
- `RECOMMAND_TEST_RUNNER` — faire tourner la suite e2e complète : 3 specs modifiées + 1 neuve,
  aucune exécutée ici.

STATUS: COMPLETED
