import { redirect } from 'next/navigation'

export default async function HomePage({ params }: { params: { locale: string } }) {
  const { locale } = await params;
  
  if (locale === 'fr') {
    redirect('/')
  } else {
    redirect(`/?locale=${locale}`)
  }
} 