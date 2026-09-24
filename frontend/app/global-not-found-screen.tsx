'use client'

import '../src/styles/globals.css'

import { useEffect, useState } from 'react'

import { EphemerisLeaf } from '@/components/shared/EphemerisLeaf'
import { StateScreen, stateActionPrimary } from '@/components/shared/StateScreen'
import { DEFAULT_LOCALE, isSupportedLocale, type Locale } from '@/i18n/locales'
import { fontVariables } from './fonts'
import type { CSSProperties } from 'react'

/**
 * #413 (suite) — PARTIE CLIENT de l'écran 404 des URL non matchées.
 *
 * POURQUOI CE FICHIER EST SÉPARÉ DE `global-not-found.tsx`. La route
 * `/_not-found` n'a plus de layout racine (cf. le commentaire de
 * `global-not-found.tsx`), donc plus de `metadata` agrégée : l'onglet n'avait
 * plus de `<title>`. Or seul un Server Component peut exporter `metadata`, et
 * l'écran a besoin d'un `useEffect` (résolution de la locale). D'où la
 * scission : le parent serveur porte `metadata`, cet enfant client porte tout
 * le rendu — `<html>` / `<body>` INCLUS, pour que `lang` reste piloté par
 * l'état React (voir ci-dessous) plutôt que par une écriture DOM manuelle.
 *
 * LOCALE — même approche que `app/global-error.tsx`, et pour la même raison :
 * hors du segment `[locale]`, il n'y a ni `params` ni `NextIntlClientProvider`,
 * donc pas de `useTranslations` ; d'où `resolveLocale()` + les messages inlinés
 * typés. Les seules autres voies sont fermées : `headers()` rendrait
 * `/_not-found` DYNAMIQUE (mesuré : la ligne `○ /_not-found` sortirait du décompte
 * « Generating static pages (52/52) ») et `params` n'existe pas ici.
 *
 * ⚠ THÈME — RECUL ASSUMÉ PAR RAPPORT À L'AVANT-#413, NON CORRIGÉ. Ce `<html>`
 * est rendu HORS `ThemeProvider` (`app/[locale]/layout.tsx:66`), donc aucune
 * classe `.dark` n'est posée : **cet écran rend TOUJOURS en thème clair**, y
 * compris pour une personne dont toute l'application est en sombre. Avant #413,
 * `<html>` vivait dans le layout racine et héritait de la `.dark` de
 * next-themes. C'est le même effet que celui déjà consigné dans
 * `app/global-error.tsx` (« hors ThemeProvider […] l'écran rend en thème
 * clair »), mais il n'y était documenté que là — d'où cette note.
 *
 * POURQUOI CE N'EST PAS CORRIGÉ ICI, et pas par « lire le cookie de thème » :
 * **il n'existe aucun cookie de thème.** next-themes est monté sans `storageKey`
 * personnalisé ni `cookie`, donc en `localStorage` (clé `theme`), illisible au
 * prérendu comme au premier rendu. Les voies restantes coûtent plus que le
 * défaut :
 *  - `headers()` / cookie : rendrait `/_not-found` DYNAMIQUE et sortirait la
 *    ligne `○ /_not-found` du décompte « Generating static pages (52/52) » —
 *    exactement ce que le commentaire du `<title>` interdit de « améliorer » ;
 *  - relire `localStorage` dans le `useEffect` ci-dessous : techniquement
 *    possible et sans mismatch (même schéma que `lang`), mais cela REDÉCLARE
 *    ici la résolution de next-themes (clé de stockage, valeur `system`,
 *    `matchMedia`, `enableSystem`) — une seconde source de vérité qui divergera
 *    au premier changement d'option du provider (cf. `PIT-S56-003`) ;
 *  - un fallback `@media (prefers-color-scheme: dark)` : le DS Graphite
 *    n'écoute que `.dark` / `[data-theme="dark"]`, et un tel fallback
 *    CONTREDIRAIT un choix explicite « clair » sur un poste en sombre.
 * Sur un écran de dernier recours déjà best-effort sur `lang` et sur le
 * `<title>`, le thème suit la même règle. À rouvrir si next-themes est un jour
 * configuré sur un cookie : la lecture deviendrait alors triviale ET unique.
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
 *
 * #627 — ÉPHÉMÉRIDE. En pratique c'est CET écran que voit toute URL inconnue,
 * `/fr/nope` compris (mesuré : aucune page n'appelle `notFound()`, cf.
 * `app/[locale]/not-found.tsx`). Le feuillet daté suit la même règle que `lang` :
 * la date n'est calculée qu'APRÈS montage (`EphemerisLeaf`), jamais au prérendu —
 * sinon le HTML statique servirait le jour du BUILD, indéfiniment. Ses libellés
 * (jour, mois) suivent la locale posée par l'effet ci-dessous.
 */
type NotFoundMessages = {
  eyebrow: string
  title: string
  description: string
  /** Gabarit ICU `{week}` ; substitué à la main (aucun formateur next-intl ici). */
  week: string
  backHome: string
}

/**
 * Copie conforme de `public/locales/<locale>/errors.json` → `notFound.*`.
 * Inlinés parce qu'aucun provider next-intl n'est monté au-dessus de ce
 * document. À resynchroniser si les libellés y changent.
 */
const MESSAGES: Record<Locale, NotFoundMessages> = {
  fr: {
    eyebrow: 'Erreur 404',
    title: "Cette page n'a pas de date dans l'almanach.",
    description:
      "La page que vous cherchez a expiré, déménagé, ou n'a jamais existé. Revenez à l'accueil — c'est toujours une valeur sûre.",
    week: 'Semaine {week}',
    backHome: "Retour à l'accueil",
  },
  en: {
    eyebrow: 'Error 404',
    title: "This page isn't in the almanac.",
    description:
      "The page you're looking for has expired, moved, or never existed. Head back home — it's always a safe bet.",
    week: 'Week {week}',
    backHome: 'Back to home',
  },
  es: {
    eyebrow: 'Error 404',
    title: 'Esta página no figura en el almanaque.',
    description:
      'La página que buscas ha caducado, se ha mudado o nunca existió. Vuelve al inicio: siempre es una apuesta segura.',
    week: 'Semana {week}',
    backHome: 'Volver al inicio',
  },
  de: {
    eyebrow: 'Fehler 404',
    title: 'Für diese Seite gibt es kein Kalenderblatt.',
    description:
      'Die gesuchte Seite ist abgelaufen, umgezogen oder hat nie existiert. Kehren Sie zur Startseite zurück – dort sind Sie immer richtig.',
    week: 'KW {week}',
    backHome: 'Zurück zur Startseite',
  },
}

function resolveLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  const segment = window.location.pathname.split('/')[1] ?? ''
  return isSupportedLocale(segment) ? segment : DEFAULT_LOCALE
}

export default function GlobalNotFoundScreen() {
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
          eyebrow={m.eyebrow}
          aside={
            <EphemerisLeaf
              locale={locale}
              formatWeek={(week) => m.week.replace('{week}', String(week))}
            />
          }
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
