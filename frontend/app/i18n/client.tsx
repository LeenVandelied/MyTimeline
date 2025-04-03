'use client';

import { useEffect } from 'react';
import i18next from 'i18next';
import { initReactI18next, useTranslation as useTranslationOrg } from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { getOptions } from '.';

i18next
  .use(initReactI18next)
  .use(LanguageDetector)
  .use(resourcesToBackend((language: string, namespace: string) => 
    import(`../../public/locales/${language}/${namespace}.json`)))
  .init({
    ...getOptions(),
    detection: {
      order: ['path', 'htmlTag', 'cookie', 'navigator'],
    }
  });

export function useTranslation(lng: string, ns: string, options = {}) {
  const ret = useTranslationOrg(ns, options);
  const { i18n } = ret;
  
  useEffect(() => {
    if (i18n.resolvedLanguage === lng) return;
    i18n.changeLanguage(lng);
  }, [lng, i18n]);
  
  return ret;
} 