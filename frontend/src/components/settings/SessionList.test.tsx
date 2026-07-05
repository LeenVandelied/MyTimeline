import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SessionList } from './SessionList'
import type { Session } from '@/types/settings'

/**
 * #86 — Liste des sessions (présentation pure). On mocke next-intl + useLocale.
 * Assertions : session courante non révocable, révocation individuelle appelée,
 * bouton « révoquer les autres » présent seulement s'il existe d'autres sessions.
 */
vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
  useLocale: () => 'fr',
}))

const SESSIONS: Session[] = [
  {
    id: 'sess-current',
    deviceInfo: 'Chrome / macOS',
    ipAddress: '192.168.1.0',
    lastActivity: '2026-07-05T10:00:00',
    createdAt: '2026-07-01T09:00:00',
    current: true,
  },
  {
    id: 'sess-other',
    deviceInfo: 'Firefox / Windows',
    ipAddress: '10.0.0.0',
    lastActivity: '2026-07-04T18:00:00',
    createdAt: '2026-07-02T12:00:00',
    current: false,
  },
]

const noop = () => {}

describe('SessionList', () => {
  it('affiche un spinner pendant le chargement', () => {
    render(
      <SessionList
        sessions={[]}
        isLoading
        isError={false}
        revokingId={null}
        onRevoke={noop}
        onRevokeOthers={noop}
        isRevokingOthers={false}
      />,
    )
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it("affiche un message d'erreur", () => {
    render(
      <SessionList
        sessions={[]}
        isLoading={false}
        isError
        revokingId={null}
        onRevoke={noop}
        onRevokeOthers={noop}
        isRevokingOthers={false}
      />,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('marque la session courante et ne propose PAS de la révoquer', () => {
    render(
      <SessionList
        sessions={SESSIONS}
        isLoading={false}
        isError={false}
        revokingId={null}
        onRevoke={noop}
        onRevokeOthers={noop}
        isRevokingOthers={false}
      />,
    )
    expect(screen.getByText('settings.security.sessions.current')).toBeInTheDocument()
    // Pas de bouton révoquer sur la session courante.
    expect(screen.queryByTestId('revoke-session-sess-current')).not.toBeInTheDocument()
    // Mais bien un sur l'autre session.
    expect(screen.getByTestId('revoke-session-sess-other')).toBeInTheDocument()
  })

  it("appelle onRevoke avec l'id de la session ciblée", () => {
    const onRevoke = vi.fn()
    render(
      <SessionList
        sessions={SESSIONS}
        isLoading={false}
        isError={false}
        revokingId={null}
        onRevoke={onRevoke}
        onRevokeOthers={noop}
        isRevokingOthers={false}
      />,
    )
    fireEvent.click(screen.getByTestId('revoke-session-sess-other'))
    expect(onRevoke).toHaveBeenCalledWith('sess-other')
  })

  it("propose « révoquer les autres » quand il existe d'autres sessions", () => {
    const onRevokeOthers = vi.fn()
    render(
      <SessionList
        sessions={SESSIONS}
        isLoading={false}
        isError={false}
        revokingId={null}
        onRevoke={noop}
        onRevokeOthers={onRevokeOthers}
        isRevokingOthers={false}
      />,
    )
    fireEvent.click(screen.getByTestId('revoke-other-sessions'))
    expect(onRevokeOthers).toHaveBeenCalled()
  })

  it("masque « révoquer les autres » s'il n'y a que la session courante", () => {
    render(
      <SessionList
        sessions={[SESSIONS[0]]}
        isLoading={false}
        isError={false}
        revokingId={null}
        onRevoke={noop}
        onRevokeOthers={noop}
        isRevokingOthers={false}
      />,
    )
    expect(screen.queryByTestId('revoke-other-sessions')).not.toBeInTheDocument()
  })
})
