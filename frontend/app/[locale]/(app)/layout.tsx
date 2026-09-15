import React, { ReactNode } from 'react'
import { AppShell } from '@/components/layout'

/**
 * #210 — Layout du groupe de routes connecté `(app)` (handoff §8). Enveloppe les
 * segments applicatifs (dashboard, timeline, products) dans le shell à nav
 * latérale persistante SANS affecter les URLs (un route group ne change pas le
 * chemin) ni la landing/auth publiques, qui vivent hors de ce groupe.
 *
 * #299 — `settings` a REJOINT ce groupe : sa coquille (`SettingsShell`) ne porte
 * plus de sidebar 220px mais une barre d'onglets horizontale, donc plus de double
 * nav verticale. L'URL `/[locale]/settings` est inchangée (route group transparent).
 * ⚠ Tout segment ajouté ici doit l'être AUSSI dans `PROTECTED_APP_SEGMENTS`
 * (`src/lib/auth-guard-paths.ts`) — le middleware ne peut pas dériver la liste du
 * système de fichiers, cf. ADR-004 §Limites.
 *
 * Le shell (`AppShell`) est un composant client (hooks nav/thème/auth) ; ce
 * layout reste serveur et se contente de le monter. Les providers i18n / réseau /
 * auth sont fournis par les ancêtres (`app/[locale]/layout.tsx` + providers racine).
 */
export default function ConnectedAppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>
}
