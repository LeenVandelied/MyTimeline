// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * #558 — l'assouplissement de l'éviction du serveur de dev (`onDemandEntries`) est
 * réservé à la recette E2E locale, posée par la config Playwright locale via
 * `E2E_LOCAL_DEV_CACHE=1`. Sans ce drapeau la config reste identique à aujourd'hui.
 *
 * « Le build de production n'est pas touché » : `next.config.mjs` exporte un objet,
 * il ne lit aucune phase Next ni NODE_ENV. Il ne peut donc pas distinguer un build
 * de production sans code de production en plus. On le garantit par une garde
 * statique : seule la branche locale de `playwright.config.ts` pose le drapeau, et
 * ni le CI ni les images Docker ne le posent.
 */
const FLAG = 'E2E_LOCAL_DEV_CACHE'
const PROXY = 'E2E_API_PROXY_TARGET'
const frontendRoot = resolve(__dirname, '..', '..')
// Défauts de Next pour l'éviction : 60 s d'inactivité, 5 pages gardées.
const NEXT_DEFAULT_MAX_INACTIVE_AGE_MS = 60_000
const NEXT_DEFAULT_PAGES_BUFFER = 5

type LoadedConfig = Record<string, unknown> & {
  onDemandEntries?: { maxInactiveAge?: number; pagesBufferLength?: number }
  rewrites?: () => Promise<unknown>
}

async function loadConfig(flag: string | undefined, proxy?: string): Promise<LoadedConfig> {
  if (flag === undefined) delete process.env[FLAG]
  else process.env[FLAG] = flag
  if (proxy === undefined) delete process.env[PROXY]
  else process.env[PROXY] = proxy
  vi.resetModules()
  const mod = await import('../../next.config.mjs')
  return mod.default as LoadedConfig
}

// Valeur sérialisable de la config : les fonctions sont remplacées par un marqueur.
const plain = (cfg: LoadedConfig) =>
  JSON.parse(JSON.stringify(cfg, (_k, v) => (typeof v === 'function' ? '[fn]' : v)))

// Instantané de la config SANS drapeau, tel qu'à l'ouverture de #558.
// `turbopack` et `webpack` viennent du plugin next-intl.
const BASE_SNAPSHOT = {
  output: 'standalone',
  experimental: { globalNotFound: true },
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: false },
  turbopack: { resolveAlias: { 'next-intl/config': './i18n.ts' } },
  webpack: '[fn]',
}

describe('#558 — relaxed dev cache only applies when the local E2E flag is set', () => {
  const saved = { flag: process.env[FLAG], proxy: process.env[PROXY] }
  beforeEach(() => {
    delete process.env[FLAG]
    delete process.env[PROXY]
  })
  afterEach(() => {
    for (const [name, v] of [
      [FLAG, saved.flag],
      [PROXY, saved.proxy],
    ] as const) {
      if (v === undefined) delete process.env[name]
      else process.env[name] = v
    }
  })

  it("sans drapeau et sans proxy, la config est identique à aujourd'hui", async () => {
    const cfg = await loadConfig(undefined, undefined)
    expect(plain(cfg)).toEqual(BASE_SNAPSHOT)
    expect(cfg).not.toHaveProperty('rewrites')
  })

  it("sans drapeau avec proxy, la config et les rewrites sont identiques à aujourd'hui", async () => {
    const cfg = await loadConfig(undefined, 'http://localhost:8080')
    expect(plain(cfg)).toEqual({ ...BASE_SNAPSHOT, rewrites: '[fn]' })
    expect(await cfg.rewrites?.()).toEqual([
      { source: '/api/:path*', destination: 'http://localhost:8080/api/:path*' },
    ])
  })

  it("avec drapeau, l'éviction est desserrée", async () => {
    const cfg = await loadConfig('1')
    expect(cfg.onDemandEntries).toBeDefined()
    const { maxInactiveAge, pagesBufferLength } = cfg.onDemandEntries ?? {}
    const loosened =
      (maxInactiveAge ?? 0) > NEXT_DEFAULT_MAX_INACTIVE_AGE_MS ||
      (pagesBufferLength ?? 0) > NEXT_DEFAULT_PAGES_BUFFER
    expect(loosened).toBe(true)
  })

  it("avec drapeau, rien d'autre que onDemandEntries ne change (sans et avec proxy)", async () => {
    for (const proxy of [undefined, 'http://localhost:8080']) {
      const without = await loadConfig(undefined, proxy)
      const withFlag = await loadConfig('1', proxy)
      const rest = plain(withFlag)
      delete rest.onDemandEntries
      expect(rest).toEqual(plain(without))
      if (proxy) expect(await withFlag.rewrites?.()).toEqual(await without.rewrites?.())
    }
  })

  it("un drapeau vide ou à 0 n'assouplit rien", async () => {
    expect(await loadConfig('')).not.toHaveProperty('onDemandEntries')
    expect(await loadConfig('0')).not.toHaveProperty('onDemandEntries')
  })
})

describe('#558 — le build de production ne pose jamais le drapeau (garde statique)', () => {
  const read = (rel: string) => readFileSync(resolve(frontendRoot, rel), 'utf8')

  it('seule la branche locale du webServer de playwright.config.ts pose le drapeau', () => {
    const src = read('playwright.config.ts')
    const webServerAt = src.lastIndexOf('webServer:')
    const localBranchAt = src.indexOf('assertWebServerEnv(),', webServerAt)
    expect(src, `${FLAG} absent de playwright.config.ts`).toContain(FLAG)
    expect(webServerAt).toBeGreaterThan(-1)
    expect(localBranchAt).toBeGreaterThan(webServerAt)
    // Toute occurrence est dans la branche locale (après `assertWebServerEnv(),`).
    const occurrences = [...src.matchAll(new RegExp(FLAG, 'g'))].map((m) => m.index ?? -1)
    expect(occurrences.length).toBeGreaterThan(0)
    for (const at of occurrences) expect(at).toBeGreaterThan(localBranchAt)
  })

  it('ni le CI ni les images ne posent le drapeau', () => {
    const files = [
      '../.github/workflows/ci.yml',
      'Dockerfile',
      '../docker-compose.yml',
      '../docker-compose.prod.yml',
    ]
    for (const rel of files) {
      if (!existsSync(resolve(frontendRoot, rel))) continue
      expect(read(rel), rel).not.toContain(FLAG)
    }
  })
})
