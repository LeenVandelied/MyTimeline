'use client'

import { useTranslations } from 'next-intl'
import { useNetworkStatus } from '@/contexts/NetworkStatusContext'

/**
 * #76 — Bannière système réseau (contrat DS « Banner Offline »).
 *
 * 4 états mutuellement exclusifs, par priorité décroissante :
 *   offline  > retrying > timeout > server-error.
 * ARIA (contrat DS) :
 *   - offline / retrying  → role=status  (aria-live polite) : information passive ;
 *   - timeout / server-error → role=alert (aria-live assertive) : action requise.
 * Bouton « Réessayer » UNIQUEMENT sur timeout / server-error (pas sur offline pur).
 *
 * Styles 100 % DS (`.mt-sysbanner*` — `src/styles/ds/components/i18n.css`) :
 * hauteur 32px, sticky au-dessus des sheets (z-index token `--z-netbanner`),
 * couleurs via tokens, support clair + sombre. Aucune valeur hardcodée ici.
 */
type BannerState = 'offline' | 'retrying' | 'timeout' | 'server-error'

export function OfflineBanner() {
  const t = useTranslations('network')
  const { isOnline, isTimeout, isServerError, isRetrying, retry } = useNetworkStatus()

  const state: BannerState | null = !isOnline
    ? 'offline'
    : isRetrying
      ? 'retrying'
      : isTimeout
        ? 'timeout'
        : isServerError
          ? 'server-error'
          : null

  if (state === null) return null

  const isAssertive = state === 'timeout' || state === 'server-error'
  const message = t(`${state}.message`)
  // Modificateur DS pour la pastille : danger (assertif), info (retrying), warning (offline, défaut).
  const modifier = isAssertive
    ? 'mt-sysbanner--danger'
    : state === 'retrying'
      ? 'mt-sysbanner--info'
      : ''

  return (
    <div
      className={`mt-sysbanner mt-sysbanner--sticky ${modifier}`.trim()}
      role={isAssertive ? 'alert' : 'status'}
      aria-live={isAssertive ? 'assertive' : 'polite'}
      data-testid="network-banner"
      data-state={state}
    >
      <span className="mt-sysbanner__dot" aria-hidden="true" />
      {/* title = message complet (le texte se tronque à 32px de haut, cf. DS). */}
      <span className="mt-sysbanner__msg" title={message}>
        {message}
      </span>
      {isAssertive && (
        <button
          type="button"
          className="mt-sysbanner__action"
          onClick={retry}
          data-testid="network-banner-retry"
        >
          {t('retry')}
        </button>
      )}
    </div>
  )
}

export default OfflineBanner
