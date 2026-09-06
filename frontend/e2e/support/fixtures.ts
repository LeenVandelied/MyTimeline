import { test as base, expect } from '@playwright/test'
import { beginSeedTracking, flushSeedTracking } from './seed-cleanup'

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
 */
export const test = base.extend<{ seedIsolation: void }>({
  seedIsolation: [
    async ({ baseURL }, use, testInfo) => {
      beginSeedTracking(baseURL)
      await use()
      const failures = await flushSeedTracking()
      if (failures.length === 0) return

      const report = [
        `#463 — la purge post-test a échoué (${failures.length}) :`,
        ...failures.map((f) => `  - ${f}`),
        '',
        "Une purge inopérante ne casse rien TOUT DE SUITE : elle laisse l'état du test",
        'dans le champ de vision des suivants et ressuscite la dépendance à l’ordre que',
        '#463 supprime. On la rend donc bruyante plutôt que de la laisser passer.',
      ].join('\n')

      testInfo.annotations.push({ type: 'seed-cleanup', description: report })
      // Test DÉJÀ rouge : on n'écrase pas sa cause par celle de la purge.
      if (testInfo.status === 'passed') throw new Error(report)
      console.warn(report)
    },
    { auto: true },
  ],
})

export { expect }
