# Issue #210 — Shell applicatif (nav latérale persistante 248px, handoff §8)

**Vague :** 1 (parallèle avec #245) | **Taille :** M | **Modèle :** opus/high
**Pré-implémentation :** ui-design REJET conditionnel (3 blocking) → résolu par le lead (décisions injectées dans le briefing).

## Commits
- `f48234a` — :sparkles: Shell applicatif — nav latérale persistante 248px (#210)
- `c3b1b9f` — :recycle: Envelopper la route produits dans le shell applicatif (#210) — **correction review MAJEUR** : `products/` déplacé sous `(app)/` (git mv, URL inchangée via manifest) → la sidebar persiste sur « Produits ». `settings/` laissé hors-shell (son `SettingsShell` 220px propre ferait double sidebar). 443/443 vitest, tsc/build 0. [MEMORY:pitfall] : `git mv` d'une route Next laisse `.next/types/**` périmé → `tsc` TS2307 fantômes ; relancer `next build` avant typecheck.

## Résumé
Shell applicatif Graphite (§8) = nav latérale persistante 248px, point d'entrée de l'app connectée.
- **Token** (BLOCKING-1) : `--sidebar-width: 248px` (`ds/tokens/spacing.css` section layout-specific) + `--spacing-sidebar` (`globals.css @theme inline`) → utilitaire `w-sidebar`. Zéro px/hex inline.
- **AppShell** (`frontend/src/components/layout/AppShell.tsx` + `index.ts`) : sidebar `hidden lg:flex w-sidebar` (logo, bouton « Nouvel événement » `bg-primary`, nav `<nav aria-label>` 3 liens `h-11` + `aria-current="page"` + classe active calquée `SettingsShell` `bg-accent-soft text-accent font-medium`, LanguageSelector + toggle thème + Réglages + avatar carré `rounded-sm` + déconnexion).
- **Overlay** « Nouvel événement » = Dialog Radix minimal (flux create d'événement inexistant aujourd'hui ; `EventContent`/`EventEditForm` sont edit-only ; drawer 452px §6 hors scope → follow-up).
- **Insertion router** : route group `frontend/app/[locale]/(app)/layout.tsx` monte `<AppShell>` ; `dashboard/` déplacé sous `(app)/` via `git mv` → URL `/[locale]/dashboard` INCHANGÉE (route group transparent, golden-path E2E intact).
- **Enveloppement dashboard SANS réécriture** : seul ajustement = `lg:hidden` sur le `<header>` propre du dashboard (anti double-chrome desktop) ; `< lg` le hamburger #83 / CompactRail #85 restent la nav mobile de l'écran (délégation, zéro duplication). Sous-composants dashboard non touchés.
- **Placeholder** `/timeline` connecté (auth) → item nav fonctionnel + démo enveloppement (écran frise complet = #166).
- **i18n** `shell.json` fr/en/es/de.

## Fichiers clés
- `frontend/src/components/layout/AppShell.tsx` (nouveau, 227 l.) + `index.ts` + `AppShell.test.tsx` (196 l.)
- `frontend/app/[locale]/(app)/layout.tsx` (nouveau) + `(app)/timeline/page.tsx` (nouveau)
- `frontend/app/[locale]/(app)/dashboard/{page,loading}.tsx` (déplacés via git mv, `page.tsx` +`lg:hidden` header)
- `frontend/src/styles/ds/tokens/spacing.css` (+`--sidebar-width`), `frontend/src/styles/globals.css` (+`--spacing-sidebar`)
- `frontend/public/locales/{fr,en,es,de}/shell.json`

## Tests
- `./scripts/test-quiet.sh frontend` = **443/443 vitest OK**, `tsc --noEmit` 0, `next build` 0 (2 warnings pré-existants workspace-root), eslint 0.
- `AppShell.test.tsx` : nav + a11y, lien actif + sous-route, sélecteurs, avatar carré, toggle thème, logout+redirect, overlay, délégation mobile.
- E2E : golden-path inchangé (route group transparent). Nouveaux `data-testid` shell → à référencer en spec (voir Phase 8 coverage).

## [MEMORY:decision]
Tablette (`md`→`lg`) bascule directement en mode mobile (CompactRail/MobileDrawer), **PAS** de sidebar repliable icon-only ni token collapsed ce sprint. Seuil sidebar = `lg` (1024px, aligné `SettingsShell`). « Tablette sidebar repliable » (handoff §responsive) reporté → follow-up (a).

## [MEMORY:pattern]
1. **Token layout** : nouvelle largeur fixe → déclarer dans `ds/tokens/spacing.css` (section layout-specific) PUIS mapper dans `globals.css @theme inline` → `w-sidebar`. Jamais `w-[248px]`.
2. **Enveloppement d'un écran connecté par un shell** : route group Next `(app)/` (URL inchangée) + `git mv` du segment sous le groupe + gate `lg:hidden` du chrome propre à l'écran (anti double-chrome), sans réécrire ses sous-composants. Anti-pattern : shell qui re-rend CompactRail/MobileDrawer → duplication mobile.

## Recommandations suite (RECOMMAND_FOLLOWUP)
- (a) [S | frontend] Tablette sidebar repliable icon-only (handoff §responsive) — reportée (décision lead).
- (b) [S | frontend] Migrer les autres écrans connectés sous `(app)/` : `/products` (non déplacé, zone verrouillée #245), réglages. Le lien nav Produits pointe vers `/products` hors shell (fonctionnel, sans sidebar).
- (c) [M | events] Flux de création d'événement réel (handoff §6, drawer 452px, aperçu live/récurrence) — inexistant aujourd'hui ; overlay actuel = Dialog minimal.
- (d) [L | events] Écran frise complet `/timeline` (#166) remplacera le placeholder.
- Pas de RECOMMAND_TEST_RUNNER (suite <20s). Pas de RECOMMAND_DB_EXPERT/SECURITY (aucun backend/migration/auth touché).

STATUS: COMPLETED
