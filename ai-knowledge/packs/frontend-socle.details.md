# Annexe : frontend-socle

## Index des fichiers {#files-index}

| Fichier | Faits | Sortes |
|---|---|---|
| `mytimeline:frontend/src/i18n/locales.ts` | 4 | config 2, convention 2 |
| `mytimeline:frontend/src/components/ui/avatar.tsx` | 3 | convention 3 |
| `mytimeline:frontend/src/components/ui/tooltip.tsx` | 3 | convention 3 |
| `mytimeline:frontend/src/services/ApiErrorTranslatorBridge.tsx` | 3 | convention 3 |
| `mytimeline:frontend/src/services/sessionService.ts` | 3 | external_call 2, convention 1 |
| `mytimeline:frontend/app/[locale]/(app)/products/[productId]/loading.test.tsx` | 2 | test_case 2 |
| `mytimeline:frontend/app/[locale]/page.tsx` | 2 | convention 2 |
| `mytimeline:frontend/src/__tests__/smoke.test.tsx` | 2 | suspicious 1, test_case 1 |
| `mytimeline:frontend/src/components/legal/legal-disclaimer.tsx` | 2 | convention 2 |
| `mytimeline:frontend/src/components/theme-provider.tsx` | 2 | convention 2 |
| `mytimeline:frontend/src/components/timeline/Cursor.stories.tsx` | 2 | convention 2 |
| `mytimeline:frontend/src/components/timeline/DateStamp.stories.tsx` | 2 | convention 2 |
| `mytimeline:frontend/src/components/timeline/Ruler.stories.tsx` | 2 | convention 2 |
| `mytimeline:frontend/src/components/ui/checkbox.stories.tsx` | 2 | convention 2 |
| `mytimeline:frontend/src/components/ui/dialog.stories.tsx` | 2 | convention 2 |
| `mytimeline:frontend/src/components/ui/icon-button.tsx` | 2 | convention 2 |
| `mytimeline:frontend/src/components/ui/input.stories.tsx` | 2 | convention 2 |
| `mytimeline:frontend/src/components/ui/input.tsx` | 2 | convention 2 |
| `mytimeline:frontend/src/components/ui/table.tsx` | 2 | convention 2 |
| `mytimeline:frontend/src/components/ui/tabs.stories.tsx` | 2 | convention 2 |
| `mytimeline:frontend/src/components/ui/tag.stories.tsx` | 2 | convention 2 |
| `mytimeline:frontend/src/components/ui/tag.tsx` | 2 | convention 2 |
| `mytimeline:frontend/src/components/ui/tooltip.stories.tsx` | 2 | convention 2 |
| `mytimeline:frontend/src/hooks/useArchivedProducts.ts` | 2 | convention 2 |
| `mytimeline:frontend/src/hooks/useCategories.ts` | 2 | convention 2 |
| `mytimeline:frontend/src/hooks/useCreateCategory.ts` | 2 | convention 2 |
| `mytimeline:frontend/src/lib/safe-error.ts` | 2 | convention 2 |
| `mytimeline:frontend/src/types/user.ts` | 2 | convention 2 |
| `mytimeline:frontend/app/[locale]/home/page.tsx` | 1 | convention 1 |
| `mytimeline:frontend/app/page.tsx` | 1 | convention 1 |
| `mytimeline:frontend/src/components/dashboard/index.ts` | 1 | convention 1 |
| `mytimeline:frontend/src/components/dashboard/lib.ts` | 1 | convention 1 |
| `mytimeline:frontend/src/components/layout/index.ts` | 1 | convention 1 |
| `mytimeline:frontend/src/components/settings/mobile/chapters.ts` | 1 | convention 1 |
| `mytimeline:frontend/src/components/settings/touchTarget.ts` | 1 | convention 1 |
| `mytimeline:frontend/src/components/timeline/useTimelineMobileSelection.ts` | 1 | convention 1 |
| `mytimeline:frontend/src/components/ui/avatar.stories.tsx` | 1 | convention 1 |
| `mytimeline:frontend/src/components/ui/card.stories.tsx` | 1 | convention 1 |
| `mytimeline:frontend/src/components/ui/label.tsx` | 1 | convention 1 |
| `mytimeline:frontend/src/components/ui/radio.stories.tsx` | 1 | convention 1 |
| `mytimeline:frontend/src/components/ui/radio.tsx` | 1 | convention 1 |
| `mytimeline:frontend/src/components/ui/switch.stories.tsx` | 1 | convention 1 |
| `mytimeline:frontend/src/components/ui/switch.tsx` | 1 | convention 1 |
| `mytimeline:frontend/src/components/ui/textarea.stories.tsx` | 1 | convention 1 |
| `mytimeline:frontend/src/components/ui/textarea.tsx` | 1 | convention 1 |
| `mytimeline:frontend/src/components/ui/toast.stories.tsx` | 1 | convention 1 |
| `mytimeline:frontend/src/hooks/useAuth.ts` | 1 | convention 1 |
| `mytimeline:frontend/src/i18n/locales.test.ts` | 1 | test_case 1 |
| `mytimeline:frontend/src/lib/state-errors.test.ts` | 1 | test_case 1 |
| `mytimeline:frontend/src/lib/utils.ts` | 1 | convention 1 |

