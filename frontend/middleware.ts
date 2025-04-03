import { NextRequest, NextResponse } from 'next/server'
import { match } from '@formatjs/intl-localematcher'
import Negotiator from 'negotiator'
import { fallbackLng, languages } from './app/i18n'
import { APP_ROUTER_PAGES } from './app/config'

function getLocale(request: NextRequest) {
  const headers = Object.fromEntries(request.headers)
  const negotiator = new Negotiator({ headers })
  
  return match(negotiator.languages(), languages, fallbackLng)
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  const pathnameHasLocale = languages.some(
    locale => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )
  
  if (
    pathname.startsWith('/images') ||
    pathname.startsWith('/fonts') ||
    pathname.startsWith('/locales') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api')
  ) {
    return NextResponse.next()
  }
  
  const isAppRouterPage = (path: string) => {
    if (path === '/') return APP_ROUTER_PAGES.home
    if (path === '/login') return APP_ROUTER_PAGES.login
    if (path === '/register') return APP_ROUTER_PAGES.register
    if (path === '/dashboard') return APP_ROUTER_PAGES.dashboard
    if (path === '/terms') return APP_ROUTER_PAGES.terms
    if (path === '/privacy') return APP_ROUTER_PAGES.privacy
    return true
  }
  
  if (
    pathname === '/' && !APP_ROUTER_PAGES.home ||
    pathname === '/login' && !APP_ROUTER_PAGES.login ||
    pathname === '/register' && !APP_ROUTER_PAGES.register ||
    pathname === '/dashboard' && !APP_ROUTER_PAGES.dashboard ||
    pathname === '/terms' && !APP_ROUTER_PAGES.terms ||
    pathname === '/privacy' && !APP_ROUTER_PAGES.privacy
  ) {
    return NextResponse.next()
  }
  
  if (!pathnameHasLocale && isAppRouterPage(pathname)) {
    const locale = getLocale(request)
    const newUrl = new URL(`/${locale}${pathname.startsWith('/') ? pathname : `/${pathname}`}`, request.url)
    newUrl.search = request.nextUrl.search
    
    return NextResponse.redirect(newUrl)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next|images|fonts|locales).*)',
  ],
} 