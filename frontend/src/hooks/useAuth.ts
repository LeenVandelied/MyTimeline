/**
 * #40 — `useAuth` ne gère plus son propre état : il lit le contexte partagé
 * exposé par `<AuthProvider>`. Ce ré-export conserve l'import historique
 * `@/hooks/useAuth` des consumers d'origine (dashboard / login / AddProducts /
 * EventContent, ce dernier supprimé #634) sans toucher leurs call-sites.
 */
export { useAuth } from '@/contexts/AuthContext'
