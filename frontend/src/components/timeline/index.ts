/**
 * #47 — Barrel des sous-composants Timeline extraits du monolithe
 * `TimelineCalendar.tsx`. Débloque leur réutilisation (S17 : Timeline events
 * desktop réécrite sur ces briques).
 */
export { DateStamp } from './DateStamp'
export type { DateStampProps } from './DateStamp'
export { Ruler } from './Ruler'
export type { RulerProps } from './Ruler'
export { Lane } from './Lane'
export type { LaneProps } from './Lane'
export { EventBar } from './EventBar'
export type { EventBarProps } from './EventBar'
export { Cursor } from './Cursor'
export type { CursorProps } from './Cursor'
export * from './lib'

// #55 — Vue Timeline desktop (frise continue, zoom, minimap, drawer, raccourcis).
export { TimelineView } from './TimelineView'
export type { TimelineViewProps } from './TimelineView'
export { Minimap } from './Minimap'
export type { MinimapProps } from './Minimap'
export { EventDrawer } from './EventDrawer'
export type { EventDrawerProps } from './EventDrawer'
export { EventPill } from './EventPill'
export type { EventPillProps } from './EventPill'
export * from './zoom'

// #63 — Vue Timeline mobile portrait + switch responsive (base réutilisable #64).
export { TimelineResponsive } from './TimelineResponsive'
export type { TimelineResponsiveProps } from './TimelineResponsive'
export { TimelineEditHost } from './TimelineEditHost'
export type { TimelineEditHostProps } from './TimelineEditHost'
export { TimelineMobilePortrait } from './TimelineMobilePortrait'
export type { TimelineMobilePortraitProps } from './TimelineMobilePortrait'
export { TimelineBottomSheet } from './TimelineBottomSheet'
export type { TimelineBottomSheetProps } from './TimelineBottomSheet'
export { TimelineActionSheet } from './TimelineActionSheet'
export type { TimelineActionSheetProps } from './TimelineActionSheet'
export { useTimelineMobileState } from './useTimelineMobileState'
export type { TimelineMobileState } from './useTimelineMobileState'
export { useFocusTrap } from './useFocusTrap'

// #64 — Vue Timeline mobile paysage (drawer latéral + lanes denses + minimap masquable).
export { TimelineMobileLandscape } from './TimelineMobileLandscape'
export type { TimelineMobileLandscapeProps } from './TimelineMobileLandscape'
export { TimelineLandscapeDrawer } from './TimelineLandscapeDrawer'
export type { TimelineLandscapeDrawerProps } from './TimelineLandscapeDrawer'
export { useTimelineMobileSelection } from './useTimelineMobileSelection'
export type { TimelineMobileSelection } from './useTimelineMobileSelection'
export { useTimelineMobileGestures } from './useTimelineMobileGestures'
export type { TimelineMobileGestures } from './useTimelineMobileGestures'
