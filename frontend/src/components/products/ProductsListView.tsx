'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import toast from 'react-hot-toast'
import { Pencil, Archive, PlusCircle, Search } from 'lucide-react'

import { cn } from '@/lib/utils'
import { nextEvent, type NextEvent } from '@/lib/next-occurrence'
import { Button } from '@/components/ui/button'
import { TOUCH_TARGET_BUTTON, TOUCH_TARGET_HITBOX } from '@/lib/touchTarget'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ProductDrawer } from './ProductDrawer'
import { ProductSparkline } from './ProductSparkline'
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { useProductsWithEvents } from '@/hooks/useProductsWithEvents'
import { useAuth } from '@/hooks/useAuth'
import { useArchiveProduct } from '@/hooks/useArchiveProduct'
import type { Product } from '@/types/product'

/**
 * #609 — En-tête de colonne au motif DS `.mt-table th` (`ds/components/core.css`, bloc
 * « Table ») : mono 9 px, capitales, interlettrage .1em, `ink-muted`, graisse medium,
 * filet bas `rule-strong` 1,5 px. On NE pose PAS `.mt-table` sur la table : elle
 * changerait aussi les `td` (padding 8/11, zébrage, corps 13 px), hors périmètre. Seul
 * écart assumé : le padding horizontal reste `px-4`, aligné sur celui des cellules, pour
 * que l'en-tête tombe à l'aplomb du contenu de sa colonne.
 */
const TH =
  'border-rule-strong text-ink-muted border-b-[1.5px] px-4 py-2 font-mono text-[9px] font-medium tracking-[.1em] uppercase'

/**
 * #68 — Vue liste des produits.
 *
 * BR touchées :
 *   - BR-PRO-006 : le listing n'affiche QUE les produits du user connecté
 *     (`useProductsWithEvents(userId)` → `GET /users/{userId}/products`).
 *   - #50 : les produits archivés sont déjà exclus côté backend
 *     (`@SQLRestriction("archived=false")`) — aucun filtre archived côté client.
 *
 * #603 — Colonnes du handoff §5 : Produit (pastille + nom + catégorie mono) · Prochain
 * événement (titre + date ISO) · mini-frise 90 j · nombre d'événements · Actions.
 * « Prochain événement » = `nextEvent` (`@/lib/next-occurrence`, partagé avec le tableau
 * de bord) : prochaine occurrence ≥ aujourd'hui, récurrences comprises, archivés exclus.
 * Le nombre d'événements compte les NON archivés (BR-EVE-011, même base que le compteur
 * du détail produit et du tableau de bord).
 *
 * Paliers responsive : Produit, Prochain événement et Actions toujours visibles (c'est la
 * raison d'être de la liste) ; le compteur (étroit) dès `sm` ; la mini-frise (220 px) dès
 * `md`. La catégorie passe SOUS le nom (handoff) au lieu d'occuper sa propre colonne, ce
 * qui libère la largeur mobile pour la prochaine échéance ; son testid
 * `products-row-category-*` est conservé.
 *
 * Recherche et tri sont LOCAUX (client, aucun refetch réseau). Tris : Prochain événement
 * (défaut ; le plus proche d'abord, sans échéance en dernier, départage par nom), Nom A→Z,
 * Nom Z→A.
 *
 * Actions :
 *   - « Nouveau produit » → `ProductDrawer` (mode create), réutilisé tel quel (#61).
 *   - Éditer → `ProductDrawer` (mode edit) préfilé.
 *   - Archiver → `DeleteConfirmDialog` variant="product" (le DELETE backend est un
 *     soft delete #50) qui appelle `useArchiveProduct` (liste rafraîchie en place).
 *   - Clic/Entrée/Espace sur une ligne → navigation vers le détail produit.
 */

type SortKey = 'nextEvent' | 'nameAsc' | 'nameDesc'

const SORT_KEYS: SortKey[] = ['nextEvent', 'nameAsc', 'nameDesc']

