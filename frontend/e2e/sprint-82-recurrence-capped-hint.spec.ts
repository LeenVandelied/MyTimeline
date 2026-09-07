import { expect, test } from './support/fixtures'
import { PROD } from './support/accounts'
import { ensureAuthenticated } from './support/auth'
import { neutralizeDevToolingPointerEvents } from './support/dev-tooling'
import { getUserId, seedCategory, seedProduct, unique } from './support/products'

/**
 * #491 (Sprint 82) — HINT DE PLAFOND DE RÉCURRENCE, PARCOURS RÉEL.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI CETTE SPEC EXISTE
 * ─────────────────────────────────────────────────────────────────────────────
 * `event-form-recurrence-capped-hint` a été livré au S69 (#67) et il est bien
 * couvert par 5 assertions unitaires (`EventEditForm.test.tsx:553..597`) — mais
 * ces 5 assertions MOCKENT `useRecurrencePreview`. Elles prouvent le RENDU
 * conditionnel à partir d'un `capped` fabriqué ; elles ne touchent ni le hook,
 * ni `previewRecurrence`, ni `POST /api/events/recurrence-preview` (#439), ni
 * l'`enabled` de la query, ni le debounce. Autrement dit : si le câblage réseau
 * était rompu de bout en bout, les 5 tests unitaires resteraient VERTS.
 *
 * Le check coverage-E2E de la Phase 8 du S69 avait signalé ce trou en MAJEUR,
 * et le harnais E2E n'était pas exécutable dans ce worktree à l'époque.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LE SEUIL RÉEL N'EST PAS CELUI QUE LE LIBELLÉ ANNONCE — mesuré, pas déduit
 * ─────────────────────────────────────────────────────────────────────────────
 * Le texte du hint (`products.recurrenceCappedHint`, fr) dit « La série dépasse
 * 4 000 occurrences ». Ce N'EST PAS le déclencheur réel depuis #452 (S65) :
 * `RecurrenceExpansionServiceImpl` force `capped = true` pour TOUTE série SANS
 * `recurrenceEndDate`, tronquée à l'horizon `MAX_UNBOUNDED_EXPANSION_YEARS = 5`.
 * Sondé sur le backend e2e de ce sprint (S82) :
 *
 *   MONTH, sans borne              -> { "count": 61,  "capped": true  }
 *   MONTH, borne à +2 mois         -> { "count": 3,   "capped": false }
 *   WEEK,  sans borne              -> { "count": 261, "capped": true  }
 *
 * Le scénario ci-dessous est bâti sur CE comportement mesuré et non sur le
 * libellé — c'est exactement l'inversion que la BR-EVE-012 met en garde de ne
 * pas faire. (L'écart libellé/seuil est un défaut PRODUIT réel, hors périmètre
 * de cette issue de test : cf. RECOMMAND_FOLLOWUP du done.)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE LA SPEC PROUVE — et ce qui la fait ROUGIR
 * ─────────────────────────────────────────────────────────────────────────────
 *   1. TROIS états, pas deux. Récurrence OFF -> ni champ ni hint. Récurrence ON
 *      mais unité NON choisie -> champ présent, hint ABSENT (la query est
 *      `enabled: false` faute de `recurrenceUnit`). C'est ce 2e état qui
 *      interdit le faux vert « le hint s'affiche dès qu'on coche récurrent ».
 *   2. Unité posée, AUCUNE date de fin -> le hint APPARAÎT. Rougit si le hint
 *      est retiré, si la query n'est jamais armée, ou si le proxy `/api` est
 *      absent.
 *   3. Date de fin courte posée -> le hint DISPARAÎT. Rougit si le hint est
 *      rendu en dur, s'il ignore `capped`, ou si la query ne se recalcule pas
 *      quand `recurrenceEndDate` change (clé de query figée).
 *   4. TÉMOIN indispensable en (3) : `event-form-recurrence-end-date` doit
 *      RESTER visible. Sans lui, un démontage accidentel de tout le bloc
 *      récurrence rendrait « le hint a disparu » vrai *vacuellement*.
 *   5. PREUVE RÉSEAU : les réponses de `POST /api/events/recurrence-preview`
 *      sont collectées et leur `capped` est assert. Un hint correct alimenté
 *      par un backend muet (ou un 4xx CORS déguisé) est ainsi distingué d'un
 *      vrai aller-retour. ⚠ [[PIT-S57-003]] : un `curl` vert ne disculpe PAS le
 *      CORS (curl n'envoie pas d'`Origin`) — seuls ces statuts instrumentés,
 *      relevés depuis le navigateur, tranchent.
 *
 * CE QU'ELLE NE PROUVE PAS : le rendu visuel du hint (couleur, contraste), ni
 * le fait qu'il ne bloque pas la soumission — ce dernier point est déjà couvert
 * unitairement (`EventEditForm.test.tsx`, « le hint ne BLOQUE PAS la soumission »).
 *
 * PÉRIMÈTRE : mode ÉDITION uniquement. Le champ `recurrenceEndDate` — et donc le
 * hint qu'il porte — n'existe PAS à la création (BR-EVE-012 : hors DTO create),
 * et `EventEditForm` désarme explicitement la query en mode `create`.
 *
 * PRÉREQUIS RUNTIME : backend + front avec proxy `/api` (runbook E2E S47).
 */

