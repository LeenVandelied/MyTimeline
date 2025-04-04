import '../src/styles/globals.css'
import '../src/styles/calendar.css'
import '../src/styles/landing.css'
import '../src/styles/animations.css'
import { ReactNode } from 'react'

export const metadata = {
  title: 'Ma Timeline',
  description: 'Application de gestion de temps et événements',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html suppressHydrationWarning>
      <body>
        {children}
      </body>
    </html>
  );
} 