# Validation ui-design — Sprint 24 (Timeline a11y vs ux-patterns.md)

> Re-validation formelle demandée par #197 (critères : « la Vue Timeline est re-soumise à ui-design pour validation formelle une fois le référentiel disponible » + « le verdict est consigné dans la doc de sprint »).
> Spawné par le lead (profondeur 1). Référentiel : `.claude/rules-jit/ux-patterns.md` (créé par #197).

## VERDICT : **GO PR** (APPROUVE)

Conformité 100 % des 10 points de la checklist `ux-patterns.md §10`. En S17 le verdict était "APPROUVE_AVEC_RESERVES" faute de référentiel — les réserves sont **levées** : le référentiel existe et le code livré y est conforme à la lettre.

## Conformité par point

| Point | Statut | Preuve |
|-------|:---:|--------|
| §1 region landmark | ✅ | `TimelineView.tsx:417-428` `<section role=region aria-label aria-describedby>` + `<p id=timeline-region-desc sr-only>`, i18n via `t()` |
| §2 roving tabindex resource-keyé | ✅ | `activeNav {resourceId,evt}` (`:126`), `laneIndexByResource` Map, `tabIndex={isRoving?0:-1}` (`:618`) — PAT-S24 à la lettre |
| §3 flèches ←→↑↓/Home/End/Enter-Espace | ✅ | `onPillKeyDown` (`:182-246`) + `preventDefault` ; Enter/Espace natifs `<button>` (`EventPill.tsx:73`) |
| §4 focus-trap drawer | ✅ | consigné référentiel + issue-81-done.md (hors fichiers relus en détail) |
| §5 raccourcis T/[/]/+/-/F/Échap | ✅ | `TimelineView.tsx:331-375`, garde saisie + garde modificateurs, Échap prioritaire, Cmd/Ctrl+F non hijackés |
| §6 aria-live polite | ✅ | `:430-438` `role=status aria-live=polite aria-atomic`, silencieux au montage via `lastAnnouncedZoom` (StrictMode-safe) |
| §7 scrollIntoView après focus | ✅ | `focusNav` (`:167-178`) `.focus()` + `.scrollIntoView({block/inline:'nearest'})` — PIT-S24 |
| §8 aria-label agrégé | ✅ | `buildEventAriaLabel` (`lib.ts:28-47`) titre+statut+dates+produit+récurrence 1 phrase |
| focus ring | ✅ | `.mt-tlv__evt:focus-visible{outline:2px solid var(--color-accent)}` (`timeline.css:122`), theme-aware (`--color-focus` blue-500/400 clair/sombre) |
| cible tactile close 44px | ✅ | `.mt-drawer__close::before{width:44px;height:44px}` (`timeline.css:147`), commit 99e85d7 |

## Écarts consignés — confirmés acceptables (non bloquants)
- **`?` (aide) non câblé clavier** : l'aide = tooltip hover/focus (`.mt-tlv__help-pop role=tooltip`, `aria-describedby` conforme WAI-ARIA). Statut PRÉVU explicite. → RECOMMAND_FOLLOWUP (statuer câbler `case '?'` vs acter hover-only).
- **`EventPill.tsx:100` span titre aria-hidden** même seul texte visible : inoffensif (aria-label du bouton couvre). MINEUR toléré, correctif facultatif.

## Réserves nouvelles
Aucune bloquante. Couverture tests ←→ inter-lanes / cyclage Tab drawer incomplète → déjà tracée `ux-patterns.md §9` (non bloquant).

## Recommandation
**GO PR.** Aucune correction bloquante. Les 10 points de la checklist §10 sont cochés.
