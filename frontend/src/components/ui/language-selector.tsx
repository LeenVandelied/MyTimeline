import { useRouter } from 'next/router'
import { Button } from './button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './dropdown-menu'
import { Globe } from 'lucide-react'

const languages = [
  { code: 'fr', name: 'Français' },
  { code: 'en', name: 'English' }
]

export function LanguageSelector() {
  const router = useRouter()
  const { pathname, asPath, query } = router
  const currentLocale = router.locale || 'fr'

  const changeLanguage = (locale: string) => {
    router.push({ pathname, query }, asPath, { locale })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
          <Globe className="h-4 w-4" />
          <span className="sr-only">Changer de langue</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => changeLanguage(language.code)}
            className={currentLocale === language.code ? 'bg-accent text-accent-foreground font-medium' : ''}
          >
            {language.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 