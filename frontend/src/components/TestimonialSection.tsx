'use client'

import TestimonialCard from '@/components/TestimonialCard'
import testimonialData from '@/data/testimonials.json'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'

export default function TestimonialSection() {
  const t = useTranslations()
  const [testimonials, setTestimonials] = useState(testimonialData.slice(0, 3))
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    setTestimonials(showAll ? testimonialData : testimonialData.slice(0, 3))
  }, [showAll])

  return (
    <section id="testimonials" className="bg-surface section-animation py-20">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            {t('common.landing.testimonials.title')}
          </h2>
          <p className="text-ink-muted mx-auto max-w-3xl text-xl">
            {t('common.landing.testimonials.subtitle')}
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <TestimonialCard
              key={testimonial.id}
              name={testimonial.name}
              role={testimonial.role}
              content={testimonial.content}
              avatar={testimonial.avatar}
            />
          ))}
        </div>

        {testimonialData.length > 3 && (
          <div className="mt-10 text-center">
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-accent-ink bg-accent hover:bg-accent-hover inline-flex items-center justify-center rounded-md border border-transparent px-6 py-3 text-base font-medium transition"
            >
              {showAll ? t('common.buttons.showLess') : t('common.buttons.showMore')}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
