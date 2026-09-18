[BRIEFING CORRECTION DE REVIEW — SPRINT 70]

## Objet
Corriger le **seul MAJEUR** remonté par la review batch du Sprint 70. Rien d'autre.
Ce n'est pas une issue : c'est un correctif ciblé sur du code livré dans ce même sprint.

## Le défaut (vérifié par le lead, pas supposé)

`previewBlock` est **une seule variable JSX** (`frontend/src/components/EventEditForm.tsx:343`)
rendue à DEUX endroits :
- **portalisée** dans le nœud `.mt-drawer__preview` quand `previewPortalNode` est fourni
  (uniquement le drawer de création `>= lg`, livré par #326) ;
- **en flux** sous le champ Couleur dans tous les autres cas.

L'issue #325 a changé la classe du libellé « Aperçu » **sur la variable** :

```
- <div className="text-ink mb-2 text-sm">{tDetails('preview')}</div>
+ <div className="mt-drawer__label mb-2">{tDetails('preview')}</div>
```

Sa justification, écrite en commentaire au-dessus (`EventEditForm.tsx:344-352`), est que
« depuis que #326 a fait remonter l'aperçu au-dessus du pli, ce libellé jouxtait le titre du
drawer (19 px display) et le concurrençait ». **Cette collision n'existe QUE sur la surface
épinglée.** Le changement s'applique pourtant aussi à **4 surfaces** où il n'a aucun mandat :

| Surface | Chemin | Concernée ? |
|---|---|---|
| Drawer de création `>= lg` | portalisé | ✅ légitime — c'est la cible de #325 |
| `EventDrawer` (édition) | en flux | ❌ changement non voulu |
| `TimelineEditHost` (édition) | en flux | ❌ changement non voulu |
| `ConflictDialog` (édition) | en flux | ❌ changement non voulu |
| `NewEventDrawer` variante **bottom sheet** (`< 1024 px`) | en flux | ❌ changement non voulu — la sheet a été explicitement laissée hors périmètre par #326 |

Écart typographique : 17 px Archivo → mono 10 px capitales `ink-muted`. **Aucun test unitaire
ni E2E ne couvre le libellé sur ces 4 surfaces**, donc le changement est passé silencieusement.

Note : la contrainte de fichiers du sprint a bien été respectée (`EventDrawer.tsx`,
`TimelineEditHost.tsx`, `ConflictDialog.tsx` sont absents du diff). C'est le **comportement**
qui déborde, pas le diff — une garde par liste de fichiers ne pouvait pas l'attraper.

## Ce qu'on te demande

1. **Rendre la classe du libellé conditionnelle au chemin de rendu.** Épinglé →
   `.mt-drawer__label mb-2` (le style que le DS réserve à un libellé de bloc, et le correctif
   voulu par #325). En flux → **la classe d'origine**, `text-ink mb-2 text-sm`, strictement
   telle qu'avant ce sprint.
   Contrainte : **ne duplique pas le markup du bloc d'aperçu**. Tout le sprint repose sur
   « une seule variable, deux points de rendu, zéro testid en double » — une seconde copie du
   bloc réintroduirait exactement ce que #326 a évité. Une classe calculée (via `cn`, déjà
   importé) suffit.
2. **Couvrir le libellé par un test.** Au minimum : un test unitaire qui prouve que **sans**
   `previewPortalNode` le libellé porte la classe historique, et **avec** il porte
   `.mt-drawer__label`. C'est précisément le trou qui a laissé passer le défaut.
3. **Ne touche à RIEN d'autre.** Pas de refactor opportuniste, pas de correction des
   commentaires `BR-EVE-009` (voir ci-dessous), pas d'extension du sticky aux surfaces
   d'édition.

## Pièges connus, vérifiés pendant ce sprint

- ⚠ `BR-EVE-009` est le **modèle couleur event** (`.ai-env/context-packs/br-events.md:92`),
  PAS la perf de l'aperçu. Deux commentaires du code (`EventEditForm.tsx:174` et `:289`)
  propagent une mauvaise attribution : **laisse-les intacts**, c'est délibéré (renommer une BR
  est une décision, pas un nettoyage), et c'est déjà tracé en follow-up.
- ⚠ `text-sm` rend **17 px** ici, pas 14 : l'échelle du DS Graphite écrase celle de Tailwind
  (`PIT-S49-002`). Ne « corrige » pas cette valeur, elle est l'état d'origine à restaurer.
- ⚠ Une assertion sur `text-*` peut apparier une valeur de `line-height` au lieu de la taille
  visée — vérifie ce que ton test mesure réellement.

## Triage
Taille: XS
Modele: opus
Effort: high

## Context-pack domaine — 1 pack inline, le reste par pointeur

Briefing complet committé : `docs/memory/sprints/sprint-70/briefing-fix-review.md`.
Correctif XS et très ciblé — la lecture obligatoire est courte :

1. `frontend/src/components/EventEditForm.tsx` — le fichier à corriger, en entier autour de
   `previewBlock` (l.330-380) ET des deux points de rendu (cherche `previewPortalNode`).
2. `frontend/src/components/events/NewEventDrawer.tsx` — qui fournit la prop, et où la
   variante bottom sheet est décidée (`isCompact`).
