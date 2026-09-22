import { describe, expect, it } from 'vitest'

import { decideSeedCleanupOutcome } from '../../e2e/support/seed-cleanup-outcome'

/**
 * #463 (cycle 2 de revue, S79) — LES TROIS BRANCHES de la fixture de purge, exercées.
 *
 * Ce que ce fichier couvre, et pourquoi il vit ici plutôt que dans la suite E2E : un
 * test Playwright ne peut pas observer la décision prise dans son propre teardown.
 * On y couvre donc la LOGIQUE ; que la purge échoue réellement et fasse rougir un
 * test vert est mesuré en conditions réelles par `e2e/seed-cleanup-guard.spec.ts`.
 *
 * ⚠ Ce test n'exécute AUCUNE requête : il ne dit rien de la capacité de la purge à
 * détecter un vrai échec HTTP. C'est le rôle du contrôle négatif E2E, pas du sien.
 */
describe('#463 — décision de la fixture de purge', () => {
  const FAILURES = ['purge produit not-a-uuid : 400 (attendu 204 ou 404)']

  it('purge OK -> rien (aucune annotation, aucun bruit)', () => {
    expect(decideSeedCleanupOutcome([], 'passed')).toEqual({ level: 'clean' })
    expect(decideSeedCleanupOutcome([], 'failed')).toEqual({ level: 'clean' })
  })

  it('purge en échec sur un test VERT -> FATAL (le test doit rougir)', () => {
    const outcome = decideSeedCleanupOutcome(FAILURES, 'passed')

    expect(outcome.level).toBe('fatal')
    // Le rapport doit porter la cause : c'est lui qui devient le message d'échec.
    expect(outcome).toHaveProperty('report')
    const report = (outcome as { report: string }).report
    expect(report).toContain('la purge post-test a échoué (1)')
    expect(report).toContain(FAILURES[0])
  })

  it("purge en échec sur un test DÉJÀ ROUGE -> WARN (on n'écrase pas sa cause)", () => {
    for (const status of ['failed', 'timedOut', 'interrupted', undefined]) {
      const outcome = decideSeedCleanupOutcome(FAILURES, status)
      expect(outcome.level, `statut ${String(status)}`).toBe('warn')
    }
  })

  it('le compte des échecs est celui des messages reçus', () => {
    const outcome = decideSeedCleanupOutcome(['a', 'b', 'c'], 'passed')
    expect((outcome as { report: string }).report).toContain('a échoué (3)')
  })
})
