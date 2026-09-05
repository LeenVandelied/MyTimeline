'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Monitor, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
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

function formatDate(iso: string, locale: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
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
                  {formatDate(session.lastActivity, locale)}
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
