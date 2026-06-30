/**
 * #40 — `useAuth` ne gère plus son propre état : il lit le contexte partagé
 * exposé par `<AuthProvider>`. Ce ré-export conserve l'import historique
 * `@/hooks/useAuth` des 4 consumers (dashboard / login / AddProducts /
 * EventContent) sans toucher leurs call-sites.
 */
export { useAuth } from '@/contexts/AuthContext'
