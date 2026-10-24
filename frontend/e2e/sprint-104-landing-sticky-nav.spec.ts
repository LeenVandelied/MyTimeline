import { test, expect, type Page } from '@playwright/test'
import { LANDING_CTA, MOBILE_MENU, waitForFonts } from './support/contrast'

/**
 * #614 — Barre de navigation COLLANTE de la landing, et traitement de ses liens.
 *
 * Handoff §1 : « nav sticky (logo + liens mono uppercase séparés par filet + langue +
 * thème + CTA) ». Avant #614, le `<header>` n'avait ni `sticky` ni `fixed` : au
 * défilement, logo, liens et CTA d'inscription quittaient l'écran.
 *
 * CE QUE CETTE SPEC PROUVE (au navigateur — jsdom ne résout ni `position:sticky`, ni
 * le défilement, ni les `:has()`) :
 *   1. la barre reste collée en haut après défilement, à 1280 ET à 375 px, et le CTA
 *      d'inscription y reste cliquable (non recouvert) ;
 *   2. un clic d'ancre (nav desktop ET panneau burger) amène la section cible
 *      EXACTEMENT sous la barre — ni dessous, ni avec un vide ;
 *   3. hors ligne, la bannière réseau (sticky, `--z-netbanner`) garde le haut de
 *      l'écran et la barre se range JUSTE en dessous, sans chevauchement — ancres
 *      comprises ;
 *   4. les liens sont en mono capitales, et les filets verticaux sont peints : entre
 *      les liens et le groupe langue/thème/CTA, et entre deux liens (sonde
 *      SYNTHÉTIQUE : il n'y a qu'une ancre depuis le S103, le filet inter-liens ne
 *      peut donc se voir qu'en ajoutant un second lien au DOM) ;
 *   5. le fond de la barre est OPAQUE (= `--color-bg`) en clair et en sombre ;
 *   6. le panneau burger et son overlay se peignent AU-DESSUS de la barre.
 *
 * Mouvement : `.section-animation` part à `translateY(20px)` puis transitionne 0,8 s —
 * une section encore décalée fausserait la mesure d'ancre. Les sections sont donc
 * révélées et figées par une feuille injectée (`FROZEN_SECTIONS_CSS`), et
 * `reducedMotion: 'reduce'` fait poser `scroll-behavior:auto` par `base.css`.
 *
 * ⚠ macOS vs CI : cette spec ne mesure AUCUNE largeur de texte en valeur absolue
 * (PIT-S52-001) — seulement des positions relatives (barre/section/bannière) et des
 * styles calculés. Le budget de largeur par locale est tenu par
 * `landing-header-logo.spec.ts`.
 */

const BAR = 'landing-header-bar'
const BAR_HEIGHT = 93 // `--landing-bar-height` (`landing.css`) : 92 px de header + 1 px de filet
const BANNER_HEIGHT = 32 // `--sysbanner-height` (DS `i18n.css`)
const DESKTOP = { width: 1280, height: 800 } as const
const MOBILE = { width: 375, height: 812 } as const
const LOCALES = ['fr', 'en', 'es', 'de'] as const

test.use({ contextOptions: { reducedMotion: 'reduce' } })

const FROZEN_SECTIONS_CSS =
  '.section-animation { opacity: 1 !important; transform: none !important; transition: none !important }'

async function gotoLanding(page: Page, locale = 'fr'): Promise<void> {
  await page.goto(`/${locale}`, { waitUntil: 'domcontentloaded' })
  await waitForFonts(page)
  await expect(page.getByTestId(BAR)).toBeVisible()
  // Sections RÉVÉLÉES et figées : sinon la section cible glisse encore de 20 px
  // (`translateY(20px)` → 0 en 0,8 s) APRÈS que le défilement s'est arrêté — mesuré :
  // −3,5 à −4,9 px d'écart lus pendant la transition. Ne dépend pas de l'émulation
  // du mouvement réduit : la feuille fige l'état final quel que soit le contexte.
  await page.addStyleTag({ content: FROZEN_SECTIONS_CSS })
}

