import type { Config } from "tailwindcss";

/**
 * Tailwind 4 — config CSS-first.
 * Le thème (couleurs, typo, spacing…) est défini via `@theme` dans
 * src/styles/globals.css (source de vérité unique : design system « Graphite »).
 * Ce fichier ne sert qu'à cadrer la détection de contenu et les plugins.
 */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  plugins: [],
};

export default config;
