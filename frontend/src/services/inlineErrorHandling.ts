import type { AxiosRequestConfig } from 'axios'

/**
 * #761 — Opt-out PAR REQUÊTE du toast global de l'intercepteur (`apiClient.ts`).
 *
 * Règle « un seul signalement » (#713 pour le 400) : un écran qui rend lui-même
 * une erreur HTTP ne doit pas la voir signalée une seconde fois par un toast.
 *
 * POURQUOI PAR REQUÊTE ET PAS PAR URL (contrairement à `INLINE_VALIDATION_ENDPOINTS`) :
 * une liste d'URL ferait taire le toast pour TOUT appelant présent ou futur de la
 * route. `POST/PATCH /products` et `/categories` peuvent demain être appelés depuis
 * un écran sans gestion inline du 403 : il deviendrait muet (régression silencieuse).
 * Ici, c'est l'appel lui-même qui déclare « j'affiche ce statut », et seul l'écran
 * qui le fait réellement passe l'option.
 *
 * POURQUOI LE TYPE EST RESTREINT À 403 ET 500 : le 401 doit TOUJOURS rediriger vers
 * la page de connexion (session expirée) — un écran ne peut pas le « gérer inline ».
 * Le 400 a sa propre règle, par URL (#713). Élargir ce type est une décision, pas un
 * détail : chaque statut ajouté doit être lu dans la branche correspondante de
 * l'intercepteur, et nulle part ailleurs.
 *
 * #833 — 500 ajouté pour `PUT /me/preferences` (cf. `HANDLES_SERVER_ERROR_INLINE`).
 * Le 409 n'y figure PAS : l'intercepteur n'a aucune branche 409 (aucun toast,
 * mesuré au S112), un 409 dans ce type ne serait lu nulle part. Ajouter une branche
 * 409 à l'intercepteur = ajouter 409 ici ET le lire dans cette branche.
 * #838 — L'opt-out 500 coupe le toast ET le bus réseau (#76,
 * `networkStatusStore.reportServerError`, qui monte la bannière `OfflineBanner`) pour
 * CETTE requête : un échec déclaré sans conséquence visible ne doit pas afficher
 * « erreur serveur ». Les autres requêtes continuent d'alimenter le bus (la santé
 * serveur reste globale) ; l'opt-out ne vaut que pour le 500, pas pour 502/503/504.
 * Le 403 opt-out, lui, n'a jamais touché le bus (seules les ≥ 500 l'alimentent).
 */
export type InlineHandledStatus = 403 | 500

declare module 'axios' {
  interface AxiosRequestConfig {
    /**
     * #761 — statuts que l'appelant affiche lui-même : l'intercepteur ne les toaste pas
     * (#838 : et un 500 déclaré n'alimente pas non plus le bus réseau `OfflineBanner`).
     */
    inlineHandledStatuses?: readonly InlineHandledStatus[]
  }
}

/** Options transportées écran → hook → service → config axios. */
export type InlineErrorOptions = Pick<AxiosRequestConfig, 'inlineHandledStatuses'>

/**
 * À passer UNIQUEMENT par un écran qui affiche `errors.forbidden` (ou équivalent)
 * dans son `catch` sur un 403. Contrat identique à `INLINE_VALIDATION_ENDPOINTS` :
 * on ne se retire du toast global qu'en prouvant qu'on affiche l'erreur soi-même.
 */
export const HANDLES_FORBIDDEN_INLINE: InlineErrorOptions = Object.freeze({
  inlineHandledStatuses: Object.freeze([403] as const),
})

/**
 * #833 — À passer UNIQUEMENT par un appelant pour qui l'échec serveur est SANS
 * conséquence visible et déjà traité : aujourd'hui `persistThemeChoice`
 * (`AuthContext.tsx`), qui garde le thème choisi localement et journalise l'échec.
 * Un appelant qui laisse l'utilisateur sans retour (formulaire, suppression…) ne
 * doit PAS s'en servir : le toast « erreur serveur » serait son seul signalement.
 * #838 — l'option tait AUSSI la bannière `OfflineBanner` sur ce 500 (bus réseau #76
 * non alimenté) : raison de plus pour la réserver aux échecs sans conséquence.
 */
export const HANDLES_SERVER_ERROR_INLINE: InlineErrorOptions = Object.freeze({
  inlineHandledStatuses: Object.freeze([500] as const),
})

/** Vrai si la requête a déclaré rendre ce statut inline. */
export const handlesStatusInline = (
  config: AxiosRequestConfig | undefined,
  status: InlineHandledStatus,
): boolean => config?.inlineHandledStatuses?.includes(status) === true
