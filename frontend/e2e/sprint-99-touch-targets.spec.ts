import { test, expect, type Locator, type Page, type Route } from '@playwright/test'
import { ensureAuthenticated, minimalPngBuffer, openSettingsChapter } from './support/auth'
import { SHARED } from './support/accounts'
import {
  BOX_ONLY,
  EPS,
  MIN_TARGET,
  expectAllTouchable,
  measureControls,
} from './support/touch-targets'

/**
 * #738 (Sprint 99) — CIBLES TACTILES 44 px des Réglages mobiles (WCAG 2.5.5).
 *
 * DÉCISION (DEC-S99-001) : `Input`, `SelectTrigger` et `SelectItem` sont agrandis
 * SUR LA PRIMITIVE sous 768 px (`max-md:`) ; `Button` garde sa primitive intacte
 * et reçoit `max-md:h-11` (+ `max-md:w-11` pour `size="icon"`) sur les seuls
 * écrans de réglages. Au-dessus de 768 px, rien ne change.
 *
 * ORACLE : la boîte RENDUE (`getBoundingClientRect`), jamais la classe lue ni
 * `toHaveCSS` (une classe DÉCLARE, elle ne prouve rien — et jsdom ne met pas en page).
 *
 * LISTE DES CONTRÔLES CONSTRUITE PAR REQUÊTE DOM, pas par testids écrits à la main :
 * un futur bouton non conforme ajouté aux réglages fait rougir la spec sans qu'on
 * ait à penser à l'y inscrire. Garde anti-vacuité : chaque étape exige un nombre
 * MINIMAL de contrôles mesurés (une requête qui ne trouverait rien serait verte).
 *
 * EXEMPTIONS (explicites, et seulement celles-ci) :
 *  - l'`<input type="file">` de l'avatar, `sr-only` : invisible, jamais ciblé au
 *    doigt, on tape la zone de dépôt (`avatar-dropzone`, mesurée elle) ;
 *  - la poignée des bottom sheets (`*-grabber`) : 28 px VOULUS, exemptés par WCAG
 *    2.5.8 « Equivalent » (bouton ✕ 44×44 + Escape) — DEC-S99-002 / #739. Elle
 *    n'est de toute façon pas appariée par le sélecteur (div sans rôle) ; la
 *    clause d'exclusion la nomme pour qu'un futur `role="button"` n'y change rien.
 *
 * INTERRUPTEURS (#763) : le sélecteur couvre `[role="switch"]`, `[role="checkbox"]`
 * et `label.mt-switch`. Aucun réglage n'en monte aujourd'hui ; la sonde « interrupteur
 * injecté » prouve qu'un interrupteur ajouté plus tard serait mesuré ET signalé s'il
 * faisait moins de 44 px. Depuis #768, ce sélecteur est celui, UNIQUE, de
 * `support/touch-targets.ts` : la sonde protège donc aussi `sprint-101`/`sprint-102`.
 *
 * MESURE : `support/touch-targets.ts` (#768), profil BOÎTE SEULE (cf. `TOUCH`).
 *
 * DONNÉES : le compte partagé n'a en général ni avatar, ni autre session, ni
 * export async. Ces états sont donc FOURNIS par `page.route` (réponses conformes
 * aux schémas Zod `UserSchema` / `SessionSchema` / `exportJobResponseSchema`),
 * pour que les boutons conditionnels (suppression d'avatar, révocation, téléchar-
 * gement async, relance, réessai) soient rendus ET mesurés. Aucun appel mutant
 * n'est émis : on ne clique jamais « appliquer », « révoquer » ni « supprimer ».
 */

const MOBILE = { width: 375, height: 812 }
const DESKTOP = { width: 1280, height: 720 }

const OTHER_SESSION_ID = '0192f0a0-0000-7000-8000-00000000b099'
const CURRENT_SESSION_ID = '0192f0a0-0000-7000-8000-00000000a099'
/**
 * Un jobId PAR ÉTAPE : TanStack Query met en cache le polling sous
 * `queryKeys.export.job(jobId)`. Réutiliser le même id rendrait la réponse
 * `COMPLETED` précédente (non expirée) au lieu de la nouvelle.
 */
const EXPORT_JOB_IDS = {
  'async-ready': '0192f0a0-0000-7000-8000-00000000c099',
  'async-expired': '0192f0a0-0000-7000-8000-00000000c098',
} as const

/**
 * Profil BOÎTE SEULE (`support/touch-targets.ts`) : pas d'exemption `aria-hidden`, pas
 * de hitbox `::before`, visibilité = boîte non nulle et `visibility` — exactement ce que
 * mesurait la copie locale d'avant #768. Aligner les réglages sur le profil complet est
 * une décision à part, pas un effet de bord de la factorisation.
 */
