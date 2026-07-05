'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

/**
 * #86 — Indicateur de force du mot de passe (faible / moyen / fort) en temps réel.
 *
 * Score 0..4 heuristique local (aucune donnée envoyée) : longueur + variété de
 * classes de caractères. Purement visuel — la contrainte réelle (>= 6) est portée
 * par le schéma Zod. Accessible : `aria-live="polite"` annonce le niveau.
 */
export type StrengthLevel = 'weak' | 'medium' | 'strong'

export function scorePassword(password: string): number {
  if (!password) return 0
  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 10) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  return Math.min(score, 4)
}

export function levelFromScore(score: number): StrengthLevel {
  if (score <= 1) return 'weak'
  if (score <= 3) return 'medium'
  return 'strong'
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
    const score = scorePassword(password)
    return { level: levelFromScore(score), filled: LEVEL_STYLES[levelFromScore(score)].bars }
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
