import { AppProps } from 'next/app'
import { appWithTranslation } from 'next-i18next'
import '../styles/globals.css'

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}

// Wrapper l'application avec appWithTranslation pour activer l'internationalisation
export default appWithTranslation(MyApp)