const DESKTOP = { width: 1280, height: 900 }

const CLICK_BUDGET = 15_000
const FIRST_NAV_BUDGET = 60_000

/** Réponse de `POST /api/events/recurrence-preview` telle qu'observée du navigateur. */
interface PreviewProbe {
  status: number
  count?: number
  capped?: boolean
}

/**
 * Borne de fin courte, exprimée en JOURS et non en mois.
 *
 * `startDate.plusMonths(2)` côté JS traverserait les débordements de quantième
 * (31 déc + 2 mois) et rendrait la donnée de test dépendante du jour du run.
 * +60 jours donne 2 ou 3 occurrences mensuelles selon la longueur des mois
 * traversés — dans TOUS les cas très en dessous du plafond, donc `capped:false`,
 * ce qui est la seule propriété dont le test a besoin.
 */
function plusDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const base = Date.UTC(y, m - 1, d)
  return new Date(base + days * 86_400_000).toISOString().slice(0, 10)
}

test.describe('#491 — hint de plafond de récurrence (parcours réel)', () => {
  test.use({ storageState: PROD.storageState, viewport: DESKTOP })

  test('le hint apparaît sans date de fin et disparaît dès qu’une borne courte est posée', async ({
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
        // Corps non-JSON (erreur proxy / HTML d'erreur Next) : le statut suffit
        // à diagnostiquer, et l'assertion sur `capped` échouera avec le détail.
      }
      probes.push(probe)
    })

    await ensureAuthenticated(page)

    // Le produit seedé embarque un premier événement `single` daté d'aujourd'hui :
    // c'est LUI qu'on édite (même amorce que `sprint-71-edit-preview-pinned.spec.ts`).
    const userId = await getUserId(page)
    const cat = await seedCategory(page, unique('491 Capped Hint Cat'))
    const product = await seedProduct(page, {
      userId,
      name: unique('491 Capped Hint Prod'),
      categoryId: cat.id,
    })

    // Chemin DESKTOP d'ouverture de l'édition : frise du détail produit ->
    // `EventDrawer` (lecture seule) -> bouton « Éditer ».
    await page.goto(`/fr/products/${product.id}`, {
      waitUntil: 'domcontentloaded',
      timeout: FIRST_NAV_BUDGET,
    })
    await expect(page.getByTestId('product-detail-view')).toBeVisible({ timeout: FIRST_NAV_BUDGET })
    await page.getByTestId('timeline-event').first().click({ timeout: CLICK_BUDGET })
    await page.getByTestId('event-drawer-edit').click({ timeout: CLICK_BUDGET })

    await expect(page.getByTestId('timeline-edit-dialog')).toBeVisible({ timeout: CLICK_BUDGET })
    await expect(page.getByTestId('event-form')).toBeVisible()

    const hint = page.getByTestId('event-form-recurrence-capped-hint')
    const endDateField = page.getByTestId('event-form-recurrence-end-date')

    // ── ÉTAT 1 — récurrence OFF : ni champ de borne, ni hint ──────────────────
    await expect(
      endDateField,
      'l’événement seedé n’est pas récurrent : le champ de borne ne doit pas exister',
    ).toHaveCount(0)
    await expect(hint).toHaveCount(0)

    // `startDate` pilote la query (`enabled` STRICT) : sans valeur, aucun appel
    // ne partirait et l'absence de hint serait vraie pour la mauvaise raison.
    const startDate = await page.getByTestId('event-form-start-date').inputValue()
    expect(
      startDate,
      'le formulaire d’édition doit être pré-rempli avec la date de l’événement seedé',
    ).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    // ── ÉTAT 2 — récurrence ON, unité NON choisie : champ visible, hint absent ─
    await page.getByTestId('event-form-recurring-toggle').click()
    await expect(endDateField).toBeVisible({ timeout: CLICK_BUDGET })
    await expect(
      hint,
      'sans `recurrenceUnit` la query preview est DÉSARMÉE (`enabled: false`) : ' +
        'un hint visible ici signalerait un rendu décorrélé de `capped`',
    ).toHaveCount(0)
    expect(
      probes,
      'aucun appel preview ne doit partir tant que l’unité n’est pas choisie',
    ).toHaveLength(0)

    // ── ÉTAT 3 — unité MONTH, AUCUNE borne : le hint APPARAÎT ─────────────────
    await page.getByTestId('event-form-recurrence-trigger').click({ timeout: CLICK_BUDGET })
    await page.getByTestId('recurrence-unit-option-MONTH').click({ timeout: CLICK_BUDGET })

    await expect(
      hint,
      'LE DÉFAUT COUVERT PAR L’ISSUE : une série SANS date de fin est tronquée à ' +
        'l’horizon de 5 ans (`capped:true`), le hint DOIT donc s’afficher',
    ).toBeVisible({ timeout: CLICK_BUDGET })
    await expect(hint).toHaveText(/4\s*000 occurrences/)

    // Le hint est informatif, pas une erreur : ton neutre exigé par #67.
    await expect(hint).toHaveAttribute('role', 'status')
    await expect(hint).toHaveAttribute('aria-live', 'polite')

    // PREUVE RÉSEAU (1/2) — l'aller-retour a bien eu lieu et a rendu capped:true.
    await expect
      .poll(() => probes.filter((p) => p.status === 200 && p.capped === true).length, {
        message:
          'POST /api/events/recurrence-preview doit avoir rendu 200 {capped:true}. ' +
          'Un 404 = proxy `/api` absent ; un 401/403 = auth ou CORS (que `curl` ne ' +
          'sait PAS réfuter, cf. PIT-S57-003). Sondes : ' +
          JSON.stringify(probes),
        timeout: 10_000,
      })
      .toBeGreaterThan(0)

    // ── ÉTAT 4 — borne courte posée : le hint DISPARAÎT ───────────────────────
    const shortEnd = plusDaysIso(startDate, 60)
    await endDateField.fill(shortEnd)

    await expect(
      hint,
      'une borne courte ramène la série sous le plafond (`capped:false`) : le hint ' +
        'DOIT disparaître. Rouge ici = hint rendu en dur, ou clé de query figée qui ' +
        'ne repart pas quand `recurrenceEndDate` change',
    ).toHaveCount(0, { timeout: CLICK_BUDGET })

    // TÉMOIN — sans lui, un démontage du bloc récurrence rendrait (4) vacuellement vert.
    await expect(
      endDateField,
      'le champ de borne doit RESTER visible : c’est la disparition du HINT qu’on ' +
        'mesure, pas celle de la section entière',
    ).toBeVisible()
    await expect(endDateField).toHaveValue(shortEnd)

    // PREUVE RÉSEAU (2/2) — un second aller-retour, avec la borne, a rendu capped:false.
    await expect
      .poll(() => probes.filter((p) => p.status === 200 && p.capped === false).length, {
        message:
          'la pose d’une borne doit DÉCLENCHER un nouvel appel preview rendant ' +
          '{capped:false} — sinon la disparition du hint ne vient pas du backend. ' +
          'Sondes : ' +
          JSON.stringify(probes),
        timeout: 10_000,
      })
      .toBeGreaterThan(0)

    // Le compte rendu avec la borne doit être PETIT : atteste que c'est bien la
    // borne qui a été prise en compte, et non une réponse d'un état antérieur.
    const bounded = probes.filter((p) => p.status === 200 && p.capped === false)
    expect(
      bounded[bounded.length - 1].count,
      `la série bornée à ${shortEnd} doit tenir en quelques occurrences mensuelles`,
    ).toBeLessThan(10)
  })
})
