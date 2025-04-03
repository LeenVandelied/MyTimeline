'use client';

import { useEffect, useState, ReactNode } from 'react';

interface ClientWrapperProps {
  children: ReactNode;
}

/**
 * Ce composant permet d'envelopper tout composant qui utilise useLayoutEffect
 * pour s'assurer qu'il n'est exécuté que côté client.
 * Cela évite le warning "useLayoutEffect does nothing on the server"
 */
export default function ClientWrapper({ children }: ClientWrapperProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    // Rendu d'un placeholder côté serveur
    return <div style={{ visibility: 'hidden' }}></div>;
  }

  return <>{children}</>;
} 