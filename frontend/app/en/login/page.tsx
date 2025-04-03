import { redirect } from 'next/navigation'

export default function EnLoginPage() {
  // Pour l'instant, nous allons simplement rediriger vers la page de login existante
  // pendant que nous effectuons la migration progressive
  redirect('/login?locale=en')
} 