import { AppProps } from 'next/app'
import '../styles/globals.css'
import '../i18n'
import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
  }, []);

  return (
    <>
      <Component {...pageProps} />
      <Toaster position="top-right" />
    </>
  )
}

export default MyApp