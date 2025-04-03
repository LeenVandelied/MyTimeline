// Interfaces pour les traductions spécifiques

// Interface pour la page de politique de confidentialité
export interface PrivacyTranslations {
  title: string;
  meta: {
    description: string;
  };
  introduction: {
    title: string;
    content: string;
  };
  dataCollection: {
    title: string;
    content: string;
    items: {
      personal: string;
      usage: string;
      technical: string;
    };
  };
  dataUse: {
    title: string;
    content: string;
    items: {
      services: string;
      communication: string;
      improvement: string;
      analytics: string;
    };
  };
  dataSharing: {
    title: string;
    content: string;
    items: {
      serviceProviders: string;
      legal: string;
      business: string;
    };
  };
  dataProtection: {
    title: string;
    content: string;
  };
  userRights: {
    title: string;
    content: string;
    items: {
      access: string;
      rectification: string;
      deletion: string;
      restriction: string;
      objection: string;
      portability: string;
    };
  };
  cookies: {
    title: string;
    content: string;
  };
  policyChanges: {
    title: string;
    content: string;
  };
  contact: {
    title: string;
    content: string;
  };
  lastUpdated: string;
}

// Interface pour la page des conditions d'utilisation
export interface TermsTranslations {
  title: string;
  meta: {
    description: string;
  };
  lastUpdated: string;
  preamble: {
    title: string;
    content: string;
  };
  article1: {
    title: string;
    site: string;
    user: string;
    content: string;
  };
  article2: {
    title: string;
    content: string;
  };
  article3: {
    title: string;
    content: string;
  };
  article4: {
    title: string;
    content: string;
  };
  article5: {
    title: string;
    content: string;
  };
  article6: {
    title: string;
    content: string;
  };
  article7: {
    title: string;
    content: string;
  };
  article8: {
    title: string;
    content: string;
  };
  article9: {
    title: string;
    content: string;
  };
  article10: {
    title: string;
    content: string;
  };
}

// Interfaces pour les traductions spécifiques aux pages légales
export interface PrivacyPageTranslations {
  privacy: PrivacyTranslations;
}

export interface TermsPageTranslations {
  terms: TermsTranslations;
}

// Interface principale pour toutes les traductions
export interface TranslationResource {
  [key: string]: string | number | boolean | null | undefined | TranslationResource | Record<string, unknown>;
} 