const TOUCH = { tag: '#738', ...BOX_ONLY } as const

/** Hauteur rendue d'un élément par testid (oracle desktop). */
async function heightOf(page: Page, testId: string): Promise<number> {
  const box = await page.getByTestId(testId).boundingBox()
  expect(box, `${testId} doit avoir une boîte rendue`).not.toBeNull()
  return box!.height
}

/** `/api/auth/me` réel + `avatarUrl` posé : rend `avatar-delete` sans uploader. */
async function withFakeAvatar(page: Page): Promise<void> {
  await page.route('**/api/auth/me', async (route: Route) => {
    const response = await route.fetch()
    if (!response.ok()) return route.fulfill({ response })
    const user = (await response.json()) as Record<string, unknown>
    return route.fulfill({ response, json: { ...user, avatarUrl: '/api/me/avatar' } })
  })
  await page.route('**/api/me/avatar', (route: Route) =>
    route.request().method() === 'GET'
      ? route.fulfill({ status: 200, contentType: 'image/png', body: minimalPngBuffer() })
      : route.continue(),
  )
}

/** Deux sessions (courante + une autre) : rend `revoke-session-*` et `revoke-other-sessions`. */
async function withTwoSessions(page: Page): Promise<void> {
  await page.route('**/api/sessions', (route: Route) => {
    if (route.request().method() !== 'GET') return route.continue()
    return route.fulfill({
      json: [
        {
          id: CURRENT_SESSION_ID,
          deviceInfo: 'Chrome / macOS',
          ipAddress: '127.0.0.1',
          lastActivity: '2026-09-21T10:00:00',
          createdAt: '2026-09-21T09:00:00',
          current: true,
        },
        {
          id: OTHER_SESSION_ID,
          deviceInfo: 'Safari / iOS',
          ipAddress: '10.0.0.2',
          lastActivity: '2026-09-20T18:00:00',
          createdAt: '2026-09-20T08:00:00',
          current: false,
        },
      ],
    })
  })
}

type ExportMode = 'sync-ok' | 'async-ready' | 'async-expired' | 'fail'

/** Export RGPD entièrement simulé : chaque étape du flux devient atteignable. */
async function withFakeExport(page: Page): Promise<{ set: (m: ExportMode) => void }> {
  let mode: ExportMode = 'sync-ok'
  await page.route('**/api/export**', (route: Route) => {
    if (mode === 'fail') return route.abort('failed')
    const req = route.request()
    const url = new URL(req.url())
    if (req.method() === 'GET' && url.pathname.endsWith('/api/export')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-disposition': 'attachment; filename="mytimeline-export.json"' },
        body: '{}',
      })
    }
    const expiresAt = mode === 'async-expired' ? '2020-01-01T00:00:00' : '2099-01-01T00:00:00'
    const jobId = EXPORT_JOB_IDS[mode === 'async-expired' ? 'async-expired' : 'async-ready']
    return route.fulfill({
      status: req.method() === 'POST' ? 202 : 200,
      json: {
        jobId,
        status: req.method() === 'POST' ? 'PENDING' : 'COMPLETED',
        format: 'ZIP',
        downloadUrl: req.method() === 'POST' ? null : `/api/export/download/${jobId}?token=t`,
        expiresAt: req.method() === 'POST' ? null : expiresAt,
      },
    })
  })
  return {
    set: (m: ExportMode) => {
      mode = m
    },
  }
}

async function openMobileChapter(
  page: Page,
  chapter: 'profile' | 'security' | 'preferences' | 'account',
): Promise<Locator> {
  await ensureAuthenticated(page)
  await page.goto('/fr/settings', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('settings-index')).toBeVisible()
  await page.getByTestId(`settings-index-${chapter}`).click()
  const detail = page.getByTestId(`mobile-settings-detail-${chapter}`)
  await expect(detail).toBeVisible()
  return page.getByTestId('settings-page')
}

/** Ouvre un Select Radix, mesure ses options, referme par Escape. */
async function expectOptionsTouchable(page: Page, trigger: string, min: number): Promise<void> {
  await page.getByTestId(trigger).click()
  const listbox = page.getByRole('listbox')
  await expect(listbox).toBeVisible()
  await expectAllTouchable(`${trigger} (options ouvertes)`, listbox, min, TOUCH)
  await page.keyboard.press('Escape')
  await expect(listbox).toHaveCount(0)
}

