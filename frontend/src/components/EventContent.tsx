'use client';

import { calculateRemainingTime } from '@/utils/time-utils';
import { EventContentArg } from '@fullcalendar/core';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Card, CardContent } from './ui/card';
import { PopoverPicker } from './ui/popoverPicker';
import { Calendar, Edit, Save, Clock } from 'lucide-react';
import { updateEventColor, updateEvent } from '@/services/eventService';
import { useAuth } from '@/hooks/useAuth';
import { Button } from './ui/button';
import { EventEditForm, EventEditFormValues } from './EventEditForm';

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

interface EventContentProps {
  eventInfo: EventContentArg;
}

export const EventContent: React.FC<EventContentProps> = ({ eventInfo }) => {
  const event = eventInfo.event;
  const t = useTranslations();
  const { user } = useAuth();
  const [isOpen, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [colorStates, setColorStates] = useState({
    backgroundColor: false,
    borderColor: false,
    textColor: false
  });
  const defaultColors = DEFAULT_COLORS[event.extendedProps?.type as keyof typeof DEFAULT_COLORS] || DEFAULT_COLORS.duration;
  const [colors, setColors] = useState({
    backgroundColor: event.backgroundColor || defaultColors.backgroundColor,
    borderColor: event.borderColor || defaultColors.borderColor,
    textColor: event.textColor || defaultColors.textColor
  });

  const countdown = event?._instance?.range?.end 
    ? calculateRemainingTime(new Date(event._instance.range.end), t)
    : null;

  const handleClick = () => {
    setOpen(true);
  }
  
  const handleColorChange = async (newColors: Partial<typeof colors>) => {
    const updatedColors = { ...colors, ...newColors };
    setColors(updatedColors);
    setIsSaving(true);
    try {
      setTimeout(() => {
        Object.entries(newColors).forEach(([key, value]) => {
          event.setProp(key as 'backgroundColor' | 'borderColor' | 'textColor', value);
        });
      }, 0);
      
      if (user && user.id) {
        await updateEventColor(event.id, updatedColors);
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour des couleurs :", error);
    } finally {
      setIsSaving(false);
    }
  }
  
  const onSubmit = async (data: EventEditFormValues) => {
    setIsSaving(true);
    
    try {
      event.setProp('title', data.title);
      
      const colorChanges = {
        backgroundColor: data.backgroundColor,
        borderColor: data.borderColor,
        textColor: data.textColor
      };
      
      await handleColorChange(colorChanges);
      
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
    setIsEditing(!isEditing);
  };

  const handleColorToggle = (colorKey: keyof typeof colors) => {
    setColorStates(prev => ({
      ...prev,
      [colorKey]: !prev[colorKey]
    }));
  };

  return (
    <>
      <div 
        className="event-solid-style" 
        onClick={handleClick}
        style={{
          backgroundColor: colors.backgroundColor,
          borderColor: colors.borderColor,
          borderWidth: '2px',
          borderStyle: 'solid',
          color: colors.textColor,
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          borderRadius: '6px',
          padding: '4px 8px',
          height: '100%'
        }}
      >
        <div className="z-10 w-full">
          <div className="flex flex-col items-left space-x-2">
            <span className="font-medium truncate" style={{color: colors.textColor}}>
              {event.title}
            </span>
            {countdown && (
              <span className="text-sm truncate" style={{color: colors.textColor}}>
                {countdown}
              </span>
            )}
          </div>
        </div>
      </div>
      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogContent className="p-0 bg-gray-900 border border-gray-700 shadow-xl max-h-[90vh] overflow-y-auto sm:max-w-[650px] rounded-xl">
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
                
                  <div className="space-y-6">
                    <div className="flex items-center mb-4 text-gray-200">
                      <Clock className="mr-2 h-4 w-4 text-indigo-400" />
                      <span className="font-medium">
                        {t('products.details.end')} {countdown}
                      </span>
                    </div>

                    <div className="mt-4 border-t border-gray-700 pt-4">
                      <div className="space-y-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="text-white font-medium">{t('products.details.colors')}</div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-gray-800/50 rounded-xl p-4 hover:bg-gray-800/70 transition-colors">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="text-gray-200 font-medium">{t('products.details.backgroundColor')}</div>
                            </div>
                            <PopoverPicker 
                              isOpen={colorStates.backgroundColor} 
                              color={colors.backgroundColor} 
                              onChange={(color) => handleColorChange({ backgroundColor: color })} 
                              onToggle={() => handleColorToggle('backgroundColor')}
                            />
                          </div>
                          <div className="bg-gray-800/50 rounded-xl p-4 hover:bg-gray-800/70 transition-colors">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="text-gray-200 font-medium">{t('products.details.borderColor')}</div>
                            </div>
                            <PopoverPicker 
                              isOpen={colorStates.borderColor} 
                              color={colors.borderColor} 
                              onChange={(color) => handleColorChange({ borderColor: color })} 
                              onToggle={() => handleColorToggle('borderColor')}
                            />
                          </div>
                          <div className="bg-gray-800/50 rounded-xl p-4 hover:bg-gray-800/70 transition-colors">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="text-gray-200 font-medium">{t('products.details.textColor')}</div>
                            </div>
                            <PopoverPicker 
                              isOpen={colorStates.textColor} 
                              color={colors.textColor} 
                              onChange={(color) => handleColorChange({ textColor: color })} 
                              onToggle={() => handleColorToggle('textColor')}
                            />
                          </div>
                        </div>
                        <div className="mt-6 bg-gray-800/30 rounded-xl p-6">
                          <div 
                            className="w-full rounded-lg p-4 transition-all"
                            style={{
                              backgroundColor: colors.backgroundColor,
                              borderColor: colors.borderColor,
                              borderWidth: '2px',
                              borderStyle: 'solid'
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <span style={{ color: colors.textColor }} className="font-medium">
                                {event.title}
                              </span>
                            </div>
                            {countdown && (
                              <div 
                                className="mt-2 text-sm opacity-80"
                                style={{ color: colors.textColor }}
                              >
                                {countdown}
                              </div>
                            )}
                          </div>
                        </div>
                        {isSaving && <span className="block mt-2 text-xs text-indigo-300">{t('common.loading.saving')}</span>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <EventEditForm
                defaultValues={{
                  title: event.title,
                  type: event.extendedProps?.type || 'duration',
                  durationValue: event._def.extendedProps?.durationValue,
                  durationUnit: event._def.extendedProps?.durationUnit,
                  isRecurring: event._def.extendedProps?.isRecurring || false,
                  recurrenceUnit: event._def.extendedProps?.recurrenceUnit,
                  backgroundColor: colors.backgroundColor,
                  borderColor: colors.borderColor,
                  textColor: colors.textColor
                }}
                onSubmit={onSubmit}
                onCancel={() => setIsEditing(false)}
                isSaving={isSaving}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EventContent; 