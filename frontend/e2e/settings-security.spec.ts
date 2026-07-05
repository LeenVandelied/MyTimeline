import { test, expect } from '@playwright/test'
import { openSettingsChapter } from './support/auth'
import { SHARED, PWD } from './support/accounts'

/**
 * #86 — E2E chapitre Sécurité (desktop) : changement de mot de passe
 * (POST /api/me/change-password) avec indicateur de force réactif + cas d'erreur
 * (ancien mot de passe faux), et gestion des sessions actives
 * (GET/DELETE /api/sessions[/others]).
 *
 * Sélecteurs `data-testid` UNIQUEMENT, routes `/fr/...`. PRÉREQUIS RUNTIME
 * (job CI `e2e`) : backend Spring (:8080) + Postgres, front :3000.
 *
 * Signal de succès déterministe SANS toast : le formulaire de mot de passe se
 * réinitialise (`form.reset`) uniquement en cas de succès -> `password-old`
 * repasse à '' ; en cas d'erreur (400 ancien mdp faux) il conserve sa valeur.
 */

// Le mot de passe initial des comptes fixes (cf. support/accounts) : 'E2ePass123'.
const INITIAL_PASSWORD = PWD.password

// Le changement de mot de passe MODIFIE définitivement le compte -> compte DÉDIÉ
// `PWD` (jamais réutilisé par un autre test). storageState = ZÉRO register.
test.describe('Réglages — Sécurité : mot de passe (changement réussi)', () => {
  test.use({ storageState: PWD.storageState })

  test('force réactive + changement réussi (ancien correct)', async ({ page }) => {
    await openSettingsChapter(page, 'security')

    await expect(page.getByTestId('password-form')).toBeVisible()

    // ---- Indicateur de force réactif --------------------------------------
    // Vide -> pas d'indicateur (PasswordStrength renvoie null sur mot de passe vide).
    await expect(page.getByTestId('password-strength')).toHaveCount(0)
    // Un mot de passe fort (long + classes variées) affiche l'indicateur.
    await page.getByTestId('password-new').fill('NewStrong123!')
    await expect(page.getByTestId('password-strength')).toBeVisible()

    // ---- Changement réussi -------------------------------------------------
    const newPassword = 'NewStrong123!'
    await page.getByTestId('password-old').fill(INITIAL_PASSWORD)
    await page.getByTestId('password-new').fill(newPassword)
    await page.getByTestId('password-confirm').fill(newPassword)
    await page.getByTestId('password-submit').click()

    // Succès -> form.reset : les champs se vident, l'indicateur disparaît.
    await expect(page.getByTestId('password-old')).toHaveValue('')
    await expect(page.getByTestId('password-new')).toHaveValue('')
    await expect(page.getByTestId('password-strength')).toHaveCount(0)
  })
})

// Ces tests ne MODIFIENT PAS le mot de passe (ancien-mdp-faux -> 400 ; sessions ->
// révoque au plus les AUTRES sessions, jamais la courante) : compte partagé fixe.
test.describe('Réglages — Sécurité : erreur mot de passe + sessions', () => {
  test.use({ storageState: SHARED.storageState })

  test('ancien mot de passe faux -> erreur, formulaire conservé', async ({ page }) => {
    await openSettingsChapter(page, 'security')

    const wrongNew = 'AnotherPass456'
    await page.getByTestId('password-old').fill('MauvaisMdp999')
    await page.getByTestId('password-new').fill(wrongNew)
    await page.getByTestId('password-confirm').fill(wrongNew)
    await page.getByTestId('password-submit').click()

    // Erreur 400 -> setError('oldPassword') : PAS de reset, la valeur saisie reste.
    await expect(page.getByTestId('password-old')).toHaveValue('MauvaisMdp999')
    // Le champ oldPassword passe en état invalide (FormControl pose aria-invalid=true
    // quand une erreur de champ est présente). NB : `<FormMessage>` ne porte PAS
    // `role="alert"` -> on cible l'état DOM déterministe (aria-invalid) plutôt que
    // le rôle ARIA. Voir RECOMMAND (composant Form) pour ajouter role="alert".
    await expect(page.getByTestId('password-old')).toHaveAttribute('aria-invalid', 'true')
  })

  test('la liste charge (session courante) + révocation des autres', async ({ page }) => {
    await openSettingsChapter(page, 'security')

    // La liste charge et contient au moins la session courante.
    const list = page.getByTestId('session-list')
    await expect(list).toBeVisible()
    await expect(page.getByTestId('session-item').first()).toBeVisible()

    // `revoke-other-sessions` n'apparaît que s'il existe au moins une AUTRE
    // session que la courante. Avec un seul login, il peut être absent : on
    // révoque seulement s'il est présent (flux conditionnel, pas d'échec inutile).
    const revokeOthers = page.getByTestId('revoke-other-sessions')
    if ((await revokeOthers.count()) > 0) {
      await revokeOthers.click()
      // Après révocation + invalidation, il ne reste que la session courante.
      await expect(page.getByTestId('revoke-other-sessions')).toHaveCount(0)
      await expect(page.getByTestId('session-item')).toHaveCount(1)
    } else {
      // Cas nominal single-login : seule la session courante, rien à révoquer.
      await expect(page.getByTestId('session-item')).toHaveCount(1)
    }
  })
})
