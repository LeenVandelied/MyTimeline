# Audit tests — Sprint 103

> Généré en fin de Phase 6 par le lead (2026-09-22). Runs réels, HEAD `e61b0969` (+ retours de review éventuels, cf. fin).

## Couverture par BR / issue

Aucune règle métier `BR-*` touchée : sprint 100 % landing publique (présentation). Cross-system flow = NON pour les 4 issues, donc pas d'E2E métier exigé.

| Issue | Objet | Cross-system flow | Unit (Vitest) | E2E parcours / mesure |
|---|---|:---:|:---:|:---:|
| #354 | `data-testid` des 5 CTA + copie menu burger ; harnais de contraste rebranché | NON | n/a (attributs) | ✅ `landing-cta-contrast`, `landing-mobile-menu` — mêmes 52 lectures avant/après, contrôles « déplacer » (0 perte) et « retirer un testid » (8 rouges) |
| #613 | Section témoignages retirée (avis inventés) | NON | ✅ `HomePage.test.tsx` (rougit si la section revient — vérifié) | ✅ 9 specs landing rejouées ; `landing-mobile-overflow` vert |
| #612 | Frise de cas d'usage à 4 jalons, `FeaturesSection` supprimée | NON | ✅ `HowItWorksSection.test.tsx`, `HeaderSection.test.tsx`, `FooterSection.test.tsx`, `HomePage.test.tsx` | ✅ nouvelle `sprint-103-use-case-frieze.spec.ts` (couleur peinte = `EVENT_PALETTE`, 1280 / 2×2 / 375, clair+sombre) ; `landing-typography-hierarchy` adaptée (étiquette de jalon au lieu du chiffre d'étape) |
| #615 | Accent réservé aux signaux | NON | ✅ verrou sur le DOM rendu (menu ouvert) | ✅ contraste des étiquettes `ink-muted` : 5,96 clair / 6,26 sombre, test d'armement `ink-faint` (2,75 / 3,20 < 4,5) |

## Tests créés / modifiés
- `frontend/e2e/sprint-103-use-case-frieze.spec.ts` (nouveau)
- `frontend/e2e/support/contrast.ts`, `landing-cta-contrast.spec.ts`, `landing-mobile-menu.spec.ts`, `landing-typography-hierarchy.spec.ts` (modifiés)
- `frontend/src/components/landing/HowItWorksSection.test.tsx`, `HeaderSection.test.tsx`, `FooterSection.test.tsx`, `frontend/src/components/pages/HomePage.test.tsx` (modifiés) ; verrou #615 (cf. `issue-615-done.md`)
- Supprimés avec leur composant : `FeaturesSection.test.tsx`

## Résultats runs (lead, arbre propre)
- `next build` exit 0 · `lint` 0 · `format:check` 0 · `tsc --noEmit` 0
- Vitest : 157 fichiers / **2004 passed**, 0 failed
- E2E suite complète, `workers: 2`, contre `next build` + `next start` (backend e2e `:8087`) : **510 passed / 8 skipped / 11 failed (5,2 min)**. Les 11 sont hors sprint :
  - 10 × `sprint-77-theme-visual` « doesn't exist … darwin » — pas de référence macOS, écart de plateforme connu (références Linux inchangées : seul le hero est capturé, et il n'est pas modifié). PNG darwin générés supprimés, non committés.
  - 1 × `sprint-101-fab-landscape.spec.ts:271` — préexistant, prouvé par A/B au S102, suivi par l'issue #769.
- Vérification navigateur du lead : 1280 px (4 jalons sur une rangée, `scrollWidth` 1269 ≤ 1280), 768 px (2×2, filets bornés), 375 px (frise verticale, x = 16 pour les 4 jalons, aucun débordement). Thème sombre observé ; clair couvert par les specs.
- Coverage-E2E (Phase 8) : 11 testids ajoutés, tous cités ET exécutés par une spec verte.

## Non vérifié
- Métriques de police sous Linux (la CI tranchera `landing-typography-hierarchy` et `sprint-103-use-case-frieze`).
- Rendu de la frise en `es`/`de` hors mesure automatique (étiquettes longues : la bascule 2×2 < 1024 px a été choisie par mesure dans les 4 locales par l'agent B).

## Retour de review (`ecfcadb9`)
- Clés `footer.{product,features,howItWorks,legal,legalNotice}` retirées des 4 locales (0 appelant, grep) ; JSDoc de `mobileMenuTargets` chiffré (5 → 3 cibles).
- Rejoué : prettier 0 ; Vitest 157 / 2004 verts ; E2E `landing-mobile-menu`, `landing-cta-contrast`, `landing-header-logo`, `sprint-75-legal-pages`, `sprint-103-use-case-frieze` : 89/89.

## Conclusion
Prêt pour PR.
