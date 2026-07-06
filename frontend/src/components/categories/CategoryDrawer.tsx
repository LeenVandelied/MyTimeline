'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { Tag, FileText, Palette, Trash2, AlertTriangle } from 'lucide-react'

import { cn } from '@/lib/utils'
import { contrastRatio, contrastInk, WCAG_AA_NORMAL } from '@/lib/color'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { PopoverPicker } from '@/components/ui/popoverPicker'
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog'
import { useCreateCategory } from '@/hooks/useCreateCategory'
import { useUpdateCategory } from '@/hooks/useUpdateCategory'
import { deleteCategory } from '@/services/categoryService'
import type { Category, CategoryCreate, CategoryUpdate } from '@/types/category'
import { createCategoryFormSchema, type CategoryFormValues } from '@/types/category'

/**
 * #62 — Drawer catégorie unifié : création + édition. Calque le pattern de
 * `ProductDrawer` (#61) : Radix `Dialog` + classes responsive identiques (bottom
 * sheet plein écran mobile / drawer latéral 452px desktop), aucune primitive
 * drawer nouvelle (anti-duplication, carte de réutilisation architecte).
 *
 * BR touchées :
 *   - BR-CAT-001 : `name` obligatoire (Zod `min(1)`, message inline sous le champ).
 *   - BR-CAT-002 : suppression protégée → délègue à `DeleteConfirmDialog`
 *     variant="category" (réassignation atomique côté backend).
 *   - BR-CAT-004 : unicité du nom → 409 backend surfacé INLINE sous le champ `name`
 *     (pas un toast, pas un throw non catché).
 *
 * ADR-002 (ownership par utilisateur) : une catégorie « système » (`system===true`,
 * owner NULL backend) est NON éditable/supprimable (403). En mode édition d'une
 * catégorie système, les actions modifier/supprimer sont masquées/désactivées ; le
 * drawer bascule en lecture seule.
 *
 * Palette : 12 swatches (grille de boutons) + `PopoverPicker` (react-colorful) pour
 * une couleur libre — RÉUTILISÉS tels quels (pas de ColorSwatch séparé). Aperçu live :
 * badge coloré + nom, avec avertissement de contraste (non bloquant) si le texte sur
 * le fond choisi n'atteint pas WCAG AA 4.5:1.
 */

/** Palette de 12 swatches (couleurs Graphite-friendly, hex `#RRGGBB`). */
export const CATEGORY_SWATCHES = [
  '#E5484D', // rouge
  '#E5691E', // orange
  '#F2A900', // ambre
  '#A7B83A', // citron
  '#46A758', // vert
  '#12A594', // teal
  '#0091C2', // cyan
  '#3E63DD', // bleu
  '#6E56CF', // violet
  '#AB4ABA', // magenta
  '#E93D82', // rose
  '#8B8D98', // gris
] as const

export type CategoryDrawerMode = 'create' | 'edit'

export interface CategoryDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `edit` requiert `category`. Défaut `create`. */
  mode?: CategoryDrawerMode
  /** Catégorie à éditer (mode `edit`) : pré-remplit les champs. */
  category?: Category
  /** Callback post-succès (création ou édition). */
  onSuccess?: () => void
  /** Callback post-suppression (mode edit). */
  onDeleted?: () => void
  /** Variante category : nb de produits liés, pour forcer le select de réassignation à la suppression. */
  linkedProductsCount?: number
}

