import { permanentRedirect } from 'next/navigation'

/**
 * Route LEGACY de la landing — redirige en permanence vers `/[locale]` (ADR-006).
 *
 * `/[locale]` et `/[locale]/home` rendaient le MÊME composant en 200, soit du contenu
 * dupliqué sous deux URLs. La racine de locale est retenue comme canonique ; cette
 * route est conservée (et non supprimée) parce que des liens entrants peuvent exister
 * hors du dépôt.
 *
 * 308 et non 307 : la consolidation SEO est l'objet de la décision. Contrepartie
 * assumée — un 308 se met en cache durablement côté navigateur (cf. ADR-006).
 */
export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params

  permanentRedirect(`/${locale}`)
}