test.describe('#738 — Réglages mobiles (375 px) : toutes les cibles >= 44 px', () => {
  test.use({ viewport: MOBILE, storageState: SHARED.storageState })

  test('index des chapitres', async ({ page }) => {
    await ensureAuthenticated(page)
    await page.goto('/fr/settings', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('settings-index')).toBeVisible()
    // 4 lignes de chapitre + le retour vers le tableau de bord (`settings-back`).
    await expectAllTouchable('index', page.getByTestId('settings-page'), 5, TOUCH)
  })

  test('profil : champs, zone avatar, suppression, recadrage', async ({ page }) => {
    await withFakeAvatar(page)
    const root = await openMobileChapter(page, 'profile')
    await expect(page.getByTestId('avatar-delete')).toBeVisible()
    // retour + dropzone + avatar-delete + 3 champs + submit.
    await expectAllTouchable('profil', root, 7, TOUCH)

    // Recadreur (ouvert sans rien envoyer : on annule ensuite) — zoom + 2 boutons.
    await page.getByTestId('avatar-input').setInputFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: minimalPngBuffer(),
    })
    await expect(page.getByTestId('avatar-cropper')).toBeVisible()
    await expectAllTouchable('profil (recadrage)', root, 6, TOUCH)
    await page.getByRole('button', { name: 'Annuler' }).click()
    await expect(page.getByTestId('avatar-cropper')).toHaveCount(0)
  })

  test('sécurité : mot de passe + sessions', async ({ page }) => {
    await withTwoSessions(page)
    const root = await openMobileChapter(page, 'security')
    await expect(page.getByTestId(`revoke-session-${OTHER_SESSION_ID}`)).toBeVisible()
    await expect(page.getByTestId('revoke-other-sessions')).toBeVisible()
    // retour + 3 champs + submit + révoquer (1) + révoquer les autres.
    await expectAllTouchable('sécurité', root, 7, TOUCH)
  })

  test('préférences : 3 menus déroulants + leurs options', async ({ page }) => {
    const root = await openMobileChapter(page, 'preferences')
    // retour + 3 SelectTrigger.
    await expectAllTouchable('préférences', root, 4, TOUCH)
    await expectOptionsTouchable(page, 'pref-language', 4)
    await expectOptionsTouchable(page, 'pref-theme', 3)
    await expectOptionsTouchable(page, 'pref-density', 3)
  })

  /**
   * #763 — SONDE du sélecteur (critère « un interrupteur ajouté plus tard serait bien
   * mesuré ») : on injecte dans la page des réglages un interrupteur au balisage exact
   * de `ui/switch.tsx`, de taille FIXE 38×22 en style inline (indépendante du CSS du
   * DS). La mesure doit le
   * VOIR (par son label, l'input 0×0 restant filtré) et le classer sous 44 px.
   * Test séparé : l'injection ne touche pas les mesures réelles des autres tests.
   */
  test('sonde : un interrupteur injecté est mesuré et signalé sous 44 px', async ({ page }) => {
    await ensureAuthenticated(page)
    await page.goto('/fr/settings', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('settings-index')).toBeVisible()
    const root = page.getByTestId('settings-page')
    await root.evaluate((el) => {
      const label = document.createElement('label')
      label.className = 'mt-switch'
      label.setAttribute('data-testid', 'zz-probe-switch')
      // Taille FIXE (review S102) : la sonde teste le SÉLECTEUR, pas le CSS du DS.
      // Un `.mt-switch` agrandi un jour à 44 px ne doit pas la faire rougir.
      label.style.cssText = 'display:inline-block;width:38px;height:22px;overflow:hidden'
      const input = document.createElement('input')
      input.type = 'checkbox'
      input.setAttribute('role', 'switch')
      const track = document.createElement('span')
      track.className = 'mt-switch__track'
      track.setAttribute('aria-hidden', 'true')
      label.append(input, track)
      el.prepend(label)
    })
    const measured = await measureControls(root, TOUCH)
    const probe = measured.filter((m) => m.label.includes('zz-probe-switch'))
    console.log(
      `[#763 sonde] ${probe.map((m) => `${m.label}=${m.width.toFixed(1)}x${m.height.toFixed(1)}`).join(' | ')}`,
    )
    // Vu une fois, par le label (l'input 0×0 est filtré comme invisible).
    expect(probe).toHaveLength(1)
    expect(probe[0]!.label.startsWith('label[')).toBe(true)
    // Et signalé : taille imposée 38×22, sous le seuil.
    expect(probe[0]!.width).toBeCloseTo(38, 0)
    expect(probe[0]!.height).toBeCloseTo(22, 0)
    expect(probe[0]!.width < MIN_TARGET - EPS || probe[0]!.height < MIN_TARGET - EPS).toBe(true)
  })

  test('compte : export (toutes les étapes) + sheet de suppression', async ({ page }) => {
    const exportApi = await withFakeExport(page)
    const root = await openMobileChapter(page, 'account')

    // Étape 1 : retour + format + lancer + ouvrir la suppression.
    await expect(page.getByTestId('export-step-confirm')).toBeVisible()
    await expectAllTouchable('compte (export confirm)', root, 4, TOUCH)
    await expectOptionsTouchable(page, 'export-format', 4)

    // Sync prêt -> « exporter à nouveau ».
    await page.getByTestId('export-start').click()
    await expect(page.getByTestId('export-ready-sync')).toBeVisible()
    await expectAllTouchable('compte (export sync prêt)', root, 3, TOUCH)

    // Async prêt -> « télécharger ». Choix ZIP par l'option (clavier-agnostique).
    await page.getByTestId('export-again').click()
    await page.getByTestId('export-format').click()
    await page.getByRole('option').nth(2).click()
    exportApi.set('async-ready')
    await page.getByTestId('export-start').click()
    await expect(page.getByTestId('export-ready-async')).toBeVisible()
    await expectAllTouchable('compte (export async prêt)', root, 4, TOUCH)

    // Async expiré -> « relancer ».
    await page.getByTestId('export-again').click()
    exportApi.set('async-expired')
    await page.getByTestId('export-start').click()
    await expect(page.getByTestId('export-expired')).toBeVisible()
    await expectAllTouchable('compte (export expiré)', root, 4, TOUCH)

    // Erreur réseau -> « réessayer ».
    await page.getByTestId('export-relaunch').click()
    exportApi.set('fail')
    await page.getByTestId('export-start').click()
    await expect(page.getByTestId('export-step-error')).toBeVisible()
    await expectAllTouchable('compte (export erreur)', root, 3, TOUCH)
    await page.getByTestId('export-retry').click()
    await expect(page.getByTestId('export-step-confirm')).toBeVisible()

    // Sheet de suppression : étape avertissement puis confirmation (jamais soumise).
    await page.getByTestId('delete-account-open').click()
    const sheet = page.getByTestId('delete-account-sheet')
    await expect(sheet).toBeVisible()
    // ✕ + annuler + continuer.
    await expectAllTouchable('suppression (avertissement)', sheet, 3, TOUCH)
    await page.getByTestId('delete-account-continue').click()
    await expect(page.getByTestId('delete-account-username')).toBeVisible()
    // ✕ + champ + retour + confirmer.
    await expectAllTouchable('suppression (confirmation)', sheet, 4, TOUCH)
    await page.getByTestId('delete-account-sheet-close').click()
    await expect(sheet).toHaveCount(0)
  })
})

