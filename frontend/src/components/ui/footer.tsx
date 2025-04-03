'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface FooterProps {
  locale: string;
}

export function Footer({ locale }: FooterProps) {
  const t = useTranslations();
  const currentYear = new Date().getFullYear();
  
  
  return (
    <footer className="bg-gray-900 py-12 border-t border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0">
            <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-indigo-600 mb-2">
              Ma Timeline
            </div>
            <p className="text-gray-400">{t('landing.footer.description')}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            <div>
              <h4 className="font-bold mb-3 text-white">{t('landing.footer.product')}</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-purple-400 transition">{t('landing.footer.features')}</a></li>
                <li><a href="#how-it-works" className="hover:text-purple-400 transition">{t('landing.footer.howItWorks')}</a></li>
                <li><a href="#testimonials" className="hover:text-purple-400 transition">{t('landing.footer.testimonials')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-3 text-white">{t('landing.footer.legal')}</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href={`/${locale}/terms`} className="hover:text-purple-400 transition">
                    {t('landing.footer.terms')}
                  </Link>
                </li>
                <li>
                  <Link href={`/${locale}/privacy`} className="hover:text-purple-400 transition">
                    {t('landing.footer.privacy')}
                  </Link>
                </li>
                <li><a href="#" className="hover:text-purple-400 transition">{t('landing.footer.legalNotice')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-3 text-white">{t('landing.footer.account')}</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href={`/${locale}/login`} className="hover:text-purple-400 transition">
                    {t('landing.footer.login')}
                  </Link>
                </li>
                <li>
                  <Link href={`/${locale}/register`} className="hover:text-purple-400 transition">
                    {t('landing.footer.register')}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-500">
          <p>&copy; {currentYear} Ma Timeline. {t('footer.allRightsReserved')}</p>
        </div>
      </div>
    </footer>
  );
} 