interface Box {
  top: number
  bottom: number
  height: number
}

async function boxOf(page: Page, selector: string): Promise<Box> {
  return page
    .locator(selector)
    .first()
    .evaluate((el) => {
      const r = el.getBoundingClientRect()
      return { top: r.top, bottom: r.bottom, height: r.height }
    })
}

const barSelector = `[data-testid="${BAR}"]`

/** Attend que le défilement soit stable (deux lectures identiques de `scrollY`). */
async function waitScrollSettled(page: Page): Promise<number> {
  let previous = -1
  await expect
    .poll(
      async () => {
        const y = await page.evaluate(() => window.scrollY)
        const stable = y === previous
        previous = y
        return stable
      },
      { intervals: [100, 100, 200, 200, 400] },
    )
    .toBe(true)
  return previous
}

/** Ouvre le burger — le clic est rejoué tant que l'hydratation n'a pas branché `onClick`. */
async function openMenu(page: Page) {
  const toggle = page.getByTestId(MOBILE_MENU.toggle)
  const panel = page.getByTestId(MOBILE_MENU.panel)
  await expect(async () => {
    await toggle.click()
    await expect(panel).toBeVisible({ timeout: 1_000 })
  }).toPass({ timeout: 15_000 })
  return panel
}

/**
 * La section `#how-it-works` doit commencer exactement au bas de ce qui colle en haut
 * (barre, + bannière hors ligne) : `scroll-padding-top` du document.
 * Tolérance 1 px (arrondis sous-pixel du défilement).
 */
async function expectSectionUnder(page: Page, expectedTop: number, label: string): Promise<void> {
  const scrollY = await waitScrollSettled(page)
  expect(scrollY, `[${label}] l'ancre n'a pas fait défiler la page`).toBeGreaterThan(100)
  const bar = await boxOf(page, barSelector)
  const section = await boxOf(page, '#how-it-works')
  const title = await boxOf(page, '#how-it-works h2')
  const detail = `barre ${bar.top}→${bar.bottom}, section ${section.top}, titre ${title.top}`
  expect(bar.bottom, `[${label}] bas de la barre — ${detail}`).toBeCloseTo(expectedTop, 0)
  expect(
    Math.abs(section.top - bar.bottom),
    `[${label}] la section doit démarrer AU BAS de la barre — ${detail}`,
  ).toBeLessThanOrEqual(1)
  expect(title.top, `[${label}] le titre passe sous la barre — ${detail}`).toBeGreaterThanOrEqual(
    bar.bottom,
  )
}

