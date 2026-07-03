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
import { eventEditSchema, EventEditFormValues } from '@/types/event'

export type { EventEditFormValues } from '@/types/event'
type FormField = ControllerRenderProps<EventEditFormValues, 'color'>

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

  const [isColorOpen, setIsColorOpen] = React.useState(false)

  const handleColorChange = (color: string, field: FormField) => {
    field.onChange({ target: { value: color } })
  }

  const renderColorPicker = (label: string) => (
    <FormField
      control={form.control}
      name="color"
      render={({ field }) => (
        <FormItem className="relative">
          <div className="mb-2 flex items-center gap-3">
            <FormLabel className="text-ink m-0 font-medium">{label}</FormLabel>
          </div>
          <div className="flex items-center gap-2">
            <PopoverPicker
              isOpen={isColorOpen}
              color={field.value ?? ''}
              onChange={(color) => handleColorChange(color, field)}
              onToggle={(isOpen) => setIsColorOpen(isOpen)}
            />
            <input
              type="text"
              value={field.value ?? ''}
              onChange={(e) => handleColorChange(e.target.value, field)}
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
                        <SelectItem value="WEEK">{t('products.add.event.units.weeks')}</SelectItem>
                        <SelectItem value="MONTH">
                          {t('products.add.event.units.months')}
                        </SelectItem>
                        <SelectItem value="YEAR">{t('products.add.event.units.years')}</SelectItem>
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

              <div className="space-y-4">{renderColorPicker(t('products.details.color'))}</div>

              <div className="mt-8 overflow-hidden rounded-lg">
                <div className="text-ink mb-2 text-sm">{t('products.details.preview')}</div>
                <div className="bg-surface rounded-lg p-4">
                  <div
                    className="w-full rounded-md p-4 transition-all"
                    style={{
                      backgroundColor: form.watch('color'),
                      borderColor: form.watch('color'),
                      borderWidth: '2px',
                      borderStyle: 'solid',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">
                        {t('products.details.sampleEvent')}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-white">
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
