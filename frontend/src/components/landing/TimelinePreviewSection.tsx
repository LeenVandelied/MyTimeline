'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'

/**
 * Aperçu illustré de la frise — extrait du monolithe `HomePage` (#56).
 *
 * Cette section n'a pas d'ancre : elle n'est ciblée ni par la navigation ni par le
 * pied de page. On ne lui invente pas d'`id` — un ancrage non référencé serait du
 * code mort.
 */
export function TimelinePreviewSection() {
  const t = useTranslations()

  return (
    <section className="bg-surface section-animation py-10">
      <div className="container mx-auto px-4">
        <div className="timeline-preview relative h-64 w-full overflow-hidden rounded-xl md:h-72">
          <Image
            src="/images/timeline.svg"
            alt={t('common.landing.images.timeline')}
            fill
            className="object-contain"
          />
        </div>
      </div>
    </section>
  )
}
