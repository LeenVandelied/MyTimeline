'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { setApiErrorTranslator, type ApiErrorKey } from './apiErrorMessages'

/**
 * #713 — Alimente le registre de `apiErrorMessages.ts` avec le traducteur du
 * namespace `errors` de la locale courante.
 *
 * Ne rend RIEN (`null`) : c'est un pont, pas un élément d'interface. Il doit être
 * monté SOUS le `NextIntlClientProvider` de `app/[locale]/layout.tsx` — comme
 * `OfflineBanner` (#76), et pour la même raison : `useTranslations` hors provider
 * lève au prerender SSG (cf. PIT-S26-001).
 *
 * Il est placé AVANT `NetworkStatusProvider` dans l'arbre : React commet les
 * effets des frères dans l'ordre de l'arbre, donc le registre est alimenté avant
 * que les effets des sous-arbres suivants ne déclenchent la moindre requête.
 * Le nettoyage remet `null` — le repli français reprend, jamais une clé brute.
 */
export function ApiErrorTranslatorBridge(): null {
  const t = useTranslations('errors')

  useEffect(() => {
    setApiErrorTranslator((key: ApiErrorKey) => t(key))
    return () => setApiErrorTranslator(null)
  }, [t])

  return null
}
