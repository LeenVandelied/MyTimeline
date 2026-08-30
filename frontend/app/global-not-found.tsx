'use client'

import '../src/styles/globals.css'

import { useEffect, useState } from 'react'
import { Compass } from 'lucide-react'

import { StateScreen, stateActionPrimary } from '@/components/shared/StateScreen'
import { DEFAULT_LOCALE, isSupportedLocale, type Locale } from '@/i18n/locales'
import { fontVariables } from './fonts'
import type { CSSProperties } from 'react'

/**
 * #413 (suite) — 404 des URL NON MATCHÉES, rendue hors de tout layout.
 *
 * POURQUOI CE FICHIER EXISTE. #413 a descendu `<html>` / `<body>` dans
 * `app/[locale]/layout.tsx` (seul endroit qui connaisse `locale`, pour que
 * `<html lang>` soit correct dans le HTML SERVI — WCAG 3.1.1). Or Next exige
 * que le layout RACINE fournisse le document pour servir la route interne
 * `/_not-found` : `app/layout.tsx` ne rendant plus que `{children}`, toute URL
 * non matchée (`/en/nope`) répondait bien 404 mais avec un document SANS
 * `<html>` ni `<body>` (`NEXT_MISSING_ROOT_TAGS`) — écran blanc.
 *
 * `global-not-found` est la seule forme Next qui REMPLACE le layout racine sur
 * `/_not-found` et rend donc son PROPRE document (cf.
 * `next/dist/build/webpack/loaders/next-app-loader` : « if global-not-found is
 * in definedFilePaths, remove root layout for /_not-found »). Elle exige
 * `experimental.globalNotFound: true` (cf. `next.config.mjs`).
 *
 * DEUX CONTOURNEMENTS MESURÉS INEFFICACES, ne pas les rejouer :
 *  - `app/not-found.tsx` portant son propre `<html>` : PRÉREND correctement
 *    (`_not-found.html` complet) mais N'EST PAS SERVI au runtime ;
 *  - attrape-tout `app/[locale]/[...rest]/page.tsx` appelant `notFound()` : la
 *    route est bien atteinte, mais `notFound()` ÉCHAPPE à
 *    `[locale]/not-found.tsx` et remonte au boundary racine.
 *
 * PÉRIMÈTRE. Ce fichier ne remplace PAS `app/[locale]/not-found.tsx`, qui reste
 * l'écran des `notFound()` déclenchés PAR une page (rendu, lui, dans le
 * `NextIntlClientProvider`, donc entièrement traduit). Celui-ci ne couvre que
 * ce qui n'atteint aucune route.
 *
 * LOCALE — même approche que `app/global-error.tsx`, et pour la même raison :
 * hors du segment `[locale]`, il n'y a ni `params` ni `NextIntlClientProvider`,
 * donc pas de `useTranslations` ; d'où `resolveLocale()` + les messages inlinés
 * typés. Les seules autres voies sont fermées : `headers()` rendrait
 * `/_not-found` DYNAMIQUE (mesuré : la ligne `○ /_not-found` sortirait du décompte
 * « Generating static pages (52/52) ») et `params` n'existe pas ici.
 *
 * ⚠ Différence assumée avec `global-error` : la locale est posée dans un
 * `useEffect`, pas pendant le rendu. `/_not-found` est PRÉRENDU au build
 * (statique, servi tel quel pour les 4 locales) : résoudre `window.location`
 * pendant le rendu produirait un HTML `fr` puis une hydratation `en` →
 * mismatch React sur `lang` ET sur le texte. Ici le premier rendu vaut `fr` des
 * DEUX côtés (aucun mismatch), puis l'effet aligne `lang` ET le texte sur la
 * locale de l'URL : les deux états successifs restent cohérents entre eux,
 * ce qui est ce que WCAG 3.1.1 demande. Le HTML servi reste `fr` — best-effort
 * assumé sur un écran de dernier recours, comme pour `global-error`.
 */
type NotFoundMessages = {
  title: string
  description: string
  backHome: string
}

/**
 * Copie conforme de `public/locales/<locale>/errors.json` → `notFound.*`.
 * Inlinés parce qu'aucun provider next-intl n'est monté au-dessus de ce
 * document. À resynchroniser si les libellés y changent.
 */
const MESSAGES: Record<Locale, NotFoundMessages> = {
  fr: {
    title: 'Page introuvable',
    description: "La page que vous recherchez n'existe pas ou a été déplacée.",
    backHome: "Retour à l'accueil",
  },
  en: {
    title: 'Page not found',
    description: "The page you are looking for doesn't exist or has been moved.",
    backHome: 'Back to home',
  },
  es: {
    title: 'Página no encontrada',
    description: 'La página que buscas no existe o ha sido movida.',
    backHome: 'Volver al inicio',
  },
  de: {
    title: 'Seite nicht gefunden',
    description: 'Die gesuchte Seite existiert nicht oder wurde verschoben.',
    backHome: 'Zurück zur Startseite',
  },
}

function resolveLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  const segment = window.location.pathname.split('/')[1] ?? ''
  return isSupportedLocale(segment) ? segment : DEFAULT_LOCALE
}

export default function GlobalNotFound() {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE)

  useEffect(() => {
    setLocale(resolveLocale())
  }, [])

  const m = MESSAGES[locale]

  return (
    <html
      lang={locale}
      className={fontVariables}
      style={{ '--font-ui': 'var(--font-display)' } as CSSProperties}
    >
      <body>
        <StateScreen
          testId="global-not-found-screen"
          code="404"
          icon={<Compass />}
          title={m.title}
          description={m.description}
          actions={
            // `<a>` et non `<Link>` : ce document remplace le layout racine, une
            // navigation client depuis ici repartirait d'un arbre sans providers.
            // Cible = racine de locale (ADR-006), préfixée (`localePrefix: 'always'`).
            <a
              href={`/${locale}`}
              className={stateActionPrimary}
              data-testid="global-not-found-home-link"
            >
              {m.backHome}
            </a>
          }
        />
      </body>
    </html>
  )
}
