import { test, expect } from '@playwright/test'
import { openSettingsChapter, minimalPngBuffer } from './support/auth'
import { SHARED } from './support/accounts'

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

// Compte partagé fixe (storageState) : ZÉRO register par test (anti rate-limit).
// Ce fichier MUTE l'état backend du compte partagé (nom, avatar) -> `serial` pour
// éviter tout entrelacement entre tests (et clobber du compte partagé).
test.use({ storageState: SHARED.storageState })
test.describe.configure({ mode: 'serial' })

test.describe('Réglages — Profil : avatar + champs', () => {
  test('upload avatar (crop -> confirm), puis suppression', async ({ page }) => {
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

    // Confirmer le crop -> POST /api/me/avatar -> onSuccess `refreshUser()` qui
    // re-fetch GET /api/auth/me (avatarUrl désormais posé). On ATTEND explicitement
    // cette réponse /me : `<img>` ne se monte qu'après que `currentAvatarUrl` (issu
    // du user resynchronisé) devienne non-null. En CI, POST multipart authentifié +
    // refetch /me peuvent dépasser le timeout `expect` par défaut (5 s) -> flake.
    const meResync = page.waitForResponse(
      (res) => /\/api\/auth\/me$/.test(res.url()) && res.request().method() === 'GET',
      { timeout: 15_000 },
    )
    await page.getByTestId('avatar-confirm').click()
    await meResync

    // Le cropper se ferme et l'avatar (<img src=/api/me/avatar>) apparaît.
    await expect(page.getByTestId('avatar-cropper')).toHaveCount(0)
    // Attente DÉTERMINISTE sur l'état DOM (pas le rendu pixel) : le <img> est monté
    // et porte un src d'avatar. `currentAvatarUrl` (AuthContext resync post-upload)
    // est non-null -> ProfileSection rend le <img src={avatarUrl}>. On n'exige PAS
    // que l'image ait fini de charger (GET authentifié potentiellement lent) ; on
    // laisse une marge de timeout au re-render post-resync.
    const uploadedImg = avatar.locator('img')
    await expect(uploadedImg).toHaveCount(1, { timeout: 10_000 })
    await expect(uploadedImg).toHaveAttribute('src', /\S/)
    // Le bouton de suppression n'apparaît que lorsqu'un avatar existe.
    await expect(page.getByTestId('avatar-delete')).toBeVisible()

    // ---- Suppression : DELETE /api/me/avatar -> avatarUrl repasse à null ----
    await page.getByTestId('avatar-delete').click()
    await expect(avatar.locator('img')).toHaveCount(0)
    await expect(page.getByTestId('avatar-delete')).toHaveCount(0)
  })

  test('fichier non-image -> message d’erreur avatar', async ({ page }) => {
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
    await openSettingsChapter(page, 'profile')

    await expect(page.getByTestId('profile-form')).toBeVisible()
    // Le formulaire est pré-rempli depuis AuthContext (compte partagé fixe).
    await expect(page.getByTestId('profile-username')).toHaveValue(SHARED.username)

    // Nouveau nom unique par run (borné 20) : PATCH /me modifie SEULEMENT `name`.
    const newName = `N${Date.now().toString().slice(-8)}`.slice(0, 20)
    await page.getByTestId('profile-name').fill(newName)
    await page.getByTestId('profile-submit').click()

    // Persistance : après reload, la valeur vient du backend (PATCH /me a réussi).
    await page.reload()
    await openSettingsChapter(page, 'profile')
    await expect(page.getByTestId('profile-name')).toHaveValue(newName)
    // username/email inchangés.
    await expect(page.getByTestId('profile-username')).toHaveValue(SHARED.username)
    await expect(page.getByTestId('profile-email')).toHaveValue(SHARED.email)
  })
})
