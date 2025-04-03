export * from './settings';

// Ré-export des fonctions utilisées par client et server
export const fallbackLng = 'fr';
export const languages = [fallbackLng, 'en'];
export const defaultNS = 'common';

export function getOptions(lng = fallbackLng, ns = defaultNS) {
  return {
    supportedLngs: languages,
    fallbackLng,
    lng,
    fallbackNS: defaultNS,
    defaultNS,
    ns
  };
} 