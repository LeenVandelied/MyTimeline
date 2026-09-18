/**
 * lint-staged — vérifs sur les fichiers stagés au pre-commit.
 * Les chemins sont relatifs à `frontend/` (cwd du hook, cf. .husky/pre-commit).
 * ESLint sur le code source, Prettier sur tout le reste formatable.
 */
module.exports = {
  '*.{ts,tsx,js,jsx,mjs,cjs}': ['eslint --fix', 'prettier --write'],
  '*.{json,css,md,yml,yaml}': ['prettier --write'],
}
