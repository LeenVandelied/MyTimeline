'use client'

import { useEffect, useReducer, useRef } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { AlertTriangle, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useExportFlow } from '@/hooks/useExportFlow'
import { EXPORT_FORMATS, isSyncFormat, type ExportFormat } from '@/lib/schemas/export'

/**
 * #59 — Flux d'export RGPD en 3 étapes (choix format → préparation → téléchargement),
 * consommant le contrat backend figé #58 via `useExportFlow`.
 *
 * A11y : le focus est déplacé sur le titre de l'étape active à chaque transition
 * (gestion du focus wizard, cf. context-pack frontend). Les états de progression
 * et d'erreur sont annoncés aux lecteurs d'écran (`role="status"` / `role="alert"`).
 */

/** Formats proposés à l'étape 1 (ordre : sync d'abord, puis async). */
const FORMAT_OPTIONS: readonly ExportFormat[] = EXPORT_FORMATS

/**
 * Formate une date d'expiration ISO-8601 SANS offset (référentiel serveur, #58) :
 * interprétée comme UTC (suffixe `Z`) puis rendue dans la locale de l'UI.
 */
function formatExpiry(iso: string, locale: string): string {
  const date = new Date(`${iso}Z`)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

/** Le lien de téléchargement async est-il expiré (fenêtre 24h dépassée) ? */
function isExpired(iso: string | null): boolean {
  if (!iso) return false
  const date = new Date(`${iso}Z`)
  return !Number.isNaN(date.getTime()) && date.getTime() <= Date.now()
}

export function ExportDataFlow() {
  const t = useTranslations('export')
  const locale = useLocale()
  const flow = useExportFlow()
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Focus management : à chaque changement d'étape, on porte le focus sur le
  // titre de l'étape active pour les utilisateurs clavier / lecteurs d'écran.
  useEffect(() => {
    headingRef.current?.focus()
  }, [flow.phase])

  // Re-check périodique de l'expiration : quand un lien async est affiché
  // (phase 'ready' avec `expiresAt`), l'onglet Réglages peut rester ouvert
  // au-delà du TTL 24h sans interaction. Un tick léger (60 s) force le
  // recalcul de `expired` pour basculer l'UI en état « expiré ».
  const [, tick] = useReducer((n: number) => n + 1, 0)
  const asyncExpiresAt = flow.phase === 'ready' ? (flow.completedJob?.expiresAt ?? null) : null
  useEffect(() => {
    if (!asyncExpiresAt) return
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [asyncExpiresAt])

  const expired = flow.phase === 'ready' && isExpired(flow.completedJob?.expiresAt ?? null)

  return (
    <div
      className="border-rule max-w-md space-y-4 rounded-md border p-4"
      data-testid="export-flow"
    >
      <div>
        <h3
          ref={headingRef}
          tabIndex={-1}
          className="text-sm font-medium outline-none"
          data-testid="export-heading"
        >
          {t(`steps.${flow.phase}.title`)}
        </h3>
        <p className="text-ink-muted text-sm">{t('description')}</p>
      </div>

      {/* Étape 1 — choix du format + explication */}
      {flow.phase === 'confirm' && (
        <div className="space-y-3" data-testid="export-step-confirm">
          <Select
            value={flow.format}
            onValueChange={(value) => flow.setFormat(value as ExportFormat)}
          >
            <SelectTrigger data-testid="export-format" aria-label={t('formatLabel')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORMAT_OPTIONS.map((format) => (
                <SelectItem key={format} value={format}>
                  {t(`formats.${format}.label`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <p className="text-ink-muted text-sm" data-testid="export-format-hint">
            {t(`formats.${flow.format}.hint`)}
          </p>

          <Button
            type="button"
            onClick={flow.start}
            disabled={flow.isBusy}
            data-testid="export-start"
          >
            {flow.isBusy ? (
              <Spinner label={t('preparing.busy')} />
            ) : (
              <>
                <Download className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                {isSyncFormat(flow.format) ? t('actions.download') : t('actions.prepare')}
              </>
            )}
          </Button>
        </div>
      )}

      {/* Étape 2 — préparation (formats async : polling) */}
      {flow.phase === 'preparing' && (
        <div
          className="flex items-center gap-3"
          data-testid="export-step-preparing"
          role="status"
          aria-live="polite"
        >
          {/* Spinner purement visuel : la live-region est portée par ce div
              (texte de progression complet) → évite la double annonce SR. */}
          <Spinner label={t('preparing.busy')} aria-hidden="true" />
          <p className="text-sm">
            {t('preparing.status', {
              status: t(`status.${flow.jobStatus ?? 'PENDING'}`),
            })}
          </p>
        </div>
      )}

      {/* Étape 3 — téléchargement / succès */}
      {flow.phase === 'ready' && (
        <div className="space-y-3" data-testid="export-step-ready">
          {flow.completedJob ? (
            expired ? (
              // Lien async expiré (24h) : proposer une nouvelle demande.
              <div className="space-y-2" data-testid="export-expired">
                <p className="text-danger text-sm">{t('ready.expired')}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={flow.reset}
                  data-testid="export-relaunch"
                >
                  {t('actions.relaunch')}
                </Button>
              </div>
            ) : (
              // Job async terminé : lien de téléchargement + date d'expiration.
              <div className="space-y-2" data-testid="export-ready-async">
                <p className="text-success text-sm">{t('ready.asyncReady')}</p>
                <Button
                  type="button"
                  onClick={flow.downloadCompleted}
                  disabled={flow.isBusy}
                  data-testid="export-download"
                >
                  {flow.isBusy ? (
                    <Spinner label={t('preparing.busy')} />
                  ) : (
                    <>
                      <Download className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                      {t('actions.download')}
                    </>
                  )}
                </Button>
                {flow.completedJob.expiresAt && (
                  <p className="text-ink-muted text-xs" data-testid="export-expiry">
                    {t('ready.expiresAt', {
                      date: formatExpiry(flow.completedJob.expiresAt, locale),
                    })}
                  </p>
                )}
              </div>
            )
          ) : (
            // Format sync : le fichier a déjà été téléchargé par le navigateur.
            <p className="text-success text-sm" data-testid="export-ready-sync">
              {t('ready.syncDone')}
            </p>
          )}

          <Button
            type="button"
            variant="ghost"
            onClick={flow.reset}
            data-testid="export-again"
          >
            {t('actions.again')}
          </Button>
        </div>
      )}

      {/* État d'erreur (réseau / job FAILED) */}
      {flow.phase === 'error' && (
        <div className="space-y-2" data-testid="export-step-error" role="alert">
          <p className="text-danger flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            {t(`errors.${flow.errorKey ?? 'network'}`)}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={flow.reset}
            data-testid="export-retry"
          >
            {t('actions.retry')}
          </Button>
        </div>
      )}
    </div>
  )
}
