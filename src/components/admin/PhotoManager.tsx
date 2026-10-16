'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { deletePhoto, movePhoto, updatePhoto, uploadPhotos } from '@/actions/photos'
import { ActionButton, ActionForm, Field } from '@/components/admin/ActionForm'
import { variantUrl } from '@/lib/media-urls'

export type AdminPhoto = {
  id: string
  fileKey: string
  title: string
  place: string
  wide: boolean
  cropX: number
  cropY: number
  originalWidth: number
  originalHeight: number
}

/**
 * Gestion des photos d'une série (ou hors série avec serieId = null) : téléversement,
 * ordre, titre, lieu, pleine largeur, recadrage 16:9.
 */
export function PhotoManager({ serieId, photos }: { serieId: string | null; photos: AdminPhoto[] }) {
  const t = useTranslations('admin.series.photos')
  const tc = useTranslations('admin.common')
  const te = useTranslations()
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const upload = () => {
    const input = fileInput.current
    if (!input || !input.files || input.files.length === 0) return
    const data = new FormData()
    for (const f of Array.from(input.files)) data.append('files', f)
    setError(null)
    start(async () => {
      const r = await uploadPhotos(serieId, null, data)
      if (!r.success) setError(r.error.fields?.files ?? r.error.key)
      else {
        input.value = ''
        router.refresh()
      }
    })
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="eyebrow">
          {t('title')} · {t('count', { count: photos.length })}
        </div>
        <span className="text-xs text-muted-foreground">{t('hint')}</span>
      </div>
      <div className="grid gap-3 border border-dashed border-border bg-muted p-5 text-sm">
        <b className="font-medium">{t('drop')}</b>
        <span className="text-muted-foreground">{t('dropHint')}</span>
        <div className="flex flex-wrap items-center gap-3">
          <input ref={fileInput} id={`files-${serieId ?? 'standalone'}`} type="file" accept="image/jpeg,image/png,image/webp,image/tiff" multiple className="text-sm" />
          <button type="button" className="btn btn-sm" onClick={upload} disabled={pending} aria-busy={pending}>
            {pending ? t('uploading') : t('upload')}
          </button>
          {error ? <span className="text-xs text-destructive">{te(error)}</span> : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {photos.map((p, i) => (
          <div key={p.id} className="grid gap-3 border border-border bg-background p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{i + 1}</span>
              <span className="flex gap-1.5">
                {i > 0 ? <ActionButton action={() => movePhoto(p.id, 'up')} label="↑" className="btn btn-secondary btn-sm" /> : null}
                {i < photos.length - 1 ? <ActionButton action={() => movePhoto(p.id, 'down')} label="↓" className="btn btn-secondary btn-sm" /> : null}
                <ActionButton action={() => deletePhoto(p.id)} label={t('remove')} confirmLabel={tc('confirmDelete')} className="btn btn-secondary btn-sm" />
              </span>
            </div>
            <div className="frame">
              {/* Clé de cache sur le recadrage : les variantes changent sous la même URL. */}
              <img src={`${variantUrl(p.fileKey, 640)}?c=${p.cropX}-${p.cropY}`} alt={p.title} loading="lazy" />
            </div>
            <ActionForm action={(prev, fd) => updatePhoto(p.id, prev, fd)} className="grid gap-3" submitLabel={t('apply')}>
              <Field label={t('photoTitle')} name="title">
                <input name="title" defaultValue={p.title} className="field py-1.5 text-sm" />
              </Field>
              <Field label={t('place')} name="place">
                <input name="place" defaultValue={p.place} className="field py-1.5 text-sm" />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="wide" defaultChecked={p.wide} className="accent-accent" /> {t('wide')}
              </label>
              <CropControls photo={p} />
            </ActionForm>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Deux curseurs : le centre du recadrage 16:9 dans l'original. Inutile si l'original est déjà 16:9. */
function CropControls({ photo }: { photo: AdminPhoto }) {
  const t = useTranslations('admin.series.photos')
  const ratio = photo.originalWidth / photo.originalHeight
  const wider = ratio > 16 / 9 + 0.01
  const taller = ratio < 16 / 9 - 0.01
  if (!wider && !taller) {
    return (
      <>
        <input type="hidden" name="cropX" value={0.5} />
        <input type="hidden" name="cropY" value={0.5} />
      </>
    )
  }
  return (
    <div className="grid gap-1 text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
      {t('crop')} · {wider ? t('cropX') : t('cropY')}
      <input type="range" name={wider ? 'cropX' : 'cropY'} min={0} max={1} step={0.01} defaultValue={wider ? photo.cropX : photo.cropY} className="accent-accent" />
      <input type="hidden" name={wider ? 'cropY' : 'cropX'} value={0.5} />
    </div>
  )
}
