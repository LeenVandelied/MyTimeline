import { STATE_DIR } from './support/accounts'
import { releaseRunLock } from './support/run-lock'

/**
 * `globalTeardown` Playwright — libère le verrou posé par le `globalSetup` pour que
 * le run suivant démarre sans intervention. Un run tué (`Ctrl-C`, `kill`) ne passe
 * pas ici : le verrou reste sur disque, mais `acquireRunLock` le reconnaît comme
 * résidu (process mort) et l'écrase. Le verrou ne peut donc pas bloquer durablement.
 */
export default function globalTeardown(): void {
  releaseRunLock(STATE_DIR)
}
