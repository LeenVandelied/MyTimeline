import { useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Calendar, CheckCircle, Clock, LayoutList } from 'lucide-react';
import Head from 'next/head';
import { GetStaticProps } from 'next';
import { Card, CardContent } from '@/components/ui/card';
import { Footer } from '@/components/ui/footer';
import { LanguageSelector } from '@/components/ui/language-selector';

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['common'])),
    },
  };
};

export default function LandingPage() {
  const { t } = useTranslation('common');

  // Animation des sections au scroll
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
    <>
      <Head>
        <title>{t('landing.title')}</title>
        <meta name="description" content={t('landing.meta.description')} />
        <meta name="keywords" content="gestion du temps, organisation, productivité, échéances, timeline, calendrier personnel" />
        <meta property="og:title" content={t('landing.title')} />
        <meta property="og:description" content={t('landing.meta.description')} />
        <meta property="og:url" content="https://matimeline.com" />
        <meta property="og:type" content="website" />
      </Head>
      
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
            <Link href="/login" passHref>
              <Button variant="outline" className="border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-white transition-all">
                {t('login.title')}
              </Button>
            </Link>
            <Link href="/register" passHref>
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
              <Link href="/register" passHref>
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
        <section id="testimonials" className="bg-gray-800/50 py-20 section-animation">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('landing.testimonials.title')}</h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                {t('landing.testimonials.subtitle')}
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="testimonial-card bg-gray-800 border-gray-700 shadow-lg">
                <CardContent className="p-8">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mr-3">
                      <span className="text-lg font-bold text-purple-500">S</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-white">Sophie Martin</h4>
                      <p className="text-gray-400 text-sm">Entrepreneuse</p>
                    </div>
                  </div>
                  <p className="text-gray-300">
                    "Ma Timeline a transformé ma façon de gérer mon entreprise. Je peux maintenant suivre tous mes projets et ne jamais manquer une échéance importante."
                  </p>
                </CardContent>
              </Card>
              
              <Card className="testimonial-card bg-gray-800 border-gray-700 shadow-lg">
                <CardContent className="p-8">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center mr-3">
                      <span className="text-lg font-bold text-indigo-500">T</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-white">Thomas Dubois</h4>
                      <p className="text-gray-400 text-sm">Chef de projet</p>
                    </div>
                  </div>
                  <p className="text-gray-300">
                    "Simple et efficace ! L'affichage par timeline me permet d'avoir une vue d'ensemble de tous mes projets en cours et à venir."
                  </p>
                </CardContent>
              </Card>
              
              <Card className="testimonial-card bg-gray-800 border-gray-700 shadow-lg">
                <CardContent className="p-8">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mr-3">
                      <span className="text-lg font-bold text-blue-500">L</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-white">Léa Bernard</h4>
                      <p className="text-gray-400 text-sm">Étudiante</p>
                    </div>
                  </div>
                  <p className="text-gray-300">
                    "Grâce à Ma Timeline, je gère facilement tous mes devoirs, examens et projets universitaires. L'interface est intuitive et agréable à utiliser."
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Mobile App Preview */}
        <section className="py-20 section-animation">
          <div className="container mx-auto px-4 flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-10 md:mb-0">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Emportez votre organisation partout</h2>
              <p className="text-xl text-gray-300 mb-8">
                Accédez à Ma Timeline sur tous vos appareils. Restez organisé où que vous soyez.
              </p>
              <div className="flex space-x-4">
                <Button className="bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white">
                  Bientôt sur iOS
                </Button>
                <Button className="bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white">
                  Bientôt sur Android
                </Button>
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center">
              <div className="relative w-64 h-[500px]">
                <Image 
                  src="/images/mobile-app.svg" 
                  alt="Application mobile Ma Timeline" 
                  fill 
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 section-animation">
          <div className="container mx-auto px-4">
            <Card className="card-gradient-border bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700 shadow-xl">
              <CardContent className="p-12 text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Prêt à transformer votre organisation ?</h2>
                <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
                  Rejoignez des milliers d'utilisateurs qui ont amélioré leur productivité grâce à Ma Timeline.
                </p>
                <Link href="/register" passHref>
                  <Button className="cta-button bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-lg py-6 px-10 rounded-lg transition-all">
                    Commencer gratuitement
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <Footer variant="full" />
      </div>
    </>
  );
}