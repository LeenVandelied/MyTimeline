import { AppProps } from 'next/app'
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

export default MyApp