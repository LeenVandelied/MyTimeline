'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

interface CtaSectionProps {
  locale: string
}

/**
 * Bandeau d'appel à l'action final — extrait du monolithe `HomePage` (#56).
 *
 * #295 : `<Button asChild>` + `<Link>` interne, au lieu de `<Link passHref><Button>`
 * qui produisait un `<button>` dans un `<a>` (HTML invalide, double tabulation).
 *
 * Sprint 48 — critère d'acceptation n°8 de #56 (« la page est responsive mobile »).
 * Le variant Button impose `whitespace-nowrap` et `h-9` : combiné à `px-10 py-6
 * text-lg`, le libellé forçait une largeur de 465 px, soit plus que les 375 px du
 * viewport mobile — la PAGE entière gagnait un scroll horizontal. `whitespace-normal`
 * laisse le libellé se replier ; `h-auto` évite que la 2ᵉ ligne soit rognée par la
 * hauteur fixe du variant. Défaut PRÉEXISTANT au sprint (mêmes classes dans le
 * monolithe `HomePage` d'origine), pas une régression du passage à `asChild` — ce
 * bouton n'est pas un flex item et n'a donc jamais souffert de la troncature du hero.
 *
 * Contraste du titre : le `<h2>` ne portait AUCUNE classe de couleur et héritait donc
 * de `text-ink` sur le fond `bg-accent` → **2.41:1 mesuré au navigateur**, sous le seuil
 * WCAG AA de 3:1 applicable au grand texte (≥24px gras). Le `<p>` juste en dessous
 * utilisait déjà `text-accent-ink` (6.94:1) : l'omission sur le titre était un oubli.
 * Aligné sur `text-accent-ink`. Défaut PRÉEXISTANT (même classe dans le monolithe).
 */
export function CtaSection({ locale }: CtaSectionProps) {
  const t = useTranslations()

  return (
    <section className="bg-accent section-animation py-20">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-accent-ink mb-6 text-3xl font-bold md:text-4xl">
          {t('common.landing.cta.title')}
        </h2>
        <p className="text-accent-ink mx-auto mb-10 max-w-3xl text-xl">
          {t('common.landing.cta.subtitle')}
        </p>
        <Button
          asChild
          className="bg-primary text-primary-ink hover:bg-primary-hover h-auto rounded-lg px-10 py-6 text-lg whitespace-normal transition-all"
        >
          <Link href={`/${locale}/register`}>{t('common.landing.cta.button')}</Link>
        </Button>
      </div>
    </section>
  )
}
