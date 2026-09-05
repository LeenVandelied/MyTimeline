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
        <div className="flex flex-wrap items-center gap-y-2 mb-6">
          <Link href={`/${locale}`} passHref>
            <Button variant="ghost" className="p-0 mr-4 hover:bg-transparent">
              <ArrowLeft className="h-5 w-5 mr-2" />
              <span>{tCommon('navigation.back')}</span>
            </Button>
          </Link>
          {/* #532 — RAMPE TYPOGRAPHIQUE RESPONSIVE + REPLI DE L'EN-TÊTE.

              `text-3xl` vaut **57 px** dans l'échelle du DS (13/15/17/21/27/35/45/57,
              `ds/tokens/typography.css`), PAS les 30 px de l'échelle Tailwind par défaut
              ([[PIT-S53-001]]). À 57 px le seul mot « Datenschutzerklärung » mesure 581 px :
              aucune largeur mobile ne peut le contenir. Mesuré le 2026-09-05 (`next dev`,
              Chromium, 4 locales × 5 largeurs), débordement de PAGE avant correctif :
                de  /privacy +379 px @320 · +324 @375 · +285 @414 · +59 @640  (résorbé à 768)
                de  /terms   +395 @320 · +340 @375 · +301 @414 · +75 @640
                fr  /privacy +177 @320 · +122 @375 · +83 @414   | /terms +107 / +52 / +13
                es  /privacy  +64 @320 ·   +9 @375              | /terms +116 / +61 / +22
                en  AUCUN débordement, à AUCUNE largeur.
              L'énoncé de #532 (« non corrélé à la locale », en +109 px @375) datait d'avant
              la traduction des titres (#533, `9d90407`) : il est PÉRIMÉ. L'allemand est
              désormais le cas dimensionnant, et l'anglais n'a plus de défaut du tout.

              LA RAMPE : 35 / 45 / 57 px (`text-xl md:text-2xl lg:text-3xl`) — les trois
              derniers paliers du DS, exactement la rampe déjà retenue pour le `<h1>` de la
              landing (`src/components/landing/HeroSection.tsx:88`). On ne descend PAS sous
              35 px : les `<h2>` de section valent `text-xl` (35 px), un `<h1>` à 27 px
              inverserait la hiérarchie. 57 px est conservé à partir de `lg` — le rendu
              desktop est inchangé.

              LE REPLI : `flex-wrap` + `w-full sm:w-auto` donne au titre TOUTE la largeur de
              contenu sous 640 px (288 px @320 au lieu de 186 px à côté du bouton « Retour »).
              Sans lui, « Confidentialité » (234 px @35 px) serait coupé en plein mot en
              FRANÇAIS dès 320 px.

              LE FILET : `min-w-0` + `break-words`. Le `<h1>` est enfant DIRECT d'un flex :
              `break-words` seul ne réduit pas min-content ([[PIT-S73-001]]). Le couple
              garantit qu'aucune longueur de titre ne peut remettre la page en défilement
              horizontal — il ne se déclenche aujourd'hui que sur les composés allemands
              ≤ 375 px, où `hyphens-auto` (l'attribut `lang` est posé sur `<html>`,
              `app/[locale]/layout.tsx:50`) coupe à la syllabe quand le moteur dispose du
              dictionnaire, et retombe sur la coupure brute sinon. */}
          <h1 className="w-full min-w-0 break-words hyphens-auto text-xl font-bold gradient-text sm:w-auto md:text-2xl lg:text-3xl">
            {t('privacy.title')}
          </h1>
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
            <h2 className="text-xl font-semibold mb-4 break-words hyphens-auto">{t('privacy.introduction.title')}</h2>
            <p className="text-ink-muted mb-2">
              {t('privacy.introduction.content')}
            </p>
          </section>

          <hr className="border-rule my-6" />

          <section id="data-collection" className="mb-8 scroll-mt-24">
            <h2 className="text-xl font-semibold mb-4 break-words hyphens-auto">{t('privacy.dataCollection.title')}</h2>
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
            <h2 className="text-xl font-semibold mb-4 break-words hyphens-auto">{t('privacy.dataUse.title')}</h2>
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
            <h2 className="text-xl font-semibold mb-4 break-words hyphens-auto">{t('privacy.dataSharing.title')}</h2>
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
            <h2 className="text-xl font-semibold mb-4 break-words hyphens-auto">{t('privacy.dataProtection.title')}</h2>
            <p className="text-ink-muted mb-4">
              {t('privacy.dataProtection.content')}
            </p>
          </section>

          <hr className="border-rule my-6" />

          <section id="user-rights" className="mb-8 scroll-mt-24">
            <h2 className="text-xl font-semibold mb-4 break-words hyphens-auto">{t('privacy.userRights.title')}</h2>
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
            <h2 className="text-xl font-semibold mb-4 break-words hyphens-auto">{t('privacy.cookies.title')}</h2>
            <p className="text-ink-muted mb-4">
              {t('privacy.cookies.content')}
            </p>
          </section>

          <hr className="border-rule my-6" />

          <section id="policy-changes" className="mb-8 scroll-mt-24">
            <h2 className="text-xl font-semibold mb-4 break-words hyphens-auto">{t('privacy.policyChanges.title')}</h2>
            <p className="text-ink-muted mb-4">
              {t('privacy.policyChanges.content')}
            </p>
          </section>

          <hr className="border-rule my-6" />

          <section id="contact" className="scroll-mt-24">
            <h2 className="text-xl font-semibold mb-4 break-words hyphens-auto">{t('privacy.contact.title')}</h2>
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
