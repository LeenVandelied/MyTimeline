/**
 * Config commitlint — convention gitmoji du projet.
 *
 * Le projet commit en `:shortcode: #NN — texte` (ex : `:lipstick: #45 — tokens`).
 * On N'utilise PAS le preset `commitlint-config-gitmoji` tel quel : il impose en
 * plus les règles Angular conventionnelles (`type-enum`, `type-empty`,
 * `subject-full-stop`, `scope-case`) qui REJETTENT le style du projet
 * (pas de type `feat:`, em-dash `—`, pas de scope obligatoire).
 *
 * On garde donc UNIQUEMENT :
 *   - `start-with-gitmoji` (plugin `commitlint-plugin-gitmoji`) : le message DOIT
 *     commencer par un code/emoji gitmoji valide → un message non-gitmoji est rejeté.
 *   - `header-max-length` : garde-fou longueur titre.
 *
 * Le parser `@gitmoji/parser-opts` extrait correctement le gitmoji en tête.
 */
const parserPreset = require('@gitmoji/parser-opts')
const gitmojiPlugin = require('commitlint-plugin-gitmoji')

module.exports = {
  parserPreset: {
    parserOpts: parserPreset.default ?? parserPreset,
  },
  plugins: [gitmojiPlugin.default ?? gitmojiPlugin],
  rules: {
    // Règle clé : le message DOIT commencer par un gitmoji valide.
    'start-with-gitmoji': [2, 'always'],
    'header-max-length': [2, 'always', 100],
    // NB : pas de `subject-empty` — le parser `@gitmoji/parser-opts` ne découpe
    // pas le `subject` pour le format projet `:code: #NN — texte` (em-dash),
    // ce qui ferait un faux positif. La présence du gitmoji suffit comme garde-fou.
  },
}
