'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';

export function AppFooter() {
  const t = useTranslations();
  const locale = useLocale();
  
  return (
    <footer className="bg-gray-800 py-4 text-gray-400 text-sm">
      <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
        <div>
          <p>© {new Date().getFullYear()} Ma Timeline. {t('common.footer.allRightsReserved')}</p>
        </div>
        <div className="flex space-x-4 mt-2 md:mt-0">
          <Link href={`/${locale}/terms`} className="hover:text-white transition-colors">
            {t('common.footer.termsOfService')}
          </Link>
          <Link href={`/${locale}/privacy`} className="hover:text-white transition-colors">
            {t('common.footer.privacyPolicy')}
          </Link>
        </div>
      </div>
    </footer>
  );
}   