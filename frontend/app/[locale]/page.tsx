// #56/#343 — mouvement de la frise du Hero (aucune couleur). Importée ICI, sur la route
// landing, et NON dans `app/[locale]/layout.tsx` : `HeroTimelineAnimation` n'est rendu que
// par `HeroSection` <- `HomePage` <- cette page, l'import au layout servait donc la feuille
// à toutes les routes localisées (login, dashboard, timeline, settings…) pour rien.
import '../../src/styles/hero-timeline.css'
import HomePage from '@/components/pages/HomePage'

/**
 * Landing — route CANONIQUE (ADR-006).
 *
 * `/[locale]/home` redirige ici en 308. Ne pas y réintroduire de rendu de `HomePage` :
 * deux URLs servant le même contenu en 200, c'est exactement le doublon que l'ADR-006
 * a supprimé.
 */
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const paramsObj = await params

  return <HomePage params={paramsObj} />
}
