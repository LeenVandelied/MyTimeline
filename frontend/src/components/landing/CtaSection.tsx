'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

interface CtaSectionProps {
  locale: string
}

/**
 * Bandeau d'appel à l'action final — extrait du monolithe `HomePage` (#56).
 *
 * #295 : `<Button asChild>` + `<Link>` interne, au lieu de `<Link passHref><Button>`
 * qui produisait un `<button>` dans un `<a>` (HTML invalide, double tabulation).
 */
export function CtaSection({ locale }: CtaSectionProps) {
  const t = useTranslations()

  return (
    <section className="bg-accent section-animation py-20">
      <div className="container mx-auto px-4 text-center">
        <h2 className="mb-6 text-3xl font-bold md:text-4xl">{t('common.landing.cta.title')}</h2>
        <p className="text-accent-ink mx-auto mb-10 max-w-3xl text-xl">
          {t('common.landing.cta.subtitle')}
        </p>
        <Button
          asChild
          className="bg-primary text-primary-ink hover:bg-primary-hover rounded-lg px-10 py-6 text-lg transition-all"
        >
          <Link href={`/${locale}/register`}>{t('common.landing.cta.button')}</Link>
        </Button>
      </div>
    </section>
  )
}
