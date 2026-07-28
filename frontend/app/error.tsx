'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

import { StateScreen, stateActionPrimary, stateActionSecondary } from '@/components/shared/StateScreen'
import { isSupportedLocale, DEFAULT_LOCALE } from '@/i18n/locales'

/**
 * #57 — Filet global à la racine `app/`. Attrape les erreurs des segments non
 * couverts par un boundary plus proche (ex. erreur dans `app/[locale]/layout.tsx`
 * qui remonte au-delà de `[locale]/error.tsx`, ou `app/page.tsx`). Rendu DANS
 * `app/layout.tsx` (ThemeProvider + globals.css présents) mais HORS
 * `NextIntlClientProvider` → `useTranslations` indisponible ici.
 *
 * On ne peut donc pas utiliser next-intl : messages inlinés pour les 4 locales,
 * locale déduite du 1er segment de l'URL (`localePrefix: 'always'`). C'est le
 * dernier recours ; la localisation reste best-effort (fallback fr).
 *
 * `"use client"` + `{ error, reset }` obligatoires (crash boundary React).
 */

type GlobalErrorMessages = {
  title: string
  description: string
  retry: string
  backHome: string
}

const MESSAGES: Record<string, GlobalErrorMessages> = {
  fr: {
    title: 'Une erreur est survenue',
    description: 'Un problème inattendu s’est produit. Réessayez ou revenez à l’accueil.',
    retry: 'Réessayer',
    backHome: 'Retour à l’accueil',
  },
  en: {
    title: 'Something went wrong',
    description: 'An unexpected error occurred. Try again or go back home.',
    retry: 'Try again',
    backHome: 'Back to home',
  },
  es: {
    title: 'Se produjo un error',
    description: 'Ocurrió un problema inesperado. Inténtalo de nuevo o vuelve al inicio.',
    retry: 'Reintentar',
    backHome: 'Volver al inicio',
  },
  de: {
    title: 'Ein Fehler ist aufgetreten',
    description:
      'Ein unerwartetes Problem ist aufgetreten. Versuchen Sie es erneut oder kehren Sie zur Startseite zurück.',
    retry: 'Erneut versuchen',
    backHome: 'Zurück zur Startseite',
  },
}

function resolveLocale(): string {
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  const segment = window.location.pathname.split('/')[1]
  return isSupportedLocale(segment) ? segment : DEFAULT_LOCALE
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const locale = resolveLocale()
  const m = MESSAGES[locale] ?? MESSAGES.fr

  useEffect(() => {
    // eslint-disable-next-line no-restricted-syntax -- #258 : error-boundary React. `error` est l'erreur de rendu React (pas un objet axios), aucun header/credential/PII à fuiter. Log volontaire du filet global (#57).
    console.error(error)
  }, [error])

  return (
    <StateScreen
      testId="global-error-screen"
      code="500"
      icon={<AlertTriangle />}
      title={m.title}
      description={m.description}
      actions={
        <>
          <button type="button" onClick={reset} className={stateActionPrimary} data-testid="global-error-retry">
            {m.retry}
          </button>
          <a href={`/${locale}`} className={stateActionSecondary} data-testid="global-error-home-link">
            {m.backHome}
          </a>
        </>
      }
    />
  )
}
