'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { ArchiveRestore, ArrowLeft, Pencil, Trash2 } from 'lucide-react'

import { contrastInk } from '@/lib/color'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tabs } from '@/components/ui/tabs'
import { ProductDrawer } from './ProductDrawer'
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog'
import { TimelineEditHost } from '@/components/timeline'
import type { Resource } from '@/components/timeline'
import { useProductsWithEvents } from '@/hooks/useProductsWithEvents'
import { useSetEventArchived } from '@/hooks/useSetEventArchived'
import { useAuth } from '@/hooks/useAuth'
import { deleteProduct } from '@/services/productService'
import { mapToFullCalendarEvent, type Event, type FullCalendarEvent } from '@/types/event'

/**
 * #68 — Vue détail d'un produit.
 *
 * Sous-frise dédiée : on RÉUTILISE `TimelineResponsive`/`TimelineView` sans le
 * modifier (composant central du dashboard, risque de régression). Le filtrage
 * sur CE produit se fait EN AMONT (carte de réutilisation, approche imposée) : on
 * ne construit `events`/`resources` qu'à partir du produit sélectionné, jamais de
 * toute la liste. Aucun refetch dédié : on lit le cache `useProductsWithEvents`.
 *
 * #50 : les produits archivés sont invisibles côté backend → un produit absent de
 * la liste (archivé ou inexistant) affiche l'état « introuvable ».
 *
 * Actions : « Modifier » → `ProductDrawer` (edit) ; « Supprimer » →
 * `DeleteConfirmDialog` variant="product" (soft delete #50) puis retour liste.
 *
 * #307 (OPTION A) — un événement archivé (BR-EVE-013) restait INTROUVABLE : la vue
 * filtrait `!archived` en dur, donc plus aucune surface ne permettait de le rouvrir
 * ni de le désarchiver. On remplace ce filtre en dur par un ÉTAT DE VUE
 * (`actifs` / `archivés` / `tous`) qui pilote À LA FOIS la sous-frise et l'historique :
 *   - « archivés » / « tous » remontent l'event dans la frise → la surface d'édition
 *     déjà montée (`TimelineEditHost`) le rouvre PRÉ-REMPLI, sans toucher au composant
 *     frise ni au formulaire ;
 *   - l'historique porte l'action « Désarchiver » (PATCH `archived:false`, BR-EVE-013).
 * Le filtre est un état de vue (pas un `!archived` figé) pour que #230 puisse brancher
 * l'affichage grisé dans la frise sans réécrire cette logique.
 *
 * ⚠ BR-EVE-011 — le compteur d'événements ACTIFS reste calculé sur `!archived` QUEL QUE
 * SOIT le filtre : un archivé ne compte jamais comme actif (quota de tier).
 */

export interface ProductDetailViewProps {
  productId: string
}

/** #307 — état de vue des événements (ne modifie AUCUNE donnée serveur). */
export type EventViewFilter = 'active' | 'archived' | 'all'

const EVENT_VIEW_FILTERS: readonly EventViewFilter[] = ['active', 'archived', 'all']

function isEventViewFilter(value: string): value is EventViewFilter {
  return (EVENT_VIEW_FILTERS as readonly string[]).includes(value)
}

function matchesEventFilter(archived: boolean, filter: EventViewFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'archived') return archived
  return !archived
}

/**
 * Lit `error.response.status` (axios ou générique) sans `any`. Copie locale assumée :
 * même helper que `ProductDrawer`/`CategoryDrawer`/`DeleteConfirmDialog` (mutualisation
 * = refactor transverse hors périmètre #307, signalé en follow-up).
 */
function httpStatusOf(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { status?: unknown } }).response
    if (response && typeof response.status === 'number') return response.status
  }
  return undefined
}