test.describe('#614 — barre collante de la landing', () => {
  for (const viewport of [DESKTOP, MOBILE]) {
    test(`${viewport.width} px — la barre reste en haut au défilement, CTA d'inscription cliquable`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport)
      await gotoLanding(page)

      const position = await page.getByTestId(BAR).evaluate((el) => getComputedStyle(el).position)
      expect(position).toBe('sticky')

      await page.evaluate(() => window.scrollTo(0, 1200))
      const scrollY = await waitScrollSettled(page)
      expect(scrollY, 'la page doit avoir défilé pour que la mesure ait un sens').toBeGreaterThan(
        600,
      )

      const bar = await boxOf(page, barSelector)
      expect(bar.top, `barre à ${bar.top}px après ${scrollY}px de défilement`).toBeCloseTo(0, 0)
      expect(bar.height).toBeCloseTo(BAR_HEIGHT, 0)

      const cta = page.getByTestId(LANDING_CTA.headerRegister)
      await expect(cta).toBeInViewport()
      // `trial` : Playwright vérifie l'actionnabilité, dont « non recouvert » au point
      // de clic, sans naviguer.
      await cta.click({ trial: true })
      const hit = await cta.evaluate((el) => {
        const r = el.getBoundingClientRect()
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
        return !!top && el.contains(top)
      })
      expect(hit, 'le CTA doit être l’élément peint au-dessus à son centre').toBe(true)
    })
  }

  test('1280 px — ancre de la nav desktop : la section s’arrête sous la barre', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP)
    await gotoLanding(page)
    await page.locator('header nav a[href="#how-it-works"]').click()
    await expect.poll(() => new URL(page.url()).hash).toBe('#how-it-works')
    await expectSectionUnder(page, BAR_HEIGHT, 'desktop')
  })

  test('375 px — ancre du panneau burger : la section s’arrête sous la barre', async ({ page }) => {
    await page.setViewportSize(MOBILE)
    await gotoLanding(page)
    const panel = await openMenu(page)
    await panel.locator('nav a[href="#how-it-works"]').click()
    await expect(page.getByTestId(MOBILE_MENU.panel)).toHaveCount(0)
    await expect.poll(() => new URL(page.url()).hash).toBe('#how-it-works')
    await expectSectionUnder(page, BAR_HEIGHT, 'burger')
  })

  for (const viewport of [DESKTOP, MOBILE]) {
    test(`${viewport.width} px — hors ligne : la barre se range sous la bannière réseau`, async ({
      page,
      context,
    }) => {
      await page.setViewportSize(viewport)
      await gotoLanding(page)
      await context.setOffline(true)
      try {
        const banner = page.getByTestId('network-banner')
        await expect(banner).toBeVisible()
        await expect(banner).toHaveAttribute('data-state', 'offline')

        await page.evaluate(() => window.scrollTo(0, 1200))
        await waitScrollSettled(page)

        const b = await boxOf(page, '[data-testid="network-banner"]')
        const bar = await boxOf(page, barSelector)
        const detail = `bannière ${b.top}→${b.bottom}, barre ${bar.top}→${bar.bottom}`
        expect(b.top, `la bannière garde le haut — ${detail}`).toBeCloseTo(0, 0)
        expect(b.height).toBeCloseTo(BANNER_HEIGHT, 0)
        expect(bar.top, `la barre doit se ranger sous la bannière — ${detail}`).toBeCloseTo(
          b.bottom,
          0,
        )

        // Ancre hors ligne : la section doit descendre sous la barre ET la bannière.
        await page.evaluate(() => window.scrollTo(0, 0))
        await waitScrollSettled(page)
        await page.evaluate(() => {
          window.location.hash = ''
          window.location.hash = '#how-it-works'
        })
        await expectSectionUnder(page, BANNER_HEIGHT + BAR_HEIGHT, 'hors ligne')
      } finally {
        await context.setOffline(false)
      }
    })
  }

  test('375 px — le panneau burger et son overlay se peignent au-dessus de la barre', async ({
    page,
  }) => {
    await page.setViewportSize(MOBILE)
    await gotoLanding(page)
    const panel = await openMenu(page)
    await page.addStyleTag({
      content: '*, *::before, *::after { transition: none !important; animation: none !important }',
    })

    const stack = await panel.evaluate((panelEl) => {
      const bar = document
        .querySelector('[data-testid="landing-header-bar"]')!
        .getBoundingClientRect()
      const p = panelEl.getBoundingClientRect()
      // À gauche du panneau, dans la hauteur de la barre : l'overlay doit être en tête.
      const overBar = document.elementFromPoint(8, bar.top + bar.height / 2)
      // Dans le panneau, à la hauteur de la barre : le panneau doit être en tête.
      const inPanel = document.elementFromPoint(p.left + p.width / 2, bar.top + 8)
      return {
        overBar: overBar?.getAttribute('data-testid') ?? overBar?.tagName ?? null,
        inPanel: !!inPanel && panelEl.contains(inPanel),
      }
    })
    expect(stack.overBar, 'l’overlay doit couvrir la barre').toBe(MOBILE_MENU.overlay)
    expect(stack.inPanel, 'le panneau doit se peindre au-dessus de la barre').toBe(true)
  })
})

