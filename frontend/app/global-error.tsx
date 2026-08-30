'use client'

import '../src/styles/globals.css'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

import { StateScreen, stateActionPrimary, stateActionSecondary } from '@/components/shared/StateScreen'
import { isSupportedLocale, DEFAULT_LOCALE } from '@/i18n/locales'
import { fontVariables } from './fonts'
import type { CSSProperties } from 'react'

/**
 * #57 / #413 — Filet global de la racine `app/`.
 *
 * ⚠ #413 A CHANGÉ SA NATURE. Ce fichier s'appelait `app/error.tsx` et son
 * commentaire affirmait qu'il était « rendu DANS `app/layout.tsx`
 * (ThemeProvider + globals.css présents) ». CETTE HYPOTHÈSE EST TOMBÉE : le
 * `<html>` / `<body>` et tous les providers ont été descendus dans
 * `app/[locale]/layout.tsx` (seul endroit qui connaisse `locale`, pour que
 * `<html lang>` soit correct dans le HTML SERVI — WCAG 3.1.1). Le layout racine
 * ne rend plus que `{children}` : un `error.tsx` monté là aurait produit un
 * document SANS `<html>` ni `<body>`.
 *
 * D'où la conversion en `global-error.tsx`, la seule forme Next qui REMPLACE le
 * layout racine et rend donc son PROPRE `<html>` / `<body>`. Conséquences, à
 * garder en tête avant d'y ajouter quoi que ce soit :
 *  - il est HORS `NextIntlClientProvider` → `useTranslations` indisponible,
 *    d'où les messages inlinés pour les 4 locales (inchangé depuis #57) ;
 *  - il est aussi hors `ThemeProvider` / `QueryProvider` / `AuthProvider` :
 *    pas de `.dark` posée par next-themes, l'écran rend donc en thème clair.
 *    Ne pas y appeler de hook qui dépende d'un de ces providers ;
 *  - `globals.css` et les variables de police sont importés ICI explicitement,
 *    justement parce qu'aucun layout n'est monté au-dessus.
 *
 * Périmètre inchangé : il attrape ce qu'aucun boundary plus proche ne couvre
 * (erreur dans `app/[locale]/layout.tsx`, qui passe au-delà de
 * `app/[locale]/error.tsx`, ou dans `app/page.tsx`).
 *
 * `lang` : la locale est déduite du 1er segment de l'URL
 * (`localePrefix: 'always'`). ⚠ Au rendu SERVEUR de cet écran, `window` n'existe
 * pas → `lang` retombe sur `fr`. C'est assumé : ce composant est le dernier
 * recours d'un rendu déjà en échec, la localisation y reste best-effort. Les
 * pages nominales, elles, tiennent leur `lang` des params de route.
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
    <html
      lang={locale}
      className={fontVariables}
      style={{ '--font-ui': 'var(--font-display)' } as CSSProperties}
    >
      <body>
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
      </body>
    </html>
  )
}
