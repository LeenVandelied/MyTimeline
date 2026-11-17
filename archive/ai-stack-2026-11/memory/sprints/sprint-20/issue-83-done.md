# Issue #83 — Dashboard mobile portrait — DONE

**Vague :** V2 | **Modèle :** opus/high | **Commit :** 943b0ce

## Résumé
Dashboard mobile portrait (<768px) réutilisant les composants #80.
- **Créés** : `MobileDrawer.tsx` (drawer off-canvas droite, a11y SANS Radix via `useFocusTrap` de S19 + Escape + overlay ; langue/thème/logout), `CompactAgenda.tsx` (liste jour+lendemain via `getEventsInRange`), `ProductCarousel.tsx` (CSS scroll-snap natif, zéro Swiper), `dashboard-mobile.test.tsx` (13 tests).
- **Modifiés** : `page.tsx` (bascule desktop/mobile via `useMediaQuery('(max-width:767px)')` SSR-safe, single-column mobile-first, hamburger `md:hidden` + contrôles desktop `hidden md:flex` ; rendu #80 desktop INCHANGÉ), `DensityRibbon.tsx` (mode `scrollable` + `minBarWidth` : rail `overflow-x-auto`, indicateur = dégradé de bord + hint), `index.ts` (barrel), `globals.css` (`@utility scrollbar-none`), 4× `dashboard.json` (namespace `dashboard.mobile.*`, parité fr/en/es/de).
- **Réutilisation #80** : GreetingHeader (`variant="compact"`), DensityRibbon (props), `useDashboardData` (source unique, zéro appel API direct), `getEventsInRange`, `useFocusTrap`, `LanguageSelector`.

## BR touchées
Aucune.

## Pitfalls rencontrés
1. `scrollbar-width:none` seul insuffisant sous Chromium (base.css impose `*::-webkit-scrollbar` global 10px) → utility dédiée `@utility scrollbar-none`.
2. Mock `next-intl` en test masquait `useLocale` requis par LanguageSelector → ajouté au mock.

## Tests
- **28/28 passed** (13 nouveaux + 15 #80 non-régressés). tsc clean, eslint clean, `next build` OK (route `/[locale]/dashboard` compilée).
- **Non vérifié** : pas de run Playwright 390px (`frontend/e2e/` vide, aucun runner — scope e2e de test-quiet.sh skip explicite) ; focus-trap validé en unit (role/aria/Escape/overlay/logout/thème) mais pas le cycle Tab complet en navigateur réel.

## [MEMORY:*] signaux (à consolider en /sprint end Phase 2)
- **[MEMORY:pitfall]** Masquer scrollbar sur conteneur scroll-x (carousel/ribbon) : `@utility scrollbar-none` (`scrollbar-width:none` + `::-webkit-scrollbar{display:none}`). base.css impose une scrollbar webkit globale → `scrollbarWidth:none` inline ne suffit jamais côté Chromium.
- **[MEMORY:pattern]** Variante responsive mobile d'une page dashboard sans casser le desktop : `useMediaQuery` SSR-safe (défaut desktop) qui switch entre deux `<main>`, composants #80 réutilisés via props/variants + composants mobiles dédiés. Anti-pattern : dupliquer la page entière ou coupler l'orientation dans les composants.

## Recommandations suite (RECOMMAND_FOLLOWUP → triage /sprint end Phase 4)
- RECOMMAND_FOLLOWUP: écrire l'E2E Playwright viewport 390px portrait (aucun overflow-x, ribbon scroll, drawer open/close focus-trap, logout→/login) — bloqué car `frontend/e2e/` vide, à préparer conjointement avec #85 [triage S | domaine frontend]
- Note : #85 (mobile paysage) peut réutiliser MobileDrawer/CompactAgenda/ProductCarousel tels quels (non couplés portrait).

STATUS: COMPLETED