/** Lit `error.response.status` défensivement (axios ou générique, sans `any`). */
function httpStatusOf(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { status?: unknown } }).response
    if (response && typeof response.status === 'number') return response.status
  }
  return undefined
}

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export function CategoryDrawer({
  open,
  onOpenChange,
  mode = 'create',
  category,
  onSuccess,
  onDeleted,
  linkedProductsCount = 0,
}: CategoryDrawerProps) {
  const t = useTranslations('categories.drawer')
  const tValidation = useTranslations('categories.validation')

  const isEdit = mode === 'edit' && Boolean(category)
  const isSystem = isEdit && category?.system === true
  const readOnly = isSystem

  const createMutation = useCreateCategory()
  const updateMutation = useUpdateCategory()

  const [color, setColor] = React.useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [nameConflict, setNameConflict] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)

  const formSchema = React.useMemo(
    () => createCategoryFormSchema((k) => tValidation(k)),
    [tValidation],
  )

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', color: '', description: '' },
  })

  // (Ré)initialisation à l'ouverture : pré-remplissage en édition, reset sinon.
  React.useEffect(() => {
    if (!open) return
    setSubmitError(null)
    setNameConflict(false)
    if (isEdit && category) {
      form.reset({
        name: category.name,
        color: category.color ?? '',
        description: category.description ?? '',
      })
      setColor(category.color ?? null)
    } else {
      form.reset({ name: '', color: '', description: '' })
      setColor(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, category])

  const watchedName = form.watch('name')

  const submitting = createMutation.isPending || updateMutation.isPending

  // Aperçu badge : couleur de fond + encre calculée par contraste. Avertissement
  // (non bloquant) si le meilleur des deux encres n'atteint pas AA 4.5:1.
  const previewColor = color ?? 'var(--color-accent)'
  const ink = HEX_RE.test(color ?? '') ? contrastInk(color) : 'var(--color-ink)'
  const lowContrast = React.useMemo(() => {
    if (!color || !HEX_RE.test(color)) return false
    const chosenInk = contrastInk(color)
    return contrastRatio(color, chosenInk) < WCAG_AA_NORMAL
  }, [color])

  const setSwatch = (hex: string) => {
    setColor(hex)
    form.setValue('color', hex)
  }

  const onPickerChange = (hex: string) => {
    setColor(hex)
    form.setValue('color', hex)
  }

  const onSubmit = async (values: CategoryFormValues) => {
    if (readOnly) return
    setSubmitError(null)
    setNameConflict(false)

    const effectiveColor = color ?? undefined

    try {
      if (isEdit && category) {
        const patch: CategoryUpdate = {
          name: values.name,
          color: effectiveColor,
          description: values.description ? values.description : undefined,
        }
        await updateMutation.mutateAsync({ id: category.id, data: patch })
      } else {
        const payload: CategoryCreate = {
          name: values.name,
          color: effectiveColor,
          description: values.description ? values.description : undefined,
        }
        await createMutation.mutateAsync(payload)
      }
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      const status = httpStatusOf(error)
      if (status === 409) {
        // BR-CAT-004 : nom dupliqué → erreur INLINE sous le champ name.
        setNameConflict(true)
        form.setError('name', { type: 'server', message: tValidation('nameConflict') })
      } else if (status === 403) {
        setSubmitError(t('errors.forbidden'))
      } else if (status === 404) {
        setSubmitError(t('errors.notFound'))
      } else {
        setSubmitError(t('errors.generic'))
      }
    }
  }

  // Suppression déléguée à DeleteConfirmDialog (#65), variant="category".
  // L'erreur DOIT rejeter pour que le dialog l'affiche inline (pitfall #65).
  const handleDeleteConfirm = async (reassignToCategoryId?: string) => {
    if (!category) throw new Error('catégorie manquante')
    await deleteCategory(category.id, reassignToCategoryId)
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
          data-testid="category-drawer"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="size-5" aria-hidden="true" />
              {isEdit ? t('editTitle') : t('createTitle')}
            </DialogTitle>
            <DialogDescription>
              {isSystem
                ? t('systemDescription')
                : isEdit
                  ? t('editDescription')
                  : t('createDescription')}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-5"
              data-testid="category-drawer-form"
            >
              {/* Nom (BR-CAT-001 / BR-CAT-004). */}
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
                      <Input
                        placeholder={t('fields.namePlaceholder')}
                        data-testid="category-name-input"
                        disabled={readOnly || submitting}
                        aria-invalid={nameConflict || undefined}
                        {...field}
                        onChange={(e) => {
                          setNameConflict(false)
                          field.onChange(e)
                        }}
                      />
                    </FormControl>
                    {/* FormMessage rend l'erreur Zod (nom vide) ET l'erreur server
                        (409 nom dupliqué, posée via form.setError). */}
                    <FormMessage data-testid="category-name-error" />
                  </FormItem>
                )}
              />

              {/* Couleur : 12 swatches + picker libre. */}
              <div className="space-y-2">
                <span className="text-foreground flex items-center gap-2 text-sm font-medium">
                  <Palette className="size-4" aria-hidden="true" />
                  {t('fields.color')}
                </span>
                <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('fields.color')}>
                  {CATEGORY_SWATCHES.map((hex) => {
                    const selected = color?.toLowerCase() === hex.toLowerCase()
                    return (
                      <button
                        key={hex}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={hex}
                        title={hex}
                        data-testid={`category-swatch-${hex}`}
                        disabled={readOnly || submitting}
                        onClick={() => setSwatch(hex)}
                        className={cn(
                          'size-7 rounded-full border transition focus:ring-2 focus:ring-offset-1 focus:outline-none',
                          selected ? 'border-foreground ring-2 ring-offset-1' : 'border-rule',
                          (readOnly || submitting) && 'cursor-not-allowed opacity-50',
                        )}
                        style={{ backgroundColor: hex }}
                      />
                    )
                  })}
                  {/* Picker libre (react-colorful). */}
                  {!readOnly && (
                    <div data-testid="category-color-picker">
                      <PopoverPicker
                        color={color ?? '#888888'}
                        onChange={onPickerChange}
                        isOpen={pickerOpen}
                        onToggle={setPickerOpen}
                      />
                    </div>
                  )}
                  {color && !readOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setColor(null)
                        form.setValue('color', '')
                      }}
                    >
                      {t('fields.resetColor')}
                    </Button>
                  )}
                </div>
                {/* Avertissement contraste (non bloquant, BR/charte a11y). */}
                {lowContrast && (
                  <p
                    role="note"
                    data-testid="category-contrast-warning"
                    className="text-muted-foreground flex items-center gap-1 text-xs"
                  >
                    <AlertTriangle className="text-destructive size-3.5 shrink-0" aria-hidden="true" />
                    {t('fields.contrastWarning')}
                  </p>
                )}
              </div>

              {/* Description (optionnelle). */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <FileText className="size-4" aria-hidden="true" />
                      {t('fields.description')}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('fields.descriptionPlaceholder')}
                        rows={3}
                        data-testid="category-description-input"
                        disabled={readOnly || submitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Aperçu live : badge coloré + nom. */}
              <div className="space-y-1">
                <span className="text-muted-foreground text-xs font-medium">
                  {t('preview.label')}
                </span>
                <div className="border-rule flex items-center gap-3 rounded-md border p-3">
                  <span
                    data-testid="category-preview-badge"
                    className="inline-flex max-w-full items-center rounded-full px-3 py-1 text-sm font-medium"
                    style={{ backgroundColor: previewColor, color: ink }}
                  >
                    <span className="truncate">
                      {watchedName || t('preview.placeholderName')}
                    </span>
                  </span>
                </div>
              </div>

              {/* Erreur async générique (403/404/générique) — le 409 va inline. */}
              {submitError && (
                <p role="alert" className="text-destructive text-sm">
                  {submitError}
                </p>
              )}

              <DialogFooter className="gap-2 sm:justify-between">
                {isEdit && !isSystem ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => setDeleteOpen(true)}
                    disabled={submitting}
                    data-testid="category-delete-button"
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
                  {!readOnly && (
                    <Button
                      type="submit"
                      disabled={submitting}
                      data-testid="category-submit"
                    >
                      {submitting && (
                        <Spinner label={t('actions.submitting')} className="text-current" />
                      )}
                      {isEdit ? t('actions.save') : t('actions.create')}
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Suppression catégorie (mode édition, non système) — DeleteConfirmDialog #65. */}
      {isEdit && category && !isSystem && (
        <DeleteConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          variant="category"
          categoryId={category.id}
          linkedProductsCount={linkedProductsCount}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </>
  )
}

export default CategoryDrawer