/**
 * Rendu DESKTOP inchangé : à 1280 px, les hauteurs d'AVANT #738. Si un `max-md:`
 * devenait un utilitaire nu (ou si la primitive `Button` était modifiée), ces
 * valeurs bougeraient. Valeurs attendues = cva/primitive d'origine :
 * Input/SelectTrigger/Button default `h-9` = 36, Button `sm` = `h-8` = 32,
 * `icon` = 36×36, SelectItem `py-1.5` = 36,28 px MESURÉS avant #738 (la ligne de
 * texte fait 24,28 px avec la police du DS, pas les 20 px de `text-sm`).
 */
test.describe('#738 — Réglages desktop (1280 px) : hauteurs inchangées', () => {
  test.use({ viewport: DESKTOP, storageState: SHARED.storageState })

  test('profil : champs 36, submit 36, suppression avatar 36×36', async ({ page }) => {
    await withFakeAvatar(page)
    await openSettingsChapter(page, 'profile')
    expect.soft(await heightOf(page, 'profile-name')).toBe(36)
    expect.soft(await heightOf(page, 'profile-submit')).toBe(36)
    const del = await page.getByTestId('avatar-delete').boundingBox()
    expect(del).not.toBeNull()
    expect.soft(del!.width).toBe(36)
    expect.soft(del!.height).toBe(36)
  })

  test('sécurité : champ 36, submit 36, boutons sm des sessions 32', async ({ page }) => {
    await withTwoSessions(page)
    await openSettingsChapter(page, 'security')
    await expect(page.getByTestId('revoke-other-sessions')).toBeVisible()
    expect.soft(await heightOf(page, 'password-old')).toBe(36)
    expect.soft(await heightOf(page, 'password-submit')).toBe(36)
    expect.soft(await heightOf(page, `revoke-session-${OTHER_SESSION_ID}`)).toBe(32)
    expect.soft(await heightOf(page, 'revoke-other-sessions')).toBe(32)
  })

  test('préférences : SelectTrigger 36, option ouverte 36,28', async ({ page }) => {
    await openSettingsChapter(page, 'preferences')
    expect.soft(await heightOf(page, 'pref-theme')).toBe(36)
    await page.getByTestId('pref-theme').click()
    const option = page.getByTestId('pref-theme-option-light')
    await expect(option).toBeVisible()
    expect.soft(await heightOf(page, 'pref-theme-option-light')).toBeCloseTo(36.28, 1)
    await page.keyboard.press('Escape')
  })
})
