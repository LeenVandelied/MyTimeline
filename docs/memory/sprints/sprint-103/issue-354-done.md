# Issue #354 — `data-testid` des CTA de la landing

**Sprint :** 103 · **Agent :** A (`fullstack-dev`, opus) · **Date :** 2026-09-22
**Commit :** `0f945537`

## Résumé

Objectif : que le harnais de contraste cible les CTA de la landing par `data-testid`, sans dépendre de `href` ni de la structure.

Identifiants ajoutés (grep préalable `landing-header-cta|landing-hero-cta|landing-final-cta|landing-menu-cta|cta-register|cta-login` sur `src e2e app` = 0 résultat ; préfixe `landing-header-menu*` déjà pris, d'où `landing-menu-cta-login` et non `landing-header-menu-login`) :

| Nom harnais | testid | Fichier |
|---|---|---|
| header/inscription | `landing-header-cta-register` | `frontend/src/components/landing/HeaderSection.tsx` |
| header/connexion | `landing-header-cta-login` | `HeaderSection.tsx` (groupe `hidden lg:flex`) |
| hero/primaire | `landing-hero-cta-primary` | `HeroSection.tsx` |
| hero/secondaire | `landing-hero-cta-secondary` | `HeroSection.tsx` |
| bandeau-final/inscription | `landing-final-cta-register` | `CtaSection.tsx` |
| menu/connexion (copie burger) | `landing-menu-cta-login` | `LandingMobileMenu.tsx` |

Le menu burger ne porte qu'une copie de CTA (« Connexion ») ; pas de copie d'inscription (l'inscription du header reste visible à toutes les largeurs).

Harnais :
- `frontend/e2e/support/contrast.ts` : nouvelle constante `LANDING_CTA` ; `landingCtas()` = 5 × `getByTestId` ; `mobileMenuTargets()` : `menu/connexion` par testid. Les ancres de nav du panneau (`menu/ancre-N`) restent ciblées par position (`nav a`.nth) — ce ne sont pas des CTA.
- `frontend/e2e/landing-cta-contrast.spec.ts` : les 3 `page.locator('a.cta-button')` et `section a[href="#how-it-works"]` → `getByTestId` ; les 3 mutations `addStyleTag` visent `[data-testid="landing-hero-cta-primary"]` au lieu de `.cta-button` ; le proxy `getComputedStyle` compare le `data-testid` au lieu de `classList.contains('cta-button')`.
- `frontend/e2e/landing-mobile-menu.spec.ts:524` : `a[href="/fr/login"]` → testid + `toHaveAttribute('href','/fr/login')` (le contrôle de l'href est conservé).
- `frontend/e2e/README.md` §Sélecteurs : « follow-up ouvert » remplacé par la liste des testids.

Écarts d'énoncé :
- Moitié `.eslintcache` DÉJÀ livrée, rien fait. Preuve :
  - `git ls-files frontend/.eslintcache` → `[]` (vide)
  - `/usr/bin/grep -n eslintcache frontend/.gitignore` → `8:.eslintcache`
  - `git log --oneline -1 -- frontend/.eslintcache` → `a2d8e8e7 :see_no_evil: chore(git): retire frontend/.eslintcache du suivi git (#373)`
- Le JSDoc d'origine disait « `display:none` sous `md` » pour header/connexion ; le code réel est `hidden lg:flex` (seuil remonté par #347). Corrigé dans le nouveau JSDoc.

## Tests

Comptage des cibles (JSON reporter, annotations `contraste-repos` / `contraste-menu`, script jetable dans le scratchpad) :

| | Avant (468f79fc) | Après (0f945537) |
|---|---|---|
| Tests listés `landing-cta-contrast` + `landing-mobile-menu` (`--list`) | 14 + 21 = 35 (+5 setup) | 14 + 21 = 35 (+5 setup) |
| Run | 40 passed | 40 passed |
| Lectures au repos cta-contrast (light/dark × 1280/375) | 5+4+5+4 = 18 | 18 |
| Lectures au survol cta-contrast (liste figée `toEqual`, 5 × 2 thèmes) | 10 | 10 |
| Lectures menu burger (repos+survol+fermer, 2 thèmes) | 12+12 = 24 | 24 |
| **Total** | **52** | **52** |

Commande : `SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_JSON_OUTPUT_NAME=<scratch>/{before,after}.json rtk proxy npx playwright test landing-cta-contrast landing-mobile-menu --workers=1 --reporter=line,json`.

Contrôles négatifs (fichiers restaurés depuis copie, `git status` vérifié) :
1. **Déplacement** : `CtaSection.tsx` `<section>` → `<div>`. Ancien sélecteur `section a[href$="/register"]:not(.cta-button)` → **0** élément (sonde Playwright jetable) ; testid → 1. Spec `landing-cta-contrast` → **19 passed**, mêmes 18 lectures au repos (5/4/5/4). L'ancien harnais aurait perdu ce CTA.
2. **Retrait d'un testid** : `data-testid="landing-hero-cta-secondary"` supprimé → **8 failed / 11 passed** (`toHaveCount(1)` au repos ×4, survol ×2 par liste figée, test dédié du secondaire ×2). Le harnais rougit.

Autres :
- `rtk proxy npx tsc --noEmit` → EXIT 0.
- `npx next lint --file` ×7 fichiers → « No ESLint warnings or errors ».
- `rtk proxy npx prettier --check` ×8 fichiers → OK.
- Vitest complet : **157 fichiers / 1997 tests passed**.
- E2E 9 specs (`landing-cta-contrast landing-header-logo landing-mobile-menu landing-mobile-overflow landing-typography-hierarchy landing-auth-theme-toggle sprint-77-theme-visual sprint-84-section-titles sprint-63-de-overflow-audit`, `--workers=1`) : **121 passed / 10 failed**. Les 10 échecs = `sprint-77-theme-visual` captures, message `A snapshot doesn't exist at …-chromium-darwin.png, writing actual` (écart de plateforme macOS connu, S82 ; pas `did not match`). Les 10 PNG darwin non suivis supprimés ; `git status | grep darwin` = 0 avant commit.

fichiers de contexte lus:
- `docs/memory/sprints/sprint-103/architect-plans.md` — blocs `issue_354` (l.19) et `issue_613` (l.55) : « ciblages fragiles landing-cta-contrast.spec.ts:101,227,276 »
- `docs/memory/sprints/sprint-103/maquette-landing-frise-cas-usage.md` — §2 (« Les 3 citations de la maquette sont des sources inventées ») et §3 (« garder `id="how-it-works"` »)
- `.ai-env/context-packs/cp-frontend.md` — intégral (« les nouveaux `data-testid` doivent être référencés dans une spec »)
- `.ai-env/context-packs/pit-frontend.md` — index l.1803-1810 (PIT-S49-001…008) ; PIT-S85-006, PIT-S102-004 via extrait du briefing
- `docs/memory/sprints/sprint-49/issue-337-done.md` — l.1-30 (« 12 tests : 5 CTA × clair/sombre × 1280/375 », commit `4fa7ba6`)
- Commentaire d'arbitrage #613 (`gh issue view 613 --comments`) — « périmètre changé en « retirer la section » »

## Signaux mémoire

- [MEMORY:pattern] Problème : prouver qu'un changement de ciblage E2E ne perd aucune mesure. Solution : lire les annotations du reporter JSON (`PLAYWRIGHT_JSON_OUTPUT_NAME` + `--reporter=line,json`) avant/après et compter les noms mesurés, plus un contrôle négatif « déplacer » (le sélecteur ancien tombe à 0, le nouveau garde la mesure) et « retirer l'identifiant » (doit rougir). Anti-pattern : comparer seulement « N passed ».

## Recommandations suite

- Pas de RECOMMAND_DB_EXPERT : aucun changement backend/schéma.
- Pas de RECOMMAND_SECURITY : attributs de test uniquement.
- Pas de RECOMMAND_TEST_RUNNER : 9 specs exécutées par l'agent (hors captures darwin, à trancher par la CI Linux).
- Pas de RECOMMAND_UI_DESIGN : aucun changement visuel.
- RECOMMAND_FOLLOWUP: ancres de nav du panneau burger ciblées par position (`nav a`.nth(0..2)) dans `mobileMenuTargets` — fragile face à #612/#613 qui retirent des ancres ; les cibler par testid dérivé de l'ancre [triage XS | frontend/e2e]

STATUS: COMPLETED
