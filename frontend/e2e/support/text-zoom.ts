import type { Page } from '@playwright/test'

/**
 * AGRANDISSEMENT DU TEXTE SEUL ×2 (WCAG 1.4.4) — source unique des specs E2E.
 *
 * Méthode (PIT-S104-003) : les tailles typographiques du DS Graphite sont en px
 * (`ds/tokens/typography.css`), donc `html{font-size:200%}` n'agrandit RIEN. On double
 * les tokens `--text-*` eux-mêmes — ce que fait un zoom « texte seulement », qui
 * agrandit les polices sans toucher les boîtes en px.
 *
 * Les valeurs doublées sont LUES sur `:root` au moment de l'appel (pas recopiées) :
 * un changement d'échelle du DS ne périme pas la simulation. Les 8 crans sont doublés
 * — #614 n'en doublait que 6 (`2xs`…`xl`), ce qui suffisait au header mais laissait le
 * titre du hero (`md:text-2xl lg:text-3xl`) à sa taille nominale (#799).
 *
 * Extrait de `sprint-104-landing-sticky-nav.spec.ts` (#614) au S115 (#799).
 */
export const TEXT_TOKENS = ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const

/**
 * Injecte la feuille ×2 et rend les tailles NOMINALES lues avant injection
 * (`{ '2xs': 13, … }`), pour que l'appelant asserte que la simulation a pris.
 */
export async function applyTextX2(page: Page): Promise<Record<string, number>> {
  return page.evaluate((tokens) => {
    const cs = getComputedStyle(document.documentElement)
    const nominal: Record<string, number> = {}
    for (const token of tokens) {
      const px = parseFloat(cs.getPropertyValue(`--text-${token}`))
      if (!Number.isFinite(px)) throw new Error(`--text-${token} introuvable sur :root`)
      nominal[token] = px
    }
    const style = document.createElement('style')
    style.dataset.textZoom = 'x2'
    style.textContent = `:root{${tokens.map((t) => `--text-${t}:${nominal[t] * 2}px!important`).join(';')}}`
    document.head.appendChild(style)
    return nominal
  }, TEXT_TOKENS)
}
