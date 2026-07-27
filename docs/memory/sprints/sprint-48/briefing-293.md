[BRIEFING ISSUE #293]

## Issue

**[FEATURE] Ajouter un token DS `--color-rule-emphasis` pour bordures fonctionnelles AA (≥3:1)**
Labels : `epic:design`, `priority:P2`, `size:S`, `frontend`, `sprint-48`

### Contexte
Follow-up Sprint 39 (#56, slice contraste). Source : `docs/memory/sprints/sprint-39/issue-56-done.md` + revue ui-design.
Aucun token de bordure de la charte Graphite n'atteint le seuil WCAG AA de contraste UI (≥3:1) : `--color-rule` (~1.2:1) et `--color-rule-strong` (~1.5:1) échouent des deux côtés sur fond quasi-blanc. Le Sprint 39 a dû emprunter `--color-ink-muted` (tier texte, ~6:1) pour rendre visible la bordure du bouton secondaire outline du hero (cf. DEC-S39-001).

### À faire
Ajouter au design system un token dédié aux **bordures fonctionnelles** (affordance de contrôle sans remplissage), p.ex. `--color-rule-emphasis` (~gray-500), atteignant ≥3:1 vs `bg`/`surface` en clair ET sombre. Remplacer les emprunts à `ink-muted` (hero) par ce token une fois disponible.

### BR impactées
Aucune.

### Critères d'acceptation
- [ ] Token `--color-rule-emphasis` défini clair+sombre dans `frontend/src/styles/ds/tokens/colors.css` + exposé via `@theme` (globals.css)
- [ ] Contraste ≥3:1 vérifié vs `bg` ET `surface`, clair+sombre
- [ ] HeroSection (bouton secondaire) migré `border-ink-muted` → `border-rule-emphasis`
- [ ] Documenté dans `ds/readme.md` (tier bordure fonctionnelle vs `rule` décoratif)

### Risques techniques (corps de l'issue)
Choisir une teinte gray-500 qui reste cohérente visuellement avec `--color-rule`/`--color-rule-strong` existants pour ne pas introduire de rupture de palette. Vérifier l'impact sur d'autres usages potentiels de bordures fonctionnelles (inputs, cards) avant généralisation.

---

## ⚠ CORRECTIONS DE CHEMINS — le corps de l'issue est FAUX sur un point

La « Piste technique » de l'issue cite `frontend/src/app/globals.css`. **Ce fichier N'EXISTE PAS.**
Le vrai fichier est **`frontend/src/styles/globals.css`** (vérifié par le lead, 184 lignes).

Rappel projet : l'App Router est `frontend/app/`, **PAS** `frontend/src/app/`.
Ne fais confiance à aucun chemin cité par un corps d'issue sans l'avoir vérifié toi-même (`ls`/`Read`).

---

## Plan d'implémentation (architect, /sprint plan)

```yaml
issue_293:
  fichiers_cles:
    - "frontend/src/styles/ds/tokens/colors.css"                    # vérifié (119 lignes)
    - "frontend/src/styles/globals.css"                             # ⚠ CORRIGE : l'issue annonce frontend/src/app/globals.css (INEXISTANT)
    - "frontend/src/styles/ds/readme.md"                            # vérifié (176 lignes)
    - "frontend/src/components/landing/HeroSection.tsx"             # vérifié L17 (docstring de l'emprunt) + L40 className="border-ink-muted …"
    - "frontend/src/styles/ds/a11y-audit.md"                        # vérifié (159 lignes)
  couches_touchees: ["frontend"]
  strategie_test: "unit"
  risque_regression: "Emprunt confirmé : HeroSection.tsx:40 utilise border-ink-muted (tier TEXTE) faute de token bordure AA. Le nouveau token doit être validé >=3:1 vs bg ET surface, en clair ET en sombre — un token valide seulement en clair recrée le défaut en sombre."
  ordre_ecriture: "colors.css → mapping @theme globals.css → HeroSection → ds/readme.md"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "(aucune evidence — grep 'rule-emphasis' sur frontend/src = 0 hit, re-vérifié par le lead au démarrage du sprint)"
```

---

## 🔬 MESURES DE CONTRASTE PRÉ-CALCULÉES PAR LE LEAD (à ne pas refaire à l'aveugle)

Le lead a calculé les ratios WCAG 2.1 (formule officielle, sRGB linéarisé) **avant** de te briefer.
**Lis ce tableau avant de choisir la moindre valeur** — le candidat « gray-500 » suggéré par l'issue ÉCHOUE en sombre.

Fonds de référence (extraits de `colors.css`, vérifiés) :
- **Clair** : `--color-bg` = `--gray-25` = `#FCFCFD` · `--color-surface` = `--gray-0` = `#FFFFFF`
- **Sombre** : `--color-bg` = `--gray-950` = `#0B0C0E` · `--color-surface` = `#131519`

### Preuve du défaut (tokens existants, mode clair vs surface `#FFFFFF`)
| Token | Valeur clair | Ratio vs surface | Verdict |
|---|---|---|---|
| `--color-rule` | `#E6E7EB` | **1.24:1** | ❌ très loin de 3:1 |
| `--color-rule-strong` | `#D1D3D9` | **1.50:1** | ❌ échoue |
| `--color-ink-muted` (emprunt S39) | `#5E626B` | **6.11:1** | ✅ mais c'est un tier TEXTE |

### Candidats — mode CLAIR (seuil ≥3:1 vs bg ET surface)
| Candidat | Hex | vs bg `#FCFCFD` | vs surface `#FFFFFF` | Verdict |
|---|---|---|---|---|
| `--gray-300` | `#B8BBC2` | 1.87 | 1.92 | ❌ |
| `--gray-400` | `#969AA3` | **2.75** | **2.82** | ❌ **échoue de peu — piège** |
| `--gray-500` | `#5E626B` | 5.96 | 6.11 | ✅ (= valeur de `ink-muted` clair) |
| `--gray-600` | `#43464D` | 9.22 | 9.45 | ✅ (très sombre, rupture de palette) |

### Candidats — mode SOMBRE (seuil ≥3:1 vs bg ET surface)
| Candidat | Hex | vs bg `#0B0C0E` | vs surface `#131519` | Verdict |
|---|---|---|---|---|
| `--gray-600` | `#43464D` | 2.07 | 1.93 | ❌ |
| `--gray-500` | `#5E626B` | 3.20 | **2.99** | ❌ **ÉCHOUE — le piège exact signalé par l'architecte** |
| `#6B7078` (hors ramp) | `#6B7078` | 3.93 | 3.67 | ✅ candidat viable |
| `--gray-400` | `#969AA3` | 6.94 | 6.48 | ✅ (proche de `ink-muted` sombre `#8E9299`) |

### Conclusions actionnables
1. **La contrainte serrée n'est pas la même selon le mode** : en clair c'est `bg` (`#FCFCFD`, légèrement plus sombre que `surface`) ; en sombre c'est `surface` (`#131519`, plus clair que `bg`). **Valide toujours contre les DEUX.**
2. **Une valeur unique partagée clair/sombre ne peut pas passer.** Le token DOIT être défini séparément dans `:root` et dans `.dark, [data-theme="dark"]`, comme tous les autres tokens sémantiques du fichier.
3. `gray-500` en sombre (2.99) est **sous le seuil** — si tu le prends des deux côtés « parce que l'issue dit ~gray-500 », tu recrées le défaut que l'issue veut corriger. L'issue parle de gray-500 **pour le mode clair**.
4. Si tu introduis une teinte hors ramp (ex. `#6B7078`), **ajoute-la à la ramp graphite** en haut de `colors.css` plutôt que de la coder en dur dans le bloc sémantique — le fichier n'a aucun hex sémantique arbitraire en mode clair, respecte cette discipline. (Le bloc `.dark` contient déjà quelques hex directs : `#131519`, `#20232A`… donc l'usage y est toléré ; juge de la cohérence.)
5. **Re-vérifie mes chiffres** avec ton propre calcul avant de commiter — je te donne une base, pas une dispense de contrôle. Fournis les ratios finaux dans ton rapport.

---

## État actuel du code (inliné — ne va pas le chercher)

### `frontend/src/styles/ds/tokens/colors.css` (119 lignes, extraits pertinents)

```css
:root {
  /* ---- base neutrals (graphite ramp) ---- */
  --gray-0:   #FFFFFF;
  --gray-25:  #FCFCFD;
  --gray-50:  #F3F4F6;
  --gray-100: #E6E7EB;
  --gray-200: #D1D3D9;
  --gray-300: #B8BBC2;
  --gray-400: #969AA3;
  --gray-500: #5E626B;
  --gray-600: #43464D;
  --gray-800: #24262C;
  --gray-900: #16181D;
  --gray-950: #0B0C0E;

  /* ---- semantic surfaces & ink (LIGHT) ---- */
  --color-bg:          var(--gray-25);
  --color-surface:     var(--gray-0);
  --color-surface-2:   var(--gray-50);
  --color-surface-sunken: var(--gray-50);
  --color-ink:         var(--gray-900);
  --color-ink-muted:   var(--gray-500);
  --color-ink-faint:   var(--gray-400);
  --color-rule:        var(--gray-100);
  --color-rule-strong: var(--gray-200);
  /* ← C'EST ICI que --color-rule-emphasis doit s'insérer (après rule-strong) */

  /* focus ring */
  --color-focus: var(--blue-500);
}

.dark,
[data-theme="dark"] {
  --color-bg:          var(--gray-950);
  --color-surface:     #131519;
  --color-surface-2:   #1B1E24;
  --color-surface-sunken: #0E1013;
  --color-ink:         #ECEDEF;
  --color-ink-muted:   #8E9299;
  --color-ink-faint:   #5E626B;
  --color-rule:        #20232A;
  --color-rule-strong: #2E323A;
  /* ← ET ICI pour le pendant sombre */

  --color-focus: var(--blue-400);
}
```

### `frontend/src/styles/globals.css` — bloc `@theme inline` (lignes 38-48)

Tailwind v4 : c'est ce bloc qui crée les utilitaires (`border-rule`, `text-ink-muted`…).
**Sans une ligne ici, `border-rule-emphasis` n'existera pas comme classe Tailwind.**

```css
@theme inline {
  /* ---- couleurs sémantiques ---- */
  --color-bg: var(--color-bg);
  --color-surface: var(--color-surface);
  --color-surface-2: var(--color-surface-2);
  --color-surface-sunken: var(--color-surface-sunken);
  --color-ink: var(--color-ink);
  --color-ink-muted: var(--color-ink-muted);
  --color-ink-faint: var(--color-ink-faint);
  --color-rule: var(--color-rule);
  --color-rule-strong: var(--color-rule-strong);
  /* ← ajouter --color-rule-emphasis: var(--color-rule-emphasis); */
  ...
}
```

Note : plus bas dans le même bloc, la couche de compat shadcn fait `--color-border: var(--color-rule);` (ligne 102).
**Ne change pas ce mapping** — `--color-border` pilote `border-input`/`border` de shadcn partout dans l'app ; le basculer sur le nouveau token assombrirait toutes les bordures de l'application. Le scope de #293 est le token + le hero, rien d'autre.

### `frontend/src/components/landing/HeroSection.tsx` (62 lignes, intégral)

```tsx
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

interface HeroSectionProps {
  locale: string
}

/**
 * Hero de la landing — extrait du monolithe HomePage (#56, slice contraste).
 * Extraction non destructive : HomePage rend <HeroSection locale=… /> à la place
 * du bloc inline. Contraste WCAG AA (clair + sombre) : la bordure du bouton
 * secondaire passe de `border-rule` (~1.2:1, invisible) à `border-ink-muted`
 * (~6:1) pour respecter le seuil UI ≥ 3:1. Tokens sémantiques DS uniquement,
 * zéro hex hardcodé — suit clair/sombre via les variables CSS.
 */
export function HeroSection({ locale }: HeroSectionProps) {
  const t = useTranslations()

  return (
    <section className="section-animation container mx-auto flex flex-col items-center px-4 py-20 md:flex-row">
      <div className="mb-10 md:mb-0 md:w-1/2 md:pr-10">
        <h1 className="mb-6 text-4xl leading-tight font-bold md:text-5xl">
          {t('common.landing.hero.title')}
        </h1>
        <p className="text-ink-muted mb-8 text-xl">{t('common.landing.hero.subtitle')}</p>
        <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
          <Link href={`/${locale}/register`} passHref>
            <Button className="cta-button bg-accent hover:bg-accent-hover text-accent-ink rounded-lg px-8 py-6 text-lg transition-all">
              {t('common.landing.hero.cta')} <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <a href="#how-it-works">
            <Button
              variant="outline"
              className="border-ink-muted text-ink hover:bg-surface rounded-lg px-8 py-6 text-lg transition-all"
            >
              {t('common.landing.hero.secondary')}
            </Button>
          </a>
        </div>
      </div>
      <div className="hero-image-container relative md:w-1/2">
        <div className="bg-surface border-rule overflow-hidden rounded-xl border shadow-lg">
          {/* Image de prévisualisation du tableau de bord */}
          <div className="relative h-80 w-full md:h-96">
            <Image
              src="/images/dashboard-preview.svg"
              alt={t('common.landing.images.dashboard')}
              fill
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
```

**La ligne à changer est la 40** : `className="border-ink-muted text-ink hover:bg-surface …"` → `border-rule-emphasis`.
**Mets aussi à jour la docstring (L13-20)** : elle documente l'emprunt à `ink-muted` comme un pis-aller ; une fois le token livré, elle est périmée et doit décrire la nouvelle situation.

⚠ **NE TOUCHE PAS** au `<Link href={...} passHref><Button>` de la ligne 32 : cette imbrication est un défaut a11y connu (issue #295), **explicitement assigné à l'issue #56 (vague 2 de ce sprint)**. Le corriger ici créerait un conflit avec le dev de la vague suivante.

⚠ `border-rule` ligne 48 (cadre de l'image) est **décoratif**, pas fonctionnel — il reste sur `--color-rule`. Le nouveau token cible les **affordances de contrôle** (bordure de bouton outline), pas les cadres décoratifs. C'est exactement la distinction à documenter dans `ds/readme.md`.

### Test existant : `frontend/src/components/landing/HeroSection.test.tsx` (55 lignes)

Il existe déjà et teste probablement la classe de bordure. **Lis-le et mets-le à jour** — s'il asserte `border-ink-muted`, il passera au rouge.

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

- **Taille** : S
- **Modèle** : opus
- **Effort** : high
- **Priorité** : P2
- **Domaine** : design system / frontend (aucun pack `br-*` métier — cette issue ne touche aucune BR)

## Dépendances intra-sprint

- **Vague 1 — tu es le PREMIER.** Rien ne te précède.
- **#56 (vague 2) CONSOMME ton token** et touche le MÊME fichier `HeroSection.tsx`.
  → Ton commit doit être **autonome et mergeable seul**. Ne laisse aucun TODO en suspens.
  → Reste **strictement dans ton périmètre** : token + `@theme` + hero (1 classe + docstring) + `ds/readme.md` + test.
  → **N'entame AUCUNE décomposition de `HomePage.tsx`** : c'est le cœur de #56, tu créerais un conflit frontal.

## Designer

Non applicable — pas de nouveau composant visuel, pas de nouveau layout.
C'est un ajout de token + une substitution de classe sur un composant existant.

## Contraintes

- **Branche cible** : `sprint/48` (déjà checkout — NE change PAS de branche, ne crée PAS de worktree)
- **Répertoire de travail** : `/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/new-feature-2347-14cb9a`
  → **`cd` explicitement dans ce répertoire** au début de ta session et vérifie
    `git rev-parse --abbrev-ref HEAD` → doit répondre `sprint/48`.
    Si tu te retrouves sur une autre branche ou dans `/Users/herrh/VSProjects/MyTimeline` (dépôt principal), **ARRÊTE** et signale-le.
- **Commit** : 1 commit logique, message gitmoji en français (ex. `:lipstick: feat(ds): token --color-rule-emphasis pour bordures fonctionnelles AA`)
- **`git add` CIBLÉ sur tes fichiers uniquement — JAMAIS `git add -A` / `git add .`**
  (le working tree est partagé avec l'orchestrateur ; `-A` embarquerait des fichiers qui ne sont pas à toi)
- **Tests** : `./scripts/test-quiet.sh` (scope frontend) — OBLIGATOIRE avant de rendre la main
- **Code en anglais, docs/commentaires en français** (convention projet)
- **TypeScript strict**, zéro hex hardcodé dans les composants (tokens sémantiques uniquement)
- **Ne touche PAS** :
  - `frontend/src/components/pages/HomePage.tsx` (périmètre #56)
  - le mapping `--color-border: var(--color-rule);` dans `globals.css` (impact global)
  - `HeroSection.tsx:32` (`<Link passHref><Button>`, périmètre #295 → absorbé par #56)
  - `docs/memory/sprint-history.md` (le lead s'en charge)

## Vérification a11y attendue

Fournis dans ton rapport les **4 ratios finaux mesurés** de ton token :
`clair vs bg`, `clair vs surface`, `sombre vs bg`, `sombre vs surface`.
Les 4 doivent être **≥ 3.0:1**. Si l'un passe juste (< 3.2), dis-le explicitement.
Méthode : formule WCAG 2.1 sur sRGB linéarisé (le lead a utilisé un script Python, tu peux faire pareil).

## Livrable attendu (format strict, MAX 500 tokens, style caveman — pas de prose)

```
RETOUR :
- commits: [SHA1, ...]
- resume: <token retenu + valeurs clair/sombre + 4 ratios mesurés + fichiers touchés + tests>
- [MEMORY:*] signaux: <ex. [MEMORY:decision] valeur du tier bordure fonctionnelle ; [MEMORY:pitfall] si tu as trouvé un piège>
- recommandations suite: <RECOMMAND_* ou pitfall subtil, ou "aucune">
- RECOMMAND_FOLLOWUP: <si tu repères un travail hors périmètre NON-XS — décris-le + triage estimé + domaine>
- ABSORBED: <si tu as intégré une micro-découverte XS hors scope initial — liste-la>
- STATUS: COMPLETED en dernière ligne (ou STATUS: PARTIAL + BLOQUE_SUR: <raison>)
```

**La dernière ligne de ton retour doit être exactement `STATUS: COMPLETED` ou `STATUS: PARTIAL`.**
