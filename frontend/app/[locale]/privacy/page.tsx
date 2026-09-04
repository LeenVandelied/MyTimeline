import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { LegalDisclaimer } from '@/components/legal/legal-disclaimer';
import { LegalTableOfContents } from '@/components/legal/legal-table-of-contents';
import { PRIVACY_SECTIONS, formatLegalDate, shouldShowLegalDisclaimer } from '@/lib/legal-pages';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = (await params).locale;
  
  const t = await getTranslations({ locale, namespace: 'legal' });
  
  return {
    title: `${t('privacy.title')} | Ma Timeline`,
    description: t('privacy.meta.description'),
  };
}

export default async function PrivacyPolicy({ params }: { params: Promise<{ locale: string }> }) {
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
          <h1 className="text-3xl font-bold gradient-text">{t('privacy.title')}</h1>
        </div>

        {shouldShowLegalDisclaimer(locale) && (
          <LegalDisclaimer>{t('disclaimerOriginalFrench')}</LegalDisclaimer>
        )}

        <LegalTableOfContents
          sections={PRIVACY_SECTIONS}
          label={t('tableOfContents')}
          t={t}
          testId="privacy-toc"
        />

        <div className="bg-surface rounded-xl p-8 shadow-lg border border-rule mb-8">
          <section id="introduction" className="mb-8 scroll-mt-24">
            <h2 className="text-xl font-semibold mb-4">{t('privacy.introduction.title')}</h2>
            <p className="text-ink-muted mb-2">
              {t('privacy.introduction.content')}
            </p>
          </section>

          <hr className="border-rule my-6" />

          <section id="data-collection" className="mb-8 scroll-mt-24">
            <h2 className="text-xl font-semibold mb-4">{t('privacy.dataCollection.title')}</h2>
            <p className="text-ink-muted mb-4">
              {t('privacy.dataCollection.content')}
            </p>
            <ul className="list-disc pl-6 space-y-2 text-ink-muted">
              <li>{t('privacy.dataCollection.items.personal')}</li>
              <li>{t('privacy.dataCollection.items.usage')}</li>
              <li>{t('privacy.dataCollection.items.technical')}</li>
            </ul>
          </section>

          <hr className="border-rule my-6" />

          <section id="data-use" className="mb-8 scroll-mt-24">
            <h2 className="text-xl font-semibold mb-4">{t('privacy.dataUse.title')}</h2>
            <p className="text-ink-muted mb-4">
              {t('privacy.dataUse.content')}
            </p>
            <ul className="list-disc pl-6 space-y-2 text-ink-muted">
              <li>{t('privacy.dataUse.items.services')}</li>
              <li>{t('privacy.dataUse.items.communication')}</li>
              <li>{t('privacy.dataUse.items.improvement')}</li>
              <li>{t('privacy.dataUse.items.analytics')}</li>
            </ul>
          </section>

          <hr className="border-rule my-6" />

          <section id="data-sharing" className="mb-8 scroll-mt-24">
            <h2 className="text-xl font-semibold mb-4">{t('privacy.dataSharing.title')}</h2>
            <p className="text-ink-muted mb-4">
              {t('privacy.dataSharing.content')}
            </p>
            <ul className="list-disc pl-6 space-y-2 text-ink-muted">
              <li>{t('privacy.dataSharing.items.serviceProviders')}</li>
              <li>{t('privacy.dataSharing.items.legal')}</li>
              <li>{t('privacy.dataSharing.items.business')}</li>
            </ul>
          </section>

          <hr className="border-rule my-6" />

          <section id="data-protection" className="mb-8 scroll-mt-24">
            <h2 className="text-xl font-semibold mb-4">{t('privacy.dataProtection.title')}</h2>
            <p className="text-ink-muted mb-4">
              {t('privacy.dataProtection.content')}
            </p>
          </section>

          <hr className="border-rule my-6" />

          <section id="user-rights" className="mb-8 scroll-mt-24">
            <h2 className="text-xl font-semibold mb-4">{t('privacy.userRights.title')}</h2>
            <p className="text-ink-muted mb-4">
              {t('privacy.userRights.content')}
            </p>
            <ul className="list-disc pl-6 space-y-2 text-ink-muted">
              <li>{t('privacy.userRights.items.access')}</li>
              <li>{t('privacy.userRights.items.rectification')}</li>
              <li>{t('privacy.userRights.items.deletion')}</li>
              <li>{t('privacy.userRights.items.restriction')}</li>
              <li>{t('privacy.userRights.items.objection')}</li>
              <li>{t('privacy.userRights.items.portability')}</li>
            </ul>
          </section>

          <hr className="border-rule my-6" />

          <section id="cookies" className="mb-8 scroll-mt-24">
            <h2 className="text-xl font-semibold mb-4">{t('privacy.cookies.title')}</h2>
            <p className="text-ink-muted mb-4">
              {t('privacy.cookies.content')}
            </p>
          </section>

          <hr className="border-rule my-6" />

          <section id="policy-changes" className="mb-8 scroll-mt-24">
            <h2 className="text-xl font-semibold mb-4">{t('privacy.policyChanges.title')}</h2>
            <p className="text-ink-muted mb-4">
              {t('privacy.policyChanges.content')}
            </p>
          </section>

          <hr className="border-rule my-6" />

          <section id="contact" className="scroll-mt-24">
            <h2 className="text-xl font-semibold mb-4">{t('privacy.contact.title')}</h2>
            <p className="text-ink-muted mb-4">
              {t('privacy.contact.content')}
            </p>
          </section>
        </div>

        <div className="text-center">
          <p className="text-ink-muted text-sm" data-testid="legal-last-updated">
            {t('privacy.lastUpdated')}: {formatLegalDate(locale)}
          </p>
          <Link href={`/${locale}`} passHref>
            <Button variant="outline" className="mt-4 border-rule hover:bg-surface">
              {tCommon('navigation.backToHome')}
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Footer */}
    </div>
  );
}
