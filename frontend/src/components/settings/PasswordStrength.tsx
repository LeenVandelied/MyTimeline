'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { PASSWORD_POLICY } from '@/lib/schemas/auth'

/**
 * #86 — Indicateur de force du mot de passe (faible / moyen / fort) en temps réel.
 *
 * Score 0..4 heuristique local (aucune donnée envoyée) : longueur + variété de
 * classes de caractères. Purement visuel — la contrainte réelle est la politique
 * UNIQUE `PASSWORD_POLICY` (#148, BR-AUT-003) : 8..100 caractères, au moins une
 * majuscule et un chiffre. Le backend (`@StrongPassword`) en est la source de
 * vérité ; on la RÉPLIQUE ici en important `PASSWORD_POLICY` plutôt qu'en
 * recodant des seuils (#508 : le seuil était resté à 6 après le durcissement).
 *
 * Invariant : un mot de passe que le serveur REFUSERAIT est toujours affiché
 * `weak` — l'indicateur ne peut plus contredire la règle réellement appliquée.
 * Accessible : `aria-live="polite"` annonce le niveau.
 */
export type StrengthLevel = 'weak' | 'medium' | 'strong'

/** Le mot de passe satisferait-il la validation serveur (`@StrongPassword`) ? */
export function meetsPolicy(password: string): boolean {
  return (
    password.length >= PASSWORD_POLICY.minLength &&
    password.length <= PASSWORD_POLICY.maxLength &&
    PASSWORD_POLICY.uppercase.test(password) &&
    PASSWORD_POLICY.digit.test(password)
  )
}

export function scorePassword(password: string): number {
  if (!password) return 0
  let score = 0
  if (password.length >= PASSWORD_POLICY.minLength) score++
  if (password.length >= 10) score++
  if (PASSWORD_POLICY.uppercase.test(password) && /[a-z]/.test(password)) score++
  if (PASSWORD_POLICY.digit.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  return Math.min(score, 4)
}

export function levelFromScore(score: number): StrengthLevel {
  if (score <= 1) return 'weak'
  if (score <= 3) return 'medium'
  return 'strong'
}

/**
 * Niveau affiché. Le score seul ne suffit pas : `Abc123!` (7 caractères) scorait
 * 4 → `strong` alors que le serveur le REFUSE. On passe donc d'abord la porte
 * `meetsPolicy`. Corollaire : tout mot de passe conforme score ≥ 2 (longueur +
 * chiffre), donc `medium` au minimum — aucun faux `weak` sur un mot de passe
 * accepté. `weak` ⇔ refusé par le serveur.
 */
export function levelFromPassword(password: string): StrengthLevel {
  if (!meetsPolicy(password)) return 'weak'
  return levelFromScore(scorePassword(password))
}

const LEVEL_STYLES: Record<StrengthLevel, { bars: number; barClass: string; textClass: string }> = {
  weak: { bars: 1, barClass: 'bg-danger', textClass: 'text-danger' },
  medium: { bars: 2, barClass: 'bg-warning', textClass: 'text-warning' },
  strong: { bars: 4, barClass: 'bg-success', textClass: 'text-success' },
}

interface PasswordStrengthProps {
  password: string
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const t = useTranslations('settings')
  const { level, filled } = useMemo(() => {
    const computed = levelFromPassword(password)
    return { level: computed, filled: LEVEL_STYLES[computed].bars }
  }, [password])

  if (!password) return null

  const style = LEVEL_STYLES[level]

  return (
    <div className="mt-2 space-y-1" data-testid="password-strength">
      <div className="flex gap-1" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              i < filled ? style.barClass : 'bg-rule',
            )}
          />
        ))}
      </div>
      <p className={cn('text-xs font-medium', style.textClass)} aria-live="polite">
        {t(`security.strength.${level}`)}
      </p>
    </div>
  )
}
