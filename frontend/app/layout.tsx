import '../src/styles/globals.css'
import '../src/styles/calendar.css'
import '../src/styles/landing.css'

export const metadata = {
  title: 'Ma Timeline',
  description: 'Votre assistant personnel d\'organisation et de gestion du temps',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children;
} 