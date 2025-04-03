import {getRequestConfig} from 'next-intl/server';
import fs from 'fs';
import path from 'path';

// Fonction pour charger les traductions depuis le dossier public/locales
async function loadMessages(locale: string) {
  const localeDir = path.join(process.cwd(), 'public', 'locales', locale);
  
  // Vérifier si le dossier existe
  if (!fs.existsSync(localeDir)) {
    return {}; // Dossier non trouvé
  }
  
  // Lire tous les fichiers JSON du dossier
  const files = fs.readdirSync(localeDir).filter(file => file.endsWith('.json'));
  
  // Charger et fusionner les contenus
  const messages: Record<string, Record<string, unknown>> = {};
  
  for (const file of files) {
    const namespace = file.replace('.json', '');
    const content = JSON.parse(
      fs.readFileSync(path.join(localeDir, file), 'utf8')
    );
    
    messages[namespace] = content;
  }
  
  return messages;
}

export default getRequestConfig(async ({locale}) => {
  // Utiliser une valeur par défaut si locale est undefined
  const safeLocale = locale || 'fr';
  
  return {
    locale: safeLocale,
    messages: await loadMessages(safeLocale)
  };
}); 