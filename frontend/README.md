# MyTimeline — Frontend

Voir le [README racine](../README.md) pour la présentation du projet, la procédure d'installation
complète et le démarrage de l'environnement de développement.

## Stack

Next.js 15 (Turbopack) · TypeScript 5 · Tailwind CSS v4

## Démarrer ce module seul

Prérequis : Node 20 (version de la CI et de `frontend/Dockerfile`) — le README racine, lui,
ne demande que Docker et couvre l'installation complète.

```bash
npm install
npm run dev
```

L'app router est sous [`app/`](./app), le middleware sous [`middleware.ts`](./middleware.ts).
