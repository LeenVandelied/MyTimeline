'use client';

import TestimonialCard from '@/components/TestimonialCard';
import testimonialData from '@/data/testimonials.json';
import { useState, useEffect } from 'react';
import { useTranslation } from '@/app/i18n/client';

interface TestimonialSectionProps {
  locale: string;
}

export default function TestimonialSection({ locale }: TestimonialSectionProps) {
  const { t } = useTranslation(locale, 'common');
  const [testimonials, setTestimonials] = useState(testimonialData.slice(0, 3));
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setTestimonials(showAll ? testimonialData : testimonialData.slice(0, 3));
  }, [showAll]);

  return (
    <section id="testimonials" className="bg-gray-800/50 py-20 section-animation">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('landing.testimonials.title')}</h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            {t('landing.testimonials.subtitle')}
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map(testimonial => (
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
          <div className="text-center mt-10">
            <button
              onClick={() => setShowAll(!showAll)}
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 transition"
            >
              {showAll ? t('common.showLess') : t('common.showMore')}
            </button>
          </div>
        )}
      </div>
    </section>
  );
} 