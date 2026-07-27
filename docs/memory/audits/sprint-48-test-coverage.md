# Audit tests — Sprint 48

> Généré en fin de Phase 6. Tout marqueur de couverture manquante bloque la Phase 9 (PR).
> **Aucun n'est présent dans ce document** — le gate `grep` de la Phase 9 doit passer.
> Sprint « Landing page sur le DS » — issues **#293** (token DS AA) et **#56** (décomposition landing, absorbe **#295**).

## Couverture par BR-XX

**Aucune BR n'est impactée par ce sprint — ce n'est pas une lacune, c'est le périmètre.**

Les deux issues sont `epic:design` et ne touchent **aucune règle métier** :
- **#293** ajoute un token de couleur au design system (`colors.css`, `globals.css`) + migre une classe CSS.
- **#56** réorganise du JSX de page marketing et tranche une route. Le corps de l'issue le dit
  explicitement : « BR impactées : Aucune (page marketing, hors domaine métier) ».

Le diff ne contient **aucun fichier backend** (vérifié : `git diff --name-only origin/dev..HEAD -- backend/` = vide),
aucune migration Flyway, aucun schéma Zod, aucun DTO. Le tableau de couverture BR est donc **sans objet**,
et le critère « cross-system flow ⇒ E2E métier obligatoire » ne se déclenche pour aucune BR.

| BR | Description | Cross-system flow | Verdict |
|----|-------------|:---:|---|
| — | *(aucune BR touchée par le sprint)* | NON | N/A justifié |

## Tests créés

Issue #293 :
- `frontend/src/components/landing/HeroSection.test.tsx` (durci) — assert `border-rule-emphasis`,
  `not.toMatch(border-ink-muted)`, et cadre décoratif conservé sur `border-rule` nu
  (lookahead `(?![-\w])` — sinon `\bborder-rule\b` matche `border-rule-emphasis`).

Issue #56 — 10 fichiers de tests créés :
- `frontend/src/components/landing/HeaderSection.test.tsx`
- `frontend/src/components/landing/FeaturesSection.test.tsx`
- `frontend/src/components/landing/HowItWorksSection.test.tsx`
- `frontend/src/components/landing/TimelinePreviewSection.test.tsx`
- `frontend/src/components/landing/MobileAppSection.test.tsx`
- `frontend/src/components/landing/CtaSection.test.tsx`
- `frontend/src/components/landing/FooterSection.test.tsx`
- `frontend/src/components/landing/HeroTimelineAnimation.test.tsx`
- `frontend/src/components/pages/HomePage.test.tsx`
- `frontend/src/hooks/useSectionAnimation.test.ts`

Tests existants **mis à jour** suite à la bascule de route ADR-006 (`/[locale]/home` → `/[locale]`, 308) :
- `frontend/app/[locale]/not-found.test.tsx`, `frontend/app/[locale]/error.test.tsx` (×2 assertions),
  `frontend/app/error.test.tsx` (×2 assertions), `frontend/e2e/auth-guard.spec.ts` (constante `PUBLIC_PATHS`).

## Résultats des runs

| Suite | Résultat | Vérification |
|---|---|---|
| Frontend unitaires (Vitest) | **641 passed / 641** — 79 fichiers, 16.57s | ✅ **relancé par le lead**, pas repris du rapport subagent |
| `next build` | **0 erreur**, 2 warnings | ✅ relancé par le lead (le pack rappelle que vitest vert ≠ build vert) |
| Backend (JUnit) | **non exécuté** | ⚠ justifié : **zéro fichier backend** dans le diff. La CI le relance de toute façon (4 jobs requis sur `dev`). |
| E2E (Playwright) | **non exécuté** | ⚠ justifié : exige backend Spring + Postgres lancés. Voir §Limites. |

Référence de non-régression : la vague 1 laissait **599/599 sur 69 fichiers**. La vague 2 monte à
**641/641 sur 79 fichiers** (+42 tests, +10 fichiers). Aucune régression.

## Couverture E2E des nouveaux `data-testid`

Heuristique `review-protocol.md` A.4 exécutée par le lead :

