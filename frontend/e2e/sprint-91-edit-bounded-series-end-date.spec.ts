import { expect, test } from './support/fixtures'
import { PROD } from './support/accounts'
import { ensureAuthenticated } from './support/auth'
import { neutralizeDevToolingPointerEvents } from './support/dev-tooling'
import { getUserId, seedCategory, seedProduct, unique } from './support/products'

/**
 * #676 (Sprint 91) — ÉDITION D'UNE SÉRIE BORNÉE DEPUIS LA FRISE, PARCOURS RÉEL.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LE DÉFAUT
 * ─────────────────────────────────────────────────────────────────────────────
 * Le view-model de la frise (`mapToFullCalendarEvent`) JETAIT `recurrenceEndDate` ;
 * `TimelineEditHost` pré-remplissait donc `null`. Deux symptômes :
 *   - le champ de borne apparaissait VIDE sur une série pourtant bornée ;
 *   - `useRecurrencePreview` partait SANS borne → le backend répond `capped:true`
 *     (horizon 5 ans, PIT-S82-002) → hint « limitée à 5 ans » affiché à tort.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE LA SPEC PROUVE — et ce qui la fait ROUGIR
 * ─────────────────────────────────────────────────────────────────────────────
 *   1. PRÉCONDITION SERVEUR : la borne est bien persistée (relue par GET après le
 *      PATCH de seed). Sans elle, « champ vide » pourrait venir du seed, pas du front.
 *   2. Le champ `event-form-recurrence-end-date` affiche la borne. Rougit si la
 *      propagation mapper → host est rompue.
 *   3. PREUVE RÉSEAU : au moins une réponse preview `200 {capped:false}` ET AUCUNE
 *      `capped:true`. `useDebounced` s'initialise sur la valeur pré-remplie : la
 *      toute première requête porte donc déjà la borne. Avant #676 elle partait
 *      sans borne et rendait `capped:true` — cette assertion rougit sur le défaut.
 *   4. Hint ABSENT, jugé APRÈS la preuve (3) : une absence mesurée avant que la
 *      preview ait répondu serait vraie vacuellement.
 *   5. TÉMOIN : le toggle récurrent est coché et le champ reste visible — un
 *      démontage du bloc récurrence rendrait (4) vert à tort.
 *
 * CE QU'ELLE NE PROUVE PAS : la route `/timeline` (même mapper, même host — couverte
 * unitairement par `event.test.ts` + `TimelineEditHost.test.tsx`), ni le chemin
 * mobile (action sheet → même `onEditEvent` du host).
 *
 * PRÉREQUIS RUNTIME : backend + front avec proxy `/api` (runbook E2E S47).
 */

const DESKTOP = { width: 1280, height: 900 }

const CLICK_BUDGET = 15_000
const FIRST_NAV_BUDGET = 60_000

const API = '/api'

interface PreviewProbe {
  status: number
  count?: number
  capped?: boolean
}

interface ApiEvent {
  id: string
  title: string
  startDate: string
  isRecurring?: boolean
  recurrenceUnit?: string | null
  recurrenceEndDate?: string | null
  version?: number
}

/** Borne en JOURS (et non en mois) : indépendante des débordements de quantième. */
function plusDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const base = Date.UTC(y, m - 1, d)
  return new Date(base + days * 86_400_000).toISOString().slice(0, 10)
}

