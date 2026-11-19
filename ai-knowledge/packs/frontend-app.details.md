# Annexe : frontend-app

## Index des fichiers {#files-index}

| Fichier | Faits | Sortes |
|---|---|---|
| `frontend-app:[locale]/forgot-password/page.tsx` | 9 | convention 8, suspicious 1 |
| `frontend-app:[locale]/error.tsx` | 8 | convention 8 |
| `frontend-app:global-not-found-screen.tsx` | 7 | convention 5, suspicious 2 |
| `frontend-app:[locale]/(app)/timeline/page.tsx` | 6 | convention 5, suspicious 1 |
| `frontend-app:global-error.test.tsx` | 6 | test_case 6 |
| `frontend-app:global-error.tsx` | 6 | convention 5, suspicious 1 |
| `frontend-app:[locale]/(app)/dashboard/loading.tsx` | 5 | convention 5 |
| `frontend-app:[locale]/login/page.tsx` | 5 | convention 5 |
| `frontend-app:[locale]/(app)/timeline/loading.tsx` | 4 | convention 4 |
| `frontend-app:fonts.ts` | 4 | convention 3, config 1 |
| `frontend-app:[locale]/(app)/dashboard/loading.test.tsx` | 3 | test_case 3 |
| `frontend-app:[locale]/(app)/products/loading.test.tsx` | 3 | test_case 2, convention 1 |
| `frontend-app:[locale]/(app)/products/loading.tsx` | 3 | convention 3 |
| `frontend-app:[locale]/(app)/settings/loading.tsx` | 3 | convention 3 |
| `frontend-app:global-not-found.tsx` | 3 | convention 3 |
| `frontend-app:[locale]/(app)/products/[productId]/loading.test.tsx` | 2 | test_case 2 |
| `frontend-app:[locale]/(app)/products/[productId]/loading.tsx` | 2 | convention 2 |
| `frontend-app:[locale]/(app)/settings/loading.test.tsx` | 2 | convention 1, test_case 1 |
| `frontend-app:[locale]/(app)/timeline/loading.test.tsx` | 2 | test_case 2 |
| `frontend-app:global-not-found.test.tsx` | 2 | test_case 2 |
| `frontend-app:layout.tsx` | 2 | convention 2 |
| `frontend-app:page.tsx` | 1 | other 1 |

## Lignes rétrogradées {#t-demoted_lines}

