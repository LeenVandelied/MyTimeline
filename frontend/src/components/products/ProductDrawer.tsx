'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { Package, Tag, Calendar, Trash2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { PopoverPicker } from '@/components/ui/popoverPicker'
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog'
import { ProductSparkline } from './ProductSparkline'
import { useCategories } from '@/hooks/useCategories'
import { useCreateProduct } from '@/hooks/useCreateProduct'
import { useUpdateProduct } from '@/hooks/useUpdateProduct'
import { deleteProduct } from '@/services/productService'
import { useAuth } from '@/hooks/useAuth'
import type { Product, ProductCreate, ProductUpdate } from '@/types/product'
import { productCreateSchema, productUpdateSchema } from '@/types/product'

/**
 * #61 — Drawer produit unifié : création (simple ou couplée à un premier
 * événement) et édition. Remplace l'ancien `AddProducts.tsx` (monolithe à 4 UUID
 * de catégories hardcodés, sans édition).
 *
 * BR touchées :
 *   - BR-PRO-001 : `name` borné 1..100 (Zod resynchronisé, cf. types/product.ts).
 *   - BR-PRO-002 / BR-CAT-007 : combobox catégorie alimentée par
 *     `GET /api/categories` (fin des UUID en dur) — n'affiche QUE les catégories
 *     scopées owner ∪ système renvoyées par le hook `useCategories` (#65).
 *   - BR-PRO-010 : le backend rejette (404) une catégorie non assignable ; on
 *     surface le conflit inline (409/404).
 *
 * Responsive (charte Graphite, cohérent avec DeleteConfirmDialog #65) :
 *   - Desktop (sm+) : drawer latéral ancré à droite, largeur 452px, pleine hauteur.
 *   - Mobile : bottom sheet plein écran, swipe-down = Escape/overlay natif Radix.
 *
 * Couleur (#158) : héritée de la catégorie sélectionnée (`category.color`),
 * surchargeable au niveau produit et PERSISTÉE côté backend (`ProductCreationRequest`/
 * `ProductUpdateRequest.color` + `ProductResponse.color`, colonne `products.color` V7).
 * `colorOverride` (état local) est initialisé depuis `product.color` en édition ; le
 * submit envoie `color` (surcharge) ou `clearColor` (reset -> ré-héritage catégorie).
 */

export type ProductDrawerMode = 'create' | 'edit'

export interface ProductDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `edit` requiert `product`. Défaut `create`. */
  mode?: ProductDrawerMode
  /** Produit à éditer (mode `edit`) : pré-remplit les champs. */
  product?: Product
  /** Callback post-succès (création ou édition), ex. refetch parent. */
  onSuccess?: () => void
  /** Callback post-suppression (mode edit) si le produit a été supprimé. */
  onDeleted?: () => void
}

/** Lit `error.response.status` défensivement (axios ou générique, sans `any`). */
function httpStatusOf(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { status?: unknown } }).response
    if (response && typeof response.status === 'number') return response.status
  }
  return undefined
}

interface DrawerFormValues {
  name: string
  category: string
  /** Événement ponctuel optionnel (création couplée). */
  firstEventDate?: string
}

