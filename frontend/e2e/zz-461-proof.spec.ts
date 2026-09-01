import { expect, test } from '@playwright/test'

/**
 * SPEC JETABLE — #461. NE PAS MERGER.
 *
 * Elle n'existe que pour provoquer un echec E2E DETERMINISTE en CI, afin de
 * prouver que l'artefact `playwright-report` telecharge contient bien
 * (a) le rapport HTML ecrit par le reporter `html` et (b) une trace .zip
 * ecrite dans `test-results/` par `trace: 'on-first-retry'`.
 *
 * Elle vit dans une PR draft dediee vers `dev`, jamais dans la PR de sprint,
 * et doit etre supprimee des la preuve obtenue.
 *
 * Forme volontairement choisie :
 *  - un `*.spec.ts` et NON un `*.setup.ts` : un projet `setup` rouge fait
 *    SKIPPER les specs dependantes au lieu de les faire echouer, donc aucun
 *    echec de test a tracer ;
 *  - `/fr` est une page publique : aucun compte requis, aucune dependance a
 *    l'etat du backend, donc l'echec est du a l'assertion et a rien d'autre ;
 *  - un testid qui n'existe nulle part dans le depot : echec deterministe,
 *    pas flaky, donc la trace du 1er retry est garantie.
 */
test('#461 — echec delibere : prouve le contenu de l’artefact CI', async ({ page }) => {
  await page.goto('/fr')
  await expect(page.getByTestId('does-not-exist-461')).toBeVisible({ timeout: 3000 })
})