export function ProductsListView() {
  const t = useTranslations('products.list')
  const tToast = useTranslations('common.toast')
  const locale = useLocale()
  const router = useRouter()
  const { user } = useAuth()
  const userId = user?.id

  const query = useProductsWithEvents(userId)
  const products = React.useMemo(() => query.data ?? [], [query.data])

  const [search, setSearch] = React.useState('')
  const [sort, setSort] = React.useState<SortKey>('nextEvent')
  const [createOpen, setCreateOpen] = React.useState(false)
  // Review S90 — focus au retour du drawer de création ouvert depuis le CTA d'état vide.
  // Ce déclencheur disparaît dès qu'un produit existe ; Radix rendrait alors le focus à
  // un nœud détaché, donc à `body`. Deux cas, selon l'état du CTA à la fermeture :
  //   · CTA déjà démonté (liste rechargée avant la fin de l'animation) : on rend le
  //     focus au bouton permanent ;
  //   · CTA encore monté (annulation, OU invalidation non attendue par la mutation) :
  //     Radix rend le focus au CTA, sans interception. S'il se démonte ensuite en
  //     détenant ce focus, l'effet ci-dessous le rend au bouton permanent.
  const newButtonRef = React.useRef<HTMLButtonElement>(null)
  const emptyCtaRef = React.useRef<HTMLButtonElement>(null)
  const createFromEmptyRef = React.useRef(false)
  const focusBackToEmptyCtaRef = React.useRef(false)
  const openCreate = (fromEmpty: boolean) => {
    createFromEmptyRef.current = fromEmpty
    focusBackToEmptyCtaRef.current = false
    setCreateOpen(true)
  }
  const handleCreateCloseAutoFocus = (event: Event) => {
    if (!createFromEmptyRef.current) return
    createFromEmptyRef.current = false
    if (emptyCtaRef.current?.isConnected) {
      focusBackToEmptyCtaRef.current = true
      return
    }
    event.preventDefault()
    newButtonRef.current?.focus()
  }
  const hasProducts = products.length > 0
  React.useEffect(() => {
    if (!hasProducts || !focusBackToEmptyCtaRef.current) return
    focusBackToEmptyCtaRef.current = false
    const active = document.activeElement
    if (active === null || active === document.body) newButtonRef.current?.focus()
  }, [hasProducts])
  const [editProduct, setEditProduct] = React.useState<Product | null>(null)
  const [archiveProduct, setArchiveProduct] = React.useState<Product | null>(null)
  const archiveMutation = useArchiveProduct(userId)

  const numberFmt = React.useMemo(() => new Intl.NumberFormat(locale), [locale])

  // Prochaine échéance par produit, calculée une fois par jeu de données (tri + rendu).
  const nextById = React.useMemo(() => {
    const now = new Date()
    return new Map<string, NextEvent | null>(products.map((p) => [p.id, nextEvent(p, now)]))
  }, [products])

  const visible = React.useMemo(() => {
    const needle = search.trim().toLowerCase()
    const filtered = needle
      ? products.filter((p) => p.name.toLowerCase().includes(needle))
      : products.slice()

    const byName = (a: Product, b: Product) => a.name.localeCompare(b.name, locale)
    filtered.sort((a, b) => {
      switch (sort) {
        case 'nameAsc':
          return byName(a, b)
        case 'nameDesc':
          return byName(b, a)
        case 'nextEvent': {
          const na = nextById.get(a.id) ?? null
          const nb = nextById.get(b.id) ?? null
          // Sans échéance : en fin de liste. `start` est un `YYYY-MM-DD` → ordre lexical = chronologique.
          if (na === null && nb === null) return byName(a, b)
          if (na === null) return 1
          if (nb === null) return -1
          if (na.start !== nb.start) return na.start < nb.start ? -1 : 1
          return byName(a, b)
        }
        default:
          return 0
      }
    })
    return filtered
  }, [products, search, sort, locale, nextById])

  const goToDetail = React.useCallback(
    (productId: string) => {
      router.push(`/${locale}/products/${productId}`)
    },
    [router, locale],
  )

  // #698 — la ligne navigue par `router.push` (pas de `<Link>`, donc aucun préchargement) :
  // l'écran de liste restait affiché pendant tout l'aller-retour RSC. On précharge la fiche
  // dès l'intention (survol OU focus clavier), UNE fois par fiche : le Set borne les appels
  // (le routeur déduplique aussi, mais un survol répété n'a pas à le solliciter).
  // Sans effet en `next dev` (Next ne précharge qu'en build de production, PIT-S91-008).
  const prefetchedRef = React.useRef<Set<string>>(new Set())
  const prefetchDetail = React.useCallback(
    (productId: string) => {
      const href = `/${locale}/products/${productId}`
      if (prefetchedRef.current.has(href)) return
      prefetchedRef.current.add(href)
      router.prefetch(href)
    },
    [router, locale],
  )

  const searchInputRef = React.useRef<HTMLInputElement>(null)
  const handleClearSearch = () => {
    setSearch('')
    searchInputRef.current?.focus()
  }

  // #605 — toast APRÈS la réponse serveur ; un rejet remonte au dialog (pitfall #65).
  // PIT-S92-004 — la mutation retire la ligne du cache et invalide `products.all`.
  const handleArchiveConfirm = async () => {
    if (!userId || !archiveProduct) throw new Error('userId/produit manquant')
    await archiveMutation.mutateAsync({ productId: archiveProduct.id })
    toast.success(tToast('productArchived'))
    setArchiveProduct(null)
  }

  return (
    <div className="flex flex-col gap-6" data-testid="products-list-view">
      {/* En-tête : titre + « Nouveau produit ». */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-ink text-xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-ink-muted text-sm">{t('subtitle')}</p>
        </div>
        <Button
          variant="outline"
          className="bg-accent hover:bg-accent-hover text-accent-ink flex items-center gap-2 border-none"
          ref={newButtonRef}
          onClick={() => openCreate(false)}
          data-testid="products-new-button"
        >
          <PlusCircle size={16} aria-hidden="true" />
          <span>{t('newProduct')}</span>
        </Button>
      </div>

      {/* Barre recherche + tri (locaux). */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search
            className="text-ink-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            ref={searchInputRef}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            aria-label={t('search')}
            className="pl-9"
            data-testid="products-search-input"
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger
            className="w-[220px]"
            aria-label={t('sortBy')}
            data-testid="products-sort-trigger"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_KEYS.map((key) => (
              <SelectItem key={key} value={key} data-testid={`products-sort-option-${key}`}>
                {t(`sort.${key}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* États : chargement / erreur / vide / tableau. */}
      {query.isLoading ? (
        // #629 — Squelette en lignes dans le cadre bordé du tableau (`products-table`),
        // au lieu d'une ligne de texte. Testid et libellé inchangés.
        <LoadingSkeleton
          variant="list"
          rows={6}
          label={t('loading')}
          className="border-rule rounded-lg border px-4"
          testId="products-loading"
        />
      ) : query.isError ? (
        <p className="text-destructive text-sm" role="alert" data-testid="products-error">
          {t('error')}
        </p>
      ) : products.length === 0 ? (
        // #630 — État vide partagé + CTA : même action que `products-new-button`
        // (ouvre le `ProductDrawer` de création). Cadre = celui du tableau et du
        // squelette `products-loading`, pour que la zone ne change pas de forme.
        <EmptyState
          title={t('empty')}
          action={
            <Button
              type="button"
              ref={emptyCtaRef}
              onClick={() => openCreate(true)}
              data-testid="products-empty-cta"
            >
              {t('emptyCta')}
            </Button>
          }
          className="border-rule rounded-lg border px-4"
          testId="products-empty"
        />
      ) : visible.length === 0 ? (
        // #630 — Recherche sans résultat : l'utilisateur A des produits, donc PAS de
        // CTA de création. Action = effacer le filtre, puis rendre le focus au champ
        // (le bouton disparaît avec l'état vide : sans ça, le focus tomberait sur body).
        <EmptyState
          title={t('emptySearch')}
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={TOUCH_TARGET_BUTTON}
              onClick={handleClearSearch}
              data-testid="products-empty-search-cta"
            >
              {t('clearSearch')}
            </Button>
          }
          className="border-rule rounded-lg border px-4"
          testId="products-empty-search"
        />
      ) : (
        <div className="border-rule overflow-x-auto rounded-lg border">
          <table className="w-full border-collapse text-left text-sm" data-testid="products-table">
            <thead>
              <tr>
                <th scope="col" className={TH}>
                  {t('columns.product')}
                </th>
                <th scope="col" className={TH}>
                  {t('columns.nextEvent')}
                </th>
                <th scope="col" className={cn(TH, 'hidden md:table-cell')}>
                  {t('columns.activity')}
                </th>
                <th scope="col" className={cn(TH, 'hidden text-right sm:table-cell')}>
                  {t('columns.events')}
                </th>
                <th scope="col" className={cn(TH, 'text-right')}>
                  {t('columns.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {/* TODO(perf, follow-up sprint): virtualiser si > 50 items (react-virtual) — cf. audit S22. */}
              {visible.map((product) => {
                const effectiveColor = product.color ?? product.category?.color ?? null
                const next = nextById.get(product.id) ?? null
                const eventCount = (product.events ?? []).filter((e) => !e.archived).length
                return (
                  <tr
                    key={product.id}
                    role="link"
                    tabIndex={0}
                    aria-label={t('actions.openDetail')}
                    onClick={() => goToDetail(product.id)}
                    onMouseEnter={() => prefetchDetail(product.id)}
                    onFocus={() => prefetchDetail(product.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        goToDetail(product.id)
                      }
                    }}
                    className={cn(
                      'border-rule hover:bg-accent-soft border-b last:border-b-0',
                      'cursor-pointer transition-colors',
                    )}
                    data-testid={`products-row-${product.id}`}
                  >
                    {/* Produit : pastille + nom + catégorie mono (handoff §5). */}
                    <td className="px-4 py-3">
                      <div className="flex min-w-0 items-start gap-2">
                        <span
                          className="mt-1.5 size-2.5 shrink-0 rounded-full"
                          style={{ background: effectiveColor ?? 'var(--color-rule-strong)' }}
                          aria-hidden="true"
                        />
                        <div className="flex min-w-0 flex-col">
                          <span className="text-ink truncate font-medium">{product.name}</span>
                          {product.category ? (
                            <span
                              className="text-ink-muted truncate font-mono text-xs"
                              data-testid={`products-row-category-${product.id}`}
                            >
                              {product.category.name}
                            </span>
                          ) : (
                            <span className="text-ink-muted font-mono text-xs">
                              {t('noCategory')}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* Prochain événement : titre + date ISO `YYYY-MM-DD` en `<time datetime>`
                        (#518, `i18n.css` §7 : `.mt-date--long` = mono + tabular-nums, sans
                        transformation de casse — le texte ISO est rendu tel quel). */}
                    <td className="px-4 py-3" data-testid={`products-row-next-${product.id}`}>
                      {next ? (
                        <div className="flex max-w-48 min-w-0 flex-col sm:max-w-64">
                          <span className="text-ink truncate text-xs">{next.title}</span>
                          <time className="mt-date--long text-ink-muted" dateTime={next.start}>
                            {next.start}
                          </time>
                        </div>
                      ) : (
                        <span className="text-ink-muted">
                          <span aria-hidden="true">—</span>
                          <span className="sr-only">{t('noUpcoming')}</span>
                        </span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <ProductSparkline
                        dates={(product.events ?? []).map((e) => e.startDate)}
                        color={effectiveColor}
                        label={t('sparklineLabel', { name: product.name })}
                      />
                    </td>
                    {/* Nombre d'événements NON archivés : chiffre mono visible, forme plurielle
                        pour les lecteurs d'écran. */}
                    <td
                      className="hidden px-4 py-3 text-right sm:table-cell"
                      data-testid={`products-row-events-count-${product.id}`}
                    >
                      <span className="text-ink-muted mt-num text-xs" aria-hidden="true">
                        {numberFmt.format(eventCount)}
                      </span>
                      <span className="sr-only">{t('eventsCount', { count: eventCount })}</span>
                    </td>
                    <td className="px-4 py-3">
                      {/* #754 (review S101) — `max-md:gap-2` : chaque icône porte une
                          pseudo-hitbox de 44 px centrée sur un bouton de 40 px. Avec
                          l'écart de 4 px, les deux zones se touchaient bord à bord (marge
                          nulle) ; 8 px leur laissent 4 px de dégagement, prouvé par
                          `e2e/sprint-101-touch-targets.spec.ts`. Desktop inchangé. */}
                      <div className="flex items-center justify-end gap-1 max-md:gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={TOUCH_TARGET_HITBOX}
                          aria-label={t('actions.edit')}
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditProduct(product)
                          }}
                          data-testid={`products-edit-${product.id}`}
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={cn('text-destructive', TOUCH_TARGET_HITBOX)}
                          aria-label={t('actions.archive')}
                          onClick={(e) => {
                            e.stopPropagation()
                            setArchiveProduct(product)
                          }}
                          data-testid={`products-archive-${product.id}`}
                        >
                          <Archive className="size-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Création — ProductDrawer réutilisé (#61). */}
      <ProductDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        onCloseAutoFocus={handleCreateCloseAutoFocus}
      />

      {/* Édition — même drawer préfilé. `key` force un remount propre au switch. */}
      {editProduct && (
        <ProductDrawer
          key={editProduct.id}
          open={Boolean(editProduct)}
          onOpenChange={(next) => {
            if (!next) setEditProduct(null)
          }}
          mode="edit"
          product={editProduct}
        />
      )}

      {/* Archivage — soft delete backend (#50) via DeleteConfirmDialog variant produit. */}
      {archiveProduct && (
        <DeleteConfirmDialog
          open={Boolean(archiveProduct)}
          onOpenChange={(next) => {
            if (!next) setArchiveProduct(null)
          }}
          variant="product"
          onConfirm={handleArchiveConfirm}
        />
      )}
    </div>
  )
}

export default ProductsListView
