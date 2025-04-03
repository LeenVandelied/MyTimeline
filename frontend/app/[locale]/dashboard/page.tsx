import { redirect } from 'next/navigation'

export default function DashboardPage({ params: { locale } }: { params: { locale: string } }) {
  if (locale === 'fr') {
    redirect('/dashboard')
  } else {
    redirect(`/dashboard?locale=${locale}`)
  }
} 