import { redirect } from 'next/navigation'

// Cette page redirige automatiquement vers la version française du site.
// Cible = `/fr`, racine de locale et route CANONIQUE de la landing (ADR-006).
// Viser `/fr/home` rajouterait un saut : cette route redirige elle-même vers `/fr`.
export default function RootPage() {
  return redirect('/fr')
}
