import { AppProps } from 'next/app'
import { appWithTranslation } from 'next-i18next'
import '../styles/globals.css'
import '@/styles/calendar.css'
import '@/styles/landing.css'

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}

export default appWithTranslation(MyApp)