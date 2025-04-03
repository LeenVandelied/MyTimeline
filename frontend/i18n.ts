import {getRequestConfig} from 'next-intl/server';
import fs from 'fs';
import path from 'path';

async function loadMessages(locale: string) {
  const localeDir = path.join(process.cwd(), 'public', 'locales', locale);
  
  if (!fs.existsSync(localeDir)) {
    return {};
  }
  
  const files = fs.readdirSync(localeDir).filter(file => file.endsWith('.json'));
  
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
  const safeLocale = locale || 'fr';
  
  return {
    locale: safeLocale,
    messages: await loadMessages(safeLocale)
  };
}); 