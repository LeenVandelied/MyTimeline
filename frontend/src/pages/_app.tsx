import { AppProps } from 'next/app'
import { appWithTranslation } from 'next-i18next'
import '../styles/globals.css'
import '@/styles/calendar.css'
import '@/styles/landing.css'
import dynamic from 'next/dynamic'

// Import conditionnellement ClientOnly pour éviter les erreurs SSR
const ClientOnly = dynamic(() => import('@/components/client-only'), { ssr: false })

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ClientOnly>
      <Component {...pageProps} />
    </ClientOnly>
  )
}

export default appWithTranslation(MyApp)