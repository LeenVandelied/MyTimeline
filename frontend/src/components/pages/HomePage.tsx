'use client';

import { useEffect } from "react";
import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Calendar, Clock, LayoutList } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Footer } from '@/components/ui/footer';
import { LanguageSelector } from '@/components/ui/language-selector';
import TestimonialSection from "@/components/TestimonialSection";
import { useTranslations, useLocale } from 'next-intl';

interface HomePageProps {
  params: {
    locale: string;
  };
}

export default function HomePage({ params }: HomePageProps) {
  const t = useTranslations();
  const defaultLocale = useLocale();
  
  const locale = params?.locale || defaultLocale || 'fr';

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { 
      threshold: 0.1,
      rootMargin: '0px 0px -100px 0px'
    });

    const sections = document.querySelectorAll('.section-animation');
    sections.forEach(section => {
      observer.observe(section);
    });

    return () => {
      sections.forEach(section => {
        observer.unobserve(section);
      });
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header/Navigation */}
      <header className="container mx-auto py-6 px-4 flex justify-between items-center">
        <div className="flex items-center">
          <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-indigo-600">
            Ma Timeline
          </div>
        </div>
        <nav className="hidden md:flex space-x-8 text-gray-300">
          <a href="#features" className="nav-link hover:text-purple-400 transition duration-200">{t('landing.navigation.features')}</a>
          <a href="#how-it-works" className="nav-link hover:text-purple-400 transition duration-200">{t('landing.navigation.howItWorks')}</a>
          <a href="#testimonials" className="nav-link hover:text-purple-400 transition duration-200">{t('landing.navigation.testimonials')}</a>
        </nav>
        <div className="flex items-center space-x-4">
          <LanguageSelector />
          <Link href={`/${locale}/login`} passHref>
            <Button variant="outline" className="border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-white transition-all">
              {t('login.title')}
            </Button>
          </Link>
          <Link href={`/${locale}/register`} passHref>
            <Button className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white transition-all">
              {t('landing.buttons.register')}
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto py-20 px-4 flex flex-col md:flex-row items-center section-animation">
        <div className="md:w-1/2 mb-10 md:mb-0 md:pr-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            {t('landing.hero.title')}
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            {t('landing.hero.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <Link href={`/${locale}/register`} passHref>
              <Button className="cta-button bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-lg py-6 px-8 rounded-lg transition-all">
                {t('landing.hero.cta')} <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="outline" className="border-gray-700 text-white hover:bg-gray-800 text-lg py-6 px-8 rounded-lg transition-all">
                {t('landing.hero.secondary')}
              </Button>
            </a>
          </div>
        </div>
        <div className="md:w-1/2 relative hero-image-container">
          <div className="bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-700">
            {/* Image de prévisualisation du tableau de bord */}
            <div className="w-full h-80 md:h-96 relative">
              <Image 
                src="/images/dashboard-preview.svg" 
                alt={t('landing.images.dashboard')}
                fill 
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-gray-800/50 py-20 section-animation">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('landing.features.title')}</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              {t('landing.features.subtitle')}
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="feature-card card-gradient-border bg-gray-800 border-gray-700 shadow-lg transform transition-all duration-300 hover:-translate-y-2 hover:shadow-purple-500/10">
              <CardContent className="p-8">
                <div className="bg-purple-500/10 p-3 rounded-lg w-max mb-6 feature-icon">
                  <Calendar className="h-8 w-8 text-purple-500" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">{t('landing.features.timeline.title')}</h3>
                <p className="text-gray-300">
                  {t('landing.features.timeline.description')}
                </p>
              </CardContent>
            </Card>
            
            <Card className="feature-card card-gradient-border bg-gray-800 border-gray-700 shadow-lg transform transition-all duration-300 hover:-translate-y-2 hover:shadow-indigo-500/10">
              <CardContent className="p-8">
                <div className="bg-indigo-500/10 p-3 rounded-lg w-max mb-6 feature-icon">
                  <Clock className="h-8 w-8 text-indigo-500" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">{t('landing.features.reminders.title')}</h3>
                <p className="text-gray-300">
                  {t('landing.features.reminders.description')}
                </p>
              </CardContent>
            </Card>
            
            <Card className="feature-card card-gradient-border bg-gray-800 border-gray-700 shadow-lg transform transition-all duration-300 hover:-translate-y-2 hover:shadow-blue-500/10">
              <CardContent className="p-8">
                <div className="bg-blue-500/10 p-3 rounded-lg w-max mb-6 feature-icon">
                  <LayoutList className="h-8 w-8 text-blue-500" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">{t('landing.features.organization.title')}</h3>
                <p className="text-gray-300">
                  {t('landing.features.organization.description')}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 section-animation">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('landing.howItWorks.title')}</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              {t('landing.howItWorks.subtitle')}
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-500">1</span>
              </div>
              <h3 className="text-xl font-bold mb-2 text-white">{t('landing.howItWorks.step1.title')}</h3>
              <p className="text-gray-300">{t('landing.howItWorks.step1.description')}</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-indigo-500">2</span>
              </div>
              <h3 className="text-xl font-bold mb-2 text-white">{t('landing.howItWorks.step2.title')}</h3>
              <p className="text-gray-300">{t('landing.howItWorks.step2.description')}</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-500">3</span>
              </div>
              <h3 className="text-xl font-bold mb-2 text-white">{t('landing.howItWorks.step3.title')}</h3>
              <p className="text-gray-300">{t('landing.howItWorks.step3.description')}</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-500">4</span>
              </div>
              <h3 className="text-xl font-bold mb-2 text-white">{t('landing.howItWorks.step4.title')}</h3>
              <p className="text-gray-300">{t('landing.howItWorks.step4.description')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-10 bg-gray-800/30 section-animation">
        <div className="container mx-auto px-4">
          <div className="relative w-full h-64 md:h-72 overflow-hidden rounded-xl timeline-preview">
            <Image 
              src="/images/timeline.svg" 
              alt={t('landing.images.timeline')}
              fill 
              className="object-contain"
            />
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <TestimonialSection locale={locale} />

      {/* Mobile App Preview */}
      <section className="py-20 section-animation">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 mb-10 md:mb-0">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">{t('landing.mobileApp.title')}</h2>
            <p className="text-xl text-gray-300 mb-8">
              {t('landing.mobileApp.subtitle')}
            </p>
            <div className="flex space-x-4">
              <Button className="bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white">
                {t('landing.mobileApp.ios')}
              </Button>
              <Button className="bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white">
                {t('landing.mobileApp.android')}
              </Button>
            </div>
          </div>
          <div className="md:w-1/2 relative">
            <div className="relative mx-auto w-64 h-96">
              <Image 
                src="/images/mobile-app.svg" 
                alt={t('landing.images.mobileApp')}
                fill 
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-purple-800 to-indigo-800 section-animation">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">{t('landing.cta.title')}</h2>
          <p className="text-xl text-gray-200 mb-10 max-w-3xl mx-auto">
            {t('landing.cta.subtitle')}
          </p>
          <Link href={`/${locale}/register`} passHref>
            <Button className="bg-white text-purple-800 hover:bg-gray-100 text-lg px-10 py-6 rounded-lg transition-all">
              {t('landing.cta.button')}
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <Footer locale={locale} />
    </div>
  );
} 