Deux `data-testid` apparaissent en `+` dans le diff — `global-error-home-link` et `not-found-home-link` —
mais **les deux préexistent sur `origin/dev`** (vérifié via `git grep <id> origin/dev`). Ils n'apparaissent
en ajout que parce que la ligne `href` voisine a changé (`/[locale]/home` → `/[locale]`).

**Aucun `data-testid` réellement nouveau n'a été introduit.** Le dev a délibérément évité d'en ajouter sur la
landing, conformément au briefing : les captures E2E clair/sombre de la landing sont l'issue **#294**, laissée
au backlog par le plan architecte.

**→ `[COVERAGE-E2E] OK`** — rien à couvrir, donc aucun MAJEUR.

## Review batch (Phase 7)

Reviewer sur le diff complet (43 fichiers, +1391/-394) :

- **0 `[CRITIQUE]`**
- **1 `[MAJEUR]`** — `.section-animation` défini en double (`animations.css:4` / `landing.css:167`).
  **Pré-existant, non introduit par ce diff**, explicitement hors périmètre du briefing → follow-up, non bloquant.
- **2 `[MINEUR]`** — commentaire trompeur dans `HeroTimelineAnimation.test.tsx` ; `passHref` résiduels dans
  `terms/page.tsx` et `privacy/page.tsx` (hors périmètre #56/#295, inoffensifs : aucun `<Button>` imbriqué).
- **8 `[OK]`** dont, vérifiés dans le code par le reviewer : exhaustivité de la bascule de route (aucun `/home`
  résiduel, pas de sitemap/robots à modifier), correction du repli `IntersectionObserver`, validité des
  5 conversions `<Button asChild>`, préservation stricte des classes Tailwind et des clés `common.landing.*`,
  et `--color-border: var(--color-rule)` non touché.

Aucun dispatch de correction nécessaire.

## Limites — ce qui n'a PAS été vérifié

Énuméré explicitement plutôt que passé sous silence :

1. **Rendu visuel réel** — aucun navigateur ouvert. Le mode sombre, le viewport mobile et l'animation de frise
   hero sont **testés en assertions DOM uniquement**, jamais constatés à l'œil.
2. **Suite Playwright non exécutée** (backend + Postgres requis). La modification de `PUBLIC_PATHS` dans
   `e2e/auth-guard.spec.ts` est **raisonnée et cohérente** (`/fr/home` répond désormais 308, or les requêtes
   partent en `maxRedirects: 0` et assertent `status === 200`), mais **non prouvée par un run**.
   Atténuation : le lead a vérifié que `isProtectedPathname` retourne `false` quand `segment === null`
   (`auth-guard-paths.ts:120`) → la racine de locale `/fr` est **publique par construction**, pas de régression
   de garde. La CI exécutera les E2E.
3. **Comportement réel du 308 en navigateur** non constaté (mise en cache durable côté client).
4. **Critère d'acceptation #3 de #56 (« zéro couleur hardcodée ») : satisfait dans le TSX, PAS dans le CSS.**
   `landing.css` injecte encore des hex **hors palette Graphite** (`#8B5CF6`, `#4F46E5` violet/indigo, `#374151`,
   `#4B5563`, `#6D28D9`) via `.feature-card`, `.timeline-preview`, `.testimonial-card`, `.card-gradient-border`,
   `.nav-link` — classes que les sections portent toujours. Ces couleurs sont **theme-blind** (ne suivent pas
   clair/sombre), ce qui limite aussi le critère #4. **Connu, déclaré, hors périmètre du briefing** (la refonte
   CSS était explicitement exclue) → follow-up [M] consigné. Le reviewer a confirmé que **le diff n'aggrave pas**
   la situation : aucune nouvelle classe hardcodée ajoutée.

## Conclusion

**Prêt pour PR.** Suite unitaire verte (641/641, relancée par le lead), build vert, review sans CRITIQUE ni
MAJEUR imputable au diff, couverture E2E sans lacune (aucun testid nouveau à couvrir).

Les 4 limites ci-dessus sont **documentées et arbitrées**, pas subies. Les critères #3, #4 et #8 de l'issue #56
sont **partiellement satisfaits** et le sont explicitement — le follow-up `landing.css` les débloquera en entier.
