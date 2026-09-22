/**
 * #713 — Pont i18n de la couche transport (hors React).
 *
 * POURQUOI CE MODULE EXISTE.
 * `apiClient.ts` est un singleton de module, pas un composant : `useTranslations`
 * y est inaccessible (règle des hooks). Et `loadMessages` (`frontend/i18n.ts`)
 * utilise `node:fs`/`node:path` — c'est du SERVEUR, inutilisable depuis un module
 * embarqué dans le bundle client. Les 4 messages d'erreur réseau étaient donc
 * écrits en français EN DUR dans l'intercepteur : un utilisateur `en`/`de`/`es`
 * les voyait en français.
 *
 * On applique ici le MÊME motif que `networkStatus.ts` (#76) : un petit registre
 * de module que React ALIMENTE (`ApiErrorTranslatorBridge`, monté sous le
 * `NextIntlClientProvider` de `app/[locale]/layout.tsx`) et que la couche
 * transport CONSOMME (`translateApiError`). Aucune dépendance React ici.
 *
 * SOURCE UNIQUE DES LIBELLÉS = `public/locales/<locale>/errors.json`.
 * La table `FR_FALLBACK` ci-dessous n'est PAS une seconde source : c'est un filet
 * pour les instants où le registre n'est pas encore alimenté (rendu serveur,
 * erreur survenant avant le montage du pont, test unitaire isolé). Sa
 * synchronisation avec `errors.json` est VÉRIFIÉE par `apiErrorMessages.test.ts`,
 * qui lit le JSON `fr` et compare valeur par valeur — toute dérive rougit.
 */

/**
 * Clés relatives au namespace `errors` (= `public/locales/<locale>/errors.json`).
 *
 * `forbidden` (403) pointe sur une clé DÉDIÉE (`auth.forbidden`, « accès
 * refusé »), jamais sur `auth.sessionExpired` : un 403 vise un utilisateur
 * AUTHENTIFIÉ à qui l'on refuse une ressource, pas une session morte (#733).
 * Ne pas confondre avec le groupe `errors.forbidden` (title/description/backHome),
 * qui sert l'écran plein page `app/[locale]/error.tsx`, pas le toast.
 */
export const API_ERROR_KEYS = {
  /** 400 — échec de validation générique (formulaires sans gestion inline). */
  validation: 'validation.error',
  /** 401 — session expirée, suivie d'une redirection vers /[locale]/login. */
  sessionExpired: 'auth.sessionExpired',
  /** 403 — accès refusé, toast SANS redirection (#733). */
  forbidden: 'auth.forbidden',
  /** 500 — erreur serveur. */
  serverError: 'server.error',
} as const

export type ApiErrorKey = (typeof API_ERROR_KEYS)[keyof typeof API_ERROR_KEYS]

/**
 * Repli français, strictement identique aux valeurs de
 * `public/locales/fr/errors.json` (assertion dans le test compagnon).
 */
const FR_FALLBACK: Record<ApiErrorKey, string> = {
  'validation.error': 'Erreur de validation, veuillez vérifier vos données.',
  'auth.sessionExpired': 'Votre session a expiré. Veuillez vous reconnecter',
  'auth.forbidden': "Accès refusé : vous n'avez pas l'autorisation d'effectuer cette action.",
  'server.error': 'Erreur serveur. Veuillez réessayer plus tard',
}

type Translator = (key: ApiErrorKey) => string

let translator: Translator | null = null

/**
 * Enregistre (ou retire, avec `null`) le traducteur du namespace `errors`.
 * Appelé exclusivement par `ApiErrorTranslatorBridge`.
 */
export const setApiErrorTranslator = (next: Translator | null): void => {
  translator = next
}

/**
 * Rend le libellé traduit d'une erreur réseau, avec repli français.
 *
 * Trois protections, toutes motivées par un défaut déjà constaté au dépôt :
 *  1. registre non alimenté → repli (jamais de chaîne vide) ;
 *  2. `t()` qui lève (message absent en mode strict) → repli ;
 *  3. `t()` qui rend le CHEMIN DE CLÉ BRUT — c'est le `getMessageFallback` par
 *     défaut de next-intl, exactement le défaut de #441 où
 *     « deleteDialog.product.title » s'affichait en toutes lettres à
 *     l'utilisateur. On ne laisse JAMAIS une clé remonter dans un toast.
 */
export const translateApiError = (key: ApiErrorKey): string => {
  if (translator === null) return FR_FALLBACK[key]
  try {
    const message = translator(key)
    if (typeof message !== 'string' || message.length === 0) return FR_FALLBACK[key]
    // `errors.validation.error` comme `validation.error` : les deux formes du
    // chemin brut que next-intl peut rendre selon le namespace de montage.
    if (message === key || message.endsWith(`.${key}`)) return FR_FALLBACK[key]
    return message
  } catch {
    return FR_FALLBACK[key]
  }
}
