// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook'

import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    // Artefacts générés / outillage — non lintés (#29).
    // next-env.d.ts (FU8, sprint 57) : régénéré par Next à chaque `next dev`/`next
    // build` (writeAppTypeDeclarations), jamais édité à la main — le laisser au lint
    // ne prouve rien et le triple-slash `path` vers `.next/types/routes.d.ts` viole
    // systématiquement `@typescript-eslint/triple-slash-reference` (défaut
    // `path: 'never'`). `next lint` (donc la CI) ne le scanne déjà pas — il ne fait
    // partie d'aucun des dossiers par défaut (`app`/`pages`/`components`/`lib`/`src`) —
    // mais un lint plus large qu'un dev pourrait lancer localement (`eslint .`, un hook
    // pre-commit, un plugin éditeur) le remonte en faux rouge. Exclusion CIBLÉE : la
    // règle reste active pour tout code écrit à la main.
    ignores: [
      'next-env.d.ts',
      '.next/**',
      'storybook-static/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      '.husky/**',
    ],
  },
  {
    // Fichiers de config CommonJS (commitlint, lint-staged) : `require()` légitime.
    files: ['**/*.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    // #160 / #258 — garde anti-fuite credentials (PIT §85 / PIT-S7-003, 4e récurrence).
    // Logger un objet erreur axios brut fuite error.config.headers
    // (Authorization/cookies) et error.config.data (body, password en clair).
    // Un argument erreur doit passer par safeErrorMessage(error) (un
    // CallExpression) ou être un objet littéral assaini — jamais un identifiant
    // brut. DEUX selectors couvrent les deux formes réelles :
    //   1. `console.error('msg', error)` — 2 args, le 2e brut ;
    //   2. `console.error(error)` — mono-arg brut (le dev a oublié le message ;
    //      #258 : vecteur le plus fréquent, non couvert avant).
    //
    // Limite connue (assumée, PAS d'exhaustivité) — restent NON détectés :
    //   - interpolation en template literal (`console.error(`x ${error}`)`) ;
    //   - console.log / console.warn (seul console.error est ciblé) ;
    //   - wrap dans un objet (`console.error({ error })`) ;
    //   - identifiant intermédiaire réassigné (`const e = error; console.error(e)`).
    // Les deux error-boundaries React (app/error.tsx, app/[locale]/error.tsx)
    // logguent LÉGITIMEMENT `console.error(error)` mono-arg (erreur de rendu
    // React, pas un objet axios) : elles portent un eslint-disable inline localisé
    // et justifié — cf. leurs commentaires. Aucun autre `console.error(error)`
    // brut ne doit être toléré.
    files: ['**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'CallExpression[callee.object.name="console"][callee.property.name="error"][arguments.length=2][arguments.1.type="Identifier"]',
          message:
            "Ne pas logger l'objet erreur brut (fuite credentials/PII : headers Authorization, cookies, password en clair). Utiliser console.error('msg', safeErrorMessage(error)) — cf. src/lib/safe-error.ts.",
        },
        {
          selector:
            'CallExpression[callee.object.name="console"][callee.property.name="error"][arguments.length=1][arguments.0.type="Identifier"]',
          message:
            "Ne pas logger l'objet erreur brut en mono-argument (fuite credentials/PII). Utiliser console.error('msg', safeErrorMessage(error)) — cf. src/lib/safe-error.ts. (Exception tolérée : error-boundary React avec eslint-disable justifié.)",
        },
      ],
    },
  },
  ...storybook.configs['flat/recommended'],
]

export default eslintConfig
