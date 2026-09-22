# Issue #793 — Cibler les ancres du menu burger par data-testid plutôt que par position

## Objectif

Supprimer le ciblage positionnel (`panel.locator('nav a').nth(0)`) de `mobileMenuTargets` et le compte figé (`toHaveCount(1)`) de `landing-mobile-menu.spec.ts` (PIT-S103-003) : chaque lien d'ancre du panneau burger porte un `data-testid` dérivé de son ancre, et le harnais dérive cibles et compte d'une source unique.

## Fichiers modifiés

- `frontend/src/components/landing/landing-nav.ts` (nouveau) — `LANDING_NAV_ANCHORS = ['how-it-works']`, `LandingNavAnchor`, `LANDING_NAV_LABEL_KEYS`, `landingMenuLinkTestId(anchor)` → `landing-header-menu-link-<anchor>`. Module sans React/next-intl, importable par Playwright (motif `src/lib/event-palette`).
- `frontend/src/components/landing/HeaderSection.tsx` — `navLinks` dérivé de `LANDING_NAV_ANCHORS` (`{ anchor, href, label }`).
- `frontend/src/components/landing/LandingMobileMenu.tsx` — `LandingMobileMenuNavLink.anchor` ; `data-testid={landingMenuLinkTestId(link.anchor)}` sur chaque lien du panneau.
- `frontend/e2e/support/contrast.ts` — `mobileMenuTargets` : une cible `menu/ancre-<anchor>` par entrée de `LANDING_NAV_ANCHORS`, via testid ; JSDoc mis à jour.
- `frontend/e2e/landing-mobile-menu.spec.ts` — « un clic sur une ancre » vise le testid de la 1ʳᵉ ancre de la source (et vérifie `href` exact) ; test tablette : `toHaveCount(LANDING_NAV_ANCHORS.length)` + boucle testid/`href` par ancre.
- `frontend/src/components/landing/HeaderSection.test.tsx` — +1 test : liens du panneau = exactement `LANDING_NAV_ANCHORS`, testid et `href` dérivés.

## Décisions et écarts

