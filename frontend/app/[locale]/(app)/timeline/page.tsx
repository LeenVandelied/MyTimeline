'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { GanttChartSquare } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

/**
 * #210 — Segment connecté `/timeline` enveloppé par le shell applicatif
 * (`(app)/layout.tsx`). Placeholder minimal : l'écran frise complet (handoff §4,
 * zoom continu, minimap…) est le périmètre de #166 et remplacera ce contenu.
 * Sert ici à rendre l'item de nav « Timeline » du shell fonctionnel (pas de 404)
 * et à démontrer l'enveloppement d'un écran sans chrome propre.
 *
 * Garde d'auth calquée sur le dashboard (redirection `/login` si non connecté ;
 * `middleware.ts` = next-intl seul, pas d'auth serveur).
 */
export default function TimelinePlaceholder() {
  const t = useTranslations('shell.timeline')
  const locale = useLocale()
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/${locale}/login`)
    }
  }, [user, loading, router, locale])

  if (loading) {
    return (
      <div
        className="flex h-full min-h-screen items-center justify-center"
        data-testid="timeline-loading"
      >
        <div
          className="border-accent h-10 w-10 animate-spin rounded-full border-2 border-t-transparent"
          role="status"
        >
          <span className="sr-only">{t('loading')}</span>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <section
      className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 px-6 py-16"
      data-testid="timeline-placeholder"
    >
      <span className="text-ink-faint font-mono text-2xs tracking-widest uppercase">
        {t('eyebrow')}
      </span>
      <h1 className="text-ink flex items-center gap-3 text-2xl font-semibold tracking-tight">
        <GanttChartSquare className="text-accent h-6 w-6" aria-hidden="true" />
        {t('title')}
      </h1>
      <p className="text-ink-muted text-sm">{t('comingSoon')}</p>
    </section>
  )
}
