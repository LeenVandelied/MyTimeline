# Annexe : frontend-app

## Index des fichiers {#files-index}

| Fichier | Faits | Sortes |
|---|---|---|
| `frontend-app:[locale]/forgot-password/page.tsx` | 9 | convention 9 |
| `frontend-app:global-error.tsx` | 8 | convention 7, suspicious 1 |
| `frontend-app:[locale]/error.tsx` | 6 | convention 6 |
| `frontend-app:[locale]/login/page.tsx` | 6 | convention 5, suspicious 1 |
| `frontend-app:[locale]/(app)/dashboard/loading.tsx` | 4 | convention 4 |
| `frontend-app:[locale]/(app)/timeline/page.tsx` | 4 | convention 4 |
| `frontend-app:fonts.ts` | 4 | convention 3, config 1 |
| `frontend-app:global-error.test.tsx` | 4 | test_case 4 |
| `frontend-app:global-not-found-screen.tsx` | 4 | convention 3, suspicious 1 |
| `frontend-app:[locale]/(app)/dashboard/loading.test.tsx` | 3 | test_case 3 |
| `frontend-app:[locale]/(app)/products/loading.tsx` | 3 | convention 3 |
| `frontend-app:global-not-found.test.tsx` | 3 | test_case 3 |
| `frontend-app:[locale]/(app)/settings/loading.tsx` | 2 | convention 2 |
| `frontend-app:[locale]/(app)/timeline/loading.test.tsx` | 2 | test_case 2 |
| `frontend-app:[locale]/(app)/timeline/loading.tsx` | 2 | convention 2 |
| `frontend-app:global-not-found.tsx` | 2 | config 1, convention 1 |
| `frontend-app:layout.tsx` | 2 | convention 2 |
| `frontend-app:[locale]/(app)/products/[productId]/loading.test.tsx` | 1 | test_case 1 |
| `frontend-app:[locale]/(app)/products/[productId]/loading.tsx` | 1 | convention 1 |
| `frontend-app:[locale]/(app)/products/loading.test.tsx` | 1 | test_case 1 |
| `frontend-app:[locale]/(app)/settings/loading.test.tsx` | 1 | test_case 1 |
| `frontend-app:page.tsx` | 1 | convention 1 |

## Lignes hors budget {#t-cut_lines}

| Section | Ligne |
|---|---|
| tests | - Le test de metadata de global-not-found importe l'export metadata et asserte title et description sans rendu. [#e09d643f45949aac-1] |

## Faits suspects {#t-suspicious}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `frontend-app:[locale]/login/page.tsx:28` | Les pages d'authentification appellent useTranslations sans namespace et écrivent des clés complètes, à l'écart des fallbacks qui passent un namespace. | [#f4a196fc94aea5ef-1] |
| `frontend-app:global-error.tsx:123` | Le html de GlobalError réécrit le style --font-ui en ligne au lieu d'importer fontUiStyle, alors que le commentaire de fonts.ts présente cette dérivation comme source unique. | [#27d6940a021f46a6-1] |
| `frontend-app:global-not-found-screen.tsx:144` | Le html de GlobalNotFoundScreen réécrit le même style --font-ui en ligne au lieu d'importer fontUiStyle, ce qui duplique la dérivation déjà exportée par fonts.ts. | [#4a72ffec01bdd565-1] |

## Configuration {#t-config}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `frontend-app:fonts.ts:17` | La police Archivo est chargée en subsets latin, poids 400, 500, 600 et 700, avec display swap. | [#4694f836fb39a2fa-1] |
| `frontend-app:global-not-found.tsx:20` | Javadoc : Le fichier global-not-found exige l'option experimental.globalNotFound à true dans next.config.mjs. | [#0b1e57bd9a31e944-1] |

