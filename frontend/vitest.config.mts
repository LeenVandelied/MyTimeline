import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

/**
 * Config Vitest — tests unitaires + composants (Next 15 / React 18 / Tailwind 4).
 * Env jsdom pour RTL. Les alias `@/*` et `@/app/*` (tsconfig.json) sont mappés
 * en dur via `resolve.alias` — on évite `vite-tsconfig-paths` (ESM-only, charge
 * mal dans une config `.ts` require-CJS, vu que package.json n'est pas `"module"`).
 * `next/font` est mocké dans vitest.setup.ts (jsdom ne charge pas les polices).
 */
const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@/app': r('./app'),
      '@': r('./src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    css: true,
    // #302 — `next-intl/middleware` est un ESM publié qui importe `next/server`
    // SANS extension : en environnement `node`, Vitest l'externalise et la
    // résolution ESM native de Node échoue ("Did you mean next/server.js ?").
    // L'inliner le fait passer par le résolveur de Vite, qui honore les
    // `exports` du package `next`.
    // ⚠ Le motif est comparé à l'ID COMPLET du module (`/…/node_modules/next-intl/
    // dist/…`) : une ancre `^next-intl` ne matche jamais. Ne pas « corriger ».
    server: { deps: { inline: [/node_modules[\\/]next-intl[\\/]/] } },
    // `middleware.test.ts` vit à la RACINE (à côté de `middleware.ts`, seul
    // emplacement où Next reconnaît le middleware) — #302 / ADR-004. Il déclare
    // `// @vitest-environment node` : `NextRequest` exige les primitives Fetch
    // globales, absentes de jsdom.
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'app/**/*.{test,spec}.{ts,tsx}',
      'middleware.{test,spec}.ts',
    ],
    exclude: ['node_modules/**', '.next/**', 'e2e/**', '**/*.stories.{ts,tsx}'],
    // #169 — COUVERTURE : mesure seule, AUCUN seuil bloquant.
    // Pas de clé `thresholds` ici, volontairement : l'objectif de l'issue est de
    // rendre la couverture mesurable avant d'imposer un plancher. Le rapport
    // n'est produit que si `--coverage` est passé (cf. script `test:coverage`) ;
    // `npm test` reste inchangé pour la boucle de dev rapide.
    coverage: {
      // Provider v8 (instrumentation native du moteur) plutôt qu'istanbul : pas
      // de transformation supplémentaire du bundle, donc pas de coût sur la durée
      // de la suite. `@vitest/coverage-v8` doit rester aligné sur la MINEURE de
      // `vitest` (3.2.x) — un provider en avance échoue avec un message qui ne
      // parle pas de version.
      provider: 'v8',
      // `lcov` = exigence de l'issue (fichier coverage/lcov.info consommable par
      // un outil tiers) ; `text-summary` donne les 4 chiffres directement dans le
      // log CI, sans avoir à télécharger l'artefact pour lire un total.
      reporter: ['text-summary', 'lcov'],
      // Explicite : c'est ce chemin que le job CI `frontend` publie en artefact
      // (`path: frontend/coverage/`). Déjà couvert par frontend/.gitignore et
      // frontend/.prettierignore — le gate `format:check` (#528) ne mord pas dessus.
      reportsDirectory: './coverage',
    },
  },
})
