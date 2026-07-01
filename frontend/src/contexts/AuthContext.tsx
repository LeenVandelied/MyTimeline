'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  getUserProfile,
  login as loginService,
  logout as logoutService,
  registerUser,
} from '@/services/authService'
import type { AuthContextType, User } from '@/types/auth'

/**
 * Extrait un message de log assaini d'une erreur arbitraire (souvent une erreur axios).
 * Ne JAMAIS logger l'objet `error` brut : `error.config.data` contient le body de la
 * requête, donc le mot de passe en clair sur login/register (review PR #132, même classe
 * que la fuite déjà corrigée dans apiClient au commit 7e58162).
 */
function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error'
}

/**
 * Contexte d'authentification — source unique de l'état `user`.
 *
 * Avant #40 : chaque appel à `useAuth()` instanciait son propre `useState`
 * + `useEffect` (4 consumers : dashboard / login / AddProducts / EventContent),
 * d'où un état incohérent (un login ne se propageait pas aux autres écrans).
 * Désormais l'état vit dans `<AuthProvider>` et tous les consumers lisent le
 * même contexte via `useAuth()`.
 *
 * SSR : `user` démarre à `null` côté serveur ET au premier rendu client
 * (lecture `localStorage` déplacée dans `useEffect`) pour éviter tout
 * mismatch d'hydratation.
 */
const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Réhydratation depuis localStorage — uniquement côté client, post-montage.
  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser) as User)
      } catch {
        localStorage.removeItem('user')
      }
    }
    setLoading(false)
  }, [])

  const fetchUser = useCallback(async () => {
    try {
      const data = await getUserProfile()
      setUser(data)
      localStorage.setItem('user', JSON.stringify(data))
    } catch (error) {
      console.error('User fetch failed', safeErrorMessage(error))
      setUser(null)
      localStorage.removeItem('user')
    } finally {
      setLoading(false)
    }
  }, [])

  const login = useCallback(
    async (username: string, password: string) => {
      setLoading(true)
      try {
        await loginService(username, password)
        await fetchUser()
      } catch (error) {
        // #53 — on relance après log assaini : la page Login mappe l'erreur
        // (401 = identifiants invalides) vers un message inline. Sans rethrow,
        // l'écran ne pourrait pas distinguer succès/échec.
        console.error('Login failed', safeErrorMessage(error))
        throw error
      } finally {
        setLoading(false)
      }
    },
    [fetchUser],
  )

  const register = useCallback(
    async (name: string, username: string, email: string, password: string) => {
      setLoading(true)
      try {
        await registerUser(name, username, email, password)
      } catch (error) {
        // #53 — rethrow : la page Register mappe le 409 (BR-AUT-001, username
        // déjà pris) vers un message inline sous le champ username.
        console.error('Registration failed', safeErrorMessage(error))
        throw error
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const logout = useCallback(async () => {
    try {
      await logoutService()
    } catch (error) {
      console.error('Logout failed', safeErrorMessage(error))
    } finally {
      setUser(null)
      localStorage.removeItem('user')
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook consommateur — remplace l'ancien `useAuth` qui gérait son propre état.
 * Lève si appelé hors d'un `<AuthProvider>` (détection précoce des oublis de wrap).
 */
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (ctx === null) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un <AuthProvider>")
  }
  return ctx
}
