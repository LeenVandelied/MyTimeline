# Issue #85 — Dashboard mobile paysage (rail 64px + 2 colonnes) — DONE

**Vague :** V3 (dernière) | **Modèle :** opus/high | **Commit :** abdce23

## Résumé
Dashboard mobile paysage : rail 64px + grille 2 colonnes. Switch d'affichage rendu TERNAIRE : paysage > portrait > desktop.
- **Créé** `CompactRail.tsx` — rail vertical 64px présentationnel (props `onHome`/`onProducts`/`onLogout`/`activeId`), 3 items min (accueil/produits/déconnexion), icônes lucide `Home`/`Package`/`LogOut`. A11y : vrais `<button>` (clavier natif), `aria-label`+`title` par item, `<nav aria-label>`, actif `aria-current`+`text-accent`, `focus-visible:ring-2`. Tokens Graphite (`bg-surface`/`border-rule`/`text-ink-muted`), theme-aware.
- **Créé** `dashboard-landscape.test.tsx` — 6 tests (rail présent, 3 items, a11y aria-label+title, câblage handlers, item actif, `<nav>`).
- **Modifié** `app/[locale]/dashboard/page.tsx` — `useMediaQuery('(orientation: landscape) and (max-height: 500px)')`, branche paysage = `<CompactRail>` + `<main>` CSS Grid `grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]` (col gauche `CompactAgenda`, col droite `DensityRibbon scrollable` + `ProductCarousel`), hamburger masqué en paysage. Handlers : accueil → `/${locale}/home`, produits → `scrollIntoView` colonne produits, déconnexion → `handleLogout` (même flux #83).
- **Modifié** `index.ts` (barrel) + 4 locales `dashboard.landscape.rail`.
- **Réutilisation #80/#83** : `CompactAgenda`/`DensityRibbon`/`ProductCarousel` importés tels quels, source data unique `useDashboardData` (pas de remount au switch orientation). Aucun appel API direct.

## BR touchées
Aucune.

## Pitfalls rencontrés
1. **`./scripts/test-quiet.sh frontend` périmé** ("aucun runner") → a lancé vitest direct. ⚠ Signal pour Phase 6 : le scope frontend de test-quiet.sh ne route pas vers vitest.
2. Détection paysage `max-height:500px` : un mobile paysage haut de gamme (hauteur > 500px) retombera en portrait `max-width:767px`. Seuils conformes au briefing, à re-valider sur device réel si régression.

## Tests
- **Vitest 26 pass / 0 fail** (landscape + mobile + components). tsc 0 err, eslint 0, `next build` 22 pages 0 erreur.
- **Non vérifié** : pas de run Playwright 812x375 (`e2e/` = golden-path seulement).

## [MEMORY:*] signaux
Aucun signalé par le dev. (Pitfall test-quiet.sh frontend stale → à consigner par le lead, cf. ci-dessous.)

## Recommandations suite (RECOMMAND_FOLLOWUP → triage /sprint end Phase 4)
- RECOMMAND_FOLLOWUP: E2E Playwright viewport 812x375 paysage (data-testid `dashboard-landscape`, `dashboard-rail`, `dashboard-rail-item-*` déjà en place) — mutualiser avec l'E2E portrait #83 [triage S | domaine frontend]

## Follow-ups review batch (Phase 7 + /review-pr) — TOUS RÉSOLUS commit 792ce7c
Les findings review (1 MAJEUR + 4 MINEUR) ont été corrigés en cycle auto-correction /review-pr :
- ✅ nextEvent extrait vers `dashboard/lib.ts` (MAJEUR)
- ✅ handleProducts → `useRef` + scrollIntoView (plus de document.querySelector)
- ✅ MobileDrawer Escape mutualisé dans `useFocusTrap(onEscape?)` (listener séparé retiré)
- ✅ focus ring `ring-focus`→`ring-ring` (aligné button.tsx)
- ✅ CompactRail `labelKey` mort retiré
Aucun follow-up review ouvert restant. (Voir review-batch.md §Résolution.)

STATUS: COMPLETED
