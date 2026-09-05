import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AccountSection } from './AccountSection'

/**
 * #86 / #59 — Chapitre Compte. On couvre le flux de SUPPRESSION en 2 étapes
 * (avertissement -> confirmation par re-saisie du username) et la validation du
 * mismatch (BR-AUT-001). Le flux d'export RGPD (#59) est testé séparément dans
 * `ExportDataFlow.test.tsx` ; on le stub ici pour isoler la suppression (évite un
 * QueryClientProvider dans ces tests).
 */
vi.mock('./ExportDataFlow', () => ({
  ExportDataFlow: () => <div data-testid="export-flow-stub" />,
}))

vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
  useLocale: () => 'fr',
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

const replaceMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
}))

const deleteAccountMutate = vi.fn()
const logoutMock = vi.fn()

vi.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    user: { id: 'u1', name: 'Jane', username: 'jane', email: 'jane@ex.com', role: 'ROLE_USER' },
    deleteAccount: { mutateAsync: deleteAccountMutate, isPending: false },
  }),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', name: 'Jane', username: 'jane', email: 'jane@ex.com', role: 'ROLE_USER' },
    logout: logoutMock,
  }),
}))

describe('AccountSection — suppression du compte', () => {
  afterEach(() => vi.clearAllMocks())

  it("ouvre le dialog à l'étape avertissement", () => {
    render(<AccountSection />)
    fireEvent.click(screen.getByTestId('delete-account-open'))
    expect(screen.getByTestId('delete-account-dialog')).toBeInTheDocument()
    expect(screen.getByTestId('delete-account-continue')).toBeInTheDocument()
    // Le formulaire de confirmation n'apparaît qu'à l'étape 2.
    expect(screen.queryByTestId('delete-account-form')).not.toBeInTheDocument()
  })

  it('passe à la confirmation et bloque si le username ne correspond pas', async () => {
    render(<AccountSection />)
    fireEvent.click(screen.getByTestId('delete-account-open'))
    fireEvent.click(screen.getByTestId('delete-account-continue'))

    const input = screen.getByTestId('delete-account-username')
    fireEvent.change(input, { target: { value: 'wrong' } })
    fireEvent.click(screen.getByTestId('delete-account-confirm'))

    await waitFor(() =>
      expect(screen.getByText('settings.account.delete.mismatch')).toBeInTheDocument(),
    )
    expect(deleteAccountMutate).not.toHaveBeenCalled()
  })

  it('appelle deleteAccount avec le username exact et déconnecte', async () => {
    deleteAccountMutate.mockResolvedValue(undefined)
    render(<AccountSection />)
    fireEvent.click(screen.getByTestId('delete-account-open'))
    fireEvent.click(screen.getByTestId('delete-account-continue'))

    fireEvent.change(screen.getByTestId('delete-account-username'), {
      target: { value: 'jane' },
    })
    fireEvent.click(screen.getByTestId('delete-account-confirm'))

    await waitFor(() => expect(deleteAccountMutate).toHaveBeenCalledWith('jane'))
    await waitFor(() => expect(logoutMock).toHaveBeenCalled())
  })

  it("délègue l'export au flux dédié (#59)", () => {
    render(<AccountSection />)
    expect(screen.getByTestId('export-flow-stub')).toBeInTheDocument()
  })
})