/**
 * Correctif de review #614 — AGRANDISSEMENT DU TEXTE SEUL (WCAG 1.4.4).
 *
 * Méthode : les tailles typographiques du DS sont en px (`ds/tokens/typography.css`),
 * donc `html{font-size:200%}` n'agrandit RIEN (mesuré : barre 93 px inchangée). On
 * double donc les tokens `--text-*` eux-mêmes — ce que fait un zoom « texte
 * seulement », qui agrandit les polices sans toucher les boîtes en px.
 * Mesuré avant correctif (hauteur FIGÉE 93 px), 1024 px `de` : nav sur deux lignes,
 * texte débordant de 11,5 px sous la barre et 12,5 px au-dessus. Après : la barre
 * grandit (134 px) et l'ancre suit sa hauteur réelle.
 */
const TEXT_X2_CSS =
  ':root{--text-2xs:26px!important;--text-xs:30px!important;--text-sm:34px!important;' +
  '--text-md:42px!important;--text-lg:54px!important;--text-xl:70px!important}'

test('1024 px, de, texte ×2 — la barre contient son texte et l’ancre suit sa hauteur', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 800 })
  await gotoLanding(page, 'de')
  await page.addStyleTag({ content: TEXT_X2_CSS })
  await waitForFonts(page)

  const bar = page.getByTestId(BAR)
  // Le cas n'a de sens que si le texte agrandi dépasse le plancher.
  await expect
    .poll(async () => (await boxOf(page, barSelector)).height)
    .toBeGreaterThan(BAR_HEIGHT + 10)

  const m = await bar.evaluate((el) => {
    const b = el.getBoundingClientRect()
    let top = Infinity
    let bottom = -Infinity
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent?.trim()) continue
      const range = document.createRange()
      range.selectNodeContents(n)
      for (const r of Array.from(range.getClientRects())) {
        if (!r.height) continue
        top = Math.min(top, r.top)
        bottom = Math.max(bottom, r.bottom)
      }
    }
    return { barTop: b.top, barBottom: b.bottom, textTop: top, textBottom: bottom }
  })
  const detail = JSON.stringify(m)
  expect(m.textTop, `texte au-dessus de la barre — ${detail}`).toBeGreaterThanOrEqual(m.barTop)
  expect(m.textBottom, `texte sous la barre — ${detail}`).toBeLessThanOrEqual(m.barBottom)

  // Hauteur réelle publiée par `HeaderSection` (ResizeObserver, après hydratation) :
  // l'attendre, sinon l'ancre partirait avec le plancher de 93 px.
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.style.getPropertyValue('--landing-bar-height')),
    )
    .toBe(`${m.barBottom - m.barTop}px`)

  await page.evaluate(() => {
    window.location.hash = '#how-it-works'
  })
  await expectSectionUnder(page, m.barBottom, 'texte ×2')
})