## Lignes rétrogradées {#t-demoted_lines}

| Section | Ligne | Motif |
|---|---|---|
| rules | - Les stories déclarent meta avec satisfies Meta, et les dates y sont fixes. [#65c51a62d2eb1c32-1] [#4b86dd770a00ef4c-1] | deducible |

## Faits suspects {#t-suspicious}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:frontend/src/__tests__/smoke.test.tsx:4-7` | Le commentaire demande de supprimer ce test smoke dès qu'un vrai test composant existe. | [#ccac130b4ac9cf23-1] |

## Appels externes {#t-external_call}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:frontend/src/services/sessionService.ts:14-17` | Les services appellent `apiClient` par chemin relatif sans préfixe `/api`, par exemple `/sessions`. | [#c8e7542069dbe36c-1] |
| `mytimeline:frontend/src/services/sessionService.ts:19-25` | Les services de suppression renvoient `Promise<void>` et n'exploitent pas la réponse HTTP. | [#094f62dfc66d6733-1] |

## Configuration {#t-config}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:frontend/src/i18n/locales.ts:16` | Les locales supportées sont déclarées dans une constante `as const` unique, dont le type `Locale` est dérivé. | [#81956d761fae945d-1] |
| `mytimeline:frontend/src/i18n/locales.ts:20` | La locale par défaut est `fr`, typée `Locale`. | [#2681e154ca18518c-1] |

## Conventions {#t-convention}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:frontend/app/[locale]/home/page.tsx:14-17` | Une route legacy redirige de façon permanente vers la racine de locale avec `permanentRedirect`, en reprenant le paramètre `locale`. | [#cba7431c31861d84-1] |
| `mytimeline:frontend/app/[locale]/page.tsx:5` | La feuille de style d'une page de landing s'importe dans le fichier de route et non dans le layout de locale. | [#2325b843f28a7d18-1] |
| `mytimeline:frontend/app/[locale]/page.tsx:15-19` | Une page de route est une fonction async qui attend `params` (Promise), puis passe l'objet obtenu à son composant de vue. | [#2325b843f28a7d18-2] |
| `mytimeline:frontend/app/page.tsx:7` | La racine de l'application redirige vers la locale par défaut avec `redirect` de next/navigation, depuis une fonction par défaut synchrone. | [#43b4bb8adb5cf7f6-1] |
| `mytimeline:frontend/src/components/dashboard/index.ts:6-7` | Le barrel du dashboard réexporte chaque composant nommé, puis son type de props par une ligne `export type` distincte. | [#1ea1cef586e27163-1] |
| `mytimeline:frontend/src/components/dashboard/lib.ts:10` | Un helper partagé entre composants est défini dans `@/lib/` et ré-exporté depuis le fichier `lib.ts` du dashboard. | [#f8c44bd458b850a9-1] |
| `mytimeline:frontend/src/components/layout/index.ts:4-5` | Le barrel du shell applicatif réexporte le composant et son type de props, sur le même modèle que le dashboard. | [#4c4a6ad8222ac4ce-1] |
| `mytimeline:frontend/src/components/legal/legal-disclaimer.tsx:6` | Javadoc : Le texte informatif porte `role="note"` et non `role="alert"`. | [#aa086b7fd21197d3-1] |
| `mytimeline:frontend/src/components/legal/legal-disclaimer.tsx:10-19` | Le composant d'avertissement rend un paragraphe avec `data-testid` et des classes de tokens de couleur, et reçoit son texte en `children` de type `string`. | [#aa086b7fd21197d3-2] |
| `mytimeline:frontend/src/components/settings/mobile/chapters.ts:5-12` | La liste des chapitres mobiles est une constante `readonly` typée par le type union `ChapterId`. | [#2c5f8a021b86d14d-1] |
| `mytimeline:frontend/src/components/settings/touchTarget.ts:9-12` | Les constantes de cible tactile des réglages sont des alias réexportés depuis `@/lib/touchTarget`. | [#e6752fdbca75023a-1] |
| `mytimeline:frontend/src/components/theme-provider.tsx:15` | Javadoc : L'ordre des providers imposé au layout racine est Theme, puis Auth, puis Query. | [#aeab71ba3df29aba-1] |
| `mytimeline:frontend/src/components/theme-provider.tsx:22-28` | Le wrapper de next-themes force `storageKey` à la constante `THEME_STORAGE_KEY` et retire cette prop des props acceptées. | [#aeab71ba3df29aba-2] |
| `mytimeline:frontend/src/components/timeline/Cursor.stories.tsx:8-25` | Une story Storybook déclare `meta` avec `satisfies Meta<typeof Cursor>`, le tag `autodocs`, puis `type Story = StoryObj<typeof meta>`. | [#65c51a62d2eb1c32-1] |
| `mytimeline:frontend/src/components/timeline/Cursor.stories.tsx:12-18` | Le décorateur fournit le parent `relative` à hauteur fixe exigé par le composant positionné en absolu. | [#65c51a62d2eb1c32-2] |
| `mytimeline:frontend/src/components/timeline/DateStamp.stories.tsx:9` | Les stories à date utilisent une date fixe passée en `now`, et non la date du jour. | [#4b86dd770a00ef4c-1] |
| `mytimeline:frontend/src/components/timeline/DateStamp.stories.tsx:27` | La story DateStamp suit le modèle `meta` avec `satisfies Meta<typeof DateStamp>`. | [#4b86dd770a00ef4c-2] |
| `mytimeline:frontend/src/components/timeline/Ruler.stories.tsx:3` | Les données de story viennent d'une fabrique partagée `makeDays` importée depuis `./fixtures`. | [#b3e11fbc485c8491-1] |
| `mytimeline:frontend/src/components/timeline/Ruler.stories.tsx:28` | La story Ruler suit le modèle `meta` avec `satisfies Meta<typeof Ruler>`. | [#b3e11fbc485c8491-2] |
| `mytimeline:frontend/src/components/timeline/useTimelineMobileSelection.ts:22-28` | Le hook d'état partagé retourne un objet typé par l'interface `TimelineMobileSelection` et expose un export par défaut en plus de l'export nommé. | [#38850896c676cb4c-1] |
| `mytimeline:frontend/src/components/ui/avatar.stories.tsx:8-12` | La story d'un composant UI déclare les props à valeurs fermées en `argTypes` avec `control` de type `inline-radio`. | [#876cc45cecaaa55d-1] |
| `mytimeline:frontend/src/components/ui/avatar.tsx:17` | Un composant UI d'affichage est un `React.forwardRef` typé par son interface de props, et fusionne `className` via `cn` après les classes de base `mt-*`. | [#9ada093f42c5012f-1] |
| `mytimeline:frontend/src/components/ui/avatar.tsx:36` | Sans `alt` explicite, le span d'initiales porte `aria-hidden`, et l'image reçoit `alt` à chaîne vide par défaut. | [#9ada093f42c5012f-2] |
| `mytimeline:frontend/src/components/ui/avatar.tsx:41` | Chaque composant forwardRef déclare sa propriété `displayName` égale à son nom. | [#60c29c7e21afaf68-1] |
| `mytimeline:frontend/src/components/ui/card.stories.tsx:10-14` | La story Card suit le modèle `meta` avec `satisfies Meta<typeof Card>` et le tag `autodocs`. | [#5d70fac2f158dad8-1] |
| `mytimeline:frontend/src/components/ui/checkbox.stories.tsx:9-12` | Javadoc : Le focus de la checkbox n'utilise pas de `ring-*` local, le contour `:focus-visible` du DS étant l'unique indicateur de focus. | [#cb3278759c5c8156-1] |
| `mytimeline:frontend/src/components/ui/checkbox.stories.tsx:17` | La story Checkbox suit le modèle `meta` avec `satisfies Meta<typeof Checkbox>`. | [#cb3278759c5c8156-2] |
| `mytimeline:frontend/src/components/ui/dialog.stories.tsx:21` | La story Dialog suit le modèle `meta` avec `satisfies Meta<typeof Dialog>`. | [#73cb66db92571ef7-1] |
| `mytimeline:frontend/src/components/ui/dialog.stories.tsx:29-31` | Le déclencheur du dialog est un `DialogTrigger` avec `asChild` qui enveloppe un `Button`. | [#73cb66db92571ef7-2] |
| `mytimeline:frontend/src/components/ui/icon-button.tsx:7` | Javadoc : Un bouton à icône seule exige un `aria-label` dans son typage de props, faute de libellé visible. | [#9eaf3991c4b071cb-1] |
| `mytimeline:frontend/src/components/ui/icon-button.tsx:16-17` | Le bouton icône est un `forwardRef` dont `type` vaut `button` par défaut et dont la taille et la variante ont des valeurs par défaut. | [#9eaf3991c4b071cb-2] |
| `mytimeline:frontend/src/components/ui/input.stories.tsx:14` | La story Input suit le modèle `meta` avec `satisfies Meta<typeof Input>`. | [#ac534ed2921c2efc-1] |
| `mytimeline:frontend/src/components/ui/input.stories.tsx:27-30` | Un champ DS complet s'écrit avec un `label` de classe `mt-field`, enveloppant un span `mt-label` et un span `mt-hint`. | [#ac534ed2921c2efc-2] |
| `mytimeline:frontend/src/components/ui/input.tsx:5` | Un champ de saisie est un `React.forwardRef` avec `displayName`, qui place `className` via `cn` après les classes de base. | [#ad3854bcdae53869-1] |
| `mytimeline:frontend/src/components/ui/input.tsx:8-14` | Commentaire : La cible tactile mobile passe par la variante `max-md:h-11`, la hauteur de bureau restant `h-9`. | [#ad3854bcdae53869-2] |
| `mytimeline:frontend/src/components/ui/label.tsx:9-19` | Le label Radix est encapsulé dans un `forwardRef` avec des variantes `cva`, et reprend `displayName` de la primitive. | [#2e070c9c6ebee0b2-1] |
| `mytimeline:frontend/src/components/ui/radio.stories.tsx:8` | La story Radio suit le modèle `meta` avec `satisfies Meta<typeof Radio>`. | [#dc4d68b87486078b-1] |
| `mytimeline:frontend/src/components/ui/radio.tsx:13-21` | Le radio enveloppe un input natif dans un `label` de classe `mt-radio`, avec un point décoratif marqué `aria-hidden`. | [#665ff080f9a3c04c-1] |
| `mytimeline:frontend/src/components/ui/switch.stories.tsx:8` | La story Switch suit le modèle `meta` avec `satisfies Meta<typeof Switch>`. | [#0532efffeba381a3-1] |
| `mytimeline:frontend/src/components/ui/switch.tsx:15-19` | Le switch porte `role="switch"` sur un input checkbox natif, et son habillage est un span `mt-switch__track` contenant un `mt-switch__thumb`. | [#11594428c30abc99-1] |
| `mytimeline:frontend/src/components/ui/table.tsx:8` | Javadoc : Les tableaux DS portent `scope="col"` sur les `th` et un `aria-label` sur la table. | [#602974f8c6e4d014-1] |
| `mytimeline:frontend/src/components/ui/table.tsx:11-13` | Le composant table est un `forwardRef` qui pose la classe `mt-table` puis fusionne `className` via `cn`. | [#602974f8c6e4d014-2] |
| `mytimeline:frontend/src/components/ui/tabs.stories.tsx:8` | La story Tabs suit le modèle `meta` avec `satisfies Meta<typeof Tabs>`. | [#f620f44ee33dee02-1] |
| `mytimeline:frontend/src/components/ui/tabs.stories.tsx:15` | La story Tabs passe `aria-label` et un tableau `items` de paires `value` et `label` au composant. | [#f620f44ee33dee02-2] |
| `mytimeline:frontend/src/components/ui/tag.stories.tsx:8` | La story Tag suit le modèle `meta` avec `satisfies Meta<typeof Tag>`. | [#e306e8e6e07a3f83-1] |
| `mytimeline:frontend/src/components/ui/tag.stories.tsx:15-17` | Javadoc : Les pastilles de couleur des stories utilisent les tokens `--color-evt-*` passés en `swatch`. | [#e306e8e6e07a3f83-2] |
| `mytimeline:frontend/src/components/ui/tag.tsx:9` | Javadoc : Le bouton de retrait n'apparaît que si `onRemove` est fourni, et exige un libellé d'accessibilité `removeLabel`. | [#acbc77f78d698fd3-1] |
| `mytimeline:frontend/src/components/ui/tag.tsx:18` | Le tag est un `forwardRef` sur un `span` `mt-tag`, avec `removeLabel` valant `Retirer` par défaut. | [#acbc77f78d698fd3-2] |
| `mytimeline:frontend/src/components/ui/textarea.stories.tsx:8` | Les stories de textarea déclarent le booléen `invalid` en `argTypes` avec `control` de type `boolean`. | [#e21589df0f2c1bc4-1] |
| `mytimeline:frontend/src/components/ui/textarea.tsx:17-18` | Le prop `invalid` pilote `aria-invalid`, absent quand la valeur est fausse, et ajoute la classe `mt-textarea--invalid`. | [#541483e5d9dff22c-1] |
| `mytimeline:frontend/src/components/ui/toast.stories.tsx:11` | Les variantes d'un toast sont listées en `argTypes` avec `control` de type `inline-radio`. | [#d58ff49e296127b3-1] |
| `mytimeline:frontend/src/components/ui/tooltip.stories.tsx:15-19` | La story Tooltip enveloppe le rendu dans un décorateur qui applique un `padding` de 48 px en haut et en bas et 24 px sur les côtés. | [#8bc1636928db7edb-1] |
| `mytimeline:frontend/src/components/ui/tooltip.stories.tsx:21` | La story Tooltip suit le modèle `meta` avec `satisfies Meta<typeof Tooltip>`. | [#8bc1636928db7edb-2] |
| `mytimeline:frontend/src/components/ui/tooltip.tsx:9` | Javadoc : La bulle du tooltip est révélée par CSS au survol et au focus clavier `:focus-within`. | [#6ffa261504174647-1] |
| `mytimeline:frontend/src/components/ui/tooltip.tsx:21` | Commentaire : L'identifiant du tooltip est produit par `React.useId`, et non par un compteur de module. | [#6ffa261504174647-2] |
| `mytimeline:frontend/src/components/ui/tooltip.tsx:24` | Le tooltip clone son enfant immédiat en lui passant `aria-describedby` pointant vers l'identifiant de la bulle. | [#6ffa261504174647-3] |
| `mytimeline:frontend/src/hooks/useArchivedProducts.ts:11-12` | Javadoc : Les clés de requête partagent un préfixe commun pour que les mutations les invalident ensemble. | [#b485fe301f167807-1] |
| `mytimeline:frontend/src/hooks/useArchivedProducts.ts:17` | Un hook de requête lit sa clé dans `queryKeys` centralisé et désactive la requête tant que `userId` est absent, via `enabled: Boolean(userId)`. | [#b485fe301f167807-2] |
| `mytimeline:frontend/src/hooks/useAuth.ts:7` | Le hook `useAuth` est un simple ré-export du contexte `AuthContext`, sans état propre. | [#4f8a95cc0331b93e-1] |
| `mytimeline:frontend/src/hooks/useCategories.ts:14` | Javadoc : Les hooks TanStack Query v5 utilisent la forme objet et `gcTime`, et non `cacheTime`. | [#e688fe2a35b9cc5c-1] |
| `mytimeline:frontend/src/hooks/useCategories.ts:19-24` | Le hook de liste de catégories appelle `useQuery` avec la clé `queryKeys.categories.all` et un flag `enabled` paramétrable, valant true par défaut. | [#e688fe2a35b9cc5c-2] |
| `mytimeline:frontend/src/hooks/useCreateCategory.ts:16-17` | Javadoc : Le hook ne capture pas l'erreur de la mutation, qui remonte au composant appelant. | [#434468f4e9a0a882-1] |
| `mytimeline:frontend/src/hooks/useCreateCategory.ts:23-28` | Une mutation TanStack est écrite en forme objet avec `mutationFn`, et son `onSuccess` invalide le préfixe de clés `queryKeys.categories.all`. | [#434468f4e9a0a882-2] |
| `mytimeline:frontend/src/i18n/locales.ts:11` | Javadoc : Le module de locales est pur, sans dépendance à Node fs ou path, pour être importé par le middleware. | [#8ccfe3ce2ea826e6-1] |
| `mytimeline:frontend/src/i18n/locales.ts:23-25` | Le garde de type `isSupportedLocale` teste l'appartenance à `SUPPORTED_LOCALES` et renvoie un prédicat `value is Locale`. | [#47573f63ece3179c-1] |
| `mytimeline:frontend/src/lib/safe-error.ts:4` | Javadoc : Les erreurs ne sont jamais journalisées brutes, on passe par `safeErrorMessage` qui ne garde que le statut HTTP et le message. | [#8bf24c9c5c97faf3-1] |
| `mytimeline:frontend/src/lib/safe-error.ts:22` | `safeErrorMessage` renvoie `[statut] message` lorsque la réponse porte un statut HTTP, sinon le seul message. | [#8bf24c9c5c97faf3-2] |
| `mytimeline:frontend/src/lib/utils.ts:4-6` | Le helper `cn` combine `clsx` et `twMerge` pour fusionner les classes Tailwind. | [#7088e14a0226bdfe-1] |
| `mytimeline:frontend/src/services/ApiErrorTranslatorBridge.tsx:12` | Javadoc : Le pont doit être monté sous le `NextIntlClientProvider` du layout de locale, avant `NetworkStatusProvider`. | [#3d7ba2b79879606f-1] |
| `mytimeline:frontend/src/services/ApiErrorTranslatorBridge.tsx:21-30` | Le pont client ne rend rien (`null`) et alimente le registre des erreurs à partir de `useTranslations('errors')` dans un `useEffect`. | [#3d7ba2b79879606f-2] |
| `mytimeline:frontend/src/services/ApiErrorTranslatorBridge.tsx:26` | Le cleanup de l'effet remet le registre à `null`. | [#3d7ba2b79879606f-3] |
| `mytimeline:frontend/src/services/sessionService.ts:16` | La réponse d'un service est validée par un schéma Zod importé de `@/types/settings` avec `parse`. | [#03037b579b39b673-1] |
| `mytimeline:frontend/src/types/user.ts:13-17` | Commentaire : Un champ nullable du schéma Zod se déclare par `.nullable()`, et non par `.optional()`, la clé étant toujours présente. | [#70fc4bcad53ff01d-1] |
| `mytimeline:frontend/src/types/user.ts:20` | Le type TypeScript d'un schéma Zod est dérivé par `z.infer<typeof UserSchema>`. | [#b0cbae33933771ad-1] |
