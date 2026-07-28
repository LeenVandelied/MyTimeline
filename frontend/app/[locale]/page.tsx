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
