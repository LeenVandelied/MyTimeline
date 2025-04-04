import HomePage from '@/components/pages/HomePage';

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const paramsObj = await params;
  
  return <HomePage params={paramsObj} />;
} 