import { NextRequest, NextResponse } from 'next/server'
import { match } from '@formatjs/intl-localematcher'
import Negotiator from 'negotiator'

const locales = ['fr', 'en']
const defaultLocale = 'fr'

function getLocale(request: NextRequest) {
  const headers = Object.fromEntries(request.headers)
  const negotiator = new Negotiator({ headers })
  
  return match(negotiator.languages(), locales, defaultLocale)
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  if (
    !pathname.startsWith('/images') &&
    !pathname.startsWith('/fonts') &&
    !pathname.startsWith('/locales') &&
    !pathname.startsWith('/_next') &&
    !pathname.startsWith('/api') &&
    !locales.some(locale => pathname.startsWith(`/${locale}`))
  ) {
    if (pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/dashboard')) {
      return NextResponse.next()
    }
    
    const locale = getLocale(request)
    const newUrl = new URL(`/${locale}${pathname}`, request.url)
    
    return NextResponse.redirect(newUrl)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next|images|fonts|locales).*)',
  ],
} 