## Conventions {#t-convention}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `frontend-app:[locale]/(app)/dashboard/loading.tsx:8-11` | Javadoc : Un fallback de segment est un Client Component qui utilise useTranslations, monté sous le NextIntlClientProvider du layout. | [#60e83af7fd4c9b52-1] |
| `frontend-app:[locale]/(app)/dashboard/loading.tsx:26-28` | Javadoc : Un seul élément role status par fallback, la région de LoadingSkeleton, et les autres blocs de squelette sont aria-hidden. | [#32dff7774a310336-1] |
| `frontend-app:[locale]/(app)/dashboard/loading.tsx:30-34` | Les blocs de squelette sont une fonction locale Block qui fusionne ses classes avec cn de lib/utils, sur la base bg-surface-2 animate-pulse rounded-md et aria-hidden. | [#b5cbb7f28ce9879c-1] |
| `frontend-app:[locale]/(app)/dashboard/loading.tsx:81` | Le label accessible d'un fallback vient d'une clé de traduction du namespace common, par exemple spinner.loading, et non d'une chaîne écrite en dur. | [#60e83af7fd4c9b52-3] |
| `frontend-app:[locale]/(app)/products/[productId]/loading.tsx:29-34` | Le fallback de la fiche produit monte LoadingSkeleton avec variant timeline, rows 3, un label du namespace products et un testId propre à la fiche. | [#43a9e243f3c78c96-2] |
| `frontend-app:[locale]/(app)/products/loading.tsx:5` | Les fallbacks de segment réutilisent LoadingSkeleton de components/shared, avec une variante, un nombre de rows, un label traduit et un testId propre au segment. | [#de7e2f0ed7095ba3-3] |
| `frontend-app:[locale]/(app)/products/loading.tsx:16-21` | Javadoc : Un segment enfant ayant une vue différente possède son propre loading.tsx, car le fallback d'un segment enveloppe aussi ses segments enfants. | [#de7e2f0ed7095ba3-1] |
| `frontend-app:[locale]/(app)/products/loading.tsx:28-32` | Les onglets décoratifs d'un fallback reprennent les classes du design system mt-tabs et mt-tab, en bloc aria-hidden. | [#de7e2f0ed7095ba3-4] |
| `frontend-app:[locale]/(app)/settings/loading.tsx:24-25` | Javadoc : Le label d'un fallback utilise la clé du namespace de la page, settings.loading, plutôt que le libellé générique common.spinner.loading. | [#f6fc1f69dbd3ffb6-1] |
| `frontend-app:[locale]/(app)/settings/loading.tsx:36-38` | Un bloc vide de même taille que le bouton retour réel réserve sa place dans le fallback, avec aria-hidden. | [#f6fc1f69dbd3ffb6-3] |
| `frontend-app:[locale]/(app)/timeline/loading.tsx:11-14` | Javadoc : Le fallback reproduit l'enveloppe et l'en-tête de la page réelle, avec les vrais libellés, pour que la page remplace le fallback sans décalage. | [#6c6a5005a986a168-4] |
| `frontend-app:[locale]/(app)/timeline/loading.tsx:41-47` | Le fallback de la frise monte LoadingSkeleton avec variant timeline, rows 6, un label traduit et un testId dédié. | [#9935ac2669628575-1] |
| `frontend-app:[locale]/(app)/timeline/page.tsx:53-56` | La page récupère l'utilisateur avec useAuthGuard, alimente la vue avec useDashboardData, et renvoie null lorsque user est absent. | [#1370ba4bb014b3f4-1] |
| `frontend-app:[locale]/(app)/timeline/page.tsx:82` | Le chargement des données de la frise utilise un testId distinct du testId du fallback de segment. | [#1370ba4bb014b3f4-2] |
| `frontend-app:[locale]/(app)/timeline/page.tsx:90-103` | L'état vide de la frise utilise EmptyState avec les props track, title, description, action et testId. | [#1370ba4bb014b3f4-3] |
| `frontend-app:[locale]/(app)/timeline/page.tsx:109` | La page monte le composant partagé TimelineEditHost, sans le dupliquer, avec la prop layout à screen. | [#87c5362de9ed8877-1] |
| `frontend-app:[locale]/error.tsx:16-19` | Javadoc : Le crash boundary du segment est un Client Component qui déclare la directive use client et reçoit les props error et reset imposées par Next. | [#4ac83ca054b2de57-6] |
| `frontend-app:[locale]/error.tsx:36-42` | Le composant d'erreur de segment a pour signature export default function avec les props error typées Error et digest optionnel, et reset typé () => void. | [#4ac83ca054b2de57-1] |
| `frontend-app:[locale]/error.tsx:44-45` | La branche d'erreur est choisie par isForbiddenError, et le namespace de traduction suit cette branche, errors.forbidden ou errors.crash. | [#4ac83ca054b2de57-3] |
| `frontend-app:[locale]/error.tsx:47-51` | Commentaire : Le journal de l'erreur passe par console.error dans un useEffect, avec une directive eslint-disable-next-line documentée en commentaire. | [#4ac83ca054b2de57-4] |
| `frontend-app:[locale]/error.tsx:54-86` | L'écran d'erreur est rendu avec StateScreen, un testId dérivé de la branche, des actions de retour, et IncidentReference avec error.digest. | [#61b77c57cf76feed-1] |
| `frontend-app:[locale]/error.tsx:79-83` | L'identifiant d'incident est affiché avec IncidentReference à partir de error.digest, sur les deux branches d'erreur. | [#5c694708762206d9-1] |
| `frontend-app:[locale]/forgot-password/page.tsx:32` | Les pages reçoivent params sous forme de Promise et lisent la locale avec use(params) de React. | [#799f6e4da3288542-1] |
| `frontend-app:[locale]/forgot-password/page.tsx:34-37` | Les formulaires utilisent react-hook-form avec zodResolver sur un schéma créé par createXSchema(t) depuis lib/schemas/auth. | [#161671a13789cc97-2] |
| `frontend-app:[locale]/forgot-password/page.tsx:46-48` | Une erreur de soumission est capturée dans un catch et remplacée par un message générique traduit posé dans serverError. | [#161671a13789cc97-4] |
| `frontend-app:[locale]/forgot-password/page.tsx:55-78` | Commentaire : Le conteneur des actions d'angle porte la classe relative, nécessaire à l'ancrage du bloc absolute qui le contient. | [#161671a13789cc97-8] |
| `frontend-app:[locale]/forgot-password/page.tsx:75-78` | Les pages d'authentification placent ThemeToggle et LanguageSelector dans un coin haut droit absolu, et terminent par AppFooter. | [#161671a13789cc97-9] |
| `frontend-app:[locale]/forgot-password/page.tsx:105-124` | Les champs de formulaire sont composés avec Form, FormField, FormItem, FormLabel, FormControl et FormMessage de components/ui/form, avec Input. | [#161671a13789cc97-10] |
| `frontend-app:[locale]/forgot-password/page.tsx:126-134` | Les erreurs serveur s'affichent dans un paragraphe role alert dont le data-testid est préfixé par le nom de la page. | [#161671a13789cc97-6] |
| `frontend-app:[locale]/forgot-password/page.tsx:136-151` | Le bouton de soumission est désactivé pendant l'envoi, porte aria-busy, et affiche Spinner avec un label traduit. | [#161671a13789cc97-7] |
| `frontend-app:[locale]/forgot-password/page.tsx:158` | Les liens internes sont construits avec next/link et préfixés par la locale, /${locale}/chemin. | [#161671a13789cc97-11] |
| `frontend-app:[locale]/login/page.tsx:30` | La connexion passe par le hook useAuth, qui expose login, loading et user. | [#f4a196fc94aea5ef-2] |
| `frontend-app:[locale]/login/page.tsx:36` | Le formulaire de connexion utilise react-hook-form avec zodResolver sur createLoginSchema(t), depuis lib/schemas/auth. | [#f4a196fc94aea5ef-4] |
| `frontend-app:[locale]/login/page.tsx:44-46` | La page de connexion redirige vers le tableau de bord de la locale avec router.replace dès que user est présent. | [#02a2468c5b5164c5-1] |
| `frontend-app:[locale]/login/page.tsx:53-59` | Les erreurs de connexion sont classées avec axios.isAxiosError et le statut 401, les autres erreurs recevant un message générique. | [#4169eeab8b96e08e-1] |
| `frontend-app:[locale]/login/page.tsx:141-147` | Les erreurs serveur de connexion s'affichent dans un paragraphe role alert avec data-testid login-error. | [#f4a196fc94aea5ef-5] |
| `frontend-app:fonts.ts:2` | Les polices sont déclarées via next/font/google, chaque police recevant une option variable qui fixe le nom de la variable CSS, par exemple --font-display ou --font-mono. | [#e9909cc3f03fe481-1] |
| `frontend-app:fonts.ts:31` | Les classes de variables de police sont regroupées dans une chaîne exportée fontVariables, posée sur la balise html. | [#caf354edf4dd81d3-1] |
| `frontend-app:fonts.ts:65` | Le style inline de la variable --font-ui est exporté sous forme d'objet CSSProperties nommé fontUiStyle, destiné à être réutilisé sur le html de l'application. | [#0a42282bf039e763-1] |
| `frontend-app:global-error.tsx:3` | Un écran de premier niveau qui rend son propre document importe explicitement globals.css et les variables de police, car aucun layout ne monte la feuille au-dessus de lui. | [#a9a3bfc89eae1e73-1] |
| `frontend-app:global-error.tsx:53` | Javadoc : L'identifiant d'incident error.digest est affiché en fin de rangée d'actions via le composant IncidentReference, dont le libellé doit rester identique à crash.incidentRef des fichiers errors.json. | [#a62fda43c05ab05d-1] |
| `frontend-app:global-error.tsx:66` | Les messages d'un écran hors NextIntlClientProvider sont inlinés dans un Record typé par locale, sans useTranslations. | [#35eb2e637ab761d4-1] |
| `frontend-app:global-error.tsx:100-101` | La locale est lue depuis le premier segment de window.location.pathname, avec repli sur DEFAULT_LOCALE si le segment n'est pas supporté ou si window est absent. | [#eb3039b22898acac-1] |
| `frontend-app:global-error.tsx:108-109` | Le composant d'erreur de premier niveau est un client component qui reçoit error typé Error avec digest optionnel et une fonction reset. | [#a9a3bfc89eae1e73-3] |
| `frontend-app:global-error.tsx:112` | La table de messages retombe sur le jeu fr lorsque la locale résolue n'a pas d'entrée. | [#a9a3bfc89eae1e73-4] |
| `frontend-app:global-error.tsx:115` | Commentaire : Le console.error du filet d'erreur est appelé dans un useEffect et précédé d'un commentaire eslint-disable-next-line no-restricted-syntax qui motive le log. | [#a9a3bfc89eae1e73-2] |
| `frontend-app:global-not-found-screen.tsx:93` | Les libellés de l'écran 404 sont une copie typée par Record<Locale, NotFoundMessages> des clés notFound de errors.json, à resynchroniser à la main. | [#da27a7b668cd53e5-1] |
| `frontend-app:global-not-found-screen.tsx:136` | La locale d'un composant client prérendu est lue avec useHydrated, la valeur DEFAULT_LOCALE étant utilisée au premier rendu pour éviter un mismatch d'hydratation. | [#f61a1c6de3075432-2] |
| `frontend-app:global-not-found-screen.tsx:159` | Commentaire : Les liens d'un document hors layout racine utilisent une balise a et non le composant Link, afin de ne pas naviguer depuis un arbre sans providers. | [#5ea3a89d38aab0d1-1] |
| `frontend-app:global-not-found.tsx:57-60` | Un Server Component qui ne rend que un composant client exporte la constante metadata typée Metadata, et la logique client reste dans un fichier séparé. | [#46f33cf1a8b53c3e-1] |
| `frontend-app:layout.tsx:28-31` | Le layout racine exporte un objet metadata littéral (title et description) et ne rend que ses enfants, le html étant porté par le layout de locale. | [#fe8ef626f0c0e295-1] |
| `frontend-app:layout.tsx:33-35` | Le layout racine est transparent : il reçoit children typé ReactNode et retourne children sans markup. | [#3da9c19469b4af1b-1] |
| `frontend-app:page.tsx:6-8` | La page racine redirige avec la fonction redirect de next/navigation vers la racine de locale /fr, appelée dans un composant non asynchrone. | [#40791f61e3c318fa-1] |
