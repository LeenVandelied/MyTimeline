import { clearPersistedAccounts } from './support/accounts'

/**
 * `globalSetup` Playwright : s'exécute UNE fois, avant TOUT projet (y compris
 * `setup`). On purge `.auth/accounts.json` d'un éventuel run précédent pour que le
 * projet `setup` régénère des identités fraîches (`RUN`) et les persiste ; les
 * process de specs (`chromium`) reliront ensuite ces identités partagées. Sans ça,
 * un run local répété ré-enregistrerait un compte déjà en base (register -> 409).
 */
export default function globalSetup(): void {
  clearPersistedAccounts()
}
