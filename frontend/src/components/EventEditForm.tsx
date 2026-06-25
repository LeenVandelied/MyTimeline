import React from 'react'
import { useTranslations } from 'next-intl'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Checkbox } from './ui/checkbox'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { PopoverPicker } from './ui/popoverPicker'
import { useForm, ControllerRenderProps } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

const eventEditSchema = z.object({
  title: z.string().min(3, 'Le titre doit comporter au moins 3 caractères'),
  type: z.string(),
  durationValue: z.coerce.number().min(1).optional(),
  durationUnit: z.enum(['days', 'weeks', 'months', 'years']).optional(),
  isRecurring: z.boolean().default(false),
  recurrenceUnit: z.enum(['weeks', 'months', 'years']).optional(),
  backgroundColor: z.string(),
  borderColor: z.string(),
  textColor: z.string(),
})

export type EventEditFormValues = z.infer<typeof eventEditSchema>
type ColorKey = 'backgroundColor' | 'borderColor' | 'textColor'
type FormField = ControllerRenderProps<EventEditFormValues, ColorKey>

interface EventEditFormProps {
  defaultValues: EventEditFormValues
  onSubmit: (data: EventEditFormValues) => Promise<void>
  onCancel: () => void
  isSaving: boolean
}

export const EventEditForm: React.FC<EventEditFormProps> = ({
  defaultValues,
  onSubmit,
  onCancel,
  isSaving,
}) => {
  const t = useTranslations()
  const form = useForm<EventEditFormValues>({
    resolver: zodResolver(eventEditSchema),
    defaultValues,
  })

  const [colorStates, setColorStates] = React.useState<
    Record<ColorKey, { isOpen: boolean; value: string }>
  >({
    backgroundColor: { isOpen: false, value: defaultValues.backgroundColor },
    borderColor: { isOpen: false, value: defaultValues.borderColor },
    textColor: { isOpen: false, value: defaultValues.textColor },
  })

  const handleColorToggle = (colorKey: ColorKey, isOpen: boolean) => {
    setColorStates((prev) => ({
      ...prev,
      [colorKey]: { ...prev[colorKey], isOpen },
    }))
  }

  const handleColorChange = (colorKey: ColorKey, color: string, field: FormField) => {
    field.onChange({ target: { value: color } })
    setColorStates((prev) => ({
      ...prev,
      [colorKey]: { ...prev[colorKey], value: color },
    }))
  }

  const renderColorPicker = (colorKey: ColorKey, label: string) => (
    <FormField
      control={form.control}
      name={colorKey}
      render={({ field }) => (
        <FormItem className="relative">
          <div className="mb-2 flex items-center gap-3">
            <FormLabel className="text-ink m-0 font-medium">{label}</FormLabel>
          </div>
          <div className="flex items-center gap-2">
            <PopoverPicker
              isOpen={colorStates[colorKey].isOpen}
              color={field.value}
              onChange={(color) => handleColorChange(colorKey, color, field)}
              onToggle={(isOpen) => handleColorToggle(colorKey, isOpen)}
            />
            <input
              type="text"
              value={field.value}
              onChange={(e) => handleColorChange(colorKey, e.target.value, field)}
              className="bg-surface-2 text-ink border-rule-strong focus:ring-accent flex-1 rounded-md border px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:outline-none"
            />
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Card className="bg-surface border-rule shadow-md">
          <CardContent className="space-y-4 p-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-ink">{t('products.add.event.form.name')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('products.add.event.form.namePlaceholder')}
                      {...field}
                      className="bg-surface-2 text-ink border-rule-strong"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-ink">{t('products.add.event.form.type')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-surface-2 text-ink border-rule-strong">
                        <SelectValue placeholder={t('products.add.event.form.typePlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-surface-2 text-ink border-rule-strong">
                      <SelectItem value="duration">
                        {t('products.add.event.types.duration')}
                      </SelectItem>
                      <SelectItem value="single">{t('products.add.event.types.single')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch('type') === 'duration' && (
              <div className="flex space-x-4">
                <FormField
                  control={form.control}
                  name="durationValue"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel className="text-ink">
                        {t('products.add.event.form.durationValue')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          className="bg-surface-2 text-ink border-rule-strong"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="durationUnit"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel className="text-ink">
                        {t('products.add.event.form.durationUnit')}
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-surface-2 text-ink border-rule-strong">
                            <SelectValue
                              placeholder={t('products.add.event.form.durationUnitPlaceholder')}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-surface-2 text-ink border-rule-strong">
                          <SelectItem value="days">{t('products.add.event.units.days')}</SelectItem>
                          <SelectItem value="weeks">
                            {t('products.add.event.units.weeks')}
                          </SelectItem>
                          <SelectItem value="months">
                            {t('products.add.event.units.months')}
                          </SelectItem>
                          <SelectItem value="years">
                            {t('products.add.event.units.years')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="isRecurring"
              render={({ field }) => (
                <FormItem className="mt-2 flex flex-row items-start space-y-0 space-x-3">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-accent"
                    />
                  </FormControl>
                  <FormLabel className="text-ink cursor-pointer font-normal">
                    {t('products.add.event.form.recurring')}
                  </FormLabel>
                </FormItem>
              )}
            />

            {form.watch('isRecurring') && (
              <FormField
                control={form.control}
                name="recurrenceUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-ink">
                      {t('products.add.event.form.recurrenceUnit')}
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-surface-2 text-ink border-rule-strong">
                          <SelectValue
                            placeholder={t('products.add.event.form.recurrenceUnitPlaceholder')}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-surface-2 text-ink border-rule-strong">
                        <SelectItem value="weeks">{t('products.add.event.units.weeks')}</SelectItem>
                        <SelectItem value="months">
                          {t('products.add.event.units.months')}
                        </SelectItem>
                        <SelectItem value="years">{t('products.add.event.units.years')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="border-rule space-y-6 border-t pt-6">
              <div className="text-ink mb-4 text-lg font-medium">
                {t('products.details.colors')}
              </div>

              <div className="space-y-4">
                {renderColorPicker('backgroundColor', t('products.details.backgroundColor'))}
                {renderColorPicker('borderColor', t('products.details.borderColor'))}
                {renderColorPicker('textColor', t('products.details.textColor'))}
              </div>

              <div className="mt-8 overflow-hidden rounded-lg">
                <div className="text-ink mb-2 text-sm">{t('products.details.preview')}</div>
                <div className="bg-surface rounded-lg p-4">
                  <div
                    className="w-full rounded-md p-4 transition-all"
                    style={{
                      backgroundColor: form.watch('backgroundColor'),
                      borderColor: form.watch('borderColor'),
                      borderWidth: '2px',
                      borderStyle: 'solid',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span style={{ color: form.watch('textColor') }} className="font-medium">
                        {t('products.details.sampleEvent')}
                      </span>
                    </div>
                    <div className="mt-2 text-sm" style={{ color: form.watch('textColor') }}>
                      {t('products.details.sampleDescription')}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-rule flex justify-end border-t pt-4">
              <Button
                type="button"
                variant="outline"
                className="border-rule-strong text-ink-muted hover:bg-surface-2 mr-2"
                onClick={onCancel}
              >
                {t('common.buttons.cancel')}
              </Button>
              <Button
                type="submit"
                className="bg-accent hover:bg-accent-hover text-accent-ink"
                disabled={isSaving}
              >
                {isSaving ? t('common.loading.saving') : t('products.edit.save')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  )
}
