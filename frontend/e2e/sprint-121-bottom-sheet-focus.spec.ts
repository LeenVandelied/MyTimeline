import { expect, test, type Page } from '@playwright/test'
import { SHARED } from './support/accounts'
import { openSettingsPage } from './support/auth'
import { sessionState } from './support/session'

/**
 * #858 (Sprint 121) — Le piège de focus du panneau mobile ne se réinstalle plus à
 * chaque rendu.
 *
 * CAUSE : `useFocusTrap` listait `onEscape` en dépendance de son effet, et
 * `AccountSection` passe à `BottomSheet` un `onClose` INLINE. Tout re-rendu de la
 * section pendant que le panneau est ouvert rejouait le piège : cleanup (focus rendu
 * au déclencheur `delete-account-open`) puis focus initial sur le premier focusable
 * du panneau (la croix `delete-account-sheet-close`). Le 1er caractère tapé fait
 * passer le champ RHF à « dirty », ce qui re-rend la section : la frappe suivante
 * partait sur la croix.
 *
 * MESURE AVANT CORRECTIF (jsdom, `AccountSection.test.tsx`, saisie de « jane » touche
 * par touche) : focus sur la croix dès le 1er caractère, valeur figée à « j ».
 *
 * CORRECTIF SOUS TEST : `onEscape` lu dans une ref, retiré des dépendances — le piège
 * n'est installé qu'à l'activation du panneau.
 *
 * MESURE CONSIGNÉE : chaque `focusin` hors du champ pendant la saisie est relevé dans
 * la page et attaché au rapport (`annotation` `focus-moves`). Attendu : aucun.
 *
 * SESSION : `sessionState(SHARED)`, LECTURE SEULE — le formulaire n'est JAMAIS soumis
 * (le bouton de confirmation supprimerait le compte partagé).
 */

test.use({ viewport: { width: 375, height: 812 }, storageState: sessionState(SHARED) })

const SHEET = 'delete-account-sheet'

/** Ouvre le chapitre Compte (drill-down mobile) puis le panneau de suppression, étape 2. */
async function openDeleteSheetConfirmStep(page: Page): Promise<void> {
  await openSettingsPage(page)
  await expect(page.getByTestId('settings-index')).toBeVisible()
  await page.getByTestId('settings-index-account').click()
  await expect(page.getByTestId('mobile-settings-detail-account')).toBeVisible()

  // PIT-S83-001 : un clic avant hydratation est un no-op silencieux. L'ouverture est
  // idempotente (`setDeleteOpen(true)`) : on peut la rejouer jusqu'à voir le panneau.
  const trigger = page.getByTestId('delete-account-open')
  await expect(async () => {
    await trigger.click()
    await expect(page.getByTestId(SHEET)).toBeVisible({ timeout: 1_000 })
  }).toPass()

  await page.getByTestId('delete-account-continue').click()
  await expect(page.getByTestId('delete-account-form')).toBeVisible()
}

test.describe('#858 — panneau de suppression de compte (375×812)', () => {
  test('la saisie du username, touche par touche, ne perd jamais le focus', async ({ page }) => {
    await openDeleteSheetConfirmStep(page)

    const input = page.getByTestId('delete-account-username')
    await input.click()
    await expect(input).toBeFocused()

    // Relevé, dans la page, de tout déplacement du focus hors du champ.
    await page.evaluate(() => {
      const moves: string[] = []
      ;(window as unknown as { __focusMoves858: string[] }).__focusMoves858 = moves
      document.addEventListener('focusin', (e) => {
        const el = e.target
        if (!(el instanceof HTMLElement)) return
        if (el.dataset.testid === 'delete-account-username') return
        moves.push(el.dataset.testid ?? el.tagName.toLowerCase())
      })
    })

    const username = SHARED.username
    for (let i = 0; i < username.length; i += 1) {
      await page.keyboard.press(username[i])
      await expect(input, `focus dans le champ après le caractère ${i + 1}`).toBeFocused()
      await expect(input).toHaveValue(username.slice(0, i + 1))
    }

    const moves = await page.evaluate(
      () => (window as unknown as { __focusMoves858: string[] }).__focusMoves858,
    )
    test.info().annotations.push({
      type: 'focus-moves',
      description: moves.length === 0 ? 'aucun' : moves.join(', '),
    })
    expect(moves, 'aucun déplacement de focus pendant la saisie').toEqual([])
    await expect(input).toHaveValue(username)
  })

  test('Tab boucle dans le panneau, Échap le ferme et rend le focus', async ({ page }) => {
    await openDeleteSheetConfirmStep(page)
    const sheet = page.getByTestId(SHEET)
    const close = page.getByTestId(`${SHEET}-close`)
    const confirm = page.getByTestId('delete-account-confirm')

    // Dernier focusable → Tab → premier (la croix) ; et l'inverse en Shift+Tab.
    await confirm.focus()
    await page.keyboard.press('Tab')
    await expect(close).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(confirm).toBeFocused()

    // Après une saisie (qui re-rend la section), Échap ferme toujours le panneau.
    await page.getByTestId('delete-account-username').fill('x')
    await page.keyboard.press('Escape')
    await expect(sheet).toHaveCount(0)
    await expect(page.getByTestId('delete-account-open')).toBeFocused()
  })
})
