'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Field } from '@/components/admin/ActionForm'
import { variantUrl } from '@/lib/media-urls'

export type HeroPhotoOption = { id: string; fileKey: string; label: string }

/**
 * Choix de la photo d'accueil et de son point d'intérêt, avec aperçu ordinateur et
 * mobile côte à côte. Le hero du site coupe la photo 16:9 selon l'écran : sur mobile il
 * n'en montre qu'une bande verticale. Les deux curseurs déplacent cette bande
 * (object-position), en direct dans les deux aperçus, sans régénérer d'image.
 * Les champs heroPhotoId / heroFocusX / heroFocusY partent avec le formulaire parent.
 */
export function HeroPicker({
  photos,
  photoId,
  focusX,
  focusY,
  heroText,
  none,
}: {
  photos: HeroPhotoOption[]
  photoId: string | null
  focusX: number
  focusY: number
  heroText: string
  none: string
}) {
  const t = useTranslations('admin.pages.home')
  const [id, setId] = useState(photoId ?? '')
  const [x, setX] = useState(focusX)
  const [y, setY] = useState(focusY)
  const photo = photos.find((p) => p.id === id)
  const position = `${Math.round(x * 100)}% ${Math.round(y * 100)}%`

  return (
    <div className="grid gap-4">
      <Field label={t('choosePhoto')} name="heroPhotoId" hint={t('heroHint')}>
        <select name="heroPhotoId" value={id} onChange={(e) => setId(e.target.value)} className="field">
          <option value="">{none}</option>
          {photos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </Field>

      {/* Aperçus : proportions réelles du hero (1360 × 792 sur ordinateur, 390 × 608 sur mobile). */}
      <div className="grid grid-cols-[1fr_auto] items-start gap-4">
        <div className="grid gap-1.5">
          <span className="eyebrow">{t('previewDesktop')}</span>
          <Preview photo={photo} position={position} aspect="1360 / 792" text={heroText} textClass="max-w-[55%] text-[clamp(8px,1vw,12px)] leading-snug" />
        </div>
        <div className="grid w-[150px] gap-1.5">
          <span className="eyebrow">{t('previewMobile')}</span>
          <Preview photo={photo} position={position} aspect="390 / 608" text={heroText} textClass="text-[9px] leading-tight" />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
          {t('focusX')} · {Math.round(x * 100)} %
          <input type="range" name="heroFocusX" min={0} max={1} step={0.01} value={x} onChange={(e) => setX(Number(e.target.value))} className="accent-accent" />
        </label>
        <label className="grid gap-1 text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
          {t('focusY')} · {Math.round(y * 100)} %
          <input type="range" name="heroFocusY" min={0} max={1} step={0.01} value={y} onChange={(e) => setY(Number(e.target.value))} className="accent-accent" />
        </label>
      </div>
      <p className="m-0 text-xs text-muted-foreground">{t('focusHint')}</p>
    </div>
  )
}

function Preview({ photo, position, aspect, text, textClass }: { photo?: HeroPhotoOption; position: string; aspect: string; text: string; textClass: string }) {
  return (
    <div className="relative overflow-hidden bg-[oklch(0.3_0.02_60)]" style={{ aspectRatio: aspect }}>
      {photo ? <img src={variantUrl(photo.fileKey, 1280)} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: position }} /> : null}
      <div className="absolute inset-0 bg-linear-to-b from-black/35 via-transparent to-black/55" />
      <div className={`font-display absolute inset-x-0 bottom-0 p-[6%] text-white ${textClass}`}>{text}</div>
    </div>
  )
}
