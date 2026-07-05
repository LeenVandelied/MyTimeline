'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Upload, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * #86 — Upload + recadrage d'avatar. Drag & drop OU sélection fichier, puis
 * recadrage carré (zoom + drag de repositionnement) sur <canvas>, produisant un
 * `File` PNG 256×256 remis au parent via `onCropped`.
 *
 * Zéro dépendance externe (react-image-crop non installé — scope frontend strict,
 * pas d'ajout de dépendance). Le rendu réel de l'upload (POST /api/me/avatar) est
 * délégué au parent : ici on ne fait QUE produire le fichier recadré + preview.
 *
 * Accessibilité : zone drop cliquable (`role="button"`, tabIndex, Enter/Space),
 * input file masqué relié, slider zoom labellisé.
 */
const OUTPUT_SIZE = 256
const MAX_BYTES = 5 * 1024 * 1024 // 5 Mo

interface AvatarUploadProps {
  /** URL avatar actuelle (null = pas d'avatar). */
  currentAvatarUrl: string | null
  /** Appelé avec le fichier recadré prêt à uploader. */
  onCropped: (file: File) => void
  /** Suppression de l'avatar existant. */
  onDelete?: () => void
  disabled?: boolean
}

export function AvatarUpload({
  currentAvatarUrl,
  onCropped,
  onDelete,
  disabled,
}: AvatarUploadProps) {
  const t = useTranslations('settings')
  const inputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const [dragging, setDragging] = useState(false)
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [error, setError] = useState<string | null>(null)
  const dragState = useRef<{ x: number; y: number } | null>(null)

  // Nettoyage de l'object URL pour éviter les fuites mémoire.
  useEffect(() => {
    return () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl)
    }
  }, [sourceUrl])

  const loadFile = useCallback(
    (file: File | undefined) => {
      setError(null)
      if (!file) return
      if (!file.type.startsWith('image/')) {
        setError(t('profile.avatar.errorType'))
        return
      }
      if (file.size > MAX_BYTES) {
        setError(t('profile.avatar.errorSize'))
        return
      }
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        imageRef.current = img
        setZoom(1)
        setOffset({ x: 0, y: 0 })
        setSourceUrl(url)
      }
      img.src = url
    },
    [t],
  )

  // Redessine le canvas à chaque changement de zoom/offset/source.
  useEffect(() => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img || !sourceUrl) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
    // Échelle « cover » de base puis zoom utilisateur.
    const baseScale = Math.max(OUTPUT_SIZE / img.width, OUTPUT_SIZE / img.height)
    const scale = baseScale * zoom
    const drawW = img.width * scale
    const drawH = img.height * scale
    const x = (OUTPUT_SIZE - drawW) / 2 + offset.x
    const y = (OUTPUT_SIZE - drawH) / 2 + offset.y
    ctx.drawImage(img, x, y, drawW, drawH)
  }, [zoom, offset, sourceUrl])

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragState.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragState.current) return
    setOffset({ x: e.clientX - dragState.current.x, y: e.clientY - dragState.current.y })
  }
  const onPointerUp = () => {
    dragState.current = null
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (disabled) return
    loadFile(e.dataTransfer.files?.[0])
  }

  const openPicker = () => {
    if (!disabled) inputRef.current?.click()
  }

  const confirmCrop = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], 'avatar.png', { type: 'image/png' })
      onCropped(file)
      if (sourceUrl) URL.revokeObjectURL(sourceUrl)
      setSourceUrl(null)
      imageRef.current = null
    }, 'image/png')
  }

  const cancelCrop = () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl)
    setSourceUrl(null)
    imageRef.current = null
  }

  return (
    <div className="space-y-3" data-testid="avatar-upload">
      {!sourceUrl && (
        <div className="flex items-center gap-4">
          <div className="border-rule bg-surface-2 h-16 w-16 shrink-0 overflow-hidden rounded-full border">
            {currentAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentAvatarUrl}
                alt={t('profile.avatar.current')}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="text-ink-faint flex h-full w-full items-center justify-center text-xl">
                ?
              </div>
            )}
          </div>

          <div
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-disabled={disabled}
            aria-label={t('profile.avatar.dropzone')}
            onClick={openPicker}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                openPicker()
              }
            }}
            onDragOver={(e) => {
              e.preventDefault()
              if (!disabled) setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={cn(
              'border-rule flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed p-4 text-center transition-colors',
              'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
              dragging && 'border-accent bg-accent-soft/40',
              disabled && 'cursor-not-allowed opacity-50',
            )}
            data-testid="avatar-dropzone"
          >
            <Upload className="text-ink-muted h-5 w-5" aria-hidden="true" />
            <span className="text-sm">{t('profile.avatar.dropzone')}</span>
            <span className="text-ink-faint text-xs">{t('profile.avatar.hint')}</span>
          </div>

          {currentAvatarUrl && onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onDelete}
              disabled={disabled}
              aria-label={t('profile.avatar.delete')}
              data-testid="avatar-delete"
            >
              <Trash2 className="text-danger h-4 w-4" aria-hidden="true" />
            </Button>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => loadFile(e.target.files?.[0])}
            data-testid="avatar-input"
          />
        </div>
      )}

      {sourceUrl && (
        <div className="space-y-3" data-testid="avatar-cropper">
          <canvas
            ref={canvasRef}
            width={OUTPUT_SIZE}
            height={OUTPUT_SIZE}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="border-rule mx-auto block h-40 w-40 cursor-move touch-none rounded-full border"
          />
          <div className="space-y-1">
            <label htmlFor="avatar-zoom" className="text-ink-muted text-xs">
              {t('profile.avatar.zoom')}
            </label>
            <input
              id="avatar-zoom"
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full"
              data-testid="avatar-zoom"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={cancelCrop}>
              {t('common.cancel')}
            </Button>
            <Button type="button" size="sm" onClick={confirmCrop} data-testid="avatar-confirm">
              {t('profile.avatar.apply')}
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-danger text-xs" role="alert" data-testid="avatar-error">
          {error}
        </p>
      )}
    </div>
  )
}
