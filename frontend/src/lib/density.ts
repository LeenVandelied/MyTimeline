/**
 * #86 / #898 — Densité d'affichage : SOURCE UNIQUE de la clé, des valeurs et du
 * script d'application précoce.
 *
 * Module SANS dépendance (ni alias `@/`, ni zod) : il est importé par le hook
 * `useDensity`, par le layout serveur `app/[locale]/layout.tsx` ET par la spec
 * Playwright `e2e/sprint-121-density-persisted.spec.ts` — une clé recopiée en dur
 * dans l'une des trois pourrait diverger en silence. `@/types/settings` le
 * réexporte pour les consommateurs historiques.
 */

export const DENSITY_OPTIONS = ['compact', 'normal', 'comfortable'] as const
export type DensityOption = (typeof DENSITY_OPTIONS)[number]

/** Clé localStorage de la densité (non-PII, cf. DEC-S9-002 : jamais de PII ici). */
export const DENSITY_STORAGE_KEY = 'mt-density'
export const DEFAULT_DENSITY: DensityOption = 'normal'

/** Attribut de `<html>` lu par `globals.css` (`html[data-density='…']`). */
export const DENSITY_ATTRIBUTE = 'data-density'

export function isDensity(value: string | null): value is DensityOption {
  return value !== null && (DENSITY_OPTIONS as readonly string[]).includes(value)
}

/**
 * #898 — Script inline exécuté par le navigateur AVANT l'hydratation (même rôle que
 * celui de next-themes pour le thème) : lit la densité persistée et la pose sur
 * `<html>`. Sans lui, seule la section Préférences (seule à monter `useDensity`)
 * appliquait le choix : après un rechargement, toutes les autres pages
 * s'affichaient en densité normale.
 *
 * Valeur absente, invalide, ou `localStorage` inaccessible (navigation privée
 * stricte, stockage bloqué) → `DEFAULT_DENSITY`. Le script est généré depuis les
 * constantes ci-dessus (JSON.stringify : aucune interpolation de donnée
 * utilisateur) et écrit en ES5 : il s'exécute tel quel, hors bundle.
 */
export const DENSITY_INIT_SCRIPT = [
  '(function(){',
  `var d=${JSON.stringify(DEFAULT_DENSITY)};`,
  'try{',
  `var v=window.localStorage.getItem(${JSON.stringify(DENSITY_STORAGE_KEY)});`,
  `if(${JSON.stringify(DENSITY_OPTIONS)}.indexOf(v)!==-1){d=v}`,
  '}catch(e){}',
  `document.documentElement.setAttribute(${JSON.stringify(DENSITY_ATTRIBUTE)},d)`,
  '})()',
].join('')
