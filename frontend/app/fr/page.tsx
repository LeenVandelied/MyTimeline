import { redirect } from 'next/navigation'

export default function FrPage() {
  // Pour l'instant, nous allons simplement rediriger vers la page d'accueil existante
  // pendant que nous effectuons la migration progressive
  redirect('/')
} 