test.describe('#614 — traitement des liens et de la barre', () => {
  for (const locale of LOCALES) {
    test(`1024 px, ${locale} — mono capitales, filets, une ligne, sans débordement`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1024, height: 800 })
      await gotoLanding(page, locale)

      const m = await page.evaluate(() => {
        const header = document.querySelector('header')!
        const nav = header.querySelector(':scope > nav')!
        const link = nav.querySelector('a')!
        const group = header.querySelector(':scope > div:nth-of-type(2)') as HTMLElement
        const probe = document.createElement('span')
        probe.style.color = 'var(--color-rule)'
        document.body.appendChild(probe)
        const rule = getComputedStyle(probe).color
        probe.remove()

        // Sonde synthétique : un 2ᵉ lien — le filet inter-liens doit s'y peindre.
        const clone = link.cloneNode(true) as HTMLElement
        nav.appendChild(clone)
        const cloneStyle = getComputedStyle(clone)
        const second = {
          width: cloneStyle.borderLeftWidth,
          style: cloneStyle.borderLeftStyle,
          color: cloneStyle.borderLeftColor,
        }
        const firstBorder = getComputedStyle(link).borderLeftWidth
        clone.remove()

        const ls = getComputedStyle(link)
        const lineHeight = parseFloat(ls.lineHeight)
        const gs = getComputedStyle(group)
        const logo = header.querySelector(':scope > div:first-child > div')!.getBoundingClientRect()
        return {
          textTransform: ls.textTransform,
          fontFamily: ls.fontFamily,
          mono: getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim(),
          linkHeight: link.getBoundingClientRect().height,
          lineHeight,
          rule,
          group: {
            width: gs.borderLeftWidth,
            style: gs.borderLeftStyle,
            color: gs.borderLeftColor,
          },
          second,
          firstBorder,
          gapLogoNav: nav.getBoundingClientRect().left - logo.right,
          gapNavGroup: group.getBoundingClientRect().left - nav.getBoundingClientRect().right,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }
      })
      const detail = JSON.stringify(m)

      expect(m.textTransform, detail).toBe('uppercase')
      // Première famille de `--font-mono` (next/font l'écrit entre guillemets).
      // Guillemets normalisés : la variable les écrit simples, le calculé doubles.
      const firstFamily = (list: string) => list.split(',')[0].trim().replace(/['"]/g, '')
      expect(firstFamily(m.mono).length, detail).toBeGreaterThan(0)
      expect(firstFamily(m.fontFamily), detail).toBe(firstFamily(m.mono))
      expect(m.linkHeight, `libellé sur une ligne — ${detail}`).toBeLessThan(m.lineHeight * 1.5)

      // Filet liens | langue/thème/CTA.
      expect(m.group, detail).toEqual({ width: '1px', style: 'solid', color: m.rule })
      // Filet entre deux liens (sonde synthétique) — et pas avant le premier.
      expect(m.second, detail).toEqual({ width: '1px', style: 'solid', color: m.rule })
      expect(m.firstBorder, detail).toBe('0px')

      // Plancher de `landing-header-logo.spec.ts` au-delà de 768 px.
      expect(m.gapLogoNav, detail).toBeGreaterThanOrEqual(24)
      expect(m.gapNavGroup, detail).toBeGreaterThanOrEqual(24)
      expect(m.scrollWidth, detail).toBeLessThanOrEqual(m.clientWidth)
    })
  }

  for (const scheme of ['light', 'dark'] as const) {
    test(`fond opaque = --color-bg et filet bas, thème ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' })
      await page.setViewportSize(DESKTOP)
      await gotoLanding(page)
      await expect
        .poll(async () => (await page.locator('html').getAttribute('class')) ?? '')
        .toMatch(scheme === 'dark' ? /\bdark\b/ : /\blight\b/)

      const m = await page.getByTestId(BAR).evaluate((el) => {
        // Une sonde PAR token : relire la même après changement de `style.color`
        // rendait la valeur précédente (constaté ici).
        const resolve = (token: string) => {
          const probe = document.createElement('span')
          probe.style.color = `var(${token})`
          document.body.appendChild(probe)
          const value = getComputedStyle(probe).color
          probe.remove()
          return value
        }
        const bg = resolve('--color-bg')
        const rule = resolve('--color-rule')
        const s = getComputedStyle(el)
        return {
          background: s.backgroundColor,
          bg,
          borderBottom: `${s.borderBottomWidth} ${s.borderBottomStyle} ${s.borderBottomColor}`,
          rule,
        }
      })
      expect(m.background, JSON.stringify(m)).toBe(m.bg)
      expect(m.background, 'fond sans transparence').toMatch(/^rgb\(/)
      expect(m.borderBottom, JSON.stringify(m)).toBe(`1px solid ${m.rule}`)
    })
  }
})
