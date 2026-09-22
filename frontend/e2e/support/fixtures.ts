import { test as base, expect } from '@playwright/test'
import { beginSeedTracking, flushSeedTracking } from './seed-cleanup'
import { decideSeedCleanupOutcome } from './seed-cleanup-outcome'

/**
 * #463 — `test` étendu, à importer À LA PLACE de `@playwright/test` dans toute
 * spec qui sème des catégories/produits sur un compte E2E partagé.
 *
 * Il n'ajoute qu'une chose : une fixture AUTO qui arme le registre de semis avant
 * le test et purge après. Le raisonnement complet (pourquoi le nettoyage plutôt
 * que le namespacing ou les comptes par fichier) est dans `seed-cleanup.ts`.
 *
 * `auto: true` : la fixture s'applique sans que le test la déclare — c'est ce qui
 * évite de toucher les 88 corps de tests concernés. Elle ne dépend QUE de
 * `baseURL` : la faire dépendre de `page` forcerait l'ouverture d'une page pour
 * des tests qui n'en veulent pas (`sprint-42-events.spec.ts` ne prend que
 * `{ browser }` et ouvre ses deux contextes lui-même).
 *
 * ⚠ CE QUE CETTE FIXTURE FAIT D'UNE PURGE EN ÉCHEC — et où c'est PROUVÉ. La
 * décision (lever si le test était vert, avertir s'il était déjà rouge) vit dans
 * `seed-cleanup-outcome.ts` ; ses trois branches sont couvertes par
 * `src/__tests__/seed-cleanup-outcome.test.ts`, et le fait qu'une purge qui échoue
 * pour de vrai fasse effectivement ROUGIR un test vert est le contrôle négatif
 * `e2e/seed-cleanup-guard.spec.ts`. Avant ce contrôle, cette branche n'avait
 * jamais été exécutée une seule fois.
 */
export const test = base.extend<{ seedIsolation: void }>({
  seedIsolation: [
    async ({ baseURL }, use, testInfo) => {
      beginSeedTracking(baseURL)
      await use()
      const outcome = decideSeedCleanupOutcome(await flushSeedTracking(), testInfo.status)
      if (outcome.level === 'clean') return

      testInfo.annotations.push({ type: 'seed-cleanup', description: outcome.report })
      if (outcome.level === 'fatal') throw new Error(outcome.report)
      console.warn(outcome.report)
    },
    { auto: true },
  ],
})

export { expect }
