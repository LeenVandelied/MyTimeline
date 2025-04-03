import { useTranslations } from 'next-intl';
import Head from 'next/head';
import Link from 'next/link';
import { GetStaticProps } from 'next';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Footer } from '@/components/ui/footer';

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  try {
    return {
      props: {
        messages: {
          ...(await import(`../../public/locales/${locale || 'fr'}/common.json`)).default,
          ...(await import(`../../public/locales/${locale || 'fr'}/legal.json`)).default,
        }
      },
    };
  } catch (error) {
    console.error('Error in getStaticProps:', error);
    return { props: {} };
  }
};

export default function TermsOfService() {
  const t = useTranslations();

  return (
    <>
      <Head>
        <title>{t('terms.title')} | Ma Timeline</title>
        <meta name="description" content={t('terms.meta.description')} />
      </Head>
      
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto py-8 px-4">
          <div className="flex items-center mb-6">
            <Link href="/" passHref>
              <Button variant="ghost" className="p-0 mr-4 hover:bg-transparent">
                <ArrowLeft className="h-5 w-5 mr-2" />
                <span>{t('common:navigation.back')}</span>
              </Button>
            </Link>
            <h1 className="text-3xl font-bold gradient-text">{t('terms.title')}</h1>
          </div>

          <div className="bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-700 mb-8">
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">{t('terms.preamble.title')}</h2>
              <p className="text-gray-300 mb-2">
                {t('terms.preamble.content')}
              </p>
            </section>

            <hr className="border-gray-700 my-6" />

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">{t('terms.article1.title')}</h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>{t('terms.article1.site')}</li>
                <li>{t('terms.article1.user')}</li>
                <li>{t('terms.article1.content')}</li>
              </ul>
            </section>

            <hr className="border-gray-700 my-6" />

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">{t('terms.article2.title')}</h2>
              <p className="text-gray-300 mb-2">
                {t('terms.article2.content')}
              </p>
            </section>

            <hr className="border-gray-700 my-6" />

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">{t('terms.article3.title')}</h2>
              <p className="text-gray-300 mb-2">
                {t('terms.article3.content')}
              </p>
            </section>

            <hr className="border-gray-700 my-6" />

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">{t('terms.article4.title')}</h2>
              <p className="text-gray-300 mb-2">
                {t('terms.article4.content')}
              </p>
            </section>

            <hr className="border-gray-700 my-6" />

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">{t('terms.article5.title')}</h2>
              <p className="text-gray-300 mb-2">
                {t('terms.article5.content')}
              </p>
            </section>

            <hr className="border-gray-700 my-6" />

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">{t('terms.article6.title')}</h2>
              <p className="text-gray-300 mb-2">
                {t('terms.article6.content')}
              </p>
            </section>

            <hr className="border-gray-700 my-6" />

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">{t('terms.article7.title')}</h2>
              <p className="text-gray-300 mb-2">
                {t('terms.article7.content')}
              </p>
            </section>

            <hr className="border-gray-700 my-6" />

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">{t('terms.article8.title')}</h2>
              <p className="text-gray-300 mb-2">
                {t('terms.article8.content')}
              </p>
            </section>

            <hr className="border-gray-700 my-6" />

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">{t('terms.article9.title')}</h2>
              <p className="text-gray-300 mb-2">
                {t('terms.article9.content')}
              </p>
            </section>

            <hr className="border-gray-700 my-6" />

            <section>
              <h2 className="text-xl font-semibold mb-4">{t('terms.article10.title')}</h2>
              <p className="text-gray-300 mb-2">
                {t('terms.article10.content')}
              </p>
            </section>
          </div>

          <div className="text-center">
            <p className="text-gray-400 text-sm">
              {t('terms.lastUpdated')}: 01/06/2023
            </p>
            <Link href="/" passHref>
              <Button variant="outline" className="mt-4 border-gray-700 hover:bg-gray-800">
                {t('common:navigation.backToHome')}
              </Button>
            </Link>
          </div>
        </div>
        
        <Footer />
      </div>
    </>
  );
} 