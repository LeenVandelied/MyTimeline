import HomePage from '@/components/pages/HomePage';

// Au lieu de rediriger, cette page fait la même chose que home/page.tsx
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const paramsObj = await params;
  
  return <HomePage params={paramsObj} />;
} 