export function ProductDrawer({
  open,
  onOpenChange,
  mode = 'create',
  product,
  onSuccess,
  onDeleted,
}: ProductDrawerProps) {
  const t = useTranslations('products.drawer')
  const { user } = useAuth()
  const userId = user?.id

  const isEdit = mode === 'edit' && Boolean(product)

  const categoriesQuery = useCategories(open)
  const categories = React.useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data])
  const noCategory = open && categoriesQuery.isSuccess && categories.length === 0

  const createMutation = useCreateProduct(userId)
  const updateMutation = useUpdateProduct(userId)

  const [colorOverride, setColorOverride] = React.useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)

  // Validation d'affichage : name (1..100) + category (UUID) obligatoires dans
  // les deux modes. En édition, le PATCH n'envoie ensuite qu'un diff partiel
  // (cf. onSubmit) ; en création couplée, `firstEventDate` est un extra optionnel
  // non validé par ce schéma (date libre).
  const form = useForm<DrawerFormValues>({
    resolver: zodResolver(productCreateSchema.pick({ name: true, category: true })),
    defaultValues: { name: '', category: '', firstEventDate: '' },
  })

  // (Ré)initialisation à l'ouverture : pré-remplissage en édition, reset sinon.
  React.useEffect(() => {
    if (!open) return
    setSubmitError(null)
    if (isEdit && product) {
      form.reset({ name: product.name, category: product.category.id, firstEventDate: '' })
      // #158 : pré-remplir la surcharge couleur persistée (null = héritage catégorie).
      setColorOverride(product.color ?? null)
    } else {
      form.reset({ name: '', category: '', firstEventDate: '' })
      setColorOverride(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, product])

  const selectedCategoryId = form.watch('category')
  const watchedName = form.watch('name')
  const watchedEventDate = form.watch('firstEventDate')

  const inheritedColor = categories.find((c) => c.id === selectedCategoryId)?.color ?? null
  const effectiveColor = colorOverride ?? inheritedColor

  const submitting = createMutation.isPending || updateMutation.isPending

  const onSubmit = async (values: DrawerFormValues) => {
    setSubmitError(null)
    if (!userId) {
      setSubmitError(t('errors.noUser'))
      return
    }

    try {
      if (isEdit && product) {
        // Diff partiel : on n'envoie que ce qui a changé (BR-PRO-009).
        const patch: ProductUpdate = {}
        if (values.name !== product.name) patch.name = values.name
        if (values.category !== product.category.id) patch.categoryId = values.category
        // #158 : diff couleur. `colorOverride` = surcharge courante (null = héritage).
        // - override non-null ≠ couleur persistée -> pose la surcharge (patch.color)
        // - override repassé à null alors qu'une surcharge existait -> reset (clearColor)
        const currentColor = product.color ?? null
        if (colorOverride !== currentColor) {
          if (colorOverride !== null) patch.color = colorOverride
          else patch.clearColor = true
        }
        if (
          patch.name === undefined &&
          patch.categoryId === undefined &&
          patch.color === undefined &&
          patch.clearColor === undefined
        ) {
          onOpenChange(false)
          return
        }
        productUpdateSchema.parse(patch)
        await updateMutation.mutateAsync({ productId: product.id, data: patch })
      } else {
        const payload: ProductCreate = {
          name: values.name,
          category: values.category,
        }
        // #158 : surcharge couleur produit optionnelle (omise = héritage catégorie).
        if (colorOverride !== null) payload.color = colorOverride
        // Création couplée : premier événement ponctuel optionnel. Jamais
        // `events: null` (NPE backend, BR-PRO-005) → omis si absent.
        if (values.firstEventDate) {
          payload.events = [
            { name: values.name, type: 'single', date: new Date(values.firstEventDate) },
          ]
        }
        productCreateSchema.parse(payload)
        await createMutation.mutateAsync(payload)
      }
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      const status = httpStatusOf(error)
      if (status === 409) setSubmitError(t('errors.conflict'))
      else if (status === 404) setSubmitError(t('errors.notFound'))
      else if (status === 403) setSubmitError(t('errors.forbidden'))
      else setSubmitError(t('errors.generic'))
    }
  }

  // Suppression déléguée à DeleteConfirmDialog (#65), variante `product`.
  // L'erreur DOIT rejeter pour que le dialog l'affiche inline (pitfall #65).
  const handleDeleteConfirm = async () => {
    if (!userId || !product) throw new Error('userId/produit manquant')
    await deleteProduct(userId, product.id)
    setDeleteOpen(false)
    onDeleted?.()
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            // Mobile : bottom sheet plein écran, swipe-down = fermeture native.
            'top-auto right-0 bottom-0 left-0 max-h-[92vh] max-w-full translate-x-0 translate-y-0 overflow-y-auto rounded-t-2xl rounded-b-none',
            // Desktop (sm+) : drawer latéral droit 452px, pleine hauteur.
            'sm:top-0 sm:right-0 sm:bottom-0 sm:left-auto sm:h-full sm:max-h-screen sm:w-[452px] sm:max-w-[452px] sm:translate-x-0 sm:translate-y-0 sm:rounded-none',
          )}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="size-5" aria-hidden="true" />
              {isEdit ? t('editTitle') : t('createTitle')}
            </DialogTitle>
            <DialogDescription>
              {isEdit ? t('editDescription') : t('createDescription')}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Nom (BR-PRO-001). */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Tag className="size-4" aria-hidden="true" />
                      {t('fields.name')}
                    </FormLabel>
                    <FormControl>
                      <Input placeholder={t('fields.namePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Catégorie (BR-PRO-002 / BR-CAT-007) : combobox dynamique. */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Tag className="size-4" aria-hidden="true" />
                      {t('fields.category')}
                    </FormLabel>
                    {noCategory ? (
                      <p role="note" className="text-muted-foreground text-sm">
                        {t('fields.noCategory')}
                      </p>
                    ) : (
                      <Select
                        value={field.value || undefined}
                        onValueChange={field.onChange}
                        disabled={categoriesQuery.isPending || submitting}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('fields.categoryPlaceholder')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Couleur : héritée catégorie, surchargeable. */}
              <div className="flex items-center justify-between">
                <span className="text-foreground text-sm font-medium">{t('fields.color')}</span>
                <div className="flex items-center gap-2">
                  <PopoverPicker
                    color={effectiveColor ?? '#888888'}
                    onChange={setColorOverride}
                    isOpen={pickerOpen}
                    onToggle={setPickerOpen}
                  />
                  {colorOverride && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setColorOverride(null)}
                    >
                      {t('fields.resetColor')}
                    </Button>
                  )}
                </div>
              </div>

              {/* Création couplée : premier événement optionnel. */}
              {!isEdit && (
                <FormField
                  control={form.control}
                  name="firstEventDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Calendar className="size-4" aria-hidden="true" />
                        {t('fields.firstEvent')}
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Aperçu live : sparkline 90 jours. */}
              <div className="space-y-1">
                <span className="text-muted-foreground text-xs font-medium">
                  {t('preview.label')}
                </span>
                <div className="border-rule flex items-center gap-3 rounded-md border p-3">
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: effectiveColor ?? 'var(--color-accent)' }}
                    aria-hidden="true"
                  />
                  <span className="text-ink truncate text-sm font-medium">
                    {watchedName || t('preview.placeholderName')}
                  </span>
                  <div className="ml-auto">
                    <ProductSparkline
                      dates={[watchedEventDate, ...(product?.events ?? []).map((e) => e.startDate)]}
                      color={effectiveColor}
                      label={t('preview.sparklineLabel')}
                    />
                  </div>
                </div>
              </div>

              {/* Erreur async inline (409 conflict / 404 / générique). */}
              {submitError && (
                <p role="alert" className="text-destructive text-sm">
                  {submitError}
                </p>
              )}

              <DialogFooter className="gap-2 sm:justify-between">
                {isEdit ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => setDeleteOpen(true)}
                    disabled={submitting}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    {t('actions.delete')}
                  </Button>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={submitting}
                  >
                    {t('actions.cancel')}
                  </Button>
                  <Button type="submit" disabled={submitting || noCategory}>
                    {submitting && (
                      <Spinner label={t('actions.submitting')} className="text-current" />
                    )}
                    {isEdit ? t('actions.save') : t('actions.create')}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Suppression produit (mode édition) — réutilise DeleteConfirmDialog #65. */}
      {isEdit && product && (
        <DeleteConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          variant="product"
          onConfirm={handleDeleteConfirm}
        />
      )}
    </>
  )
}

export default ProductDrawer
