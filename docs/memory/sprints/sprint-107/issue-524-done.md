# #524 — .mt-tab : contour de focus rogné ? — done

- commits: [c3112b0a]
- resume:
  - Objectif : mesurer l'hypothèse de rognage du contour `.mt-tab` (outline 2px + offset 3px = 5px hors boîte) sur `/products` (`products-tabs`) et la fiche produit (`product-detail-filter`).
  - Mesure (sonde jetable, PAT-S74-004, :3107 `next start`, Chromium dpr 1, focus armé par Shift+Tab/Tab) : 2 routes × 1280/390 × clair/sombre × (1er sél., dernier sél., 1er non sél. focalisé) = 24 cas → **0 ancêtre clippant, 0 face hors viewport, 4/4 côtés peints**. Trait +4/+5px, unanimité 100 %. Contraste trait/fond peint : clair `#0E5FC4`/`#FCFCFD` 5,93:1 ; sombre `#4D9BFF`/`#0B0C0E` 6,94:1. Aucune tablist ne déborde à 390 (scrollW = clientW = 358).
  - Contre-épreuve : `overflow-x:auto` injecté → géométrie ET pixels voient haut/bas/gauche rognés.
  - Verdict : NON rogné → aucun code CSS/TSX. Consigné `frontend/src/styles/ds/a11y-audit.md` §8ter (sous-section #524).
  - Garde E2E committée (1 spec, ~1,8 s/test) : `frontend/e2e/sprint-107-tab-focus-outline.spec.ts` — 4 tests (2 routes × 2 largeurs, clair) + 1 auto-contrôle mutation. Justif : la seule protection possible (offset négatif exclu) est « ne jamais clipper la tablist » ; sans garde, un futur `overflow-x-auto` passerait inaperçu.
  - Tests : sonde 15/15 (dont 5 setup) ; garde `--repeat-each=3` 20/20 (15 chromium + 5 setup), 0 flaky ; vitest `e2e-rate-limit-budget` + `e2e-pixel-guards` 56/56 ; `tsc --noEmit` OK ; `npm run lint` 0 ; `prettier --check` spec + md OK. Aucune capture macOS créée. Specs tabs existantes non rejouées (aucun CSS/TSX modifié).
- [MEMORY:pattern] Problem: prouver qu'un contour n'est PAS rogné. Solution: 2 oracles concordants (géométrie ancêtres + dump pixels 4 côtés couleur = `outlineColor` calculée) + mutation `overflow-x:auto` qui DOIT les rougir tous deux ; le dump pixel attrape aussi un recouvrement par un frère. Anti-pattern: conclure « non rogné » sur la seule géométrie sans contre-épreuve.
- [MEMORY:pitfall] Context: `components/ui/tabs.tsx` — `→`/`←` changent `aria-selected` mais n'appellent aucun `.focus()` : le focus reste sur un onglet `tabIndex=-1` non sélectionné (mesuré 8/8 configs). Prevention: tout test clavier de Tabs doit vérifier `toBeFocused()` sur l'onglet NOUVELLEMENT sélectionné.
- RECOMMAND_FOLLOWUP: Tabs DS — flèches/Home/End doivent déplacer le focus avec la sélection (APG tablist activation auto) + test unitaire ; aucune issue existante trouvée (`gh issue list --search tablist`) [S | frontend/a11y]

STATUS: COMPLETED
