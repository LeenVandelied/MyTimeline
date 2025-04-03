import { redirect } from 'next/navigation'

export default function DashboardPage() {
  // Dans le futur, cette page sera implémentée avec le App Router
  // Pour l'instant, nous redirigeons vers la page Legacy
  return redirect('/dashboard')
} 