3. `.ai-env/context-packs/pit-frontend.md` — cherche `PIT-S49-002` (échelle DS vs Tailwind),
   `text-`, `line-height`, `jsdom`.
4. Les 3 autres consommateurs, en LECTURE SEULE, pour constater quelle classe ils recevront :
   `EventDrawer`, `TimelineEditHost`, `ConflictDialog` (ne les modifie pas).

⚠ Ce pointeur n'est pas contraignant techniquement : c'est TOI qui garantis la lecture. D'où
la ligne `fichiers de contexte lus` exigée dans ton livrable, avec ancrage vérifiable. Elle
SERA auditée — celles des deux vagues précédentes l'ont été, et c'est ainsi qu'on a su qu'un
agent n'avait pas ouvert deux fichiers pointés.

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

## Contraintes

### Environnement — À LIRE AVANT TOUTE COMMANDE
- **Worktree git** :
  `/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/traitement-s-xs-parallele-d0ae59`
  **`cd` explicitement dedans au début de CHAQUE commande bash.** Un subagent qui défaut-`cwd`
  sur le dépôt principal produit de faux KO (fichier « introuvable », diff vide).
  Garde-fou : `git rev-parse HEAD` doit rendre un descendant de `647e343`.
- Branche : `claude/sprint-70-start-b946cb`. **Pas de branche `sprint/70`.**
- `frontend/node_modules` : présent.
- Serveurs laissés tournants par les vagues précédentes : `next dev` sur `:3100`, backend
  profil `e2e` sur `:8086`. Vérifie (`lsof -ti:3100`) avant de relancer, et **dis dans ton
  retour** ce que tu as démarré ou arrêté.
- ⚠ **RTK (proxy CLI de ce poste) avale ou tronque des sorties** : `git diff`, `git log`,
  `playwright test`, `vitest --reporter=verbose`, et il a affiché « All files formatted » avec
  **exit 1** sur `prettier --check` (`PIT-S45-003`). **Préfixe par `rtk proxy`** dès qu'une
  sortie paraît vide, tronquée ou incohérente, et **lis toujours le code de sortie**
  (`echo "exit=$?"`), jamais seulement le texte. `git rev-parse` reste fiable.

### Code
- **1 commit logique**, message gitmoji en **français**, qui dit qu'il corrige un MAJEUR de
  review du Sprint 70 (pas une issue).
- `git add` **CIBLÉ** — **jamais `git add -A`** (working tree partagé).
- Code en anglais, commentaires/docs en français.
- Zéro couleur littérale, zéro z-index littéral : tokens DS uniquement.
- Le commentaire de `#325` au-dessus du libellé (`EventEditForm.tsx:344-352`) **justifie un
  changement qui n'est désormais plus global** : mets-le à jour pour dire que la reclassification
  ne vaut que sur le chemin épinglé, et pourquoi. Un commentaire qui décrit l'ancien
  comportement est un piège pour le prochain lecteur.
- Ne touche PAS : `backend/**`, `db/migration/**`, `EventDrawer*`, `TimelineEditHost*`,
  `ConflictDialog*`, `EventPreviewTimeline.tsx`, `timeline.css`.

### Tests — OBLIGATOIRE
- Lance au minimum les suites unitaires des fichiers touchés + `tsc --noEmit`.
- Si tu ajoutes/renommes un `data-testid`, il DOIT être cité dans une spec de `frontend/e2e/`.
- ⚠ **Un test qui ne peut pas échouer ne prouve rien.** Avant de conclure, **mute** ton
  correctif (remets la classe inconditionnelle) et vérifie que ton nouveau test **VIRE AU
  ROUGE**. Les deux vagues précédentes de ce sprint l'ont fait ; on n'attend pas moins ici.
- ⚠ `jsdom` ne met rien en page : il ne prouve QUE la présence de la classe, pas son rendu.
  C'est suffisant ici (l'enjeu est « quelle classe est appliquée »), mais ne prétends pas
  avoir prouvé une taille en pixels avec un test unitaire.

## Livrable attendu (format strict, MAX 400 tokens, style caveman — pas de prose)

RETOUR :
- commits: [SHA]
- correctif: <ce qui a changé, fichier:ligne>
- surfaces_verifiees: <pour chacune des 5 surfaces du tableau, quelle classe le libellé porte
  après ton correctif, et COMMENT tu l'as établi (test, lecture de code, mesure)>
- preuve_que_le_test_sait_dire_NON: <la mutation faite, ce qui a rougi>
- **fichiers de contexte lus:** <chemins réellement ouverts + ancrage vérifiable pour chacun
  (numéro de ligne, identifiant, citation courte)>. **Obligatoire, sera auditée.** Si tu n'as
  pas lu un fichier pointé, écris-le — un aveu est exploitable, une affirmation fausse ne l'est pas.
- tests: <commandes + résultat chiffré + exit code ; « non lancé » si non lancé>
- serveurs: <trouvé tournant / démarré / arrêté>
- recommandations suite: <RECOMMAND_* OU négation explicite>
- STATUS: COMPLETED en dernière ligne (ou STATUS: PARTIAL + BLOQUE_SUR)
