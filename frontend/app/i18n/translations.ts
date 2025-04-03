import { initReactI18next } from 'react-i18next/initReactI18next';
import { createInstance } from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { getOptions } from './settings';
import { TranslationResource } from './types';

// Re-export des types depuis le fichier types.ts
export type { PrivacyTranslations, TermsTranslations, PrivacyPageTranslations, TermsPageTranslations } from './types';

// Fonction pour obtenir les traductions
export async function getTranslations(locale: string, namespace: string): Promise<TranslationResource> {
  const i18nextInstance = createInstance();
  
  await i18nextInstance
    .use(initReactI18next)
    .use(resourcesToBackend((language: string, namespace: string) => 
      import(`../../public/locales/${language}/${namespace}.json`)))
    .init(getOptions(locale, namespace));
  
  const translations = await i18nextInstance.getResourceBundle(locale, namespace);
  return translations as TranslationResource;
} 