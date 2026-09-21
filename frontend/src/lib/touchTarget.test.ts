import { describe, expect, it } from 'vitest'
import { TOUCH_TARGET_BUTTON, TOUCH_TARGET_HITBOX, TOUCH_TARGET_ICON_BUTTON } from './touchTarget'
import {
  SETTINGS_TOUCH_BUTTON,
  SETTINGS_TOUCH_ICON_BUTTON,
} from '@/components/settings/touchTarget'

/**
 * #754 — source unique des cibles tactiles mobiles. Les tailles RENDUES sont
 * mesurées en E2E (`sprint-99-touch-targets`, `sprint-101-touch-targets`) ; ici on
 * fige les deux invariants qu'aucune mesure ne signalerait clairement :
 *   - les alias des réglages (#738) restent strictement égaux à la source ;
 *   - tout ce qui dimensionne est préfixé `max-md:` (rendu desktop inchangé).
 */
describe('lib/touchTarget', () => {
  it('les alias des réglages sont la source unique', () => {
    expect(SETTINGS_TOUCH_BUTTON).toBe(TOUCH_TARGET_BUTTON)
    expect(SETTINGS_TOUCH_ICON_BUTTON).toBe(TOUCH_TARGET_ICON_BUTTON)
  })

  it('aucune classe ne dimensionne hors mobile', () => {
    for (const value of [TOUCH_TARGET_BUTTON, TOUCH_TARGET_ICON_BUTTON, TOUCH_TARGET_HITBOX]) {
      // `relative` (ancre du pseudo) est la seule classe non préfixée admise.
      const unprefixed = value
        .split(' ')
        .filter((c) => !c.startsWith('max-md:') && c !== 'relative')
      expect(unprefixed).toEqual([])
    }
  })

  it('la pseudo-hitbox est un ::before 44×44 centré, peint (content vide)', () => {
    const classes = TOUCH_TARGET_HITBOX.split(' ')
    for (const c of [
      'max-md:before:absolute',
      'max-md:before:h-11',
      'max-md:before:w-11',
      'max-md:before:top-1/2',
      'max-md:before:left-1/2',
      'max-md:before:-translate-x-1/2',
      'max-md:before:-translate-y-1/2',
    ]) {
      expect(classes).toContain(c)
    }
    expect(classes.some((c) => c.startsWith('max-md:before:content-'))).toBe(true)
  })
})
