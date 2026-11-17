# Issue #87 — Frontend Réglages mobile (drill-down + bottom sheet)

**Vague :** 2 (frontend mobile, après #86 + #75)
**Commit :** 5b5bba6 `:iphone: #87 Réglages mobile drill-down + bottom sheet suppression`
**Statut vérifié :** commit sur `sprint/21` (worktree), 16 fichiers, aucun résidu sur `dev` (garde-fou renforcé efficace).

## Résumé
Variante mobile (<768px) des Réglages — drill-down index→détail + bottom sheet suppression compte. BR-AUT-001 (suppression par re-saisie username) préservée.

Fichiers clés :
- `app/[locale]/settings/page.tsx` — rendu conditionnel `useMediaQuery('(max-width:767px)')` : `MobileSettings` vs `SettingsShell` #86 (pas de double montage).
- `settings/mobile/MobileSettings.tsx` — state machine index↔détail (push/back).
- `settings/mobile/SettingsIndex.tsx` — 4 chapitres tappables + chevron.
- `settings/mobile/BottomSheet.tsx` — primitive générique (fixed bottom-0, slide-up, focus trap, Escape, backdrop tap, swipe-down seuil 80px, safe-area iOS).
- `settings/useDeleteAccountFlow.ts` + `settings/DeleteAccountSteps.tsx` — flux suppression EXTRAIT (hook + présentation) partagé Dialog/Sheet.
- `settings/AccountSection.tsx` — nouveau prop `deleteContainer='dialog'|'sheet'` (défaut dialog = rétro-compatible desktop).

Sections #86 réutilisées telles quelles (Account avec `deleteContainer="sheet"`). Logique #86 NON dupliquée (extraction refactor rétro-compatible).

## Avatar #75
Branché : **NON** (hors scope strict #87, `ProfileSection`/`AvatarUpload` stub inchangé). → RECOMMAND_FOLLOWUP.

## Tests
Vitest +12 (SettingsIndex, MobileSettings drill-down/back, BottomSheet a11y/close/swipe) → **261 verts** (baseline 249, zéro régression #86). Playwright 375px `settings-mobile.spec.ts`. tsc/eslint/next build : 0 erreur.

## [MEMORY:*]
- **[MEMORY:pattern]** Bottom sheet mobile réutilisant logique dialog desktop sans duplication : extraire état+form+mutation dans un hook (`useDeleteAccountFlow`) + composant présentationnel wrapper-agnostic (`DeleteAccountSteps`), le parent choisit le conteneur via prop `deleteContainer`. Anti-pattern : dupliquer le flux dans un composant mobile séparé.
- **[MEMORY:pitfall]** Tester swipe-down (pointer) sous jsdom/RTL : React synthetic pointer events ne propagent PAS `clientY` sous jsdom (null), contrairement aux handlers `addEventListener` natifs. Prévention : extraire la décision en fonction pure (`shouldDismissOnSwipe`) testée en unitaire ; couvrir le geste réel en Playwright.

## Recommandations suite
- RECOMMAND_FOLLOWUP : brancher avatar #75 (`AvatarUpload`/`ProfileSection.onAvatarCropped` stub toast — endpoint livré). Concerne desktop+mobile.
- RECOMMAND_FOLLOWUP : endpoint export données non livré (`exportData` stub "à venir").
- Note : gestion clavier virtuel Android (`visualViewport`) non implémentée activement (safe-area + max-h-85vh + overflow-auto) — vérifier sur device réel (AC "clavier virtuel").
- 2 warnings next build (non liés à #87, 0 erreur) — à surveiller.

STATUS: COMPLETED
