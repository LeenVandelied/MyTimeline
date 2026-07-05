import { test, expect } from '@playwright/test'
import { registerAndLogin, openSettingsChapter, minimalPngBuffer } from './support/auth'

/**
 * #86 / #75 — E2E chapitre Profil (desktop) : upload/recadrage/suppression
 * d'avatar (POST/DELETE /api/me/avatar) + édition des champs name/username/email
 * (PATCH /api/me) avec persistance vérifiée par reload.
 *
 * Sélecteurs `data-testid` UNIQUEMENT, routes `/fr/...` (localePrefix always).
 * PRÉREQUIS RUNTIME (job CI `e2e`) : backend Spring (:8080) + Postgres, front :3000.
 *
 * Les toasts (react-hot-toast) n'exposent pas de `data-testid` : on assure la
 * vérification sur des CHANGEMENTS d'état DOM déterministes (cropper qui se ferme,
 * <img> avatar qui apparaît/disparaît, valeur de champ persistée après reload),
 * jamais sur du texte de toast.
 */

test.describe('Réglages — Profil : avatar + champs', () => {
  test('upload avatar (crop -> confirm), puis suppression', async ({ page }) => {
    await registerAndLogin(page, 'pa')
    await openSettingsChapter(page, 'profile')

    const avatar = page.getByTestId('avatar-upload')
    await expect(avatar).toBeVisible()
    // Au départ : pas d'avatar -> pas de <img> dans la zone.
    await expect(avatar.locator('img')).toHaveCount(0)

    // ---- Upload : setInputFiles avec un PNG valide en mémoire ---------------
    // setInputFiles contourne l'attribut accept="image/*" ; le PNG valide fait
    // que Image().onload se déclenche -> le cropper s'affiche.
    await page.getByTestId('avatar-input').setInputFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: minimalPngBuffer(),
    })

    // Le recadreur apparaît (canvas + slider zoom).
    await expect(page.getByTestId('avatar-cropper')).toBeVisible()
    await expect(page.getByTestId('avatar-zoom')).toBeVisible()

    // Confirmer le crop -> POST /api/me/avatar -> AuthContext resync (avatarUrl).
    await page.getByTestId('avatar-confirm').click()

    // Le cropper se ferme et l'avatar (<img src=/api/me/avatar>) apparaît.
    await expect(page.getByTestId('avatar-cropper')).toHaveCount(0)
    await expect(avatar.locator('img')).toBeVisible()
    // Le bouton de suppression n'apparaît que lorsqu'un avatar existe.
    await expect(page.getByTestId('avatar-delete')).toBeVisible()

    // ---- Suppression : DELETE /api/me/avatar -> avatarUrl repasse à null ----
    await page.getByTestId('avatar-delete').click()
    await expect(avatar.locator('img')).toHaveCount(0)
    await expect(page.getByTestId('avatar-delete')).toHaveCount(0)
  })

  test('fichier non-image -> message d’erreur avatar', async ({ page }) => {
    await registerAndLogin(page, 'pae')
    await openSettingsChapter(page, 'profile')

    // Un fichier texte (mimeType non image) : loadFile rejette avant tout upload.
    await page.getByTestId('avatar-input').setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('pas une image', 'utf-8'),
    })

    await expect(page.getByTestId('avatar-error')).toBeVisible()
    // Aucun recadreur ne doit s'être ouvert.
    await expect(page.getByTestId('avatar-cropper')).toHaveCount(0)
  })

  test('édition du nom -> PATCH /me -> persistance après reload', async ({ page }) => {
    const identity = await registerAndLogin(page, 'pf')
    await openSettingsChapter(page, 'profile')

    await expect(page.getByTestId('profile-form')).toBeVisible()
    // Le formulaire est pré-rempli depuis AuthContext.
    await expect(page.getByTestId('profile-username')).toHaveValue(identity.username)

    const newName = `New ${identity.suffix}`.slice(0, 20)
    await page.getByTestId('profile-name').fill(newName)
    await page.getByTestId('profile-submit').click()

    // Persistance : après reload, la valeur vient du backend (PATCH /me a réussi).
    await page.reload()
    await openSettingsChapter(page, 'profile')
    await expect(page.getByTestId('profile-name')).toHaveValue(newName)
    // username/email inchangés.
    await expect(page.getByTestId('profile-username')).toHaveValue(identity.username)
    await expect(page.getByTestId('profile-email')).toHaveValue(identity.email)
  })
})
