# Issue #63 — Vue Timeline mobile portrait

**Statut :** COMPLETED
**Vague :** V1 (parallèle #192)
**Commit :** 962e6b7e6e47cfdcf91f16c0f415b85e61c8e215
**Correctif lead post-merge :** a0a94f1 (réintègre EventPill clobberé — voir §Incident)

## Résumé
Vue mobile portrait = transposition de `TimelineView` SANS le modifier fonctionnellement. Switch desktop/mobile ISOLÉ dans `TimelineResponsive` (nouveau wrapper) via `useMediaQuery` (matchMedia `max-width:640px`, SSR-safe → desktop par défaut).
Réutilise : `zoom.ts` (enum/niveaux/actions, pinch dispatch mêmes `ZOOM_IN/OUT`), `lib.ts` (positions), `Minimap` (variante CSS compacte, JS inchangé), i18n `dashboard.timeline.*`.

## Base réutilisable pour #64 (Vague 2)
- Hook `useTimelineMobileState` (zoom + scroll↔minimap + positions + pinch ; **pas de reset au resize** → prêt orientation).
- Hook `useFocusTrap` (mutualisé bottom sheet + action sheet ; EventDrawer desktop intact).
- Composants `TimelineBottomSheet` (`.mt-sheet`, role=dialog/aria-modal/labelledby/describedby, swipe-down + Escape + close 44px) + `TimelineActionSheet` (`.mt-actionsheet`, ⋯ visible + long-press).
- `buildEventAriaLabel` extrait vers `zoom.ts`.
- **#64 n'aura qu'à réécrire la disposition CSS + le seuil breakpoint (orientation + hauteur).**

## Fichiers clés
- `TimelineResponsive.tsx`, `TimelineMobilePortrait.tsx`, `TimelineBottomSheet.tsx`, `TimelineActionSheet.tsx` (nouveaux)
- `useTimelineMobileState.ts`, `useFocusTrap.ts`, `src/hooks/useMediaQuery.ts` (nouveaux)
- `zoom.ts` (+buildEventAriaLabel), `TimelineView.tsx` (import buildEventAriaLabel), `index.ts` (barrel), `styles/ds/components/timeline.css` (+80 mobile), `app/[locale]/dashboard/page.tsx` (câblage), `public/locales/*/dashboard.json` (+clés)

## data-testid préservés
OUI — `timeline-event` + `data-event-title` sur blocs mobiles (vérifié par test).

## Tests
Vitest portrait (12) + switch responsive + non-régression desktop. Total timeline dir = 50 verts après correctif lead.

## ⚠ INCIDENT — regression #192 clobberée (détecté + corrigé par le lead)
Le commit 962e6b7 a réécrit `TimelineView.tsx` depuis un état **pré-#192** (cause racine : voir pitfall worktree ci-dessous → l'agent a écrit dans le repo principal qui n'avait pas le commit #192, puis recopié vers le worktree en écrasant l'intégration `<EventPill>`).
Conséquence : `<EventPill>` remplacé par le `<button>` inline, `statusToVar` réimporté, export EventPill retiré du barrel → EventPill.tsx devenait mort + fix encre BR-EVE-009 perdu.
**Correctif lead a0a94f1** : réintègre `<EventPill>`, conserve le move `buildEventAriaLabel`→zoom.ts (#63), retire `statusToVar`, rétablit l'export. tsc OK, 50 tests verts.

## [MEMORY:*] signaux
- **[MEMORY:decision]** Breakpoint portrait AD HOC `max-width:640px` (aucun token `--bp-*` dans Graphite). Documenté commentaire CSS + `TimelineResponsive`. Candidat futur token `--bp-mobile-max`. #64 ajoutera un 2e seuil (orientation + hauteur).
- **[MEMORY:pitfall] (raffinement de [[sprint-subagent-worktree-cwd]])** L'agent lancé depuis un worktree : `Read` initial lit bien le worktree MAIS `Write`/`Edit` + `cd` bash ont écrit/testé dans le **REPO PRINCIPAL** (`/Users/herrh/VSProjects/MyTimeline/frontend`), pas le worktree — le cwd bash se reset au repo principal entre appels. Le garde-fou HEAD **au début** NE SUFFIT PAS : c'est l'écriture qui dérape. **Prévention : `git -C <worktree>` pour tout git, ET vérifier `git status` du worktree APRÈS chaque batch d'écriture.** Aggravation ici : le repo principal n'ayant pas le commit #192, la recopie main→worktree a clobberé #192.

## Recommandations suite
- **RECOMMAND_FOLLOWUP** : câbler `onEditEvent`/`onDeleteEvent` de l'action sheet aux services `updateEvent`/`deleteEvent` (garde ownership BR-EVE-001) — actuellement callbacks optionnels non branchés dans page.tsx (parité avec desktop qui n'expose pas edit/delete depuis la timeline non plus ; hors scope #63). [triage S | domaine events]
- **Pitfall subtil (à re-tester #64)** : `position:sticky` règle mobile dans `overflow-x:auto` = fragile iOS Safari 16+ ; NON testable jsdom/DevTools → device réel recommandé (fallback = règle scrolle avec contenu, non bloquant).
- **Gap E2E** : Playwright viewport 375px NON écrit (dossier e2e/ vide, pinch/pointer difficilement fiable headless). À planifier via /create-e2e post-merge.

STATUS: COMPLETED
