import {hasLocale} from 'next-intl';
import {getRequestConfig} from 'next-intl/server';
import fs from 'fs';
import path from 'path';

import {SUPPORTED_LOCALES, DEFAULT_LOCALE, type Locale} from '@/i18n/locales';

export async function loadMessages(locale: string) {
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

/**
 * #279 — `requestLocale` + `hasLocale`, en remplacement du paramètre `locale`
 * déprécié depuis next-intl 3.22 (PIT-S34-001).
 *
 * Ce fichier EST le request-config actif de l'application : `next.config.mjs`
 * fait `createNextIntlPlugin('./i18n.ts')`. Tout appel serveur à
 * `getTranslations()` (pages `privacy` / `terms`) résout ses messages ici.
 *
 * ⚠ `requestLocale` n'est PAS un simple renommage : c'est une `Promise`, à
 * `await`. Elle couvre aussi le cas d'un `locale` explicite passé à
 * `getTranslations({locale})` — next-intl l'injecte dans `requestLocale` à la
 * place du segment de route, donc les pages légales restent servies.
 *
 * ⚠ Le segment `[locale]` se comporte comme un attrape-tout (`/unknown.txt`) :
 * la valeur peut être `undefined` OU invalide. `hasLocale` (importé de
 * `next-intl`, pas de `next-intl/server`) valide contre `SUPPORTED_LOCALES`,
 * source de vérité unique (#235, PIT-S33-002) — pas de liste réinventée ici.
 * Repli sur `DEFAULT_LOCALE` (`fr`), locale de référence du projet.
 */
/**
 * Normalise la valeur brute de `requestLocale` en une locale supportée.
 *
 * Extraite du `getRequestConfig` UNIQUEMENT pour être testable : sous Vitest,
 * `next-intl/server` se résout sur son bundle react-client, qui remplace
 * `getRequestConfig` par un stub levant « not supported in Client Components ».
 * Le `default export` est donc inatteignable en test unitaire, alors que c'est
 * précisément CETTE branche de repli dont la sémantique change ici — et que
 * `next build` n'exerce pas (il ne prérend que des segments valides).
 */
export function resolveLocale(requested: unknown): Locale {
  return hasLocale(SUPPORTED_LOCALES, requested) ? requested : DEFAULT_LOCALE;
}

export default getRequestConfig(async ({requestLocale}) => {
  const locale = resolveLocale(await requestLocale);

  return {
    locale,
    messages: await loadMessages(locale)
  };
});
