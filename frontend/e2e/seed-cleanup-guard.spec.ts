import { expect, test } from './support/fixtures'
import { PROD } from './support/accounts'
import { getUserId } from './support/products'
import { trackSeed } from './support/seed-cleanup'

/**
 * #463 (cycle 2 de revue, S79) — CONTRÔLE NÉGATIF de la fixture de purge.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LE DÉFAUT QUE CE FICHIER CORRIGE
 * ─────────────────────────────────────────────────────────────────────────────
 * `support/fixtures.ts` fait échouer un test VERT dont la purge post-test a raté.
 * Cette branche n'avait JAMAIS été exécutée : toutes les purges du run passent, donc
 * rien ne prouvait que le garde-fou se déclenche. « La garde existe » restait une
 * lecture de code, pas une mesure — exactement le motif que ce dépôt paie en
 * répétition (un contrôle qui vérifie qu'un identifiant est CITÉ, pas qu'il MARCHE).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * COMMENT L'ÉCHEC EST FORCÉ, ET POURQUOI COMME ÇA
 * ─────────────────────────────────────────────────────────────────────────────
 * On enregistre au registre de semis un produit dont l'id n'est PAS un UUID. À la
 * purge, `archiveProduct` émet `DELETE /api/users/{id}/products/not-a-uuid`, que
 * Spring rejette en **400** (conversion du path variable) — mesuré, pas supposé.
 * `purgeBucket` n'accepte que 204 et 404, donc elle lève, et la fixture doit
 * transformer ça en échec de test.
 *
 * Un id UUID INCONNU ne conviendrait pas : il rend **404**, que la purge tolère
 * délibérément (le test peut avoir supprimé l'entité lui-même). Mesuré aussi.
 *
 * Aucun état n'est créé : rien n'est semé, rien n'est laissé derrière — pas même la
 * catégorie « poubelle », que seul le chemin catégories déclenche.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI `test.fail()` — ET COMMENT LIRE CE FICHIER QUAND IL ROUGIT
 * ─────────────────────────────────────────────────────────────────────────────
 * Un test ne peut pas observer son propre teardown : quand la fixture lève, il est
 * fini. On inverse donc l'attendu. `test.fail()` exige que ce test ÉCHOUE :
 *
 *   - fixture intacte  -> la purge rate, la fixture lève, le test échoue : ATTENDU,
 *     le run reste vert ;
 *   - fixture désarmée -> le test passe, et Playwright rougit avec
 *     « Expected to fail, but passed ».
 *
 * Donc : si CE fichier rougit, ce n'est pas lui qu'il faut réparer, c'est que la
 * garde de `fixtures.ts` ne se déclenche plus. (Vérifié dans les deux sens au S79 :
 * throw retiré -> rouge « Expected to fail, but passed » ; throw remis -> vert.)
 *
 * La décision elle-même (lever si le test était vert, avertir s'il était déjà rouge)
 * est couverte branche par branche par `src/__tests__/seed-cleanup-outcome.test.ts` :
 * la distinction n'est pas observable d'ici, les deux issues rendant le test rouge.
 */

test.use({ storageState: PROD.storageState })

test.describe('#463 — contrôle négatif : une purge en échec doit faire rougir', () => {
  test.fail()

  test('un test VERT dont la purge échoue est mis en échec par la fixture', async ({ page }) => {
    await page.goto('/fr/dashboard')
    const userId = await getUserId(page)

    // Semis FICTIF : rien n'est créé côté serveur, seule la purge le verra.
    await trackSeed(page, { kind: 'product', userId, id: 'not-a-uuid' })

    // Corps volontairement VERT : c'est la purge, et elle seule, qui doit rougir.
    expect(userId).toBeTruthy()
  })
})