test.describe('#676 — édition depuis la frise d’une série bornée', () => {
  test.use({ storageState: PROD.storageState, viewport: DESKTOP })

  test('la date de fin de série est pré-remplie et le hint de plafond ne s’affiche pas', async ({
    page,
  }) => {
    test.setTimeout(150_000)
    await neutralizeDevToolingPointerEvents(page)

    // ── PREUVE RÉSEAU : on écoute AVANT toute navigation ─────────────────────
    const probes: PreviewProbe[] = []
    page.on('response', async (res) => {
      if (!res.url().includes('/api/events/recurrence-preview')) return
      const probe: PreviewProbe = { status: res.status() }
      try {
        const body = (await res.json()) as { count?: number; capped?: boolean }
        probe.count = body.count
        probe.capped = body.capped
      } catch {
        // Corps non-JSON (erreur proxy) : le statut suffit au diagnostic.
      }
      probes.push(probe)
    })

    await ensureAuthenticated(page)

    // ── SEED : produit + événement, puis série mensuelle BORNÉE par PATCH ─────
    // `recurrenceEndDate` est PATCH-only (BR-EVE-012 : hors DTO de création).
    const userId = await getUserId(page)
    const cat = await seedCategory(page, unique('676 Bounded Series Cat'))
    const productName = unique('676 Bounded Series Prod')
    const product = await seedProduct(page, { userId, name: productName, categoryId: cat.id })

    const eventsUrl = `${API}/users/${userId}/products/${product.id}/events`
    const listed = await page.request.get(eventsUrl)
    expect(listed.ok(), `GET events doit réussir (obtenu ${listed.status()})`).toBeTruthy()
    const [seeded] = (await listed.json()) as ApiEvent[]
    expect(seeded?.id, 'événement seedé requis').toBeTruthy()

    const startDate = seeded.startDate.slice(0, 10)
    const seriesEnd = plusDaysIso(startDate, 60)
    const patch = await page.request.patch(`${API}/events/${seeded.id}`, {
      data: {
        isRecurring: true,
        recurrenceUnit: 'MONTH',
        recurrenceEndDate: seriesEnd,
        version: seeded.version,
      },
    })
    expect(patch.status(), 'le PATCH de mise en série bornée doit réussir').toBe(200)

    // (1) PRÉCONDITION SERVEUR — la borne est persistée.
    const reread = await page.request.get(eventsUrl)
    const [bounded] = (await reread.json()) as ApiEvent[]
    expect(bounded.isRecurring, 'la série doit être active côté serveur').toBe(true)
    expect(
      bounded.recurrenceEndDate?.slice(0, 10),
      'la borne doit être persistée côté serveur, sinon un champ vide ne prouverait rien',
    ).toBe(seriesEnd)

    // ── OUVERTURE DE L'ÉDITION DEPUIS LA FRISE (détail produit) ──────────────
    await page.goto(`/fr/products/${product.id}`, {
      waitUntil: 'domcontentloaded',
      timeout: FIRST_NAV_BUDGET,
    })
    await expect(page.getByTestId('product-detail-view')).toBeVisible({ timeout: FIRST_NAV_BUDGET })
    // Ciblé par titre (unique) plutôt que `.first()` : robuste à d'autres pastilles.
    await page
      .locator(`[data-testid="timeline-event"][data-event-title="${bounded.title}"]`)
      .first()
      .click({ timeout: CLICK_BUDGET })
    await page.getByTestId('event-drawer-edit').click({ timeout: CLICK_BUDGET })

    await expect(page.getByTestId('timeline-edit-dialog')).toBeVisible({ timeout: CLICK_BUDGET })
    await expect(page.getByTestId('event-form')).toBeVisible()

    const endDateField = page.getByTestId('event-form-recurrence-end-date')
    const hint = page.getByTestId('event-form-recurrence-capped-hint')

    // (5) TÉMOIN — le bloc récurrence est bien monté.
    await expect(page.getByTestId('event-form-recurring-toggle')).toBeChecked()
    await expect(endDateField).toBeVisible({ timeout: CLICK_BUDGET })

    // (2) LE DÉFAUT DE L'ISSUE — la borne est affichée.
    await expect(
      endDateField,
      'LE DÉFAUT DE #676 : le champ de borne était VIDE à l’ouverture depuis la frise',
    ).toHaveValue(seriesEnd)

    // (3) PREUVE RÉSEAU — la preview a répondu avec la borne prise en compte.
    await expect
      .poll(() => probes.filter((p) => p.status === 200 && p.capped === false).length, {
        message:
          'POST /api/events/recurrence-preview doit avoir rendu 200 {capped:false}. ' +
          'Un 404 = proxy `/api` absent ; un 401/403 = auth ou CORS (PIT-S57-003). Sondes : ' +
          JSON.stringify(probes),
        timeout: 10_000,
      })
      .toBeGreaterThan(0)
    expect(
      probes.filter((p) => p.capped === true),
      'aucune preview SANS borne ne doit partir : avant #676 la première requête ' +
        'partait avec `recurrenceEndDate: null` et rendait capped:true',
    ).toHaveLength(0)

    // (4) Hint ABSENT — jugé après la réponse de la preview.
    await expect(
      hint,
      'une série bornée à +60 jours n’est pas plafonnée : le hint « limitée à 5 ans » ne doit pas s’afficher',
    ).toHaveCount(0)
    await expect(endDateField).toBeVisible()
  })
})
