'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { AlertTriangle, ShieldAlert } from 'lucide-react'

import { StateScreen, stateActionPrimary, stateActionSecondary } from '@/components/shared/StateScreen'
import { isForbiddenError } from '@/lib/state-errors'

/**
 * #57 — Crash boundary React du segment `[locale]` (remplace la page blanche).
 * `"use client"` OBLIGATOIRE et props `{ error, reset }` imposées par Next :
 * sans `reset`, l'écran 500 ne peut pas relancer le rendu.
 *
 * Deux branches (pas de `forbidden.tsx` natif sans flag expérimental) :
 *  - 403 : erreur dont message/digest matche `403|forbidden` → écran « accès
 *    refusé », action = retour accueil (pas de retry, réessayer ne lèvera pas
 *    l'interdiction).
 *  - 500 : tout le reste → écran générique, `reset()` en action primaire +
 *    retour accueil en secondaire.
 *
 * Rendu DANS le `NextIntlClientProvider` (le layout persiste, seul le contenu
 * enfant erroné est remplacé) → `useLocale`/`useTranslations` résolvent. Lien de
 * retour préfixé locale. Clair + sombre via tokens Graphite.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const locale = useLocale()
  const forbidden = isForbiddenError(error)
  const t = useTranslations(forbidden ? 'errors.forbidden' : 'errors.crash')

  useEffect(() => {
    // Journalise l'erreur réelle (le message est masqué à l'utilisateur).
    // eslint-disable-next-line no-restricted-syntax -- #258 : error-boundary React. `error` est l'erreur de rendu React (pas un objet axios), aucun header/credential/PII à fuiter. Log volontaire du crash boundary (#57).
    console.error(error)
  }, [error])

  return (
    <StateScreen
      testId={forbidden ? 'forbidden-screen' : 'error-screen'}
      code={forbidden ? '403' : '500'}
      icon={forbidden ? <ShieldAlert /> : <AlertTriangle />}
      title={t('title')}
      description={t('description')}
      actions={
        <>
          {!forbidden ? (
            <button
              type="button"
              onClick={reset}
              className={stateActionPrimary}
              data-testid="error-retry"
            >
              {t('retry')}
            </button>
          ) : null}
          <Link
            href={`/${locale}/home`}
            className={forbidden ? stateActionPrimary : stateActionSecondary}
            data-testid="error-home-link"
          >
            {t('backHome')}
          </Link>
        </>
      }
    />
  )
}
