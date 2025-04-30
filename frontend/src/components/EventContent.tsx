'use client';

import { calculateRemainingTime } from '@/utils/time-utils';
import { EventContentArg } from '@fullcalendar/core';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Card, CardContent } from './ui/card';
import { PopoverPicker } from './ui/popoverPicker';
import { Calendar, Clock, Palette, Edit, Save } from 'lucide-react';
import { updateEventColor, updateEvent } from '@/services/eventService';
import { useAuth } from '@/hooks/useAuth';
import { Button } from './ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const eventEditSchema = z.object({
  title: z.string().min(3, "Le titre doit comporter au moins 3 caractères"),
  type: z.string(),
  durationValue: z.coerce.number().min(1).optional(),
  durationUnit: z.enum(["days", "weeks", "months", "years"]).optional(),
  isRecurring: z.boolean().default(false),
  recurrenceUnit: z.enum(["weeks", "months", "years"]).optional(),
  backgroundColor: z.string().optional()
});

type EventEditFormValues = z.infer<typeof eventEditSchema>;

interface EventContentProps {
  eventInfo: EventContentArg;
}

const DEFAULT_COLORS = {
  duration: {
    backgroundColor: '#6366f1',
    borderColor: '#4f46e5',
    textColor: '#ffffff'
  },
  single: {
    backgroundColor: '#ec4899',
    borderColor: '#db2777',
    textColor: '#ffffff'
  }
};

export const EventContent: React.FC<EventContentProps> = ({ eventInfo }) => {
  const event = eventInfo.event;
  const t = useTranslations();
  const { user } = useAuth();
  const [isOpen, setOpen] = useState(false);
  const [isColorOpen, setIsColorOpen] = useState(false);
  const defaultColors = DEFAULT_COLORS[event.extendedProps?.type as keyof typeof DEFAULT_COLORS] || DEFAULT_COLORS.duration;
  const [color, setColor] = useState(event.backgroundColor || defaultColors.backgroundColor);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const form = useForm<EventEditFormValues>({
    resolver: zodResolver(eventEditSchema),
    defaultValues: {
      title: event.title,
      type: event.extendedProps?.type || 'duration',
      durationValue: event._def.extendedProps?.durationValue,
      durationUnit: event._def.extendedProps?.durationUnit,
      isRecurring: event._def.extendedProps?.isRecurring || false,
      recurrenceUnit: event._def.extendedProps?.recurrenceUnit,
      backgroundColor: event.backgroundColor || defaultColors.backgroundColor
    }
  });
  
  const countdown = event?._instance?.range?.end 
    ? calculateRemainingTime(new Date(event._instance.range.end), t)
    : null;

  const handleClick = () => {
    setOpen(true);
  }
  
  const handleColorChange = async (color: string) => {
    setColor(color);
    setIsSaving(true);
    
    try {
      setTimeout(() => {
        event.setProp('backgroundColor', color);
      }, 0);
      
      if (user && user.id) {
        await updateEventColor(event.id, color);
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la couleur :", error);
    } finally {
      setIsSaving(false);
    }
  }
  
  const onSubmit = async (data: EventEditFormValues) => {
    setIsSaving(true);
    
    try {
      event.setProp('title', data.title);
      
      if (data.backgroundColor) {
        event.setProp('backgroundColor', data.backgroundColor);
      }
      
      if (user && user.id) {
        await updateEvent(event.id, data);
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'événement :", error);
    } finally {
      setIsSaving(false);
    }
  };
  
  const toggleEditMode = () => {
    if (isEditing) {
      form.reset({
        title: event.title,
        type: event.extendedProps?.type || 'duration',
        durationValue: event._def.extendedProps?.durationValue,
        durationUnit: event._def.extendedProps?.durationUnit,
        isRecurring: event._def.extendedProps?.isRecurring || false,
        recurrenceUnit: event._def.extendedProps?.recurrenceUnit,
        backgroundColor: event.backgroundColor || defaultColors.backgroundColor
      });
    }
    setIsEditing(!isEditing);
  };

  const getTextColor = (bgColor: string) => {
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    return luminance > 0.5 ? '#000000' : '#ffffff';
  };

  const backgroundColor = event.backgroundColor || defaultColors.backgroundColor;
  const textColor = event.textColor || defaultColors.textColor;

  return (
    <>
      <div 
        className="event-solid-style" 
        onClick={handleClick}
        style={{
          backgroundColor: event.backgroundColor || defaultColors.backgroundColor,
          borderColor: event.borderColor || defaultColors.borderColor,
          color: event.textColor || defaultColors.textColor,
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div className="z-10 w-full">
          <div className="flex flex-col items-left space-x-2">
            <span className="font-medium truncate" style={{color: event.textColor || defaultColors.textColor}}>
              {event.title}
            </span>
            {countdown && (
              <span className="font-medium truncate" style={{color: event.textColor || defaultColors.textColor}}>
                {countdown}
              </span>
            )}
          </div>
        </div>
      </div>
      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogContent className="p-0 bg-gray-900 border border-gray-700 shadow-xl max-h-[90vh] overflow-y-auto sm:max-w-[500px] rounded-xl">
          <div className="sticky top-0 z-10 bg-gradient-to-r from-purple-900 to-indigo-900 p-5 rounded-t-xl shadow-md">
            <DialogHeader>
              <DialogTitle className="text-white text-xl font-bold flex items-center justify-between">
                <div className="flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  {event.title}
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={toggleEditMode} 
                  className="text-white hover:bg-purple-800"
                  title={isEditing ? t('common.buttons.save') : t('products.edit.title')}
                >
                  {isEditing ? <Save className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                </Button>
              </DialogTitle>
            </DialogHeader>
          </div>
          
          <div className="p-5">
            {!isEditing ? (
              <Card className="bg-gray-800 border-gray-700 shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center mb-4 text-gray-200">
                    <Clock className="mr-2 h-4 w-4 text-indigo-400" />
                    <span className="font-medium">
                      {t('products.details.end')} {countdown}
                    </span>
                  </div>
                  
                  <div className="mt-4 border-t border-gray-700 pt-4">
                    <div className="flex items-center text-gray-200">
                      <Palette className="mr-2 h-4 w-4 text-indigo-400" />
                      <span className="font-medium mr-3">
                        {t('products.details.color')}
                      </span>
                      <PopoverPicker 
                        isOpen={isColorOpen} 
                        color={color} 
                        onChange={handleColorChange} 
                        onToggle={setIsColorOpen} 
                      />
                      {isSaving && <span className="ml-2 text-xs text-indigo-300">{t('common.loading.saving')}</span>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
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
                      
                      <FormField
                        control={form.control}
                        name="backgroundColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">{t('products.details.color')}</FormLabel>
                            <div className="flex items-center">
                              <PopoverPicker 
                                isOpen={isColorOpen} 
                                color={field.value || defaultColors.backgroundColor} 
                                onChange={(color) => {
                                  field.onChange(color);
                                  setColor(color);
                                }} 
                                onToggle={setIsColorOpen} 
                              />
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex justify-end pt-4 border-t border-gray-700">
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="mr-2 border-gray-600 text-gray-300 hover:bg-gray-700"
                          onClick={() => setIsEditing(false)}
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
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EventContent; 