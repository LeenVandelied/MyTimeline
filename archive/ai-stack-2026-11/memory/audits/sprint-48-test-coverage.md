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
| Backend (JUnit) | **vert en CI** | non lancé localement (**zéro fichier backend** dans le diff) — job `backend` de la PR #333 : SUCCESS |
| E2E (Playwright) | **vert en CI** | non lançable localement (exige backend Spring + Postgres) — job `e2e` de la PR #333 : SUCCESS |

**Mise à jour post-push (PR #333, head `a42e919`) : les 4 jobs requis sont verts** —
`backend` · `frontend` · `e2e` · `security`. `mergeStateStatus: CLEAN`, `mergeable: MERGEABLE`.

⚠ **Conséquence sur la limite n°2 ci-dessous : elle est levée.** Le job `e2e` vert **prouve** que la
modification de `PUBLIC_PATHS` (`/fr/home` → `/fr`) est correcte et que la bascule de route ADR-006 ne casse
aucune spec Playwright. Ce point n'est plus « raisonné mais non prouvé ».

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
2. ~~**Suite Playwright non exécutée** localement (backend + Postgres requis).~~ **LEVÉE** — le job `e2e` de la
   PR #333 est **vert**. La modification de `PUBLIC_PATHS` dans `e2e/auth-guard.spec.ts` (`/fr/home` répondant
   désormais 308 alors que la spec assertait `status === 200` en `maxRedirects: 0`) est **prouvée par un run**,
   plus seulement raisonnée. Vérification statique complémentaire du lead, toujours valable :
   `isProtectedPathname` retourne `false` quand `segment === null` (`auth-guard-paths.ts:120`) → la racine de
   locale `/fr` est **publique par construction**.
3. **Comportement réel du 308 en navigateur** non constaté (mise en cache durable côté client).
4. **Critère d'acceptation #3 de #56 (« zéro couleur hardcodée ») : satisfait dans le TSX, PAS dans le CSS.**
   `landing.css` injecte encore des hex **hors palette Graphite** (`#8B5CF6`, `#4F46E5` violet/indigo, `#374151`,
   `#4B5563`, `#6D28D9`) via `.feature-card`, `.timeline-preview`, `.testimonial-card`, `.card-gradient-border`,
   `.nav-link` — classes que les sections portent toujours. Ces couleurs sont **theme-blind** (ne suivent pas
   clair/sombre), ce qui limite aussi le critère #4. **Connu, déclaré, hors périmètre du briefing** (la refonte
   CSS était explicitement exclue) → follow-up [M] consigné. Le reviewer a confirmé que **le diff n'aggrave pas**
   la situation : aucune nouvelle classe hardcodée ajoutée.

## ⚠ ADDENDUM CLÔTURE — 3 défauts trouvés APRÈS cet audit, par contrôle navigateur

Cet audit concluait « prêt pour PR » avec CI 4/4 verte, review sans CRITIQUE et 641/641 tests verts.
**Il est passé à côté de 2 régressions user-visible et d'un échec WCAG.** Trouvés en Phase 1 de
`/sprint end` en ouvrant réellement la page (`next dev` + navigateur) :

| # | Défaut | Mesure | Correctif |
|---|---|---|---|
| 1 | **2 CTA primaires INVISIBLES** (bleu sur bleu) | contraste **1.00:1** → 6.94:1 | `842a46c` |
| 2 | **CTA du hero TRONQUÉ en plein mot** (« cer gratuit ») | 125px rendus / 266px de contenu → 406/406 | `903fc3e` |
| 3 | Bandeau CTA débordant du viewport mobile | 465px dans 375px → 343/343 | `6a34480` |
| 4 | `<h2>` du bandeau CTA sous le seuil AA | **2.41:1** → **6.94:1** | `32d555c` |

Défauts 1 et 2 = **régressions de ce sprint** (conversion `asChild` de #295). Défauts 3 et 4 = **pré-existants**
(classes identiques sur `origin/dev`, vérifié), corrigés parce qu'ils tombaient sous les critères #4 et #8 de #56.

**Pourquoi le harnais ne les a pas vus** — c'est le point à retenir :
- `jsdom` ne résout **ni la précédence des `@layer` ni aucune mise en page** → aucun test RTL ne pouvait
  les attraper ; les `className` étaient **inchangées et correctes**, seul le rendu était faux.
- `next build` ne contrôle aucun style au runtime.
- Le reviewer lit le code et ne voit pas l'interaction de cascade entre deux fichiers CSS.

**Suite après correctifs :** **646/646, 81 fichiers** (+5 tests, +2 fichiers vs cet audit) · `next build` **0 erreur**.
Nouveaux garde-fous : 2 tests AST PostCSS qui compilent le vrai CSS et verrouillent l'invariant de cascade et
celui de taille minimale flex (test de mutation fait dans les deux cas — cf. `PAT-S48-001`).

**Reste NON corrigé et assumé — critère #8 de #56 NON rempli :** à 375px la page garde un **scroll horizontal
de 173px**, dû au groupe de boutons du header (`flex items-center space-x-4`, 299px) qui ne se replie pas.
**Pré-existant** (classes identiques sur `origin/dev`). Exige une décision de design mobile (burger, ou masquer
les boutons auth sous `md`) — hors périmètre d'une clôture. Le header déborde sur **tout viewport < ~565px**.

## Conclusion

**PR #333 prête à merger, APRÈS les 4 correctifs de l'addendum ci-dessus.**
Suite unitaire **646/646** (relancée par le lead), `next build` **0 erreur**, review sans CRITIQUE ni MAJEUR
imputable au diff, couverture E2E sans lacune (aucun testid nouveau à couvrir).
CI à re-vérifier sur le nouveau head avant merge (les 4 correctifs sont postérieurs au dernier run vert).

Des 4 limites initialement listées : la **n°2 est levée par la CI** (job `e2e` vert), et la **n°1 est levée par
le contrôle navigateur** — le rendu a été constaté en clair ET en sombre, ce qui a justement révélé les
défauts de l'addendum. Restent la mise en cache du 308 côté navigateur (non constatée) et les hex de
`landing.css` (follow-up [M]).

**Bilan honnête des critères de #56 : 6/8 remplis.** Le **#3** (zéro couleur hardcodée) et le **#8**
(responsive mobile) sont **NON remplis** — détail et justification dans `sprint-history.md`. Ce ne sont pas
des « partiellement satisfaits » diplomatiques : le CSS contient toujours des hex hors palette Graphite, et
la page scrolle horizontalement sur téléphone.
