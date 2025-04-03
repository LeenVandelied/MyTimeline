import { redirect } from 'next/navigation';
import { fallbackLng } from './i18n';

export default function RootPage() {
  // Pour éviter les boucles de redirection, on ne redirige que si on n'est pas déjà dans une redirection
  // Comme ce code s'exécute côté serveur, on ne peut pas lire les headers comme dans le middleware
  // On redirige explicitement vers /home au lieu de juste la locale
  redirect(`/${fallbackLng}/home`);
} 