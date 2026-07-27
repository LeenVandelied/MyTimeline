# Issue #56 — Migration de la Landing sur le DS + décomposition du monolithe (absorbe #295)

**Sprint :** 48 · **Vague :** 2 · **Taille :** L · **Priorité :** P1 · **Epic :** `epic:design`
**Commit :** `48b9e01`
**Branche :** `sprint/48` · **spawn-ref :** `e9a56df8fd48c8c18ad59f61e03e92851ffc74db`

## Objectif

Décomposer `HomePage.tsx` (monolithe de 274 lignes), migrer la landing sur les tokens Graphite,
trancher la duplication de routes `/[locale]` vs `/[locale]/home`, et absorber l'issue **#295**
(imbrications `<a><Button>` invalides).

## Corrections de périmètre apportées par le lead avant briefing

Le corps de l'issue et le plan architecte étaient périmés sur 3 points, corrigés dans le briefing :
1. **Chemins fantômes** — l'issue citait `frontend/src/app/[locale]/page.tsx` (inexistant : l'App Router est
   `frontend/app/`) et annonçait « 279 lignes » ; le monolithe réel était `frontend/src/components/pages/HomePage.tsx`, 274 lignes.
2. **« 7 sections à créer » — 2 existaient déjà.** `TestimonialSection` et `ui/footer.tsx` étaient déjà extraits
   et déjà sur les tokens DS. Le travail réel portait sur **6 blocs** encore inline.
3. **Pages légales déjà présentes** — `app/[locale]/privacy/` et `terms/` existent ; aucun placeholder à créer.
   Seul un lien mort `<a href="#">` (mentions légales) restait dans le footer.

## Solution livrée

- **`HomePage.tsx` : 274 → 49 lignes** (critère : ≤50).
- **6 blocs extraits** sous `frontend/src/components/landing/` : `HeaderSection`, `FeaturesSection`,
  `HowItWorksSection`, `TimelinePreviewSection`, `MobileAppSection`, `CtaSection`.
  `TestimonialSection` et `ui/footer.tsx` → **déplacés** sous `landing/` (`FooterSection`) pour cohérence.
