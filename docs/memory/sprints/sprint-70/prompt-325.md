[BRIEFING ISSUE #325]

## Issue
[DESIGN] Vérifier le rendu visuel de la mini-frise d'aperçu (clair/sombre, handoff §6)

## Contexte

Follow-up détecté pendant le Sprint 46 (issue #315, PR #324).
Source : `docs/memory/sprints/sprint-46/issue-315-done.md`

## Description

L'issue #315 a livré la mini-frise de l'aperçu live du drawer de création (`EventPreviewTimeline.tsx`) :
règle temporelle, marqueur TODAY, barre pleine, connecteur pointillé, occurrence fantôme, légende.

**Aucun rendu visuel n'a été vérifié.** Le thème clair et le thème sombre reposent uniquement sur les
tokens du design system, sans inspection navigateur. La conformité au handoff `docs/design/graphite-handoff.md` §6
n'a donc jamais été constatée de visu — seulement déduite de l'usage des tokens.

## À faire

- Inspecter le rendu de l'aperçu en thème clair ET sombre
- Confronter au handoff §6 (règle + TODAY, connecteur pointillé, occurrence fantôme, légende « prochaine occurrence »)
- Vérifier la variante `.mt-evt--preview` (curseur/hover neutralisés — la barre d'aperçu n'est pas interactive)
- Corriger les écarts constatés

## Pourquoi maintenant

À rattacher naturellement à #314 (couverture E2E de l'aperçu, déjà planifiée au Sprint 47) : même surface,
même moment, un seul aller-retour.

## Testids disponibles

`event-form-preview`, `event-form-preview-timeline`, `event-form-preview-ruler`, `event-form-preview-today`,
`event-form-preview-bar`, `event-form-preview-ghost`, `event-form-preview-connector`,
`event-form-preview-recurrence`, `event-form-preview-legend`

## Triage estimé

S | Domaine : events / design

## Origine

`RECOMMAND_FOLLOWUP` remonté par le fullstack-dev pendant le Sprint 46, arbitré en Phase 4 de `/sprint end`.


## Plan d'implementation
(Aucun mini-plan architect : le Sprint 70 n'a PAS été planifié par `/sprint plan`
— les labels `sprint-70` viennent du triage de clôture du Sprint 46. Tu décides de
l'approche d'après l'état vérifié ci-dessous.)

### ⚠ TU ES LA VAGUE 2 — l'aperçu A ÉTÉ DÉPLACÉ juste avant toi

L'issue #326 (vague 1) a été livrée sur cette branche, commit **`22d6eeb`**. Le body de
#325 que tu viens de lire est **antérieur** à ce changement : il décrit l'aperçu à son
ancienne place. **Vérifie l'aperçu à sa position ACTUELLE, pas celle du body.**

Ce que #326 a changé (mesuré par le lead sur `22d6eeb`, pas supposé) :

| Avant (#315, S46) | Après (#326, vague 1) |
|---|---|
| Aperçu dans le flux du formulaire, **sous le champ Couleur**, défilant avec lui (255 px de dérive mesurés) | Aperçu **portalisé hors du corps défilant**, dans un nouveau bandeau `.mt-drawer__preview` monté ENTRE le header et `.mt-drawer__body` |
| Pas de conteneur peint propre | Nouveau conteneur peint : `padding: var(--space-4) var(--space-5)`, `border-bottom: 1px solid var(--color-rule)`, `background: var(--color-surface)`, `flex:0 0 auto`, `:empty{display:none}` (`timeline.css:304-312`) |
| — | Périmètre **drawer `>= lg` uniquement**. La **bottom sheet (`< 1024px`) garde l'aperçu EN FLUX** — divergence assumée et commentée par #326 (la hauteur y est une ressource rare, cf. #79). |
| — | Aucun `position:sticky`, aucun z-index posé (épinglage structurel) |

### Checklist d'entrée — les 4 écarts que la vague 1 SAIT avoir laissés

Ce ne sont pas des hypothèses : l'agent de la vague 1 les a écrits dans son livrable.
Ils sont **le point de départ** de ta vérification, pas sa totalité.

1. **Double filet.** `.mt-drawer__header` et `.mt-drawer__preview` portent chacun un
   `border-bottom: 1px solid var(--color-rule)`, séparés d'environ une interligne →
   à valider clair ET sombre (deux filets parallèles rapprochés = artefact visuel probable).
2. **Hiérarchie typographique.** Le libellé « Aperçu » (`tDetails('preview')`, classe
   `text-ink mb-2 text-sm`) est passé **au-dessus du pli** et jouxte désormais
   `.mt-drawer__subtitle` (mono, 10px, uppercase, `--color-ink-muted`). Deux libellés de
   registres différents collés — à trancher.
3. **Aucune hauteur max** sur le bandeau : une mini-frise haute (récurrence + légende)
   ampute d'autant le corps défilant. **Non mesuré** aux petites hauteurs desktop (< 700 px).
4. `.mt-drawer__preview` n'est **pas** stylé en variante sheet → l'aperçu **mobile est
   strictement inchangé** par #326. Si tu constates un écart au handoff §6 en mobile, il
   est **pré-existant**, pas une régression de la vague 1 — dis-le explicitement.

### État vérifié du composant (mesuré sur `22d6eeb`)

| Élément | Réalité |
|---|---|
| Composant | `frontend/src/components/events/EventPreviewTimeline.tsx` (livré #315, S46) |
| Testids présents (9, vérifiés) | `event-form-preview` (l.135), `-timeline` (139), `-ruler` (140), `-connector` (154), `-bar` (165), `-ghost` (176), `-today` (190), `-legend` (200), `-recurrence` (207) |
| Réutilisations | `Ruler` (#47) et `Cursor` (#47) avec `gutterPercent={0}` ; classes DS `.mt-evt` / `.mt-evt--draft` ; `.mt-tlv__today-badge` ; `.mt-recur` |
| Variante non-interactive | `.mt-evt--preview` — `timeline.css:70-73` : `cursor:default`, `:hover` neutralisé (ombre + `filter:none`), y compris une règle `.dark`/`[data-theme="dark"]` dédiée |
| Couleurs | aucune couleur littérale dans le composant SAUF celle **choisie par l'utilisateur** pour son événement (donnée, pas décoration). Encre calculée par `contrastInk` (`@/lib/color`). |
| Spéc de référence | `docs/design/graphite-handoff.md` §6 (l.197) — « règle + TODAY, connecteur pointillé, occurrence fantôme, légende prochaine occurrence » |

### Ce que le body de l'issue demande, reformulé sans ambiguïté

L'issue est une **vérification**, pas une réécriture. Livrable attendu :
1. une vérification **mesurée** (pas déduite) du rendu en thème clair ET sombre ;
2. la confrontation point par point au handoff §6 ;
3. le contrôle de la variante `.mt-evt--preview` (survol/curseur réellement neutralisés) ;
4. **la correction des écarts constatés** — c'est explicitement dans le body.

Si tu ne constates aucun écart sur un point, dis-le et donne la mesure qui le prouve.
« Conforme » sans chiffre n'est pas un résultat.

## Triage
Taille: S
Modele: opus
Effort: high

## Context-pack domaine — 1 pack inline, 4 par pointeur

Le briefing COMPLET (153 Ko : `cp-frontend` + `br-events` + `pit-frontend` +
`rules-jit/frontend` + `rules-jit/ux-patterns`) est committé dans ce worktree :
`docs/memory/sprints/sprint-70/briefing-325.md`. Il n'est pas recopié ici en entier —
le recopier ferait transiter ~70 K tokens DEUX fois par le contexte du lead, et une
reproduction verbatim de cette taille est elle-même une source d'erreur de transcription.

**LECTURE OBLIGATOIRE, dans cet ordre, AVANT d'écrire du code.** Chemins versionnés,
stables dans CE worktree :

1. `.ai-env/context-packs/pit-frontend.md` (90 Ko) — archive des pièges frontend.
   Cherche EN PRIORITÉ : `contraste`, `contrast`, `thème` / `dark`, `token`, `@layer`,
   `jsdom`, `getComputedStyle`, `text-`, `line-height`, `EventPreviewTimeline`.
2. `.ai-env/context-packs/br-events.md` (25 Ko) — règles métier `events`.
   ⚠ **Avertissement du lead, vérifié** : le briefing de la vague 1 affirmait que
   BR-EVE-009 portait sur la perf de l'aperçu (débounce 150 ms). **C'est FAUX** —
   `br-events.md:92` définit BR-EVE-009 comme le **modèle couleur event** (design v3 #44),
   et `grep -ci debounc` sur ce pack rend **0**. Deux commentaires du code
   (`EventEditForm.tsx:174` et `:289`) propagent la même mauvaise attribution ; ils ont
   été laissés INTACTS volontairement (renommer une BR est une décision, pas un nettoyage).
   **Morale : grep tout identifiant `BR-*` dans le pack avant de t'y appuyer, y compris
   ceux que ce briefing te donne.**
3. `docs/design/graphite-handoff.md` §6 (ligne 197) — la spéc de référence.
4. `frontend/e2e/README.md` puis `docs/memory/sprints/sprint-47/e2e-local-runbook.md` —
   le harnais de mesure et la recette de lancement.
5. Les sections `rules-jit/frontend.md` et `rules-jit/ux-patterns.md`, recopiées dans
   `docs/memory/sprints/sprint-70/briefing-325.md` (marqueur
   `<!-- ===== rules-jit/frontend.md ===== -->`). **La vague 1 a avoué ne PAS les avoir
   ouvertes** — `ux-patterns.md` est justement le document pertinent pour une revue
   visuelle. Ouvre-le.

⚠ Ce pointeur n'est **pas contraignant techniquement** : c'est TOI qui garantis la
lecture. D'où la ligne **`fichiers de contexte lus`** exigée dans ton livrable, avec un
ancrage vérifiable par fichier. Elle SERA auditée à la clôture — celle de la vague 1 l'a
été, et c'est ainsi qu'on a su que 2 fichiers n'avaient pas été lus.

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

## Dependances intra-sprint
- **Tu es la VAGUE 2 et la dernière.** #326 est livrée et committée (`22d6eeb`). Tu
  travailles PAR-DESSUS. Ne la refais pas, ne la défais pas.
- Tu peux modifier `timeline.css` et `EventPreviewTimeline.tsx` : la vague 1 a fini.
- Si une correction que tu juges nécessaire remet en cause le mécanisme d'épinglage de
  #326 (portail, `.mt-drawer__preview`), **arrête-toi et remonte-le en
  `STATUS: PARTIAL` + `BLOQUE_SUR`** plutôt que de le réécrire : ce serait un
  arbitrage, pas une correction visuelle.

## Designer
Non applicable au sens habituel : **cette issue EST la revue design**, et la spéc est le
handoff §6. Tu ne demandes pas une validation — tu la produis.

## Contraintes

### Méthode de vérification — LE CŒUR DE L'ISSUE, lis ceci en entier

Cette issue existe **parce que #315 a déduit la conformité de l'usage des tokens au lieu
de la constater**. Reproduire ce raisonnement serait la rater.

Trois pièges mesurés sur ce projet, tous documentés :

1. **Une CI verte ne prouve rien sur ce que voit l'utilisateur** (S48 : 2 CTA rendus à
   1,00:1 de contraste, illisibles, découverts APRÈS une CI verte). Seul un vrai moteur
   de rendu répond à « qu'est-ce qui est affiché ».
2. **Une vérification navigateur peut être verte ET rater l'essentiel** (S53 : une passe
   verte a raté 28 titres, parce que l'échantillon avait été choisi par commodité).
   **Choisis ton échantillon par le RISQUE**, pas par la facilité : les états les plus
   exposés ici sont *récurrent + légende* (le seul cas qui rend connecteur + fantôme),
   *couleur utilisateur très claire* et *très sombre* (l'encre est calculée par
   `contrastInk` — c'est là que ça casse), et *thème sombre* (moins parcouru).
   **Sonde aussi des éléments synthétiques** dont tu connais la réponse attendue, pour
   prouver que ta mesure sait dire NON.
3. **jsdom ne met rien en page** : `getComputedStyle` y rend des valeurs *déclarées*,
   jamais *rendues*, et n'y résout pas la précédence des `@layer` CSS. Un test Vitest ne
   peut donc pas conclure sur ce sujet. ⚠ Piège de mesure connu : un sélecteur ou une
   assertion sur `text-*` peut apparier une valeur de `line-height` au lieu de la taille
   visée — vérifie ce que tu mesures réellement.

**Outillage EXISTANT à réutiliser, ne réécris pas de mesure :**
- `frontend/e2e/support/contrast.ts` — contraste WCAG, troncature, opacité effective.
- `frontend/e2e/landing-cta-contrast.spec.ts` — précédent de spec clair ET sombre.
- `frontend/e2e/sprint-62-control-focus-contrast.spec.ts` — précédent de mesure de style
  calculé sur un contrôle.
- `frontend/e2e/sprint-70-create-preview-pinned.spec.ts` — écrite par la vague 1 ; elle
  ouvre déjà le drawer de création et cible l'aperçu. **Lis-la avant d'écrire la tienne**,
  tu y trouveras le chemin d'ouverture et les préconditions.
- Recette de lancement locale : `docs/memory/sprints/sprint-47/e2e-local-runbook.md`.
  Elle a réellement tourné pendant la vague 1 (6 passed en 5,9 s) — donc elle marche.

**Un test qui ne peut pas échouer ne prouve rien.** Avant de conclure « conforme »,
mute délibérément le code (change un token, retire une règle) et vérifie que ta mesure
VIRE AU ROUGE. La vague 1 l'a fait à deux niveaux ; on n'attend pas moins ici.

### Environnement — À LIRE AVANT TOUTE COMMANDE
- **Worktree git** :
  `/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/traitement-s-xs-parallele-d0ae59`
  **`cd` explicitement dedans au début de CHAQUE commande bash.** Garde-fou :
  `git rev-parse HEAD` doit rendre un descendant de `22d6eeb` (la vague 1).
  Un subagent qui défaut-`cwd` sur le dépôt principal produit de faux KO.
- Branche : `claude/sprint-70-start-b946cb`. **Pas de branche `sprint/70`.**
- `frontend/node_modules` : la vague 1 a lancé `npm ci` dans ce worktree, il devrait être
  présent. S'il manque, réinstalle — un échec de préflight d'environnement **n'est PAS**
  une suite rouge (`PIT-S69-002`).
- **RTK avale la sortie** de `git diff`, `git log`, **et aussi de `playwright test` et
  `vitest --reporter=verbose`** (constat de la vague 1). Préfixe par `rtk proxy` dès que
  la sortie te paraît vide ou tronquée. `git rev-parse` reste fiable.

### Code
- Commit : **1 commit logique**, gitmoji en **français**. `git add` **CIBLÉ** —
  **jamais `git add -A`** (working tree partagé).
- Zéro couleur littérale, zéro z-index littéral : **tokens DS uniquement**. La seule
  couleur littérale légitime du composant est celle choisie par l'utilisateur.
- Chaque correction visuelle doit rester **theme-aware** : si tu touches un token en
  clair, prouve le sombre.
- Ne touche PAS : `backend/**`, `db/migration/**`, `EventDrawer*`, `TimelineEditHost*`,
  `ConflictDialog*`.
- Tout nouveau `data-testid` DOIT être cité dans une spec de `frontend/e2e/`. ⚠ Ce check
  vérifie seulement qu'il est **cité**, pas que la spec passe — ne t'en contente pas.

## Livrable attendu (format strict, MAX 500 tokens, style caveman — pas de prose)

RETOUR :
- commits: [SHA, ...]
- **verification: <TABLEAU point par point>** — une ligne par élément du handoff §6
  (règle, marqueur TODAY, barre pleine, connecteur pointillé, occurrence fantôme,
  légende, variante `.mt-evt--preview`), avec pour chacun : thème clair → **mesure
  chiffrée**, thème sombre → **mesure chiffrée**, verdict CONFORME / ÉCART / NON MESURÉ.
  « NON MESURÉ » est une réponse acceptable ; « conforme » sans chiffre ne l'est pas.
- ecarts_corriges: <liste + fichier:ligne>
- ecarts_non_corriges: <liste + pourquoi>
- echantillon: <ce que tu as mesuré ET ce que tu n'as PAS mesuré — le S53 a été raté
  par un échantillon choisi par commodité>
- preuve_que_la_mesure_sait_dire_NON: <la mutation que tu as faite et ce qui a rougi>
- **fichiers de contexte lus:** <chemins réellement ouverts + ancrage vérifiable pour
  chacun (identifiant de pitfall, numéro de ligne, citation courte)>. **Obligatoire, sera
  auditée.** Si tu n'as pas lu un fichier pointé, écris-le — un aveu est exploitable, une
  affirmation fausse ne l'est pas.
- tests: <commandes + résultat chiffré ; « non lancé » si non lancé>
- [MEMORY:*] signaux
- recommandations suite: <RECOMMAND_* OU négation explicite « Pas de RECOMMAND_X car … »>
- STATUS: COMPLETED en dernière ligne (ou STATUS: PARTIAL + BLOQUE_SUR)
