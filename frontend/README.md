# MyTimeline — Frontend

Voir le [README racine](../README.md) pour la présentation du projet, la procédure d'installation
complète et le démarrage de l'environnement de développement.

## Stack

Next.js 15 (Turbopack) · TypeScript 5 · Tailwind CSS v4

## Démarrer ce module seul

Prérequis : Node 20 (version de la CI et de `frontend/Dockerfile`) — le README racine, lui,
ne demande que Docker et couvre l'installation complète.

```bash
npm ci
npm run dev
```

L'app router est sous [`app/`](./app), le middleware sous [`middleware.ts`](./middleware.ts).

## Overrides npm (`package.json` > `overrides`) — ne pas supprimer

Les deux entrées de `overrides` sont **load-bearing** pour le job CI `security`, dont l'étape
bloquante est `npm audit --omit=dev` (dépendances de production, 0 vulnérabilité attendue).
La clé `_overridesRationale` du `package.json` résume la même chose au plus près de la déclaration.

| Override           | Pourquoi                                                                                                                                                                                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `postcss: ^8.5.23` | `next@15.x` épingle `postcss` à la version **exacte** `8.4.31`, vulnérable (GHSA-r28c-9q8g-f849 high, GHSA-6g55-p6wh-862q high). Sans l'override, npm installe un `node_modules/next/node_modules/postcss@8.4.31` imbriqué : l'audit production passe de **0 à 2 vulnérabilités** (vérifié au sprint 67 sur un arbre de test). |
| `sharp: ^0.35.0`   | Force une version non vulnérable de `sharp` (optimisation d'images Next) dans les chaînes transitives. Même gate CI.                                                                                                                                                                                                           |

Vérification de la nécessité de l'override `postcss` (sans toucher au dépôt) :

```bash
mkdir /tmp/check && cp package.json package-lock.json /tmp/check && cd /tmp/check
# retirer overrides.postcss du package.json copié, puis :
npm install --package-lock-only --ignore-scripts
npm audit --omit=dev          # attendu sans override : 2 vulnérabilités (dont postcss high)
```

### `overrides.postcss` doit rester une version **littérale**

La forme auto-référentielle `"postcss": "$postcss"` (en place jusqu'au sprint 67) fait échouer
**toute** invocation de `npm audit fix`, y compris `--dry-run` :

```
npm error Unable to resolve reference $postcss
```

`npm audit fix` construit un arbre de dépendances virtuel dans lequel la référence `$postcss` n'est
pas résolvable. Corrigé en écrivant la version littérale (issue #435) — résolution strictement
identique, `package-lock.json` inchangé. Garder l'override aligné sur `devDependencies.postcss`
lors d'un futur bump ; ne pas réintroduire la forme `$...`.
