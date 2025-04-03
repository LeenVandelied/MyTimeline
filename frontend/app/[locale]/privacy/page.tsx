import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { AppFooter } from '@/components/ui/footer-app';
import { Metadata } from 'next';

import { getTranslations } from '../../i18n/translations';
import type { PrivacyPageTranslations } from '../../i18n/types';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const translations = await getTranslations(locale, 'legal') as unknown as PrivacyPageTranslations;
  
  return {
    title: `${translations.privacy.title} | Ma Timeline`,
    description: translations.privacy.meta.description,
  };
}

export default async function PrivacyPolicy({ params: { locale } }: { params: { locale: string } }) {
  const translations = await getTranslations(locale, 'legal') as unknown as PrivacyPageTranslations;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center mb-6">
          <Link href={`/${locale}`} passHref>
            <Button variant="ghost" className="p-0 mr-4 hover:bg-transparent">
              <ArrowLeft className="h-5 w-5 mr-2" />
              <span>Retour</span>
            </Button>
          </Link>
          <h1 className="text-3xl font-bold gradient-text">{translations.privacy.title}</h1>
        </div>

        <div className="bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-700 mb-8">
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{translations.privacy.introduction.title}</h2>
            <p className="text-gray-300 mb-2">
              {translations.privacy.introduction.content}
            </p>
          </section>

          <hr className="border-gray-700 my-6" />

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{translations.privacy.dataCollection.title}</h2>
            <p className="text-gray-300 mb-4">
              {translations.privacy.dataCollection.content}
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>{translations.privacy.dataCollection.items.personal}</li>
              <li>{translations.privacy.dataCollection.items.usage}</li>
              <li>{translations.privacy.dataCollection.items.technical}</li>
            </ul>
          </section>

          <hr className="border-gray-700 my-6" />

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{translations.privacy.dataUse.title}</h2>
            <p className="text-gray-300 mb-4">
              {translations.privacy.dataUse.content}
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>{translations.privacy.dataUse.items.services}</li>
              <li>{translations.privacy.dataUse.items.communication}</li>
              <li>{translations.privacy.dataUse.items.improvement}</li>
              <li>{translations.privacy.dataUse.items.analytics}</li>
            </ul>
          </section>

          <hr className="border-gray-700 my-6" />

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{translations.privacy.dataSharing.title}</h2>
            <p className="text-gray-300 mb-4">
              {translations.privacy.dataSharing.content}
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>{translations.privacy.dataSharing.items.serviceProviders}</li>
              <li>{translations.privacy.dataSharing.items.legal}</li>
              <li>{translations.privacy.dataSharing.items.business}</li>
            </ul>
          </section>

          <hr className="border-gray-700 my-6" />

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{translations.privacy.dataProtection.title}</h2>
            <p className="text-gray-300 mb-4">
              {translations.privacy.dataProtection.content}
            </p>
          </section>

          <hr className="border-gray-700 my-6" />

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{translations.privacy.userRights.title}</h2>
            <p className="text-gray-300 mb-4">
              {translations.privacy.userRights.content}
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>{translations.privacy.userRights.items.access}</li>
              <li>{translations.privacy.userRights.items.rectification}</li>
              <li>{translations.privacy.userRights.items.deletion}</li>
              <li>{translations.privacy.userRights.items.restriction}</li>
              <li>{translations.privacy.userRights.items.objection}</li>
              <li>{translations.privacy.userRights.items.portability}</li>
            </ul>
          </section>

          <hr className="border-gray-700 my-6" />

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{translations.privacy.cookies.title}</h2>
            <p className="text-gray-300 mb-4">
              {translations.privacy.cookies.content}
            </p>
          </section>

          <hr className="border-gray-700 my-6" />

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{translations.privacy.policyChanges.title}</h2>
            <p className="text-gray-300 mb-4">
              {translations.privacy.policyChanges.content}
            </p>
          </section>

          <hr className="border-gray-700 my-6" />

          <section>
            <h2 className="text-xl font-semibold mb-4">{translations.privacy.contact.title}</h2>
            <p className="text-gray-300 mb-4">
              {translations.privacy.contact.content}
            </p>
          </section>
        </div>

        <div className="text-center">
          <p className="text-gray-400 text-sm">
            {translations.privacy.lastUpdated}: 01/06/2023
          </p>
          <Link href={`/${locale}`} passHref>
            <Button variant="outline" className="mt-4 border-gray-700 hover:bg-gray-800">
              Retour à l&apos;accueil
            </Button>
          </Link>
        </div>
      </div>
      
      <AppFooter locale={locale} />
    </div>
  );
} 