export function ProductDetailView({ productId }: ProductDetailViewProps) {
  const t = useTranslations('products.detail')
  const locale = useLocale()
  const router = useRouter()
  const { user } = useAuth()
  const userId = user?.id

  const query = useProductsWithEvents(userId)
  const product = React.useMemo(
    () => (query.data ?? []).find((p) => p.id === productId) ?? null,
    [query.data, productId],
  )

  const [editOpen, setEditOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  // #307 — état de vue par défaut « actifs » : le comportement historique (archivés
  // masqués) reste celui de l'arrivée sur la page, la découverte se fait par l'onglet.
  const [filter, setFilter] = React.useState<EventViewFilter>('active')
  const [unarchivingId, setUnarchivingId] = React.useState<string | null>(null)
  const [unarchiveError, setUnarchiveError] = React.useState<{
    id: string
    kind: 'conflict' | 'generic'
  } | null>(null)

  const setEventArchived = useSetEventArchived()

  // Filtrage AMONT : events/resources restreints à CE produit uniquement, puis à
  // l'état de vue courant (#307).
  const events = React.useMemo<FullCalendarEvent[]>(() => {
    if (!product) return []
    return (product.events ?? [])
      .filter((event) => matchesEventFilter(event.archived, filter))
      .map((event) =>
        mapToFullCalendarEvent(event, product.name, product.category?.name ?? '', product.id),
      )
  }, [product, filter])

  // BR-EVE-011 — `active` est la SEULE source du compteur d'événements actifs :
  // indépendante du filtre de vue, un archivé n'y entre jamais.
  const counts = React.useMemo(() => {
    const list = product?.events ?? []
    const active = list.filter((event) => !event.archived).length
    return { active, archived: list.length - active }
  }, [product])

  const filterItems = React.useMemo(
    () => [
      {
        value: 'active',
        label: (
          <span data-testid="product-detail-filter-active">
            {t('filter.active')} · {counts.active}
          </span>
        ),
      },
      {
        value: 'archived',
        label: (
          <span data-testid="product-detail-filter-archived">
            {t('filter.archived')} · {counts.archived}
          </span>
        ),
      },
      {
        value: 'all',
        label: (
          <span data-testid="product-detail-filter-all">
            {t('filter.all')} · {counts.active + counts.archived}
          </span>
        ),
      },
    ],
    [t, counts],
  )

  // Garde de type plutôt qu'un cast : `Tabs.onValueChange` expose un `string` brut.
  const handleFilterChange = React.useCallback((value: string) => {
    if (isEventViewFilter(value)) setFilter(value)
  }, [])

  /**
   * #307 — Désarchivage (BR-EVE-013, PATCH-only). La `version` détenue au chargement est
   * threadée (BR-EVE-015) : un cache périmé produit un 409 DÉTERMINISTE plutôt qu'un
   * écrasement silencieux. Traitement du 409 : message dédié + rafraîchissement des
   * données (fait par le hook) pour que le re-clic reparte d'une version fraîche. La modale
   * comparative d'`EventEditForm` n'est PAS réutilisée ici : elle diffe champ par champ des
   * saisies utilisateur, alors que ce flux n'écrit qu'un booléen (aucun diff à arbitrer).
   */
  const handleUnarchive = async (event: Event) => {
    setUnarchiveError(null)
    setUnarchivingId(event.id)
    try {
      await setEventArchived.mutateAsync({
        id: event.id,
        archived: false,
        version: event.version ?? null,
      })
    } catch (error) {
      setUnarchiveError({
        id: event.id,
        kind: httpStatusOf(error) === 409 ? 'conflict' : 'generic',
      })
    } finally {
      setUnarchivingId(null)
    }
  }

  const resources = React.useMemo<Resource[]>(() => {
    if (!product) return []
    return [{ id: product.id, title: product.name, category: product.category?.name ?? '' }]
  }, [product])

  const dateFmt = React.useMemo(
    () => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }),
    [locale],
  )

  const goBack = React.useCallback(() => {
    router.push(`/${locale}/products`)
  }, [router, locale])

  const handleDeleteConfirm = async () => {
    if (!userId || !product) throw new Error('userId/produit manquant')
    await deleteProduct(userId, product.id)
    setDeleteOpen(false)
    goBack()
  }

  const backButton = (
    <Button
      type="button"
      variant="ghost"
      className="flex items-center gap-2"
      onClick={goBack}
      data-testid="product-detail-back"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      {t('back')}
    </Button>
  )

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-4" data-testid="product-detail-view">
        {backButton}
        <p className="text-ink-muted text-sm" role="status" data-testid="product-detail-loading">
          {t('loading')}
        </p>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex flex-col gap-4" data-testid="product-detail-view">
        {backButton}
        <p className="text-ink-muted text-sm" role="alert" data-testid="product-detail-not-found">
          {t('notFound')}
        </p>
      </div>
    )
  }

  const effectiveColor = product.color ?? product.category?.color ?? null
  // BR-EVE-011 : compteur d'events ACTIFS, jamais dérivé du filtre de vue.
  const nonArchivedCount = counts.active

  const history = (product.events ?? [])
    .filter((e) => matchesEventFilter(e.archived, filter))
    .slice()
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())

  // Vue « archivés » vide : message dédié (« aucun archivé ») plutôt que le message
  // générique « aucun événement », qui laisserait croire que le produit est vide.
  // Clés LITTÉRALES (pas de `t(variable)`) — l'extraction i18n reste statiquement lisible.
  const timelineEmptyMessage = filter === 'archived' ? t('archivedEmpty') : t('timelineEmpty')
  const historyEmptyMessage = filter === 'archived' ? t('archivedEmpty') : t('historyEmpty')

  return (
    <div className="flex flex-col gap-6" data-testid="product-detail-view">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {backButton}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => setEditOpen(true)}
            data-testid="product-detail-edit"
          >
            <Pencil className="size-4" aria-hidden="true" />
            {t('edit')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="text-destructive flex items-center gap-2"
            onClick={() => setDeleteOpen(true)}
            data-testid="product-detail-delete"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            {t('delete')}
          </Button>
        </div>
      </div>

      {/* Fiche produit. */}
      <section
        className="bg-surface border-rule flex flex-col gap-4 rounded-lg border p-4"
        aria-label={product.name}
        data-testid="product-detail-card"
      >
        <div className="flex items-center gap-3">
          <span
            className="size-4 shrink-0 rounded-full"
            style={{ background: effectiveColor ?? 'var(--color-rule-strong)' }}
            aria-hidden="true"
          />
          <h1 className="text-ink text-xl font-semibold tracking-tight">{product.name}</h1>
        </div>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-ink-faint text-2xs tracking-widest uppercase">
              {t('fields.category')}
            </dt>
            <dd className="mt-1">
              {product.category ? (
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: effectiveColor ?? 'var(--color-rule-strong)',
                    color: contrastInk(effectiveColor),
                  }}
                  data-testid="product-detail-category"
                >
                  {product.category.name}
                </span>
              ) : (
                <span className="text-ink-faint text-sm">{t('fields.noCategory')}</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-ink-faint text-2xs tracking-widest uppercase">
              {t('fields.color')}
            </dt>
            <dd className="text-ink mt-1 font-mono text-sm">{effectiveColor ?? '—'}</dd>
          </div>
        </dl>
      </section>

      {/* #307 — état de vue partagé par la sous-frise ET l'historique. */}
      <Tabs
        items={filterItems}
        value={filter}
        onValueChange={handleFilterChange}
        aria-label={t('filter.label')}
        data-testid="product-detail-filter"
      />

      {/* Sous-frise dédiée (filtrée en amont). */}
      <section
        className="bg-surface border-rule rounded-lg border p-3"
        aria-label={t('timelineTitle')}
        data-testid="product-detail-timeline"
      >
        <h2 className="text-ink-faint text-2xs mb-2 tracking-widest uppercase">
          {t('timelineTitle')}
        </h2>
        {events.length === 0 ? (
          <p className="text-ink-muted text-sm" data-testid="product-detail-timeline-empty">
            {timelineEmptyMessage}
          </p>
        ) : (
          <TimelineEditHost events={events} resources={resources} locale={locale} />
        )}
      </section>

      {/* Historique des événements. */}
      <section aria-label={t('historyTitle')} data-testid="product-detail-history">
        <h2 className="text-ink-faint text-2xs mb-2 tracking-widest uppercase">
          {t('historyTitle')} · {t('eventsCount', { count: nonArchivedCount })}
        </h2>
        {history.length === 0 ? (
          <p className="text-ink-muted text-sm" data-testid="product-detail-history-empty">
            {historyEmptyMessage}
          </p>
        ) : (
          <ul className="flex flex-col">
            {history.map((event) => (
              <li
                key={event.id}
                className="border-rule flex flex-col gap-1 border-b py-2 last:border-b-0"
                data-testid={`product-detail-history-row-${event.id}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    // `.mt-evt--archived` (DS, déjà défini) porte le repli visuel d'un
                    // archivé. Appliqué à la PASTILLE décorative seulement : le poser sur
                    // le titre le rendrait à 45 % d'opacité (contraste sous AA). Le sens
                    // est porté par le badge textuel, à pleine encre.
                    className={cn(
                      'size-2 shrink-0 rounded-full',
                      event.archived && 'mt-evt--archived',
                    )}
                    style={{
                      background: event.color ?? effectiveColor ?? 'var(--color-rule-strong)',
                    }}
                    aria-hidden="true"
                  />
                  <span className="text-ink min-w-0 flex-1 truncate text-sm">{event.title}</span>
                  {event.archived && (
                    <span className="text-ink-faint text-2xs border-rule shrink-0 rounded-full border px-2 py-0.5 tracking-widest uppercase">
                      {t('archivedBadge')}
                    </span>
                  )}
                  <span className="text-ink-muted font-mono text-xs tabular-nums">
                    {dateFmt.format(new Date(event.startDate))}
                  </span>
                  {event.archived && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex shrink-0 items-center gap-2"
                      onClick={() => void handleUnarchive(event)}
                      disabled={unarchivingId === event.id}
                      data-testid={`product-detail-unarchive-${event.id}`}
                    >
                      <ArchiveRestore className="size-4" aria-hidden="true" />
                      {unarchivingId === event.id ? t('unarchiving') : t('unarchive')}
                    </Button>
                  )}
                </div>
                {unarchiveError?.id === event.id && (
                  // #442 — point d'accroche E2E. `role="alert"` reste le contrat a11y
                  // (et celui de `ProductDetailView.test.tsx`) ; le testid s'y ajoute
                  // pour que la spec du conflit 409 ne dépende pas d'un texte traduit
                  // (4 locales). `data-kind` expose la VARIANTE (conflit vs générique),
                  // sans quoi une spec devrait comparer le message rendu.
                  <p
                    className="text-destructive text-xs"
                    role="alert"
                    data-testid={`product-detail-unarchive-error-${event.id}`}
                    data-kind={unarchiveError.kind}
                  >
                    {unarchiveError.kind === 'conflict'
                      ? t('unarchiveConflict')
                      : t('unarchiveError')}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Édition — ProductDrawer réutilisé (#61). */}
      <ProductDrawer open={editOpen} onOpenChange={setEditOpen} mode="edit" product={product} />

      {/* Suppression — soft delete backend (#50), retour liste au succès. */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        variant="product"
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}

export default ProductDetailView