| Section | Ligne | Motif |
|---|---|---|
| rules | - Selon le commentaire du dashboard, un fallback garde une seule région `role="status"` et les blocs décoratifs sont `aria-hidden`. [#32dff7774a310336-1] [#b5cbb7f28ce9879c-1] | deducible |
| rules | - Un échec de connexion affiche `invalidCredentials` pour un statut 401 et `generic` dans tous les autres cas. [#4169eeab8b96e08e-1] | deducible |
| tests | - Les tests fixent que le fallback products garde un titre réel, sans onglets réels ni aria-busy, avec six items de squelette [#98b1a65dc3f3bcba-1] [#98b1a65dc3f3bcba-2]. | deducible |
| tests | - Les tests fixent le nombre de régions status et le libellé sr-only du dashboard, ainsi que le placeholder aria-hidden de réservation de place dans settings [#d0b6197e7ba40a12-2] [#bdb2f28c8bff0c1c-1]. | deducible |

## Faits suspects {#t-suspicious}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `frontend-app:[locale]/(app)/timeline/page.tsx:40-44` | Le commentaire indique qu'une ancienne branche `loading` de cette page était du code mort, supprimée, et que `timeline-loading` ne doit pas revenir. | [#fb229f021c892aa8-1] |
| `frontend-app:[locale]/forgot-password/page.tsx:32` | La locale est lue ici par `use(params)`, alors que `error.tsx` et `timeline/page.tsx` la lisent par `useLocale`, ce qui fait coexister deux manières de lire la locale dans la couche. | [#799f6e4da3288542-1] |
| `frontend-app:global-error.tsx:123` | Le style du html recopie à la main la dérivation --font-ui au lieu d'importer fontUiStyle, alors que fonts.ts déclare cette dérivation comme source unique. | [#27d6940a021f46a6-1] |
| `frontend-app:global-not-found-screen.tsx:60-66` | Le commentaire décrit la locale posée dans un useEffect, alors que le code lit la locale via useHydrated à la ligne 136. | [#1e32eb4f50b246ba-1] |
| `frontend-app:global-not-found-screen.tsx:141-144` | Le style du html recopie la dérivation --font-ui au lieu d'importer fontUiStyle, malgré la source unique déclarée dans fonts.ts. | [#4a72ffec01bdd565-1] |

## Configuration {#t-config}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `frontend-app:fonts.ts:15-21` | Les polices sont déclarées avec next/font/google dans un export nommé par police, avec subsets latin, graphies fixées, display swap et une variable CSS nommée (--font-display pour Archivo). | [#4694f836fb39a2fa-1] |

## Conventions {#t-convention}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `frontend-app:[locale]/(app)/dashboard/loading.tsx:9-11` | Javadoc : Le commentaire de tête du fallback indique qu'il est un Client Component qui utilise `useTranslations`, monté dans le `NextIntlClientProvider` du layout. | [#60e83af7fd4c9b52-1] |
| `frontend-app:[locale]/(app)/dashboard/loading.tsx:26-28` | Javadoc : Une seule région `role="status"` est gardée par fallback, les autres blocs sont `aria-hidden` pour éviter d'annoncer plusieurs fois le même chargement. | [#32dff7774a310336-1] |
| `frontend-app:[locale]/(app)/dashboard/loading.tsx:30-34` | Les blocs de squelette décoratifs sont un petit composant local `Block` qui compose `cn` avec `bg-surface-2 animate-pulse rounded-md` et pose `aria-hidden="true"`. | [#b5cbb7f28ce9879c-1] |
| `frontend-app:[locale]/(app)/dashboard/loading.tsx:36-37` | Un fallback de segment est un composant client qui appelle `useTranslations` avec un namespace global (ici `common`) et lit ses libellés de chargement sous `spinner.loading`. | [#60e83af7fd4c9b52-2] |
| `frontend-app:[locale]/(app)/dashboard/loading.tsx:77-83` | Le squelette de liste est rendu par `LoadingSkeleton` avec `variant="list"`, un `rows`, un `label` traduit et un `testId`, seul élément de la page porteur de `role="status"`. | [#32dff7774a310336-2] |
| `frontend-app:[locale]/(app)/products/[productId]/loading.tsx:15-17` | Javadoc : Le fallback reprend l'enveloppe de `page.tsx` avec les mêmes paddings et les mêmes largeurs que la page réelle. | [#43a9e243f3c78c96-1] |
| `frontend-app:[locale]/(app)/products/[productId]/loading.tsx:21-32` | Le fallback de la fiche produit enveloppe le contenu dans le même `max-w-7xl` que `page.tsx`, place un bloc de bouton retour en tête et rend un `LoadingSkeleton` avec `variant="timeline"`, `rows={3}` et `label={t('detail.loading')}`. | [#43a9e243f3c78c96-2] |
| `frontend-app:[locale]/(app)/products/loading.test.tsx:7-9` | Le test du fallback produits mocke `next-intl` avec la même forme `namespace.key` que les autres tests de loading. | [#9a4fee6b28fc79f4-1] |
| `frontend-app:[locale]/(app)/products/loading.tsx:20-21` | Javadoc : Chaque segment enfant ayant une forme de fallback différente reçoit son propre `loading.tsx`, car un `loading.tsx` enveloppe aussi les segments enfants. | [#de7e2f0ed7095ba3-1] |
| `frontend-app:[locale]/(app)/products/loading.tsx:23-24` | Le fallback de `/products` est un composant client qui lit son namespace `products` avec `useTranslations`. | [#de7e2f0ed7095ba3-2] |
| `frontend-app:[locale]/(app)/products/loading.tsx:48-54` | Le squelette de liste produits passe `variant="list"`, `rows`, `label`, une `className` de cadre bordé et un `testId`, sans attribut `aria-hidden` sur le squelette lui-même. | [#b0c21b35bbdc2f9e-1] |
| `frontend-app:[locale]/(app)/settings/loading.test.tsx:17-20` | Commentaire : Le test de settings assert la clé de namespace `settings.loading` et l'absence du libellé générique `common.spinner.loading` par `queryByText`. | [#57f5edd6385f23ad-1] |
| `frontend-app:[locale]/(app)/settings/loading.tsx:24-25` | Javadoc : Le libellé de chargement nomme son contexte par une clé du namespace du segment, plutôt que par la clé générique `common.spinner.loading`. | [#f6fc1f69dbd3ffb6-1] |
| `frontend-app:[locale]/(app)/settings/loading.tsx:27-28` | Le fallback de `/settings` est un composant client qui lit le namespace `settings` avec `useTranslations`. | [#f6fc1f69dbd3ffb6-2] |
| `frontend-app:[locale]/(app)/settings/loading.tsx:34-41` | Une place réservée à l'élément de retour est un `div` vide `aria-hidden` de même taille que l'élément réel, avec `lg:hidden`, et le titre réel suit en `h1`. | [#f6fc1f69dbd3ffb6-3] |
| `frontend-app:[locale]/(app)/timeline/loading.tsx:18-19` | Javadoc : Le testid du squelette de fallback est distinct de celui du squelette de données de la page, et l'ancien testid `timeline-loading` ne doit pas être réintroduit. | [#6c6a5005a986a168-1] |
| `frontend-app:[locale]/(app)/timeline/loading.tsx:26-27` | Le fallback de `/timeline` est un composant client qui lit le namespace `shell.timeline` avec `useTranslations`. | [#6c6a5005a986a168-2] |
| `frontend-app:[locale]/(app)/timeline/loading.tsx:30-34` | L'en-tête du fallback reprend la structure de la page, avec un eyebrow en `span` de classe `mt-eyebrow` puis un `h1` de titre. | [#6c6a5005a986a168-3] |
| `frontend-app:[locale]/(app)/timeline/loading.tsx:41-47` | Le squelette de la frise passe `variant="timeline"`, `rows={6}`, `label`, `className="min-w-0 flex-1"` et un `testId` dédié. | [#9935ac2669628575-1] |
| `frontend-app:[locale]/(app)/timeline/page.tsx:49-56` | Une page client applique la garde d'auth par `useAuthGuard`, lit l'utilisateur et renvoie `null` si `user` est absent. | [#1370ba4bb014b3f4-1] |
| `frontend-app:[locale]/(app)/timeline/page.tsx:53-54` | Les données de la frise viennent du hook partagé `useDashboardData(user?.id)`, qui fournit `events`, `resources` et `isLoading`. | [#418cc63341bd69b3-1] |
| `frontend-app:[locale]/(app)/timeline/page.tsx:73-111` | Le rendu conditionnel suit trois branches dans cet ordre : `isLoading` monte un `LoadingSkeleton`, une liste vide monte un `EmptyState` avec `track`, sinon le host de frise est rendu. | [#1370ba4bb014b3f4-2] |
| `frontend-app:[locale]/(app)/timeline/page.tsx:95-98` | Le CTA d'un `EmptyState` est un `Button asChild` qui enveloppe un `Link` préfixé par la locale avec un `data-testid` dédié. | [#b3f939572d5cedda-1] |
| `frontend-app:[locale]/(app)/timeline/page.tsx:109` | Le host de frise est monté avec les props `events`, `resources`, `locale` et `layout="screen"`. | [#87c5362de9ed8877-1] |
| `frontend-app:[locale]/error.tsx:36-42` | Un error boundary de segment est un composant client exporté par défaut, qui reçoit les props `error` et `reset` typées `Error & { digest?: string }` et `() => void`. | [#4ac83ca054b2de57-1] |
| `frontend-app:[locale]/error.tsx:43` | Dans ce segment, la locale des liens est lue avec le hook `useLocale` et injectée dans les href préfixés. | [#4ac83ca054b2de57-2] |
| `frontend-app:[locale]/error.tsx:44-45` | Le composant choisit son namespace i18n selon la branche 403 ou 500, en appelant `isForbiddenError` puis `useTranslations` avec la clé de namespace correspondante. | [#4ac83ca054b2de57-3] |
| `frontend-app:[locale]/error.tsx:47-51` | Commentaire : La journalisation d'une erreur de boundary se fait dans un `useEffect` par `console.error`, précédé d'une directive `eslint-disable-next-line no-restricted-syntax` accompagnée d'une justification en commentaire. | [#4ac83ca054b2de57-4] |
| `frontend-app:[locale]/error.tsx:50` | Le message d'erreur réel est écrit dans la console via `console.error(error)` et n'est pas affiché à l'utilisateur. | [#4b4fee94969264b8-1] |
| `frontend-app:[locale]/error.tsx:53-59` | Les écrans d'état (erreur, 403) passent par le composant partagé `StateScreen` avec les props `testId`, `code`, `icon`, `title`, `description` et `actions`, les libellés venant d'un namespace i18n. | [#61b77c57cf76feed-1] |
| `frontend-app:[locale]/error.tsx:62-71` | Les boutons d'action d'un écran d'état utilisent les classes partagées `stateActionPrimary` et `stateActionSecondary` importées depuis `@/components/shared/StateScreen`. | [#4ac83ca054b2de57-5] |
| `frontend-app:[locale]/error.tsx:79-83` | La référence d'incident (`error.digest`) s'affiche en fin de rangée d'actions via le composant `IncidentReference`, sur les deux branches. | [#5c694708762206d9-1] |
| `frontend-app:[locale]/forgot-password/page.tsx:26-32` | Une page d'auth client reçoit `params` sous forme de `Promise<{ locale: string }>` et lit la locale avec `use(params)` de React. | [#161671a13789cc97-1] |
| `frontend-app:[locale]/forgot-password/page.tsx:27-35` | Le formulaire utilise `useForm` avec `zodResolver` et un schéma créé par une fabrique qui reçoit `t`, et les messages de `useTranslations()` sont appelés avec des clés complètes. | [#161671a13789cc97-2] |
| `frontend-app:[locale]/forgot-password/page.tsx:43-44` | Commentaire : L'appel au service transmet la locale de la route en second argument, comme le commente le code. | [#161671a13789cc97-3] |
| `frontend-app:[locale]/forgot-password/page.tsx:47-48` | Les erreurs de soumission sont écrites dans un état `serverError` via `setServerError(t(...))` à partir d'une clé i18n complète. | [#161671a13789cc97-4] |
| `frontend-app:[locale]/forgot-password/page.tsx:75-78` | Le coin haut-droit des pages d'auth regroupe `ThemeToggle` (testId `auth-theme-toggle`) et `LanguageSelector` dans un bloc `absolute` ancré par un parent `relative`. | [#2b65d29cc376d1f6-1] |
| `frontend-app:[locale]/forgot-password/page.tsx:81` | La carte des pages d'auth utilise les classes `bg-surface border-rule w-full max-w-md rounded-lg border p-6 shadow-xs`. | [#161671a13789cc97-5] |
| `frontend-app:[locale]/forgot-password/page.tsx:126-134` | L'erreur serveur s'affiche dans un `p` avec `role="alert"` et un `data-testid` dédié, classes `text-danger text-sm font-medium`. | [#161671a13789cc97-6] |
| `frontend-app:[locale]/forgot-password/page.tsx:136-151` | Le bouton de soumission est désactivé et porte `aria-busy` pendant le chargement, avec un `Spinner` qui reçoit `label={t('common.spinner.loading')}`. | [#161671a13789cc97-7] |
| `frontend-app:[locale]/login/page.tsx:27-33` | La page de connexion est un composant client qui reçoit `params` en `Promise`, lit la locale avec `use(params)`, et utilise `useTranslations()` sans namespace. | [#f4a196fc94aea5ef-1] |
| `frontend-app:[locale]/login/page.tsx:30` | L'état d'authentification est lu via le hook `useAuth`, qui fournit `login`, `loading` et `user`. | [#f4a196fc94aea5ef-2] |
| `frontend-app:[locale]/login/page.tsx:43-47` | Une fois `user` présent, la page redirige avec `router.replace` vers la route `dashboard` préfixée par la locale. | [#02a2468c5b5164c5-1] |
| `frontend-app:[locale]/login/page.tsx:49-59` | Les erreurs de connexion sont traduites par `axios.isAxiosError` : un statut 401 affiche `invalidCredentials`, tout autre cas affiche `generic`. | [#4169eeab8b96e08e-1] |
| `frontend-app:[locale]/login/page.tsx:97` | Le formulaire et les champs portent des `data-testid` fixes (`login-form`, `login-username`, `login-password`, `login-submit`, `login-error`). | [#f4a196fc94aea5ef-3] |
| `frontend-app:fonts.ts:31` | Les classes de variables de police destinées au html sont regroupées dans une constante unique fontVariables, réutilisée par les documents qui rendent leur propre html. | [#caf354edf4dd81d3-1] |
| `frontend-app:fonts.ts:57-65` | La variable --font-ui est dérivée dans un seul module partagé (FONT_UI_VARIABLE, FONT_UI_VALUE, fontUiStyle) importé par l'application et par Storybook, sans recopie locale. | [#dada10d09df46167-1] |
| `frontend-app:fonts.ts:65` | Le style inline du html porte la dérivation --font-ui sous forme d'objet CSSProperties exporté, obtenu par un cast as CSSProperties sur une clé calculée. | [#0a42282bf039e763-1] |
| `frontend-app:global-error.tsx:1-3` | Un composant de cette couche qui rend son propre document est marqué 'use client' et importe explicitement globals.css en tête de fichier. | [#a9a3bfc89eae1e73-1] |
| `frontend-app:global-error.tsx:66` | Les libellés d'un composant hors NextIntlClientProvider sont inlinés dans une constante MESSAGES typée, indexée par code de locale, avec un type dédié (GlobalErrorMessages). | [#35eb2e637ab761d4-1] |
| `frontend-app:global-error.tsx:98-102` | La locale est déduite du premier segment de l'URL window.location.pathname, validée par isSupportedLocale, avec repli sur DEFAULT_LOCALE, et renvoie DEFAULT_LOCALE côté serveur quand window est absent. | [#eb3039b22898acac-1] |
| `frontend-app:global-error.tsx:114-117` | Commentaire : Le composant d'erreur journalise l'erreur React dans un useEffect dépendant de error, avec une directive eslint-disable-next-line no-restricted-syntax accompagnée de son numéro d'issue. | [#a9a3bfc89eae1e73-2] |
| `frontend-app:global-error.tsx:127-155` | L'écran d'erreur s'appuie sur StateScreen avec un testId, un code, une icône, titre, description et actions, et les classes stateActionPrimary et stateActionSecondary pour les boutons et liens. | [#98e5a657613e5a5b-1] |
| `frontend-app:global-not-found-screen.tsx:1-11` | Le composant client de l'écran 404 commence par la directive 'use client' et importe globals.css, fontVariables et les primitives StateScreen. | [#f61a1c6de3075432-1] |
| `frontend-app:global-not-found-screen.tsx:93` | Les libellés 404 sont une copie inlinée de errors.json, typée Record<Locale, NotFoundMessages>, à resynchroniser à la main si les libellés changent. | [#da27a7b668cd53e5-1] |
| `frontend-app:global-not-found-screen.tsx:136` | La locale est lue par le hook useHydrated, avec DEFAULT_LOCALE avant hydratation, pour éviter un écart entre le rendu serveur et le client. | [#f61a1c6de3075432-2] |
| `frontend-app:global-not-found-screen.tsx:153` | Les libellés paramétrés se substituent à la main par String.replace sur un gabarit {week}, sans formateur next-intl, et sont passés en prop formatWeek. | [#dc25882da52b7bc9-1] |
| `frontend-app:global-not-found-screen.tsx:159-162` | Commentaire : Dans un document qui remplace le layout racine, les liens sont des balises a et non des Link, et la cible est la racine de locale préfixée. | [#5ea3a89d38aab0d1-1] |
| `frontend-app:global-not-found.tsx:3` | La page 404 est un Server Component qui exporte metadata et délègue tout le rendu à un composant client importé depuis un fichier -screen.tsx. | [#286ccab6e67ed391-1] |
| `frontend-app:global-not-found.tsx:57-60` | Le Server Component expose un export metadata typé Metadata avec un title et une description fixes, non localisés. | [#46f33cf1a8b53c3e-1] |
| `frontend-app:global-not-found.tsx:62-64` | Le composant par défaut de la page rend uniquement le composant client GlobalNotFoundScreen, sans logique propre. | [#286ccab6e67ed391-2] |
| `frontend-app:layout.tsx:28-31` | Le layout racine exporte un objet metadata nommé avec title et description, que Next agrège sur toute la branche. | [#fe8ef626f0c0e295-1] |
| `frontend-app:layout.tsx:33-35` | Le layout racine est transparent : il est typé avec ReactNode et rend uniquement children, le document étant porté par les layouts de locale. | [#3da9c19469b4af1b-1] |
