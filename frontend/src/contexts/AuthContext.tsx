'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  getUserProfile,
  login as loginService,
  logout as logoutService,
  registerUser,
} from '@/services/authService'
import { updatePreferences } from '@/services/userService'
import {
  ThemePersistenceContext,
  readStoredThemeChoice,
  useApplyAccountTheme,
  type ThemeChoice,
  type ThemeChoicePersister,
} from '@/hooks/useThemeChoice'
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
 * + `useEffect` (4 consumers : dashboard / login / AddProducts / EventContent —
 * ce dernier supprimé #634, remplacé par `TimelineEditHost`/`useEventEditConflict`),
 * d'où un état incohérent (un login ne se propageait pas aux autres écrans).
 * Désormais l'état vit dans `<AuthProvider>` et tous les consumers lisent le
 * même contexte via `useAuth()`.
 *
 * SSR : `user` démarre à `null` côté serveur ET au premier rendu client
 * pour éviter tout mismatch d'hydratation.
 *
 * #135 (A17) — Sécurité : le user (PII : email, name) N'EST PLUS miroité dans
 * `localStorage` (lisible par tout payload XSS). La session est portée par le
 * seul cookie JWT HttpOnly (invisible pour JS). Au montage, on re-fetch
 * `GET /api/auth/me` (le cookie voyage automatiquement, `withCredentials`)
 * pour restaurer l'état d'auth depuis la source de vérité serveur. `loading`
 * reste `true` le temps de ce re-fetch → pas de flash non-authentifié.
 *
 * #653 — PRÉFÉRENCE DE THÈME DU COMPTE (ADR-010, BR-AUT-013).
 *  - ARBITRAGE à la CONNEXION EXPLICITE seulement (succès de `login`), jamais à
 *    la restauration de session au montage : si le compte porte une préférence,
 *    elle est appliquée localement SANS réécriture ; sinon un choix local
 *    EXPLICITE (clé next-themes présente) est posé sur le compte ; sinon rien
 *    (le compte reste `null`). `register` n'ouvre pas de session (le backend ne
 *    pose aucun cookie, l'écran renvoie vers /login) : l'arbitrage a lieu au
 *    login qui suit.
 *  - ENSUITE, `persistThemeChoice` (injecté dans `useThemeChoice` via
 *    `ThemePersistenceContext`) écrit chaque bascule sur le compte si un
 *    utilisateur est authentifié. Échec réseau : log assaini, thème local
 *    conservé, aucun retour arrière visuel.
 *  - Logout : le thème local n'est pas touché.
 */
const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const applyAccountTheme = useApplyAccountTheme()

  // #653 — miroirs synchrones de l'état, lus par `persistThemeChoice` (appelé
  // hors rendu, depuis un clic) : l'état React n'y serait qu'une photo périmée.
  //  - `userRef` : user courant (ou `null`) ;
  //  - `accountThemeRef` : valeur que le compte porte OU portera une fois le
  //    dernier PUT en vol abouti. Comparer au seul `user.themePreference`
  //    confirmé raterait l'aller-retour rapide (sombre, PUT en vol, puis retour
  //    à la valeur confirmée : sauté à tort, le compte finirait sur sombre) ;
  //  - `persistSeqRef` : numéro du dernier PUT émis — seule SA réponse fait foi.
  const userRef = useRef<User | null>(null)
  const accountThemeRef = useRef<ThemeChoice | null>(null)
  const persistSeqRef = useRef(0)

  const commitUser = useCallback((next: User | null) => {
    userRef.current = next
    accountThemeRef.current = next?.themePreference ?? null
    setUser(next)
  }, [])

  /**
   * Restaure le user depuis `/api/auth/me` ; renvoie le user chargé, ou `null`.
   * `beforeCommit` s'exécute juste avant la publication du user, dans le même
   * tour (rendu groupé par React 18) : l'écran de connexion, qui navigue dès que
   * `user` existe, ne peut pas peindre le thème local avant celui du compte.
   */
  const loadUser = useCallback(
    async (beforeCommit?: (loaded: User) => void): Promise<User | null> => {
      try {
        const data = await getUserProfile()
        beforeCommit?.(data)
        commitUser(data)
        return data
      } catch (error) {
        // Pas de session valide (401/pas de cookie) OU /me en erreur : anonyme.
        console.error('User fetch failed', safeErrorMessage(error))
        commitUser(null)
        return null
      } finally {
        setLoading(false)
      }
    },
    [commitUser],
  )

  const refreshUser = useCallback(async () => {
    await loadUser()
  }, [loadUser])

  // Restauration de session au montage depuis la source de vérité serveur (/me),
  // et non depuis un miroir localStorage (#135). Le cookie JWT HttpOnly suffit.
  // #653 — AUCUN arbitrage de thème ici (décision S111 : connexion explicite
  // seulement ; un appareil déjà connecté suit le compte à sa reconnexion).
  useEffect(() => {
    void loadUser()
  }, [loadUser])

  /**
   * #653 — Pose `choice` sur le compte si un utilisateur est authentifié et que
   * le compte ne le porte pas déjà. Ne lève jamais : l'échec est journalisé
   * (message assaini, jamais l'objet axios) et le thème local reste appliqué.
   */
  const persistThemeChoice = useCallback(
    async (choice: ThemeChoice): Promise<void> => {
      const owner = userRef.current
      if (owner === null || accountThemeRef.current === choice) return
      accountThemeRef.current = choice
      const seq = ++persistSeqRef.current
      try {
        const updated = await updatePreferences({ themePreference: choice })
        // Réponse périmée (un PUT plus récent est parti) ou session changée
        // entre-temps (logout, autre compte) : on ne la recopie pas.
        if (seq === persistSeqRef.current && userRef.current?.id === updated.id) {
          commitUser(updated)
        }
      } catch (error) {
        console.error('Theme preference save failed', safeErrorMessage(error))
        // Le compte n'a pas bougé : la valeur attendue redevient la confirmée,
        // pour qu'une bascule ultérieure vers `choice` ne soit pas sautée.
        if (seq === persistSeqRef.current) {
          accountThemeRef.current = userRef.current?.themePreference ?? null
        }
      }
    },
    [commitUser],
  )

  const themePersister = useCallback<ThemeChoicePersister>(
    (choice) => {
      void persistThemeChoice(choice)
    },
    [persistThemeChoice],
  )

  /*
   * #653 — arbitrage à la connexion (règle BR-AUT-013, décision S111), en deux
   * temps parce que le second exige un user publié (`persistThemeChoice` n'écrit
   * que pour un utilisateur authentifié) et que le premier doit le précéder :
   *  1. `applyAccountThemeAtLogin` (avant publication) : le compte porte une
   *     préférence → appliquée localement, JAMAIS réécrite ;
   *  2. `adoptLocalThemeAtLogin` (après) : compte sans préférence → le choix
   *     local EXPLICITE devient celui du compte ; sans choix local, rien.
   */
  const applyAccountThemeAtLogin = useCallback(
    (account: User) => {
      if (account.themePreference !== null) applyAccountTheme(account.themePreference)
    },
    [applyAccountTheme],
  )

  const adoptLocalThemeAtLogin = useCallback(
    async (account: User): Promise<void> => {
      if (account.themePreference !== null) return
      const local = readStoredThemeChoice()
      if (local === null) return // aucun choix nulle part : le compte reste `null`
      await persistThemeChoice(local)
    },
    [persistThemeChoice],
  )

  const login = useCallback(
    async (username: string, password: string) => {
      setLoading(true)
      try {
        await loginService(username, password)
        const account = await loadUser(applyAccountThemeAtLogin)
        // Attendu avant de rendre la main ; ne lève pas — un PUT en échec ne
        // fait pas échouer la connexion.
        if (account !== null) await adoptLocalThemeAtLogin(account)
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
    [loadUser, applyAccountThemeAtLogin, adoptLocalThemeAtLogin],
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
      // #135 — plus de miroir localStorage à purger : l'état vit en mémoire (React)
      // et la session dans le cookie JWT HttpOnly (invalidé par POST /auth/logout).
      // #653 — le thème local n'est PAS touché.
      commitUser(null)
    }
  }, [commitUser])

  // Mémoïsé : `useApplyAccountTheme` abonne ce fournisseur au contexte de thème,
  // qui change à chaque bascule — sans mémo, tous les `useAuth()` re-rendraient.
  const value = useMemo<AuthContextType>(
    () => ({ user, login, register, logout, refreshUser, loading }),
    [user, login, register, logout, refreshUser, loading],
  )

  return (
    <AuthContext.Provider value={value}>
      <ThemePersistenceContext.Provider value={themePersister}>
        {children}
      </ThemePersistenceContext.Provider>
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
