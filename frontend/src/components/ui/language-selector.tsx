'use client';

import { usePathname } from 'next/navigation';
import { Button } from './button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './dropdown-menu';
import { Globe } from 'lucide-react';
import { useLocale } from 'next-intl';
import Link from 'next/link';

const languages = [
  { code: 'fr', name: 'Français' },
  { code: 'en', name: 'English' }
];

export function LanguageSelector() {
  const pathname = usePathname() || '';
  const locale = useLocale();
  
  // Récupérer le chemin sans le préfixe de locale
  const pathnameWithoutLocale = pathname.replace(`/${locale}`, '');
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
          <Globe className="h-4 w-4" />
          <span className="sr-only">Changer de langue</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-gray-800">
        {languages.map((language) => (
          <Link
            key={language.code}
            href={`/${language.code}${pathnameWithoutLocale}`}
            className="w-full"
          >
            <DropdownMenuItem
              className={locale === language.code ? 'bg-accent text-accent-foreground font-medium hover:bg-gray-700' : 'hover:bg-gray-700'}
            >
              {language.name}
            </DropdownMenuItem>
          </Link>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 