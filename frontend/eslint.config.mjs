// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook'

// #885 — eslint-config-next 16 publie une config FLAT native : plus besoin de
// `FlatCompat` (@eslint/eslintrc) pour traduire `next/core-web-vitals` et
// `next/typescript`.
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    // Artefacts générés / outillage — non lintés (#29).
    // next-env.d.ts (FU8, sprint 57) : régénéré par Next à chaque `next dev`/`next
    // build` (writeAppTypeDeclarations), jamais édité à la main — le laisser au lint
    // ne prouve rien (Next 15 y écrivait un triple-slash `path` qui violait
    // `@typescript-eslint/triple-slash-reference`). Depuis #885 (Next 16), le lint de la
    // CI est `eslint .`, qui le scannerait : l'exclusion est donc NÉCESSAIRE. Exclusion
    // CIBLÉE : les règles restent actives pour tout code écrit à la main.
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
  // #891 (S120) — les 5 règles d'eslint-plugin-react-hooks 7 coupées à la montée Next 16
  // (#885 : refs, set-state-in-effect, preserve-manual-memoization, purity,
  // incompatible-library) sont RÉACTIVÉES : le preset `core-web-vitals` s'applique tel quel.
  // Désactivations locales justifiées : AuthContext (état posé après await), toaster
  // (remise à zéro couplée à la restauration du focus), harnais perf story (chronométrage).
  ...storybook.configs['flat/recommended'],
]

export default eslintConfig
