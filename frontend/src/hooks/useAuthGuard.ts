'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { useAuth } from '@/hooks/useAuth'
import type { User } from '@/types/auth'

/**
 * #210 — Garde d'authentification partagée (anti-flash anonyme, DEC-S9-002).
 *
 * Factorise le pattern jusqu'ici dupliqué dans les pages du groupe `(app)`
 * (dashboard / products / timeline) et désormais consommé aussi par `AppShell`
 * (garde au niveau du shell : la sidebar authentifiée ne doit jamais flasher
 * pour un anonyme atteignant directement une route protégée).
 *
 * Tant que `loading` est `true` (re-fetch `/me` au montage — source de vérité
 * serveur, cf. `AuthContext`), on ne redirige pas. Une fois `loading` retombé,
 * si aucun `user` → redirection vers `/${locale}/login` (localisée,
 * `localePrefix:'always'` ; `middleware.ts` = next-intl seul, aucune protection
 * serveur). `middleware.ts` n'assurant pas de garde serveur, cette garde
 * client reste la seule ligne de défense (defense-in-depth : shell + pages).
 */
export function useAuthGuard(): { user: User | null; loading: boolean } {
  const locale = useLocale()
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/${locale}/login`)
    }
  }, [user, loading, router, locale])

  return { user, loading }
}
