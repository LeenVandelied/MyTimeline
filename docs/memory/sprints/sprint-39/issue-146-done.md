# Issue #146 — Rendu clair/sombre 4 écrans auth (Sprint 39)

## Objectif livré
Audit lisibilité clair/sombre des 4 écrans auth (login, register, forgot-password, reset-password). Résultat : **déjà 100% conformes** (migration Sprint 8 solide). Aucune correction sur les pages ; ajout de tests garde-fous.

## Fichiers
- `frontend/app/[locale]/login/page.test.tsx` (test garde-fou ajouté)
- `frontend/app/[locale]/register/page.test.tsx` (idem)
- `frontend/app/[locale]/forgot-password/page.test.tsx` (idem)
- `frontend/app/[locale]/reset-password/page.test.tsx` (idem)
- **Les 4 `page.tsx` NON modifiés** (déjà conformes). `footer-app.tsx` conforme, non touché.

## Audit
- grep couleurs hardcodées (hex/rgb/text-gray/bg-white/text-black/slate) sur les 4 pages → **0 occurrence**. Tokens theme-aware uniquement.
- Aucun `text-ink-faint` (tier décoratif) sur texte essentiel. Aucune classe light-only en dur.
- Ratios AA recalculés (2 thèmes, texte essentiel) tous ≥4.5:1 : ink-muted clair≈6.0/sombre≈5.85 ; danger clair≈4.78 ; success clair≈5.37/sombre≈6.95 ; accent liens clair≈4.70/sombre≈6.49 ; bouton accent-ink/accent clair≈4.70.
- Test garde-fou par page : présence tokens theme-aware, bouton `bg-accent text-accent-ink`, absence `text-ink-faint` (jsdom = présence de classes).

## Écarts hors-scope signalés (info, pas un défaut)
- Couples `text-accent`/`bg-surface` (~4.70:1) et blanc/`bg-accent` (~4.70:1) en clair passent AA mais proches du plancher 4.5 → à surveiller au **layer token (#56)** si la teinte accent évolue. Aucune correction requise.

## Résiduel (honnête — critère d'acceptation non cochable en subagent)
- **Contrôle visuel manuel en navigateur clair/sombre des 4 écrans** — à faire par le dev/lead. Le critère « vérifié visuellement en navigateur » de l'issue reste techniquement ouvert.

## Tests
15 passed / 0 failed (11 existants + 4 garde-fous) — `npx vitest run "app/[locale]/{login,register,forgot-password,reset-password}"`.

## Recommandations suite
- **RECOMMAND_FOLLOWUP** (bas) : surveiller marge AA du couple accent/accent-ink (~4.70:1) au layer token. Optionnel : E2E Playwright screenshot clair/sombre pour couvrir le résiduel visuel réel.

## Commit (proposé, sérialisé par le lead)
`:white_check_mark: Garde-fou lisibilité tokens clair/sombre écrans auth (#146)`

STATUS: COMPLETED
