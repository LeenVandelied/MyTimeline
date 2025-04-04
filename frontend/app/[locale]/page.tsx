import { redirect } from 'next/navigation'

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale || 'fr'
  
  if (locale === 'fr') {
    redirect('/')
  } else {
    redirect(`/?locale=${locale}`)
  }
} 