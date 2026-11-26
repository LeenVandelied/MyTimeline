import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'

import { AuthIdealDayTimeline } from './AuthIdealDayTimeline'

// Gabarit des écrans d'authentification (#625) : panneau (frise et citation) à gauche,
// carte de 380 px au plus centrée à droite. Le panneau disparaît sous `md` (768 px) : la zone
// prend alors toute la largeur, la carte restant à 380 px au plus. Le coin thème et langue
// reste à la charge des pages : de `md` à `xl`, la zone garde une marge haute de 64 px pour que
// la carte ne passe pas sous ce coin (haut 16 px, 36 px de haut).
export function AuthSplitLayout({ children }: { children: ReactNode }) {
  const t = useTranslations('auth')

  return (
    <div className="flex flex-grow">
      <aside
        data-testid="auth-side-panel"
        className="bg-surface-sunken border-rule hidden flex-1 flex-col justify-between gap-10 border-r p-12 md:flex"
      >
        <AuthIdealDayTimeline />
        <figure>
          <blockquote data-testid="auth-quote" className="text-ink text-2xl font-semibold">
            {t('quote.text')}
          </blockquote>
          <figcaption data-testid="auth-quote-attribution" className="text-ink-muted mt-4 text-sm">
            {t('quote.attribution')}
          </figcaption>
        </figure>
      </aside>

      <div
        data-testid="auth-form-zone"
        className="flex flex-1 items-center justify-center px-4 md:pt-16 xl:pt-0"
      >
        <div
          data-testid="auth-form-card"
          className="bg-surface border-rule w-full max-w-[380px] rounded-lg border p-6 shadow-xs"
        >
          {children}
        </div>
      </div>
    </div>
  )
}