- **`IntersectionObserver` sorti en hook** `useSectionAnimation` (`src/hooks/`) — nécessaire pour tenir
  le budget de 50 lignes (l'`useEffect` en faisait 26 à lui seul).
- **Animation de frise hero** : composant isolé `HeroTimelineAnimation` + `styles/hero-timeline.css`.
  **CSS pur** — `framer-motion` est dans le `package.json` mais **n'était jamais importé** dans le code ;
  le dev a évité de l'introduire. `prefers-reduced-motion` géré. Accent bleu réservé à « aujourd'hui » (charte Graphite).
- **Sections pilotées par données** : les 3 cartes features et les 4 étapes how-it-works (copiées-collées
  dans le monolithe) deviennent des `.map()`.
- **Migration AA** : boutons store iOS/Android `border-rule` (1.24:1) → `border-rule-emphasis` (token de #293).
- **Lien mort supprimé** : entrée `legalNotice` (`href="#"`) retirée du footer ; clés i18n conservées
  dans les 4 locales pour une future page.

## Décision de route — ADR-006 (option A)

**`/[locale]` devient la route canonique** ; `/[locale]/home` répond en **308** (`permanentRedirect`).

Justification retenue : `/fr` est la racine de locale au sens next-intl et la cible naturelle des liens
entrants ; `/home` est un segment redondant ; la racine du site passe de 2 sauts à 1
(`/` → `/fr/home` → `/fr` devient `/` → `/fr`).

**Contrainte respectée : redirection, PAS suppression** — aucune des deux routes n'est supprimée (liens
entrants/SEO possibles hors dépôt).

Coût assumé (option A était la plus chère en churn) : **5 `href`/`push` + 5 assertions de test** mis à jour —
`app/page.tsx`, `[locale]/error.tsx`, `[locale]/not-found.tsx`, `(app)/dashboard/page.tsx`,
`[locale]/error.test.tsx` (×2), `[locale]/not-found.test.tsx`, `app/error.test.tsx` (×2),
plus la constante `PUBLIC_PATHS` de `e2e/auth-guard.spec.ts`.

Livrables : **`docs/adr/ADR-006-route-canonique-landing.md`** (104 lignes) + entrée **`DEC-S48-056`**
dans `docs/memory/decisions.md`.

## #295 absorbée — à fermer

Les **5** imbrications `<a>`/`<button>` (HTML invalide, double cible de tabulation) sont corrigées via
`<Button asChild><Link>` :

| Fichier d'origine | Ligne | Cible |
|---|---|---|
| `HomePage.tsx` (→ `HeaderSection`) | 75 | `/login` |
| `HomePage.tsx` (→ `HeaderSection`) | 83 | `/register` |
| `HomePage.tsx` (→ `CtaSection`) | 262 | `/register` |
| `HeroSection.tsx` | 32 | `/register` |
| `HeroSection.tsx` | 37 | `#how-it-works` (repéré en plus des 4 listées) |

Le reviewer a validé les 5 conversions : `Slot` Radix standard, un seul enfant React par `Button`,
aucun `passHref` résiduel dans les fichiers touchés, classes fusionnées via `twMerge`.

**→ Action lead : fermer #295 en citant `48b9e01`.**

## Critères d'acceptation (8)

| # | Critère | État |
|---|---|---|
| 1 | `HomePage.tsx` ≤ 50 lignes | ✅ **49** (vérifié par le lead) |
| 2 | Chaque section dans son fichier | ✅ |
| 3 | Zéro couleur hardcodée | ⚠ **PARTIEL** — zéro hex dans le TSX (vérifié), mais `landing.css` en injecte encore (voir Limites) |
| 4 | Clair/sombre fonctionnels | ⚠ **PARTIEL** — tokens theme-aware partout, mais les hex de `landing.css` sont theme-blind ; jamais vérifié visuellement |
| 5 | Animation de frise hero visible | ✅ implémentée — non vérifiée visuellement |
| 6 | Footer → pages légales | ✅ `terms` + `privacy` ; `legalNotice` retirée (lien mort, contenu juridique non inventable) |
| 7 | Une seule route affiche la landing | ✅ 308 |
| 8 | Responsive mobile | ⚠ breakpoints `md:` préservés + frise fluide — non vérifié sur vrai viewport |

## Tests

`./scripts/test-quiet.sh frontend` → **641/641, 79 fichiers** (vague 1 : 599/599, 69 fichiers → **+42 tests**).
**Relancé indépendamment par le lead**, pas repris du rapport subagent. `next build` : **0 erreur**.
10 fichiers de tests créés (7 sections + animation + HomePage + hook).

## Signaux mémoire

- `[MEMORY:decision]` **DEC-S48-056** — écrite dans `docs/memory/decisions.md` + `ADR-006`.
- `[MEMORY:pitfall]` **`.section-animation { opacity: 0 }` + `IntersectionObserver` absent = landing INVISIBLE**,
  pas « non animée ». Cas réels : jsdom, navigateurs anciens. Repli explicite ajouté dans le hook
  (vérifié par le reviewer : révèle tout immédiatement si l'API manque).
  **Règle : toute classe de révélation au scroll doit avoir un repli quand l'API manque.**
- `[MEMORY:pitfall]` **Une bascule d'URL peut casser une spec E2E non listée.** `e2e/auth-guard.spec.ts`
  assertait `status === 200` sur `/fr/home` avec `maxRedirects: 0` → le 308 l'aurait rougie.
  **Grepper `e2e/` ET `src/lib/` avant tout changement de route, pas seulement les `href`.**

## Recommandations suite

`RECOMMAND_UI_DESIGN` — la frise hero est une **création visuelle du dev** (rail + 5 jalons + progression
balayante, accent sur « aujourd'hui »). Sobre et conforme Graphite, mais **non arbitrée par un designer** ;
isolée exprès pour être remplaçable sans toucher au `HeroSection`.
*Traitement lead : non bloquant — le briefing autorisait explicitement ce mode (livrer simple + signaler)
plutôt que d'inventer une direction visuelle lourde. À arbitrer si la landing passe en revue design.*

**RECOMMAND_FOLLOWUP (3) :**
1. **`landing.css` — hex hardcodés hors palette Graphite appliqués aux sections** (`#8B5CF6`, `#4F46E5`
   violet/indigo, `#374151`, `#4B5563`, `#6D28D9`) via `.feature-card`, `.timeline-preview`,
   `.testimonial-card`, `.card-gradient-border`, `.nav-link` + **doublon `.section-animation`**
   (`animations.css:4` / `landing.css:167`, également relevé `[MAJEUR]` par le reviewer).
   **Débloque les critères #3 et #4 en entier.** [**M** | frontend/DS]
2. **Page mentions légales** : route + contenu juridique + 4 locales (clés i18n déjà présentes). [**S** | legal/frontend]
3. **`LanguageSelector`** — `<Link>` enveloppant `<DropdownMenuItem>` : **même famille de défaut a11y que #295**,
   hors des occurrences listées. [**XS-S** | frontend/a11y]

**ABSORBED :** repli `IntersectionObserver` du hook · `unobserve` après révélation · correction de la chaîne
`/` → `/fr/home` → `/fr` (2 sauts → 1) · suppression du lien mort `href="#"` du footer · nav header et
features/steps pilotés par données.

## NON VÉRIFIÉ (déclaré)

Rendu visuel réel (aucun navigateur ouvert) · mode sombre · viewport mobile réel · suite Playwright non
exécutée (exige backend Spring + Postgres) — l'édit de `PUBLIC_PATHS` est raisonné, pas prouvé · comportement
réel du 308 côté navigateur · ratios de contraste non recalculés (repris de #293, eux-mêmes re-vérifiés par le lead).

> Atténuation lead sur le risque `PUBLIC_PATHS` : `isProtectedPathname` retourne `false` quand
> `segment === null` (`auth-guard-paths.ts:120`) → la racine de locale `/fr` est **publique par construction**.
> `auth-guard-paths.ts` n'a pas été modifié. Pas de régression de garde serveur.

STATUS: COMPLETED
