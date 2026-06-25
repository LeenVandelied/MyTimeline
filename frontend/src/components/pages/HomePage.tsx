'use client'

import { useEffect } from 'react'
import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Calendar, Clock, LayoutList } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Footer } from '@/components/ui/footer'
import { LanguageSelector } from '@/components/ui/language-selector'
import TestimonialSection from '@/components/TestimonialSection'
import { useTranslations, useLocale } from 'next-intl'

interface HomePageProps {
  params: {
    locale: string
  }
}

export default function HomePage({ params }: HomePageProps) {
  const t = useTranslations()
  const defaultLocale = useLocale()

  const locale = params?.locale || defaultLocale || 'fr'

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
          }
        })
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px',
      },
    )

    const sections = document.querySelectorAll('.section-animation')
    sections.forEach((section) => {
      observer.observe(section)
    })

    return () => {
      sections.forEach((section) => {
        observer.unobserve(section)
      })
    }
  }, [])

  return (
    <div className="bg-bg text-ink min-h-screen">
      {/* Header/Navigation */}
      <header className="container mx-auto flex items-center justify-between px-4 py-6">
        <div className="flex items-center">
          <div className="text-accent text-3xl font-bold">Ma Timeline</div>
        </div>
        <nav className="text-ink-muted hidden space-x-8 md:flex">
          <a href="#features" className="nav-link hover:text-accent transition duration-200">
            {t('common.landing.navigation.features')}
          </a>
          <a href="#how-it-works" className="nav-link hover:text-accent transition duration-200">
            {t('common.landing.navigation.howItWorks')}
          </a>
          <a href="#testimonials" className="nav-link hover:text-accent transition duration-200">
            {t('common.landing.navigation.testimonials')}
          </a>
        </nav>
        <div className="flex items-center space-x-4">
          <LanguageSelector />
          <Link href={`/${locale}/login`} passHref>
            <Button
              variant="outline"
              className="border-accent text-accent hover:bg-accent hover:text-accent-ink transition-all"
            >
              {t('common.login.title')}
            </Button>
          </Link>
          <Link href={`/${locale}/register`} passHref>
            <Button className="bg-accent hover:bg-accent-hover text-accent-ink transition-all">
              {t('common.landing.buttons.register')}
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="section-animation container mx-auto flex flex-col items-center px-4 py-20 md:flex-row">
        <div className="mb-10 md:mb-0 md:w-1/2 md:pr-10">
          <h1 className="mb-6 text-4xl leading-tight font-bold md:text-5xl">
            {t('common.landing.hero.title')}
          </h1>
          <p className="text-ink-muted mb-8 text-xl">{t('common.landing.hero.subtitle')}</p>
          <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
            <Link href={`/${locale}/register`} passHref>
              <Button className="cta-button bg-accent hover:bg-accent-hover text-accent-ink rounded-lg px-8 py-6 text-lg transition-all">
                {t('common.landing.hero.cta')} <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button
                variant="outline"
                className="border-rule text-ink hover:bg-surface rounded-lg px-8 py-6 text-lg transition-all"
              >
                {t('common.landing.hero.secondary')}
              </Button>
            </a>
          </div>
        </div>
        <div className="hero-image-container relative md:w-1/2">
          <div className="bg-surface border-rule overflow-hidden rounded-xl border shadow-lg">
            {/* Image de prévisualisation du tableau de bord */}
            <div className="relative h-80 w-full md:h-96">
              <Image
                src="/images/dashboard-preview.svg"
                alt={t('common.landing.images.dashboard')}
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-surface section-animation py-20">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              {t('common.landing.features.title')}
            </h2>
            <p className="text-ink-muted mx-auto max-w-3xl text-xl">
              {t('common.landing.features.subtitle')}
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <Card className="feature-card card-gradient-border bg-surface border-rule transform shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-md">
              <CardContent className="p-8">
                <div className="bg-accent-soft feature-icon mb-6 w-max rounded-lg p-3">
                  <Calendar className="text-accent h-8 w-8" />
                </div>
                <h3 className="text-ink mb-3 text-xl font-bold">
                  {t('common.landing.features.timeline.title')}
                </h3>
                <p className="text-ink-muted">
                  {t('common.landing.features.timeline.description')}
                </p>
              </CardContent>
            </Card>

            <Card className="feature-card card-gradient-border bg-surface border-rule transform shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-md">
              <CardContent className="p-8">
                <div className="bg-accent-soft feature-icon mb-6 w-max rounded-lg p-3">
                  <Clock className="text-accent h-8 w-8" />
                </div>
                <h3 className="text-ink mb-3 text-xl font-bold">
                  {t('common.landing.features.reminders.title')}
                </h3>
                <p className="text-ink-muted">
                  {t('common.landing.features.reminders.description')}
                </p>
              </CardContent>
            </Card>

            <Card className="feature-card card-gradient-border bg-surface border-rule transform shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-md">
              <CardContent className="p-8">
                <div className="bg-accent-soft feature-icon mb-6 w-max rounded-lg p-3">
                  <LayoutList className="text-accent h-8 w-8" />
                </div>
                <h3 className="text-ink mb-3 text-xl font-bold">
                  {t('common.landing.features.organization.title')}
                </h3>
                <p className="text-ink-muted">
                  {t('common.landing.features.organization.description')}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="section-animation py-20">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              {t('common.landing.howItWorks.title')}
            </h2>
            <p className="text-ink-muted mx-auto max-w-3xl text-xl">
              {t('common.landing.howItWorks.subtitle')}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-4">
            <div className="p-6 text-center">
              <div className="bg-accent-soft mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                <span className="text-accent text-2xl font-bold">1</span>
              </div>
              <h3 className="text-ink mb-2 text-xl font-bold">
                {t('common.landing.howItWorks.step1.title')}
              </h3>
              <p className="text-ink-muted">{t('common.landing.howItWorks.step1.description')}</p>
            </div>

            <div className="p-6 text-center">
              <div className="bg-accent-soft mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                <span className="text-accent text-2xl font-bold">2</span>
              </div>
              <h3 className="text-ink mb-2 text-xl font-bold">
                {t('common.landing.howItWorks.step2.title')}
              </h3>
              <p className="text-ink-muted">{t('common.landing.howItWorks.step2.description')}</p>
            </div>

            <div className="p-6 text-center">
              <div className="bg-accent-soft mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                <span className="text-accent text-2xl font-bold">3</span>
              </div>
              <h3 className="text-ink mb-2 text-xl font-bold">
                {t('common.landing.howItWorks.step3.title')}
              </h3>
              <p className="text-ink-muted">{t('common.landing.howItWorks.step3.description')}</p>
            </div>

            <div className="p-6 text-center">
              <div className="bg-accent-soft mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                <span className="text-accent text-2xl font-bold">4</span>
              </div>
              <h3 className="text-ink mb-2 text-xl font-bold">
                {t('common.landing.howItWorks.step4.title')}
              </h3>
              <p className="text-ink-muted">{t('common.landing.howItWorks.step4.description')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
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

      {/* Testimonials Section */}
      <TestimonialSection />

      {/* Mobile App Preview */}
      <section className="section-animation py-20">
        <div className="container mx-auto flex flex-col items-center px-4 md:flex-row">
          <div className="mb-10 md:mb-0 md:w-1/2">
            <h2 className="mb-6 text-3xl font-bold md:text-4xl">
              {t('common.landing.mobileApp.title')}
            </h2>
            <p className="text-ink-muted mb-8 text-xl">{t('common.landing.mobileApp.subtitle')}</p>
            <div className="flex space-x-4">
              <Button className="bg-surface border-rule hover:bg-surface-2 text-ink border">
                {t('common.landing.mobileApp.ios')}
              </Button>
              <Button className="bg-surface border-rule hover:bg-surface-2 text-ink border">
                {t('common.landing.mobileApp.android')}
              </Button>
            </div>
          </div>
          <div className="relative md:w-1/2">
            <div className="relative mx-auto h-96 w-64">
              <Image
                src="/images/mobile-app.svg"
                alt={t('common.landing.images.mobileApp')}
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-accent section-animation py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-6 text-3xl font-bold md:text-4xl">{t('common.landing.cta.title')}</h2>
          <p className="text-accent-ink mx-auto mb-10 max-w-3xl text-xl">
            {t('common.landing.cta.subtitle')}
          </p>
          <Link href={`/${locale}/register`} passHref>
            <Button className="bg-primary text-primary-ink hover:bg-primary-hover rounded-lg px-10 py-6 text-lg transition-all">
              {t('common.landing.cta.button')}
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <Footer locale={locale} />
    </div>
  )
}
