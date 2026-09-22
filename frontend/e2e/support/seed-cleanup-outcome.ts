/**
 * #463 (cycle 2 de revue, S79) — LA DÉCISION de la fixture de purge, isolée pour
 * pouvoir être EXERCÉE.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI CE MODULE EXISTE
 * ─────────────────────────────────────────────────────────────────────────────
 * `support/fixtures.ts` décide, après chaque test, quoi faire d'une purge qui a
 * échoué : lever (le test était vert, une purge muette rétablirait le défaut que
 * #463 corrige) ou seulement avertir (le test était DÉJÀ rouge, et écraser sa
 * cause par celle de la purge coûterait le vrai diagnostic).
 *
 * Cette logique était juste À LA LECTURE et n'avait JAMAIS été exécutée — ni la
 * branche `throw`, ni la branche `warn`. Or un test Playwright ne peut pas
 * observer la décision prise dans son PROPRE teardown : quand la fixture lève, le
 * test est déjà terminé.
 *
 * On sépare donc la DÉCISION (ici, pure, sans Playwright ni réseau) de son
 * APPLICATION (dans `fixtures.ts`). La décision est couverte sur ses trois
 * branches par `src/__tests__/seed-cleanup-outcome.test.ts` ; que la purge échoue
 * VRAIMENT et fasse rougir un test vert est couvert, en conditions réelles, par
 * `e2e/seed-cleanup-guard.spec.ts`.
 */

export type SeedCleanupOutcome =
  | { level: 'clean' }
  | { level: 'warn'; report: string }
  | { level: 'fatal'; report: string }

/**
 * @param failures messages d'échec rendus par `flushSeedTracking()` (vide = purge OK)
 * @param testStatus `testInfo.status` du test qui vient de se terminer
 */
export function decideSeedCleanupOutcome(
  failures: readonly string[],
  testStatus: string | undefined,
): SeedCleanupOutcome {
  if (failures.length === 0) return { level: 'clean' }

  const report = [
    `#463 — la purge post-test a échoué (${failures.length}) :`,
    ...failures.map((failure) => `  - ${failure}`),
    '',
    "Une purge inopérante ne casse rien TOUT DE SUITE : elle laisse l'état du test",
    'dans le champ de vision des suivants et ressuscite la dépendance à l’ordre que',
    '#463 supprime. On la rend donc bruyante plutôt que de la laisser passer.',
  ].join('\n')

  // Test DÉJÀ rouge : on n'écrase pas sa cause par celle de la purge.
  return { level: testStatus === 'passed' ? 'fatal' : 'warn', report }
}
