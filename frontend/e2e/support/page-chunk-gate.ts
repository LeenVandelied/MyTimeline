import type { Page, Route } from '@playwright/test'

/**
 * #890 — Porte sur le chunk JavaScript CLIENT d'une page, reconnu par son CONTENU.
 *
 * Avant #890, les specs de squelettes (`sprint-90-first-contact`, `sprint-106-product-detail`)
 * reconnaissaient ce chunk à son CHEMIN webpack (`/_next/static/chunks/app/…/page-<hash>.js`).
 * Sous Turbopack (`next build` sans `--webpack`), les chunks sont plats et nommés par hash
 * (`/_next/static/chunks/<hash>.js`) : l'expression ne matchait plus rien, la porte ne
 * s'armait jamais et les specs attendaient `held` jusqu'au timeout.
 *
 * Le chunk propre à la page se reconnaît désormais à un MARQUEUR : un `data-testid` rendu par
 * la page et absent de son `loading.tsx` comme des layouts (mesuré sur la table
 * `entryJSFiles` du manifeste client, Sprint 120). Indépendant du bundler et du mode
 * (`next dev` comme `next build`).
 *
 * ⚠ Le chunk `loading` du même segment ne doit PAS contenir le marqueur : c'est lui qui doit
 * arriver pour peindre le fallback. Si un marqueur migre un jour dans un composant partagé
 * avec le `loading`, le squelette ne se peint plus et la spec rougit (pas de faux vert).
 */
export const PAGE_CHUNK_MARKERS = {
  dashboard: 'dashboard-product-list',
  timeline: 'timeline-screen',
  products: 'products-page',
  settings: 'settings-page',
  productDetail: 'product-detail-page',
} as const

export type PageChunkMarker = (typeof PAGE_CHUNK_MARKERS)[keyof typeof PAGE_CHUNK_MARKERS]

export interface ChunkGate {
  /** Résolue quand un chunk portant le marqueur a été intercepté et retenu. */
  held: Promise<void>
  /** Libère le(s) chunk(s) retenu(s). Idempotent. */
  release: () => void
}

const JS_CHUNK_PATH_RE = /\/_next\/static\/chunks\/.+\.js$/

/** En-têtes à ne pas recopier : le corps rendu est déjà décodé et sa longueur change. */
const DROPPED_HEADERS = new Set(['content-encoding', 'content-length', 'transfer-encoding'])

/**
 * Retient tout chunk JS dont le contenu porte `marker` (entre guillemets) tant que
 * `release()` n'est pas appelé. Les autres chunks passent, après lecture. `armed` permet de
 * n'armer la porte qu'à partir d'un moment donné (les chunks chargés avant passent).
 */
export async function gatePageChunk(
  page: Page,
  marker: PageChunkMarker,
  armed: () => boolean = () => true,
): Promise<ChunkGate> {
  let release: () => void = () => {}
  const opened = new Promise<void>((resolve) => {
    release = resolve
  })
  let markHeld: () => void = () => {}
  const held = new Promise<void>((resolve) => {
    markHeld = resolve
  })
  const markerRe = new RegExp(`["'\`]${marker}["'\`]`)

  await page.route(
    (url) => JS_CHUNK_PATH_RE.test(url.pathname),
    async (route: Route) => {
      if (!armed()) {
        await route.continue()
        return
      }
      const response = await route.fetch()
      const body = await response.text()
      if (markerRe.test(body)) {
        markHeld()
        await opened
      }
      const headers = Object.fromEntries(
        Object.entries(response.headers()).filter(([k]) => !DROPPED_HEADERS.has(k.toLowerCase())),
      )
      await route.fulfill({ status: response.status(), headers, body })
    },
  )
  return { held, release: () => release() }
}
