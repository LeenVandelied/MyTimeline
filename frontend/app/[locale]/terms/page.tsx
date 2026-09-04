import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { LegalDisclaimer } from '@/components/legal/legal-disclaimer';
import { LegalTableOfContents } from '@/components/legal/legal-table-of-contents';
import { TERMS_SECTIONS, formatLegalDate, shouldShowLegalDisclaimer } from '@/lib/legal-pages';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = (await params).locale;
  
  const t = await getTranslations({ locale, namespace: 'legal' });
  
  return {
    title: `${t('terms.title')} | Ma Timeline`,
    description: t('terms.meta.description'),
  };
}

export default async function TermsOfService({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale;
  
  const t = await getTranslations({ locale, namespace: 'legal' });
  // Les libellés « Retour » vivent depuis toujours dans `common.navigation`
  // (`back`, `backToHome`), renseignés dans les 4 locales et déjà utilisés
  // ailleurs — #60 les CÂBLE au lieu de dupliquer deux clés dans `legal`.
  const tCommon = await getTranslations({ locale, namespace: 'common' });

  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center mb-6">
          <Link href={`/${locale}`} passHref>
            <Button variant="ghost" className="p-0 mr-4 hover:bg-transparent">
              <ArrowLeft className="h-5 w-5 mr-2" />
              <span>{tCommon('navigation.back')}</span>
            </Button>
          </Link>
          <h1 className="text-3xl font-bold gradient-text">{t('terms.title')}</h1>
        </div>

        {shouldShowLegalDisclaimer(locale) && (
          <LegalDisclaimer>{t('disclaimerOriginalFrench')}</LegalDisclaimer>
        )}

        <LegalTableOfContents
          sections={TERMS_SECTIONS}
          label={t('tableOfContents')}
          t={t}
          testId="terms-toc"
        />

        <div className="bg-surface rounded-xl p-8 shadow-lg border border-rule mb-8">
          <section id="preamble" className="mb-8 scroll-mt-24">
            <h2 className="text-xl font-semibold mb-4">{t('terms.preamble.title')}</h2>
            <p className="text-ink-muted mb-2">
              {t('terms.preamble.content')}
            </p>
          </section>

          <hr className="border-rule my-6" />

          <section id="article-1" className="mb-8 scroll-mt-24">
            <h2 className="text-xl font-semibold mb-4">{t('terms.article1.title')}</h2>
            <ul className="list-disc pl-6 space-y-2 text-ink-muted">
              <li>{t('terms.article1.site')}</li>
              <li>{t('terms.article1.user')}</li>
              <li>{t('terms.article1.content')}</li>
            </ul>
          </section>

          <hr className="border-rule my-6" />

          <section id="article-2" className="mb-8 scroll-mt-24">
            <h2 className="text-xl font-semibold mb-4">{t('terms.article2.title')}</h2>
            <p className="text-ink-muted mb-2">
              {t('terms.article2.content')}
            </p>
          </section>

          <hr className="border-rule my-6" />

          <section id="article-3" className="mb-8 scroll-mt-24">
            <h2 className="text-xl font-semibold mb-4">{t('terms.article3.title')}</h2>
            <p className="text-ink-muted mb-2">
              {t('terms.article3.content')}
            </p>
          </section>

          <hr className="border-rule my-6" />

          <section id="article-4" className="mb-8 scroll-mt-24">
            <h2 className="text-xl font-semibold mb-4">{t('terms.article4.title')}</h2>
            <p className="text-ink-muted mb-2">
              {t('terms.article4.content')}
            </p>
          </section>

          <hr className="border-rule my-6" />

          <section id="article-5" className="mb-8 scroll-mt-24">
            <h2 className="text-xl font-semibold mb-4">{t('terms.article5.title')}</h2>
            <p className="text-ink-muted mb-2">
              {t('terms.article5.content')}
            </p>
          </section>

          <hr className="border-rule my-6" />

          <section id="article-6" className="mb-8 scroll-mt-24">
            <h2 className="text-xl font-semibold mb-4">{t('terms.article6.title')}</h2>
            <p className="text-ink-muted mb-2">
              {t('terms.article6.content')}
            </p>
          </section>

          <hr className="border-rule my-6" />

          <section id="article-7" className="mb-8 scroll-mt-24">
            <h2 className="text-xl font-semibold mb-4">{t('terms.article7.title')}</h2>
            <p className="text-ink-muted mb-2">
              {t('terms.article7.content')}
            </p>
          </section>

          <hr className="border-rule my-6" />

          <section id="article-8" className="mb-8 scroll-mt-24">
            <h2 className="text-xl font-semibold mb-4">{t('terms.article8.title')}</h2>
            <p className="text-ink-muted mb-2">
              {t('terms.article8.content')}
            </p>
          </section>

          <hr className="border-rule my-6" />

          <section id="article-9" className="mb-8 scroll-mt-24">
            <h2 className="text-xl font-semibold mb-4">{t('terms.article9.title')}</h2>
            <p className="text-ink-muted mb-2">
              {t('terms.article9.content')}
            </p>
          </section>

          <hr className="border-rule my-6" />

          <section id="article-10" className="scroll-mt-24">
            <h2 className="text-xl font-semibold mb-4">{t('terms.article10.title')}</h2>
            <p className="text-ink-muted mb-2">
              {t('terms.article10.content')}
            </p>
          </section>
        </div>

        <div className="text-center">
          <p className="text-ink-muted text-sm" data-testid="legal-last-updated">
            {t('terms.lastUpdated')}: {formatLegalDate(locale)}
          </p>
          <Link href={`/${locale}`} passHref>
            <Button variant="outline" className="mt-4 border-rule hover:bg-surface">
              {tCommon('navigation.backToHome')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
} 