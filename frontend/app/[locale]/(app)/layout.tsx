import React, { ReactNode } from 'react'
import { AppShell } from '@/components/layout'

/**
 * #210 — Layout du groupe de routes connecté `(app)` (handoff §8). Enveloppe les
 * segments applicatifs (dashboard, timeline, …) dans le shell à nav latérale
 * persistante SANS affecter les URLs (un route group ne change pas le chemin) ni
 * la landing/auth publiques, qui vivent hors de ce groupe.
 *
 * Le shell (`AppShell`) est un composant client (hooks nav/thème/auth) ; ce
 * layout reste serveur et se contente de le monter. Les providers i18n / réseau /
 * auth sont fournis par les ancêtres (`app/[locale]/layout.tsx` + providers racine).
 */
export default function ConnectedAppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>
}
