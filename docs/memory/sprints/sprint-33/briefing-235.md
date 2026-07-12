[BRIEFING ISSUE #235]

## Issue
[BUG] Aligner les locales de app/[locale]/layout.tsx (fr,en) avec le middleware (fr,en,es,de)

### Contexte
`frontend/app/[locale]/layout.tsx` n'autorise que 2 langues (`const locales = ['fr', 'en']`)
alors que `frontend/middleware.ts` en autorise 4 (`['fr', 'en', 'es', 'de']`). Conséquence :
une URL `/es/...` ou `/de/...` passe le middleware mais le layout `notFound()` → **404**.
Le Sprint 26 a livré les traductions es/de, actuellement inutilisables en pratique.

### État réel du code (vérifié à l'ouverture du sprint)
- `frontend/middleware.ts` (ligne 6) : `locales: ['fr', 'en', 'es', 'de']`.
- `frontend/app/[locale]/layout.tsx` (ligne 8) : `const locales = ['fr', 'en']` → seule liste hardcodée divergente.
- `frontend/i18n.ts` : `loadMessages(locale)` lit `public/locales/<locale>/*.json` (fallback `{}` si dossier absent).
- **Parité traductions es/de : DÉJÀ COMPLÈTE.** Les 4 locales ont les 11 mêmes namespaces
  (`auth, categories, common, dashboard, errors, legal, network, products, register, settings, validation`)
  et un nombre de clés quasi identique (fr ~823, en/es/de ~824). L'audit de complétude
  attendu par l'issue est donc essentiellement **déjà satisfait** — reste à VÉRIFIER (pas à traduire massivement).

### À faire — décision tranchée par l'architect : OPTION 1 (aligner sur 4 langues)
La directive MVP (i18n 4 langues = feature annoncée) impose d'activer es/de partout, PAS de retirer les fichiers.
1. Extraire une **source de vérité unique** des locales supportées (ex: `frontend/src/i18n/locales.ts`
   exportant `export const SUPPORTED_LOCALES = ['fr', 'en', 'es', 'de'] as const;` + type `Locale`).
2. Importer cette constante dans `layout.tsx` ET `middleware.ts` (remplacer les 2 tableaux hardcodés).
3. Vérifier (audit léger) qu'aucune clé n'est manquante en es/de vs fr — compléter ponctuellement si un trou est trouvé (diff des clés par namespace). Ne PAS retraduire ce qui existe.
4. Vérifier `generateStaticParams` cohérent (retourne bien les 4 locales).

### Critères d'acceptation
- [ ] Décision documentée : Option 1 (aligner sur 4) — justif : i18n 4 langues = feature MVP annoncée.
- [ ] Une **liste de langues supportées unique** est importée par le middleware ET le layout.
- [ ] `layout.tsx` reconnaît `['fr', 'en', 'es', 'de']` (plus de 404 sur /es, /de).
- [ ] Audit complétude es/de : aucune clé manquante vs fr (ou trous comblés).
- [ ] Test (e2e Playwright de préférence) confirmant que `/es/*` et `/de/*` répondent 200 (pas 404).

## Plan d'implementation (architect, /sprint plan)
issue_235:
  fichiers_cles:
    - "frontend/app/[locale]/layout.tsx"
    - "frontend/middleware.ts"
    - "frontend/src/i18n/locales.ts (NOUVEAU — source de vérité) OU emplacement conventionnel du repo"
  couches_touchees: ["frontend/routing", "frontend/i18n"]
  strategie_test: "e2e Playwright /es et /de → 200 (pas 404) ; test présence clés es/de ; generateStaticParams cohérent"
  decision: "aligner-sur-4 (activer es/de partout) — directive MVP"
  ordre_ecriture: "extraire SUPPORTED_LOCALES → l'importer dans layout.tsx + middleware.ts → audit clés es/de manquantes (diff par namespace) → compléter si trou → e2e /es /de"
  zod_dto_sync: "NON"

**IMPORTANT** : place la constante `SUPPORTED_LOCALES` à un emplacement conventionnel du repo
(inspecte l'arbo `frontend/src/` — s'il existe déjà un dossier i18n/config partagé, l'y mettre).
Le point clé : UN SEUL tableau, importé par les deux fichiers.

## Code source actuel (inline — état exact au démarrage du sprint, HEAD 4f128de)

### `frontend/app/[locale]/layout.tsx` (extrait pertinent)
```tsx
import React, { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { loadMessages } from '../../i18n'
import { NetworkStatusProvider } from '@/contexts/NetworkStatusContext'
import { OfflineBanner } from '@/components/shared/OfflineBanner'

const locales = ['fr', 'en']   // <-- DIVERGENCE : à aligner sur les 4 du middleware

export function generateStaticParams() {
  return locales.map(locale => ({ locale }))
}

export default async function LocaleLayout({ children, params }: {
  children: ReactNode
  params: Promise<{ locale: string }>;
}) {
  const locale = (await params).locale || 'fr'
  if (!locales.includes(locale)) {
    notFound()   // <-- source du 404 sur /es et /de
  }
  const messages = await loadMessages(locale)
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <NetworkStatusProvider>
        <OfflineBanner />
        {children}
      </NetworkStatusProvider>
    </NextIntlClientProvider>
  )
}
```

### `frontend/middleware.ts` (extrait)
```ts
import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  // Liste des langues supportées
  locales: ['fr', 'en', 'es', 'de'],   // <-- SOURCE DE VÉRITÉ ACTUELLE (mais dupliquée)
  defaultLocale: 'fr',
  // Préfixer tous les chemins avec la locale
  // ...
});

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)']
};
```

### `frontend/i18n.ts` (loader — pour info, ne PAS le casser)
```ts
export async function loadMessages(locale: string) {
  const localeDir = path.join(process.cwd(), 'public', 'locales', locale);
  if (!fs.existsSync(localeDir)) return {};   // fallback {} si dossier locale absent
  const files = fs.readdirSync(localeDir).filter(f => f.endsWith('.json'));
  const messages: Record<string, Record<string, unknown>> = {};
  for (const file of files) {
    const namespace = file.replace('.json', '');
    messages[namespace] = JSON.parse(fs.readFileSync(path.join(localeDir, file), 'utf8'));
  }
  return messages;
}
```
`loadMessages` lit dynamiquement le dossier de la locale — il n'a PAS de liste hardcodée, donc
il fonctionnera automatiquement pour es/de une fois le layout aligné. Rien à changer ici.

**Grep de contrôle** : le SEUL tableau de locales hardcodé en dehors de middleware.ts est
`layout.tsx` (vérifié : `grep -rnE "\['fr',\s*'en'\]" frontend --include=*.ts*` → layout.tsx uniquement).
Après extraction de `SUPPORTED_LOCALES`, les deux fichiers doivent l'importer.

## Triage
Taille: M
Modele: opus
Effort: high

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
- Tests : **Vitest `^2.1.9`** + **RTL `^16`** + jest-dom (jsdom). **Playwright `^1.61`** configuré mais `frontend/e2e/` = `.gitkeep` VIDE → aucun E2E réel. Storybook 8 présent.

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
- ⚠ `frontend/e2e/` VIDE : `npm run test:e2e` sort 0 sans spec. Aucun parcours E2E couvert — ne pas présumer de garde-fou Playwright.

## Références

- `docs/memory/decisions.md` (DEC-S9-002 : PII hors localStorage), `docs/memory/patterns.md`, `docs/memory/pitfalls.md` (PIT-S8-005, PAT-S8-004).
- `frontend/src/styles/ds/readme.md` (charte Graphite), `ds/a11y-audit.md`.

<!-- CACHE_CONTROL_BREAKPOINT -->

## Dependances intra-sprint
- Aucune dépendance sur #59 (fichiers disjoints). #59 travaille dans `settings/export`, PAS dans layout/middleware.
- Coordination messages i18n : #59 ajoute des clés `export.*` dans les 4 langues. Toi tu VÉRIFIES la
  complétude globale — si tu combles des trous, ne touche PAS aux clés `export.*` (chasse gardée #59).
  En pratique fichiers disjoints, conflit improbable, mais reste en `git add` ciblé.

## Designer
Non applicable (aucun changement visuel — routing/i18n uniquement).

## Contraintes
- Branche cible : sprint/33 (déjà checkout — NE PAS changer de branche).
- Vérifier `git rev-parse HEAD` == 4f128debe13c67862ff9739c8a53c453602e4b7d au démarrage (garde-fou worktree partagé).
- Commit : 1 commit logique gitmoji français (ex: `:globe_with_meridians: #235 aligner locales layout sur middleware (fix 404 es/de) + source unique`).
- `git add` CIBLÉ sur tes fichiers uniquement (JAMAIS `git add -A` / `git add .`) — working tree partagé avec #59 en parallèle.
- Tests inline via `./scripts/test-quiet.sh <scope>` (OBLIGATOIRE avant de rendre). E2E /es /de si le harness Playwright est configuré ; sinon test unitaire de la constante + note RECOMMAND_FOLLOWUP pour l'e2e.
- Ne PAS toucher : `frontend/app/[locale]/settings/**`, `frontend/src/services/export*`, clés i18n `export.*` (chasse gardée de #59).
- Décision Option 1 (aligner sur 4) déjà tranchée par l'architect — ne pas re-débattre, l'appliquer.

## Livrable attendu (format strict, MAX 500 tokens caveman)
RETOUR :
- commits: [SHA1, ...]
- resume: <objectif + fichiers clés + source de vérité créée + résultat audit clés es/de + tests>
- [MEMORY:*] signaux: <ex [MEMORY:pitfall] si divergence locale récurrente, [MEMORY:decision] Option 1>
- recommandations suite: <RECOMMAND_* ou RECOMMAND_FOLLOWUP si e2e non couvert>
- STATUS: COMPLETED en dernière ligne (ou STATUS: PARTIAL + BLOQUE_SUR)
