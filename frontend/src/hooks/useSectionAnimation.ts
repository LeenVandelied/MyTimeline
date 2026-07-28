'use client'

import { useEffect } from 'react'

/**
 * Révèle les sections `.section-animation` quand elles entrent dans le viewport (#56).
 *
 * Extrait du monolithe `HomePage` : la décomposition en sections autonomes plafonne
 * `HomePage` à de l'orchestration, or l'`useEffect` d'origine pesait 26 des 50 lignes
 * autorisées. Le sortir en hook rend le budget tenable ET rend l'effet testable seul.
 *
 * L'observation se fait par `document.querySelectorAll` APRÈS montage : peu importe
 * quel composant rend quelle section, l'effet les voit toutes. C'est ce qui permet
 * d'extraire les sections sans câbler de ref depuis chaque enfant.
 *
 * ⚠ `.section-animation` pose `opacity: 0` : sans la classe `visible`, la landing est
 * INVISIBLE. On ajoute donc un repli explicite quand `IntersectionObserver` est absent
 * (jsdom, navigateurs anciens) — sinon l'absence d'API dégrade en page blanche au lieu
 * de dégrader en page non animée. Le repli révèle tout immédiatement.
 *
 * `unobserve` après révélation : la classe n'est jamais retirée, ré-observer ne sert à
 * rien. Aucun changement visuel, on cesse juste de recalculer des intersections.
 */
export function useSectionAnimation(): void {
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll('.section-animation'))
    if (sections.length === 0) return

    if (typeof IntersectionObserver === 'undefined') {
      sections.forEach((section) => section.classList.add('visible'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -100px 0px' },
    )

    sections.forEach((section) => observer.observe(section))

    return () => observer.disconnect()
  }, [])
}
