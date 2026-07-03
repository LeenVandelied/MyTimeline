'use client'

import { calculateRemainingTime } from '@/utils/time-utils'
import { FullCalendarEvent } from '@/types/event'
import { useTranslations } from 'next-intl'
import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Card, CardContent } from './ui/card'
import { PopoverPicker } from './ui/popoverPicker'
import { Calendar, Edit, Save, Clock } from 'lucide-react'
import { updateEventColor, updateEvent } from '@/services/eventService'
import { useAuth } from '@/hooks/useAuth'
import { Button } from './ui/button'
import { EventEditForm, EventEditFormValues } from './EventEditForm'

// #150 — modèle couleur unique `color` (BR-EVE-009).
const DEFAULT_COLOR = '#6366f1'

interface EventContentProps {
  event: FullCalendarEvent
}

export const EventContent: React.FC<EventContentProps> = ({ event }) => {
  const t = useTranslations()
  const { user } = useAuth()
  const [isOpen, setOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isColorOpen, setIsColorOpen] = useState(false)
  const [color, setColor] = useState(event.color || DEFAULT_COLOR)

  const countdown = event?.end ? calculateRemainingTime(new Date(event.end), t) : null

  const handleClick = () => {
    setOpen(true)
  }

  const handleColorChange = async (newColor: string) => {
    setColor(newColor)
    setIsSaving(true)
    try {
      if (user && user.id) {
        await updateEventColor(event.id, newColor)
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour des couleurs :', error)
    } finally {
      setIsSaving(false)
    }
  }

  const onSubmit = async (data: EventEditFormValues) => {
    setIsSaving(true)

    try {
      if (data.color) {
        await handleColorChange(data.color)
      }

      if (user && user.id) {
        await updateEvent(event.id, data)
      }

      setIsEditing(false)
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'événement :", error)
    } finally {
      setIsSaving(false)
    }
  }

  const toggleEditMode = () => {
    setIsEditing(!isEditing)
  }

  return (
    <>
      <div
        className="event-solid-style"
        onClick={handleClick}
        style={{
          backgroundColor: color,
          borderColor: color,
          borderWidth: '2px',
          borderStyle: 'solid',
          color: '#ffffff',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          borderRadius: '6px',
          padding: '4px 8px',
          height: '100%',
        }}
      >
        <div className="z-10 w-full">
          <div className="items-left flex flex-col space-x-2">
            <span className="truncate font-medium text-white">{event.title}</span>
            {countdown && <span className="truncate text-sm text-white">{countdown}</span>}
          </div>
        </div>
      </div>
      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogContent className="bg-bg border-rule max-h-[90vh] overflow-y-auto rounded-xl border p-0 shadow-xl sm:max-w-[650px]">
          <div className="bg-surface sticky top-0 z-10 rounded-t-xl p-5 shadow-md">
            <DialogHeader>
              <DialogTitle className="text-ink flex items-center justify-between text-xl font-bold">
                <div className="flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  {event.title}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleEditMode}
                  className="text-ink hover:bg-accent-soft"
                  title={isEditing ? t('common.buttons.save') : t('products.edit.title')}
                >
                  {isEditing ? <Save className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                </Button>
              </DialogTitle>
            </DialogHeader>
          </div>

          <div className="p-5">
            {!isEditing ? (
              <Card className="bg-surface border-rule shadow-md">
                <CardContent className="p-4">
                  <div className="space-y-6">
                    <div className="text-ink mb-4 flex items-center">
                      <Clock className="text-accent mr-2 h-4 w-4" />
                      <span className="font-medium">
                        {t('products.details.end')} {countdown}
                      </span>
                    </div>

                    <div className="border-rule mt-4 border-t pt-4">
                      <div className="space-y-6">
                        <div className="mb-4 flex items-center justify-between">
                          <div className="text-ink font-medium">{t('products.details.colors')}</div>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          <div className="bg-surface hover:bg-surface rounded-xl p-4 transition-colors">
                            <div className="mb-3 flex items-center gap-3">
                              <div className="text-ink font-medium">
                                {t('products.details.color')}
                              </div>
                            </div>
                            <PopoverPicker
                              isOpen={isColorOpen}
                              color={color}
                              onChange={(c) => handleColorChange(c)}
                              onToggle={() => setIsColorOpen((prev) => !prev)}
                            />
                          </div>
                        </div>
                        <div className="bg-surface mt-6 rounded-xl p-6">
                          <div
                            className="w-full rounded-lg p-4 transition-all"
                            style={{
                              backgroundColor: color,
                              borderColor: color,
                              borderWidth: '2px',
                              borderStyle: 'solid',
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-white">{event.title}</span>
                            </div>
                            {countdown && (
                              <div className="mt-2 text-sm text-white opacity-80">{countdown}</div>
                            )}
                          </div>
                        </div>
                        {isSaving && (
                          <span className="text-accent mt-2 block text-xs">
                            {t('common.loading.saving')}
                          </span>
                        )}
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
                  durationValue: undefined,
                  durationUnit: undefined,
                  isRecurring: false,
                  recurrenceUnit: undefined,
                  color: color,
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
  )
}

export default EventContent
