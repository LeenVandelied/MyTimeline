import React from 'react';
import { useTranslations } from 'next-intl';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { PopoverPicker } from './ui/popoverPicker';
import { useForm, ControllerRenderProps } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const eventEditSchema = z.object({
  title: z.string().min(3, "Le titre doit comporter au moins 3 caractères"),
  type: z.string(),
  durationValue: z.coerce.number().min(1).optional(),
  durationUnit: z.enum(["days", "weeks", "months", "years"]).optional(),
  isRecurring: z.boolean().default(false),
  recurrenceUnit: z.enum(["weeks", "months", "years"]).optional(),
  backgroundColor: z.string(),
  borderColor: z.string(),
  textColor: z.string()
});

export type EventEditFormValues = z.infer<typeof eventEditSchema>;
type ColorKey = 'backgroundColor' | 'borderColor' | 'textColor';
type FormField = ControllerRenderProps<EventEditFormValues, ColorKey>;

interface EventEditFormProps {
  defaultValues: EventEditFormValues;
  onSubmit: (data: EventEditFormValues) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

export const EventEditForm: React.FC<EventEditFormProps> = ({
  defaultValues,
  onSubmit,
  onCancel,
  isSaving,
}) => {
  const t = useTranslations();
  const form = useForm<EventEditFormValues>({
    resolver: zodResolver(eventEditSchema),
    defaultValues
  });

  const [colorStates, setColorStates] = React.useState<Record<ColorKey, { isOpen: boolean; value: string }>>({
    backgroundColor: { isOpen: false, value: defaultValues.backgroundColor },
    borderColor: { isOpen: false, value: defaultValues.borderColor },
    textColor: { isOpen: false, value: defaultValues.textColor }
  });

  const handleColorToggle = (colorKey: ColorKey, isOpen: boolean) => {
    setColorStates(prev => ({
      ...prev,
      [colorKey]: { ...prev[colorKey], isOpen }
    }));
  };

  const handleColorChange = (colorKey: ColorKey, color: string, field: FormField) => {
    field.onChange({ target: { value: color } });
    setColorStates(prev => ({
      ...prev,
      [colorKey]: { ...prev[colorKey], value: color }
    }));
  };

  const renderColorPicker = (colorKey: ColorKey, label: string) => (
    <FormField
      control={form.control}
      name={colorKey}
      render={({ field }) => (
        <FormItem className="relative">
          <div className="flex items-center gap-3 mb-2">
            <FormLabel className="text-white font-medium m-0">{label}</FormLabel>
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
              className="flex-1 bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Card className="bg-gray-800 border-gray-700 shadow-md">
          <CardContent className="p-4 space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">{t('products.add.event.form.name')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('products.add.event.form.namePlaceholder')} {...field} className="bg-gray-700 text-white border-gray-600" />
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
                  <FormLabel className="text-white">{t('products.add.event.form.type')}</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-gray-700 text-white border-gray-600">
                        <SelectValue placeholder={t('products.add.event.form.typePlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-gray-700 text-white border-gray-600">
                      <SelectItem value="duration">{t('products.add.event.types.duration')}</SelectItem>
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
                      <FormLabel className="text-white">{t('products.add.event.form.durationValue')}</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="bg-gray-700 text-white border-gray-600" />
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
                      <FormLabel className="text-white">{t('products.add.event.form.durationUnit')}</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-gray-700 text-white border-gray-600">
                            <SelectValue placeholder={t('products.add.event.form.durationUnitPlaceholder')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-gray-700 text-white border-gray-600">
                          <SelectItem value="days">{t('products.add.event.units.days')}</SelectItem>
                          <SelectItem value="weeks">{t('products.add.event.units.weeks')}</SelectItem>
                          <SelectItem value="months">{t('products.add.event.units.months')}</SelectItem>
                          <SelectItem value="years">{t('products.add.event.units.years')}</SelectItem>
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
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-indigo-500"
                    />
                  </FormControl>
                  <FormLabel className="text-white font-normal cursor-pointer">
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
                    <FormLabel className="text-white">{t('products.add.event.form.recurrenceUnit')}</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-gray-700 text-white border-gray-600">
                          <SelectValue placeholder={t('products.add.event.form.recurrenceUnitPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-gray-700 text-white border-gray-600">
                        <SelectItem value="weeks">{t('products.add.event.units.weeks')}</SelectItem>
                        <SelectItem value="months">{t('products.add.event.units.months')}</SelectItem>
                        <SelectItem value="years">{t('products.add.event.units.years')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <div className="space-y-6 border-t border-gray-700 pt-6">
              <div className="text-white font-medium text-lg mb-4">{t('products.details.colors')}</div>
              
              <div className="space-y-4">
                {renderColorPicker('backgroundColor', t('products.details.backgroundColor'))}
                {renderColorPicker('borderColor', t('products.details.borderColor'))}
                {renderColorPicker('textColor', t('products.details.textColor'))}
              </div>

              <div className="mt-8 rounded-lg overflow-hidden">
                <div className="text-white text-sm mb-2">{t('products.details.preview')}</div>
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div 
                    className="w-full rounded-md p-4 transition-all"
                    style={{
                      backgroundColor: form.watch('backgroundColor'),
                      borderColor: form.watch('borderColor'),
                      borderWidth: '2px',
                      borderStyle: 'solid'
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span style={{ color: form.watch('textColor') }} className="font-medium">
                        {t('products.details.sampleEvent')}
                      </span>
                    </div>
                    <div 
                      className="mt-2 text-sm"
                      style={{ color: form.watch('textColor') }}
                    >
                      {t('products.details.sampleDescription')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end pt-4 border-t border-gray-700">
              <Button 
                type="button" 
                variant="outline" 
                className="mr-2 border-gray-600 text-gray-300 hover:bg-gray-700"
                onClick={onCancel}
              >
                {t('common.buttons.cancel')}
              </Button>
              <Button 
                type="submit" 
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={isSaving}
              >
                {isSaving 
                  ? t('common.loading.saving')
                  : t('products.edit.save')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}; 