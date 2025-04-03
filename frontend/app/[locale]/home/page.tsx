import HomePage from '@/components/pages/HomePage';

// Cette page est rendue côté serveur et utilise un composant client pour le contenu
export default async function Home({ params }: { params: { locale: string } }) {
  // Accéder aux params de manière asynchrone
  const paramsObj = await params;
  
  return <HomePage params={paramsObj} />;
} 