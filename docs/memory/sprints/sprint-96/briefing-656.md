[BRIEFING ISSUE #656 — SPRINT 96 — VAGUE 3]

## Issue #656 — [BUG] La bannière d'erreur serveur recouvre le sélecteur de langue et la bascule de thème

### Contexte (énoncé GitHub, verbatim)
Mesuré au navigateur au Sprint 83 : quand l'API est injoignable, la bannière `network-banner`
(sticky, `z-index: 80`, 32 px) recouvre les **16 px supérieurs** du conteneur langue/thème des
pages auth (`absolute; top: 16px`).
Le centre et le bas des boutons restent cliquables (WCAG 2.4.11 AA tenu, pas 2.4.12 AAA).
Ce défaut est **antérieur au Sprint 83** pour le sélecteur de langue ; la bascule de thème de #642
en hérite. Il est **invisible pour les tests visuels, qui masquent cette bannière**.

### À faire (énoncé)
Repositionner le conteneur langue/thème des pages auth (ou la bannière `network-banner`) pour
éviter le recouvrement, en clarifiant si la cible est WCAG AA (déjà tenu) ou AAA.

### Critères d'acceptation (énoncé)
- [ ] Le conteneur langue/thème des pages auth n'est plus recouvert par `network-banner` quand elle
      est affichée
- [ ] Vérifié au navigateur, bannière d'erreur serveur active

### Origine
Clôture du Sprint 83 (PR #650) — `docs/memory/sprints/sprint-83/verification-ui-design-et-tests.md` §2b.

## Plan d'implémentation (architect, /sprint plan)
```yaml
issue_656:
  fichiers_cles:
    - "frontend/app/[locale]/login/page.tsx:71"
    - "frontend/app/[locale]/register/page.tsx:73"
    - "frontend/app/[locale]/forgot-password/page.tsx:63"
    - "frontend/app/[locale]/reset-password/page.tsx:183 (4 conteneurs absolute top-4 right-4 dupliqués)"
    - "frontend/src/components/shared/OfflineBanner.tsx:49 (mt-sysbanner--sticky)"
    - "frontend/app/[locale]/layout.tsx:78"
  couches_touchees: ["frontend-app-auth"]
  strategie_test: "E2E (bannière server-error forcée, boîtes disjointes)"
  risque_regression: "sprint-77-theme-visual masque la bannière : régression invisible aux références visuelles"
  possibly_done: false
  etat_reel_du_code: "4 copies du conteneur confirmées."
  ecart_enonce_code: "aucun (l'énoncé ne cite pas les 4 pages)"
```

## Triage
Taille: XS | Modèle: opus | Effort: high

## Deux points que TU dois trancher, explicitement, dans le done.md
1. **AA ou AAA ?** L'énoncé demande de clarifier la cible. Le recouvrement actuel tient WCAG 2.4.11
   (AA) et viole 2.4.12 (AAA). Écris la cible retenue ET son motif. Ne laisse pas la question
   ouverte : c'est un critère d'acceptation.
2. **Où corriger ?** Deux options, et elles n'ont pas la même portée :
   - déplacer le conteneur langue/thème des **4 pages auth** (correction locale, 4 copies à
     modifier — donc 4 endroits où la prochaine divergence se logera) ;
   - ou faire en sorte que la **bannière** ne recouvre rien (`OfflineBanner.tsx` / la règle
     `.mt-sysbanner--sticky`, ou un décalage au niveau de `app/[locale]/layout.tsx`) — correction
     unique, mais qui touche toutes les surfaces où la bannière apparaît, pas seulement l'auth.
   Mesure avant de choisir, et dis ce que l'autre option aurait cassé.
   ⚠ Si tu factorises les 4 conteneurs dupliqués en un composant, c'est un changement plus large
   que l'énoncé : annonce-le et garde-le dans un commit lisible.

## Le piège documenté de cette issue
Les références visuelles **masquent** `network-banner` (`sprint-77-theme-visual`). Donc :
- une suite de captures verte ne prouve RIEN sur ce défaut ;
- et réciproquement, ta correction pourrait casser une référence visuelle sans que le défaut
  d'origine y soit pour quelque chose.
Ta preuve doit être une **mesure de boîtes** (`boundingBox`) avec la bannière FORCÉE à l'écran,
pas une capture.

<!-- ===== cp-frontend ===== -->
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

<!-- ===== rules-jit/frontend ===== -->
<!-- PROVENANCE : copie Layer B de rules-jit/frontend.md du plugin ai-env 0.3.1 (Layer A).
     Source : ~/.claude/plugins/cache/edel-projects/ai-env/0.3.1/rules-jit/frontend.md
     Copie volontaire (et non symlink) : le cache plugin est hors dépôt et versionné 0.3.1.
     À re-differ contre la source à chaque bump du plugin. -->

---
globs: **/*.{ts,tsx}
---

> ⚠️ EXEMPLE Layer B (instance EdelWheels / Quarkus-Next). À RÉGÉNÉRER par /ai-env:setup pour ta stack. Voir REBUILD-PLAN.md §2.2.

# Regles frontend Next.js / TypeScript

## Conventions TypeScript
- TypeScript strict : zero `any`, zero `as` cast non justifie
- Server Components par defaut, `use client` uniquement si necessaire
- `"use client"` inutile sur fichiers type-only (pas de hooks React)
- TanStack Query cote client, fetch natif dans Server Components
- Forms : React Hook Form + Zod
- Style : Tailwind CSS + shadcn/ui UNIQUEMENT

## i18n (BR-17)
- TOUJOURS `useTranslations("namespace")` — jamais de strings FR hardcodees
- `useTranslations("ns")` separe par namespace (next-intl ne supporte pas `t("key", { ns })`)
- Zod schemas : factory function `createSchema(messages)` avec useMemo
- Module-level i18n : separer styles statiques + `buildConfig(t)` function

## Formatage suisse (BR-20)
- TOUJOURS `<locale-constant>` de `@/lib/utils` — jamais `"<locale-code>"` hardcode
- SSR : utiliser `formatSwissNumber()` (deterministe) — jamais `Intl.NumberFormat` inline (hydration mismatch)
- `Intl.DateTimeFormat(<locale-constant>, ...)` pour dates

## Montants (BR-23)
- Tout montant avec code devise ISO 4217
- Utiliser `currency` du type response, jamais hardcoder "CHF"

## Accessibilite
- Spinners : `role="status"` + `aria-label` + `<span class="sr-only">`
- Tables : `aria-label` sur `<table>`, `scope="col"` sur `<th>`
- Barres progression : `role="progressbar"` + `aria-valuenow/min/max`
- Boutons : `focus:ring-2 focus:ring-gold-primary`
- Elements interactifs custom (cards, tiles) : `role="button"` + `tabIndex={0}` + `onKeyDown` (Enter/Space) + `focus:ring-2`

## Charts Recharts
- TOUJOURS `useChartTheme()` — JAMAIS de hex inline
- Importer couleurs depuis `tokens.ts` ou `useChartTheme()`
- `Number(value)` pour Tooltip formatter

## Zod / DTO Synchronisation
Voir `.claude/rules-jit/zod-dto-sync.md` pour convention nullable/optional, overlays generes, et checklist obligatoire.
Resume : `.nullable()` pour nullable backend, `.optional()` pour absent, jamais `.nullish()` en code manuel.
- Endpoint pagine : TOUJOURS `paginatedSchema(itemSchema)`, jamais `schema.array()` — sinon `.filter()` crash sur l'objet `{items, total, page, size}`

## Design
- Consulter `la charte de design` et `les design tokens`
- Theme-aware : chaque composant fonctionne en clair ET sombre
- Mock data : format machine-readable, jamais strings FR hardcodees
- Animations : `duration-300` standard

## Tests — zéro warning stderr (MEMO-007)
Tout test livré doit produire un run vitest sans aucune ligne stderr.

- **MockImage** : exclure `priority`, `fill`, `quality`, `placeholder`, `blurDataURL`, `loader`, `unoptimized` du spread `...rest` vers `<img>`
- **`act()` warning** : render avec effets async → test `async` + `await waitFor(() => stableCondition)`
- **Logs d'erreur intentionnels** : `vi.spyOn(console, "error").mockImplementation(() => {})` + `mockRestore()` dans le test qui déclenche volontairement l'erreur (Zod fallback, validation failure, etc.)

## Schemas Zod — source de verite (DEC-029)
- Les schemas generes (`zod.gen.ts`) sont post-traites par `postprocess-zod.mjs` (bigint→number, nullable/optional fix)
- `.nullish()` est ACCEPTE dans le code genere (equivalent a `.nullable().optional()` en Zod 4)
- Tout nouveau schema DOIT re-exporter le genere sauf justification documentee (JSDoc `/** MANUAL — Reason: ... */`)
- Apres `npm run generate:api`, toujours verifier : `npx tsc --noEmit` + `npx vitest run`
- Version @hey-api/openapi-ts pinee (pas de ^) — tester avant chaque upgrade


## Execution tests — wrapper silencieux (optim tokens)

Ne JAMAIS lancer `npx vitest run`, `npx tsc --noEmit`, `npx playwright test` directement dans le contexte agent. L'output (le framework de test frontend verbose + TS errors + Playwright traces) = 20-60 KB par run, multiplies par les iterations de debug.

**Usage obligatoire** :
```bash
./scripts/test-quiet.sh frontend       # build + Vitest + tsc --noEmit + next lint (#434)
./scripts/test-quiet.sh frontend-unit  # Vitest SEUL — un vert ici ne dit RIEN du build
./scripts/test-quiet.sh e2e            # Playwright (reset DB inclus)
./scripts/test-quiet.sh all            # Backend puis frontend complet (`unit` = backend SEUL)
```

wrapper capture tout dans `/tmp/<project-lower>-tests-<timestamp>.log` et renvoie :
- Recap le framework de test frontend (`Test Files N failed | N passed`, `Tests N passed`)
- Top 10 fichiers `FAIL src/...`
- Compte d'erreurs TS + 5 premieres
- Playwright : `N passed / N failed / N flaky` + top 10 echecs

Pour debug precis d'un test frontend, lire le log `/tmp/<project-lower>-tests-*.log` cible (Read avec `offset`/`limit`), ne JAMAIS re-run `npx vitest run <fichier>` dans le contexte.

**Pour suites lourdes (Playwright full + vitest + tsc)** : deleguer a l'agent `test-runner` (Haiku) via Agent tool — il isole l'output et retourne <=500 tokens au lead.

Reference : audit tokens 2026-04-24 — verbosite tests = cause #2 saturation contexte apres reviews multi-agent.

<!-- ===== pit-frontend (extrait ciblé) ===== -->
## PIT-S92-002 — Hook `warn-test-delegation` : `SKIP_DELEGATION=1` requis même pour `playwright test --list` ; `npx eslint` cassé
Le hook intercepte toute ligne `npx playwright test`, `--list` compris : un agent briefé pour « vérifier le chargement de sa spec » est bloqué. Et `npx eslint <fichier>` échoue dans ce dépôt (config ESLint 9) : prescrire `npx next lint --file <f>`. Les deux commandes sont à écrire telles quelles dans les gabarits de briefing. (Sprint 92 #621)


## PIT-S92-003 — `pointer-events:none` sur un toast interdit toute pause au survol ; `auto` le fait recouvrir les boutons de fermeture
Posé pour « ne gêner aucun clic », `none` rend la pause au survol de react-hot-toast inopérante (WCAG 2.2.1) ; la piste « `auto` au seul `:hover` » est irréalisable, un élément en `none` ne reçoit jamais le survol. Repassée en `auto`, la carte posée à 16 px du haut recouvrait la croix des drawers (y 12–56) et le hamburger mobile (y 6–50). Dimensionner le décalage d'un élément flottant qui capte le pointeur sur les hauteurs MESURÉES des en-têtes (ici 72 px), pas sur un pas d'espacement du DS ; react-hot-toast ne gère pas le focus, seule API publique de pause : `useToaster().handlers`. (Sprint 92 #621, revue Designer)


## PIT-S93-004 — `playwright test --list` exige les variables d'environnement, et RTK résume sa sortie
`playwright.config.ts` réclame `NEXT_PUBLIC_API_URL` et `E2E_API_PROXY_TARGET` **même pour une simple collecte** : sans elles `--list` échoue avec un message qui parle du serveur `next dev` et oriente vers un faux diagnostic. Et sous le hook RTK, `--list` est résumé en « PASS (0) FAIL (0) » : passer par `rtk proxy` pour voir la liste réelle. `SKIP_DELEGATION=1` reste requis même pour `--list`. (Sprint 93 #711)


## PIT-S93-008 — `grep` sous le hook RTK peut rendre « 0 résultat » sur un fichier qui contient la chaîne
Le contrôle coverage-E2E du lead a rendu **0 testid** sur un diff de 60 Ko non tronqué, puis **7** avec `/usr/bin/grep`. Le piège RTK connu portait sur les gros diffs, `vitest` et `prettier --check` ; il vaut aussi pour un `grep`/`wc` d'analyse — et `rtk proxy` devant la commande qui ÉCRIT le fichier n'y change rien, c'est le `grep` suivant qui ment. Pour toute MESURE, appeler le binaire par chemin absolu. (Sprint 93, lead)


## PIT-S95-001 — Un `next build` pendant qu'un `next start` sert le même `.next` : toutes les pages rendent 200, mais l'hydratation est morte
`test-quiet.sh frontend` reconstruit `.next` ; si un `next start` sert la même arborescence, le symptôme ne ressemble PAS à une panne de build : les pages rendent 200, et c'est le projet `setup` Playwright qui échoue sur `register-form` introuvable — ce qui se diagnostique spontanément en rate-limit ou en CORS. Extension du couple `next dev` de [[PIT-S81]] au couple build/start. Remède : rebuild + restart, et ne jamais lancer `test-quiet.sh` pendant un run E2E. (Sprint 95, #714)


## PIT-S95-003 — Sur macOS les captures visuelles ne rougissent plus, elles VERDISSENT à tort (inversion de [[PIT-S82]])
Seules les références `*-chromium-linux.png` sont suivies. Sur macOS Playwright cherche des `-darwin` absentes — et comme `updateSnapshots: 'missing'` est désormais le DÉFAUT, il les CRÉE et fait PASSER les tests au lieu d'échouer. Au S95 la suite a rendu `422 passed / 0 failed` dont **10 « passed » vides** (portée réelle : 412). Le rapport ne le signale nulle part ; le seul indice est `git status` (10 PNG `-darwin` non suivis apparus après le run). Le constat mémorisé au S82 comme « 10 faux ROUGES » décrit donc l'ANCIEN symptôme. Remède : `git status --porcelain | /usr/bin/grep darwin` AVANT de conclure d'un vert, supprimer les PNG générés, retrancher ces tests du décompte annoncé. (Sprint 95, lead)


## PIT-S95-007 — Une affirmation géométrique écrite sans oracle a survécu 3 sprints avec 3 chiffres faux, et un arbitrage s'est appuyé dessus
La JSDoc de `toaster.tsx` (S92) situait la croix du `ProductDrawer` « à ≈84–100px à 844px quand le formulaire remplit la sheet ». Mesure S95 : à 390×844 le contenu (672px) n'atteint JAMAIS 92vh (776px), le recouvrement est **nul**, et le cas n'existe qu'en dessous de ≈730px. Deux autres cotes étaient fausses (carte 65px et non ≈46px ; haut de sheet 171px et non ≈68px). L'arbitrage Designer de #714 s'était appuyé sur ces chiffres. Toute affirmation géométrique consignée dans un commentaire doit citer la spec qui la mesure. (Sprint 95, #714)

---


<!-- ===== pit- garde-fous d'exécution (lead, Sprint 96) ===== -->
## GF-1 — Tu travailles dans un WORKTREE
Répertoire de travail IMPOSÉ : `/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/amazing-rubin-93b16e`.
Tout `cd` implicite vers `~/VSProjects/MyTimeline` produit un faux KO (tu lirais le code de `dev`).
Premier réflexe, à exécuter et à recopier dans ton done.md :
```
cd /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/amazing-rubin-93b16e
git rev-parse --abbrev-ref HEAD   # doit rendre claude/sprint-96-start-b98611
```

## GF-2 — RTK réécrit tes commandes
Le hook RTK réécrit `git`, `grep`, `prettier`… `grep` sous RTK peut rendre « 0 résultat » sur un
fichier qui CONTIENT la chaîne, et `git diff` rend ~vide.
→ Pour toute MESURE ou tout comptage : `/usr/bin/grep` en chemin absolu.
→ Pour un diff : `rtk proxy git diff` ou `git diff > /tmp/d.txt` puis lire le fichier.

## GF-3 — Commits : `git add` CIBLÉ, jamais `-A`
Le working tree est PARTAGÉ avec les autres agents de la vague. `git add -A` volerait leurs
fichiers. Lister les chemins un par un, en dur (pas `$F` : sous zsh `git add -- $F` est inerte).
1 commit logique, message gitmoji en français, terminé par :
`Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

## GF-4 — Lancer les tests
- Unitaires / lint / build frontend : `./scripts/test-quiet.sh frontend`
  ⚠ `test-quiet.sh` RECONSTRUIT `.next`. Ne JAMAIS le lancer pendant qu'un run E2E tourne
  (PIT-S95-001) et ne jamais le lancer si un autre agent de la vague tient le stack E2E.
  ⚠ `test-quiet.sh` n'exécute PAS `format:check` : lancer `npx prettier --check <fichiers>`
  séparément (et ne pas croire sa sortie sous RTK — utiliser `npx` en direct).
- E2E : SEUL l'agent désigné « propriétaire Playwright » dans son briefing monte le stack.
  Recette : `frontend/playwright.config.ts` (en-tête, 2 chemins documentés) +
  `docs/memory/sprints/sprint-47/e2e-local-runbook.md`.
  Le hook `warn-test-delegation` intercepte toute ligne `npx playwright test`, `--list` compris :
  préfixer `SKIP_DELEGATION=1` (PIT-S92-002). `npx eslint` est cassé ici → `npx next lint --file <f>`.

## GF-5 — Captures visuelles sur macOS : un vert peut être VIDE
Seules les références `*-chromium-linux.png` sont suivies. Sur macOS, `updateSnapshots: 'missing'`
CRÉE les `-darwin` absentes et fait PASSER le test sans rien comparer (PIT-S95-003).
→ Après tout run touchant une spec visuelle : `git status --porcelain | /usr/bin/grep darwin`.
S'il y a des PNG `-darwin` : les SUPPRIMER, et retrancher ces tests du décompte annoncé.
Ne jamais committer un PNG `-darwin`. Les références Linux se régénèrent en CI, pas ici.

## GF-6 — Ne pas surestimer ta preuve
« La CI est verte » ne prouve pas que la page est correcte ; « la spec cite le testid » ne prouve
pas qu'elle passe ; un test de géométrie sous jsdom ne prouve RIEN (jsdom ne met pas en page).
Toute affirmation géométrique que tu écris (px, recouvrement, hauteur) doit citer la commande ou
la spec qui l'a MESURÉE. Si tu n'as pas mesuré, écris « non vérifié ».

<!-- ===== tail — contraintes de la vague ===== -->
## Tu es PROPRIÉTAIRE PLAYWRIGHT de la vague 3 — et la pile est DÉJÀ DEBOUT
L'agent #702 t'a laissé la pile montée, vérifiée verte il y a quelques minutes :
- backend en conteneur sur `:8085` (projet compose `amazingrubin93b16e`)
- `next start` (build de PRODUCTION) sur `:3000`
- oracle vérifié par le lead à l'instant : `/api/auth/me` = **401**, `/fr/login` = **200**

⚠ **C'est un `next start`, pas un `next dev` : il sert un build FIGÉ.** Tes modifications de
`app/[locale]/*/page.tsx` ne seront PAS prises en compte tant que tu n'auras pas reconstruit. Deux
chemins, choisis-en un et dis lequel :
  (a) `cd frontend && npm run build` puis redémarrer le `next start` — attention, un `next build`
      pendant qu'un `next start` sert le même `.next` rend toutes les pages en 200 avec une
      hydratation morte (PIT-S95-001) : **arrête le serveur d'abord**, rebuild, redémarre.
  (b) arrêter le `next start` et lancer un `next dev` webpack à la place (recette 2 de l'en-tête de
      `frontend/playwright.config.ts` — PAS `npm run dev`, qui force `--turbopack` et casse en
      worktree). Rechargement à chaud, mais certaines specs rougissent à tort sans préchargement
      de route sous `next dev`.
Après bascule, refais l'oracle 401/200 AVANT toute conclusion sur un rouge.
Quand tu as fini : démonte la pile (conteneurs, volumes, port 3000) et dis-le.

## Forcer la bannière
`network-banner` n'apparaît que quand l'API est injoignable. Pour la faire apparaître de façon
déterministe dans une spec, le motif du dépôt est `page.route(...)` (interception réseau) — vois
comment `sprint-95-toast-overlap.spec.ts` et les specs de la famille `landing-*` arment leurs
conditions. Une spec NEUVE n'a pas de session : si tu en crées une, `test.use({ storageState })`
est obligatoire — mais les pages auth sont publiques, donc vérifie d'abord si tu en as besoin.

## Dépendances intra-sprint — ce qui est DÉJÀ livré sur cette branche
- `14363a50` (#665) : grille 6×2 de la palette, cibles 44 px en mobile
- `237a89f6` (#633) : bouton retour des réglages mobiles à 44 px (+ `3ef041a1`, reformatage prettier)
- `efe88983` (#702) : stabilisation de `sprint-84-palette.spec.ts` (attente de restitution de focus
  du `Select` Radix). **Aucune ligne de production modifiée par #702.**
Ne touche PAS : `frontend/src/components/ui/palette-color-picker.tsx`,
`frontend/src/components/settings/**`, `frontend/e2e/sprint-84-palette.spec.ts`,
`frontend/e2e/sprint-96-palette-geometry.spec.ts`, `frontend/e2e/settings-mobile.spec.ts`.

## Specs à rejouer (liste grep à ÉTABLIR toi-même, pas à deviner)
Avant de conclure, établis la liste COMPLÈTE des specs qui citent les surfaces que tu touches :
```
/usr/bin/grep -rln "network-banner\|mt-sysbanner\|language-selector\|theme-toggle" frontend/e2e/
```
Rejoue-les toutes. Ne choisis pas 3 specs à la main : au S86, 4 specs choisies sur 12 qui citaient
la surface ont laissé passer 8 régressions.
`sprint-77-theme-visual` est VISUELLE : relis GF-5 et ne committe aucun PNG `-darwin`.

## Designer
Un déplacement de contrôles d'en-tête sur 4 pages publiques est un changement PERÇU. Si ta
correction déplace visiblement le sélecteur de langue ou la bascule de thème hors bannière (c.-à-d.
en permanence, pas seulement quand la bannière est là), pose `RECOMMAND_UI_DESIGN` et décris le
décalage en pixels — ne tranche pas seul une question d'esthétique d'en-tête.

## Contraintes
- Branche : `claude/sprint-96-start-b98611` (déjà checkout, worktree — cf. GF-1)
- 1 commit logique, gitmoji FR, `git add` ciblé (GF-3)
- Vérification format OBLIGATOIRE avec le binaire DIRECT, sur le dépôt entier :
  `cd frontend && ./node_modules/.bin/prettier --check .`
  ⚠ `npx prettier --check` MENT sous RTK — constaté DEUX fois sur ce sprint (un agent, puis le
  lead), et `test-quiet.sh` n'exécute pas `format:check` : la CI aurait rougi.
- Code en anglais, docs/commentaires en français ; TS strict ; i18n next-intl

## Livrable attendu
1. `docs/memory/sprints/sprint-96/issue-656-done.md` contenant :
   - `## Décision AA/AAA` et `## Où j'ai corrigé et pourquoi` (les deux points ci-dessus, tranchés)
   - `## Mesures` — boîtes AVANT et APRÈS, bannière forcée, avec la commande/spec qui les produit
   - `## Fichiers modifiés` / `## Tests` (liste grep complète + passed/failed RÉELS)
   - `## Recommandations suite` — SECTION OBLIGATOIRE : `RECOMMAND_*` ou négation explicite
   - Signaux `[MEMORY:pitfall]` / `[MEMORY:pattern]` / `[MEMORY:decision]` ÉCRITS DANS CE FICHIER
   - Dernière ligne EXACTEMENT : `STATUS: COMPLETED` (ou `STATUS: PARTIAL` + `## BLOQUE_SUR`)
2. Message de retour 500 tokens MAX, télégraphique : SHA, décision AA/AAA, mesures avant/après,
   état de la pile E2E (démontée ou non), pointeur vers le done.md.
