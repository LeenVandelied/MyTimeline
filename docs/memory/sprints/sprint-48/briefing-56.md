[BRIEFING ISSUE #56]

## Issue

**[FEATURE] Frontend : migrer la Landing page sur le DS + décomposer le monolithe**
Labels : `epic:design`, `priority:P1`, `size:L`, `sprint-48`

### Contexte (corps de l'issue)
`HomePage.tsx` est un monolithe qui mélange header, hero, features, how-it-works, aperçu timeline, témoignages, application mobile, CTA et footer dans un seul fichier. Cette structure rend la maintenance impossible, bloque la migration Graphite (on ne peut pas migrer morceau par morceau) et empêche la réutilisation des sections. La Landing est la première impression des visiteurs : son état actuel ne reflète pas le design Graphite.

### À faire (corps de l'issue)
- Décomposer `HomePage.tsx` en sections autonomes : `HeroSection`, `FeaturesSection`, `HowItWorksSection`, `TimelinePreviewSection`, `TestimonialsSection`, `MobileAppSection`, `CtaSection`, `FooterSection`
- Migrer chaque section sur les tokens Graphite (couleurs, typo, espacements) avec support clair/sombre
- Implémenter le Hero avec une animation de timeline horizontale (CSS ou Framer Motion selon ce qui est déjà dans le projet)
- Brancher le footer sur les pages légales — créer des routes placeholder si elles n'existent pas
- Résoudre l'ambiguïté des routes dupliquées `/[locale]` et `/[locale]/home`

### Critères d'acceptation (corps de l'issue)
- [ ] `HomePage.tsx` ne dépasse pas 50 lignes (orchestration des sections uniquement)
- [ ] Chaque section est dans son propre fichier sous `components/landing/` ou `app/[locale]/_sections/`
- [ ] Aucune couleur hardcodée dans aucune des sections (tokens Graphite exclusivement)
- [ ] Les modes clair et sombre sont fonctionnels sur l'ensemble de la Landing
- [ ] Le Hero inclut une animation de timeline horizontale visible
- [ ] Le footer contient des liens vers les pages légales (même si placeholder)
- [ ] Une seule route affiche la Landing (l'autre est supprimée ou redirige vers la canonique)
- [ ] La page est responsive mobile

### Risques techniques (corps de l'issue)
- Routes dupliquées : si les deux sont utilisées dans des liens existants (nav, emails, SEO), supprimer l'une peut casser des liens entrants. Vérifier les `href` avant de supprimer.
- L'animation Hero timeline horizontale n'est pas spécifiée dans le DS → risque de divergence. Implémenter en composant isolé pour faciliter le remplacement.
- Si `framer-motion` n'est pas présent, l'ajout augmente le bundle.

---

# ⚠⚠ LIS CETTE SECTION AVANT TOUT — le corps de l'issue ET le plan architecte sont PÉRIMÉS sur plusieurs points

Le lead a scanné le code réel au démarrage du sprint. **Plusieurs affirmations du brief d'origine sont fausses.**

## 1. Chemins fantômes dans le corps de l'issue

| Chemin cité par l'issue | Réalité |
|---|---|
| `frontend/src/app/[locale]/page.tsx` | ❌ **N'EXISTE PAS.** L'App Router est `frontend/app/`, **PAS** `frontend/src/app/` |
| `frontend/src/app/[locale]/home/page.tsx` | ❌ idem → réel : `frontend/app/[locale]/home/page.tsx` |
| « monolithe à 279 lignes » | ⚠ En réalité **274 lignes**, et il est dans `frontend/src/components/pages/HomePage.tsx` — **PAS** dans un `page.tsx` |

**Le monolithe est `frontend/src/components/pages/HomePage.tsx` (274 lignes).** Les deux `page.tsx` de route ne font que 6 lignes chacun et délèguent à ce composant.

## 2. Le plan architecte annonce « 7 sections à créer » — **2 existent déjà**

`architect-plans.md` liste comme « sections à créer » : FeaturesSection, HowItWorksSection, TimelinePreviewSection, **TestimonialsSection**, MobileAppSection, CtaSection, **FooterSection**.

**Vérifié par le lead — déjà extraits et déjà sur les tokens DS :**
- **`frontend/src/components/TestimonialSection.tsx`** (+ `TestimonialCard.tsx`) — existe, propre, tokens DS, `id="testimonials"`, données depuis `@/data/testimonials.json`. `HomePage.tsx:223` le rend déjà via `<TestimonialSection />`. **NE LE RÉÉCRIS PAS.** Au mieux : le déplacer sous `components/landing/` pour cohérence (optionnel, dis-le si tu le fais).
- **`frontend/src/components/ui/footer.tsx`** — existe, propre, tokens DS, et **contient déjà les liens légaux** `Link → /${locale}/terms` et `/${locale}/privacy`. `HomePage.tsx:271` le rend déjà via `<Footer locale={locale} />`. **NE LE RÉÉCRIS PAS.**
- **`frontend/src/components/landing/HeroSection.tsx`** — extrait au S39, **et modifié par la vague 1 de CE sprint** (issue #293, commit `e9a56df`).

**Le travail réel de décomposition porte donc sur 6 blocs encore inline dans `HomePage.tsx`** :
`Header/Nav` (L57-89), `Features` (L94-150), `HowItWorks` (L152-206), `TimelinePreview` (L208-220), `MobileApp` (L225-253), `Cta` (L255-268).

> Note : le critère « le footer contient des liens vers les pages légales » est **déjà satisfait à 2/3**.
> `frontend/app/[locale]/privacy/` et `frontend/app/[locale]/terms/` **existent réellement** (pas de placeholder à créer).
> **Seul reste** un lien mort `<a href="#">` pour `footer.legalNotice` (mentions légales) — `footer.tsx` ligne ~50.
> Traite-le : soit une route `mentions-legales`/`legal-notice`, soit retire l'entrée. **Ton choix, mais justifie-le.**

## 3. Le token de la vague 1 est disponible

L'issue #293 (vague 1 de ce sprint, déjà mergée sur `sprint/48`) a livré **`--color-rule-emphasis` = `#7A7E87`** (`--gray-450`),
tier « bordure fonctionnelle » ≥3:1 en clair ET sombre (ratios mesurés : 3.97 / 4.07 / 4.81 / 4.49).
Utilitaire Tailwind : **`border-rule-emphasis`**.

**Utilise-le pour toute bordure d'affordance de contrôle** (bouton outline, champ, contrôle sans remplissage).
`border-rule` reste réservé au **décoratif** (cadres, séparateurs). Distinction documentée dans `frontend/src/styles/ds/readme.md`.

⚠ Dans `HomePage.tsx` tu vas croiser deux bordures fonctionnelles actuellement sur `border-rule` (1.24:1, sous le seuil AA) :
- L234 et L237 : boutons iOS/Android de la section MobileApp → `bg-surface border-rule … border`
**Migre-les vers `border-rule-emphasis`** en extrayant la section. C'est dans l'esprit de #56 (« migrer sur les tokens Graphite »).

⚠ **NE MODIFIE PAS** le mapping shadcn `--color-border: var(--color-rule);` dans `globals.css` (impact global sur toute l'app).

---

## 🧭 ROUTES DUPLIQUÉES — enquête déjà faite par le lead (input pour ton ADR)

**Les deux routes rendent le MÊME composant.** Vérifié :

`frontend/app/[locale]/page.tsx` (6 lignes) :
```tsx
import HomePage from '@/components/pages/HomePage';

// Au lieu de rediriger, cette page fait la même chose que home/page.tsx
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const paramsObj = await params;
  return <HomePage params={paramsObj} />;
}
```

`frontend/app/[locale]/home/page.tsx` (6 lignes) : identique, export `Home`.

### ⚠ Contre-intuitif : `/[locale]/home` est la route CANONIQUE DE FAIT

`/[locale]` a l'air d'être la racine « naturelle », mais **c'est `/home` qui est câblé partout**. Références réelles trouvées (10) :

| Fichier | Ligne | Usage |
|---|---|---|
| `frontend/app/page.tsx` | 5 | **`redirect('/fr/home')`** ← la RACINE DU SITE redirige vers `/home` |
| `frontend/app/[locale]/(app)/dashboard/page.tsx` | 81 | `router.push(\`/${locale}/home\`)` |
| `frontend/app/[locale]/error.tsx` | 64 | `href={\`/${locale}/home\`}` |
| `frontend/app/[locale]/not-found.tsx` | 32 | `href={\`/${locale}/home\`}` + `data-testid="not-found-home-link"` |
| `frontend/app/error.tsx` | 91 | `href={\`/${locale}/home\`}` + `data-testid="global-error-home-link"` |

**Et 5 assertions de test verrouillent ces URLs** — elles passeront au ROUGE si tu changes les `href` sans les mettre à jour :
- `frontend/app/[locale]/not-found.test.tsx:27` → attend `'/fr/home'`
- `frontend/app/[locale]/error.test.tsx:36` et `:59` → attendent `'/fr/home'`
- `frontend/app/error.test.tsx:35` → attend `'/es/home'`
- `frontend/app/error.test.tsx:42` → attend `'/fr/home'`

### Ce que tu dois décider (ADR obligatoire)

Deux options cohérentes, **choisis-en une et argumente** :

- **Option A — `/[locale]` canonique** (idiomatique Next/SEO : la landing vit à la racine de la locale).
  Coût : `/[locale]/home/page.tsx` devient un `redirect()` permanent, **+ mettre à jour les 5 `href`/`push` + les 5 assertions de test**.
- **Option B — `/[locale]/home` canonique** (statu quo câblé, moindre churn).
  Coût : `/[locale]/page.tsx` devient un `redirect()`, mais on garde une racine de locale qui ne sert qu'à rediriger — discutable en SEO.

**Contrainte non négociable (corps de l'issue + plan architecte) : REDIRECTION, PAS SUPPRESSION.** Ne supprime aucune des deux routes — des liens entrants/SEO peuvent exister hors du dépôt.
Utilise `redirect()` de `next/navigation` (côté serveur, ces `page.tsx` sont des Server Components).

**Livrable ADR : `docs/adr/ADR-006-route-canonique-landing.md`** — la convention du dépôt est `docs/adr/ADR-00N-<slug>.md` (ADR-001..005 existent, **006 est le prochain libre**).
Ajoute aussi une entrée `## DEC-S48-056 — …` dans `docs/memory/decisions.md` (format : voir les entrées existantes, un paragraphe dense qui dit *quoi* + *pourquoi* + *alternatives rejetées* + `(Sprint 48 #56)`).

---

## 🔗 ISSUE #295 ABSORBÉE PAR #56 (critère d'acceptation supplémentaire)

**Issue #295 : `[BUG] a11y : corriger les imbrications <a><Button> de HomePage (header, hero, CTA)`** — statut OPEN.
Son propre corps autorise l'absorption : « Peut être absorbé par la décomposition complète de la landing (#56) si elle est reprise avant ».

**Défaut :** `<Link href=… passHref><Button>…</Button></Link>` produit un `<button>` **imbriqué dans un `<a>`** → HTML invalide, double cible de tabulation, sémantique cassée pour les lecteurs d'écran.

**Les 4 occurrences sont localisées et vérifiées :**

| Fichier | Ligne | Cible |
|---|---|---|
| `frontend/src/components/pages/HomePage.tsx` | **75** | header → `/login` |
| `frontend/src/components/pages/HomePage.tsx` | **83** | header → `/register` |
| `frontend/src/components/pages/HomePage.tsx` | **262** | CTA → `/register` |
| `frontend/src/components/landing/HeroSection.tsx` | **32** | hero → `/register` |

**Correctif :** `<Button asChild>` + `<Link>` **à l'intérieur**, et retirer `passHref` (inutile avec `asChild`).
**C'est supporté** : `frontend/src/components/ui/button.tsx` importe `Slot` de `@radix-ui/react-slot` (L2) et gère `asChild` (L40, L44-45).

```tsx
// AVANT (invalide)
<Link href={`/${locale}/register`} passHref>
  <Button className="…">{t('…')}</Button>
</Link>

// APRÈS
<Button asChild className="…">
  <Link href={`/${locale}/register`}>{t('…')}</Link>
</Button>
```

⚠ `HeroSection.tsx:37` a aussi un `<a href="#how-it-works"><Button variant="outline">` — **même défaut**, traite-le pareil (`<Button asChild variant="outline"><a href="#how-it-works">…</a></Button>`).

**Après livraison, signale-le** : le lead fermera #295 en citant ton commit.

---

## 📄 État actuel du monolithe (inliné intégralement — 274 lignes, ne va pas le chercher)

`frontend/src/components/pages/HomePage.tsx` :

```tsx
'use client'

import { useEffect } from 'react'
import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, LayoutList } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Footer } from '@/components/ui/footer'
import { LanguageSelector } from '@/components/ui/language-selector'
import { HeroSection } from '@/components/landing/HeroSection'
import TestimonialSection from '@/components/TestimonialSection'
import { useTranslations, useLocale } from 'next-intl'

interface HomePageProps {
  params: { locale: string }
}

export default function HomePage({ params }: HomePageProps) {
  const t = useTranslations()
  const defaultLocale = useLocale()
  const locale = params?.locale || defaultLocale || 'fr'

  // ---- L28-53 : IntersectionObserver qui ajoute .visible aux .section-animation ----
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('visible')
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -100px 0px' },
    )
    const sections = document.querySelectorAll('.section-animation')
    sections.forEach((section) => observer.observe(section))
    return () => { sections.forEach((section) => observer.unobserve(section)) }
  }, [])

  return (
    <div className="bg-bg text-ink min-h-screen">
      {/* Header/Navigation — L57-89 */}
      <header className="container mx-auto flex items-center justify-between px-4 py-6">
        <div className="flex items-center">
          <div className="text-accent text-3xl font-bold">Ma Timeline</div>
        </div>
        <nav className="text-ink-muted hidden space-x-8 md:flex">
          <a href="#features" className="nav-link hover:text-accent transition duration-200">{t('common.landing.navigation.features')}</a>
          <a href="#how-it-works" className="nav-link hover:text-accent transition duration-200">{t('common.landing.navigation.howItWorks')}</a>
          <a href="#testimonials" className="nav-link hover:text-accent transition duration-200">{t('common.landing.navigation.testimonials')}</a>
        </nav>
        <div className="flex items-center space-x-4">
          <LanguageSelector />
          <Link href={`/${locale}/login`} passHref>          {/* ← L75 : #295 */}
            <Button variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-ink transition-all">
              {t('common.login.title')}
            </Button>
          </Link>
          <Link href={`/${locale}/register`} passHref>       {/* ← L83 : #295 */}
            <Button className="bg-accent hover:bg-accent-hover text-accent-ink transition-all">
              {t('common.landing.buttons.register')}
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero — L92 : DÉJÀ EXTRAIT */}
      <HeroSection locale={locale} />

      {/* Features — L94-150 : 3 <Card> quasi identiques (Calendar / Clock / LayoutList),
          classes répétées : "feature-card card-gradient-border bg-surface border-rule transform
          shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-md"
          → candidat évident à une sous-liste de données + .map() */}
      <section id="features" className="bg-surface section-animation py-20"> … </section>

      {/* HowItWorks — L152-206 : 4 étapes quasi identiques (cercle numéroté 1..4 + titre + desc)
          → candidat évident à un .map() sur [1,2,3,4] */}
      <section id="how-it-works" className="section-animation py-20"> … </section>

      {/* TimelinePreview — L208-220 : <Image src="/images/timeline.svg" fill> dans un cadre */}
      <section className="bg-surface section-animation py-10"> … </section>

      {/* Testimonials — L223 : DÉJÀ EXTRAIT */}
      <TestimonialSection />

      {/* MobileApp — L225-253 : texte + 2 boutons store + <Image src="/images/mobile-app.svg">
          ⚠ L234 et L237 : boutons sur `border-rule` (1.24:1) → migrer vers `border-rule-emphasis` */}
      <section className="section-animation py-20"> … </section>

      {/* Cta — L255-268 : bandeau bg-accent + <Link passHref><Button> ← L262 : #295 */}
      <section className="bg-accent section-animation py-20"> … </section>

      {/* Footer — L271 : DÉJÀ EXTRAIT */}
      <Footer locale={locale} />
    </div>
  )
}
```

> Les blocs `…` sont abrégés ici pour la lisibilité — **lis le fichier réel** (`Read`) pour le contenu exact avant de découper. Tout le reste de ce briefing (numéros de ligne, classes, clés i18n) est exact.

### Points d'attention sur la décomposition

1. **L'`useEffect` IntersectionObserver (L28-53)** pilote `.section-animation` → `.visible` **globalement** via `document.querySelectorAll`.
   Si tu extrais les sections, cet observer doit continuer à les voir. Deux approches viables :
   - le garder dans `HomePage` (il scanne le DOM après montage — fonctionne toujours), **ou**
   - le sortir en hook `useSectionAnimation()` sous `src/hooks/`.
   ⚠ **Attention au budget de 50 lignes** du critère d'acceptation : 26 lignes d'`useEffect` dans un fichier plafonné à 50 lignes ne laissent presque rien. **Le hook est probablement le bon choix** — mais c'est ton arbitrage, justifie-le.
2. **`.section-animation` est défini DEUX FOIS** : `frontend/src/styles/animations.css:4` **et** `frontend/src/styles/landing.css:167`. Duplication CSS pré-existante. **Ne t'engage pas dans un nettoyage CSS large** — signale-le en `RECOMMAND_FOLLOWUP` si tu n'y touches pas.
3. **Aucun `data-testid` n'existe sur la landing.** Si tu en ajoutes, ils doivent être référencés dans une spec Playwright sous `frontend/e2e/`, sinon le contrôle de couverture E2E du sprint lèvera un MAJEUR. **Le plan architecte précise que les captures E2E clair/sombre sont l'issue #294, laissée au backlog** → n'écris PAS de nouvelle spec E2E ici. Le plus sûr : **n'ajoute des `data-testid` que si tu en as besoin pour tes tests unitaires**, et dis-le dans ton rapport.
4. **Aucun test n'existe pour `HomePage`** (`HeroSection.test.tsx` est le seul test de la landing). Tu pars d'une page blanche côté tests de sections.

## Animation Hero timeline horizontale

- **`framer-motion` EST présent** : `frontend/package.json:35` → `"framer-motion": "^12.6.3"`. Pas de nouvelle dépendance à ajouter.
- `frontend/src/styles/animations.css` et `landing.css` (222 lignes) contiennent déjà des animations maison — **regarde-les avant** de choisir entre CSS pur et framer-motion.
- Le corps de l'issue demande de l'**isoler en composant dédié** (l'animation n'est pas spécifiée au DS, elle sera probablement remplacée). Respecte ça : un composant à part, pas de logique d'animation noyée dans `HeroSection`.
- ⚠ **`prefers-reduced-motion`** : une animation en boucle sur la landing doit le respecter. `animations.css` a peut-être déjà une convention — vérifie et aligne-toi.

## Plan d'implémentation (architect, /sprint plan) — à lire avec les corrections ci-dessus

```yaml
issue_56:
  couches_touchees: ["frontend"]
  strategie_test: "unit"          # E2E captures clair/sombre = #294, laissée au backlog
  risque_regression: |
    PIEGE DE PERIMETRE CONFIRME — le label sprint-39 était périmé (retiré par le lead au plan S45-S49).
    S39 n'a livré QUE la slice contraste. L'issue est ouverte À DESSEIN (sprint-history L849/L860).
    Second risque : trancher /[locale] vs /[locale]/home casse les liens/SEO existants
    — décider par ADR, REDIRECTION plutôt que suppression.
  ordre_ecriture: "ADR (route canonique) → #293 mergée → extraction section par section → tokens → asChild (#295) → RTL"
  zod_dto_sync: "NON"
  possibly_done: false          # PARTIEL, pas done
```

`ordre_ecriture` reste valide : **ADR d'abord** (il conditionne les fichiers de route), **#293 est déjà mergée** sur ta branche.

## Context-pack domaine (lire EN PRIORITE avant tout code)

<!-- ===== cp-frontend.md ===== -->
# Context-pack : Frontend MyTimeline (Next.js 15 App Router / React 18)

> À charger pour TOUTE tâche frontend. Décrit la stack RÉELLE (scan code, sprint 9).
> Versions = source de vérité `frontend/package.json`. Ce pack ne réplique pas les
> valeurs mineures : en cas de doute, relire le `package.json`.

## Stack réelle (versions du package.json)

- **Next.js `^15.2.4`** — App Router, dev `next dev --turbopack`, build `next build`.
- **React `^18.3.1`** + React DOM 18.3.1. ⚠ **PAS React 19** malgré `@types/react@^19`.
- **TypeScript `^5`** strict (`strict: true`, `noEmit`), alias `@/* → src/*`, `@/app/* → app/*`.
- **TanStack Query `^5.101.2`** (+ devtools) — état serveur. API v5 STRICT (forme objet, `gcTime`).
- **Zod `^3.24.2`** — validation + inférence de types.
- **React Hook Form `^7.54.2`** + `@hookform/resolvers@^4` (zodResolver).
- **next-intl `^4.0.2`** — i18n, 4 locales `['fr','en','es','de']`, `localePrefix: 'always'`.
- **Tailwind `^4.0.12`** (`@tailwindcss/postcss`) + `tailwind.config.ts` minimal + `postcss.config.mjs`.
- **shadcn/ui** style `new-york`, `rsc: true`, icônes **lucide-react**, Radix (dialog, select, popover, dropdown, checkbox, label, slot).
- **axios `^1.8.1`** (client HTTP), **react-hot-toast** (toasts globaux), **next-themes** (clair/sombre), **framer-motion**, **dayjs**, **react-colorful**.
- Tests : **Vitest `^2.1.9`** + **RTL `^16`** + jest-dom (jsdom). **Playwright `^1.61`** configuré ET peuplé (`frontend/e2e/` contient ≥9 specs : `golden-path`, `categories`, `products`, `settings-*` — MAJ S33, l'ancienne note « e2e vide » était périmée S9). Storybook 8 présent.

## Structure `frontend/`

- **`app/`** (App Router, PAS `src/app/`) : `layout.tsx` (root, Server Component), `app/[locale]/` avec `dashboard/ login/ register/ forgot-password/ reset-password/ home/ privacy/ terms/`.
- **`i18n.ts`** (racine) : `getRequestConfig`, charge les messages depuis **`public/locales/<locale>/<namespace>.json`** (fichiers par namespace : `auth common dashboard errors legal products register validation`).
- **`middleware.ts`** : `next-intl/middleware`, `localePrefix: 'always'`, matcher exclut `api|_next|*.*`.
- **`src/components/`** : `ui/` (shadcn : button, card, dialog, select, form, input, spinner, dropdown-menu, popover, language-selector…), `calendar/`, `pages/`, `products/`, + composants métier (`EventContent`, `EventEditForm`, `Testimonial*`, `theme-provider`).
- **`src/contexts/`** : `AuthContext.tsx` (source unique du user), `QueryProvider.tsx`.
- **`src/services/`** : `apiClient.ts` (axios + intercepteurs), `authService.ts`, `eventService.ts`, `productService.ts`.
- **`src/hooks/`** : `useAuth.ts`, `useCurrentUser.ts`, `useProductsWithEvents.ts`.
- **`src/lib/`** : `schemas/auth.ts` (Zod), `query-keys.ts`, `utils.ts`.
- **`src/types/`** : `auth.ts` `user.ts` `event.ts` `product.ts` (schémas Zod + types, ré-exports).
- **`src/styles/`** : `globals.css` `landing.css` `animations.css` + **`ds/`** (design tokens Graphite).

## Conventions

- **Server Components par défaut** ; `'use client'` UNIQUEMENT si hooks/état/handlers (ex. `AuthContext`, `QueryProvider`, `useCurrentUser`). Le root `layout.tsx` reste serveur ; `QueryProvider` isole `QueryClientProvider` côté client.
- **TypeScript strict** : zéro `any`, zéro `as` non justifié.
- **État serveur = TanStack Query v5** (forme objet `useQuery({ queryKey, queryFn })`, `gcTime` pas `cacheTime`). Query keys centralisées : `src/lib/query-keys.ts` (factory hiérarchique par domaine, `as const`). NE PAS éparpiller les clés en littéraux → invalidations qui ratent leur cible. `QueryClient` créé via `useState` (une instance/durée de vie, jamais au niveau module en App Router).
- **Auth = `AuthContext` source UNIQUE du user** (`useAuth()`). **#135 / DEC-S9-002** : PII (email, name) N'EST PLUS en `localStorage`. Session = cookie **JWT HttpOnly** (invisible JS). Restauration au montage par **re-fetch `GET /api/auth/me`** (`withCredentials`), `loading:true` le temps du re-fetch (pas de flash anonyme). `logout` ne purge aucun storage. `useCurrentUser` NE refait PAS d'appel `/me` : sa `queryFn` relit le user d'`AuthContext` (anti double-fetch). **Ne jamais réintroduire de PII persistée** → renvoyer vers DEC-S9-002.
- **Sécurité logs** : ne JAMAIS logger l'objet axios brut (`error.config.data` = body → password en clair ; `error.config.headers` = Authorization/cookies). Utiliser un extracteur assaini (`safeErrorMessage`) — cf. `AuthContext`, `apiClient`.
- **Formulaires = RHF + Zod** via `zodResolver`. Deux familles de schémas : « bruts » `*Schema` (service, parse payload, sans message) et factories i18n `create*Schema(t)` (form, messages traduits). Le token/param hors formulaire n'entre pas dans le schéma form (cf. reset-password).
- **Redirections auth localisées** : construire l'URL avec la locale courante (`/${locale}/login`) — `localePrefix: 'always'` casse tout chemin non préfixé.

## Sync Zod ↔ DTO backend (piège récurrent)

Les schémas Zod front doivent rester alignés sur les DTO backend (Spring Boot). Désalignement = strip silencieux ou ZodError runtime.
- `.nullable()` pour un champ nullable backend ; `.optional()` pour un champ absent. JAMAIS `.nullish()` en code manuel.
- Endpoint paginé : `paginatedSchema(itemSchema)`, jamais `schema.array()` (le body est `{items,total,page,size}`).
- Contraintes alignées BR-AUT-003 : username 3..20, email valide, password ≥ 6. Le client ne doit PAS surcontraindre le contrat backend (ex. reset ≠ register).
- DTO connus : login `{username,password}`, register `{name,username,email,password}`, forgot `{email}`, reset `{token,newPassword}`, `/auth/me` → `UserSchema {id(uuid),name,username,email,role}`.
- ⚠ Il n'existe PAS de règle `.claude/rules-jit/zod-dto-sync.md` à ce jour — appliquer cette checklist directement.

## i18n (next-intl 4)

- `useTranslations("namespace")` — JAMAIS de strings FR hardcodées. Pas de `t("key",{ns})` : un `useTranslations` par namespace.
- Messages = `public/locales/<locale>/<namespace>.json` (mock/validation data en JSON, pas de FR inline).
- Zod i18n : factory `create*Schema(t)` (option `useMemo` côté form pour stabilité).

## Design system « Graphite » (`src/styles/ds/`)

- Direction B validée (S6, source projet Claude Design) : quasi-monochrome, accent bleu électrique unique pour *today/active*, type mono (Archivo display/ui + IBM Plex Mono) via `next/font` self-hosté (variables `--font-display/--font-mono`). Clair + sombre complets.
- Tokens : `ds/tokens/` (`colors base spacing typography fonts`) + `ds/components/`, `ds/timeline.css`, `ds/i18n.css`, `ds/a11y-audit.md`, `ds/readme.md`.
- **Theme-aware** : chaque composant doit fonctionner clair ET sombre (`next-themes`). Consulter `ds/readme.md` avant de créer un composant.
- Éviter les hex inline → passer par les tokens CSS du DS.

## Accessibilité

- Spinners : `role="status"` + `aria-label` + `<span class="sr-only">`.
- Tables : `aria-label`, `scope="col"`. Interactifs custom : `role` + `tabIndex` + `onKeyDown` (Enter/Space) + `focus:ring-2`.
- Cf. `src/styles/ds/a11y-audit.md`.

## Tests (Vitest + RTL) — pièges

- **`React.use()` N'EXISTE PAS en React 18.3.1** (PIT-S8-005) — ne pas s'appuyer dessus dans code ou tests.
- **`useSearchParams` exige un `<Suspense>`** englobant (PAT-S8-004).
- **`next build` en CI attrape des erreurs invisibles aux tests RTL** (types/build strict, `ignoreBuildErrors:false`) — un run vitest vert ne garantit pas le build.
- Setup `vitest.setup.ts` : jest-dom, cleanup RTL, mocks `next/font/google`, `next/navigation`, `matchMedia`. `useAuth` hors `<AuthProvider>` lève.
- Objectif : run vitest sans ligne stderr. `act()` warning → test `async` + `await waitFor(...)`. Logs d'erreur intentionnels → `vi.spyOn(console,'error').mockImplementation(()=>{})` + `mockRestore()`.
- ✅ `frontend/e2e/` PEUPLÉ (≥9 specs Playwright : golden-path, categories, products, settings-{account,mobile,navigation,preferences,profile,security}). Vérifier la couverture réelle d'un parcours avant d'ajouter — les nouveaux `data-testid` doivent être référencés dans une spec (sinon coverage-e2e MAJEUR).

## Références

- `docs/memory/decisions.md` (DEC-S9-002 : PII hors localStorage), `docs/memory/patterns.md`, `docs/memory/pitfalls.md` (PIT-S8-005, PAT-S8-004).
- `frontend/src/styles/ds/readme.md` (charte Graphite), `ds/a11y-audit.md`.

<!-- CACHE_CONTROL_BREAKPOINT -->

## Triage

- **Taille** : L
- **Modèle** : opus
- **Effort** : xhigh
- **Priorité** : P1
- **Domaine** : design system / frontend (aucun pack `br-*` — page marketing, **hors domaine métier, aucune BR impactée**)

## Dépendances intra-sprint

- **Vague 2 — tu es le DERNIER.** La vague 1 (#293) est **livrée et mergée sur ta branche** (commit `e9a56df`).
- Le token `border-rule-emphasis` est disponible, testé, documenté. Consomme-le.
- `HeroSection.tsx` a été **modifié par la vague 1** (L44 + docstring). Pars de l'état courant du fichier
  (`Read` obligatoire), **pas** de la version citée dans d'anciens documents.
- Personne ne travaille après toi. Ton commit ferme le périmètre d'implémentation du sprint.

## Designer

**Non spawné pour cette issue.** Motif : la charte Graphite (`frontend/src/styles/ds/readme.md`) et
`ds/a11y-audit.md` **font foi** et sont déjà appliqués sur les sections extraites (`HeroSection`,
`TestimonialSection`, `Footer`) — ils constituent tes modèles de référence.
La décomposition est un **refactor à iso-rendu** : tu ne conçois pas un écran neuf, tu extrais l'existant.

**Seule exception : l'animation de timeline horizontale du Hero est une création visuelle non spécifiée.**
Reste **sobre et cohérent avec Graphite** (quasi-monochrome, accent bleu réservé à *today/active*).
Si tu estimes que l'animation mérite un arbitrage design formel, **livre une version simple et signale
`RECOMMAND_UI_DESIGN`** dans ton rapport plutôt que d'inventer une direction visuelle lourde.

## Contraintes

- **Branche cible** : `sprint/48` (déjà checkout — NE change PAS de branche, ne crée PAS de worktree)
- **Répertoire de travail** : `/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/new-feature-2347-14cb9a`
  → **`cd` explicitement dans ce répertoire** au début de ta session et vérifie
    `git rev-parse --abbrev-ref HEAD` → doit répondre `sprint/48`.
    Si tu te retrouves sur une autre branche ou dans `/Users/herrh/VSProjects/MyTimeline` (dépôt principal), **ARRÊTE** et signale-le.
  → Vérifie aussi que `git log --oneline -1` montre bien `e9a56df` (le commit de la vague 1) dans l'historique.
- **Commit** : 1 commit logique, message gitmoji en français
  (ex. `:recycle: refactor(landing): décomposer HomePage en sections + migration DS (#56, #295)`)
- **`git add` CIBLÉ sur tes fichiers uniquement — JAMAIS `git add -A` / `git add .`**
  (le working tree est partagé avec l'orchestrateur : `docs/memory/sprints/sprint-48/*` et
  `docs/memory/sprint-history.md` sont à MOI, ne les commite pas)
- **Tests** : `./scripts/test-quiet.sh` (scope frontend) — OBLIGATOIRE, doit être **vert avant de rendre la main**
  (référence vague 1 : **599/599**, 69 fichiers — tu ne dois pas régresser ce chiffre)
- **Code en anglais, docs/commentaires/ADR en français** (convention projet)
- **TypeScript strict** : zéro `any`, zéro `as` non justifié
- **i18n** : `useTranslations()` uniquement, **zéro string FR en dur**. Toutes les clés existent déjà
  (`common.landing.*`) — tu réorganises du JSX, tu ne crées pas de contenu. Si tu ajoutes une clé
  (ex. mentions légales), ajoute-la dans **les 4 locales** : `frontend/public/locales/{fr,en,es,de}/`.
- **Zéro couleur hardcodée** — tokens sémantiques DS exclusivement (critère d'acceptation explicite)
- **Ne touche PAS** :
  - le mapping `--color-border: var(--color-rule);` dans `globals.css` (impact global)
  - `frontend/src/styles/ds/tokens/colors.css` (périmètre #293, livré)
  - `docs/memory/sprint-history.md` ni `docs/memory/sprints/sprint-48/*` (le lead s'en charge)

## Garde-fous de portée (issue L — le risque ici est le débordement)

**FAIS** : décomposer les 6 blocs restants, migrer les tokens, ADR + redirection, `asChild` (#295),
animation hero isolée, tests unitaires des sections, responsive mobile.

**NE FAIS PAS** (hors périmètre — signale en `RECOMMAND_FOLLOWUP` si tu le repères) :
- refonte du CSS landing (`landing.css` 222 l. / doublon `.section-animation`)
- migration AA des ~30 bordures `border-rule-strong` hors landing (**déjà signalée en follow-up par la vague 1**, ne la refais pas)
- nouvelles specs Playwright (c'est **#294**, au backlog)
- toucher au dashboard, à l'auth, ou à quoi que ce soit hors landing — **sauf** les 5 `href`/`push`
  et 5 assertions de test listés dans la section ROUTES **si** ton ADR retient l'option A

**Si tu arrives à la conclusion que le périmètre complet ne tient pas en une passe raisonnable :**
livre un sous-ensemble **cohérent et testé** (priorité : décomposition + tokens + ADR/route + #295),
et rends `STATUS: PARTIAL` avec un `BLOQUE_SUR:` précis. **Un livrable partiel honnête vaut mieux
qu'un livrable complet non testé.** Ne rends jamais un état où la suite de tests est rouge.

## Livrable attendu (format strict, MAX 500 tokens, style caveman — pas de prose)

```
RETOUR :
- commits: [SHA1, ...]
- resume: <sections créées + décision route (option A/B) + n° ADR + #295 traité + tokens migrés + tests>
- decision_route: <A ou B + 1 phrase de justification + fichiers de redirection touchés>
- criteres_acceptation: <8 cases de l'issue — coché / non coché + raison si non coché>
- [MEMORY:*] signaux: <[MEMORY:decision] DEC-S48-056 route canonique ; [MEMORY:pattern] / [MEMORY:pitfall] si applicable>
- recommandations suite: <RECOMMAND_* ou pitfall subtil, ou "aucune">
- RECOMMAND_FOLLOWUP: <travail hors périmètre NON-XS repéré — desc + triage estimé + domaine>
- ABSORBED: <micro-découvertes XS intégrées hors scope initial>
- NON_VERIFIE: <ce que tu n'as PAS pu vérifier — sois explicite, ex. rendu visuel réel, sombre, mobile>
- STATUS: COMPLETED en dernière ligne (ou STATUS: PARTIAL + BLOQUE_SUR: <raison>)
```

**La dernière ligne de ton retour doit être exactement `STATUS: COMPLETED` ou `STATUS: PARTIAL`.**
