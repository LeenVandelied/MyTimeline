import '../../src/styles/globals.css'
import '../../src/styles/calendar.css'
import '../../src/styles/landing.css'
import { ReactNode } from 'react'
import ClientWrapper from '@/components/client-wrapper'
import { NextIntlClientProvider } from 'next-intl'
import { notFound } from 'next/navigation'
import fs from 'fs'
import path from 'path'

// Liste des locales supportées
const locales = ['fr', 'en']

export function generateStaticParams() {
  return locales.map(locale => ({ locale }))
}

interface LocaleLayoutProps {
  children: ReactNode
  params: {
    locale: string
  }
}

// Fonction pour charger les messages depuis le dossier public/locales
async function loadMessages(locale: string) {
  const localeDir = path.join(process.cwd(), 'public', 'locales', locale);
  
  // Vérifier si le dossier existe
  if (!fs.existsSync(localeDir)) {
    return {}; // Dossier non trouvé
  }
  
  // Lire tous les fichiers JSON du dossier
  const files = fs.readdirSync(localeDir).filter(file => file.endsWith('.json'));
  
  // Charger et fusionner les contenus
  const allMessages: Record<string, any> = {};
  
  for (const file of files) {
    try {
      const namespace = file.replace('.json', '');
      const filePath = path.join(localeDir, file);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Pour les fichiers qui ne sont pas common, les placer sous leur namespace
      if (namespace === 'common') {
        Object.assign(allMessages, content);
      } else {
        allMessages[namespace] = content;
      }
    } catch (error) {
      console.error(`Erreur lors du chargement du fichier ${file}:`, error);
    }
  }
  
  return allMessages;
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  // Accéder à params de manière asynchrone comme recommandé dans Next.js 15
  const paramsObj = await params;
  const locale = paramsObj.locale || 'fr';

  // Vérifier si la locale est supportée
  if (!locales.includes(locale)) {
    notFound()
  }

  // Charger les messages pour cette locale
  let messages;
  try {
    messages = await loadMessages(locale);
  } catch (error) {
    console.error(`Erreur lors du chargement des messages pour ${locale}:`, error);
    // Fallback vers français
    messages = await loadMessages('fr');
  }

  // Mettre à jour la langue du document
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ClientWrapper>
        {children}
      </ClientWrapper>
    </NextIntlClientProvider>
  )
} 