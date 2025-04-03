import { redirect } from 'next/navigation'

export default function RegisterPage({ params: { locale } }: { params: { locale: string } }) {
  if (locale === 'fr') {
    redirect('/register')
  } else {
    redirect(`/register?locale=${locale}`)
  }
} 