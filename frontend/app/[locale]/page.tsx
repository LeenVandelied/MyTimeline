import { redirect } from 'next/navigation'

export default function HomePage({ params: { locale } }: { params: { locale: string } }) {
  if (locale === 'fr') {
    redirect('/')
  } else {
    redirect(`/?locale=${locale}`)
  }
} 