- **Source partagée créée** (suggestion de l'issue) : c'était simple — `HeaderSection` construisait déjà la liste passée au panneau. Clé i18n conservée (`common.landing.navigation.howItWorks`), aucune clé ajoutée sous `navigation` (PIT-S83-009).
- **testid sur les liens du panneau seulement**, pas sur la nav desktop : hors énoncé, et tout testid doit être cité par une spec (coverage-e2e). La nav desktop reste ciblée par `href` (`header nav a[href="#how-it-works"]`, spec #614).
- **Nom de cible** : `menu/ancre-1` → `menu/ancre-how-it-works` (dérivé de l'ancre, lisible dans l'annotation `contraste-menu`).
- `landing-cta-contrast.spec.ts` ne consomme PAS `mobileMenuTargets` (grep : 0 occurrence) — l'énoncé du briefing le citait comme consommateur ; seul `landing-mobile-menu.spec.ts` l'utilise. Rejoué quand même (vert).
- Le `toHaveCount(1)` du consommateur (par cible) est conservé : c'est lui qui fait rougir une ancre de la source que le panneau ne rendrait pas.

## Tests

- **Compte de lectures de contraste, avant / après** (annotation `contraste-menu` de `landing-mobile-menu.spec.ts › contraste du panneau`, reporter JSON, script de comptage) :
  - AVANT (HEAD `8dae3d1a`) : clair 8 + sombre 8 = **16** — `menu/titre, menu/ancre-1, menu/connexion` ×2 (repos + survol) + `menu/fermer` ×2.
  - APRÈS : clair 8 + sombre 8 = **16** — mêmes cibles, `menu/ancre-1` renommée `menu/ancre-how-it-works`. Identique.
- `SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 rtk proxy npx playwright test e2e/landing-mobile-menu.spec.ts e2e/landing-cta-contrast.spec.ts --ignore-snapshots --reporter=line` → 40 passed.
- Contrôle négatif : `data-testid` retiré du lien du panneau → **4 rouges** E2E (contraste clair + sombre `toHaveCount`, tablette 768 px `toHaveAttribute`, clic d'ancre) + 1 rouge Vitest (#793) ; restauré (`cmp` OK) → 12 passed sur le même filtre.
- Rejeu adjacent : `sprint-104-landing-sticky-nav`, `landing-header-logo`, `landing-mobile-overflow`, `sprint-63-de-overflow-audit`, `sprint-103-use-case-frieze` → 65 passed, 2 rouges dans `sprint-63-de-overflow-audit` (`timeline · es`, `create-form · de` : `toBeVisible` sur des surfaces authentifiées non touchées) ; spec rejouée seule → **22/22 verts**. Lu comme instabilité sous charge (2 workers, 5 specs), non imputable à #793 — non prouvé au-delà de ce rejeu.
- Vitest suite complète `rtk proxy npx vitest run` : 157 fichiers / 2006 tests verts.
- `tsc --noEmit` exit 0 ; `next lint --file` (6 fichiers) 0 warning ; `prettier --check` (6 fichiers) OK ; `git status | grep darwin` vide.

## Signaux mémoire

- [MEMORY:pattern] Problem : le harnais E2E cible des éléments d'une liste rendue par position et fige leur nombre. Solution : liste en module TS pur (`landing-nav.ts`) importé par le composant ET par Playwright (`../src/...`), testid dérivé par une fonction du même module, cibles et compte dérivés de la liste. Anti-pattern : `nav a`.nth(i) + `toHaveCount(N)` littéral (PIT-S103-003).
- [MEMORY:pitfall] Contexte : compter des lectures de contraste Playwright via `--reporter=json` sur stdout. Solution : le harnais préfixe stdout de lignes `[e2e] …` → JSON invalide ; utiliser `PLAYWRIGHT_JSON_OUTPUT_NAME=<fichier>`. Prévention : ne jamais parser le stdout du reporter JSON dans ce dépôt.

## Recommandations suite

- Pas de RECOMMAND_FOLLOWUP.
- Pas de RECOMMAND_DB_EXPERT : aucun changement backend ni schéma.
- Pas de RECOMMAND_SECURITY : ajout de `data-testid` et refactor de liste d'ancres, sans donnée ni flux sensible.
- Pas de RECOMMAND_TEST_RUNNER : specs consommatrices et adjacentes rejouées, Vitest complet joué (2006 verts).
- Pas de RECOMMAND_UI_DESIGN : aucun changement visuel (attribut de test et source de données seulement).

## Fichiers de contexte lus

- `docs/memory/sprints/sprint-104/briefing-614.md` — section « Issue #793 » et PIT-S103-003 (l.178-180).
- `docs/memory/sprints/sprint-103/issue-613-done.md`, `issue-612-done.md`, `issue-354-done.md` — NON LUS en entier ; extraits grep (`mobileMenuTargets`, `ancre-`, `toHaveCount`).
- `frontend/e2e/support/contrast.ts:495-560` — `LANDING_CTA`, `MOBILE_MENU`, `mobileMenuTargets`.
- `frontend/e2e/landing-mobile-menu.spec.ts` — `openMenu`, clic d'ancre (l.134-143), contraste (l.224-270), tablette (l.505-535).
- `frontend/src/components/landing/HeaderSection.tsx`, `LandingMobileMenu.tsx`, `HeaderSection.test.tsx`.
- `frontend/e2e/sprint-103-use-case-frieze.spec.ts:2`, `e2e/auth-guard.spec.ts:6` — précédents d'import `../src/...` depuis Playwright.
- `.ai-env/context-packs/pit-frontend.md` — NON LU directement (extrait du briefing).

STATUS: COMPLETED
