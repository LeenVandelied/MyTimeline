# Sprint 74 — « Landing & focus polish »

Base : `sprint/74` créée depuis `origin/dev` (`455862f`).

4 issues XS `epic:design` / `priority:P3`, une seule vague parallèle (fichiers disjoints).

| Issue | Sujet | Périmètre fichiers |
|---|---|---|
| #342 | `<Link>` enveloppant `<DropdownMenuItem>` | `src/components/ui/language-selector.tsx` |
| #343 | Easing hors DS + import CSS mal scopé | `src/styles/hero-timeline.css`, `app/[locale]/layout.tsx`, 1 point de dépôt landing |
| #384 | Double lévitation `-18px` au survol | `src/components/landing/FeaturesSection.tsx`, `src/styles/landing.css` |
| #417 | Contour de focus rogné | `src/styles/ds/components/{timeline,core}.css` |

## Vérifications NON déléguées aux subagents

Les 4 agents ont l'interdiction de lancer `next dev` / `next build` / Playwright :
`frontend/.next` est unique pour le working tree partagé (`PIT-S62-009`). La vérification
navigateur (clair + sombre) exigée par les critères d'acceptation de #384, #417 et #343 est
donc **à la charge du lead**, en série, après la vague.

## Écarts de procédure

Cf. l'entrée Sprint 74 de `docs/memory/sprint-history.md` : aucun plan `/sprint plan`
n'existait (donc pas d'`architect-plans.md`, pas de section « Plan d'implémentation » dans les
briefings), et le worktree de départ pointait sur `main` au lieu de `dev`.

## Corrections d'énoncé portées par les briefings

Trois énoncés d'issue citaient des localisations périmées — reconstatées par le lead à `455862f` :

- **#343** : l'import n'est plus dans `app/layout.tsx:5` (layout racine rendu transparent par
  #413) mais dans `app/[locale]/layout.tsx:5`.
- **#417** : le motif de référence n'est pas `timeline.css:115` / `:131` mais `:180` / `:196` ;
  et la zone « tablist des réglages » n'est pas un `overflow:hidden` mais un `overflow-x-auto`
  posé en Tailwind sur `SettingsShell.tsx:67`.
- **#342** : l'énoncé cite le pattern `<Button asChild>`, alors que l'élément est un
  `DropdownMenuItem` — le briefing demande de vérifier le pattern réellement livré par #295.
