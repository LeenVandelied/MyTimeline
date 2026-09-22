/**
 * #738 (Sprint 99, DEC-S99-001) — cibles tactiles 44 px des boutons des Réglages
 * en mobile (< 768 px). Depuis #754 (Sprint 101), la source unique est
 * `@/lib/touchTarget` (étendue aux drawers, dialogues et rangées denses) : ces deux
 * noms en sont des alias, conservés pour ne pas toucher les 7 importeurs des réglages.
 * Raisonnement complet (pourquoi pas dans `ui/button.tsx`, pourquoi `max-md:`) :
 * voir `src/lib/touchTarget.ts`.
 */
export {
  TOUCH_TARGET_BUTTON as SETTINGS_TOUCH_BUTTON,
  TOUCH_TARGET_ICON_BUTTON as SETTINGS_TOUCH_ICON_BUTTON,
} from '@/lib/touchTarget'
