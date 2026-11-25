// #812 — la règle vit dans `@/lib/isPastEvent` (partagée avec la frise). Ré-export : les
// importeurs historiques (détail produit, T1) gardent ce chemin.
export { isPastEvent, type PastEventInput } from '@/lib/isPastEvent'
