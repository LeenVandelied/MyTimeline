# Review batch — Sprint 117 (reviewer, HEAD `a49b2e2c`)

Bilan : 0 CRITIQUE / 0 MAJEUR / 5 MINEURS / 11 OK. `tsc --noEmit` vert.

| # | Constat (MINEUR) | Suite donnée |
|---|------------------|--------------|
| 1 | `label-reserve.ts:152` — la réserve de queue ne regarde que le dernier jour : un pin antérieur à libellé long (ex. J−1 en `week`, 31 car.) peut encore déborder | Follow-up (déjà signalé par #805) — borne conservatrice ou 2 passes |
| 2 | `zoom.ts` — `FIT_MARGINS_PX.mobile` sans consommateur | Corrigé `1ebadb5c` : JSDoc « réservé, non branché » |
| 3 | `sprint-105-fit-shortcut.spec.ts:46-53` — 40/135/35 recopiés | Déjà documenté en tête de bloc (`zoom.ts` non importable côté Playwright) — sans suite |
| 4 | `sprint-117-period-zoom-no-drift.spec.ts:122` — `waitForTimeout(100)` dans la boucle de stabilité (borne 40, PIT-S54-003) | Sans suite : risque faible, scroll désormais instantané ; à revoir si flaky |
| 5 | `TimelineView.tsx:1234/1278/1332` — `T`/`[`/`]`/minimap deviennent instantanés (plus de glissement smooth) | Assumé : c'est le correctif de #805 (motif #597) ; `prefers-reduced-motion` déjà neutralisé |
