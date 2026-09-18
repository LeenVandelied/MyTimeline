# Audit tests — Sprint 87

> Généré en fin de Phase 6 par le lead (2026-09-13). Aucune ligne de couverture manquante dans le tableau ci-dessous.
> Sprint 100 % frontend (landing publique) : 0 fichier backend, 0 migration, aucune BR backend touchée.

## Couverture par règle / exigence

| Exigence | Description | Cross-system flow | Unit backend | Integration | Vitest frontend | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| DEC-S82-008 (#641) | Landing sans `MobileAppSection` ni `TimelinePreviewSection`, clés i18n et SVG orphelins purgés | NON | N/A | N/A | ✅ `HomePage.test.tsx` | ✅ suite landing complète verte | N/A (page publique, aucun rôle) |
| #610 | Hero asymétrique borné dès `lg`, empilé dessous, frise dans le panneau, filet sans ombre (#574) | NON | N/A | N/A | ✅ `HeroSection.test.tsx` (+3), `HeroSection.flex-min-size.test.tsx` inchangé et vert | ✅ `landing-mobile-overflow`, `sprint-63-de-overflow-audit`, `landing-typography-hierarchy`, `landing-cta-contrast` | N/A |
| #611 | Frise du spec : règle, 6 lanes, barres, TODAY, boucle 52 s sans raccord, masque, reduced-motion | NON | N/A | N/A | ✅ `HeroTimelineAnimation.test.tsx` (structure, `aria-hidden`, 0 focusable, i18n) | ✅ diff visuel `sprint-77-theme-visual` (références noble régénérées) + mesures navigateur de l'agent | N/A |
| BR-EVE-009 (réutilisée) | Encre des barres au contraste WCAG (`contrastInk`) | NON | N/A | N/A | ✅ `HeroTimelineAnimation.test.tsx` | ✅ contrôle ui-design (calcul des ratios) | N/A |
| #340 (garde-fou cascade) | Cas `.timeline-preview` retiré, contrôles négatifs `.mt-avatar` / scrollbar toujours armés | NON | N/A | N/A | ✅ `base-layer.test.ts` | N/A | N/A |
| Harnais E2E (revue C1) | Débordement borné par la chaîne des blocs conteneurs | NON | N/A | N/A | N/A | ✅ auto-contrôle à 5 sondes, armement vérifié par mutation | N/A |
| Harnais visuel (C2) | Gel exact de la piste avant capture | NON | N/A | N/A | N/A | ✅ 3 recomparaisons noble consécutives 11/11, contrôle négatif compris | N/A |

Cross-system flow = NON partout : aucun flux entre systèmes ou rôles (page publique statique, aucun appel API métier).

## Tests créés / modifiés
- `frontend/src/components/landing/HeroSection.test.tsx` (#610 : montage de la frise, flex borné, filet sans ombre)
- `frontend/src/components/landing/HeroTimelineAnimation.test.tsx` (#611 : réécrit)
- `frontend/src/components/pages/HomePage.test.tsx` (#641)
- `frontend/src/styles/__tests__/base-layer.test.ts` (#611 : cas `.timeline-preview` retiré)
- `frontend/e2e/landing-mobile-overflow.spec.ts` (#611 puis C1 : bornage par blocs conteneurs + 3 sondes)
- `frontend/e2e/sprint-77-theme-visual.spec.ts` (#611 commentaires, C2 gel) + références `landing-hero-{light,dark}-chromium-linux.png`
- Supprimés : `MobileAppSection.test.tsx`, `TimelinePreviewSection.test.tsx`

## Résultats runs (code final, `6f8f6f4` et suivants — aucun commit de code après)
- Backend : non concerné (0 fichier backend)
- Frontend : `next build` production exit 0 (compile + lint + types) · **Vitest 127 fichiers / 1536 tests, 0 échec** · `tsc --noEmit` 0 · `npm run format:check` conforme (via `rtk proxy`)
- E2E complète (darwin, build de production `next start` :3100, backend e2e :8086, `--ignore-snapshots`, 2 workers, 1 seul bloc « Running ») : **384 tests — 375 passés / 1 échec / 8 sautés**, 2,5 min, 0 coupure serveur (sonde `/fr/login` toutes les 20 s)
  - Seul échec : `sprint-77-theme-visual.spec.ts:620` (contrôle négatif d'armement) — refus explicite « Référence absente …`-chromium-darwin.png` ». Environnemental : le dépôt ne porte que des références Linux ; le même test passe 3/3 dans l'image noble.
- Diff visuel Linux (`mcr.microsoft.com/playwright:v1.61.1-noble`, contre `next start`) : régénération `--grep-invert "armement"` puis **3 runs consécutifs sans `--update-snapshots` : 11/11 à chaque run**, contrôle négatif compris ; seules les 2 références `landing-hero` modifiées, 8 références auth identiques.
- Coverage-E2E (Phase 8) : 0 `data-testid` ajouté ou retiré dans le diff `.tsx` (804 lignes de diff lues via `rtk proxy`, non vacant).

## Non vérifié (à la charge de la CI)
- Rendu sur runner **x86_64** : références générées sur hôte arm64 (image noble). Indice favorable, non preuve : les 8 références auth régénérées au passage sont identiques octet pour octet à celles qui passent déjà en CI.

## Conclusion
Prêt pour PR. Gate CI requise : job `e2e` (Linux) sur le SHA de tête.
