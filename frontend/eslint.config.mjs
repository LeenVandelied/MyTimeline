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
    ignores: [
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
    // #160 — garde anti-fuite credentials (PIT §85 / PIT-S7-003, 4e récurrence).
    // `console.error('msg', error)` avec un objet erreur axios brut fuite
    // error.config.headers (Authorization/cookies) et error.config.data (body,
    // password en clair). Le 2e argument doit passer par safeErrorMessage(error)
    // (un CallExpression) ou être un objet littéral assaini — jamais un
    // identifiant brut. Limite connue : ne détecte que l'appel à 2 arguments
    // directs ; un identifiant intermédiaire réassigné avant l'appel
    // (`const e = error; console.error('msg', e)`) contournerait la règle.
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
      ],
    },
  },
  ...storybook.configs['flat/recommended'],
]

export default eslintConfig
