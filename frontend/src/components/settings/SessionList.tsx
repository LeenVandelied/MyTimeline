'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Monitor, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { serverDateTime } from '@/lib/date-iso'
import type { Session } from '@/types/settings'

/**
 * #86 — Liste des sessions actives (présentation pure). Reçoit les données et
 * callbacks du parent (`SecuritySection` -> `useSessionManager`) : réutilisable
 * tel quel par la variante mobile (#87), aucun appel réseau ici.
 */
interface SessionListProps {
  sessions: Session[]
  isLoading: boolean
  isError: boolean
  revokingId: string | null
  onRevoke: (id: string) => void
  onRevokeOthers: () => void
  isRevokingOthers: boolean
}

/**
 * #518 — Horodatage de dernière activité en `<time datetime>` (convention DS,
 * `i18n.css` §7).
 *
 * `serverDateTime` et NON `new Date(iso)` : `lastActivity` est un
 * `LocalDateTime` Java, donc une chaîne SANS offset, à lire dans le référentiel
 * SERVEUR (cf. le pavé « horodatages naïfs » de `lib/date-iso.ts`). Le lire avec
 * `new Date` la faisait interpréter dans le fuseau du NAVIGATEUR — l'heure
 * affichée et l'attribut `datetime` étaient tous deux décalés de l'offset local,
 * et contredisaient `ExportDataFlow` qui applique, lui, la bonne convention
 * depuis #58. Correction d'un défaut PRÉ-EXISTANT à #518 : l'heure visible
 * change pour tout utilisateur hors UTC.
 *
 * Le libellé porte `timeStyle:'short'`, donc une HEURE : l'attribut désigne
 * l'instant complet (`machine`), pas seulement le jour. Sur un `iso` illisible,
 * `label` rend la chaîne brute et `machine` vaut `null` — aucun attribut
 * `datetime` n'est émis (plutôt qu'une valeur fausse) et le `<time>` reste du
 * HTML valide.
 *
 * DELTA VISUEL ASSUMÉ : `.mt-date--long` impose 13px là où le `<p>` porte
 * `text-xs` (15px) — l'IP voisine, elle, reste à 15px. Même arbitrage qu'au #72 :
 * la typographie d'une date appartient au DS. Non vérifié en navigateur (jsdom
 * n'applique aucune feuille du DS).
 */
function SessionTimestamp({ iso, locale }: { iso: string; locale: string }) {
  const { label, machine } = serverDateTime(iso, locale)
  return (
    <time className="mt-date--long" dateTime={machine ?? undefined}>
      {label}
    </time>
  )
}

export function SessionList({
  sessions,
  isLoading,
  isError,
  revokingId,
  onRevoke,
  onRevokeOthers,
  isRevokingOthers,
}: SessionListProps) {
  const t = useTranslations('settings')
  const locale = useLocale()

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Spinner label={t('security.sessions.loading')} className="text-ink-muted" />
      </div>
    )
  }

  if (isError) {
    return (
      <p className="text-danger text-sm" role="alert">
        {t('security.sessions.error')}
      </p>
    )
  }

  if (sessions.length === 0) {
    return <p className="text-ink-muted text-sm">{t('security.sessions.empty')}</p>
  }

  const otherSessionsCount = sessions.filter((s) => !s.current).length

  return (
    <div className="space-y-3" data-testid="session-list">
      <ul className="space-y-2">
        {sessions.map((session) => (
          <li
            key={session.id}
            className={cn(
              'border-rule flex items-center justify-between gap-3 rounded-md border p-3',
              session.current && 'border-accent/50 bg-accent-soft/30',
            )}
            data-testid="session-item"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Monitor className="text-ink-muted h-5 w-5 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {session.deviceInfo ?? t('security.sessions.unknownDevice')}
                  {session.current && (
                    <span className="text-accent ml-2 text-xs font-semibold">
                      {t('security.sessions.current')}
                    </span>
                  )}
                </p>
                <p className="text-ink-muted truncate text-xs">
                  {session.ipAddress ?? t('security.sessions.unknownIp')}
                  {' · '}
                  <SessionTimestamp iso={session.lastActivity} locale={locale} />
                </p>
              </div>
            </div>
            {!session.current && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={revokingId === session.id}
                onClick={() => onRevoke(session.id)}
                data-testid={`revoke-session-${session.id}`}
                aria-label={t('security.sessions.revokeOne')}
              >
                {revokingId === session.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  t('security.sessions.revoke')
                )}
              </Button>
            )}
          </li>
        ))}
      </ul>

      {otherSessionsCount > 0 && (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onRevokeOthers}
          disabled={isRevokingOthers}
          data-testid="revoke-other-sessions"
        >
          {isRevokingOthers ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            t('security.sessions.revokeOthers')
          )}
        </Button>
      )}
    </div>
  )
}
