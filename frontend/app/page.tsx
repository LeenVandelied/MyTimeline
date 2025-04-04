import { redirect } from 'next/navigation';

// Cette page redirige automatiquement vers la version française du site
export default function RootPage() {
  return redirect('/fr/home');
} 